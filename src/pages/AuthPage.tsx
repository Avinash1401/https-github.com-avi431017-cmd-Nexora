import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NexoraLogo } from '../components/NexoraLogo';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  LogOut,
  Info,
  Eye,
  EyeOff,
  Copy,
  Check,
  Shield,
  Sparkles,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  evaluatePasswordStrength,
  validateRegistrationInputs,
  validateEmail,
} from '../utils/authValidation';

export const AuthPage: React.FC = () => {
  const { user, login, register, logout, updateProfile, setActiveTab } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset' | 'profile'>(
    user ? 'profile' : 'login'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'user' | 'miner' | 'admin'>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authSuccessNotice, setAuthSuccessNotice] = useState<string | null>(null);

  // Forgot password flow
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password strength calculation
  const passwordStrength = evaluatePasswordStrength(password);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    login(email, selectedRole);
    setAuthSuccessNotice(`Authenticated as ${email} (${selectedRole.toUpperCase()})`);
    setTimeout(() => {
      setAuthSuccessNotice(null);
      setActiveTab('dashboard');
    }, 900);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateRegistrationInputs(email, displayName, password, confirmPassword);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Invalid form input.');
      return;
    }

    register(email, displayName, selectedRole);
    setAuthSuccessNotice(`Node account created for ${displayName}! Welcome to Nexora Coin.`);
    setTimeout(() => {
      setAuthSuccessNotice(null);
      setActiveTab('dashboard');
    }, 900);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateEmail(email)) {
      setErrorMessage('Please provide the account email address.');
      return;
    }

    const mockToken = `nxr_tok_${Math.random().toString(36).substring(2, 10)}`;
    setResetToken(mockToken);
    setMode('reset');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setAuthSuccessNotice('Master password reset successful. Please sign in with your new credentials.');
    setTimeout(() => {
      setAuthSuccessNotice(null);
      setPassword(newPassword);
      setMode('login');
    }, 1500);
  };

  const copyWalletAddress = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.virtualWalletAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const applyDemoPersona = (persona: 'investor' | 'miner' | 'admin') => {
    setErrorMessage(null);
    if (persona === 'investor') {
      setEmail('trader.vance@nexora.vip');
      setPassword('Nexora2026!Trader');
      setDisplayName('Alex Vance');
      setSelectedRole('user');
    } else if (persona === 'miner') {
      setEmail('miner.rig01@nexora.vip');
      setPassword('MiningRig!2026NXR');
      setDisplayName('Dr. Elena Sterling');
      setSelectedRole('miner');
    } else {
      setEmail('superadmin@nexora.vip');
      setPassword('NexoraRoot!Vault2026');
      setDisplayName('Chief SecOps Admin');
      setSelectedRole('admin');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 animate-fadeIn">
      {/* Simulation / Architecture Banner */}
      <div className="p-4 rounded-2xl bg-[#0F111A] border border-[#D4AF37]/35 mb-6 text-xs text-slate-300 space-y-2 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#ECC86A] font-semibold">
            <Info className="w-4 h-4 text-[#ECC86A]" />
            <span className="font-cinzel tracking-wider uppercase">Authentication Protocol</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1A1D2B] text-emerald-400 border border-emerald-500/30">
            ● Demo Testnet Mode
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          For prototyping, authentication sessions are isolated and validated client-side. In a production deployment, credentials connect via Supabase Auth / PostgreSQL with Argon2id encrypted passphrases, Row Level Security (RLS) enforcement, and role-based access control.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-[#0C0E17] border border-[#D4AF37]/30 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle decorative gold light */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-radial from-[#D4AF37]/10 to-transparent blur-2xl pointer-events-none" />

        {/* Brand Header with Animated Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <NexoraLogo
            size="lg"
            showText={false}
            showTagline={false}
            animated={true}
            interactive={true}
          />
          <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-white tracking-wide">
            {mode === 'login' && 'Sign In to Nexora Vault'}
            {mode === 'register' && 'Create Testnet Node Account'}
            {mode === 'forgot' && 'Reset Vault Passphrase'}
            {mode === 'reset' && 'Confirm New Master Password'}
            {mode === 'profile' && 'Node Identity & Security'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md">
            {mode === 'login' && 'Access virtual mining clusters, portfolio allocation, and market data.'}
            {mode === 'register' && 'Join the simulated proof-of-work testnet with instant wallet allocation.'}
            {mode === 'forgot' && 'Recover access to your demo wallet credentials.'}
            {mode === 'reset' && 'Provide your updated passkey to finalize credential recovery.'}
            {mode === 'profile' && 'Manage your testnet permissions and virtual wallet deposit address.'}
          </p>
        </div>

        {/* Notification / Error / Success Messages */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {authSuccessNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{authSuccessNotice}</span>
          </div>
        )}

        {/* 1. Profile View */}
        {mode === 'profile' && user && (
          <div className="space-y-5 text-xs font-mono">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#08090E] border border-slate-800 space-y-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans">Full Name:</span>
                <span className="text-white font-bold">{user.displayName}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans">Account Email:</span>
                <span className="text-slate-200">{user.email}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans">Assigned Role:</span>
                <span className="text-[#ECC86A] uppercase font-bold px-2 py-0.5 rounded bg-[#1A1D2B] border border-[#D4AF37]/35">
                  {user.role}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 pb-2.5 border-b border-slate-800/80">
                <span className="text-slate-400 font-sans">Virtual Deposit Address:</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#ECC86A] truncate max-w-[220px] sm:max-w-xs">
                    {user.virtualWalletAddress}
                  </span>
                  <button
                    onClick={copyWalletAddress}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Copy Address"
                    aria-label="Copy Address"
                  >
                    {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Two-Factor Authentication:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Active (TOTP Simulation)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-sans">
              <button
                onClick={() => {
                  logout();
                  setMode('login');
                }}
                className="py-3 rounded-xl bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch / Sign Out</span>
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-extrabold shadow-lg hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* 2. Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs font-sans">
            {/* Quick Demo Personas */}
            <div className="p-3 rounded-xl bg-[#131622] border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 font-medium">Quick Testnet Autofill Personas:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyDemoPersona('investor')}
                  className="px-2 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#202538] border border-slate-700 text-[11px] text-[#ECC86A] font-medium transition-colors"
                >
                  Trader
                </button>
                <button
                  type="button"
                  onClick={() => applyDemoPersona('miner')}
                  className="px-2 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#202538] border border-slate-700 text-[11px] text-[#ECC86A] font-medium transition-colors"
                >
                  Miner
                </button>
                <button
                  type="button"
                  onClick={() => applyDemoPersona('admin')}
                  className="px-2 py-1.5 rounded-lg bg-[#181B28] hover:bg-[#202538] border border-slate-700 text-[11px] text-[#ECC86A] font-medium transition-colors"
                >
                  SuperAdmin
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader.vance@nexora.vip"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400">Master Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setMode('forgot');
                  }}
                  className="text-[11px] text-[#ECC86A] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Testnet Role</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'user', label: 'Trader' },
                  { id: 'miner', label: 'Miner' },
                  { id: 'admin', label: 'SuperAdmin' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id as any)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                      selectedRole === r.id
                        ? 'bg-[#181B28] text-[#F3E5AB] border-[#D4AF37] font-bold shadow'
                        : 'bg-[#0E1018] text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#B38F26] text-black font-extrabold text-sm shadow-lg hover:scale-[1.01] transition-transform"
            >
              Sign In to Node
            </button>

            <div className="text-center pt-2">
              <span className="text-slate-400">Need a testnet account? </span>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('register');
                }}
                className="text-[#ECC86A] hover:underline font-semibold"
              >
                Register Now
              </button>
            </div>
          </form>
        )}

        {/* 3. Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-slate-400 mb-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Alex Vance"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@nexora.vip"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Master Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Strength:</span>
                    <span
                      className={`font-semibold ${
                        passwordStrength.label === 'Strong'
                          ? 'text-emerald-400'
                          : passwordStrength.label === 'Good'
                          ? 'text-cyan-400'
                          : passwordStrength.label === 'Fair'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map(idx => (
                      <div
                        key={idx}
                        className={`h-full rounded-full transition-colors ${
                          idx <= passwordStrength.score
                            ? passwordStrength.score >= 4
                              ? 'bg-emerald-400'
                              : passwordStrength.score === 3
                              ? 'bg-cyan-400'
                              : passwordStrength.score === 2
                              ? 'bg-amber-400'
                              : 'bg-rose-400'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Account Role Profile</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'user', label: 'Standard Trader' },
                  { id: 'miner', label: 'Proof-of-Work Miner' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id as any)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                      selectedRole === r.id
                        ? 'bg-[#181B28] text-[#F3E5AB] border-[#D4AF37] font-bold'
                        : 'bg-[#0E1018] text-slate-400 border-slate-800'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-extrabold text-sm shadow-lg hover:scale-[1.01] transition-transform"
            >
              Create Testnet Account
            </button>

            <div className="text-center pt-2">
              <span className="text-slate-400">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('login');
                }}
                className="text-[#ECC86A] hover:underline font-semibold"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 4. Forgot Password Flow */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs font-sans">
            <p className="text-slate-300 leading-relaxed">
              Enter your registered email address. We will generate a simulated one-time password reset recovery token for your vault.
            </p>
            <div>
              <label className="block text-slate-400 mb-1">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="trader.vance@nexora.vip"
                className="w-full p-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-bold shadow hover:bg-[#ECC86A] transition-colors"
            >
              Generate Recovery Token
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('login');
                }}
                className="text-[#ECC86A] hover:underline"
              >
                Return to Sign In
              </button>
            </div>
          </form>
        )}

        {/* 5. Password Reset Flow (Token Verification & New Password) */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4 text-xs font-sans">
            <div className="p-3 bg-[#131622] rounded-xl border border-[#D4AF37]/35 text-slate-300 space-y-1">
              <div className="flex items-center gap-2 text-[#ECC86A] font-semibold">
                <KeyRound className="w-4 h-4 text-[#ECC86A]" />
                <span>Simulated Reset Token Verified</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Token: {resetToken || 'nxr_tok_8f99a1'} (valid for 15 minutes)
              </p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">New Master Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full p-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full p-2.5 rounded-xl bg-[#151824] border border-slate-800 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B38F26] text-black font-extrabold shadow"
            >
              Save New Master Password
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setMode('login');
                }}
                className="text-[#ECC86A] hover:underline"
              >
                Cancel and return to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
