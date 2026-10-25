import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  updateUserProfileOnServer,
  resetPasswordOnServer,
  fetchUserSessionsOnServer,
  revokeUserSessionsOnServer,
} from '../services/userService';
import { UserSession } from '../types/crypto';
import { evaluatePasswordStrength } from '../utils/authValidation';
import {
  User,
  Shield,
  KeyRound,
  Lock,
  Smartphone,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Info,
  Layers,
  Laptop,
} from 'lucide-react';

export const AccountPage: React.FC = () => {
  const { user, updateProfile, setActiveTab, logout } = useApp();

  // Profile Form States
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Reset Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sessions Management States
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isRevokingSessions, setIsRevokingSessions] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // 2FA Simulation States
  const [twoFactorActive, setTwoFactorActive] = useState(user?.twoFactorEnabled || false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const pwdStrength = evaluatePasswordStrength(newPassword);

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingSessions(true);
    const res = await fetchUserSessionsOnServer(user.id);
    setIsLoadingSessions(false);
    if (res.success && res.sessions) {
      setSessions(res.sessions);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setProfileMessage(null);
    const clean = displayNameInput.trim();
    if (clean.length < 2 || clean.length > 50) {
      setProfileMessage({ type: 'error', text: 'Display name must be between 2 and 50 characters.' });
      return;
    }

    setIsUpdatingProfile(true);
    const res = await updateUserProfileOnServer(user.id, clean);
    setIsUpdatingProfile(false);

    if (res.success && res.user) {
      updateProfile({ displayName: clean });
      setProfileMessage({ type: 'success', text: 'Display name updated and verified on server.' });
      setTimeout(() => setProfileMessage(null), 3000);
    } else {
      setProfileMessage({ type: 'error', text: res.error || 'Failed to update profile.' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Master password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsResettingPassword(true);
    const res = await resetPasswordOnServer(user.email, newPassword);
    setIsResettingPassword(false);

    if (res.success) {
      setPasswordMessage({
        type: 'success',
        text: 'Credentials successfully updated and logged in security audit journal.',
      });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 4000);
    } else {
      setPasswordMessage({ type: 'error', text: res.error || 'Failed to reset password.' });
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!user?.id) return;
    setIsRevokingSessions(true);
    setSessionMessage(null);

    const res = await revokeUserSessionsOnServer(user.id, 'all_others');
    setIsRevokingSessions(false);

    if (res.success) {
      setSessionMessage('All other active sessions have been terminated.');
      loadSessions();
      setTimeout(() => setSessionMessage(null), 3000);
    }
  };

  const copyWallet = () => {
    if (!user?.virtualWalletAddress) return;
    navigator.clipboard.writeText(user.virtualWalletAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D4AF37]/20">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#ECC86A]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white tracking-wide">
                Account & Security Center
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Node profile management, credentials security, and session authorization controls
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-3.5 py-2 rounded-xl bg-[#12141D] text-slate-200 border border-slate-700 hover:border-[#D4AF37]/40 text-xs font-medium transition-all"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-2xl bg-[#0F111A] border border-[#D4AF37]/35 text-xs text-slate-300 space-y-1.5 shadow-lg">
        <div className="flex items-center gap-2 text-[#ECC86A] font-semibold text-xs">
          <Info className="w-4 h-4 text-[#ECC86A] shrink-0" />
          <span className="font-cinzel tracking-wider uppercase">Node Security Isolation Policy</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          NEXORA COIN is currently a virtual simulation. NXR balances and transfers are internal database records, not blockchain assets. No real-money value is guaranteed. No private keys or financial credentials are required or processed. All credentials protect access to your internal simulated testnet node.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Account Information (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Node Identity Card */}
          <div className="p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#ECC86A]" />
                Node Identity
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#181B26] text-[#ECC86A] border border-[#D4AF37]/30 uppercase">
                {user?.role || 'User'}
              </span>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Node Display Name
                </label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={e => setDisplayNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08090E] border border-slate-800 focus:border-[#D4AF37]/50 text-xs text-white outline-none font-sans transition-colors"
                  placeholder="e.g. Master Node Operator"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Account Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08090E]/60 border border-slate-800/80 text-xs text-slate-400 outline-none font-mono cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Authoritative email linked to internal database records.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Virtual Deposit Address
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-[#08090E] border border-slate-800 text-xs font-mono">
                  <span className="text-[#ECC86A] truncate select-all flex-1">
                    {user?.virtualWalletAddress || 'NXR-VAULT-001'}
                  </span>
                  <button
                    type="button"
                    onClick={copyWallet}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Copy Address"
                  >
                    {copiedWallet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {profileMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
                  }`}
                >
                  {profileMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{profileMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="w-full py-2.5 rounded-xl bg-[#1C2030] hover:bg-[#25293D] text-[#FFF3D6] border border-[#D4AF37]/45 text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isUpdatingProfile ? 'Saving...' : 'Update Node Profile'}
              </button>
            </form>
          </div>

          {/* Two-Factor Simulation Card */}
          <div className="p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-cinzel text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#ECC86A]" />
                Two-Factor Security (2FA)
              </h3>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  twoFactorActive
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {twoFactorActive ? 'Active' : 'Disabled'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Add time-based one-time password (TOTP) verification to safeguard your node session during sensitive operations.
            </p>

            <button
              onClick={() => {
                setTwoFactorActive(!twoFactorActive);
                updateProfile({ twoFactorEnabled: !twoFactorActive });
              }}
              className="w-full py-2 rounded-xl bg-[#12141D] hover:bg-white/5 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              {twoFactorActive ? 'Disable 2FA Protection' : 'Enable 2FA Protection'}
            </button>
          </div>
        </div>

        {/* Right Column: Password Reset & Session Management (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Master Password Reset */}
          <div className="p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#ECC86A]" />
                Master Credentials Reset
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Rate Limited</span>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  New Master Passphrase
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08090E] border border-slate-800 focus:border-[#D4AF37]/50 text-xs text-white outline-none font-mono transition-colors"
                />

                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Strength:</span>
                      <span
                        className={`font-semibold font-mono ${
                          pwdStrength.score >= 3
                            ? 'text-emerald-400'
                            : pwdStrength.score === 2
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {pwdStrength.label}
                      </span>
                    </div>
                    <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          pwdStrength.score >= 3
                            ? 'w-full bg-emerald-400'
                            : pwdStrength.score === 2
                            ? 'w-2/3 bg-amber-400'
                            : 'w-1/3 bg-rose-400'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">
                  Confirm Master Passphrase
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new master passphrase"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#08090E] border border-slate-800 focus:border-[#D4AF37]/50 text-xs text-white outline-none font-mono transition-colors"
                />
              </div>

              {passwordMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    passwordMessage.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
                  }`}
                >
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{passwordMessage.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isResettingPassword || !newPassword}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-bold text-xs shadow hover:scale-[1.01] transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isResettingPassword ? 'Verifying...' : 'Confirm Password Update'}
              </button>
            </form>
          </div>

          {/* Active Sessions Management */}
          <div className="p-6 rounded-3xl bg-[#0C0E16] border border-[#D4AF37]/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-cinzel text-base font-bold text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-[#ECC86A]" />
                  Active Device Sessions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authorized access tokens and network gateways associated with your node
                </p>
              </div>

              {sessions.length > 1 && (
                <button
                  onClick={handleRevokeOtherSessions}
                  disabled={isRevokingSessions}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/35 text-xs font-medium transition-colors"
                >
                  {isRevokingSessions ? 'Revoking...' : 'Terminate Other Sessions'}
                </button>
              )}
            </div>

            {sessionMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{sessionMessage}</span>
              </div>
            )}

            {isLoadingSessions ? (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">
                Checking verified session credentials...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No external active sessions detected.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map(s => (
                  <div
                    key={s.sessionId}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#08090E] border border-slate-800/80 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{s.userAgent}</span>
                        {s.isCurrent && (
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>IP: {s.ipAddress}</span>
                        <span>•</span>
                        <span>
                          Active:{' '}
                          {new Date(s.lastActiveAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
