import React, { useEffect, useState } from 'react';
import { Check, Play, RotateCcw, Wrench } from 'lucide-react';
import type { DashboardSummary, OperatorRole, ValidationScenario } from '../shared/types.ts';
import { api } from '../lib/api.ts';
import { ValidationStatusLabel } from './StatusIndicator.tsx';

interface ValidationSuiteViewProps {
  activeRole: OperatorRole;
  onChanged: () => void;
}

export function ValidationSuiteView({ activeRole, onChanged }: ValidationSuiteViewProps) {
  const [scenarios, setScenarios] = useState<ValidationScenario[]>([]);
  const [summary, setSummary] = useState<DashboardSummary['validationSummary'] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const res = await api.getValidationScenarios({
        status: statusFilter,
        category: categoryFilter,
      });
      setScenarios(res.items);
      setSummary(res.summary);
      if (res.items.length > 0 && (!selectedId || !res.items.some((s) => s.id === selectedId))) {
        setSelectedId(res.items[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load validation scenarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenarios();
  }, [statusFilter, categoryFilter, activeRole]);

  const handleRunSuite = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.runValidationSuite();
      setSummary(res.summary);
      setMessage(
        `Executed ${res.result.checked} validation rules: ${res.result.passed} passed, ${res.result.remediated} remediated, ${res.result.failed} anomalies remaining.`
      );
      loadScenarios();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to execute validation suite.');
    } finally {
      setBusy(false);
    }
  };

  const handleRemediate = async (id: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.remediateScenario(id);
      setSummary(res.summary);
      setMessage(
        `Remediated ${res.scenario.scenarioCode} (${res.scenario.targetRef}). Dataset accuracy is now ${res.summary.accuracyPercent}%.`
      );
      loadScenarios();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remediate scenario.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.resetDataset();
      setMessage('Restored baseline 46 scenarios and 168 simulated service requests.');
      loadScenarios();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset simulation dataset.');
    } finally {
      setBusy(false);
    }
  };

  const selected = scenarios.find((s) => s.id === selectedId) ?? scenarios[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Top Validation Summary Strip */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-4">
            <span className="text-xs text-slate-500 block">Validation Scenarios</span>
            <span className="mt-1 text-xl font-display font-semibold text-slate-900 font-mono tabular-nums block">
              {summary.totalScenarios}
            </span>
          </div>
          <div className="p-4">
            <span className="text-xs text-slate-500 block">Passed Rules</span>
            <span className="mt-1 text-xl font-display font-semibold text-emerald-700 font-mono tabular-nums block">
              {summary.passedCount}
            </span>
          </div>
          <div className="p-4">
            <span className="text-xs text-slate-500 block">Remediated Records</span>
            <span className="mt-1 text-xl font-display font-semibold text-blue-700 font-mono tabular-nums block">
              {summary.remediatedCount}
            </span>
          </div>
          <div className="p-4">
            <span className="text-xs text-slate-500 block">Open Anomalies</span>
            <span className="mt-1 text-xl font-display font-semibold text-red-700 font-mono tabular-nums block">
              {summary.failedCount}
            </span>
          </div>
          <div className="p-4">
            <span className="text-xs text-slate-500 block">Dataset Accuracy</span>
            <span className="mt-1 text-xl font-display font-semibold text-slate-900 font-mono tabular-nums block">
              {summary.accuracyPercent}%
            </span>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {['All', 'Failed', 'Remediated', 'Passed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter scenario category"
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          >
            <option value="All">All Rule Categories</option>
            <option value="Duplicate Posting">Duplicate Posting</option>
            <option value="Balance Mismatch">Balance Mismatch</option>
            <option value="APR & Interest">APR &amp; Interest</option>
            <option value="Card Lifecycle">Card Lifecycle</option>
            <option value="Credit Limit">Credit Limit</option>
            <option value="FX & Fees">FX &amp; Fees</option>
            <option value="Rewards Ledger">Rewards Ledger</option>
            <option value="Reg Z Compliance">Reg Z Compliance</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Baseline</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleRunSuite}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Validation Suite</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
        >
          {error}
        </div>
      )}
      {message && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
          {message}
        </div>
      )}

      {/* Split Grid: Scenarios Table + Selected Discrepancy Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-2.5 px-4 whitespace-nowrap">Code</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Validation Rule</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-4 whitespace-nowrap text-right">Exposure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Loading scenarios...
                    </td>
                  </tr>
                ) : (
                  scenarios.map((s) => {
                    const active = selected?.id === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedId(s.id)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                          {s.scenarioCode}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="text-slate-500">
                            {s.category} · {s.targetRef}
                          </div>
                          <div className="font-medium text-slate-900">{s.title}</div>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <ValidationStatusLabel status={s.status} />
                        </td>
                        <td className="py-2.5 px-4 font-mono text-right tabular-nums whitespace-nowrap">
                          {s.discrepancyAmount > 0 ? `$${s.discrepancyAmount.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5">
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 text-xs">
              <div className="pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-slate-500">
                    {selected.scenarioCode} · {selected.targetType} {selected.targetRef}
                  </div>
                  <h3 className="mt-1 text-base font-display font-semibold text-slate-900">
                    {selected.title}
                  </h3>
                </div>
                <ValidationStatusLabel status={selected.status} />
              </div>

              <div>
                <span className="font-medium text-slate-700 block mb-1">Integrity Rule</span>
                <p className="text-slate-600 leading-relaxed">{selected.ruleDescription}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Expected Authoritative Value</span>
                  <span className="mt-0.5 font-mono font-semibold text-emerald-700 block">
                    {selected.expectedValue}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Observed Record Value</span>
                  <span
                    className={`mt-0.5 font-mono font-semibold block ${
                      selected.status === 'Failed' ? 'text-red-700' : 'text-slate-900'
                    }`}
                  >
                    {selected.actualValue}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-medium text-slate-700 block mb-1">
                  Recommended Remediation
                </span>
                <p className="text-slate-600">{selected.remediationAction}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-slate-500">
                <span>Cardholder: {selected.customerName}</span>
                <span className="font-mono">
                  Checked {new Date(selected.lastCheckedAt).toLocaleTimeString()}
                </span>
              </div>

              {selected.status === 'Failed' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleRemediate(selected.id)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>
                    {activeRole === 'Compliance Admin'
                      ? 'Apply Ledger Remediation'
                      : 'Apply Ledger Remediation (Requires Compliance Admin)'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700 font-medium pt-1">
                  <Check className="w-4 h-4" />
                  <span>
                    {selected.remediatedBy
                      ? `Remediated by ${selected.remediatedBy}`
                      : 'Record passes validation checks'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Select a validation scenario to inspect expected vs. observed ledger records.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
