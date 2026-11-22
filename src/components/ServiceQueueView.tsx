import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import type {
  CustomerAccount,
  OperatorRole,
  RequestCategory,
  RequestPriority,
  ServiceRequest,
} from '../shared/types.ts';
import { api } from '../lib/api.ts';
import { PriorityText, RequestStatusLabel } from './StatusIndicator.tsx';

interface ServiceQueueViewProps {
  initialCategory?: string;
  onSelectTicket: (id: string) => void;
  refreshSignal: number;
  onCreated: () => void;
  activeRole: OperatorRole;
}

const CATEGORIES: Array<'All' | RequestCategory> = [
  'All',
  'Billing Inquiry',
  'Payment Issue',
  'Transaction Dispute',
  'Card Complaint',
];

export function ServiceQueueView({
  initialCategory = 'All',
  onSelectTicket,
  refreshSignal,
  onCreated,
}: ServiceQueueViewProps) {
  const [category, setCategory] = useState<string>(initialCategory);
  const [status, setStatus] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // New Request Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [newCustomerId, setNewCustomerId] = useState<string>('');
  const [newCategory, setNewCategory] = useState<RequestCategory>('Billing Inquiry');
  const [newSubcategory, setNewSubcategory] = useState<string>('Late Fee Waiver');
  const [newPriority, setNewPriority] = useState<RequestPriority>('Medium');
  const [newSubject, setNewSubject] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('0');
  const [creating, setCreating] = useState<boolean>(false);

  useEffect(() => {
    setCategory(initialCategory);
    setPage(1);
  }, [initialCategory]);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRequests({
        category,
        status,
        search,
        page,
        limit: 15,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load service requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [category, status, search, page, refreshSignal]);

  const openCreate = async () => {
    setShowCreateModal(true);
    if (customers.length === 0) {
      try {
        const res = await api.getCustomers();
        setCustomers(res.items);
        if (res.items.length > 0) setNewCustomerId(res.items[0].id);
      } catch {
        // Handled cleanly in form
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerId || !newSubject.trim() || !newDescription.trim()) return;
    setCreating(true);
    try {
      await api.createRequest({
        customerId: newCustomerId,
        category: newCategory,
        subcategory: newSubcategory.trim() || 'General Inquiry',
        subject: newSubject.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        amountDisputed: Number(newAmount) || 0,
      });
      setShowCreateModal(false);
      setNewSubject('');
      setNewDescription('');
      setNewAmount('0');
      setPage(1);
      onCreated();
      loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search ticket, customer, last 4..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Review">In Review</option>
            <option value="Pending Customer">Pending Customer</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
          </select>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* High-Density Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                <th className="py-2.5 px-4 whitespace-nowrap">Ticket</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Cardholder &amp; Card</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Category &amp; Subject</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Priority</th>
                <th className="py-2.5 px-4 whitespace-nowrap text-right">Amount</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Assigned Queue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="h-11">
                    <td colSpan={7} className="px-4 py-2">
                      <div className="h-5 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-slate-500">
                    No service requests match the active filters.
                  </td>
                </tr>
              ) : (
                items.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => onSelectTicket(req.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {req.ticketNumber}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{req.customerName}</div>
                      <div className="text-slate-500 font-mono">
                        {req.cardNetwork} •••• {req.cardLast4}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 max-w-md">
                      <div className="text-slate-500">
                        {req.category} <span aria-hidden="true">·</span> {req.subcategory}
                      </div>
                      <div className="font-medium text-slate-900 truncate">{req.subject}</div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <RequestStatusLabel status={req.status} />
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <PriorityText priority={req.priority} />
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-900 text-right tabular-nums whitespace-nowrap">
                      {req.amountDisputed > 0 ? `$${req.amountDisputed.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {req.assignedOperator} <span aria-hidden="true">·</span>{' '}
                      <span className="text-slate-400">{req.assignedRole}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div className="font-mono tabular-nums">
            Showing {items.length} of {total} matching requests
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono tabular-nums px-2">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-900">
                Log New Credit Card Service Request
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Cardholder Account</label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.customerCode} · •••• {c.cardLast4})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as RequestCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Billing Inquiry">Billing Inquiry</option>
                    <option value="Payment Issue">Payment Issue</option>
                    <option value="Transaction Dispute">Transaction Dispute</option>
                    <option value="Card Complaint">Card Complaint</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as RequestPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Disputed / Claim Amount (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Concise summary of customer issue"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Detailed Notes</label>
                <textarea
                  rows={3}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Include statement dates, merchant name, or payment confirmation trace..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg cursor-pointer"
                >
                  {creating ? 'Logging...' : 'Create Service Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
