import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import type {
  OperatorRole,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  ServiceRequest,
} from './src/shared/types.ts';
import {
  type AuthenticatedRequest,
  hashPasscode,
  isWorkspaceInitialized,
  issueOperatorSession,
  redactCustomerForRole,
  requireAuth,
  requireRole,
  verifyWorkspacePasscode,
} from './src/server/auth.ts';
import { db } from './src/server/store.ts';

dotenv.config();

const VALID_ROLES: OperatorRole[] = ['Support Agent', 'Dispute Specialist', 'Compliance Admin'];
const VALID_CATEGORIES: RequestCategory[] = [
  'Billing Inquiry',
  'Payment Issue',
  'Transaction Dispute',
  'Card Complaint',
];
const VALID_STATUSES: RequestStatus[] = [
  'Open',
  'In Review',
  'Pending Customer',
  'Escalated',
  'Resolved',
];
const VALID_PRIORITIES: RequestPriority[] = ['Critical', 'High', 'Medium', 'Low'];

function asSafeString(val: unknown, maxLen = 400): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function asPositiveNumber(val: unknown): number | null {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) return null;
  return Number(val.toFixed(2));
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public health & auth status endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/auth/status', (_req, res) => {
    res.json(isWorkspaceInitialized());
  });

  // One-time workspace passcode claim (when ADMIN_PASSCODE is unset)
  app.post('/api/auth/claim-admin', (req, res) => {
    const status = isWorkspaceInitialized();
    if (!status.needsSetup) {
      res.status(409).json({ error: 'Workspace passcode has already been initialized.' });
      return;
    }
    const passcode = asSafeString(req.body?.passcode, 128);
    if (passcode.length < 6) {
      res.status(400).json({ error: 'Passcode must be at least 6 characters.' });
      return;
    }

    const hash = hashPasscode(passcode);
    const saved = db.setAdminPasscodeHash(hash);
    if (!saved) {
      res.status(409).json({ error: 'Workspace passcode already claimed.' });
      return;
    }

    const session = issueOperatorSession('Compliance Admin');
    db.appendAudit({
      actorName: session.operatorName,
      actorRole: 'Compliance Admin',
      action: 'Initialized Operator Workspace Passcode',
      targetType: 'Auth',
      targetId: 'workspace-admin',
      outcome: 'Allowed',
      details: 'First-run workspace security passcode claimed with scrypt key derivation.',
    });

    res.status(201).json({ session });
  });

  app.post('/api/auth/login', (req, res) => {
    const passcode = asSafeString(req.body?.passcode, 128);
    const requestedRole = asSafeString(req.body?.role, 40) as OperatorRole;
    const role: OperatorRole = VALID_ROLES.includes(requestedRole) ? requestedRole : 'Compliance Admin';

    if (!passcode || !verifyWorkspacePasscode(passcode)) {
      db.appendAudit({
        actorName: 'Unauthenticated Caller',
        actorRole: 'Anonymous',
        action: 'Operator Sign-In Attempt',
        targetType: 'Auth',
        targetId: role,
        outcome: 'Denied',
        details: `Invalid passcode submitted for ${role} sign-in.`,
      });
      res.status(401).json({ error: 'Invalid operator passcode.' });
      return;
    }

    const session = issueOperatorSession(role);
    db.appendAudit({
      actorName: session.operatorName,
      actorRole: role,
      action: 'Operator Sign-In',
      targetType: 'Auth',
      targetId: role,
      outcome: 'Allowed',
      details: `Signed in with HMAC-SHA256 Bearer session as ${role}.`,
    });

    res.json({ session });
  });

  // Switch active RBAC role within an already-authenticated operator session
  app.post('/api/auth/switch-role', requireAuth, (req: AuthenticatedRequest, res) => {
    const requestedRole = asSafeString(req.body?.role, 40) as OperatorRole;
    if (!VALID_ROLES.includes(requestedRole)) {
      res.status(400).json({ error: 'Invalid operator role specified.' });
      return;
    }
    const prevRole = req.operator!.role;
    const session = issueOperatorSession(requestedRole);
    db.appendAudit({
      actorName: session.operatorName,
      actorRole: requestedRole,
      action: 'RBAC Role Context Switch',
      targetType: 'Auth',
      targetId: `${prevRole} -> ${requestedRole}`,
      outcome: 'Allowed',
      details: `Switched active operational role from ${prevRole} to ${requestedRole}.`,
    });
    res.json({ session });
  });

  // Dashboard Summary
  app.get('/api/dashboard/summary', requireAuth, (_req, res) => {
    res.json(db.getDashboardSummary());
  });

  // Service Requests List (Filterable & Paginated)
  app.get('/api/requests', requireAuth, (req, res) => {
    const category = asSafeString(req.query.category, 40);
    const status = asSafeString(req.query.status, 40);
    const priority = asSafeString(req.query.priority, 20);
    const search = asSafeString(req.query.search, 120).toLowerCase();
    const pageRaw = Number(req.query.page ?? 1);
    const limitRaw = Number(req.query.limit ?? 20);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw >= 1 && limitRaw <= 100 ? Math.floor(limitRaw) : 20;

    let list = db.requests.find((item) => {
      if (category && category !== 'All' && item.category !== category) return false;
      if (status && status !== 'All' && item.status !== status) return false;
      if (priority && priority !== 'All' && item.priority !== priority) return false;
      if (search) {
        const hay = `${item.ticketNumber} ${item.customerName} ${item.cardLast4} ${item.subject} ${item.subcategory}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    list = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const items = list.slice(start, start + limit);

    res.json({
      items,
      total,
      page: safePage,
      limit,
      totalPages,
    });
  });

  // Create Service Request
  app.post('/api/requests', requireAuth, (req: AuthenticatedRequest, res) => {
    const customerId = asSafeString(req.body?.customerId, 40);
    const category = asSafeString(req.body?.category, 40) as RequestCategory;
    const subcategory = asSafeString(req.body?.subcategory, 80);
    const subject = asSafeString(req.body?.subject, 160);
    const description = asSafeString(req.body?.description, 1000);
    const priority = asSafeString(req.body?.priority, 20) as RequestPriority;
    const amountDisputed = asPositiveNumber(Number(req.body?.amountDisputed ?? 0));

    if (!customerId || !VALID_CATEGORIES.includes(category) || !subject || !description || amountDisputed === null) {
      res.status(400).json({ error: 'Invalid service request payload.' });
      return;
    }

    const customer = db.customers.findOne((c) => c.id === customerId);
    if (!customer) {
      res.status(404).json({ error: 'Cardholder account not found.' });
      return;
    }

    const operator = req.operator!;
    const count = db.requests.countDocuments();
    const now = new Date().toISOString();
    const slaDueAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const safePriority: RequestPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
    const assignedRole: OperatorRole =
      category === 'Transaction Dispute' ? 'Dispute Specialist' : 'Support Agent';

    const newReq: ServiceRequest = {
      id: `req-${String(count + 1).padStart(4, '0')}`,
      ticketNumber: `SR-${260101 + count}`,
      customerId: customer.id,
      customerName: customer.fullName,
      cardLast4: customer.cardLast4,
      cardNetwork: customer.cardNetwork,
      category,
      subcategory: subcategory || 'General Inquiry',
      subject,
      description,
      status: 'Open',
      priority: safePriority,
      amountDisputed,
      assignedRole,
      assignedOperator: operator.name,
      slaDueAt,
      createdAt: now,
      updatedAt: now,
      provisionalCreditIssued: 0,
      resolutionSummary: null,
      timeline: [
        {
          id: `tl-new-${Date.now()}`,
          timestamp: now,
          actor: operator.name,
          role: operator.role,
          action: 'Service Request Logged',
          note: `Logged ${category} ticket for card ending in ${customer.cardLast4}.`,
        },
      ],
    };

    db.requests.insertOne(newReq, true);
    db.appendAudit({
      actorName: operator.name,
      actorRole: operator.role,
      action: `Created Service Request ${newReq.ticketNumber}`,
      targetType: 'Request',
      targetId: newReq.id,
      outcome: 'Allowed',
      details: `${category} ($${amountDisputed.toFixed(2)}) logged for ${customer.customerCode}.`,
    });

    res.status(201).json({ request: newReq });
  });

  // Service Request Detail (with RBAC-redacted customer account and transactions)
  app.get('/api/requests/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = asSafeString(req.params.id, 40);
    const requestDoc = db.requests.findOne((r) => r.id === id);
    if (!requestDoc) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }
    const customer = db.customers.findOne((c) => c.id === requestDoc.customerId);
    const transactions = db.transactions.find((t) => t.customerId === requestDoc.customerId);

    res.json({
      request: requestDoc,
      customer: customer ? redactCustomerForRole(customer, req.operator!.role) : null,
      transactions,
    });
  });

  // Update Service Request Status / Note (RBAC Enforced)
  app.patch('/api/requests/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = asSafeString(req.params.id, 40);
    const requestDoc = db.requests.findOne((r) => r.id === id);
    if (!requestDoc) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }

    const operator = req.operator!;
    const nextStatus = asSafeString(req.body?.status, 40) as RequestStatus;
    const note = asSafeString(req.body?.note, 600);
    const resolutionSummary = asSafeString(req.body?.resolutionSummary, 400);

    if (nextStatus && !VALID_STATUSES.includes(nextStatus)) {
      res.status(400).json({ error: 'Invalid ticket status.' });
      return;
    }

    // RBAC Enforcement: Support Agents cannot resolve Transaction Disputes or requests > $500
    if (
      operator.role === 'Support Agent' &&
      nextStatus === 'Resolved' &&
      (requestDoc.category === 'Transaction Dispute' || requestDoc.amountDisputed > 500)
    ) {
      db.appendAudit({
        actorName: operator.name,
        actorRole: operator.role,
        action: `Blocked Ticket Resolution (${requestDoc.ticketNumber})`,
        targetType: 'Request',
        targetId: requestDoc.id,
        outcome: 'Denied',
        details: `Support Agent cannot resolve ${requestDoc.category} with $${requestDoc.amountDisputed.toFixed(2)} disputed amount. Escalation to Dispute Specialist or Compliance Admin required.`,
      });
      res.status(403).json({
        error: `Support Agents cannot finalize ${requestDoc.category} tickets over $500 or transaction disputes. Escalate to a Dispute Specialist or Compliance Admin.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const updated = db.requests.updateOne(id, (curr) => {
      const effectiveStatus = nextStatus || curr.status;
      const actionLabel = nextStatus && nextStatus !== curr.status
        ? `Status Updated to ${nextStatus}`
        : 'Operator Note Added';

      return {
        ...curr,
        status: effectiveStatus,
        assignedRole: effectiveStatus === 'Escalated' ? 'Compliance Admin' : curr.assignedRole,
        updatedAt: now,
        resolutionSummary:
          effectiveStatus === 'Resolved'
            ? resolutionSummary || curr.resolutionSummary || `Resolved by ${operator.name} (${operator.role}).`
            : curr.resolutionSummary,
        timeline: [
          ...curr.timeline,
          {
            id: `tl-${Date.now()}`,
            timestamp: now,
            actor: operator.name,
            role: operator.role,
            action: actionLabel,
            note: note || `Updated status to ${effectiveStatus}.`,
          },
        ],
      };
    });

    db.appendAudit({
      actorName: operator.name,
      actorRole: operator.role,
      action: `Updated Ticket ${requestDoc.ticketNumber}`,
      targetType: 'Request',
      targetId: requestDoc.id,
      outcome: 'Allowed',
      details: `Status: ${nextStatus || requestDoc.status}. ${note ? `Note: ${note}` : ''}`,
    });

    res.json({ request: updated });
  });

  // Issue Provisional Credit (RBAC Enforced: Specialist <= $2,500, Admin unlimited, Agent denied)
  app.post(
    '/api/requests/:id/provisional-credit',
    requireAuth,
    requireRole(['Dispute Specialist', 'Compliance Admin'], 'Issue Provisional Credit'),
    (req: AuthenticatedRequest, res) => {
      const id = asSafeString(req.params.id, 40);
      const amount = asPositiveNumber(Number(req.body?.amount));
      const requestDoc = db.requests.findOne((r) => r.id === id);

      if (!requestDoc) {
        res.status(404).json({ error: 'Service request not found.' });
        return;
      }
      if (amount === null || amount <= 0) {
        res.status(400).json({ error: 'Provisional credit amount must be greater than zero.' });
        return;
      }

      const operator = req.operator!;
      if (operator.role === 'Dispute Specialist' && amount > 2500) {
        db.appendAudit({
          actorName: operator.name,
          actorRole: operator.role,
          action: `Provisional Credit Exceeds Limit (${requestDoc.ticketNumber})`,
          targetType: 'Request',
          targetId: requestDoc.id,
          outcome: 'Denied',
          details: `Dispute Specialist limit is $2,500.00; requested $${amount.toFixed(2)}.`,
        });
        res.status(403).json({
          error: 'Dispute Specialist provisional credit limit is $2,500.00. Compliance Admin approval required.',
        });
        return;
      }

      const now = new Date().toISOString();
      const updated = db.requests.updateOne(id, (curr) => ({
        ...curr,
        provisionalCreditIssued: Number((curr.provisionalCreditIssued + amount).toFixed(2)),
        status: curr.status === 'Open' ? 'In Review' : curr.status,
        updatedAt: now,
        timeline: [
          ...curr.timeline,
          {
            id: `tl-pc-${Date.now()}`,
            timestamp: now,
            actor: operator.name,
            role: operator.role,
            action: 'Provisional Credit Issued',
            note: `Credited $${amount.toFixed(2)} under Reg Z dispute protection.`,
          },
        ],
      }));

      db.appendAudit({
        actorName: operator.name,
        actorRole: operator.role,
        action: `Issued $${amount.toFixed(2)} Provisional Credit`,
        targetType: 'Request',
        targetId: requestDoc.ticketNumber,
        outcome: 'Allowed',
        details: `Applied to ${requestDoc.customerName} (Card •••• ${requestDoc.cardLast4}).`,
      });

      res.json({ request: updated });
    }
  );

  // Customer Accounts Directory (Role-Redacted PII)
  app.get('/api/customers', requireAuth, (req: AuthenticatedRequest, res) => {
    const search = asSafeString(req.query.search, 80).toLowerCase();
    const role = req.operator!.role;
    const list = db.customers
      .find((c) => {
        if (!search) return true;
        return `${c.fullName} ${c.customerCode} ${c.cardLast4} ${c.cardTier}`.toLowerCase().includes(search);
      })
      .map((c) => redactCustomerForRole(c, role));

    res.json({ items: list });
  });

  // Customer Detail + Transactions
  app.get('/api/customers/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = asSafeString(req.params.id, 40);
    const customer = db.customers.findOne((c) => c.id === id);
    if (!customer) {
      res.status(404).json({ error: 'Customer account not found.' });
      return;
    }
    const transactions = db.transactions.find((t) => t.customerId === id);
    const requests = db.requests.find((r) => r.customerId === id);
    res.json({
      customer: redactCustomerForRole(customer, req.operator!.role),
      transactions,
      requests,
    });
  });

  // Customer KBA Identity Verification (requires 2 of 3 matching factors)
  app.post('/api/customers/:id/verify', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = asSafeString(req.params.id, 40);
    const customer = db.customers.findOne((c) => c.id === id);
    if (!customer) {
      res.status(404).json({ error: 'Customer account not found.' });
      return;
    }

    const dob = asSafeString(req.body?.dob, 20);
    const ssnLast4 = asSafeString(req.body?.ssnLast4, 10);
    const billingZip = asSafeString(req.body?.billingZip, 15);
    const operator = req.operator!;

    let matches = 0;
    if (dob && dob === customer.dob) matches++;
    if (ssnLast4 && ssnLast4 === customer.ssnLast4) matches++;
    if (billingZip && billingZip === customer.billingZip) matches++;

    if (matches < 2) {
      db.appendAudit({
        actorName: operator.name,
        actorRole: operator.role,
        action: `KBA Verification Failed (${customer.customerCode})`,
        targetType: 'Customer',
        targetId: customer.id,
        outcome: 'Denied',
        details: `Provided attributes matched ${matches}/2 required factors. Confidential PII remains masked.`,
      });
      res.status(403).json({
        error: `Identity verification failed (${matches} of 2 required attributes matched). Account PII remains locked.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const updated = db.customers.updateOne(id, (c) => ({
      ...c,
      kbaVerified: true,
      kbaVerifiedAt: now,
      kbaVerifiedBy: operator.name,
    }));

    db.appendAudit({
      actorName: operator.name,
      actorRole: operator.role,
      action: `KBA Verification Passed (${customer.customerCode})`,
      targetType: 'Customer',
      targetId: customer.id,
      outcome: 'Verified',
      details: `Verified ${matches} customer knowledge factors; session PII unmasked according to ${operator.role} policy.`,
    });

    res.json({
      customer: redactCustomerForRole(updated!, operator.role),
      verifiedFactors: matches,
    });
  });

  // Training Caller Script Simulator (explicitly logged in audit trail)
  app.post('/api/customers/:id/caller-script', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = asSafeString(req.params.id, 40);
    const customer = db.customers.findOne((c) => c.id === id);
    if (!customer) {
      res.status(404).json({ error: 'Customer account not found.' });
      return;
    }
    const operator = req.operator!;
    db.appendAudit({
      actorName: operator.name,
      actorRole: operator.role,
      action: `Simulated Caller KBA Prompt (${customer.customerCode})`,
      targetType: 'Customer',
      targetId: customer.id,
      outcome: 'Allowed',
      details: 'Generated simulated cardholder phone verification transcript for QA training.',
    });
    res.json({
      dob: customer.dob,
      ssnLast4: customer.ssnLast4,
      billingZip: customer.billingZip,
    });
  });

  // Validation Scenarios (46 Transaction & Account Integrity Rules)
  app.get('/api/validation/scenarios', requireAuth, (req, res) => {
    const status = asSafeString(req.query.status, 30);
    const category = asSafeString(req.query.category, 40);
    const scenarios = db.scenarios.find((s) => {
      if (status && status !== 'All' && s.status !== status) return false;
      if (category && category !== 'All' && s.category !== category) return false;
      return true;
    });
    const summary = db.getDashboardSummary().validationSummary;
    res.json({ items: scenarios, summary });
  });

  // Re-run all 46 validation scenarios
  app.post(
    '/api/validation/run',
    requireAuth,
    requireRole(['Dispute Specialist', 'Compliance Admin'], 'Run Validation Suite'),
    (req: AuthenticatedRequest, res) => {
      const operator = req.operator!;
      const result = db.runValidationBatch(operator.name, operator.role);
      const scenarios = db.scenarios.find();
      const summary = db.getDashboardSummary().validationSummary;
      res.json({ result, items: scenarios, summary });
    }
  );

  // Remediate a failed validation scenario (Compliance Admin only)
  app.post(
    '/api/validation/:id/remediate',
    requireAuth,
    requireRole(['Compliance Admin'], 'Remediate Ledger Record'),
    (req: AuthenticatedRequest, res) => {
      const id = asSafeString(req.params.id, 40);
      const operator = req.operator!;
      const updated = db.remediateScenario(id, operator.name);
      if (!updated) {
        res.status(404).json({ error: 'Validation scenario not found.' });
        return;
      }
      const summary = db.getDashboardSummary().validationSummary;
      res.json({ scenario: updated, summary });
    }
  );

  // Reset simulation dataset (Compliance Admin only)
  app.post(
    '/api/validation/reset',
    requireAuth,
    requireRole(['Compliance Admin'], 'Reset Simulation Dataset'),
    (req: AuthenticatedRequest, res) => {
      db.resetDataset(req.operator!.name);
      res.json({ summary: db.getDashboardSummary() });
    }
  );

  // Audit Logs (Blocked for Support Agent)
  app.get(
    '/api/audit-logs',
    requireAuth,
    requireRole(['Dispute Specialist', 'Compliance Admin'], 'View Security Audit Trail'),
    (_req, res) => {
      res.json({ items: db.auditLogs.find() });
    }
  );

  // Vite dev middleware or production static assets
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distDir, 'index.html'));
      });
    }
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Meridian CardOps server listening on port ${port}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start Meridian CardOps server:', err);
  process.exit(1);
});
