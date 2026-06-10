import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, KeyRound, Mail, Settings as SettingsIcon, Shield, Smartphone } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authApi, profileApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const TABS = [
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('security');
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  const visibleTabs = TABS.filter((tabItem) => (isInstructor ? true : tabItem.id !== 'preferences'));

  const PREF_KEY = 'instructor_prefs';
  const loadPrefs = () => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; }
  };
  const [prefs, setPrefs] = useState(() => ({
    defaultDifficulty: 'medium',
    defaultQuestions: 10,
    defaultPassingScore: 60,
    emailOnAttempt: true,
    emailOnBatchJoin: true,
    weeklyReport: false,
    ...loadPrefs(),
  }));

  const savePrefs = (updated) => {
    setPrefs(updated);
    localStorage.setItem(PREF_KEY, JSON.stringify(updated));
    toast.success('Preferences saved');
  };

  const changePwMut = useMutation({
    mutationFn: (data) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwForm({ current: '', new: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const email2faMut = useMutation({
    mutationFn: (enabled) => profileApi.update({ twoFactorEnabled: enabled }),
    onSuccess: (res) => {
      if (res?.data?.user) setUser({ ...user, twoFactorEnabled: !!res.data.user.twoFactorEnabled });
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success(res.data.user?.twoFactorEnabled ? 'Email OTP enabled for login.' : 'Email OTP disabled.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update email OTP'),
  });

  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState('');

  const totpConfigured = !!user?.totpConfigured;
  const totpEnabled = !!user?.totpEnabled;
  const email2faEnabled = !!user?.twoFactorEnabled;

  const setupMut = useMutation({
    mutationFn: () => authApi.totpSetup(),
    onSuccess: (res) => {
      setTotpSetup({ qrCodeDataUrl: res.data.qrCodeDataUrl, secret: res.data.secret });
      setTotpCode('');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not start authenticator setup'),
  });

  const confirmMut = useMutation({
    mutationFn: (code) => authApi.totpConfirm({ code }),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      qc.invalidateQueries({ queryKey: ['me'] });
      setTotpSetup(null);
      setTotpCode('');
      toast.success('Authenticator app set up and enabled.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid verification code.'),
  });

  const totpToggleMut = useMutation({
    mutationFn: (enabled) => authApi.totpToggle({ enabled }),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success(res.data.message || 'Authenticator updated.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update authenticator'),
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage account security and app controls.</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {visibleTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'security' && (
        <div className="space-y-5">
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <KeyRound size={15} className="text-[var(--color-primary)]" /> Change Password
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">Current Password</label>
                <input type="password" className="input w-full text-sm" value={pwForm.current} onChange={(e) => setPwForm(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">New Password</label>
                  <input type="password" className="input w-full text-sm" value={pwForm.new} onChange={(e) => setPwForm(p => ({ ...p, new: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">Confirm Password</label>
                  <input type="password" className="input w-full text-sm" value={pwForm.confirm} onChange={(e) => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
                </div>
              </div>
              <button
                onClick={() => {
                  if (pwForm.new.length < 6) return toast.error('Password must be at least 6 characters');
                  if (pwForm.new !== pwForm.confirm) return toast.error('Passwords do not match');
                  changePwMut.mutate({ currentPassword: pwForm.current, newPassword: pwForm.new });
                }}
                disabled={!pwForm.current || !pwForm.new || changePwMut.isPending}
                className="btn-primary py-2 px-6 text-sm disabled:opacity-50"
              >
                {changePwMut.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="mb-5">
              <h3 className="font-semibold text-[var(--color-text)] text-sm flex items-center gap-2">
                <Shield size={15} className="text-[var(--color-primary)]" /> Two-Factor Authentication
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Add an extra verification step at login. Enable one or both methods.
              </p>
            </div>

            {/* Email OTP */}
            <div className="flex items-start justify-between gap-4 py-4 border-t border-[var(--color-border)]">
              <div className="flex gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">Email OTP</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Receive a 6-digit code by email when you sign in.
                  </p>
                  {email2faEnabled && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle size={12} /> Active at login
                    </span>
                  )}
                </div>
              </div>
              <Toggle
                enabled={email2faEnabled}
                disabled={email2faMut.isPending}
                onChange={(v) => email2faMut.mutate(v)}
              />
            </div>

            {/* Authenticator App */}
            <div className="py-4 border-t border-[var(--color-border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                    <Smartphone size={16} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)]">Authenticator App</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Google Authenticator, Microsoft Authenticator, or Authy.
                    </p>
                    {totpConfigured && (
                      <span className={`inline-flex items-center gap-1 mt-2 text-xs ${totpEnabled ? 'text-green-600 dark:text-green-400' : 'text-[var(--color-text-muted)]'}`}>
                        <CheckCircle size={12} />
                        {totpEnabled ? 'Active at login' : 'Set up — currently off'}
                      </span>
                    )}
                  </div>
                </div>
                {totpConfigured ? (
                  <Toggle
                    enabled={totpEnabled}
                    disabled={totpToggleMut.isPending}
                    onChange={(v) => totpToggleMut.mutate(v)}
                  />
                ) : !totpSetup ? (
                  <button
                    type="button"
                    onClick={() => setupMut.mutate()}
                    disabled={setupMut.isPending}
                    className="btn-primary py-2 px-4 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {setupMut.isPending ? 'Preparing…' : 'Set up'}
                  </button>
                ) : null}
              </div>

              {totpSetup && (
                <div className="mt-5 p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] space-y-4">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Scan the QR code with your authenticator app, then enter the 6-digit code to finish setup.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <img
                      src={totpSetup.qrCodeDataUrl}
                      alt="Authenticator QR code"
                      className="w-36 h-36 rounded-lg border border-[var(--color-border)] bg-white p-2"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Manual entry key</p>
                      <code className="block text-xs font-mono break-all bg-[var(--color-bg)] px-3 py-2 rounded-lg border border-[var(--color-border)]">
                        {totpSetup.secret}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1 block">
                      Verification code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input w-full max-w-[200px] text-sm tracking-widest text-center font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => confirmMut.mutate(totpCode)}
                      disabled={totpCode.length < 6 || confirmMut.isPending}
                      className="btn-primary py-2 px-4 text-sm disabled:opacity-50"
                    >
                      {confirmMut.isPending ? 'Verifying…' : 'Verify & enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTotpSetup(null); setTotpCode(''); }}
                      className="py-2 px-4 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="card">
          {!isInstructor ? (
            <p className="text-sm text-[var(--color-text-muted)]">Preferences are available for instructor and admin roles.</p>
          ) : (
            <>
              <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4">Instructor Preferences</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">Default Difficulty</label>
                  <select value={prefs.defaultDifficulty} onChange={e => savePrefs({ ...prefs, defaultDifficulty: e.target.value })} className="input w-full text-sm">
                    <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">Default Questions</label>
                  <select value={prefs.defaultQuestions} onChange={e => savePrefs({ ...prefs, defaultQuestions: Number(e.target.value) })} className="input w-full text-sm">
                    {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{n} questions</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 block">Passing Score</label>
                  <input type="number" min={30} max={100} className="input w-full text-sm" value={prefs.defaultPassingScore} onChange={(e) => savePrefs({ ...prefs, defaultPassingScore: Number(e.target.value) || 60 })} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'notifications' && (
        <div className="card">
          <h3 className="font-semibold text-[var(--color-text)] text-sm mb-3 flex items-center gap-2">
            <Bell size={15} className="text-[var(--color-primary)]" /> Notifications
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">Future-ready notification controls will appear here. Email notification events are already active for tickets and account events.</p>
          <div className="mt-4 text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
            <CheckCircle size={13} className="text-green-500" /> Structured for upcoming granular notification preferences.
          </div>
        </div>
      )}
    </div>
  );
}
