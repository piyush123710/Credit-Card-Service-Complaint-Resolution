import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  DollarSign,
  Lock,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import type {
  CustomerAccount,
  LedgerTransaction,
  OperatorRole,
  RequestStatus,
  ServiceRequest,
} from '../shared/types.ts';
import { api } from '../lib/api.ts';
import { PriorityText, RequestStatusLabel } from './StatusIndicator.tsx';

interface TicketDetailDrawerProps {
  requestId: string;
  activeRole: OperatorRole;
  onClose: () => void;
  onUpdated: () => void;
}

export function TicketDetailDrawer({
  requestId,
  activeRole,
  onClose,
  onUpdated,
}: TicketDetailDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [requestDoc, setRequestDoc] = useState<ServiceRequest | null>(null);
  const [customer, setCustomer] = useState<(CustomerAccount & { piiRedacted?: boolean }) | null>(
    null
  );
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Resolution state
  const [nextStatus, setNextStatus] = useState<RequestStatus>('In Review');
  const [note, setNote] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // KBA Verification state
  const [dobInput, setDobInput] = useState('');
  const [ssnInput, setSsnInput] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRequestDetail(requestId);
      setRequestDoc(res.request);
      setCustomer(res.customer);
      setTransactions(res.transactions);
      setNextStatus(res.request.status);
      if (res.request.amountDisputed > 0) {
        setCreditAmount(String(res.request.amountDisputed));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load ticket details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [requestId, activeRole]);

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDoc) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await api.updateRequest(requestDoc.id, {
        status: nextStatus,
        note: note.trim(),
      });
      setRequestDoc(res.request);
      setNote('');
      setFeedback(`Ticket ${res.request.ticketNumber} updated to ${res.request.status}.`);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleIssueCredit = async () => {
    if (!requestDoc) return;
    const amt = Number(creditAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid provisional credit amount.');
      return;
    }
    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await api.issueProvisionalCredit(requestDoc.id, amt);
      setRequestDoc(res.request);
      setFeedback(`Issued $${amt.toFixed(2)} provisional credit.`);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to issue provisional credit.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyKba = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setVerifying(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await api.verifyCustomerKba(customer.id, {
        dob: dobInput.trim(),
        ssnLast4: ssnInput.trim(),
        billingZip: zipInput.trim(),
      });
      setCustomer(res.customer);
      setFeedback(
        `Customer KBA verification succeeded (${res.verifiedFactors} factors matched). Confidential fields unlocked per ${activeRole} policy.`
      );
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSimulateCaller = async () => {
    if (!customer) return;
    setError(null);
    try {
      const script = await api.getCallerScript(customer.id);
      setDobInput(script.dob);
      setSsnInput(script.ssnLast4);
      setZipInput(script.billingZip);
      setFeedback('Simulated caller verification details populated. Submit to verify.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to simulate caller.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span>{requestDoc?.ticketNumber ?? 'Loading...'}</span>
              <span aria-hidden="true">·</span>
              <span>{requestDoc?.category ?? ''}</span>
              <span aria-hidden="true">·</span>
              <span>{requestDoc?.subcategory ?? ''}</span>
            </div>
            <h2 className="mt-1 text-base font-display font-semibold text-slate-900 truncate">
              {requestDoc?.subject ?? 'Service Request Detail'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail drawer"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-40 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-40 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
                >
                  {error}
                </div>
              )}
              {feedback && (
                <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  {feedback}
                </div>
              )}

              {requestDoc && (
                <>
                  {/* Request Summary */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <RequestStatusLabel status={requestDoc.status} />
                        <span className="text-slate-300" aria-hidden="true">
                          |
                        </span>
                        <PriorityText priority={requestDoc.priority} />
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        Assigned: {requestDoc.assignedOperator} ({requestDoc.assignedRole})
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">{requestDoc.description}</p>

                    <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-500 block">Disputed Amount</span>
                        <span className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                          ${requestDoc.amountDisputed.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Provisional Credit</span>
                        <span className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                          ${requestDoc.provisionalCreditIssued.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">SLA Target</span>
                        <span className="mt-0.5 font-mono text-slate-700 tabular-nums">
                          {new Date(requestDoc.slaDueAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confidential Customer Account & KBA Verification */}
                  {customer && (
                    <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {customer.piiRedacted ? (
                            <Lock className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Unlock className="w-4 h-4 text-emerald-600" />
                          )}
                          <h3 className="text-sm font-display font-semibold text-slate-900">
                            Cardholder Account &amp; Identity Verification
                          </h3>
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          {customer.customerCode} · {customer.cardNetwork}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                        <div>
                          <span className="text-slate-500 block">Cardholder</span>
                          <span className="font-medium text-slate-900">{customer.fullName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Card Number</span>
                          <span className="font-mono text-slate-900">{customer.fullPan}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Date of Birth</span>
                          <span className="font-mono text-slate-900">{customer.dob}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">SSN Last 4</span>
                          <span className="font-mono text-slate-900">{customer.ssnLast4}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block">Billing Address</span>
                          <span className="text-slate-900">{customer.billingAddress}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Current / Limit</span>
                          <span className="font-mono text-slate-900 tabular-nums">
                            ${customer.currentBalance.toLocaleString()} / $
                            {customer.creditLimit.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Account Status</span>
                          <span className="font-medium text-slate-900">{customer.accountStatus}</span>
                        </div>
                      </div>

                      {!customer.kbaVerified && (
                        <form
                          onSubmit={handleVerifyKba}
                          className="pt-3 border-t border-slate-100 space-y-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-700">
                              Verify 2 of 3 Customer KBA Factors to Unlock Account
                            </span>
                            <button
                              type="button"
                              onClick={handleSimulateCaller}
                              className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
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
                              className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <input
                              type="text"
                              value={ssnInput}
                              onChange={(e) => setSsnInput(e.target.value)}
                              placeholder="SSN Last 4"
                              className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <input
                              type="text"
                              value={zipInput}
                              onChange={(e) => setZipInput(e.target.value)}
                              placeholder="Billing ZIP"
                              className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={verifying}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{verifying ? 'Verifying...' : 'Verify Customer Identity'}</span>
                          </button>
                        </form>
                      )}

                      {customer.kbaVerified && (
                        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            KBA Verified by {customer.kbaVerifiedBy} at{' '}
                            {customer.kbaVerifiedAt
                              ? new Date(customer.kbaVerifiedAt).toLocaleString()
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Operator Resolution Controls */}
                  <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-display font-semibold text-slate-900">
                      Resolution &amp; Financial Controls ({activeRole})
                    </h3>

                    <form onSubmit={handleUpdateTicket} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Ticket Status
                          </label>
                          <select
                            value={nextStatus}
                            onChange={(e) => setNextStatus(e.target.value as RequestStatus)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          >
                            <option value="Open">Open</option>
                            <option value="In Review">In Review</option>
                            <option value="Pending Customer">Pending Customer</option>
                            <option value="Escalated">Escalated</option>
                            <option value="Resolved">Resolved</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Provisional Credit (USD)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={creditAmount}
                              onChange={(e) => setCreditAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                            <button
                              type="button"
                              disabled={saving}
                              onClick={handleIssueCredit}
                              className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Credit</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Operator Investigation Note
                        </label>
                        <textarea
                          rows={2}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Document verification findings, merchant contact, or fee waiver reason..."
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {saving ? 'Saving...' : 'Save Ticket Update'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Recent Card Transactions */}
                  {transactions.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-xs font-display font-semibold text-slate-900">
                          Linked Card Ledger Activity
                        </h3>
                        <span className="text-xs font-mono text-slate-500">
                          {transactions.length} entries
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {transactions.slice(0, 5).map((tx) => (
                          <div
                            key={tx.id}
                            className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-slate-800 truncate">
                                {tx.merchant}
                              </div>
                              <div className="text-slate-500 font-mono">
                                {tx.txRef} · {tx.type} · {tx.status}
                              </div>
                            </div>
                            <div className="font-mono font-medium text-slate-900 tabular-nums shrink-0">
                              ${tx.postedAmountUsd.toFixed(2)} {tx.currency}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activity Timeline */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <h3 className="text-sm font-display font-semibold text-slate-900 mb-3">
                      Audit &amp; Resolution Timeline
                    </h3>
                    <div className="space-y-3">
                      {requestDoc.timeline.map((event) => (
                        <div
                          key={event.id}
                          className="pb-3 border-b border-slate-100 last:border-b-0 last:pb-0 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-slate-900">{event.action}</span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-0.5 text-slate-500">
                            {event.actor} · {event.role}
                          </div>
                          <p className="mt-1 text-slate-700">{event.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
