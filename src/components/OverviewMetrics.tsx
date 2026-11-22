import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { DashboardSummary, RequestCategory } from '../shared/types.ts';

interface OverviewMetricsProps {
  summary: DashboardSummary;
  onSelectCategory: (category: RequestCategory) => void;
  onNavigateValidation: () => void;
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(val);
}

export function OverviewMetrics({
  summary,
  onSelectCategory,
  onNavigateValidation,
}: OverviewMetricsProps) {
  const categories: RequestCategory[] = [
    'Billing Inquiry',
    'Payment Issue',
    'Transaction Dispute',
    'Card Complaint',
  ];

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip (single elevation, hairline borders, no nested cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Service Requests Simulated</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-2xl font-display font-semibold text-slate-900 tabular-nums">
              {summary.totalRequests}
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {summary.openCount} open · {summary.escalatedCount} escalated
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 tabular-nums">
            {summary.resolvedCount} resolved · {summary.slaComplianceRate}% within SLA
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Disputed &amp; Claim Volume</div>
          <div className="mt-2 text-2xl font-display font-semibold text-slate-900 font-mono tabular-nums">
            {formatCurrency(summary.totalDisputedVolume)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            Provisional credits: {formatCurrency(summary.provisionalCreditsIssued)}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Ledger Data Accuracy</span>
            <button
              type="button"
              onClick={onNavigateValidation}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
            >
              <span>Inspect</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-2xl font-display font-semibold text-slate-900 font-mono tabular-nums">
              {summary.validationSummary.accuracyPercent}%
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {summary.validationSummary.passedCount + summary.validationSummary.remediatedCount}/
              {summary.validationSummary.totalScenarios} valid
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
            {summary.validationSummary.failedCount} anomalies ·{' '}
            {formatCurrency(summary.validationSummary.totalDiscrepancyExposure)} exposure
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Customer KBA Verification</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-2xl font-display font-semibold text-slate-900 font-mono tabular-nums">
              {summary.verifiedCustomersCount} / {summary.totalCustomersCount}
            </span>
            <span className="text-xs text-slate-500">accounts verified</span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Unverified PII masked across agent sessions
          </div>
        </div>
      </div>

      {/* Category Distribution Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-display font-semibold text-slate-900">
              Service Request Distribution by Category
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a category to filter the active operations queue
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            Total Queue: {summary.totalRequests} requests
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const count = summary.categoryCounts[cat] || 0;
            const pct =
              summary.totalRequests > 0 ? Math.round((count / summary.totalRequests) * 100) : 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className="text-left p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700 truncate">{cat}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-display font-semibold text-slate-900 font-mono tabular-nums">
                    {count}
                  </span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">{pct}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
