import fs from 'node:fs';
import path from 'node:path';
import type {
  AuditLogEntry,
  CustomerAccount,
  DashboardSummary,
  LedgerTransaction,
  OperatorRole,
  RequestCategory,
  ServiceRequest,
  ValidationScenario,
} from '../shared/types.ts';
import { generateSeedDataset } from './seed.ts';

interface AuthConfigRecord {
  adminPasscodeHash: string | null;
  claimedAt: string | null;
}

interface StoreData {
  authConfig: AuthConfigRecord;
  customers: CustomerAccount[];
  transactions: LedgerTransaction[];
  requests: ServiceRequest[];
  scenarios: ValidationScenario[];
  auditLogs: AuditLogEntry[];
}

export class DocumentCollection<T extends { id: string }> {
  private readonly getItems: () => T[];
  private readonly setItems: (items: T[]) => void;
  private readonly persist: () => void;

  constructor(getItems: () => T[], setItems: (items: T[]) => void, persist: () => void) {
    this.getItems = getItems;
    this.setItems = setItems;
    this.persist = persist;
  }

  find(predicate?: (doc: T) => boolean): T[] {
    const list = this.getItems();
    return predicate ? list.filter(predicate) : [...list];
  }

  findOne(predicate: (doc: T) => boolean): T | null {
    return this.getItems().find(predicate) ?? null;
  }

  countDocuments(predicate?: (doc: T) => boolean): number {
    const list = this.getItems();
    return predicate ? list.filter(predicate).length : list.length;
  }

  insertOne(doc: T, prepend = false): T {
    const list = this.getItems();
    const next = prepend ? [doc, ...list] : [...list, doc];
    this.setItems(next);
    this.persist();
    return doc;
  }

  updateOne(id: string, updater: (current: T) => T): T | null {
    const list = this.getItems();
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;
    const updated = updater(list[index]);
    const next = [...list];
    next[index] = updated;
    this.setItems(next);
    this.persist();
    return updated;
  }
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'cardops_store.json');

class CardOpsDatabase {
  private state: StoreData;

  public readonly customers: DocumentCollection<CustomerAccount>;
  public readonly transactions: DocumentCollection<LedgerTransaction>;
  public readonly requests: DocumentCollection<ServiceRequest>;
  public readonly scenarios: DocumentCollection<ValidationScenario>;
  public readonly auditLogs: DocumentCollection<AuditLogEntry>;

  constructor() {
    this.state = this.loadOrSeed();

    this.customers = new DocumentCollection<CustomerAccount>(
      () => this.state.customers,
      (items) => {
        this.state.customers = items;
      },
      () => this.save()
    );
    this.transactions = new DocumentCollection<LedgerTransaction>(
      () => this.state.transactions,
      (items) => {
        this.state.transactions = items;
      },
      () => this.save()
    );
    this.requests = new DocumentCollection<ServiceRequest>(
      () => this.state.requests,
      (items) => {
        this.state.requests = items;
      },
      () => this.save()
    );
    this.scenarios = new DocumentCollection<ValidationScenario>(
      () => this.state.scenarios,
      (items) => {
        this.state.scenarios = items;
      },
      () => this.save()
    );
    this.auditLogs = new DocumentCollection<AuditLogEntry>(
      () => this.state.auditLogs,
      (items) => {
        this.state.auditLogs = items;
      },
      () => this.save()
    );
  }

  private loadOrSeed(): StoreData {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw) as StoreData;
        if (
          parsed &&
          Array.isArray(parsed.customers) &&
          Array.isArray(parsed.requests) &&
          Array.isArray(parsed.scenarios)
        ) {
          return parsed;
        }
      } catch {
        // Fall through to clean reseed
      }
    }
    const seed = generateSeedDataset();
    const initial: StoreData = {
      authConfig: {
        adminPasscodeHash: null,
        claimedAt: null,
      },
      ...seed,
    };
    this.writeFileAtomic(initial);
    return initial;
  }

  private writeFileAtomic(data: StoreData): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  }

  private save(): void {
    this.writeFileAtomic(this.state);
  }

  getAuthConfig(): AuthConfigRecord {
    return { ...this.state.authConfig };
  }

  setAdminPasscodeHash(hash: string): boolean {
    if (this.state.authConfig.adminPasscodeHash) {
      return false;
    }
    this.state.authConfig = {
      adminPasscodeHash: hash,
      claimedAt: new Date().toISOString(),
    };
    this.save();
    return true;
  }

  appendAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.state.auditLogs = [fullEntry, ...this.state.auditLogs].slice(0, 250);
    this.save();
    return fullEntry;
  }

  getDashboardSummary(): DashboardSummary {
    const reqs = this.state.requests;
    const categoryCounts: Record<RequestCategory, number> = {
      'Billing Inquiry': 0,
      'Payment Issue': 0,
      'Transaction Dispute': 0,
      'Card Complaint': 0,
    };
    let openCount = 0;
    let inReviewCount = 0;
    let escalatedCount = 0;
    let resolvedCount = 0;
    let pendingCustomerCount = 0;
    let totalDisputedVolume = 0;
    let provisionalCreditsIssued = 0;

    for (const r of reqs) {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
      if (r.status === 'Open') openCount++;
      else if (r.status === 'In Review') inReviewCount++;
      else if (r.status === 'Escalated') escalatedCount++;
      else if (r.status === 'Resolved') resolvedCount++;
      else if (r.status === 'Pending Customer') pendingCustomerCount++;

      totalDisputedVolume += r.amountDisputed;
      provisionalCreditsIssued += r.provisionalCreditIssued;
    }

    const scenarios = this.state.scenarios;
    let passedCount = 0;
    let failedCount = 0;
    let remediatedCount = 0;
    let totalDiscrepancyExposure = 0;

    for (const s of scenarios) {
      if (s.status === 'Passed') passedCount++;
      else if (s.status === 'Remediated') remediatedCount++;
      else {
        failedCount++;
        totalDiscrepancyExposure += s.discrepancyAmount;
      }
    }

    const accuracyPercent =
      scenarios.length > 0
        ? Number((((passedCount + remediatedCount) / scenarios.length) * 100).toFixed(1))
        : 100;

    const verifiedCustomersCount = this.state.customers.filter((c) => c.kbaVerified).length;

    return {
      totalRequests: reqs.length,
      openCount,
      inReviewCount,
      escalatedCount,
      resolvedCount,
      pendingCustomerCount,
      totalDisputedVolume: Number(totalDisputedVolume.toFixed(2)),
      provisionalCreditsIssued: Number(provisionalCreditsIssued.toFixed(2)),
      slaComplianceRate: reqs.length > 0 ? Number((((reqs.length - escalatedCount) / reqs.length) * 100).toFixed(1)) : 100,
      categoryCounts,
      validationSummary: {
        totalScenarios: scenarios.length,
        passedCount,
        failedCount,
        remediatedCount,
        accuracyPercent,
        totalDiscrepancyExposure: Number(totalDiscrepancyExposure.toFixed(2)),
      },
      verifiedCustomersCount,
      totalCustomersCount: this.state.customers.length,
    };
  }

  runValidationBatch(actorName: string, actorRole: OperatorRole): {
    checked: number;
    passed: number;
    failed: number;
    remediated: number;
  } {
    const now = new Date().toISOString();
    let passed = 0;
    let failed = 0;
    let remediated = 0;

    this.state.scenarios = this.state.scenarios.map((scenario) => {
      // Re-verify live records for key programmatic rules
      if (scenario.status !== 'Remediated') {
        if (scenario.id === 'val-002') {
          const cust = this.state.customers.find((c) => c.id === scenario.targetId);
          if (cust && Math.abs(cust.creditLimit - cust.currentBalance - cust.availableCredit) < 0.02) {
            passed++;
            return { ...scenario, status: 'Passed', discrepancyAmount: 0, lastCheckedAt: now };
          }
        }
        if (scenario.id === 'val-003') {
          const cust = this.state.customers.find((c) => c.id === scenario.targetId);
          if (cust && cust.accountStatus !== 'Expired-Active Anomaly') {
            passed++;
            return { ...scenario, status: 'Passed', discrepancyAmount: 0, lastCheckedAt: now };
          }
        }
        if (scenario.id === 'val-004') {
          const tx = this.state.transactions.find((t) => t.id === scenario.targetId);
          if (tx && Math.abs(tx.amount * tx.fxRate - tx.postedAmountUsd) < 0.05) {
            passed++;
            return { ...scenario, status: 'Passed', discrepancyAmount: 0, lastCheckedAt: now };
          }
        }
      }

      if (scenario.status === 'Passed') passed++;
      else if (scenario.status === 'Remediated') remediated++;
      else failed++;

      return { ...scenario, lastCheckedAt: now };
    });

    this.appendAudit({
      actorName,
      actorRole,
      action: 'Executed Full Ledger Validation Suite',
      targetType: 'Validation',
      targetId: `BATCH-${now.slice(0, 10)}`,
      outcome: 'Allowed',
      details: `Validated ${this.state.scenarios.length} scenarios (${passed} passed, ${remediated} remediated, ${failed} failed).`,
    });

    return {
      checked: this.state.scenarios.length,
      passed,
      failed,
      remediated,
    };
  }

  remediateScenario(scenarioId: string, actorName: string): ValidationScenario | null {
    const scenario = this.state.scenarios.find((s) => s.id === scenarioId);
    if (!scenario) return null;

    const now = new Date().toISOString();

    // Mutate underlying Account or Transaction document to fix the discrepancy
    if (scenario.targetType === 'Account') {
      this.customers.updateOne(scenario.targetId, (cust) => {
        if (scenario.id === 'val-002') {
          return { ...cust, availableCredit: Number((cust.creditLimit - cust.currentBalance).toFixed(2)) };
        }
        if (scenario.id === 'val-003') {
          return { ...cust, accountStatus: 'Restricted' };
        }
        if (scenario.id === 'val-005') {
          const capped = Math.min(cust.currentBalance, cust.creditLimit);
          return { ...cust, currentBalance: capped, availableCredit: Number((cust.creditLimit - capped).toFixed(2)) };
        }
        if (scenario.id === 'val-006') {
          return { ...cust, statementBalance: Number((cust.statementBalance - 142.8).toFixed(2)) };
        }
        if (scenario.id === 'val-008') {
          return { ...cust, rewardPoints: 1250 };
        }
        return {
          ...cust,
          currentBalance: Math.max(0, Number((cust.currentBalance - scenario.discrepancyAmount).toFixed(2))),
          availableCredit: Number(
            (cust.creditLimit - Math.max(0, cust.currentBalance - scenario.discrepancyAmount)).toFixed(2)
          ),
        };
      });
    } else {
      this.transactions.updateOne(scenario.targetId, (tx) => {
        if (scenario.id === 'val-001') {
          return { ...tx, status: 'Reversed' };
        }
        if (scenario.id === 'val-004') {
          return { ...tx, postedAmountUsd: Number((tx.amount * tx.fxRate).toFixed(2)) };
        }
        if (scenario.id === 'val-007') {
          return { ...tx, type: 'Refund' };
        }
        if (scenario.id === 'val-009') {
          return { ...tx, status: 'Reversed' };
        }
        return { ...tx, status: 'Reversed' };
      });
    }

    const updated = this.scenarios.updateOne(scenarioId, (s) => ({
      ...s,
      status: 'Remediated',
      actualValue: s.expectedValue,
      discrepancyAmount: 0,
      remediatedAt: now,
      remediatedBy: actorName,
      lastCheckedAt: now,
    }));

    this.appendAudit({
      actorName,
      actorRole: 'Compliance Admin',
      action: `Remediated Validation Discrepancy (${scenario.scenarioCode})`,
      targetType: 'Validation',
      targetId: scenario.targetRef,
      outcome: 'Remediated',
      details: `${scenario.title}. Action applied: ${scenario.remediationAction}`,
    });

    return updated;
  }

  resetDataset(actorName: string): void {
    const authConfig = this.state.authConfig;
    const seed = generateSeedDataset();
    this.state = {
      authConfig,
      ...seed,
    };
    this.appendAudit({
      actorName,
      actorRole: 'Compliance Admin',
      action: 'Reset & Reseeded Simulation Dataset',
      targetType: 'Validation',
      targetId: 'ALL',
      outcome: 'Allowed',
      details: 'Restored 168 service requests, 24 accounts, 64 transactions, and 46 validation scenarios.',
    });
  }
}

export const db = new CardOpsDatabase();
