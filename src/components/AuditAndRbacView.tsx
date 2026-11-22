import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import type { AuditLogEntry, OperatorRole } from '../shared/types.ts';
import { api } from '../lib/api.ts';

interface AuditAndRbacViewProps {
  activeRole: OperatorRole;
  refreshSignal: number;
}

const PERMISSION_MATRIX: Array<{
  capability: string;
  agent: string;
  specialist: string;
  admin: string;
}> = [
  {
    capability: 'View Service Queue & Add Notes',
    agent: 'Allowed',
    specialist: 'Allowed',
    admin: 'Allowed',
  },
  {
    capability: 'Customer KBA Identity Verification',
    agent: 'Allowed (2 of 3 factors)',
    specialist: 'Allowed (2 of 3 factors)',
    admin: 'Allowed + Override',
  },
  {
    capability: 'Unmasked Full PAN / SSN / Billing PII',
    agent: 'Blocked (Masked)',
    specialist: 'KBA-Verified Only (PAN Masked)',
    admin: 'Full Access (Logged)',
  },
  {
    capability: 'Resolve Transaction Disputes',
    agent: 'Blocked (Up to $500 Billing only)',
    specialist: 'Allowed',
    admin: 'Allowed',
  },
  {
    capability: 'Issue Provisional Dispute Credit',
    agent: 'Blocked (403 Denied)',
    specialist: 'Up to $2,500.00',
    admin: 'Unlimited',
  },
  {
    capability: 'Run 46 Ledger Validation Rules',
    agent: 'Blocked (403 Denied)',
    specialist: 'Allowed (Read-Only)',
    admin: 'Allowed',
  },
  {
    capability: 'Remediate Incorrect Ledger Records',
    agent: 'Blocked (403 Denied)',
    specialist: 'Blocked (403 Denied)',
    admin: 'Allowed',
  },
  {
    capability: 'Inspect Security & RBAC Audit Logs',
    agent: 'Blocked (403 Denied)',
    specialist: 'Allowed',
    admin: 'Allowed',
  },
];

export function AuditAndRbacView({ activeRole, refreshSignal }: AuditAndRbacViewProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deniedError, setDeniedError] = useState<string | null>(null);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setDeniedError(null);
      try {
        const res = await api.getAuditLogs();
        setLogs(res.items);
      } catch (err) {
        setLogs([]);
        setDeniedError(err instanceof Error ? err.message : 'Access restricted.');
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [activeRole, refreshSignal]);

  return (
    <div className="space-y-6">
      {/* RBAC Permissions Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-display font-semibold text-slate-900">
              Role-Based Access Control Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Server-enforced endpoint authorization and field-level PII masking policy
            </p>
          </div>
          <span className="text-xs font-mono text-blue-700 font-medium">
            Active Role: {activeRole}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-2.5 px-6">Protected Capability</th>
                <th className="py-2.5 px-4">Support Agent</th>
                <th className="py-2.5 px-4">Dispute Specialist</th>
                <th className="py-2.5 px-4">Compliance Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.capability}>
                  <td className="py-2.5 px-6 font-medium text-slate-900">{row.capability}</td>
                  <td className="py-2.5 px-4 text-slate-600">{row.agent}</td>
                  <td className="py-2.5 px-4 text-slate-600">{row.specialist}</td>
                  <td className="py-2.5 px-4 text-slate-900 font-medium">{row.admin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Operations Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-display font-semibold text-slate-900">
              Security &amp; Operations Audit Trail
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable server log of authentication events, KBA verifications, RBAC denials, and ledger fixes
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {logs.length} recorded events
          </span>
        </div>

        {deniedError ? (
          <div className="p-8 flex items-center gap-3 text-xs text-red-800 bg-red-50/60">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <div className="font-semibold">Server RBAC Enforcement (403 Forbidden)</div>
              <div className="mt-0.5">{deniedError}</div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-6 whitespace-nowrap">Timestamp</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Actor &amp; Role</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Action</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Outcome</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      Loading audit trail...
                    </td>
                  </tr>
                ) : (
                  logs.map((entry) => (
                    <tr key={entry.id}>
                      <td className="py-2.5 px-6 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-900">{entry.actorName}</span>{' '}
                        <span className="text-slate-400">· {entry.actorRole}</span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {entry.action}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {entry.outcome === 'Denied' ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Denied</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{entry.outcome}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{entry.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
