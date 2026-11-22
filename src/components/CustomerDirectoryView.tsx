import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, Search, ShieldCheck, Unlock } from 'lucide-react';
import type {
  CustomerAccount,
  LedgerTransaction,
  OperatorRole,
  ServiceRequest,
} from '../shared/types.ts';
import { api } from '../lib/api.ts';

interface CustomerDirectoryViewProps {
  activeRole: OperatorRole;
  refreshSignal: number;
  onVerified: () => void;
  onOpenTicket: (id: string) => void;
}

export function CustomerDirectoryView({
  activeRole,
  refreshSignal,
  onVerified,
  onOpenTicket,
}: CustomerDirectoryViewProps) {
  const [customers, setCustomers] = useState<Array<CustomerAccount & { piiRedacted?: boolean }>>(
    []
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    customer: CustomerAccount & { piiRedacted?: boolean };
    transactions: LedgerTransaction[];
    requests: ServiceRequest[];
  } | null>(null);

  const [dobInput, setDobInput] = useState('');
  const [ssnInput, setSsnInput] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers(search);
      setCustomers(res.items);
      if (!selectedId && res.items.length > 0) {
        setSelectedId(res.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [search, activeRole, refreshSignal]);

  const loadDetail = async (id: string) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setDobInput('');
    setSsnInput('');
    setZipInput('');
    try {
      const res = await api.getCustomerDetail(id);
      setDetail(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to fetch customer account.');
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    }
  }, [selectedId, activeRole, refreshSignal]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await api.verifyCustomerKba(detail.customer.id, {
        dob: dobInput.trim(),
        ssnLast4: ssnInput.trim(),
        billingZip: zipInput.trim(),
      });
      setDetail({ ...detail, customer: res.customer });
      setStatusMsg(
        `Verified (${res.verifiedFactors}/3 factors). Confidential fields updated for ${activeRole}.`
      );
      loadList();
      onVerified();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'KBA verification denied.');
    }
  };

  const handleSimulateCaller = async () => {
    if (!detail) return;
    setErrorMsg(null);
    try {
      const script = await api.getCallerScript(detail.customer.id);
      setDobInput(script.dob);
      setSsnInput(script.ssnLast4);
      setZipInput(script.billingZip);
      setStatusMsg('Simulated cardholder response loaded. Submit to verify.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate caller script.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Account List */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter cardholders by name, code, last 4..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            customers.map((cust) => {
              const selected = cust.id === selectedId;
              return (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => setSelectedId(cust.id)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    selected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {cust.fullName}
                      </span>
                      {cust.kbaVerified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 font-mono">
                      {cust.customerCode} · {cust.cardNetwork} •••• {cust.cardLast4}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-medium text-slate-900 tabular-nums">
                      ${cust.currentBalance.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">{cust.accountStatus}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Account & Verification Inspector */}
      <div className="lg:col-span-7 space-y-4">
        {detail ? (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span>{detail.customer.customerCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{detail.customer.cardTier}</span>
                    <span aria-hidden="true">·</span>
                    <span>Exp {detail.customer.cardExpiry}</span>
                  </div>
                  <h3 className="mt-1 text-lg font-display font-semibold text-slate-900">
                    {detail.customer.fullName}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  {detail.customer.piiRedacted ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-700">
                      <Lock className="w-3.5 h-3.5" />
                      <span>PII Masked ({activeRole})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-700">
                      <Unlock className="w-3.5 h-3.5" />
                      <span>
                        {activeRole === 'Compliance Admin'
                          ? 'Admin Override Unmasked'
                          : 'KBA Verified'}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
                >
                  {errorMsg}
                </div>
              )}
              {statusMsg && (
                <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {statusMsg}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Primary PAN</span>
                  <span className="mt-0.5 font-mono font-medium text-slate-900">
                    {detail.customer.fullPan}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date of Birth</span>
                  <span className="mt-0.5 font-mono text-slate-900">{detail.customer.dob}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">SSN Last 4</span>
                  <span className="mt-0.5 font-mono text-slate-900">
                    {detail.customer.ssnLast4}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email</span>
                  <span className="mt-0.5 text-slate-900">{detail.customer.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone</span>
                  <span className="mt-0.5 font-mono text-slate-900">{detail.customer.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Account Status</span>
                  <span className="mt-0.5 font-medium text-slate-900">
                    {detail.customer.accountStatus}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-slate-500 block">Billing Address</span>
                  <span className="mt-0.5 text-slate-900">{detail.customer.billingAddress}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500 block">Credit Limit</span>
                  <span className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    ${detail.customer.creditLimit.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current Balance</span>
                  <span className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    ${detail.customer.currentBalance.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Available Credit</span>
                  <span className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                    ${detail.customer.availableCredit.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">APR / Points</span>
                  <span className="mt-0.5 font-mono text-slate-900 tabular-nums">
                    {detail.customer.apr}% · {detail.customer.rewardPoints.toLocaleString()} pts
                  </span>
                </div>
              </div>

              {!detail.customer.kbaVerified && (
                <form
                  onSubmit={handleVerify}
                  className="pt-4 border-t border-slate-200 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-800">
                      Customer KBA Challenge (Match 2 of 3 Factors)
                    </span>
                    <button
                      type="button"
                      onClick={handleSimulateCaller}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Simulate Caller Answers
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={dobInput}
                      onChange={(e) => setDobInput(e.target.value)}
                      placeholder="DOB (YYYY-MM-DD)"
                      className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={ssnInput}
                      onChange={(e) => setSsnInput(e.target.value)}
                      placeholder="SSN Last 4"
                      className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      value={zipInput}
                      onChange={(e) => setZipInput(e.target.value)}
                      placeholder="Billing ZIP"
                      className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify &amp; Unlock Customer Session</span>
                  </button>
                </form>
              )}
            </div>

            {/* Linked Service Requests */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-display font-semibold text-slate-900">
                  Associated Service Requests
                </h4>
                <span className="text-xs font-mono text-slate-500">
                  {detail.requests.length} tickets
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {detail.requests.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onOpenTicket(r.id)}
                    className="w-full text-left px-5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-medium text-slate-900">{r.ticketNumber}</span>{' '}
                      <span className="text-slate-500">· {r.category} ·</span>{' '}
                      <span className="text-slate-800 truncate">{r.subject}</span>
                    </div>
                    <span className="font-mono text-slate-600 shrink-0">{r.status}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
            Select a cardholder account to inspect confidential profile controls and KBA status.
          </div>
        )}
      </div>
    </div>
  );
}
