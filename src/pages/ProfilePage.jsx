import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import {
  Award, BadgeCheck, BarChart2, Check, CheckCircle, CreditCard,
  Edit3, Flame, GraduationCap, KeyRound, Lock, RefreshCw,
  Shield, Star, Trophy, User, X, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { paymentApi, profileApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const PLAN_INFO = {
  free:       { label: 'Free',       color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', icon: Zap },
  pro:        { label: 'Pro',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', icon: Shield },
  enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', icon: Trophy },
};

const TABS = [
  { id: 'account',      label: 'Account',      icon: User },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'billing',      label: 'Billing',      icon: BarChart2 },
  { id: 'performance',  label: 'Performance',  icon: Star },
];

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState('account');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => profileApi.analytics().then(r => r.data),
  });

  const { data: subData, isLoading: loadingSub } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => paymentApi.getSubscription().then(r => r.data),
  });

  const { data: txnData, isLoading: loadingTxn } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => paymentApi.getTransactions().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: (data) => profileApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated');
      setEditing(false);
    },
    onError: () => toast.error('Update failed'),
  });

  const changePwMut = useMutation({
    mutationFn: (data) => profileApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPwForm({ current: '', new: '', confirm: '' });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  });

  const topicPerf = analyticsData?.topicPerf || {};
  const chartData = {
    labels: Object.keys(topicPerf),
    datasets: [{ label: 'Accuracy %', data: Object.values(topicPerf), backgroundColor: '#0366AC', borderRadius: 6 }],
  };

  const plan = user?.plan || 'free';
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const PlanIcon = planInfo.icon;
  const isFreePlan = plan === 'free';
  const transactions = txnData?.transactions || [];
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtAmount = (paise) => `₹${(paise / 100).toFixed(0)}`;
  const usedExams = (user?.monthlyLimit || 3) - (user?.remaining ?? user?.monthlyLimit ?? 3);
  const usagePct = Math.min(100, (usedExams / (user?.monthlyLimit || 3)) * 100);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl">

      {/* ── Profile header ── */}
      <div className="card mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)] text-white text-2xl font-bold flex items-center justify-center shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-[var(--color-text)]">{user?.name}</h2>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${planInfo.color}`}>
              <PlanIcon size={10} className="inline mr-1" />{planInfo.label}
            </span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] capitalize">
              {user?.role || 'user'}
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{user?.email}</p>
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <GraduationCap size={12} className="text-[var(--color-primary)]" />
              <span className="font-medium text-[var(--color-text)]">{user?.level || 'Beginner'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Flame size={12} className="text-orange-500" />
              <span className="font-medium text-[var(--color-text)]">{user?.streak || 0} day streak</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Star size={12} className="text-purple-500" />
              <span className="font-medium text-[var(--color-text)]">{user?.xp || 0} XP</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <Trophy size={12} className="text-yellow-500" />
              <span className="font-medium text-[var(--color-text)]">{user?.totalExams || 0} exams taken</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {TABS.map(t => {
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

      {/* ── Account tab ── */}
      {tab === 'account' && (
        <div className="space-y-5">
          {/* Name / Email */}
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <User size={15} className="text-[var(--color-primary)]" /> User Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block font-medium">Full Name</label>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="input flex-1 text-sm"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => updateMut.mutate({ name })}
                      disabled={updateMut.isPending}
                      className="btn-primary p-2 rounded-lg"
                    >
                      <Check size={15} />
                    </button>
                    <button onClick={() => { setEditing(false); setName(user?.name); }} className="btn-secondary p-2 rounded-lg">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-[var(--color-bg-alt)] rounded-lg px-3 py-2.5">
                    <span className="text-sm text-[var(--color-text)]">{user?.name}</span>
                    <button onClick={() => setEditing(true)} className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                      <Edit3 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1.5 block font-medium">Email Address</label>
                <div className="bg-[var(--color-bg-alt)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-muted)]">
                  {user?.email}
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <KeyRound size={15} className="text-[var(--color-primary)]" /> Change Password
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">Current Password</label>
                <input
                  type="password"
                  className="input w-full text-sm"
                  placeholder="Enter current password"
                  value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">New Password</label>
                  <input
                    type="password"
                    className="input w-full text-sm"
                    placeholder="Min 6 characters"
                    value={pwForm.new}
                    onChange={e => setPwForm(p => ({ ...p, new: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block font-medium">Confirm Password</label>
                  <input
                    type="password"
                    className="input w-full text-sm"
                    placeholder="Repeat new password"
                    value={pwForm.confirm}
                    onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (pwForm.new.length < 6) { toast.error('Password must be at least 6 characters'); return; }
                  if (pwForm.new !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
                  changePwMut.mutate({ currentPassword: pwForm.current, newPassword: pwForm.new });
                }}
                disabled={!pwForm.current || !pwForm.new || changePwMut.isPending}
                className="btn-primary py-2 px-6 text-sm disabled:opacity-50"
              >
                {changePwMut.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription tab ── */}
      {tab === 'subscription' && (
        <div className="space-y-5">
          {/* Current plan */}
          <div className={`card border-2 ${planInfo.border}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-[var(--color-text)] text-sm mb-1 flex items-center gap-2">
                  <CreditCard size={15} className="text-[var(--color-primary)]" /> Current Plan
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${planInfo.color}`}>
                    <PlanIcon size={13} /> {planInfo.label}
                  </span>
                  {!isFreePlan && (
                    <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>
              {isFreePlan ? (
                <Link to="/pricing" className="btn-primary text-xs py-1.5 px-4 shrink-0 flex items-center gap-1.5">
                  <Zap size={12} /> Upgrade
                </Link>
              ) : (
                <Link to="/pricing" className="btn-secondary text-xs py-1.5 px-4 shrink-0 flex items-center gap-1.5">
                  <RefreshCw size={12} /> Renew / Change
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-t border-[var(--color-border)]">
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Plan</div>
                <div className="font-semibold text-[var(--color-text)] text-sm capitalize">{plan}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Status</div>
                <div className="font-semibold text-sm">
                  {isFreePlan
                    ? <span className="text-slate-500">Free tier</span>
                    : <span className="text-green-600 dark:text-green-400">Active</span>
                  }
                </div>
              </div>
              {!isFreePlan && user?.planExpiresAt && (
                <div>
                  <div className="text-xs text-[var(--color-text-muted)] mb-0.5">Expires</div>
                  <div className="font-semibold text-[var(--color-text)] text-sm">{fmtDate(user.planExpiresAt)}</div>
                </div>
              )}
            </div>

            {/* Usage bar */}
            <div className="pt-4 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[var(--color-text-muted)] font-medium">Monthly Exam Usage</span>
                <span className="font-bold text-[var(--color-text)]">{usedExams} / {user?.monthlyLimit || 3}</span>
              </div>
              <div className="bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
                {user?.remaining ?? 0} exam{user?.remaining !== 1 ? 's' : ''} remaining this month
              </p>
            </div>
          </div>

          {/* Plan features comparison */}
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2">
              <Shield size={15} className="text-[var(--color-primary)]" /> Plan Features
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Monthly exam creation', free: '3 exams', pro: '10 exams', enterprise: '30 exams' },
                { label: 'Max questions per exam', free: '10', pro: '20', enterprise: '30' },
                { label: 'AI Proctoring', free: false, pro: true, enterprise: true },
                { label: 'Instructor tools', free: false, pro: true, enterprise: true },
                { label: 'Priority support', free: false, pro: false, enterprise: true },
              ].map(row => (
                <div key={row.label} className="flex items-center text-sm">
                  <span className="flex-1 text-[var(--color-text-muted)]">{row.label}</span>
                  {(['free', 'pro', 'enterprise']).map(p => (
                    <div key={p} className={`w-24 text-center text-xs ${p === plan ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                      {typeof row[p] === 'boolean'
                        ? (row[p]
                          ? <CheckCircle size={13} className={`inline ${p === plan ? 'text-[var(--color-primary)]' : 'text-green-500'}`} />
                          : <X size={13} className="inline text-[var(--color-border)]" />
                        )
                        : row[p]
                      }
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex items-center text-xs pt-2 border-t border-[var(--color-border)]">
                <span className="flex-1" />
                {['free', 'pro', 'enterprise'].map(p => (
                  <div key={p} className={`w-24 text-center font-semibold capitalize ${p === plan ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                    {p}
                  </div>
                ))}
              </div>
            </div>
            {isFreePlan && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <Link to="/pricing" className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
                  <Zap size={14} /> Upgrade from ₹149/mo
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Billing tab ── */}
      {tab === 'billing' && (
        <div className="card">
          <h3 className="font-semibold text-[var(--color-text)] text-sm mb-5 flex items-center gap-2">
            <CreditCard size={15} className="text-[var(--color-primary)]" /> Transaction History
          </h3>
          {loadingTxn ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14" />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={36} className="mx-auto mb-3 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-muted)]">No transactions yet.</p>
              {isFreePlan && (
                <Link to="/pricing" className="text-xs text-[var(--color-primary)] hover:underline mt-2 inline-block">
                  Upgrade your plan to get started
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-4 text-xs text-[var(--color-text-muted)] font-medium py-2 px-3">
                <span>Plan</span>
                <span>Date</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Status</span>
              </div>
              {transactions.map(txn => (
                <div key={txn._id} className="py-3 px-3 rounded-lg hover:bg-[var(--color-bg-alt)] transition-colors">
                  <div className="grid grid-cols-4 items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${txn.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-[var(--color-bg-alt)]'}`}>
                        <CreditCard size={12} className={txn.status === 'paid' ? 'text-green-500' : 'text-[var(--color-text-muted)]'} />
                      </div>
                      <span className="text-sm font-medium text-[var(--color-text)] capitalize">{txn.plan} Plan</span>
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">{fmtDate(txn.createdAt)}</span>
                    <span className={`text-sm font-semibold text-right ${txn.status === 'paid' ? 'text-green-600 dark:text-green-400' : 'text-[var(--color-text-muted)]'}`}>
                      {fmtAmount(txn.amount)}
                    </span>
                    <div className="flex justify-end">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${txn.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {txn.status}
                      </span>
                    </div>
                  </div>
                  {txn.razorpayOrderId && (
                    <div className="mt-1.5 ml-9 flex flex-wrap gap-x-4 gap-y-0.5">
                      <span className="text-[10px] text-[var(--color-text-muted)] font-mono" title={txn.razorpayOrderId}>
                        Order: {txn.razorpayOrderId}
                      </span>
                      {txn.razorpayPaymentId && (
                        <span className="text-[10px] text-[var(--color-text-muted)] font-mono" title={txn.razorpayPaymentId}>
                          Payment: {txn.razorpayPaymentId}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Performance tab ── */}
      {tab === 'performance' && (
        <div className="space-y-5">
          {Object.keys(topicPerf).length > 0 ? (
            <div className="card">
              <h3 className="font-semibold text-[var(--color-text)] mb-4 text-sm flex items-center gap-2">
                <BarChart2 size={15} className="text-[var(--color-primary)]" /> Topic Performance
              </h3>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { min: 0, max: 100, ticks: { callback: v => `${v}%` } } },
                }}
              />
            </div>
          ) : (
            <div className="card text-center py-12">
              <BarChart2 size={36} className="mx-auto mb-3 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-muted)]">Take exams to see topic breakdown.</p>
            </div>
          )}

          {user?.badges?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-[var(--color-text)] mb-3 text-sm flex items-center gap-2">
                <Award size={15} className="text-[var(--color-primary)]" /> Badges
              </h3>
              <div className="flex flex-wrap gap-2">
                {user.badges.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-[var(--color-bg-alt)] px-3 py-1.5 rounded-full text-xs font-medium text-[var(--color-text)]">
                    <BadgeCheck size={13} className="text-[var(--color-primary)]" />
                    {b.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
