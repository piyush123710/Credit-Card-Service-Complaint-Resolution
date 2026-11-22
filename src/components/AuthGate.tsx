import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import type { OperatorRole, OperatorSession } from '../shared/types.ts';
import { api } from '../lib/api.ts';

interface AuthGateProps {
  needsSetup: boolean;
  envConfigured: boolean;
  onAuthenticated: (session: OperatorSession) => void;
}

const ROLES: Array<{ role: OperatorRole; summary: string }> = [
  {
    role: 'Compliance Admin',
    summary: 'Full ledger remediation, unmasked PII access, audit trail, and dataset reset.',
  },
  {
    role: 'Dispute Specialist',
    summary: 'Chargeback resolution, provisional credits up to $2,500, and validation runs.',
  },
  {
    role: 'Support Agent',
    summary: 'Billing inquiries, card complaints, and customer KBA verification with masked PII.',
  },
];

export function AuthGate({ needsSetup, envConfigured, onAuthenticated }: AuthGateProps) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [selectedRole, setSelectedRole] = useState<OperatorRole>('Compliance Admin');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (needsSetup) {
      if (passcode.trim().length < 6) {
        setError('Workspace passcode must be at least 6 characters.');
        return;
      }
      if (passcode !== confirmPasscode) {
        setError('Passcodes do not match.');
        return;
      }
      setSubmitting(true);
      try {
        const res = await api.claimAdmin(passcode.trim());
        onAuthenticated(res.session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to initialize workspace.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!passcode.trim()) {
      setError('Enter your operator workspace passcode.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.login(passcode.trim(), selectedRole);
      onAuthenticated(res.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Left Context Column */}
        <div className="lg:col-span-5 bg-slate-900 text-slate-100 p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-white font-display font-semibold text-lg tracking-tight">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
              <span>Meridian CardOps</span>
            </div>
            <h1 className="mt-6 text-2xl font-display font-semibold text-white tracking-tight text-balance">
              Credit Card Service &amp; Complaint Resolution Console
            </h1>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Role-governed operational workspace managing customer service queues, knowledge-based
              identity verification, and automated ledger reconciliation.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 space-y-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Simulated Service Queue</span>
              <span className="font-mono tabular-nums text-white">168 Requests</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Validation Rule Suite</span>
              <span className="font-mono tabular-nums text-white">46 Scenarios</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Access Enforcement</span>
              <span className="font-mono text-white">HMAC Bearer · RBAC</span>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-7 p-8">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {needsSetup
                ? 'First-Run Security Setup'
                : envConfigured
                  ? 'Environment-Configured Operator Access'
                  : 'Operator Authentication'}
            </span>
          </div>

          <h2 className="mt-2 text-xl font-display font-semibold text-slate-900">
            {needsSetup ? 'Initialize Workspace Passcode' : 'Sign In to Operations Console'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            {needsSetup
              ? 'Set a workspace passcode to protect confidential cardholder records and claim Compliance Admin access. Once signed in, you can switch between all three RBAC roles.'
              : 'Authenticate to receive a scoped Bearer session token. Confidential PII remains masked until customer KBA verification succeeds.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {!needsSetup && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Starting Operator Role
                </label>
                <div className="space-y-2">
                  {ROLES.map((item) => {
                    const active = selectedRole === item.role;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setSelectedRole(item.role)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50/60 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.role}</span>
                          {active && (
                            <span className="text-xs font-medium text-blue-700">Selected</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{item.summary}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="workspace-passcode" className="block text-xs font-medium text-slate-700 mb-1.5">
                {needsSetup ? 'Create Workspace Passcode (min. 6 characters)' : 'Workspace Passcode'}
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="workspace-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter operator passcode"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            {needsSetup && (
              <div>
                <label htmlFor="confirm-passcode" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Confirm Workspace Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirm-passcode"
                    type="password"
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Re-enter passcode"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>
                {submitting
                  ? 'Verifying...'
                  : needsSetup
                    ? 'Claim Workspace & Enter Console'
                    : 'Sign In to Console'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
