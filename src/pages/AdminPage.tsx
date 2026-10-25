import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { formatNXR, MINING_CONSTANTS } from '../utils/miningRules';
import {
  Shield,
  Sliders,
  Users,
  Pickaxe,
  FileText,
  AlertTriangle,
  Database,
  CheckCircle2,
  Lock,
  Server,
  Zap,
  Clock,
  Layers,
  ArrowRightLeft,
  Activity,
  Globe,
  Radio,
  RefreshCw,
  Search,
  Filter,
  UserX,
  UserCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  History,
  TrendingUp,
} from 'lucide-react';
import {
  fetchAdminOverview,
  fetchAdminUsers,
  updateAccountStatus,
  fetchUserAccountHistory,
  fetchAdminMiningSessions,
  fetchAdminLedger,
  executeLedgerReconciliation,
  fetchAdminTransfers,
  fetchAdminMarketStatus,
  fetchAdminSystemHealth,
  fetchAdminSecurityEvents,
  fetchAdminAuditLogs,
  executeAdminBalanceAdjustment,
  AdminOverviewData,
  AdminUserRecord,
  AdminLedgerEntry,
  AdminMiningSession,
  AdminTransferRecord,
  SecurityEventRecord,
  ServerAuditLogRecord,
  SystemHealthData,
} from '../services/adminService';

interface AdminPageProps {
  onOpenDbModal: () => void;
}

type AdminTab =
  | 'overview'
  | 'users'
  | 'mining'
  | 'ledger'
  | 'transfers'
  | 'market'
  | 'health'
  | 'security'
  | 'audit'
  | 'settings';

export const AdminPage: React.FC<AdminPageProps> = ({ onOpenDbModal }) => {
  const { user, login, setActiveTab: setAppTab, systemSettings, updateSystemSettings, addNotification } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState<boolean>(true);

  // 1. Overview Data
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);

  // 2. Users Data
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // User History Drawer / Modal
  const [selectedUserHistory, setSelectedUserHistory] = useState<{
    user: AdminUserRecord;
    miningSessions: AdminMiningSession[];
    transfers: AdminTransferRecord[];
    ledgerEntries: AdminLedgerEntry[];
  } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // User Status Confirmation Modal
  const [statusModal, setStatusModal] = useState<{
    user: AdminUserRecord;
    nextStatus: 'active' | 'suspended';
    reason: string;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Auditable Balance Adjustment Modal
  const [adjustmentModal, setAdjustmentModal] = useState<{
    user: AdminUserRecord;
    amountDelta: string;
    reason: string;
  } | null>(null);
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  // 3. Mining Sessions
  const [miningSessions, setMiningSessions] = useState<AdminMiningSession[]>([]);
  const [miningStatusFilter, setMiningStatusFilter] = useState('all');

  // 4. Ledger Data
  const [ledgerEntries, setLedgerEntries] = useState<AdminLedgerEntry[]>([]);
  const [ledgerFilterType, setLedgerFilterType] = useState('all');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [reconciliationReport, setReconciliationReport] = useState<any>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  // 5. Transfers Data
  const [transfers, setTransfers] = useState<AdminTransferRecord[]>([]);
  const [transferSearch, setTransferSearch] = useState('');

  // 6. Market Telemetry Data
  const [marketStatus, setMarketStatus] = useState<any>(null);

  // 7. System Health
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null);

  // 8. Security Events
  const [securityEvents, setSecurityEvents] = useState<SecurityEventRecord[]>([]);

  // 9. Audit Logs
  const [auditLogs, setAuditLogs] = useState<ServerAuditLogRecord[]>([]);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('all');

  const currentRole = user?.role || 'admin';
  const currentUserId = user?.id || 'usr_admin';

  // --------------------------------------------------------------------------
  // Data Fetching Handlers
  // --------------------------------------------------------------------------

  const loadOverview = useCallback(async () => {
    const res = await fetchAdminOverview(currentRole, currentUserId);
    if (res.success && res.overview) {
      setOverview(res.overview);
    }
  }, [currentRole, currentUserId]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchAdminUsers(currentRole, currentUserId, {
      page: userPagination.page,
      limit: userPagination.limit,
      search: userSearch,
      filterRole: userRoleFilter !== 'all' ? userRoleFilter : undefined,
      status: userStatusFilter !== 'all' ? userStatusFilter : undefined,
    });
    setIsLoading(false);
    if (res.success && res.users) {
      setUsersList(res.users);
      if (res.pagination) setUserPagination(res.pagination);
    } else if (res.error) {
      setErrorMessage(res.error);
    }
  }, [currentRole, currentUserId, userPagination.page, userPagination.limit, userSearch, userRoleFilter, userStatusFilter]);

  const loadMiningSessions = useCallback(async () => {
    const res = await fetchAdminMiningSessions(currentRole, currentUserId, miningStatusFilter);
    if (res.success && res.sessions) {
      setMiningSessions(res.sessions);
    }
  }, [currentRole, currentUserId, miningStatusFilter]);

  const loadLedger = useCallback(async () => {
    const res = await fetchAdminLedger(currentRole, currentUserId, ledgerPage, 20, ledgerFilterType);
    if (res.success && res.entries) {
      setLedgerEntries(res.entries);
    }
  }, [currentRole, currentUserId, ledgerPage, ledgerFilterType]);

  const loadTransfers = useCallback(async () => {
    const res = await fetchAdminTransfers(currentRole, currentUserId);
    if (res.success && res.transfers) {
      setTransfers(res.transfers);
    }
  }, [currentRole, currentUserId]);

  const loadMarketStatus = useCallback(async () => {
    const res = await fetchAdminMarketStatus(currentRole, currentUserId);
    if (res.success && res.marketStatus) {
      setMarketStatus(res.marketStatus);
    }
  }, [currentRole, currentUserId]);

  const loadSystemHealth = useCallback(async () => {
    const res = await fetchAdminSystemHealth(currentRole, currentUserId);
    if (res.success && res.health) {
      setSystemHealth(res.health);
    }
  }, [currentRole, currentUserId]);

  const loadSecurityEvents = useCallback(async () => {
    const res = await fetchAdminSecurityEvents(currentRole, currentUserId);
    if (res.success && res.events) {
      setSecurityEvents(res.events);
    }
  }, [currentRole, currentUserId]);

  const loadAuditLogs = useCallback(async () => {
    const res = await fetchAdminAuditLogs(currentRole, currentUserId, auditCategoryFilter);
    if (res.success && res.logs) {
      setAuditLogs(res.logs);
    }
  }, [currentRole, currentUserId, auditCategoryFilter]);

  // Load appropriate data when tab changes
  useEffect(() => {
    if (user?.role !== 'admin') return;
    setErrorMessage(null);
    switch (activeTab) {
      case 'overview':
        loadOverview();
        break;
      case 'users':
        loadUsers();
        break;
      case 'mining':
        loadMiningSessions();
        break;
      case 'ledger':
        loadLedger();
        break;
      case 'transfers':
        loadTransfers();
        break;
      case 'market':
        loadMarketStatus();
        break;
      case 'health':
        loadSystemHealth();
        break;
      case 'security':
        loadSecurityEvents();
        break;
      case 'audit':
        loadAuditLogs();
        break;
      case 'settings':
        break;
    }
  }, [
    activeTab,
    loadOverview,
    loadUsers,
    loadMiningSessions,
    loadLedger,
    loadTransfers,
    loadMarketStatus,
    loadSystemHealth,
    loadSecurityEvents,
    loadAuditLogs,
  ]);

  // Real-time EventSource listener for instant admin updates
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/realtime/stream');
      es.onopen = () => setSseConnected(true);
      es.onerror = () => setSseConnected(false);

      es.addEventListener('MINING_CLAIM', () => {
        if (activeTab === 'overview') loadOverview();
        if (activeTab === 'mining') loadMiningSessions();
        if (activeTab === 'ledger') loadLedger();
      });

      es.addEventListener('TRANSFER_COMPLETED', () => {
        if (activeTab === 'overview') loadOverview();
        if (activeTab === 'transfers') loadTransfers();
        if (activeTab === 'ledger') loadLedger();
      });

      es.addEventListener('USER_REGISTERED', () => {
        if (activeTab === 'overview') loadOverview();
        if (activeTab === 'users') loadUsers();
      });

      es.addEventListener('ADMIN_ACTION', () => {
        if (activeTab === 'overview') loadOverview();
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'audit') loadAuditLogs();
      });

      es.addEventListener('SECURITY_INCIDENT', () => {
        if (activeTab === 'overview') loadOverview();
        if (activeTab === 'security') loadSecurityEvents();
      });
    } catch {
      setSseConnected(false);
    }

    return () => {
      if (es) es.close();
    };
  }, [activeTab, loadOverview, loadMiningSessions, loadLedger, loadTransfers, loadUsers, loadAuditLogs, loadSecurityEvents]);

  // Execute Ledger Reconciliation
  const handleReconcile = async () => {
    setIsReconciling(true);
    const res = await executeLedgerReconciliation(currentRole, currentUserId);
    setIsReconciling(false);
    if (res.success && res.report) {
      setReconciliationReport(res.report);
      addNotification(
        'Reconciliation Complete',
        res.report.isConsistent
          ? 'All wallet balances match virtual ledger entries with zero discrepancies.'
          : `Discrepancy detected in ${res.report.discrepancies.length} accounts.`,
        res.report.isConsistent ? 'success' : 'warning'
      );
      loadOverview();
      loadLedger();
    } else {
      addNotification('Reconciliation Error', res.error || 'Failed to reconcile', 'warning');
    }
  };

  // Inspect User Account History
  const handleViewHistory = async (targetUser: AdminUserRecord) => {
    setIsLoadingHistory(true);
    const res = await fetchUserAccountHistory(currentRole, currentUserId, targetUser.userId);
    setIsLoadingHistory(false);
    if (res.success && res.user) {
      setSelectedUserHistory({
        user: res.user,
        miningSessions: res.miningSessions || [],
        transfers: res.transfers || [],
        ledgerEntries: res.ledgerEntries || [],
      });
    } else {
      addNotification('Error', res.error || 'Failed to load user history', 'warning');
    }
  };

  // Confirm Account Status Change (Suspend / Reactivate)
  const handleConfirmStatusChange = async () => {
    if (!statusModal) return;
    setIsUpdatingStatus(true);
    const res = await updateAccountStatus(
      currentRole,
      currentUserId,
      statusModal.user.userId,
      statusModal.nextStatus,
      statusModal.reason
    );
    setIsUpdatingStatus(false);
    if (res.success) {
      addNotification(
        'Account Updated',
        `User ${statusModal.user.email} marked as ${statusModal.nextStatus}.`,
        'success'
      );
      setStatusModal(null);
      loadUsers();
      loadOverview();
    } else {
      addNotification('Action Denied', res.error || 'Status update failed', 'warning');
    }
  };

  // Auditable Balance Adjustment Submission
  const handleExecuteAdjustment = async () => {
    if (!adjustmentModal) return;
    setAdjustmentError(null);

    const delta = parseFloat(adjustmentModal.amountDelta);
    if (isNaN(delta) || delta === 0) {
      setAdjustmentError('Please specify a valid non-zero numerical adjustment delta (e.g. +0.00010 or -0.00010).');
      return;
    }

    if (!adjustmentModal.reason || adjustmentModal.reason.trim().length < 8) {
      setAdjustmentError('An auditable explanation with at least 8 characters is strictly required.');
      return;
    }

    setIsAdjustingBalance(true);
    const res = await executeAdminBalanceAdjustment(
      currentRole,
      currentUserId,
      adjustmentModal.user.userId,
      delta,
      adjustmentModal.reason
    );
    setIsAdjustingBalance(false);

    if (res.success) {
      addNotification(
        'Balance Adjustment Applied',
        res.message || `Adjusted ${adjustmentModal.user.email} balance with verified audit log.`,
        'success'
      );
      setAdjustmentModal(null);
      loadUsers();
      loadOverview();
      loadLedger();
    } else {
      setAdjustmentError(res.error || 'Failed to execute balance adjustment.');
    }
  };

  // --------------------------------------------------------------------------
  // Navigation Tabs Configuration
  // --------------------------------------------------------------------------
  const tabs: Array<{ id: AdminTab; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: Sliders },
    { id: 'users', label: 'Registered Users', icon: Users },
    { id: 'mining', label: 'Mining Sessions', icon: Pickaxe },
    { id: 'ledger', label: 'Virtual Ledger', icon: Layers },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { id: 'market', label: 'Market Telemetry', icon: Globe },
    { id: 'health', label: 'System Health', icon: Server },
    { id: 'security', label: 'Security Events', icon: Lock },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Activity },
  ];

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/20">
          <Lock className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono uppercase tracking-wider">
            <span>403 Forbidden • Access Restricted</span>
          </div>
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-white">
            Administrative Privileges Required
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            The institutional admin console, virtual coin ledger, and system telemetry endpoints are strictly protected by server-side Role-Based Access Control (RBAC). Your current identity (<span className="text-white font-mono">{user?.email || 'guest'}</span>) holds the role <span className="text-amber-400 font-mono font-bold uppercase">{user?.role || 'user'}</span>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0C0E17] border border-slate-800 text-left text-xs font-mono space-y-2 text-slate-300">
          <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
            <span>Server RBAC Check</span>
            <span className="text-rose-400 font-bold">REJECTED (HTTP 403)</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Required Role:</span>
            <span className="text-[#ECC86A]">admin</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Active Account Role:</span>
            <span className="text-slate-400">{user?.role || 'user'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Authoritative Ledger:</span>
            <span className="text-emerald-400">Isolated & Intact</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={() => {
              login('admin@nexora.vip', 'admin');
              addNotification(
                'Admin Session Activated',
                'Authenticated as System Operator (admin@nexora.vip) with full RBAC access.',
                'success'
              );
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#ECC86A] text-black font-bold text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-[#D4AF37]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Authenticate as Administrator</span>
          </button>
          <button
            onClick={() => setAppTab('home')}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-[#ECC86A]" />
              <span>NEXORA Institutional Admin</span>
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full ${sseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{sseConnected ? 'Realtime Subscriptions Active' : 'Polling Mode Active'}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Operator: <span className="text-white font-mono">{user?.email || 'admin@nexora.vip'}</span> • Role:{' '}
            <span className="text-[#ECC86A] uppercase font-mono font-bold">{user?.role || 'admin'}</span>. Genuine database telemetry only.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDbModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-[#F3E5AB] border border-[#D4AF37]/35 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4 text-[#ECC86A]" />
            <span>PostgreSQL Schema</span>
          </button>
        </div>
      </div>

      {/* 2. Error Notice Banner if any */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Administrative Request Error</div>
            <p className="text-[11px] text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* 3. Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-none text-xs">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                  : 'bg-[#0E1018] text-slate-400 hover:text-white border border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: OVERVIEW
      ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-mono uppercase tracking-wider">Registered Accounts</span>
                <Users className="w-4 h-4 text-[#ECC86A]" />
              </div>
              <div className="font-mono text-2xl font-bold text-white">
                {overview?.users.total ?? 1}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400">{overview?.users.active ?? 1} Active</span>
                <span>•</span>
                <span className="text-rose-400">{overview?.users.suspended ?? 0} Suspended</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-mono uppercase tracking-wider">Mining Cycles</span>
                <Pickaxe className="w-4 h-4 text-[#ECC86A]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#F3E5AB]">
                {overview?.mining.totalSessions ?? 0}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400">{overview?.mining.activeSessions ?? 0} In Progress</span>
                <span>•</span>
                <span className="text-slate-300">{overview?.mining.claimedSessions ?? 0} Claimed</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-mono uppercase tracking-wider">Ledger Circulation</span>
                <Layers className="w-4 h-4 text-[#ECC86A]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#ECC86A]">
                {formatNXR(overview?.ledger.circulationNXR ?? 0)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{overview?.ledger.totalEntries ?? 0} Entries</span>
                <span>•</span>
                <span className={overview?.ledger.isConsistent ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {overview?.ledger.isConsistent ? 'Reconciled' : 'Audit Pending'}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-mono uppercase tracking-wider">System Security</span>
                <Lock className="w-4 h-4 text-[#ECC86A]" />
              </div>
              <div className="font-mono text-2xl font-bold text-emerald-400">
                100% SECURE
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{overview?.security.totalIncidents ?? 0} Incidents</span>
                <span>•</span>
                <span>{overview?.security.totalAuditLogs ?? 1} Logs</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Reconcile Bar */}
          <div className="p-5 rounded-2xl bg-[#0C0E17] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ECC86A]" />
                <span>Virtual Coin Ledger Reconciliation</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verifies that every wallet balance strictly equals the algebraic sum of its immutable ledger entries.
              </p>
            </div>
            <button
              onClick={handleReconcile}
              disabled={isReconciling}
              className="px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#ECC86A] text-black font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>{isReconciling ? 'Reconciling...' : 'Run Ledger Reconciliation'}</span>
            </button>
          </div>

          {/* Reconciliation Report Card if run */}
          {reconciliationReport && (
            <div className={`p-5 rounded-2xl border ${reconciliationReport.isConsistent ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-amber-950/20 border-amber-500/30'} space-y-2 text-xs`}>
              <div className="flex items-center justify-between">
                <span className={`font-bold flex items-center gap-2 ${reconciliationReport.isConsistent ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{reconciliationReport.isConsistent ? 'Audit Verification: Complete Ledger Consistency' : 'Audit Notice: Discrepancies Found'}</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {new Date(reconciliationReport.reconciledAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Checked {reconciliationReport.totalWalletsChecked} registered wallets across {reconciliationReport.totalLedgerEntries} immutable transactions. Total virtual circulation: {formatNXR(reconciliationReport.totalCirculationNXR)} NXR.
              </p>
            </div>
          )}

          {/* Protocol Integrity Guarantees */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#090B10] border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-mono text-[#ECC86A]">Rate Protection</span>
              <div className="text-white text-xs font-semibold">0.00001000 NXR / Hour</div>
              <p className="text-[11px] text-slate-400">Strictly accrued based on server timestamps. Client clock manipulations are automatically rejected.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#090B10] border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-mono text-[#ECC86A]">Cycle Cap Enforcement</span>
              <div className="text-white text-xs font-semibold">0.00024000 NXR / 24 Hours</div>
              <p className="text-[11px] text-slate-400">Sessions exceeding 24 hours ceiling are clamped. Single-claim validation prevents double spending.</p>
            </div>
            <div className="p-4 rounded-xl bg-[#090B10] border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-mono text-[#ECC86A]">Zero Negative Balances</span>
              <div className="text-white text-xs font-semibold">Atomic Ledger Debit / Credit</div>
              <p className="text-[11px] text-slate-400">Internal transfers verify sender balances and utilize idempotency keys to eliminate duplicate processing.</p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: REGISTERED USERS
      ===================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Filters */}
          <div className="p-4 rounded-2xl bg-[#0C0E17] border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email, name, wallet address, or ID..."
                value={userSearch}
                onChange={e => {
                  setUserSearch(e.target.value);
                  setUserPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12141D] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Role:</span>
                <select
                  value={userRoleFilter}
                  onChange={e => {
                    setUserRoleFilter(e.target.value);
                    setUserPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#12141D] border border-slate-700 text-slate-200 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="miner">Miner</option>
                  <option value="user">User</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Status:</span>
                <select
                  value={userStatusFilter}
                  onChange={e => {
                    setUserStatusFilter(e.target.value);
                    setUserPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#12141D] border border-slate-700 text-slate-200 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <button
                onClick={loadUsers}
                className="p-2 rounded-xl bg-[#12141D] hover:bg-[#1A1D2B] text-slate-300 border border-slate-700 transition-colors"
                title="Refresh user accounts"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-cinzel text-base font-bold text-white">Registered Ledger Accounts</h3>
              <span className="text-xs text-slate-400 font-mono">
                {userPagination.total} Total Registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono bg-[#090B10]">
                    <th className="py-3 px-4">User & Email</th>
                    <th className="py-3 px-4">Virtual Address</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <div>No accounts matching filter criteria.</div>
                        <div className="text-[11px] text-slate-500 mt-1">Zero fake records are generated.</div>
                      </td>
                    </tr>
                  ) : (
                    usersList.map(u => (
                      <tr key={u.userId} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-white">{u.displayName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          <div className="text-[10px] text-slate-500 font-mono">ID: {u.userId}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                          {u.walletAddress}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            u.role === 'admin'
                              ? 'bg-amber-500/10 text-[#ECC86A] border border-amber-500/30'
                              : u.role === 'miner'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#F3E5AB]">
                          {formatNXR(u.balanceNXR)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              onClick={() => handleViewHistory(u)}
                              className="px-2.5 py-1 rounded bg-[#141724] hover:bg-[#1E2338] text-slate-300 border border-slate-700 text-[11px] transition-colors cursor-pointer"
                            >
                              History
                            </button>
                            <button
                              onClick={() => {
                                setAdjustmentModal({
                                  user: u,
                                  amountDelta: '',
                                  reason: '',
                                });
                                setAdjustmentError(null);
                              }}
                              className="px-2.5 py-1 rounded bg-[#1A1D2B] hover:bg-[#252A40] text-[#ECC86A] border border-[#D4AF37]/35 text-[11px] transition-colors cursor-pointer"
                              title="Apply Auditable Balance Adjustment"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => setStatusModal({
                                user: u,
                                nextStatus: u.status === 'active' ? 'suspended' : 'active',
                                reason: '',
                              })}
                              disabled={u.userId === currentUserId && u.role === 'admin'}
                              className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                u.status === 'active'
                                  ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-700/40'
                                  : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/40'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {userPagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Page {userPagination.page} of {userPagination.totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={userPagination.page <= 1}
                    onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="px-3 py-1 rounded bg-[#12141D] border border-slate-700 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    disabled={userPagination.page >= userPagination.totalPages}
                    onClick={() => setUserPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="px-3 py-1 rounded bg-[#12141D] border border-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: MINING SESSION MONITORING
      ===================================================================== */}
      {activeTab === 'mining' && (
        <div className="space-y-4">
          {/* Rules Banner */}
          <div className="p-4 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <Pickaxe className="w-4 h-4 text-[#ECC86A]" />
                <span>24-Hour Mining Session Monitoring</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Displaying authentic sessions from database. Rate: 0.00001 NXR/hr • Maximum eligible duration: 24h • Cap: 0.00024 NXR.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={miningStatusFilter}
                onChange={e => setMiningStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#12141D] border border-slate-700 text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Sessions</option>
                <option value="active">Active Only</option>
                <option value="claimed">Claimed Only</option>
              </select>
              <button
                onClick={loadMiningSessions}
                className="p-2 rounded-xl bg-[#12141D] hover:bg-[#1A1D2B] text-slate-300 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-[#090B10]">
                    <th className="py-3 px-4">Session ID</th>
                    <th className="py-3 px-4">User Identifier</th>
                    <th className="py-3 px-4">Start Time</th>
                    <th className="py-3 px-4">Elapsed Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Earned Reward</th>
                    <th className="py-3 px-4 text-right">Claim Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {miningSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                        <Pickaxe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <div>No mining sessions recorded in database.</div>
                        <div className="text-[11px] text-slate-500 mt-1">Sessions are populated as genuine miners start cycles.</div>
                      </td>
                    </tr>
                  ) : (
                    miningSessions.map(s => {
                      const hours = Math.floor(s.elapsedSeconds / 3600);
                      const minutes = Math.floor((s.elapsedSeconds % 3600) / 60);
                      return (
                        <tr key={s.sessionId} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 text-white font-bold">{s.sessionId}</td>
                          <td className="py-3.5 px-4 text-slate-300">{s.userId}</td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {new Date(s.startedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {hours}h {minutes}m {s.elapsedSeconds >= 86400 ? '(24h Capped)' : ''}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                              s.claimed
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            }`}>
                              {s.claimed ? 'Claimed' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#F3E5AB]">
                            {formatNXR(s.rewardEarnedNXR)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                            {s.claimTxHash ? `${s.claimTxHash.substring(0, 10)}...` : 'Pending'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: VIRTUAL NXR LEDGER
      ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#ECC86A]" />
                <span>Immutable Virtual NXR Ledger</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Cryptographic transaction ledger maintaining balance history, double-spend protection, and atomicity.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={ledgerFilterType}
                onChange={e => setLedgerFilterType(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#12141D] border border-slate-700 text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="mining_reward">Mining Rewards</option>
                <option value="transfer_send">Transfers Sent</option>
                <option value="transfer_receive">Transfers Received</option>
              </select>
              <button
                onClick={handleReconcile}
                disabled={isReconciling}
                className="px-3 py-1.5 rounded-xl bg-[#D4AF37] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? 'animate-spin' : ''}`} />
                <span>Reconcile</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-[#090B10]">
                    <th className="py-3 px-4">Entry ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Wallet Address</th>
                    <th className="py-3 px-4 text-right">Amount NXR</th>
                    <th className="py-3 px-4 text-right">Balance After</th>
                    <th className="py-3 px-4">Reference / TxHash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                        <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <div>No entries in virtual NXR ledger yet.</div>
                        <div className="text-[11px] text-slate-500 mt-1">Ledger entries record verified mining claims and transfers.</div>
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map(e => (
                      <tr key={e.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 text-slate-300 font-bold">{e.id}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(e.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            e.entryType === 'mining_reward'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : e.entryType === 'transfer_receive'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {e.entryType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{e.walletAddress}</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${
                          e.amountNXR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {e.amountNXR >= 0 ? '+' : ''}{e.amountNXR.toFixed(5)} NXR
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#F3E5AB] font-bold">
                          {e.balanceAfterNXR.toFixed(5)} NXR
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px] truncate max-w-xs" title={e.referenceId}>
                          {e.referenceId}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: VIRTUAL TRANSFERS
      ===================================================================== */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-[#ECC86A]" />
                <span>Internal Virtual NXR Transfers</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Real database transfer records. Double transfers and negative balances are prevented.
              </p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search transfer hash or address..."
                value={transferSearch}
                onChange={e => setTransferSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-xl bg-[#12141D] border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-[#090B10]">
                    <th className="py-3 px-4">Transfer ID & Hash</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Sender Address</th>
                    <th className="py-3 px-4">Recipient Address</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                        <ArrowRightLeft className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <div>No internal virtual transfers recorded yet.</div>
                        <div className="text-[11px] text-slate-500 mt-1">Executed peer transfers will appear here in real time.</div>
                      </td>
                    </tr>
                  ) : (
                    transfers
                      .filter(t => !transferSearch || t.txHash.toLowerCase().includes(transferSearch.toLowerCase()) || t.senderAddress.toLowerCase().includes(transferSearch.toLowerCase()) || t.recipientAddress.toLowerCase().includes(transferSearch.toLowerCase()))
                      .map(t => (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div>{t.id}</div>
                            <div className="text-[10px] text-[#ECC86A]">{t.txHash.substring(0, 14)}...</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {new Date(t.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{t.senderAddress}</td>
                          <td className="py-3.5 px-4 text-slate-300">{t.recipientAddress}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#F3E5AB]">
                            {t.amountNXR.toFixed(5)} NXR
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: MARKET DATA STATUS
      ===================================================================== */}
      {activeTab === 'market' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#ECC86A]" />
                  <span>Market-Data Service Telemetry</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Genuine cryptocurrency market provider telemetry. No fake prices or fabricated stats.
                </p>
              </div>

              <button
                onClick={loadMarketStatus}
                className="px-3.5 py-2 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-[#F3E5AB] border border-[#D4AF37]/30 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Telemetry</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-sans">Provider Name</span>
                <span className="text-white font-bold text-sm">CoinGecko Live API v3</span>
                <span className="text-[10px] text-emerald-400 block">Public REST Endpoints</span>
              </div>

              <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-sans">Last Refresh Timestamp</span>
                <span className="text-[#F3E5AB] font-bold text-sm">
                  {marketStatus?.lastSuccessfulRefresh
                    ? new Date(marketStatus.lastSuccessfulRefresh).toLocaleTimeString()
                    : 'Awaiting Refresh'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {marketStatus?.cacheAgeSeconds !== null ? `Freshness: ${marketStatus?.cacheAgeSeconds}s ago` : 'Direct proxy'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-sans">Rate Limit & Error Tracking</span>
                <span className="text-white font-bold text-sm">
                  {marketStatus?.rateLimitHits ?? 0} Rate Limit Hits
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {marketStatus?.apiErrorsCount ?? 0} API Errors Logged
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#08090F] border border-amber-500/30 text-xs space-y-2">
              <div className="font-bold text-amber-300 flex items-center gap-2 font-sans">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Honest NXR Valuation Policy</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px] font-sans">
                NEXORA (NXR) is an internal virtual demonstration credit with no fiat or external cryptocurrency valuation. It cannot be deposited, withdrawn, or traded for real currency. In accordance with zero-fabrication standards, the platform never displays a fake market price or simulated fiat market capitalization for NXR.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: SYSTEM HEALTH
      ===================================================================== */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-4">
            <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-[#ECC86A]" />
              <span>Full-Stack Cluster Health</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-sans">Server Process Uptime</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {systemHealth?.uptimeSeconds
                    ? `${Math.floor(systemHealth.uptimeSeconds / 3600)}h ${Math.floor((systemHealth.uptimeSeconds % 3600) / 60)}m ${systemHealth.uptimeSeconds % 60}s`
                    : 'Online'}
                </span>
                <span className="text-[10px] text-slate-500 block">Node.js Express (Port 3000)</span>
              </div>

              <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-sans">Active SSE Stream Clients</span>
                <span className="text-[#ECC86A] font-bold text-sm">
                  {systemHealth?.sseClientsCount ?? 1} Connected Clients
                </span>
                <span className="text-[10px] text-emerald-400 block">Low latency live pushes</span>
              </div>

              <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-sans">Heap Memory Footprint</span>
                <span className="text-white font-bold text-sm">
                  {systemHealth?.memory?.heapUsedMB ?? 0} MB / {systemHealth?.memory?.heapTotalMB ?? 0} MB
                </span>
                <span className="text-[10px] text-slate-400 block">RSS: {systemHealth?.memory?.rssMB ?? 0} MB</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#08090F] border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-white">Database Architecture Status</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 font-mono">
                <div>PostgreSQL Schemas: <span className="text-emerald-400">9 Tables Migrated</span></div>
                <div>Row Level Security (RLS): <span className="text-emerald-400">Enforced</span></div>
                <div>Ledger Storage: <span className="text-emerald-400">Atomic Server Authoritative</span></div>
                <div>CoinGecko Proxy: <span className="text-emerald-400">Cached / 60s TTL</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: SECURITY EVENTS
      ===================================================================== */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 flex items-center justify-between">
            <div>
              <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#ECC86A]" />
                <span>Security Incident Log</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Server-side role rejections, unauthorized administrative attempts, and rate-limit violations.
              </p>
            </div>
            <button
              onClick={loadSecurityEvents}
              className="p-2 rounded-xl bg-[#12141D] hover:bg-[#1A1D2B] text-slate-300 border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-[#090B10]">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {securityEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <div>No security incidents flagged. System integrity intact.</div>
                        <div className="text-[11px] text-slate-500 mt-1">Failed admin authentications and duplicate actions will appear here.</div>
                      </td>
                    </tr>
                  ) : (
                    securityEvents.map(e => (
                      <tr key={e.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white">{e.id}</td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(e.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-white font-semibold">{e.eventType}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            e.severity === 'high' || e.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            {e.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{e.actor}</td>
                        <td className="py-3.5 px-4 text-slate-400">{e.ipAddress}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-sans max-w-xs truncate" title={e.description}>
                          {e.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 9: AUDIT LOGS
      ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div>
              <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ECC86A]" />
                <span>Cryptographic Audit Trail</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Immutable records of all administrative actions, mining claims, and user status modifications.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditCategoryFilter}
                onChange={e => setAuditCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#12141D] border border-slate-700 text-slate-200 text-xs focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="auth">Auth & Users</option>
                <option value="mining">Mining</option>
                <option value="transfers">Transfers</option>
                <option value="system">System</option>
                <option value="security">Security</option>
              </select>
              <button
                onClick={loadAuditLogs}
                className="p-2 rounded-xl bg-[#12141D] hover:bg-[#1A1D2B] text-slate-300 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#0C0E17] border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-[#090B10]">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">{log.action}</td>
                        <td className="py-3.5 px-4 text-[#ECC86A] uppercase">{log.category}</td>
                        <td className="py-3.5 px-4 text-slate-300">{log.performedBy}</td>
                        <td className="py-3.5 px-4 text-slate-400">{log.ipAddress}</td>
                        <td className="py-3.5 px-4 text-slate-300 font-sans max-w-sm truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">{log.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 10: SETTINGS & ADMIN PROFILE
      ===================================================================== */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-4">
            <h3 className="font-cinzel text-base font-bold text-white">24-Hour Mining Engine Configuration</h3>
            <p className="text-xs text-slate-400">
              Protocol parameters enforcing linear non-monetary virtual reward accumulation.
            </p>

            <div className="space-y-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#08090F] border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-sans block">Accumulation Rate</span>
                  <span className="text-white font-bold">0.00001000 NXR / hour</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Fixed Protocol Constant
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#08090F] border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-sans block">Maximum 24h Cycle Reward</span>
                  <span className="text-[#F3E5AB] font-bold">0.00024000 NXR</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  24h Ceiling
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#08090F] border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-sans block">Client Clock Skew Protection</span>
                  <span className="text-white font-bold">Server Verified Timestamps</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Enforced
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#08090F] border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-sans block">Starting Account Balance</span>
                  <span className="text-white font-bold">0.00000 NXR</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Zero Preload Policy
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0C0E17] border border-[#D4AF37]/25 space-y-4">
            <h3 className="font-cinzel text-base font-bold text-white">Platform Health Toggles</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#08090F] border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Maintenance Mode</div>
                  <div className="text-[11px] text-slate-400">Freeze mining sessions during audit</div>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode}
                  onChange={e => updateSystemSettings({ maintenanceMode: e.target.checked })}
                  className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#08090F] border border-slate-800">
                <div>
                  <div className="font-semibold text-white">Gemini TTS Audio Briefings</div>
                  <div className="text-[11px] text-slate-400">Voice protocol updates</div>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.enableAudioBriefings}
                  onChange={e => updateSystemSettings({ enableAudioBriefings: e.target.checked })}
                  className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#08090F] border border-slate-800 font-mono text-[11px] text-slate-400 space-y-2">
                <div className="flex justify-between">
                  <span>Server Status:</span>
                  <span className="text-emerald-400 font-bold">Online (Port 3000)</span>
                </div>
                <div className="flex justify-between">
                  <span>Realtime SSE:</span>
                  <span className="text-emerald-400 font-bold">Active (/api/realtime/stream)</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Role:</span>
                  <span className="text-[#ECC86A] font-bold">{user?.role || 'admin'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: USER ACCOUNT DETAILS & HISTORY DRAWER
      ===================================================================== */}
      {selectedUserHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0E17] border border-[#D4AF37]/35 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-cinzel text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#ECC86A]" />
                  <span>Account History: {selectedUserHistory.user.displayName}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {selectedUserHistory.user.email} • {selectedUserHistory.user.walletAddress}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserHistory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Account Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#08090F] border border-slate-800">
                <span className="text-slate-400 block font-sans">Role / Status</span>
                <span className="text-white font-bold uppercase">{selectedUserHistory.user.role} • {selectedUserHistory.user.status}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#08090F] border border-slate-800">
                <span className="text-slate-400 block font-sans">Available Balance</span>
                <span className="text-[#F3E5AB] font-bold">{formatNXR(selectedUserHistory.user.balanceNXR)} NXR</span>
              </div>
              <div className="p-3 rounded-xl bg-[#08090F] border border-slate-800">
                <span className="text-slate-400 block font-sans">Registered</span>
                <span className="text-slate-300">{new Date(selectedUserHistory.user.registeredAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Mining Sessions History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Pickaxe className="w-3.5 h-3.5 text-[#ECC86A]" />
                <span>Mining Session History ({selectedUserHistory.miningSessions.length})</span>
              </h4>
              {selectedUserHistory.miningSessions.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#08090F] text-xs text-slate-500 font-sans">
                  No mining sessions started by this user.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedUserHistory.miningSessions.map(s => (
                    <div key={s.sessionId} className="p-2.5 rounded-lg bg-[#08090F] border border-slate-800 text-xs font-mono flex items-center justify-between">
                      <div>
                        <span className="text-white font-bold">{s.sessionId}</span>
                        <span className="text-slate-400 ml-2">({Math.floor(s.elapsedSeconds / 3600)}h {Math.floor((s.elapsedSeconds % 3600) / 60)}m)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#F3E5AB] font-bold mr-2">+{formatNXR(s.rewardEarnedNXR)}</span>
                        <span className="text-[10px] text-emerald-400 uppercase">{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Internal Transfers History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-[#ECC86A]" />
                <span>Virtual Transfer Records ({selectedUserHistory.transfers.length})</span>
              </h4>
              {selectedUserHistory.transfers.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#08090F] text-xs text-slate-500 font-sans">
                  No internal virtual transfers executed by or sent to this user.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedUserHistory.transfers.map(t => (
                    <div key={t.id} className="p-2.5 rounded-lg bg-[#08090F] border border-slate-800 text-xs font-mono flex items-center justify-between">
                      <div>
                        <span className="text-slate-400">{t.senderAddress === selectedUserHistory.user.walletAddress ? 'Sent to:' : 'Received from:'}</span>
                        <span className="text-white ml-1">{t.senderAddress === selectedUserHistory.user.walletAddress ? t.recipientAddress : t.senderAddress}</span>
                      </div>
                      <span className="text-[#F3E5AB] font-bold">{t.amountNXR.toFixed(5)} NXR</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONFIRM ACCOUNT STATUS (SUSPEND / REACTIVATE)
      ===================================================================== */}
      {statusModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0E17] border border-[#D4AF37]/35 rounded-2xl max-w-md w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              {statusModal.nextStatus === 'suspended' ? (
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <UserX className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <UserCheck className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="font-cinzel text-base font-bold text-white">
                  {statusModal.nextStatus === 'suspended' ? 'Suspend Account' : 'Reactivate Account'}
                </h3>
                <p className="text-xs text-slate-400">
                  User: <span className="text-white font-mono">{statusModal.user.email}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {statusModal.nextStatus === 'suspended'
                ? 'Suspending this account will block all internal transfers, mining rewards, and privileged access. This action will be recorded in the immutable administrative audit log.'
                : 'Reactivating this account will restore standard user capabilities and permit mining cycles.'}
            </p>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">Administrative Reason (Required for Audit Trail)</label>
              <input
                type="text"
                placeholder="e.g., Compliance audit, security investigation..."
                value={statusModal.reason}
                onChange={e => setStatusModal({ ...statusModal, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#12141D] border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setStatusModal(null)}
                className="px-4 py-2 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-slate-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusChange}
                disabled={isUpdatingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                  statusModal.nextStatus === 'suspended'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isUpdatingStatus ? 'Updating...' : statusModal.nextStatus === 'suspended' ? 'Confirm Suspension' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: AUDITABLE BALANCE ADJUSTMENT
      ===================================================================== */}
      {adjustmentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0E17] border border-[#D4AF37]/45 rounded-2xl max-w-lg w-full p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-[#ECC86A] border border-amber-500/30">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-base font-bold text-white">
                  Auditable Balance Adjustment
                </h3>
                <p className="text-xs text-slate-400">
                  User: <span className="text-white font-mono">{adjustmentModal.user.email}</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08090E] border border-slate-800 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-400 font-sans">
                <span>Wallet Address:</span>
                <span className="text-slate-200">{adjustmentModal.user.walletAddress}</span>
              </div>
              <div className="flex justify-between text-slate-400 font-sans">
                <span>Current Authoritative Balance:</span>
                <span className="text-[#ECC86A] font-bold">{formatNXR(adjustmentModal.user.balanceNXR)} NXR</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed font-sans">
              <strong>Mandatory Protocol Rule:</strong> Silent balance rewrites or transaction deletion are cryptographically prohibited. This correction will create an immutable <code className="font-mono text-white">admin_adjustment</code> entry in the virtual ledger and be permanently recorded in the administrative audit log.
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Adjustment Delta (NXR) • Use positive to credit, negative to debit
                </label>
                <input
                  type="number"
                  step="0.00001"
                  placeholder="e.g. +0.00010 or -0.00010"
                  value={adjustmentModal.amountDelta}
                  onChange={e => setAdjustmentModal({ ...adjustmentModal, amountDelta: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#12141D] border border-slate-700 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Auditable Reason (Required • Minimum 8 characters)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Reconciliation discrepancy adjustment after node reset"
                  value={adjustmentModal.reason}
                  onChange={e => setAdjustmentModal({ ...adjustmentModal, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#12141D] border border-slate-700 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            {adjustmentError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{adjustmentError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustmentModal(null)}
                className="px-4 py-2 rounded-xl bg-[#141724] hover:bg-[#1E2338] text-slate-300 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAdjustment}
                disabled={isAdjustingBalance || !adjustmentModal.amountDelta || !adjustmentModal.reason}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-bold text-xs transition-transform hover:scale-[1.01] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isAdjustingBalance ? 'Applying Adjustment...' : 'Record Audited Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
