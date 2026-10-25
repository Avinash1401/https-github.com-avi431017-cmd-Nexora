/**
 * User and Account Service
 * Provides client-side helpers for Authoritative Database Transactions, Notifications, and Account Security
 */
import { VirtualTransaction, NotificationItem, UserSession, ReferralItem } from '../types/crypto';

export interface PaginatedTransactionsResult {
  success: boolean;
  transactions?: VirtualTransaction[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filterType?: string;
  authoritativeLedgerCount?: number;
  disclaimer?: string;
  error?: string;
}

export interface NotificationsResult {
  success: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
  error?: string;
}

export async function fetchMyTransactions(
  userId: string,
  params: { type?: string; search?: string; page?: number; limit?: number } = {}
): Promise<PaginatedTransactionsResult> {
  try {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set('type', params.type);
    if (params.search) searchParams.set('search', params.search);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const res = await fetch(`/api/transactions/my?${searchParams.toString()}`, {
      headers: {
        'x-user-id': userId,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      transactions: data.transactions,
      pagination: data.pagination,
      filterType: data.filterType,
      authoritativeLedgerCount: data.authoritativeLedgerCount,
      disclaimer: data.disclaimer,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch transaction ledger' };
  }
}

export async function fetchMyNotifications(userId: string): Promise<NotificationsResult> {
  try {
    const res = await fetch('/api/notifications', {
      headers: {
        'x-user-id': userId,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      notifications: data.notifications,
      unreadCount: data.unreadCount,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch notifications' };
  }
}

export async function markNotificationAsReadOnServer(
  userId: string,
  id?: string,
  all = false
): Promise<{ success: boolean; unreadCount?: number; error?: string }> {
  try {
    const res = await fetch('/api/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ id, all }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update notification' };
    }
    return { success: true, unreadCount: data.unreadCount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating notification' };
  }
}

export async function clearReadNotificationsOnServer(
  userId: string
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  try {
    const res = await fetch('/api/notifications/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to clear notifications' };
    }
    return { success: true, remaining: data.remaining };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error clearing notifications' };
  }
}

export async function updateUserProfileOnServer(
  userId: string,
  displayName: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await fetch('/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ displayName }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to update profile' };
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating profile' };
  }
}

export async function resetPasswordOnServer(
  email: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/user/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to reset password' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error resetting password' };
  }
}

export async function fetchUserSessionsOnServer(
  userId: string
): Promise<{ success: boolean; sessions?: UserSession[]; error?: string }> {
  try {
    const res = await fetch('/api/user/sessions', {
      headers: { 'x-user-id': userId },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch sessions' };
    }
    return { success: true, sessions: data.sessions };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error fetching sessions' };
  }
}

export async function revokeUserSessionsOnServer(
  userId: string,
  sessionId: string | 'all_others'
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/user/sessions/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({ sessionId }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to revoke sessions' };
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error revoking sessions' };
  }
}

export async function fetchMyReferralSummary(
  userId: string
): Promise<{
  success: boolean;
  referralCode?: string;
  totalReferrals?: number;
  maxReferrals?: number;
  rewardPerReferralNXR?: number;
  totalRewardNXR?: number;
  referrals?: ReferralItem[];
  error?: string;
}> {
  try {
    const res = await fetch(`/api/referrals/my?userId=${encodeURIComponent(userId)}`, {
      headers: { 'x-user-id': userId },
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch referral summary' };
    }
    return {
      success: true,
      referralCode: data.referralCode,
      totalReferrals: data.totalReferrals,
      maxReferrals: data.maxReferrals,
      rewardPerReferralNXR: data.rewardPerReferralNXR,
      totalRewardNXR: data.totalRewardNXR,
      referrals: data.referrals,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error fetching referral summary' };
  }
}
