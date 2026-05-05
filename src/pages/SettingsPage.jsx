import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle, KeyRound, Lock, Settings as SettingsIcon, Shield } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { profileApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const TABS = [
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

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

  const updateMut = useMutation({
    mutationFn: (data) => profileApi.update(data),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Settings updated');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update settings'),
  });

  const changePwMut = useMutation({
    mutationFn: (data) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwForm({ current: '', new: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
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
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <Shield size={15} className="text-[var(--color-primary)]" /> Security Controls
            </h3>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] flex items-center gap-1.5">
                  <Lock size={14} className="text-[var(--color-primary)]" /> Two-Factor Authentication (2FA)
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Add an extra verification step during login.</p>
              </div>
              <button
                onClick={() => updateMut.mutate({ twoFactorEnabled: !user?.twoFactorEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user?.twoFactorEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${user?.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
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
