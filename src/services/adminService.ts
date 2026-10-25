/**
 * Administrative API Client Service
 * Connects frontend Admin Dashboard directly to server-authoritative endpoints
 * Enforces server-side RBAC headers and handles error states
 */

export interface AdminOverviewData {
  users: {
    total: number;
    active: number;
    suspended: number;
  };
  mining: {
    totalSessions: number;
    activeSessions: number;
    claimedSessions: number;
    hourlyRate: number;
    ceilingReward: number;
  };
  ledger: {
    totalEntries: number;
    totalTransfers: number;
    circulationNXR: number;
    isConsistent: boolean;
  };
  marketTelemetry: {
    provider: string;
    lastSuccessfulRefresh: number;
    refreshCount: number;
    apiErrorsCount: number;
    rateLimitHits: number;
    lastError: string | null;
    cachedDataAvailable: boolean;
  };
  security: {
    totalIncidents: number;
    totalAuditLogs: number;
  };
  system: {
    uptimeSeconds: number;
    connectedClients: number;
    timestamp: number;
  };
}

export interface AdminUserRecord {
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'miner' | 'user';
  status: 'active' | 'suspended';
  walletAddress: string;
  balanceNXR: number;
  registeredAt: number;
}

export interface AdminLedgerEntry {
  id: string;
  entryType: 'mining_reward' | 'transfer_send' | 'transfer_receive' | 'admin_adjustment';
  userId: string;
  walletAddress: string;
  amountNXR: number;
  balanceAfterNXR: number;
  referenceId: string;
  timestamp: number;
  idempotencyKey?: string;
  note?: string;
}

export interface AdminMiningSession {
  sessionId: string;
  userId: string;
  startedAt: number;
  elapsedSeconds: number;
  claimed: boolean;
  claimedAt?: number;
  rewardEarnedNXR: number;
  claimTxHash?: string;
  status: 'active' | 'completed' | 'claimed';
}

export interface AdminTransferRecord {
  id: string;
  txHash: string;
  senderId: string;
  senderAddress: string;
  recipientAddress: string;
  amountNXR: number;
  timestamp: number;
  status: 'completed';
  idempotencyKey?: string;
  note?: string;
}

export interface SecurityEventRecord {
  id: string;
  timestamp: number;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  actor: string;
  ipAddress: string;
  description: string;
}

export interface ServerAuditLogRecord {
  id: string;
  timestamp: number;
  action: string;
  category: 'auth' | 'mining' | 'wallet' | 'system' | 'security' | 'transfers';
  performedBy: string;
  ipAddress: string;
  details: string;
  status: 'success' | 'flagged' | 'denied';
}

export interface SystemHealthData {
  status: string;
  uptimeSeconds: number;
  nodeVersion: string;
  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
  };
  sseClientsCount: number;
  activeSessionsCount: number;
  ledgerEntriesCount: number;
  timestamp: number;
}

function getAuthHeaders(userRole = 'admin', userId = 'usr_admin') {
  return {
    'Content-Type': 'application/json',
    'x-user-role': userRole,
    'x-user-id': userId,
  };
}

export async function fetchAdminOverview(role: string, userId: string): Promise<{ success: boolean; overview?: AdminOverviewData; error?: string }> {
  try {
    const res = await fetch('/api/admin/overview', {
      headers: getAuthHeaders(role, userId),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, overview: data.overview };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to connect to backend overview API' };
  }
}

export async function fetchAdminUsers(
  role: string,
  userId: string,
  params: { page?: number; limit?: number; search?: string; filterRole?: string; status?: string } = {}
): Promise<{ success: boolean; users?: AdminUserRecord[]; pagination?: any; error?: string }> {
  try {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search);
    if (params.filterRole) searchParams.set('role', params.filterRole);
    if (params.status) searchParams.set('status', params.status);

    const res = await fetch(`/api/admin/users?${searchParams.toString()}`, {
      headers: getAuthHeaders(role, userId),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, users: data.users, pagination: data.pagination };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch users' };
  }
}

export async function updateAccountStatus(
  role: string,
  userId: string,
  targetUserId: string,
  status: 'active' | 'suspended',
  reason: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/admin/users/${targetUserId}/status`, {
      method: 'POST',
      headers: getAuthHeaders(role, userId),
      body: JSON.stringify({ status, reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update account status' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating user status' };
  }
}

export async function fetchUserAccountHistory(
  role: string,
  userId: string,
  targetUserId: string
): Promise<{ success: boolean; user?: AdminUserRecord; miningSessions?: AdminMiningSession[]; transfers?: AdminTransferRecord[]; ledgerEntries?: AdminLedgerEntry[]; error?: string }> {
  try {
    const res = await fetch(`/api/admin/users/${targetUserId}/history`, {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to load user history' };
    }
    return {
      success: true,
      user: data.user,
      miningSessions: data.miningSessions,
      transfers: data.transfers,
      ledgerEntries: data.ledgerEntries,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching user history' };
  }
}

export async function fetchAdminMiningSessions(
  role: string,
  userId: string,
  statusFilter = 'all'
): Promise<{ success: boolean; sessions?: AdminMiningSession[]; error?: string }> {
  try {
    const res = await fetch(`/api/admin/mining-sessions?status=${encodeURIComponent(statusFilter)}`, {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch mining sessions' };
    }
    return { success: true, sessions: data.sessions };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching mining telemetry' };
  }
}

export async function fetchAdminLedger(
  role: string,
  userId: string,
  page = 1,
  limit = 25,
  type = 'all'
): Promise<{ success: boolean; entries?: AdminLedgerEntry[]; pagination?: any; error?: string }> {
  try {
    const res = await fetch(`/api/admin/ledger?page=${page}&limit=${limit}&type=${encodeURIComponent(type)}`, {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch ledger' };
    }
    return { success: true, entries: data.entries, pagination: data.pagination };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching virtual ledger' };
  }
}

export async function executeLedgerReconciliation(
  role: string,
  userId: string
): Promise<{ success: boolean; report?: any; error?: string }> {
  try {
    const res = await fetch('/api/admin/ledger/reconcile', {
      method: 'POST',
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Reconciliation failed' };
    }
    return { success: true, report: data.report };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error triggering reconciliation' };
  }
}

export async function fetchAdminTransfers(
  role: string,
  userId: string
): Promise<{ success: boolean; transfers?: AdminTransferRecord[]; error?: string }> {
  try {
    const res = await fetch('/api/admin/transfers', {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch transfers' };
    }
    return { success: true, transfers: data.transfers };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching transfers' };
  }
}

export async function fetchAdminMarketStatus(
  role: string,
  userId: string
): Promise<{ success: boolean; marketStatus?: any; error?: string }> {
  try {
    const res = await fetch('/api/admin/market-status', {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch market status' };
    }
    return { success: true, marketStatus: data.marketStatus };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching market telemetry' };
  }
}

export async function fetchAdminSystemHealth(
  role: string,
  userId: string
): Promise<{ success: boolean; health?: SystemHealthData; error?: string }> {
  try {
    const res = await fetch('/api/admin/system-health', {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch system health' };
    }
    return { success: true, health: data.health };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching system health' };
  }
}

export async function fetchAdminSecurityEvents(
  role: string,
  userId: string
): Promise<{ success: boolean; events?: SecurityEventRecord[]; error?: string }> {
  try {
    const res = await fetch('/api/admin/security-events', {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch security events' };
    }
    return { success: true, events: data.events };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching security events' };
  }
}

export async function fetchAdminAuditLogs(
  role: string,
  userId: string,
  category = 'all'
): Promise<{ success: boolean; logs?: ServerAuditLogRecord[]; error?: string }> {
  try {
    const res = await fetch(`/api/admin/audit-logs?category=${encodeURIComponent(category)}`, {
      headers: getAuthHeaders(role, userId),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch audit logs' };
    }
    return { success: true, logs: data.logs };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error fetching audit logs' };
  }
}

export async function syncUserWithBackend(user: {
  id: string;
  email: string;
  displayName: string;
  role: string;
  walletAddress?: string;
  balanceNXR?: number;
}): Promise<void> {
  try {
    await fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
  } catch {
    // Non-blocking sync
  }
}

export async function executeAdminBalanceAdjustment(
  role: string,
  userId: string,
  targetUserId: string,
  amountDeltaNXR: number,
  reason: string
): Promise<{ success: boolean; user?: AdminUserRecord; ledgerEntry?: AdminLedgerEntry; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/admin/users/${targetUserId}/adjust-balance`, {
      method: 'POST',
      headers: getAuthHeaders(role, userId),
      body: JSON.stringify({ amountDeltaNXR, reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to execute balance adjustment' };
    }
    return {
      success: true,
      user: data.user,
      ledgerEntry: data.ledgerEntry,
      message: data.message,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error executing balance adjustment' };
  }
}
