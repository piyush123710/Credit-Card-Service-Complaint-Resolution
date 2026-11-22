import type {
  AuditLogEntry,
  CustomerAccount,
  DashboardSummary,
  LedgerTransaction,
  OperatorRole,
  OperatorSession,
  RequestCategory,
  RequestPriority,
  RequestStatus,
  ServiceRequest,
  ValidationScenario,
} from '../shared/types.ts';

let activeToken: string | null = null;

export function setApiToken(token: string | null): void {
  activeToken = token;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (activeToken) {
    headers.Authorization = `Bearer ${activeToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getAuthStatus: () => apiFetch<{ needsSetup: boolean; envConfigured: boolean }>('/api/auth/status'),

  claimAdmin: (passcode: string) =>
    apiFetch<{ session: OperatorSession }>('/api/auth/claim-admin', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    }),

  login: (passcode: string, role: OperatorRole) =>
    apiFetch<{ session: OperatorSession }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ passcode, role }),
    }),

  switchRole: (role: OperatorRole) =>
    apiFetch<{ session: OperatorSession }>('/api/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  getDashboardSummary: () => apiFetch<DashboardSummary>('/api/dashboard/summary'),

  getRequests: (params: {
    category?: string;
    status?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.status) qs.set('status', params.status);
    if (params.priority) qs.set('priority', params.priority);
    if (params.search) qs.set('search', params.search);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return apiFetch<{
      items: ServiceRequest[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/requests?${qs.toString()}`);
  },

  createRequest: (payload: {
    customerId: string;
    category: RequestCategory;
    subcategory: string;
    subject: string;
    description: string;
    priority: RequestPriority;
    amountDisputed: number;
  }) =>
    apiFetch<{ request: ServiceRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRequestDetail: (id: string) =>
    apiFetch<{
      request: ServiceRequest;
      customer: (CustomerAccount & { piiRedacted?: boolean }) | null;
      transactions: LedgerTransaction[];
    }>(`/api/requests/${encodeURIComponent(id)}`),

  updateRequest: (
    id: string,
    payload: { status?: RequestStatus; note?: string; resolutionSummary?: string }
  ) =>
    apiFetch<{ request: ServiceRequest }>(`/api/requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  issueProvisionalCredit: (id: string, amount: number) =>
    apiFetch<{ request: ServiceRequest }>(
      `/api/requests/${encodeURIComponent(id)}/provisional-credit`,
      {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }
    ),

  getCustomers: (search = '') => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch<{ items: Array<CustomerAccount & { piiRedacted?: boolean }> }>(
      `/api/customers${qs}`
    );
  },

  getCustomerDetail: (id: string) =>
    apiFetch<{
      customer: CustomerAccount & { piiRedacted?: boolean };
      transactions: LedgerTransaction[];
      requests: ServiceRequest[];
    }>(`/api/customers/${encodeURIComponent(id)}`),

  verifyCustomerKba: (
    id: string,
    payload: { dob: string; ssnLast4: string; billingZip: string }
  ) =>
    apiFetch<{ customer: CustomerAccount & { piiRedacted?: boolean }; verifiedFactors: number }>(
      `/api/customers/${encodeURIComponent(id)}/verify`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getCallerScript: (id: string) =>
    apiFetch<{ dob: string; ssnLast4: string; billingZip: string }>(
      `/api/customers/${encodeURIComponent(id)}/caller-script`,
      { method: 'POST' }
    ),

  getValidationScenarios: (params: { status?: string; category?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.category) qs.set('category', params.category);
    return apiFetch<{
      items: ValidationScenario[];
      summary: DashboardSummary['validationSummary'];
    }>(`/api/validation/scenarios?${qs.toString()}`);
  },

  runValidationSuite: () =>
    apiFetch<{
      result: { checked: number; passed: number; failed: number; remediated: number };
      items: ValidationScenario[];
      summary: DashboardSummary['validationSummary'];
    }>('/api/validation/run', { method: 'POST' }),

  remediateScenario: (id: string) =>
    apiFetch<{
      scenario: ValidationScenario;
      summary: DashboardSummary['validationSummary'];
    }>(`/api/validation/${encodeURIComponent(id)}/remediate`, { method: 'POST' }),

  resetDataset: () =>
    apiFetch<{ summary: DashboardSummary }>('/api/validation/reset', { method: 'POST' }),

  getAuditLogs: () => apiFetch<{ items: AuditLogEntry[] }>('/api/audit-logs'),
};
