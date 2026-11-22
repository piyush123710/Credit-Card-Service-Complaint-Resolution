import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { CustomerAccount, OperatorRole, OperatorSession } from '../shared/types.ts';
import { db } from './store.ts';

const ROLE_PROFILES: Record<OperatorRole, { name: string; avatarUrl: string }> = {
  'Support Agent': {
    name: 'Sarah Jenkins',
    avatarUrl: '/src/assets/images/avatar_support_agent_1795332520005.jpg',
  },
  'Dispute Specialist': {
    name: 'Evelyn Brooks',
    avatarUrl: '/src/assets/images/avatar_dispute_specialist_1795332519500.jpg',
  },
  'Compliance Admin': {
    name: 'Morgan Sterling',
    avatarUrl: '/src/assets/images/avatar_compliance_admin_1795332520387.jpg',
  },
};

const SIGNING_KEY = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
  role: OperatorRole;
  name: string;
  exp: number;
}

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPasscodeHash(passcode: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derivedBuf = crypto.scryptSync(passcode, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derivedBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derivedBuf, storedBuf);
}

export function verifyWorkspacePasscode(passcode: string): boolean {
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  if (envPasscode) {
    const inputBuf = Buffer.from(passcode);
    const targetBuf = Buffer.from(envPasscode);
    if (inputBuf.length !== targetBuf.length) return false;
    return crypto.timingSafeEqual(inputBuf, targetBuf);
  }
  const config = db.getAuthConfig();
  if (!config.adminPasscodeHash) return false;
  return verifyPasscodeHash(passcode, config.adminPasscodeHash);
}

export function isWorkspaceInitialized(): { needsSetup: boolean; envConfigured: boolean } {
  const envConfigured = Boolean(process.env.ADMIN_PASSCODE?.trim());
  const config = db.getAuthConfig();
  const needsSetup = !envConfigured && !config.adminPasscodeHash;
  return { needsSetup, envConfigured };
}

export function issueOperatorSession(role: OperatorRole): OperatorSession {
  const profile = ROLE_PROFILES[role];
  const payload: TokenPayload = {
    sub: `op-${role.toLowerCase().replace(/\s+/g, '-')}`,
    role,
    name: profile.name,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SIGNING_KEY)
    .update(encodedPayload)
    .digest('base64url');
  return {
    token: `${encodedPayload}.${signature}`,
    operatorName: profile.name,
    role,
    avatarUrl: profile.avatarUrl,
    issuedAt: new Date().toISOString(),
  };
}

export function verifyBearerToken(authHeader: string | undefined): TokenPayload | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SIGNING_KEY)
    .update(encodedPayload)
    .digest('base64url');

  const sigA = Buffer.from(providedSig);
  const sigB = Buffer.from(expectedSig);
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.role || !parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  operator?: TokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const payload = verifyBearerToken(req.headers.authorization);
  if (!payload) {
    res.status(401).json({ error: 'Authentication required. Please sign in to the operator console.' });
    return;
  }
  req.operator = payload;
  next();
}

export function requireRole(allowedRoles: OperatorRole[], actionLabel: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const operator = req.operator;
    if (!operator) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(operator.role)) {
      db.appendAudit({
        actorName: operator.name,
        actorRole: operator.role,
        action: actionLabel,
        targetType: 'Auth',
        targetId: req.originalUrl,
        outcome: 'Denied',
        details: `Role "${operator.role}" lacks permission for "${actionLabel}". Required: ${allowedRoles.join(', ')}.`,
      });
      res.status(403).json({
        error: `Access denied for role "${operator.role}". Required permission: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}

export function redactCustomerForRole(
  customer: CustomerAccount,
  role: OperatorRole
): CustomerAccount & { piiRedacted: boolean } {
  const isAdmin = role === 'Compliance Admin';
  const isVerified = customer.kbaVerified;

  if (isAdmin) {
    return {
      ...customer,
      piiRedacted: false,
    };
  }

  if (isVerified) {
    return {
      ...customer,
      fullPan: `•••• •••• •••• ${customer.cardLast4}`,
      ssnLast4: `••${customer.ssnLast4.slice(-2)}`,
      piiRedacted: false,
    };
  }

  return {
    ...customer,
    fullPan: `•••• •••• •••• ${customer.cardLast4}`,
    ssnLast4: '••••',
    dob: '••••-••-••',
    billingAddress: 'Locked — Complete Customer KBA Verification to reveal',
    billingZip: '•••••',
    email: customer.email.replace(/(^.).*(@.*$)/, '$1••••$2'),
    phone: '(•••) •••-' + customer.phone.slice(-4),
    piiRedacted: true,
  };
}
