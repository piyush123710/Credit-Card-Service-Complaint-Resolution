import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { RequestPriority, RequestStatus, ValidationStatus } from '../shared/types.ts';

export function RequestStatusLabel({ status }: { status: RequestStatus }) {
  switch (status) {
    case 'Resolved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Resolved</span>
        </span>
      );
    case 'Escalated':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Escalated</span>
        </span>
      );
    case 'In Review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
          <Eye className="w-3.5 h-3.5 shrink-0" />
          <span>In Review</span>
        </span>
      );
    case 'Pending Customer':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Pending Customer</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Open</span>
        </span>
      );
  }
}

export function PriorityText({ priority }: { priority: RequestPriority }) {
  const color =
    priority === 'Critical'
      ? 'text-red-700 font-semibold'
      : priority === 'High'
        ? 'text-amber-700 font-medium'
        : priority === 'Medium'
          ? 'text-slate-700'
          : 'text-slate-500';

  return <span className={`text-xs whitespace-nowrap ${color}`}>{priority}</span>;
}

export function ValidationStatusLabel({ status }: { status: ValidationStatus }) {
  if (status === 'Passed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Passed</span>
      </span>
    );
  }
  if (status === 'Remediated') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Remediated</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 shrink-0" />
      <span>Failed</span>
    </span>
  );
}
