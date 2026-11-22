/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  DashboardSummary,
  OperatorRole,
  OperatorSession,
  RequestCategory,
} from './shared/types.ts';
import { api, setApiToken } from './lib/api.ts';
import { AuthGate } from './components/AuthGate.tsx';
import { OverviewMetrics } from './components/OverviewMetrics.tsx';
import { ServiceQueueView } from './components/ServiceQueueView.tsx';
import { CustomerDirectoryView } from './components/CustomerDirectoryView.tsx';
import { ValidationSuiteView } from './components/ValidationSuiteView.tsx';
import { AuditAndRbacView } from './components/AuditAndRbacView.tsx';
import { TicketDetailDrawer } from './components/TicketDetailDrawer.tsx';

type NavTab = 'overview' | 'queue' | 'customers' | 'validation' | 'audit';

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'queue', label: 'Service Requests', icon: Inbox },
  { id: 'customers', label: 'Cardholder KBA', icon: Users },
  { id: 'validation', label: 'Validation Suite', icon: CheckSquare },
  { id: 'audit', label: 'Access & Audit', icon: ShieldCheck },
];

const VIEW_TITLES: Record<NavTab, string> = {
  overview: 'Operations Overview',
  queue: 'Service Requests Queue',
  customers: 'Cardholder Accounts & KBA Verification',
  validation: 'Transaction & Account Validation Suite',
  audit: 'Role-Based Access Control & Audit Trail',
};

function OperatorAvatar({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (failed || !src) {
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 text-xs font-display font-semibold flex items-center justify-center shrink-0">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${name} portrait`}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
    />
  );
}

export default function App() {
  const [authChecking, setAuthChecking] = useState(true);
  const [authStatus, setAuthStatus] = useState<{ needsSetup: boolean; envConfigured: boolean }>({
    needsSetup: false,
    envConfigured: false,
  });
  const [session, setSession] = useState<OperatorSession | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [queueCategory, setQueueCategory] = useState<string>('All');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [roleSwitching, setRoleSwitching] = useState<boolean>(false);

  useEffect(() => {
    api
      .getAuthStatus()
      .then((res) => setAuthStatus(res))
      .catch(() => setAuthStatus({ needsSetup: false, envConfigured: false }))
      .finally(() => setAuthChecking(false));
  }, []);

  const loadSummary = async () => {
    try {
      const res = await api.getDashboardSummary();
      setSummary(res);
    } catch {
      // Summary error handled cleanly on auth expiry
    }
  };

  useEffect(() => {
    if (session) {
      loadSummary();
    }
  }, [session, refreshSignal]);

  const handleAuthenticated = (nextSession: OperatorSession) => {
    setApiToken(nextSession.token);
    setSession(nextSession);
    setAuthStatus((prev) => ({ ...prev, needsSetup: false }));
  };

  const handleRoleSwitch = async (role: OperatorRole) => {
    if (!session || role === session.role) return;
    setRoleSwitching(true);
    try {
      const res = await api.switchRole(role);
      setApiToken(res.session.token);
      setSession(res.session);
      setRefreshSignal((n) => n + 1);
    } finally {
      setRoleSwitching(false);
    }
  };

  const handleSignOut = () => {
    setApiToken(null);
    setSession(null);
    setSummary(null);
    setSelectedTicketId(null);
  };

  const triggerRefresh = () => {
    setRefreshSignal((n) => n + 1);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500">
        Loading Meridian CardOps...
      </div>
    );
  }

  if (!session) {
    return (
      <AuthGate
        needsSetup={authStatus.needsSetup}
        envConfigured={authStatus.envConfigured}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  const handleOverviewCategoryClick = (cat: RequestCategory) => {
    setQueueCategory(cat);
    setActiveTab('queue');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Navigation (256px Desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-150 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-900 font-display font-semibold text-base tracking-tight whitespace-nowrap shrink-0">
              <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Meridian CardOps</span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'queue' && summary && (
                    <span className="font-mono text-slate-500 tabular-nums">
                      {summary.totalRequests}
                    </span>
                  )}
                  {item.id === 'validation' && summary && (
                    <span className="font-mono text-slate-500 tabular-nums">
                      {summary.validationSummary.totalScenarios}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Operator Profile Card */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center gap-3">
            <OperatorAvatar src={session.avatarUrl} name={session.operatorName} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-900 truncate">
                {session.operatorName}
              </div>
              <div className="text-xs text-slate-500 truncate">{session.role}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap truncate">
              <span className="font-medium text-slate-700">Meridian CardOps</span>
              <span aria-hidden="true">/</span>
              <span className="font-display font-semibold text-slate-900">
                {VIEW_TITLES[activeTab]}
              </span>
            </div>
          </div>

          {/* Role Context Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="rbac-role-select" className="hidden sm:inline text-xs text-slate-500">
              Active Role
            </label>
            <select
              id="rbac-role-select"
              value={session.role}
              disabled={roleSwitching}
              onChange={(e) => handleRoleSwitch(e.target.value as OperatorRole)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="Compliance Admin">Compliance Admin</option>
              <option value="Dispute Specialist">Dispute Specialist</option>
              <option value="Support Agent">Support Agent</option>
            </select>
          </div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {activeTab === 'overview' && summary && (
            <>
              <OverviewMetrics
                summary={summary}
                onSelectCategory={handleOverviewCategoryClick}
                onNavigateValidation={() => setActiveTab('validation')}
              />
              <ServiceQueueView
                initialCategory={queueCategory}
                onSelectTicket={(id) => setSelectedTicketId(id)}
                refreshSignal={refreshSignal}
                onCreated={triggerRefresh}
                activeRole={session.role}
              />
            </>
          )}

          {activeTab === 'queue' && (
            <ServiceQueueView
              initialCategory={queueCategory}
              onSelectTicket={(id) => setSelectedTicketId(id)}
              refreshSignal={refreshSignal}
              onCreated={triggerRefresh}
              activeRole={session.role}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerDirectoryView
              activeRole={session.role}
              refreshSignal={refreshSignal}
              onVerified={triggerRefresh}
              onOpenTicket={(id) => setSelectedTicketId(id)}
            />
          )}

          {activeTab === 'validation' && (
            <ValidationSuiteView activeRole={session.role} onChanged={triggerRefresh} />
          )}

          {activeTab === 'audit' && (
            <AuditAndRbacView activeRole={session.role} refreshSignal={refreshSignal} />
          )}
        </main>
      </div>

      {/* Slide-Over Ticket Resolution & KBA Drawer */}
      {selectedTicketId && (
        <TicketDetailDrawer
          requestId={selectedTicketId}
          activeRole={session.role}
          onClose={() => setSelectedTicketId(null)}
          onUpdated={triggerRefresh}
        />
      )}
    </div>
  );
}
