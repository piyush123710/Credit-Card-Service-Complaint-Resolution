export type OperatorRole = 'Support Agent' | 'Dispute Specialist' | 'Compliance Admin';

export type RequestCategory =
  | 'Billing Inquiry'
  | 'Payment Issue'
  | 'Transaction Dispute'
  | 'Card Complaint';

export type RequestStatus =
  | 'Open'
  | 'In Review'
  | 'Pending Customer'
  | 'Escalated'
  | 'Resolved';

export type RequestPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: OperatorRole | 'Customer' | 'System';
  action: string;
  note: string;
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  cardLast4: string;
  cardNetwork: 'Visa' | 'Mastercard' | 'Amex';
  category: RequestCategory;
  subcategory: string;
  subject: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  amountDisputed: number;
  assignedRole: OperatorRole;
  assignedOperator: string;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
  provisionalCreditIssued: number;
  resolutionSummary: string | null;
  timeline: TimelineEvent[];
}

export interface CustomerAccount {
  id: string;
  customerCode: string;
  fullName: string;
  email: string;
  phone: string;
  cardLast4: string;
  fullPan: string;
  cardNetwork: 'Visa' | 'Mastercard' | 'Amex';
  cardTier: string;
  cardExpiry: string;
  accountStatus: 'Active' | 'Frozen' | 'Restricted' | 'Expired-Active Anomaly';
  creditLimit: number;
  currentBalance: number;
  statementBalance: number;
  availableCredit: number;
  apr: number;
  rewardPoints: number;
  ssnLast4: string;
  dob: string;
  billingAddress: string;
  billingZip: string;
  kbaVerified: boolean;
  kbaVerifiedAt: string | null;
  kbaVerifiedBy: string | null;
}

export type TransactionType =
  | 'Purchase'
  | 'Payment'
  | 'Refund'
  | 'Fee'
  | 'Interest'
  | 'Adjustment';

export type TransactionStatus = 'Posted' | 'Pending' | 'Disputed' | 'Reversed';

export interface LedgerTransaction {
  id: string;
  txRef: string;
  customerId: string;
  merchant: string;
  category: string;
  amount: number;
  currency: string;
  fxRate: number;
  postedAmountUsd: number;
  type: TransactionType;
  status: TransactionStatus;
  postedAt: string;
  cardLast4: string;
  authCode: string;
}

export type ValidationCategory =
  | 'Duplicate Posting'
  | 'Balance Mismatch'
  | 'APR & Interest'
  | 'Card Lifecycle'
  | 'Credit Limit'
  | 'FX & Fees'
  | 'Rewards Ledger'
  | 'Reg Z Compliance';

export type ValidationStatus = 'Failed' | 'Passed' | 'Remediated';

export interface ValidationScenario {
  id: string;
  scenarioCode: string;
  title: string;
  category: ValidationCategory;
  severity: 'Critical' | 'High' | 'Medium';
  targetType: 'Transaction' | 'Account';
  targetId: string;
  targetRef: string;
  customerId: string;
  customerName: string;
  ruleDescription: string;
  expectedValue: string;
  actualValue: string;
  discrepancyAmount: number;
  status: ValidationStatus;
  remediationAction: string;
  lastCheckedAt: string;
  remediatedAt: string | null;
  remediatedBy: string | null;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: OperatorRole | 'Anonymous';
  action: string;
  targetType: 'Request' | 'Customer' | 'Validation' | 'Auth';
  targetId: string;
  outcome: 'Allowed' | 'Denied' | 'Verified' | 'Remediated';
  details: string;
}

export interface DashboardSummary {
  totalRequests: number;
  openCount: number;
  inReviewCount: number;
  escalatedCount: number;
  resolvedCount: number;
  pendingCustomerCount: number;
  totalDisputedVolume: number;
  provisionalCreditsIssued: number;
  slaComplianceRate: number;
  categoryCounts: Record<RequestCategory, number>;
  validationSummary: {
    totalScenarios: number;
    passedCount: number;
    failedCount: number;
    remediatedCount: number;
    accuracyPercent: number;
    totalDiscrepancyExposure: number;
  };
  verifiedCustomersCount: number;
  totalCustomersCount: number;
}

export interface OperatorSession {
  token: string;
  operatorName: string;
  role: OperatorRole;
  avatarUrl: string;
  issuedAt: string;
}
