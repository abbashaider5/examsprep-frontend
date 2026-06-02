import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import {
  BarChart2,
  Bell,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  FileText,
  Inbox,
  Layers,
  Megaphone,
  MessageSquare,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Target,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Upload,
  Users,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import HelpTopicsTab from '../components/admin/HelpTopicsTab.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Modal from '../components/Modal.jsx';
import { ADMIN_PANEL_TABS } from '../config/adminPanelTabs.js';
import { adminApi, announcementApi, contactApi, enterpriseApi, feedbackApi, groupApi, logsApi, resourceApi, settingsApi } from '../services/api.js';
import { BOARDS, CLASS_LEVELS } from '../constants/curriculum.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const TABS = ADMIN_PANEL_TABS;

const HUB_TABS = TABS.filter(t => t.id !== 'overview');

const ADMIN_TAB_PAGE = {
  users: { title: 'User directory', description: 'Search accounts, change roles, block access, and adjust subscription plans.' },
  plans: { title: 'Plan management', description: 'Monitor paid tiers, renewals, and how capacity is distributed across the platform.' },
  announcements: { title: 'Announcements', description: 'Broadcast platform news, maintenance windows, and product updates to all users.' },
  groups: { title: 'Groups & batches', description: 'Oversee study groups, batch membership, and cross-organization access.' },
  contacts: { title: 'Contact queries', description: 'Review messages from the public contact form and respond in one place.' },
  logs: { title: 'Activity logs', description: 'Audit security events, admin actions, and system activity for compliance.' },
  settings: { title: 'System settings', description: 'Control feature flags, limits, and global platform configuration.' },
  payments: { title: 'Payments & revenue', description: 'Track transactions, subscriptions, and payment history across Razorpay.' },
  feedback: { title: 'User feedback', description: 'Read product feedback, triage issues, and follow up on quality.' },
  resources: { title: 'Resource Management', description: 'Upload curriculum resources mapped to board, class, and subject for school exam generation.' },
  help: { title: 'Help center content', description: 'Create and edit role-specific help articles shown in search and the Help center.' },
  enterprises: { title: 'Enterprise organizations', description: 'Create schools and institutes, assign principals, and set teacher limits. Mode cannot be changed after creation.' },
};

const TAB_HEADER_GRADIENT = {
  users: 'from-sky-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  plans: 'from-violet-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  announcements: 'from-amber-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  groups: 'from-teal-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  contacts: 'from-cyan-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  logs: 'from-orange-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  settings: 'from-slate-500/[0.10] via-[var(--color-surface)] to-[var(--color-bg)]',
  payments: 'from-emerald-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  feedback: 'from-rose-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  resources: 'from-indigo-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
  help: 'from-sky-500/[0.10] via-[var(--color-surface)] to-[var(--color-bg)]',
  enterprises: 'from-teal-500/[0.12] via-[var(--color-surface)] to-[var(--color-bg)]',
};

function AdminTabPageHeader({ tabId, onBack }) {
  const meta = ADMIN_TAB_PAGE[tabId];
  const grad =
    TAB_HEADER_GRADIENT[tabId] ||
    "from-[var(--color-primary)]/[0.08] to-[var(--color-bg)]";

  if (!meta) return null;

  return (
    <div
      className={`mb-6 rounded-2xl border border-[var(--color-border)] bg-gradient-to-br ${grad} p-5 sm:p-6 shadow-sm`}
    >
      {/* Top Row: Title + Back Button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight">
            {meta.title}
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-2xl leading-relaxed">
            {meta.description}
          </p>
        </div>

        {/* Back Button Right Side */}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors whitespace-nowrap"
        >
          <ChevronLeft size={16} /> Back
        </button>
      </div>
    </div>
  );
}

const SEVERITY_COLORS = { info: 'bg-blue-100 text-blue-700', warning: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
const CATEGORY_COLORS = { auth: 'bg-purple-100 text-purple-700', exam: 'bg-green-100 text-green-700', admin: 'bg-yellow-100 text-yellow-700', proctoring: 'bg-red-100 text-red-700', certificate: 'bg-blue-100 text-blue-700', profile: 'bg-gray-100 text-gray-700', enterprise: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' };

function StatBox({ label, value, icon, color, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`card flex items-center gap-4 w-full text-left ${onClick ? 'hover:shadow-md hover:border-[var(--color-primary)] transition-all cursor-pointer' : ''}`}
    >
      <div className={`${color} p-3 rounded-xl shrink-0`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-[var(--color-text)]">{value ?? '—'}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
      </div>
    </Tag>
  );
}

function fillDays(data, days = 7) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const found = data?.find(x => x._id === key);
    result.push({ label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), value: found?.count || 0 });
  }
  return result;
}

const baseChartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { stepSize: 1, font: { size: 11 } } },
  },
};

// ── Overview ────────────────────────────────────────────────────────────────
function OverviewTab({ stats, onSetTab }) {
  if (!stats) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}</div>;

  const userDays = fillDays(stats.userGrowth);
  const examDays = fillDays(stats.examActivity);

  const lineDataset = (days, color) => ({
    labels: days.map(d => d.label),
    datasets: [{ data: days.map(d => d.value), borderColor: color, backgroundColor: color + '20', fill: true, tension: 0.4, pointRadius: 3 }],
  });

  const scoreLabels = ['0–25%', '25–50%', '50–75%', '75–90%', '90–100%'];
  const scoreCounts = [0, 25, 50, 75, 90].map(b => stats.scoreDistribution?.find(x => x._id === b)?.count || 0);

  const doughnutData = {
    labels: scoreLabels,
    datasets: [{ data: scoreCounts, backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'], borderWidth: 2 }],
  };

  const barData = {
    labels: stats.topSubjects?.map(s => s._id) || [],
    datasets: [{ data: stats.topSubjects?.map(s => s.count) || [], backgroundColor: '#6366f1', borderRadius: 6 }],
  };

  const plans = stats.plans || { free: 0, pro: 0, enterprise: 0 };

  const ai = stats.aiHealth;

  return (
    <div className="space-y-8">
      {ai && (
        <div className="rounded-xl border-2 border-red-500/60 bg-red-50 dark:bg-red-950/30 px-4 py-4 sm:px-5">
          <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
            <span aria-hidden>🔴</span>
            Critical AI Service Alert
          </p>
          <p className="text-sm text-red-800/90 dark:text-red-200/90 mt-1">
            AI exam generation is currently unavailable for some users.
          </p>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <dt className="text-red-600/80 dark:text-red-300/70 font-medium">Affected users</dt>
              <dd className="font-semibold text-red-900 dark:text-red-100">{ai.affectedUserCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-red-600/80 dark:text-red-300/70 font-medium">Provider</dt>
              <dd className="font-semibold text-red-900 dark:text-red-100">{ai.provider || '—'}</dd>
            </div>
            <div>
              <dt className="text-red-600/80 dark:text-red-300/70 font-medium">Error</dt>
              <dd className="font-semibold text-red-900 dark:text-red-100">{ai.errorType || '—'}</dd>
            </div>
            <div>
              <dt className="text-red-600/80 dark:text-red-300/70 font-medium">Model</dt>
              <dd className="font-semibold text-red-900 dark:text-red-100 truncate">{ai.model || '—'}</dd>
            </div>
          </dl>
          <p className="text-xs text-red-700/80 dark:text-red-300/80 mt-2">
            Check your notification bell for full diagnostics.
          </p>
        </div>
      )}
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Platform snapshot</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatBox label="Total users" value={stats.users} icon={<Users size={20} className="text-blue-600" />} color="bg-blue-100 dark:bg-blue-900/30" onClick={() => onSetTab('users')} />
          <StatBox label="Instructors" value={stats.instructors ?? 0} icon={<Shield size={20} className="text-amber-600" />} color="bg-amber-100 dark:bg-amber-900/30" onClick={() => onSetTab('users')} />
          <StatBox label="Administrators" value={stats.admins ?? 0} icon={<ShieldCheck size={20} className="text-red-600" />} color="bg-red-100 dark:bg-red-900/30" onClick={() => onSetTab('users')} />
          <StatBox label="Total exams" value={stats.exams} icon={<BookOpen size={20} className="text-green-600" />} color="bg-green-100 dark:bg-green-900/30" />
          <StatBox label="Total results" value={stats.results} icon={<CheckCircle size={20} className="text-purple-600" />} color="bg-purple-100 dark:bg-purple-900/30" onClick={() => onSetTab('logs')} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
          <StatBox label="Free plan" value={plans.free} icon={<Layers size={20} className="text-slate-600" />} color="bg-slate-100 dark:bg-slate-800/50" onClick={() => onSetTab('users')} />
          <StatBox label="Pro plan" value={plans.pro} icon={<Zap size={20} className="text-blue-600" />} color="bg-blue-100 dark:bg-blue-900/30" onClick={() => onSetTab('plans')} />
          <StatBox label="Enterprise" value={plans.enterprise} icon={<Star size={20} className="text-indigo-600" />} color="bg-indigo-100 dark:bg-indigo-900/30" onClick={() => onSetTab('plans')} />
          <StatBox label="Pass rate" value={stats.passRate !== undefined ? `${stats.passRate}%` : null} icon={<Target size={20} className="text-orange-600" />} color="bg-orange-100 dark:bg-orange-900/30" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Trends & distribution</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">New users (7 days)</h3>
            <div className="h-48"><Line data={lineDataset(userDays, '#6366f1')} options={baseChartOpts} /></div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">Exam attempts (7 days)</h3>
            <div className="h-48"><Line data={lineDataset(examDays, '#22c55e')} options={baseChartOpts} /></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">Score distribution</h3>
            <div className="h-56 flex items-center justify-center">
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'right', labels: { font: { size: 11 } } } } }} />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-[var(--color-text)] mb-4">Top subjects</h3>
            <div className="h-56"><Bar data={barData} options={baseChartOpts} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users ────────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user', notifyEmail: true });
  const [deleteUserTarget, setDeleteUserTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignMode, setAssignMode] = useState('duration');
  const [assignForm, setAssignForm] = useState({ planCode: 'free', months: 1, customExpiryDate: '' });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers', page, search],
    queryFn: () => adminApi.users(page, search).then(r => r.data),
  });

  const createUserMut = useMutation({
    mutationFn: (payload) => adminApi.createUser(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
      if (res.data.notifyEmailSent) {
        toast.success('User created and notification email sent.');
      } else {
        toast.success('User created.');
        if (res.data.emailSendFailed) {
          toast.error('Email was not delivered (check server logs and Resend: API key, verified domain, FROM address). Temporary password is shown below.', { duration: 10000 });
        }
      }
      if (res.data.temporaryPassword) {
        toast.success(`Password (copy now): ${res.data.temporaryPassword}`, { duration: 12000 });
      }
      setShowCreateUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'user', notifyEmail: true });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create user'),
  });
  const { data: plansCatalogData } = useQuery({
    queryKey: ['adminPlansCatalogForUsers'],
    queryFn: () => adminApi.plans().then((r) => r.data),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => adminApi.updateRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success('Role updated'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const blockMut = useMutation({
    mutationFn: (id) => adminApi.toggleBlock(id),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success(res.data.message); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success('User deleted'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const assignPlanMut = useMutation({
    mutationFn: ({ id, payload }) => adminApi.updatePlan(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('Subscription updated');
      setAssignTarget(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update subscription'),
  });

  const users = usersData?.users || [];
  const plansCatalog = plansCatalogData?.plans || [];
  const totalPages = usersData?.pages || 1;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const nextExpiryPreview = (() => {
    if (!assignTarget) return null;
    if (assignForm.planCode === 'free') return null;
    if (assignMode === 'custom' && assignForm.customExpiryDate) return new Date(assignForm.customExpiryDate);
    const d = new Date();
    d.setMonth(d.getMonth() + Number(assignForm.months || 1));
    return d;
  })();

  const submitCreateUser = (e) => {
    e.preventDefault();
    const payload = {
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      role: newUser.role,
      notifyEmail: newUser.notifyEmail,
    };
    if (newUser.password.trim().length >= 6) payload.password = newUser.password.trim();
    createUserMut.mutate(payload);
  };

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input className="input pl-8 text-sm py-2" placeholder="Search users..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }} />
        </div>
        <button type="button" onClick={() => { setSearch(searchInput); setPage(1); }} className="btn-secondary text-xs py-2 px-3">Search</button>
        {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="text-xs text-[var(--color-text-muted)] hover:underline">Clear</button>}
        <button type="button" onClick={() => setShowCreateUser(true)} className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 ml-auto">
          <Plus size={14} /> Create user
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-12" />)}</div>
      ) : users.length === 0 ? (
        <p className="text-center py-8 text-[var(--color-text-muted)] text-sm">No users found.</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Current Plan</th>
                  <th className="pb-3 font-semibold">AutoPay</th>
                  <th className="pb-3 font-semibold">Subscription</th>
                  <th className="pb-3 font-semibold">Expiry</th>
                  <th className="pb-3 font-semibold">Level / XP</th>
                  <th className="pb-3 font-semibold">Access</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-[var(--color-bg-alt)] transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">{u.name?.[0]?.toUpperCase()}</div>
                        <div>
                          <p className="font-medium text-[var(--color-text)]">{u.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : u.role === 'instructor' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{u.role}</span>
                        {u.role !== 'admin' && (
                          <select value={u.role} onChange={e => roleMut.mutate({ id: u._id, role: e.target.value })} className="input py-1 text-xs w-24">
                            <option value="user">user</option>
                            <option value="instructor">instructor</option>
                            <option value="principal">principal</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="badge text-xs bg-blue-100 text-blue-700">
                        {u.individualPlanCode || u.plan || 'free'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`badge text-xs ${u.autoRenew ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.autoRenew ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="badge text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">
                        {u.subscriptionStatus || u.planStatus || 'free'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]">{fmtDate(u.planExpiresAt)}</td>
                    <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]">
                      <span className="font-medium text-[var(--color-text)]">{u.level}</span>
                      {' · '}
                      <span className="font-semibold text-[var(--color-text)]">{u.xp}</span> XP
                    </td>
                    <td className="py-3 pr-4">{u.isBlocked ? <span className="badge bg-red-100 text-red-700">Blocked</span> : <span className="badge bg-green-100 text-green-700">Active</span>}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {u.role !== 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setAssignTarget(u);
                                setAssignMode('duration');
                                setAssignForm({
                                  planCode: u.individualPlanCode || (u.plan === 'free' ? 'free' : 'premium'),
                                  months: 1,
                                  customExpiryDate: '',
                                });
                              }}
                              className="text-xs px-2 py-1 rounded border border-blue-400 text-blue-600 hover:bg-blue-50"
                            >
                              {u.individualPlanCode || (u.plan && u.plan !== 'free') ? 'Change / Extend' : 'Assign Plan'}
                            </button>
                            <button onClick={() => blockMut.mutate(u._id)} className={`text-xs px-2 py-1 rounded border transition-colors ${u.isBlocked ? 'border-green-400 text-green-600 hover:bg-green-50' : 'border-orange-400 text-orange-600 hover:bg-orange-50'}`}>
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button type="button" onClick={() => setDeleteUserTarget(u)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)]">Page {page} of {totalPages} · {usersData?.total} users</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {showCreateUser && (
        <Modal onClose={() => !createUserMut.isPending && setShowCreateUser(false)}>
          <form
            onSubmit={submitCreateUser}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Create user</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Adds an account. Optionally email login instructions.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Name</label>
                <input className="input w-full mt-1 text-sm" value={newUser.name} onChange={e => setNewUser(s => ({ ...s, name: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Email</label>
                <input type="email" className="input w-full mt-1 text-sm" value={newUser.email} onChange={e => setNewUser(s => ({ ...s, email: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Role</label>
                <select className="input w-full mt-1 text-sm" value={newUser.role} onChange={e => setNewUser(s => ({ ...s, role: e.target.value }))}>
                  <option value="user">User</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Password (optional)</label>
                <input type="password" className="input w-full mt-1 text-sm" value={newUser.password} onChange={e => setNewUser(s => ({ ...s, password: e.target.value }))} placeholder="Leave blank to auto-generate" autoComplete="new-password" />
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Minimum 6 characters if set.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newUser.notifyEmail} onChange={e => setNewUser(s => ({ ...s, notifyEmail: e.target.checked }))} className="rounded border-[var(--color-border)]" />
                <span className="text-sm text-[var(--color-text)]">Send welcome email with credentials</span>
              </label>
            </div>
            <div className="flex flex-wrap justify-end gap-2 px-6 py-4 bg-[var(--color-bg-alt)]/60 border-t border-[var(--color-border)]">
              <button type="button" onClick={() => !createUserMut.isPending && setShowCreateUser(false)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
              <button type="submit" disabled={createUserMut.isPending} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
                {createUserMut.isPending ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!deleteUserTarget}
        onClose={() => !deleteMut.isPending && setDeleteUserTarget(null)}
        onConfirm={() => {
          if (!deleteUserTarget) return;
          deleteMut.mutate(deleteUserTarget._id, { onSuccess: () => setDeleteUserTarget(null) });
        }}
        title="Delete this user?"
        description={deleteUserTarget ? `${deleteUserTarget.name} (${deleteUserTarget.email}) will be removed permanently.` : ''}
        confirmLabel="Delete user"
        isPending={deleteMut.isPending}
      />
      {assignTarget && (
        <Modal onClose={() => !assignPlanMut.isPending && setAssignTarget(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-5 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Assign Subscription</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{assignTarget.name} ({assignTarget.email})</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 p-3 text-xs text-[var(--color-text-muted)]">
                <p>Current Plan: <span className="font-medium text-[var(--color-text)]">{assignTarget.individualPlanCode || assignTarget.plan || 'free'}</span></p>
                <p>Current Expiry: <span className="font-medium text-[var(--color-text)]">{fmtDate(assignTarget.planExpiresAt)}</span></p>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Plan</label>
                <select
                  className="input w-full mt-1"
                  value={assignForm.planCode}
                  onChange={(e) => setAssignForm((s) => ({ ...s, planCode: e.target.value }))}
                >
                  <option value="free">free</option>
                  {plansCatalog.map((p) => <option key={p._id} value={p.code}>{p.name} ({p.code})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Duration Mode</label>
                <div className="mt-1 flex gap-2">
                  <button type="button" className={`btn-secondary text-xs ${assignMode === 'duration' ? '!bg-[var(--color-primary)] !text-white' : ''}`} onClick={() => setAssignMode('duration')}>Preset</button>
                  <button type="button" className={`btn-secondary text-xs ${assignMode === 'custom' ? '!bg-[var(--color-primary)] !text-white' : ''}`} onClick={() => setAssignMode('custom')}>Custom Expiry</button>
                </div>
              </div>
              {assignMode === 'duration' ? (
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Duration</label>
                  <select className="input w-full mt-1" value={assignForm.months} onChange={(e) => setAssignForm((s) => ({ ...s, months: Number(e.target.value) }))}>
                    {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m === 1 ? '' : 's'}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Custom Expiry Date</label>
                  <input type="date" className="input w-full mt-1" value={assignForm.customExpiryDate} onChange={(e) => setAssignForm((s) => ({ ...s, customExpiryDate: e.target.value }))} />
                </div>
              )}
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs">
                <p>New Plan: <span className="font-medium">{assignForm.planCode}</span></p>
                <p>New Expiry: <span className="font-medium">{fmtDate(nextExpiryPreview)}</span></p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 flex justify-end gap-2">
              <button type="button" className="btn-secondary text-sm" onClick={() => setAssignTarget(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={assignPlanMut.isPending}
                onClick={() => {
                  assignPlanMut.mutate({
                    id: assignTarget._id,
                    payload: assignMode === 'custom'
                      ? { plan: assignForm.planCode, customExpiryDate: assignForm.customExpiryDate }
                      : { plan: assignForm.planCode, months: assignForm.months },
                  });
                }}
              >
                {assignPlanMut.isPending ? 'Applying…' : 'Confirm & Apply'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Activity Logs ────────────────────────────────────────────────────────────
function LogsTab() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ category: '', severity: '', page: 1 });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['adminLogs', filters],
    queryFn: () => logsApi.get(filters).then(r => r.data),
  });

  const clearMut = useMutation({
    mutationFn: (days) => logsApi.clear(days),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminLogs'] }); toast.success('Old logs cleared'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const logs = data?.logs || [];
  const totalPages = data?.pages || 1;
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v, page: 1 }));

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input text-sm py-2 w-36" value={filters.category} onChange={e => setFilter('category', e.target.value)}>
          <option value="">All Categories</option>
          {['auth', 'exam', 'certificate', 'profile', 'admin', 'proctoring'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input text-sm py-2 w-32" value={filters.severity} onChange={e => setFilter('severity', e.target.value)}>
          <option value="">All Severity</option>
          {['info', 'warning', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => refetch()} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"><RefreshCw size={12} /> Refresh</button>
        <button onClick={() => { if (window.confirm('Delete logs older than 30 days?')) clearMut.mutate(30); }} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 !text-red-500 border-red-200 hover:bg-red-50">
          <Trash2 size={12} /> Clear Old
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-10" />)}</div>
      ) : logs.length === 0 ? (
        <p className="text-center py-8 text-[var(--color-text-muted)] text-sm">No logs found.</p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[700px] text-xs">
              <thead>
                <tr className="text-left text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="pb-2 font-semibold">Time</th>
                  <th className="pb-2 font-semibold">User</th>
                  <th className="pb-2 font-semibold">Action</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">Severity</th>
                  <th className="pb-2 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-[var(--color-bg-alt)] transition-colors">
                    <td className="py-2 pr-3 whitespace-nowrap text-[var(--color-text-muted)]">
                      <div className="flex items-center gap-1"><Clock size={10} />{new Date(log.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-[var(--color-text)]">{log.userName || '—'}</div>
                      <div className="text-[var(--color-text-muted)]">{log.userEmail}</div>
                    </td>
                    <td className="py-2 pr-3 font-mono text-[var(--color-text)]">{log.action}</td>
                    <td className="py-2 pr-3"><span className={`badge text-xs ${CATEGORY_COLORS[log.category] || 'bg-gray-100 text-gray-700'}`}>{log.category}</span></td>
                    <td className="py-2 pr-3"><span className={`badge text-xs ${SEVERITY_COLORS[log.severity] || ''}`}>{log.severity}</span></td>
                    <td className="py-2 text-[var(--color-text-muted)]">{log.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-muted)]">Page {filters.page} of {totalPages} · {data?.total} entries</p>
              <div className="flex gap-2">
                <button onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page === 1} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button onClick={() => setFilters(f => ({ ...f, page: Math.min(totalPages, f.page + 1) }))} disabled={filters.page === totalPages} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EnterpriseLogsTab() {
  const [enterpriseId, setEnterpriseId] = useState('');
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['adminEnterpriseLogs', enterpriseId, userId, action, from, to, page],
    queryFn: () => enterpriseApi.adminAllLogs({
      page,
      enterpriseId: enterpriseId || undefined,
      userId: userId || undefined,
      action: action || undefined,
      from: from || undefined,
      to: to || undefined,
    }).then((r) => r.data),
  });

  const logs = data?.logs || [];
  const enterprises = data?.enterprises || [];
  const userOptions = Array.from(new Map(logs.filter((l) => l.user?._id).map((l) => [l.user._id, l.user])).values());
  const actions = Array.from(new Set(logs.map((l) => l.action).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="card grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <select className="input text-sm" value={enterpriseId} onChange={(e) => { setEnterpriseId(e.target.value); setPage(1); }}>
          <option value="">All enterprises</option>
          {enterprises.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
        </select>
        <select className="input text-sm" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}>
          <option value="">All users</option>
          {userOptions.map((u) => <option key={u._id} value={u._id}>{u.name || u.email}</option>)}
        </select>
        <select className="input text-sm" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">All actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" className="input text-sm" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <input type="date" className="input text-sm" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        <button type="button" className="btn-secondary text-sm" onClick={() => { setEnterpriseId(''); setUserId(''); setAction(''); setFrom(''); setTo(''); setPage(1); }}>
          Clear
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-alt)] text-xs text-[var(--color-text-muted)] uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Enterprise</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Action</th>
              <th className="px-3 py-2 text-left">Severity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-[var(--color-text-muted)]">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-[var(--color-text-muted)]">No enterprise logs found.</td></tr>
            ) : logs.map((l) => (
              <tr key={l._id}>
                <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-[var(--color-text)]">{l.enterprise?.name || '—'}</td>
                <td className="px-3 py-2 text-[var(--color-text-muted)]">{l.user?.name || l.userEmail || '—'}</td>
                <td className="px-3 py-2 font-medium text-[var(--color-text)]">{l.action}</td>
                <td className="px-3 py-2 capitalize text-[var(--color-text-muted)]">{l.severity || 'info'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2">
        <button type="button" className="btn-secondary text-xs px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <span className="text-xs self-center text-[var(--color-text-muted)]">{page} / {data?.pages || 1}</span>
        <button type="button" className="btn-secondary text-xs px-3 py-1.5" disabled={page >= (data?.pages || 1)} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────
function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <div className="flex-1 pr-4">
        <div className="text-sm font-medium text-[var(--color-text)]">{label}</div>
        {description && <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function NumberRow({ label, value, onChange, min, max }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <div className="text-sm font-medium text-[var(--color-text)]">{label}</div>
      <input type="number" min={min} max={max} value={value || ''} onChange={e => onChange(Number(e.target.value))} className="input text-sm py-1 w-24 text-right" />
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['adminSettings'], queryFn: () => settingsApi.get().then(r => r.data.settings) });
  const [local, setLocal] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data && !local) setLocal(data); }, [data]);

  const set = (key) => (val) => setLocal(s => ({ ...s, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update(local);
      qc.invalidateQueries({ queryKey: ['adminSettings'] });
      qc.invalidateQueries({ queryKey: ['publicSettings'] });
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  if (isLoading || !local) return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Platform</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Core platform controls</p>
        <ToggleRow label="Maintenance Mode" description="Blocks all non-admin access" checked={!!local.maintenanceMode} onChange={set('maintenanceMode')} />
        <ToggleRow label="Allow New Registrations" description="New users can sign up" checked={!!local.allowNewRegistrations} onChange={set('allowNewRegistrations')} />
        {local.maintenanceMode && (
          <div className="mt-3">
            <label className="label text-xs">Maintenance Message</label>
            <input className="input text-sm" value={local.maintenanceMessage || ''} onChange={e => setLocal(s => ({ ...s, maintenanceMessage: e.target.value }))} placeholder="We'll be back shortly..." />
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Security & Auth</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Authentication and account protection</p>
        <ToggleRow label="Two-Factor Auth (OTP)" description="Email OTP available to users" checked={!!local.twoFactorAuthEnabled} onChange={set('twoFactorAuthEnabled')} />
        <ToggleRow label="2FA Required for Login" description="All users must complete OTP to sign in" checked={!!local.twoFactorRequired} onChange={set('twoFactorRequired')} disabled={!local.twoFactorAuthEnabled} />
        <ToggleRow label="reCAPTCHA on Login / Sign-up" description="Require Google reCAPTCHA for email/password sign-in and registration" checked={local.recaptchaLoginSignupEnabled ?? true} onChange={set('recaptchaLoginSignupEnabled')} />
        <NumberRow label="Max Login Attempts before lockout" value={local.maxLoginAttempts} onChange={set('maxLoginAttempts')} min={1} max={20} />
        <NumberRow label="Lockout Duration (minutes)" value={local.lockoutDurationMinutes} onChange={set('lockoutDurationMinutes')} min={1} max={1440} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Email Notifications</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Control which transactional emails are sent</p>
        <ToggleRow label="Welcome Email" checked={!!local.emailWelcomeEnabled} onChange={set('emailWelcomeEnabled')} />
        <ToggleRow label="Result Email" checked={!!local.emailResultEnabled} onChange={set('emailResultEnabled')} />
        <ToggleRow label="OTP Email" checked={!!local.emailOtpEnabled} onChange={set('emailOtpEnabled')} />
        <ToggleRow label="Security Alert Email" checked={!!local.emailSecurityAlertEnabled} onChange={set('emailSecurityAlertEnabled')} />
        <ToggleRow label="Proctoring Violation Email" checked={!!local.emailProctoringViolationEnabled} onChange={set('emailProctoringViolationEnabled')} />
        <ToggleRow label="Instructor Invite Email" description="Sent when instructor invites user to an exam" checked={!!local.emailInstructorInviteEnabled} onChange={set('emailInstructorInviteEnabled')} />
        <ToggleRow label="Plan Upgrade Email" description="Sent when a user upgrades their plan" checked={!!local.emailPlanUpgradeEnabled} onChange={set('emailPlanUpgradeEnabled')} />
        <ToggleRow label="Plan Downgrade Email" description="Sent when admin changes a user's plan" checked={!!local.emailPlanDowngradeEnabled} onChange={set('emailPlanDowngradeEnabled')} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Features</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Enable or disable optional platform features</p>
        <ToggleRow label="Proctoring" description="Webcam + tab-switch detection during exams" checked={!!local.proctoringEnabled} onChange={set('proctoringEnabled')} />
        <ToggleRow label="Certificates" description="Issue PDF certificates on pass" checked={!!local.certificatesEnabled} onChange={set('certificatesEnabled')} />
        <ToggleRow label="Leaderboard" description="Show global rankings" checked={!!local.leaderboardEnabled} onChange={set('leaderboardEnabled')} />
        <ToggleRow label="Study Mode" description="Allow practice / study mode exams" checked={!!local.studyModeEnabled} onChange={set('studyModeEnabled')} />
        <ToggleRow label="Gamification (XP / Levels)" description="XP, levels, streaks, and badges" checked={!!local.gamificationEnabled} onChange={set('gamificationEnabled')} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Exam Limits</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Constraints on exam creation per user</p>
        <NumberRow label="Max Exams Per Day" value={local.maxExamsPerDay} onChange={set('maxExamsPerDay')} min={1} max={100} />
        <NumberRow label="Min Questions Per Exam" value={local.minQuestionsPerExam} onChange={set('minQuestionsPerExam')} min={1} max={50} />
        <NumberRow label="Max Questions Per Exam" value={local.maxQuestionsPerExam} onChange={set('maxQuestionsPerExam')} min={1} max={200} />
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Certificate Design</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Control what appears on issued certificates</p>
        <ToggleRow label="Show QR Code" description="QR code linking to certificate verification page" checked={!!local.certShowQRCode} onChange={set('certShowQRCode')} />
        <ToggleRow label="Show AI Proctored Badge" description="Show badge on certificates from proctored exams" checked={!!local.certShowProctoredBadge} onChange={set('certShowProctoredBadge')} />
        <ToggleRow label="Show Instructor Name" description="Show instructor attribution on invite-based certificates" checked={!!local.certShowInstructorName} onChange={set('certShowInstructorName')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label text-xs">Organization Name</label>
            <input className="input text-sm" value={local.certOrganizationName || ''} onChange={e => setLocal(s => ({ ...s, certOrganizationName: e.target.value }))} placeholder="LikhitAI" />
          </div>
          <div>
            <label className="label text-xs">Footer Text (optional)</label>
            <input className="input text-sm" value={local.certFooterText || ''} onChange={e => setLocal(s => ({ ...s, certFooterText: e.target.value }))} placeholder="Authorized by..." />
          </div>
          <div>
            <label className="label text-xs">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" className="w-10 h-9 rounded border border-[var(--color-border)] cursor-pointer" value={local.certPrimaryColor || '#0366AC'} onChange={e => setLocal(s => ({ ...s, certPrimaryColor: e.target.value }))} />
              <input className="input text-sm flex-1" value={local.certPrimaryColor || '#0366AC'} onChange={e => setLocal(s => ({ ...s, certPrimaryColor: e.target.value }))} placeholder="#0366AC" />
            </div>
          </div>
          <div>
            <label className="label text-xs">Accent Color</label>
            <div className="flex items-center gap-2">
              <input type="color" className="w-10 h-9 rounded border border-[var(--color-border)] cursor-pointer" value={local.certAccentColor || '#E3BE2C'} onChange={e => setLocal(s => ({ ...s, certAccentColor: e.target.value }))} />
              <input className="input text-sm flex-1" value={local.certAccentColor || '#E3BE2C'} onChange={e => setLocal(s => ({ ...s, certAccentColor: e.target.value }))} placeholder="#E3BE2C" />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Pricing Configuration</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Configure Premium plan and enterprise cost inputs. Values are in ₹.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-xs">Premium Plan Price (₹/month)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">₹</span>
              <input
                type="number"
                min={1}
                className="input text-sm flex-1"
                value={Math.round((local.planPricePro || 14900) / 100)}
                onChange={e => setLocal(s => ({ ...s, planPricePro: Math.round(Number(e.target.value) * 100) }))}
                placeholder="149"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Enterprise Cost / Teacher (₹)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">₹</span>
              <input
                type="number"
                min={0}
                className="input text-sm flex-1"
                value={Math.round((local.enterpriseCostPerTeacher || 2000) / 100)}
                onChange={e => setLocal(s => ({ ...s, enterpriseCostPerTeacher: Math.round(Number(e.target.value) * 100) }))}
                placeholder="20"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Enterprise Cost / Exam (₹)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">₹</span>
              <input
                type="number"
                min={0}
                className="input text-sm flex-1"
                value={Math.round((local.enterpriseCostPerExam || 300) / 100)}
                onChange={e => setLocal(s => ({ ...s, enterpriseCostPerExam: Math.round(Number(e.target.value) * 100) }))}
                placeholder="3"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Enterprise Cost / Question (₹)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">₹</span>
              <input
                type="number"
                min={0}
                className="input text-sm flex-1"
                value={Math.round((local.enterpriseCostPerQuestion || 20) / 100)}
                onChange={e => setLocal(s => ({ ...s, enterpriseCostPerQuestion: Math.round(Number(e.target.value) * 100) }))}
                placeholder="0.2"
              />
            </div>
          </div>
          <div>
            <label className="label text-xs">Enterprise AI Proctoring Cost (₹)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">₹</span>
              <input
                type="number"
                min={0}
                className="input text-sm flex-1"
                value={Math.round((local.enterpriseCostAiProctoring || 5000) / 100)}
                onChange={e => setLocal(s => ({ ...s, enterpriseCostAiProctoring: Math.round(Number(e.target.value) * 100) }))}
                placeholder="50"
              />
            </div>
          </div>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary px-8 py-2.5">
        {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span> : 'Save Settings'}
      </button>
    </div>
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [subTab, setSubTab] = useState('transactions');
  const [txnPage, setTxnPage] = useState(1);
  const [subPage, setSubPage] = useState(1);
  const [subStatus, setSubStatus] = useState('');
  const [changingPlan, setChangingPlan] = useState(null); // { userId, currentPlan }
  const [newPlan, setNewPlan] = useState('free');
  const qc = useQueryClient();

  const { data: txnData, isLoading: txnLoad } = useQuery({
    queryKey: ['adminTxn', txnPage],
    queryFn: () => adminApi.transactions(txnPage).then(r => r.data),
  });
  const { data: subData, isLoading: subLoad } = useQuery({
    queryKey: ['adminSubs', subStatus, subPage],
    queryFn: () => adminApi.subscriptions(subStatus, subPage).then(r => r.data),
  });

  const planMut = useMutation({
    mutationFn: ({ id, plan }) => adminApi.updatePlan(id, { plan }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminSubs'] }); qc.invalidateQueries({ queryKey: ['adminUsers'] }); toast.success('Plan updated'); setChangingPlan(null); },
    onError: () => toast.error('Failed to update plan'),
  });

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtAmount = (paise) => `₹${(paise / 100).toFixed(0)}`;

  const txns = txnData?.transactions || [];
  const subs = subData?.subscriptions || [];

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {[{ id: 'transactions', label: 'Transactions' }, { id: 'subscriptions', label: 'Subscriptions' }].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} className={`text-sm px-4 py-1.5 rounded-full font-medium transition-all ${subTab === t.id ? 'bg-[var(--color-primary)] text-white' : 'btn-secondary'}`}>{t.label}</button>
        ))}
      </div>

      {subTab === 'transactions' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Payment ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {txnLoad ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Loading...</td></tr>
              ) : txns.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-muted)]">No transactions yet.</td></tr>
              ) : txns.map(txn => (
                <tr key={txn._id} className="hover:bg-[var(--color-bg-alt)]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-text)]">{txn.user?.name || '—'}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{txn.user?.email}</p>
                  </td>
                  <td className="px-4 py-3"><span className="badge capitalize bg-blue-100 text-blue-700">{txn.plan}</span></td>
                  <td className="px-4 py-3 font-semibold text-green-600">{fmtAmount(txn.amount)}</td>
                  <td className="px-4 py-3"><span className={`badge capitalize ${txn.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{txn.status}</span></td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs">{fmtDate(txn.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]" title={txn.razorpayOrderId}>
                      {txn.razorpayOrderId ? txn.razorpayOrderId.slice(-12) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]" title={txn.razorpayPaymentId}>
                      {txn.razorpayPaymentId ? txn.razorpayPaymentId.slice(-12) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(txnData?.pages || 1) > 1 && (
            <div className="flex justify-center gap-2 p-3 border-t border-[var(--color-border)]">
              <button onClick={() => setTxnPage(p => Math.max(1, p - 1))} disabled={txnPage === 1} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Prev</button>
              <span className="text-xs self-center text-[var(--color-text-muted)]">{txnPage} / {txnData?.pages}</span>
              <button onClick={() => setTxnPage(p => p + 1)} disabled={txnPage >= (txnData?.pages || 1)} className="btn-secondary text-xs py-1 px-3 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {subTab === 'subscriptions' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {[{ v: '', l: 'All' }, { v: 'active', l: 'Active' }, { v: 'expired', l: 'Expired' }, { v: 'cancelled', l: 'Cancelled' }].map(s => (
              <button key={s.v} onClick={() => { setSubStatus(s.v); setSubPage(1); }} className={`text-xs px-3 py-1 rounded-full transition-all ${subStatus === s.v ? 'bg-[var(--color-primary)] text-white' : 'btn-secondary py-1 px-3'}`}>{s.l}</button>
            ))}
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Start</th>
                  <th className="px-4 py-3 text-left">End</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {subLoad ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">Loading...</td></tr>
                ) : subs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-muted)]">No subscriptions found.</td></tr>
                ) : subs.map(sub => (
                  <tr key={sub._id} className="hover:bg-[var(--color-bg-alt)]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text)]">{sub.user?.name || '—'}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{sub.user?.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className="badge capitalize bg-blue-100 text-blue-700">{sub.plan}</span></td>
                    <td className="px-4 py-3"><span className={`badge capitalize ${sub.status === 'active' ? 'bg-green-100 text-green-700' : sub.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{sub.status}</span></td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{sub.startDate ? fmtDate(sub.startDate) : '—'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{sub.endDate ? fmtDate(sub.endDate) : '—'}</td>
                    <td className="px-4 py-3">
                      {changingPlan?.userId === sub.user?._id ? (
                        <div className="flex items-center gap-1.5">
                          <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className="input text-xs py-1 px-2 h-7">
                            <option value="free">Free</option>
                            <option value="pro">Premium</option>
                          </select>
                          <button onClick={() => planMut.mutate({ id: sub.user._id, plan: newPlan })} disabled={planMut.isPending} className="btn-primary text-xs py-1 px-2">Save</button>
                          <button onClick={() => setChangingPlan(null)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setChangingPlan({ userId: sub.user?._id }); setNewPlan(sub.user?.plan || 'free'); }} className="btn-secondary text-xs py-1 px-2">Change Plan</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan Management ───────────────────────────────────────────────────────────
const PLAN_COLORS = {
  free:       'bg-slate-100 text-slate-700',
  pro:        'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};
const STATUS_COLORS = {
  free:    'bg-slate-100 text-slate-600',
  active:  'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
};

function PlansTab() {
  const [editingId, setEditingId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const emptyForm = {
    code: '',
    name: '',
    sortOrder: 100,
    description: '',
    pricing: { monthlyPricePaise: 999, quarterlyPricePaise: '', halfYearlyPricePaise: '', yearlyPricePaise: '' },
    limits: { examsPerMonth: 20, questionsPerExam: 50, studentsAllowed: 0, resourceUploadLimit: 20, storageLimitGb: 5 },
    billing: { autoPayAllowed: true, manualPaymentAllowed: true, trialDays: 0, gracePeriodDays: 7 },
    isRecommended: false,
    isActive: true,
  };
  const [form, setForm] = useState(emptyForm);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminPlansCatalog'],
    queryFn: () => adminApi.plans().then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (payload) => adminApi.createPlan(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminPlansCatalog'] });
      toast.success('Plan created');
      setShowCreate(false);
      setForm(emptyForm);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create plan'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => adminApi.updatePlanDef(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminPlansCatalog'] });
      toast.success('Plan updated');
      setEditingId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update plan'),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => adminApi.deletePlanDef(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminPlansCatalog'] });
      toast.success('Plan deleted');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete plan'),
  });

  const plans = data?.plans || [];
  const toPaise = (v) => (v === '' || v == null ? null : Math.max(0, Math.round(Number(v) * 100)));
  const savePayload = {
    ...form,
    pricing: {
      monthlyPricePaise: toPaise(form.pricing.monthlyPricePaise) || 99900,
      quarterlyPricePaise: toPaise(form.pricing.quarterlyPricePaise),
      halfYearlyPricePaise: toPaise(form.pricing.halfYearlyPricePaise),
      yearlyPricePaise: toPaise(form.pricing.yearlyPricePaise),
    },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          Individual/institute plans are fully configurable here. Enterprise plans are managed separately.
        </p>
        <button className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2" onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
          <Plus size={14} /> Create Plan
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Monthly</th>
              <th className="px-4 py-3 text-left">Limits</th>
              <th className="px-4 py-3 text-left">Billing</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--color-text-muted)]">Loading...</td></tr>
            ) : plans.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-[var(--color-text-muted)]">No plans yet. Create your first plan.</td></tr>
            ) : plans.map((p) => (
              <tr key={p._id} className="hover:bg-[var(--color-bg-alt)] transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{p.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{p.code}</p>
                    <div className="mt-1 flex gap-1.5">
                      {p.isRecommended ? <span className="badge text-xs bg-amber-100 text-amber-700">Recommended</span> : null}
                      <span className={`badge text-xs ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  ₹{((p.pricing?.monthlyPricePaise || 0) / 100).toFixed(0)}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  {p.limits?.examsPerMonth ?? 0} exams/mo · {p.limits?.questionsPerExam ?? 0} q/exam
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  AutoPay: {p.billing?.autoPayAllowed ? 'Yes' : 'No'} · Manual: {p.billing?.manualPaymentAllowed ? 'Yes' : 'No'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                <button
                      onClick={() => {
                        setEditingId(p._id);
                        setForm({
                          ...emptyForm,
                          ...p,
                          pricing: {
                            monthlyPricePaise: Number(p?.pricing?.monthlyPricePaise || 0) / 100,
                            quarterlyPricePaise: p?.pricing?.quarterlyPricePaise ? Number(p.pricing.quarterlyPricePaise) / 100 : '',
                            halfYearlyPricePaise: p?.pricing?.halfYearlyPricePaise ? Number(p.pricing.halfYearlyPricePaise) / 100 : '',
                            yearlyPricePaise: p?.pricing?.yearlyPricePaise ? Number(p.pricing.yearlyPricePaise) / 100 : '',
                          },
                        });
                        setShowCreate(true);
                      }}
                      className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1"
                    ><Edit3 size={12} /> Edit</button>
                    <button
                      onClick={() => deleteMut.mutate(p._id)}
                      className="btn-secondary text-xs py-1 px-2 inline-flex items-center gap-1 text-red-600"
                    ><Trash2 size={12} /> Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(showCreate || editingId) && (
        <Modal
          onClose={() => { setShowCreate(false); setEditingId(null); }}
        >
          <div className="w-[min(1100px,94vw)] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">{editingId ? 'Edit Plan' : 'Create Plan'}</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Configure individual/institute plan template details.</p>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-[var(--color-surface)]">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 p-4">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Basic Information</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Plan Code</label>
                  <input className="input mt-1 w-full" placeholder="silver" value={form.code || ''} onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))} disabled={!!editingId} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Plan Name</label>
                  <input className="input mt-1 w-full" placeholder="Silver" value={form.name || ''} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Plan Order (Tier)</label>
                  <input className="input mt-1 w-full" type="number" value={form.sortOrder ?? 100} onChange={(e) => setForm((s) => ({ ...s, sortOrder: Number(e.target.value) }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-[var(--color-text-muted)]">Description</label>
                  <input className="input mt-1 w-full" placeholder="Short plan description" value={form.description || ''} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 p-4">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Pricing</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Monthly Price (INR)</label><input className="input mt-1 w-full" type="number" min="1" step="0.01" value={form.pricing?.monthlyPricePaise ?? ''} onChange={(e) => setForm((s) => ({ ...s, pricing: { ...s.pricing, monthlyPricePaise: e.target.value } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Quarterly Price (optional, INR)</label><input className="input mt-1 w-full" type="number" min="1" step="0.01" value={form.pricing?.quarterlyPricePaise ?? ''} onChange={(e) => setForm((s) => ({ ...s, pricing: { ...s.pricing, quarterlyPricePaise: e.target.value } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Half-Yearly Price (optional, INR)</label><input className="input mt-1 w-full" type="number" min="1" step="0.01" value={form.pricing?.halfYearlyPricePaise ?? ''} onChange={(e) => setForm((s) => ({ ...s, pricing: { ...s.pricing, halfYearlyPricePaise: e.target.value } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Yearly Price (optional, INR)</label><input className="input mt-1 w-full" type="number" min="1" step="0.01" value={form.pricing?.yearlyPricePaise ?? ''} onChange={(e) => setForm((s) => ({ ...s, pricing: { ...s.pricing, yearlyPricePaise: e.target.value } }))} /></div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 p-4">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Limits</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Exams Per Month</label><input className="input mt-1 w-full" type="number" value={form.limits?.examsPerMonth ?? 0} onChange={(e) => setForm((s) => ({ ...s, limits: { ...s.limits, examsPerMonth: Number(e.target.value) } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Questions Per Exam</label><input className="input mt-1 w-full" type="number" value={form.limits?.questionsPerExam ?? 0} onChange={(e) => setForm((s) => ({ ...s, limits: { ...s.limits, questionsPerExam: Number(e.target.value) } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Students Allowed</label><input className="input mt-1 w-full" type="number" value={form.limits?.studentsAllowed ?? 0} onChange={(e) => setForm((s) => ({ ...s, limits: { ...s.limits, studentsAllowed: Number(e.target.value) } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Resource Upload Limit</label><input className="input mt-1 w-full" type="number" value={form.limits?.resourceUploadLimit ?? 0} onChange={(e) => setForm((s) => ({ ...s, limits: { ...s.limits, resourceUploadLimit: Number(e.target.value) } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Storage Limit (GB)</label><input className="input mt-1 w-full" type="number" value={form.limits?.storageLimitGb ?? 0} onChange={(e) => setForm((s) => ({ ...s, limits: { ...s.limits, storageLimitGb: Number(e.target.value) } }))} /></div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 p-4">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Billing Settings</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.billing?.autoPayAllowed} onChange={(e) => setForm((s) => ({ ...s, billing: { ...s.billing, autoPayAllowed: e.target.checked } }))} /> AutoPay Allowed</label>
                <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.billing?.manualPaymentAllowed} onChange={(e) => setForm((s) => ({ ...s, billing: { ...s.billing, manualPaymentAllowed: e.target.checked } }))} /> Manual Payment Allowed</label>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Trial Days</label><input className="input mt-1 w-full" type="number" value={form.billing?.trialDays ?? 0} onChange={(e) => setForm((s) => ({ ...s, billing: { ...s.billing, trialDays: Number(e.target.value) } }))} /></div>
                <div><label className="text-xs font-medium text-[var(--color-text-muted)]">Grace Period Days</label><input className="input mt-1 w-full" type="number" value={form.billing?.gracePeriodDays ?? 7} onChange={(e) => setForm((s) => ({ ...s, billing: { ...s.billing, gracePeriodDays: Number(e.target.value) } }))} /></div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 p-4">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Feature Access</h4>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {[
                  ['aiQuestionGeneration', 'AI Question Generation'],
                  ['aiRegeneration', 'AI Regeneration'],
                  ['aiFlashcards', 'AI Flashcards'],
                  ['aiExplanations', 'AI Explanations'],
                  ['mcqExams', 'MCQ Exams'],
                  ['descriptiveExams', 'Descriptive Exams'],
                  ['mixedExams', 'Mixed Exams'],
                  ['codingExams', 'Coding Exams'],
                  ['listeningExams', 'Listening Exams'],
                  ['certificates', 'Certificates'],
                  ['answerReview', 'Answer Review'],
                  ['flashcards', 'Flashcards'],
                  ['reattempts', 'Reattempts'],
                  ['resultVisibility', 'Result Visibility'],
                  ['aiProctoring', 'AI Proctoring'],
                  ['screenshotMonitoring', 'Screenshot Monitoring'],
                  ['resourceUpload', 'Resource Upload'],
                  ['aiResourceProcessing', 'AI Resource Processing'],
                  ['adminResourcesAccess', 'Admin Resources Access'],
                ].map(([key, label]) => (
                  <label key={key} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.features?.[key] !== false}
                      onChange={(e) => setForm((s) => ({ ...s, features: { ...(s.features || {}), [key]: e.target.checked } }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30 p-4">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-3">Status</h4>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!form.isRecommended} onChange={(e) => setForm((s) => ({ ...s, isRecommended: e.target.checked }))} /> Recommended Plan</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} /> Active</label>
              </div>
            </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]/40 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => { setShowCreate(false); setEditingId(null); }}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => (editingId ? updateMut.mutate({ id: editingId, payload: savePayload }) : createMut.mutate(savePayload))}
                disabled={createMut.isPending || updateMut.isPending}
              >
                {createMut.isPending || updateMut.isPending ? 'Saving…' : 'Save Plan'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Feedback ─────────────────────────────────────────────────────────────────
function FeedbackTab() {
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminFeedback'],
    queryFn: () => feedbackApi.getAdmin().then(r => r.data),
  });

  const replyMut = useMutation({
    mutationFn: ({ id, reply }) => feedbackApi.reply(id, reply),
    onSuccess: () => {
      toast.success('Reply saved');
      qc.invalidateQueries({ queryKey: ['adminFeedback'] });
      setReplyingId(null);
      setReplyText('');
    },
    onError: () => toast.error('Failed to save reply'),
  });

  if (isLoading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="skeleton h-52 rounded-xl" />
        <div className="skeleton h-52 rounded-xl" />
      </div>
    </div>
  );

  const { feedback = [], stats = { avg: '0.0', total: 0, distribution: [0,0,0,0,0], categoryAvg: {}, trend: [], repliedCount: 0 } } = data || {};
  const { avg, total, distribution, categoryAvg = {}, trend = [], repliedCount = 0 } = stats;
  const replyRate = total > 0 ? Math.round((repliedCount / total) * 100) : 0;

  // ── Chart: Distribution doughnut ─────────────────────────────────────────
  const distChart = {
    labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
    datasets: [{
      data: distribution,
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
      borderWidth: 0,
      hoverOffset: 4,
    }],
  };
  const distOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed} responses` } } },
    cutout: '65%',
  };

  // ── Chart: Category averages horizontal bar ───────────────────────────────
  const catLabels = ['UI & Design', 'Performance', 'Features'];
  const catValues = [categoryAvg.ui || 0, categoryAvg.performance || 0, categoryAvg.features || 0];
  const catChart = {
    labels: catLabels,
    datasets: [{
      data: catValues,
      backgroundColor: ['rgba(99,102,241,0.75)', 'rgba(59,130,246,0.75)', 'rgba(16,185,129,0.75)'],
      borderRadius: 6,
      borderSkipped: false,
    }],
  };
  const catOpts = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(1)} / 5` } } },
    scales: {
      x: { min: 0, max: 5, ticks: { font: { size: 10 }, callback: v => `${v}★` }, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };

  // ── Chart: 30-day submission trend ───────────────────────────────────────
  const trendLabels = trend.map(t => { const d = new Date(t.date); return `${d.getDate()}/${d.getMonth()+1}`; });
  const trendChart = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Submissions',
        data: trend.map(t => t.count),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#3b82f6',
        yAxisID: 'y',
      },
      {
        label: 'Avg Rating',
        data: trend.map(t => t.avgRating),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        tension: 0.4, pointRadius: 3, pointBackgroundColor: '#f59e0b',
        borderDash: [4, 2],
        yAxisID: 'y2',
      },
    ],
  };
  const trendOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { position: 'left', ticks: { font: { size: 10 }, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' }, title: { display: true, text: 'Count', font: { size: 10 } } },
      y2: { position: 'right', min: 0, max: 5, ticks: { font: { size: 10 }, callback: v => `${v}★` }, grid: { display: false }, title: { display: true, text: 'Rating', font: { size: 10 } } },
    },
  };

  return (
    <div className="space-y-5">
      {/* ── Row 1: Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card flex items-center gap-3 p-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl shrink-0">
            <Star size={18} className="text-amber-500" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-[var(--color-text)]">{avg} <span className="text-sm font-normal text-[var(--color-text-muted)]">/ 5</span></div>
            <div className="text-xs text-[var(--color-text-muted)]">Avg Rating</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl shrink-0">
            <MessageSquare size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-[var(--color-text)]">{total}</div>
            <div className="text-xs text-[var(--color-text-muted)]">Total Responses</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-xl shrink-0">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-[var(--color-text)]">{repliedCount}</div>
            <div className="text-xs text-[var(--color-text-muted)]">Replied · {replyRate}%</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2.5 rounded-xl shrink-0">
            <BarChart2 size={18} className="text-purple-600" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-[var(--color-text)]">{categoryAvg.count || 0}</div>
            <div className="text-xs text-[var(--color-text-muted)]">Multi-rated</div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Distribution + Category breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribution doughnut */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">Rating Distribution</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Overall star breakdown across all submissions</p>
          {total > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ height: 160, width: 160, flexShrink: 0 }}>
                <Doughnut data={distChart} options={distOpts} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                {['5 ★', '4 ★', '3 ★', '2 ★', '1 ★'].map((l, ri) => {
                  const idx = 4 - ri;
                  const pct = total > 0 ? Math.round((distribution[idx] / total) * 100) : 0;
                  const colors = ['bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-400'];
                  return (
                    <div key={l} className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--color-text-muted)] w-5 shrink-0">{l}</span>
                      <div className="flex-1 bg-[var(--color-bg-alt)] rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${colors[idx]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] w-6 text-right shrink-0">{distribution[idx]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-[var(--color-text-muted)] text-sm">No data yet</div>
          )}
        </div>

        {/* Category bar chart */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">Category Averages</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Average rating per feedback category (out of 5)</p>
          {categoryAvg.count > 0 ? (
            <div style={{ height: 160 }}>
              <Bar data={catChart} options={catOpts} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <p className="text-sm text-[var(--color-text-muted)]">No category data yet</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Category data is collected from new multi-rated feedback</p>
              </div>
            </div>
          )}
          {categoryAvg.count > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'UI & Design', val: categoryAvg.ui, color: 'text-indigo-600' },
                { label: 'Performance', val: categoryAvg.performance, color: 'text-blue-600' },
                { label: 'Features', val: categoryAvg.features, color: 'text-emerald-600' },
              ].map(c => (
                <div key={c.label} className="text-center p-2 bg-[var(--color-bg-alt)] rounded-lg">
                  <p className={`text-base font-extrabold ${c.color}`}>{c.val ?? '—'}</p>
                  <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: 30-day trend ── */}
      {trend.length > 1 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">Submission Trend — Last 30 Days</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Daily submissions count + average rating</p>
          <div style={{ height: 160 }}>
            <Line data={trendChart} options={trendOpts} />
          </div>
        </div>
      )}

      {/* ── Row 4: Feedback list ── */}
      <div>
        <h3 className="text-sm font-bold text-[var(--color-text)] mb-3">All Feedback ({total})</h3>
        {feedback.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)] text-sm card">No feedback yet.</div>
        ) : (
          <div className="space-y-3">
            {feedback.map((fb) => (
              <div key={fb._id} className="card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)] shrink-0">
                      {fb.user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{fb.user?.name || 'Anonymous'}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{fb.user?.email} · {new Date(fb.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {/* Overall stars */}
                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={12} className={s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--color-border)]'} />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-amber-500">{fb.rating}</span>
                  </div>
                </div>

                {/* Category breakdown if present */}
                {fb.ratings && (fb.ratings.ui || fb.ratings.performance || fb.ratings.features) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[
                      { label: 'UI', val: fb.ratings.ui, color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
                      { label: 'Perf', val: fb.ratings.performance, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
                      { label: 'Features', val: fb.ratings.features, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
                    ].filter(c => c.val).map(c => (
                      <span key={c.label} className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.color}`}>
                        {c.label} <Star size={9} className="fill-current" /> {c.val}
                      </span>
                    ))}
                  </div>
                )}

                {fb.message && (
                  <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] rounded-lg px-3 py-2 mb-3 italic border-l-2 border-[var(--color-primary)]/20">
                    "{fb.message}"
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full capitalize">
                    {fb.trigger?.replace('_', ' ')}
                  </span>
                  {fb.adminReply && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle size={10} /> Replied
                    </span>
                  )}
                  <button
                    onClick={() => { setReplyingId(fb._id); setReplyText(fb.adminReply || ''); }}
                    className="text-xs text-[var(--color-primary)] hover:underline ml-auto flex items-center gap-1"
                  >
                    <Reply size={11} /> {fb.adminReply ? 'Edit reply' : 'Reply'}
                  </button>
                </div>

                {fb.adminReply && replyingId !== fb._id && (
                  <div className="mt-2 pl-3 border-l-2 border-[var(--color-primary)]/30 text-xs text-[var(--color-text-muted)]">
                    <span className="font-semibold text-[var(--color-primary)]">Admin: </span>{fb.adminReply}
                  </div>
                )}

                {replyingId === fb._id && (
                  <div className="mt-3 space-y-2">
                    <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} maxLength={500} placeholder="Write a reply…" className="input text-xs resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => setReplyingId(null)} className="text-xs text-[var(--color-text-muted)] hover:underline">Cancel</button>
                      <button onClick={() => replyMut.mutate({ id: fb._id, reply: replyText })} disabled={replyMut.isPending || !replyText.trim()} className="btn-primary text-xs py-1.5 px-3">
                        {replyMut.isPending ? 'Saving…' : 'Save Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function ContactsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminContacts', page, statusFilter, search],
    queryFn: () => contactApi.getAll({ page, status: statusFilter, search }).then(r => r.data),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => contactApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminContacts'] }); toast.success('Status updated'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const replyMut = useMutation({
    mutationFn: ({ id, reply }) => contactApi.reply(id, reply),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminContacts'] });
      toast.success('Reply sent to user');
      setReplyingId(null);
      setReplyText('');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to send reply'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => contactApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminContacts'] }); toast.success('Deleted'); },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const contacts = data?.contacts || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1.5 flex-wrap">
          {[{ v: '', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'in_progress', l: 'In Progress' }, { v: 'resolved', l: 'Resolved' }].map(s => (
            <button key={s.v} onClick={() => { setStatusFilter(s.v); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${statusFilter === s.v ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>
              {s.l}
            </button>
          ))}
        </div>
        <form className="flex gap-2 ml-auto" onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }}>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search name / email…" className="input pl-7 text-xs py-1.5 w-52" />
          </div>
          <button type="submit" className="btn-secondary text-xs py-1.5 px-3">Search</button>
        </form>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">{total} {total === 1 ? 'query' : 'queries'} total</p>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : contacts.length === 0 ? (
        <div className="card text-center py-12 text-[var(--color-text-muted)]">
          <Inbox size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No contact queries found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(c => (
            <div key={c._id} className="card">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 text-sm font-bold text-blue-600">
                  {c.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--color-text)] text-sm">{c.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{c.email}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ml-auto ${STATUS_BADGE[c.status] || STATUS_BADGE.pending}`}>
                      {c.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full capitalize">{c.type}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Message */}
              <p className="text-sm text-[var(--color-text)] bg-[var(--color-bg-alt)] rounded-lg px-3 py-2.5 mb-3 leading-relaxed">
                {c.message}
              </p>

              {/* Admin reply preview */}
              {c.adminReply && replyingId !== c._id && (
                <div className="mb-3 pl-3 border-l-2 border-[var(--color-primary)]/40 text-xs text-[var(--color-text-muted)]">
                  <span className="font-semibold text-[var(--color-primary)]">Admin replied: </span>{c.adminReply}
                </div>
              )}

              {/* Reply form */}
              {replyingId === c._id && (
                <div className="mb-3 space-y-2">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} maxLength={1000}
                    placeholder="Type your reply…" className="input text-xs resize-none" />
                  <div className="flex gap-2">
                    <button onClick={() => { setReplyingId(null); setReplyText(''); }} className="text-xs text-[var(--color-text-muted)] hover:underline">Cancel</button>
                    <button onClick={() => replyMut.mutate({ id: c._id, reply: replyText })}
                      disabled={replyMut.isPending || !replyText.trim()}
                      className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5">
                      {replyMut.isPending ? <><RefreshCw size={11} className="animate-spin" /> Sending…</> : <><Reply size={11} /> Send Reply</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--color-border)]">
                {/* Status dropdown */}
                <select
                  value={c.status}
                  onChange={e => statusMut.mutate({ id: c._id, status: e.target.value })}
                  className="input text-xs py-1 pr-7 w-auto"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button onClick={() => { setReplyingId(c._id); setReplyText(c.adminReply || ''); }}
                  className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline font-medium">
                  <Reply size={12} /> {c.adminReply ? 'Edit reply' : 'Reply'}
                </button>
                <button onClick={() => { if (confirm('Delete this query?')) deleteMut.mutate(c._id); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline ml-auto">
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
            <ChevronLeft size={13} /> Prev
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= pages} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40">
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────

const TYPE_OPTS = [
  { value: 'info',    label: 'Info',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'warning', label: 'Warning', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'success', label: 'Success', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'error',   label: 'Error',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
];

const AUD_OPTS = [
  { value: 'all',        label: 'All Users' },
  { value: 'free',       label: 'Free Plan Only' },
  { value: 'pro',        label: 'Pro Plan Only' },
  { value: 'enterprise', label: 'Enterprise Only' },
];

const EMPTY_FORM = { title: '', message: '', type: 'info', targetAudience: 'all', isActive: true, expiresAt: '' };

function AnnouncementFormModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const qc = useQueryClient();
  const isEdit = !!initial?._id;

  const mut = useMutation({
    mutationFn: (data) => isEdit
      ? announcementApi.adminUpdate(initial._id, data)
      : announcementApi.adminCreate(data),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Announcement updated!' : 'Announcement created!');
      qc.invalidateQueries({ queryKey: ['adminAnnouncements'] });
      onSaved?.(res.data.announcement);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const f = (k) => (e) => setForm(s => ({ ...s, [k]: e.target ? e.target.value : e }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message are required');
    mut.mutate({ ...form, expiresAt: form.expiresAt || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
            <Megaphone size={15} className="text-[var(--color-primary)]" />
            {isEdit ? 'Edit Announcement' : 'New Announcement'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)]">
            <X size={16} className="text-[var(--color-text-muted)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input value={form.title} onChange={f('title')} className="input" placeholder="e.g. System Maintenance Tonight" maxLength={120} />
          </div>

          {/* Message */}
          <div>
            <label className="label">Message *</label>
            <textarea
              value={form.message}
              onChange={f('message')}
              className="input resize-none"
              rows={3}
              placeholder="Enter the announcement details..."
              maxLength={1000}
            />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 text-right">{form.message.length}/1000</p>
          </div>

          {/* Type + Audience row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select value={form.type} onChange={f('type')} className="input">
                {TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select value={form.targetAudience} onChange={f('targetAudience')} className="input">
                {AUD_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Expiry + Active row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Expires At (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={f('expiresAt')}
                className="input"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className={`relative w-9 h-5 rounded-full transition-colors ${form.isActive ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
                  onClick={() => setForm(s => ({ ...s, isActive: !s.isActive }))}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium text-[var(--color-text)]">Active</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 text-sm py-2.5">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="btn-primary flex-1 text-sm py-2.5">
              {mut.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminAnnouncements'],
    queryFn: () => announcementApi.adminGetAll().then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => announcementApi.adminDelete(id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['adminAnnouncements'] });
    },
    onError: () => toast.error('Delete failed'),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => announcementApi.adminToggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminAnnouncements'] }),
    onError: () => toast.error('Toggle failed'),
  });

  const announcements = data?.announcements || [];
  const active   = announcements.filter(a => a.isActive && (!a.expiresAt || new Date(a.expiresAt) > new Date()));
  const inactive = announcements.filter(a => !a.isActive || (a.expiresAt && new Date(a.expiresAt) <= new Date()));

  const typeOpt = (t) => TYPE_OPTS.find(o => o.value === t) || TYPE_OPTS[0];

  const renderCard = (a) => {
    const expired = a.expiresAt && new Date(a.expiresAt) <= new Date();
    const t = typeOpt(a.type);
    return (
      <div key={a._id} className={`card p-4 flex flex-col gap-3 transition-all ${!a.isActive || expired ? 'opacity-60' : ''}`}>
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
              <span className="text-[10px] font-medium bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full capitalize">
                {a.targetAudience === 'all' ? 'All Users' : `${a.targetAudience} plan`}
              </span>
              {expired && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 px-2 py-0.5 rounded-full">Expired</span>}
              {!a.isActive && !expired && <span className="text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 px-2 py-0.5 rounded-full">Disabled</span>}
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{a.title}</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{a.message}</p>
          </div>
          {/* Toggle */}
          <button
            onClick={() => toggleMut.mutate(a._id)}
            className="shrink-0 transition-colors"
            title={a.isActive ? 'Disable' : 'Enable'}
          >
            {a.isActive
              ? <ToggleRight size={22} className="text-[var(--color-primary)]" />
              : <ToggleLeft size={22} className="text-[var(--color-text-muted)]" />}
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)] flex-wrap">
          <span className="flex items-center gap-1"><Clock size={9} /> {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {a.expiresAt && <span className="flex items-center gap-1"><Bell size={9} /> Expires {new Date(a.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          {a.stats && (
            <>
              <span className="flex items-center gap-1"><CheckCircle size={9} className="text-green-500" /> {a.stats.readCount} read</span>
              <span className="flex items-center gap-1"><X size={9} className="text-slate-400" /> {a.stats.dismissCount} dismissed</span>
            </>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 pt-0.5 border-t border-[var(--color-border)]">
          <button
            onClick={() => { setEditItem(a); setShowForm(true); }}
            className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline"
          >
            <Edit3 size={11} /> Edit
          </button>
          <button
            onClick={() => { if (window.confirm('Delete this announcement?')) deleteMut.mutate(a._id); }}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:underline ml-auto"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 via-purple-50/60 to-indigo-50/40 dark:from-violet-900/20 dark:via-purple-900/10 dark:to-indigo-900/5 border border-violet-100 dark:border-violet-900/30 px-6 py-5">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-200/30 dark:bg-violet-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Megaphone size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[var(--color-text)] leading-tight">Announcements</h2>
              <p className="text-xs text-[var(--color-text-muted)]">Manage platform-wide announcements and notifications.</p>
            </div>
          </div>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="btn-primary flex items-center gap-1.5 text-sm shrink-0"
          >
            <Plus size={15} /> New Announcement
          </button>
        </div>
      </div> */}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: announcements.length, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
          { label: 'Active', value: active.length, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
          { label: 'Inactive/Expired', value: inactive.length, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
        ].map(s => (
          <div key={s.label} className="card py-3 text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : announcements.length === 0 ? (
        <div className="card text-center py-16">
          <Megaphone size={36} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="font-medium text-[var(--color-text)]">No announcements yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Create your first announcement to notify users.</p>
          <button
            onClick={() => { setEditItem(null); setShowForm(true); }}
            className="btn-primary mt-4 text-sm flex items-center gap-1.5 mx-auto"
          >
            <Plus size={14} /> Create Announcement
          </button>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Active ({active.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.map(renderCard)}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Inactive / Expired ({inactive.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactive.map(renderCard)}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <AnnouncementFormModal
          initial={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

// ── Groups Tab ────────────────────────────────────────────────────────────────
function GroupsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['adminGroups'],
    queryFn: () => groupApi.adminGetAll().then(r => r.data),
  });
  const groups = data?.groups || [];
  const filtered = groups.filter(g =>
    !search || g.name?.toLowerCase().includes(search.toLowerCase()) || g.instructor?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteMut = useMutation({
    mutationFn: (id) => groupApi.adminDelete(id),
    onSuccess: () => {
      toast.success('Group deleted');
      qc.invalidateQueries({ queryKey: ['adminGroups'] });
    },
    onError: () => toast.error('Failed to delete group'),
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text)]">All Groups</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{groups.length} group{groups.length !== 1 ? 's' : ''} total</p>
        </div>
        <input
          type="text"
          placeholder="Search by name or instructor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input text-sm py-2 w-full sm:w-56"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="font-semibold text-[var(--color-text)]">{groups.length === 0 ? 'No groups yet' : 'No results found'}</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{groups.length === 0 ? 'Groups created by instructors will appear here.' : 'Try a different search term.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(g => (
            <div key={g._id} className="card flex items-center gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {g.name?.[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">{g.name}</p>
                  {g.settings?.isPrivate && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">Private</span>}
                </div>
                {g.description && <p className="text-xs text-[var(--color-text-muted)] truncate">{g.description}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    Instructor: <span className="font-medium text-[var(--color-text)]">{g.instructor?.name || '—'}</span>
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{g.memberCount} member{g.memberCount !== 1 ? 's' : ''}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">{g.msgCount} message{g.msgCount !== 1 ? 's' : ''}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Created {new Date(g.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => { if (window.confirm(`Delete group "${g.name}" and all its messages?`)) deleteMut.mutate(g._id); }}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-muted)] hover:text-red-500 transition-colors shrink-0"
                title="Delete group"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Resources Tab ────────────────────────────────────────────────────────────
function ResourcesTab() {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '', board: 'CBSE', classLevel: '', subject: '',
  });
  const [filters, setFilters] = useState({ board: '', classLevel: '', subject: '' });
  const [editResource, setEditResource] = useState(null);
  const [uploading, setUploading] = useState(false);

  const listParams = {
    ...(filters.board ? { board: filters.board } : {}),
    ...(filters.classLevel ? { classLevel: filters.classLevel } : {}),
    ...(filters.subject ? { subject: filters.subject } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['adminResources', listParams],
    queryFn: () => resourceApi.adminList(listParams).then((r) => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => resourceApi.adminDelete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['adminResources'] }); toast.success('Resource deleted'); },
    onError: () => toast.error('Failed to delete resource'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => resourceApi.adminUpdate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminResources'] });
      qc.invalidateQueries({ queryKey: ['curriculumMappings'] });
      toast.success('Resource updated');
      setEditResource(null);
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Update failed'),
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    const { title, board, classLevel, subject } = uploadForm;
    if (!file || !title.trim() || !board || !classLevel || !subject.trim()) {
      return toast.error('Resource name, board, class, subject, and file are required');
    }
    setUploading(true);
    try {
      await resourceApi.adminUpload(file, {
        title: title.trim(),
        board,
        classLevel,
        subject: subject.trim(),
      });
      qc.invalidateQueries({ queryKey: ['adminResources'] });
      qc.invalidateQueries({ queryKey: ['curriculumMappings'] });
      toast.success('Resource uploaded');
      setFile(null);
      setUploadForm({ title: '', board: 'CBSE', classLevel: '', subject: '' });
      e.target.reset();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resources = data?.resources || [];

  return (
    <div className="space-y-6 pt-6">
      <div className="card p-6">
        <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
          <Upload size={16} /> Upload curriculum resource
        </h3>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Resource name</label>
              <input
                className="input"
                placeholder="e.g. Class 10 Science — Term 1"
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Board</label>
              <select className="input" value={uploadForm.board} onChange={(e) => setUploadForm((f) => ({ ...f, board: e.target.value }))}>
                {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class</label>
              <select className="input" value={uploadForm.classLevel} onChange={(e) => setUploadForm((f) => ({ ...f, classLevel: e.target.value }))}>
                <option value="">Select class</option>
                {CLASS_LEVELS.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Subject</label>
              <input
                className="input"
                placeholder="e.g. Science, Mathematics"
                value={uploadForm.subject}
                onChange={(e) => setUploadForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Resource file (DOC, DOCX, PDF, PPTX, TXT — max 20 MB)</label>
            <input
              type="file"
              accept=".doc,.docx,.pdf,.pptx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
              className="block w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--color-primary)] file:text-white hover:file:opacity-90 cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <button
            type="submit"
            disabled={uploading || !file || !uploadForm.title.trim() || !uploadForm.classLevel || !uploadForm.subject.trim()}
            className="btn-primary flex items-center gap-2"
          >
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : 'Upload resource'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
            <FileText size={16} /> Resources ({resources.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            <select className="input text-sm w-auto" value={filters.board} onChange={(e) => setFilters((f) => ({ ...f, board: e.target.value }))}>
              <option value="">All boards</option>
              {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="input text-sm w-auto" value={filters.classLevel} onChange={(e) => setFilters((f) => ({ ...f, classLevel: e.target.value }))}>
              <option value="">All classes</option>
              {CLASS_LEVELS.map((c) => <option key={c} value={c}>Class {c}</option>)}
            </select>
            <input
              className="input text-sm w-40"
              placeholder="Filter subject"
              value={filters.subject}
              onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-[var(--color-text-muted)]"><RefreshCw size={20} className="animate-spin mx-auto" /></div>
        ) : resources.length === 0 ? (
          <p className="text-center py-8 text-[var(--color-text-muted)] text-sm">No resources match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                  <th className="text-left py-2 pr-4 font-medium">Name</th>
                  <th className="text-left py-2 pr-4 font-medium">Board</th>
                  <th className="text-left py-2 pr-4 font-medium">Class</th>
                  <th className="text-left py-2 pr-4 font-medium">Subject</th>
                  <th className="text-left py-2 pr-4 font-medium">File</th>
                  <th className="text-left py-2 pr-4 font-medium">Uploaded by</th>
                  <th className="text-left py-2 pr-4 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r._id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="py-2 pr-4 font-medium text-[var(--color-text)]">{r.title}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-muted)]">{r.board || '—'}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-muted)]">{r.classLevel ? `Class ${r.classLevel}` : '—'}</td>
                    <td className="py-2 pr-4 text-[var(--color-text)]">{r.subject || '—'}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-muted)] max-w-[120px] truncate">{r.originalName}</td>
                    <td className="py-2 pr-4 text-xs text-[var(--color-text)]">{r.uploadedBy?.name || '—'}</td>
                    <td className="py-2 pr-4 text-[var(--color-text-muted)]">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditResource({
                          id: r._id,
                          title: r.title,
                          board: r.board || 'CBSE',
                          classLevel: r.classLevel || '',
                          subject: r.subject || '',
                        })}
                        className="p-1.5 rounded-lg text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { if (window.confirm(`Delete "${r.title}"?`)) deleteMut.mutate(r._id); }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editResource && (
        <Modal onClose={() => setEditResource(null)}>
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 max-w-md w-full shadow-xl space-y-3">
            <h4 className="font-semibold text-[var(--color-text)]">Edit resource</h4>
            <div>
              <label className="label">Resource name</label>
              <input className="input" value={editResource.title} onChange={(e) => setEditResource((x) => ({ ...x, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Board</label>
                <select className="input" value={editResource.board} onChange={(e) => setEditResource((x) => ({ ...x, board: e.target.value }))}>
                  {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Class</label>
                <select className="input" value={editResource.classLevel} onChange={(e) => setEditResource((x) => ({ ...x, classLevel: e.target.value }))}>
                  <option value="">Select</option>
                  {CLASS_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input" value={editResource.subject} onChange={(e) => setEditResource((x) => ({ ...x, subject: e.target.value }))} />
            </div>
            <button
              type="button"
              className="btn-primary w-full py-2 rounded-xl text-sm font-semibold"
              disabled={updateMut.isPending}
              onClick={() => updateMut.mutate({
                id: editResource.id,
                payload: {
                  title: editResource.title.trim(),
                  board: editResource.board,
                  classLevel: editResource.classLevel,
                  subject: editResource.subject.trim(),
                },
              })}
            >
              {updateMut.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EnterprisesTab() {
  const qc = useQueryClient();
  const { data: pricingData } = useQuery({
    queryKey: ['adminSettingsForEnterprisePricing'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  });
  const pricing = pricingData?.settings || {};
  const { data, isLoading } = useQuery({
    queryKey: ['adminEnterprises'],
    queryFn: () => enterpriseApi.adminList().then((r) => r.data),
  });
  const [form, setForm] = useState({
    name: '',
    contactEmail: '',
    phone: '',
    country: '',
    state: '',
    city: '',
    zipCode: '',
    mode: 'institute',
    board: 'CBSE',
    teacherLimit: 5,
    studentLimit: 2000,
    examsPerTeacherLimit: 30,
    questionsPerExamLimit: 100,
    aiProctoringEnabled: true,
    aiListeningEnabled: true,
    aiResourceProcessingEnabled: true,
    codingExamsEnabled: true,
    aiExamGenerationEnabled: true,
    estimatedMonthlyCostManualPaise: '',
    orgPlanDurationMonths: '',
    orgTrialDays: 0,
    principalName: '',
    principalEmail: '',
  });
  const [logsFor, setLogsFor] = useState(null);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilters, setLogsFilters] = useState({ userId: '', action: '', from: '', to: '' });
  const [limitEdit, setLimitEdit] = useState({ id: '', value: 5 });
  const [editEnterprise, setEditEnterprise] = useState(null);

  const createMut = useMutation({
    mutationFn: () => enterpriseApi.adminCreate({
      name: form.name.trim(),
      contactEmail: form.contactEmail.trim(),
      phone: form.phone.trim(),
      address: {
        country: form.country.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        zipCode: form.zipCode.trim(),
      },
      mode: form.mode,
      board: form.board,
      teacherLimit: Number(form.teacherLimit) || 5,
      studentLimit: Number(form.studentLimit) || 2000,
      examsPerTeacherLimit: Number(form.examsPerTeacherLimit) || 30,
      questionsPerExamLimit: Number(form.questionsPerExamLimit) || 100,
      aiProctoringEnabled: !!form.aiProctoringEnabled,
      aiListeningEnabled: !!form.aiListeningEnabled,
      aiResourceProcessingEnabled: !!form.aiResourceProcessingEnabled,
      codingExamsEnabled: !!form.codingExamsEnabled,
      aiExamGenerationEnabled: !!form.aiExamGenerationEnabled,
      estimatedMonthlyCostManualPaise: form.estimatedMonthlyCostManualPaise === '' || form.estimatedMonthlyCostManualPaise == null
        ? undefined
        : Math.max(100, Math.round(Number(form.estimatedMonthlyCostManualPaise))),
      orgPlanDurationMonths: form.orgPlanDurationMonths ? Number(form.orgPlanDurationMonths) : undefined,
      orgTrialDays: Number(form.orgTrialDays) || 0,
      principalName: form.principalName.trim(),
      principalEmail: form.principalEmail.trim(),
    }),
    onSuccess: () => {
      toast.success('Enterprise created');
      qc.invalidateQueries({ queryKey: ['adminEnterprises'] });
      setForm((f) => ({
        ...f,
        name: '',
        contactEmail: '',
        phone: '',
        country: '',
        state: '',
        city: '',
        zipCode: '',
        examsPerTeacherLimit: 30,
        questionsPerExamLimit: 100,
        aiProctoringEnabled: true,
        aiListeningEnabled: true,
        aiResourceProcessingEnabled: true,
        codingExamsEnabled: true,
        aiExamGenerationEnabled: true,
        estimatedMonthlyCostManualPaise: '',
        principalName: '',
        principalEmail: '',
      }));
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const limitMut = useMutation({
    mutationFn: ({ id, teacherLimit }) => enterpriseApi.adminPatchLimit(id, teacherLimit),
    onSuccess: () => {
      toast.success('Limit updated');
      qc.invalidateQueries({ queryKey: ['adminEnterprises'] });
      setLimitEdit({ id: '', value: 5 });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => enterpriseApi.adminUpdate(id, payload),
    onSuccess: () => {
      toast.success('Enterprise updated');
      qc.invalidateQueries({ queryKey: ['adminEnterprises'] });
      setEditEnterprise(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => enterpriseApi.adminDelete(id),
    onSuccess: () => {
      toast.success('Enterprise deleted. Teachers moved to free plan.');
      qc.invalidateQueries({ queryKey: ['adminEnterprises'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  });

  const { data: logsData } = useQuery({
    queryKey: ['enterpriseLogs', logsFor?._id, logsSearch, logsFilters],
    queryFn: () => enterpriseApi.adminLogs(logsFor?._id, {
      page: 1,
      search: logsSearch.trim() || undefined,
      userId: logsFilters.userId || undefined,
      action: logsFilters.action || undefined,
      from: logsFilters.from || undefined,
      to: logsFilters.to || undefined,
    }).then((r) => r.data),
    enabled: !!logsFor?._id,
  });

  const list = data?.enterprises || [];
  const estimatedMonthlyCost = (() => {
    const perTeacher = Number(pricing.enterpriseCostPerTeacher) || 0;
    const perExam = Number(pricing.enterpriseCostPerExam) || 0;
    const perQuestion = Number(pricing.enterpriseCostPerQuestion) || 0;
    const aiCost = Number(pricing.enterpriseCostAiProctoring) || 0;
    const teachers = Number(form.teacherLimit) || 0;
    const exams = Number(form.examsPerTeacherLimit) || 0;
    const questions = Number(form.questionsPerExamLimit) || 0;
    const totalPaise = (teachers * perTeacher) + (teachers * exams * perExam) + (teachers * exams * questions * perQuestion) + (form.aiProctoringEnabled ? aiCost : 0);
    return Math.max(0, totalPaise);
  })();

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Create enterprise</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Organization name</label>
            <input className="input w-full mt-0.5" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="School / Institute" />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Contact email</label>
            <input className="input w-full mt-0.5" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Phone</label>
            <input className="input w-full mt-0.5" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Teacher limit</label>
            <input className="input w-full mt-0.5" type="number" min={1} value={form.teacherLimit} onChange={(e) => setForm((f) => ({ ...f, teacherLimit: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Exams limit per teacher</label>
            <input className="input w-full mt-0.5" type="number" min={1} value={form.examsPerTeacherLimit} onChange={(e) => setForm((f) => ({ ...f, examsPerTeacherLimit: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Questions limit per exam</label>
            <input className="input w-full mt-0.5" type="number" min={5} value={form.questionsPerExamLimit} onChange={(e) => setForm((f) => ({ ...f, questionsPerExamLimit: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Student cap</label>
            <input className="input w-full mt-0.5" type="number" min={1} value={form.studentLimit} onChange={(e) => setForm((f) => ({ ...f, studentLimit: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Paid org term (months)</label>
            <select className="input w-full mt-0.5" value={form.orgPlanDurationMonths} onChange={(e) => setForm((f) => ({ ...f, orgPlanDurationMonths: e.target.value }))}>
              <option value="">None</option>
              <option value="1">1 month</option>
              <option value="3">3 months</option>
              <option value="6">6 months</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Org trial (days)</label>
            <input className="input w-full mt-0.5" type="number" min={0} max={90} value={form.orgTrialDays} onChange={(e) => setForm((f) => ({ ...f, orgTrialDays: e.target.value }))} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Principal name</label>
            <input className="input w-full mt-0.5" value={form.principalName} onChange={(e) => setForm((f) => ({ ...f, principalName: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Principal email</label>
            <input className="input w-full mt-0.5" type="email" value={form.principalEmail} onChange={(e) => setForm((f) => ({ ...f, principalEmail: e.target.value }))} />
          </div>
        </div>

        <p className="text-xs font-bold text-[var(--color-text)] mb-1">Address</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input className="input" placeholder="Country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          <input className="input" placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
          <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          <input className="input" placeholder="ZIP" value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} />
        </div>
   
        <div className="mb-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)] p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">AI &amp; product access</p>
          <div className="grid sm:grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.aiProctoringEnabled} onChange={(e) => setForm((f) => ({ ...f, aiProctoringEnabled: e.target.checked }))} />
              AI proctoring
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.aiListeningEnabled} onChange={(e) => setForm((f) => ({ ...f, aiListeningEnabled: e.target.checked }))} />
              Listening / audio
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.aiResourceProcessingEnabled} onChange={(e) => setForm((f) => ({ ...f, aiResourceProcessingEnabled: e.target.checked }))} />
              AI resource processing
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.codingExamsEnabled} onChange={(e) => setForm((f) => ({ ...f, codingExamsEnabled: e.target.checked }))} />
              Coding exams
            </label>
            <label className="inline-flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={form.aiExamGenerationEnabled} onChange={(e) => setForm((f) => ({ ...f, aiExamGenerationEnabled: e.target.checked }))} />
              AI exam generation
            </label>
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Custom monthly price override (paise, optional)</label>
            <input
              className="input w-full mt-0.5 text-sm"
              type="number"
              min={100}
              step={100}
              placeholder="Leave empty to use formula below"
              value={form.estimatedMonthlyCostManualPaise}
              onChange={(e) => setForm((f) => ({ ...f, estimatedMonthlyCostManualPaise: e.target.value }))}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Formula monthly estimate: <span className="font-semibold text-[var(--color-text)]">₹{Math.round(estimatedMonthlyCost / 100).toLocaleString('en-IN')}</span>
            {form.estimatedMonthlyCostManualPaise && Number(form.estimatedMonthlyCostManualPaise) >= 100 ? (
              <span className="block mt-1 text-amber-700 dark:text-amber-300">Checkout will use your custom override when set.</span>
            ) : null}
          </p>
        </div>
        <div className="mb-3 grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">Board</label>
            <select className="input w-full" value={form.board} onChange={(e) => setForm((f) => ({ ...f, board: e.target.value }))}>
              {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-text-muted)] block mb-1.5">Mode</label>
            <select className="input w-full" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
              <option value="school">School — classes &amp; students</option>
              <option value="institute">Institute — batches (existing flow)</option>
            </select>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-200 mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            This cannot be changed later.
          </p>
        </div>
        <button
          type="button"
          disabled={createMut.isPending}
          onClick={() => createMut.mutate()}
          className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold"
        >
          {createMut.isPending ? 'Creating…' : 'Create enterprise'}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] font-semibold text-sm text-[var(--color-text)]">Organizations</div>
        {isLoading ? <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Mode</th>
                <th className="px-3 py-2">Board</th>
                <th className="px-3 py-2">Principal</th>
                <th className="px-3 py-2">Teachers</th>
                <th className="px-3 py-2">Limits</th>
                <th className="px-3 py-2">Monthly Cost</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e._id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{e.name}</td>
                  <td className="px-3 py-2 capitalize">{e.mode}</td>
                  <td className="px-3 py-2">{e.board || 'CBSE'}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">
                    {e.principalUser?.name} <span className="text-xs block">{e.principalUser?.email}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{e.teacherUsed ?? 0} / {e.teacherLimit}</td>
                  <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    {e.examsPerTeacherLimit || 30} exams/teacher · {e.questionsPerExamLimit || 100} q/exam · {e.aiProctoringEnabled === false ? 'No AI proctoring' : 'AI proctoring on'}
                  </td>
                  <td className="px-3 py-2 tabular-nums">₹{Math.round((e.estimatedMonthlyCost || 0) / 100).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button type="button" className="text-xs font-semibold text-[var(--color-primary)] hover:underline" onClick={() => setLogsFor(e)}>View Logs</button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--color-text-muted)] hover:underline"
                      onClick={() => setEditEnterprise({
                        id: e._id,
                        name: e.name || '',
                        contactEmail: e.contactEmail || '',
                        phone: e.phone || '',
                        country: e.address?.country || '',
                        state: e.address?.state || '',
                        city: e.address?.city || '',
                        zipCode: e.address?.zipCode || '',
                        mode: e.mode,
                        board: e.board || 'CBSE',
                        teacherLimit: e.teacherLimit || 5,
                        examsPerTeacherLimit: e.examsPerTeacherLimit || 30,
                        questionsPerExamLimit: e.questionsPerExamLimit || 100,
                        studentLimit: e.studentLimit ?? 2000,
                        aiProctoringEnabled: e.aiProctoringEnabled !== false,
                        aiListeningEnabled: e.aiListeningEnabled !== false,
                        aiResourceProcessingEnabled: e.aiResourceProcessingEnabled !== false,
                        codingExamsEnabled: e.codingExamsEnabled !== false,
                        aiExamGenerationEnabled: e.aiExamGenerationEnabled !== false,
                        estimatedMonthlyCostManualPaise: e.estimatedMonthlyCostManualPaise != null ? String(e.estimatedMonthlyCostManualPaise) : '',
                      })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[var(--color-text-muted)] hover:underline"
                      onClick={() => setLimitEdit({ id: e._id, value: e.teacherLimit })}
                    >
                      Set limit
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600 hover:underline"
                      onClick={() => {
                        if (window.confirm(`Delete enterprise "${e.name}"? Teacher accounts will be retained and moved to free plan.`)) {
                          deleteMut.mutate(e._id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {limitEdit.id && (
        <Modal onClose={() => setLimitEdit({ id: '', value: 5 })}>
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 max-w-sm w-full shadow-xl">
            <h4 className="font-semibold text-[var(--color-text)] mb-3">Teacher limit</h4>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">Set the maximum number of teachers this enterprise can use.</p>
            <input
              type="number"
              min={1}
              className="input w-full mb-3"
              value={limitEdit.value}
              onChange={(ev) => setLimitEdit((le) => ({ ...le, value: ev.target.value }))}
            />
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm" onClick={() => setLimitEdit({ id: '', value: 5 })}>Cancel</button>
              <button
                type="button"
                className="flex-1 btn-primary py-2 rounded-xl text-sm font-semibold"
                onClick={() => limitMut.mutate({ id: limitEdit.id, teacherLimit: Number(limitEdit.value) })}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editEnterprise && (
        <Modal onClose={() => setEditEnterprise(null)}>
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 max-w-2xl w-full shadow-xl">
            <h4 className="font-semibold text-[var(--color-text)] mb-3">Edit enterprise</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="input" placeholder="Organization name" value={editEnterprise.name} onChange={(e) => setEditEnterprise((x) => ({ ...x, name: e.target.value }))} />
              <input className="input" type="email" placeholder="Contact email" value={editEnterprise.contactEmail} onChange={(e) => setEditEnterprise((x) => ({ ...x, contactEmail: e.target.value }))} />
              <input className="input" placeholder="Phone" value={editEnterprise.phone} onChange={(e) => setEditEnterprise((x) => ({ ...x, phone: e.target.value }))} />
              <input className="input" type="number" min={1} placeholder="Teacher limit" value={editEnterprise.teacherLimit} onChange={(e) => setEditEnterprise((x) => ({ ...x, teacherLimit: e.target.value }))} />
              <input className="input" type="number" min={1} placeholder="Exams/teacher" value={editEnterprise.examsPerTeacherLimit} onChange={(e) => setEditEnterprise((x) => ({ ...x, examsPerTeacherLimit: e.target.value }))} />
              <input className="input" type="number" min={5} placeholder="Questions/exam" value={editEnterprise.questionsPerExamLimit} onChange={(e) => setEditEnterprise((x) => ({ ...x, questionsPerExamLimit: e.target.value }))} />
              <input className="input" placeholder="Country" value={editEnterprise.country} onChange={(e) => setEditEnterprise((x) => ({ ...x, country: e.target.value }))} />
              <input className="input" placeholder="State" value={editEnterprise.state} onChange={(e) => setEditEnterprise((x) => ({ ...x, state: e.target.value }))} />
              <input className="input" placeholder="City" value={editEnterprise.city} onChange={(e) => setEditEnterprise((x) => ({ ...x, city: e.target.value }))} />
              <input className="input" placeholder="ZIP" value={editEnterprise.zipCode} onChange={(e) => setEditEnterprise((x) => ({ ...x, zipCode: e.target.value }))} />
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--color-text-muted)]">Board</label>
                <select className="input w-full mt-0.5" value={editEnterprise.board} onChange={(e) => setEditEnterprise((x) => ({ ...x, board: e.target.value }))}>
                  {BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] flex items-end pb-2">
                Mode: <span className="font-semibold capitalize text-[var(--color-text)] ml-1">{editEnterprise.mode}</span> (cannot be changed)
              </div>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs text-[var(--color-text-muted)]">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!editEnterprise.aiProctoringEnabled} onChange={(e) => setEditEnterprise((x) => ({ ...x, aiProctoringEnabled: e.target.checked }))} />
                AI proctoring
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!editEnterprise.aiListeningEnabled} onChange={(e) => setEditEnterprise((x) => ({ ...x, aiListeningEnabled: e.target.checked }))} />
                Listening / audio
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!editEnterprise.aiResourceProcessingEnabled} onChange={(e) => setEditEnterprise((x) => ({ ...x, aiResourceProcessingEnabled: e.target.checked }))} />
                AI resource processing
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!editEnterprise.codingExamsEnabled} onChange={(e) => setEditEnterprise((x) => ({ ...x, codingExamsEnabled: e.target.checked }))} />
                Coding exams
              </label>
              <label className="inline-flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={!!editEnterprise.aiExamGenerationEnabled} onChange={(e) => setEditEnterprise((x) => ({ ...x, aiExamGenerationEnabled: e.target.checked }))} />
                AI exam generation
              </label>
            </div>
            <div className="mt-3">
              <label className="text-xs text-[var(--color-text-muted)]">Student cap</label>
              <input className="input w-full mt-0.5 text-sm" type="number" min={1} value={editEnterprise.studentLimit} onChange={(e) => setEditEnterprise((x) => ({ ...x, studentLimit: e.target.value }))} />
            </div>
            <div className="mt-3">
              <label className="text-xs text-[var(--color-text-muted)]">Monthly price override (paise, empty to clear)</label>
              <input
                className="input w-full mt-0.5 text-sm"
                type="number"
                min={100}
                placeholder="Clear field and save to use formula"
                value={editEnterprise.estimatedMonthlyCostManualPaise}
                onChange={(e) => setEditEnterprise((x) => ({ ...x, estimatedMonthlyCostManualPaise: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm" onClick={() => setEditEnterprise(null)}>Cancel</button>
              <button
                type="button"
                className="flex-1 btn-primary py-2 rounded-xl text-sm font-semibold"
                disabled={updateMut.isPending}
                onClick={() => updateMut.mutate({
                  id: editEnterprise.id,
                  payload: {
                    name: editEnterprise.name,
                    contactEmail: editEnterprise.contactEmail,
                    phone: editEnterprise.phone,
                    board: editEnterprise.board,
                    teacherLimit: Number(editEnterprise.teacherLimit) || 5,
                    examsPerTeacherLimit: Number(editEnterprise.examsPerTeacherLimit) || 30,
                    questionsPerExamLimit: Number(editEnterprise.questionsPerExamLimit) || 100,
                    studentLimit: Number(editEnterprise.studentLimit) || 2000,
                    aiProctoringEnabled: !!editEnterprise.aiProctoringEnabled,
                    aiListeningEnabled: !!editEnterprise.aiListeningEnabled,
                    aiResourceProcessingEnabled: !!editEnterprise.aiResourceProcessingEnabled,
                    codingExamsEnabled: !!editEnterprise.codingExamsEnabled,
                    aiExamGenerationEnabled: !!editEnterprise.aiExamGenerationEnabled,
                    estimatedMonthlyCostManualPaise: editEnterprise.estimatedMonthlyCostManualPaise === '' || editEnterprise.estimatedMonthlyCostManualPaise == null
                      ? null
                      : Math.max(100, Math.round(Number(editEnterprise.estimatedMonthlyCostManualPaise))),
                    address: {
                      country: editEnterprise.country,
                      state: editEnterprise.state,
                      city: editEnterprise.city,
                      zipCode: editEnterprise.zipCode,
                    },
                  },
                })}
              >
                Save changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {logsFor && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="font-semibold text-[var(--color-text)]">Enterprise logs</h4>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {logsFor.name} · {logsFor.mode}
              </p>
            </div>
            <button type="button" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]" onClick={() => setLogsFor(null)}>Back to enterprises</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-1 mb-3">
            <input
              className="input w-full text-xs lg:col-span-"
              placeholder="Search action/category/severity"
              value={logsSearch}
              onChange={(e) => setLogsSearch(e.target.value)}
            />
            <select className="input w-full text-xs" value={logsFilters.userId} onChange={(e) => setLogsFilters((f) => ({ ...f, userId: e.target.value }))}>
              <option value="">All users</option>
              {(logsData?.users || []).map((u) => (
                <option key={u._id} value={u._id}>{u.name || u.email}</option>
              ))}
            </select>
            <select className="input w-full text-xs" value={logsFilters.action} onChange={(e) => setLogsFilters((f) => ({ ...f, action: e.target.value }))}>
              <option value="">All actions</option>
              {Array.from(new Set((logsData?.logs || []).map((log) => log.action))).map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input className="input w-full text-xs" type="date" value={logsFilters.from} onChange={(e) => setLogsFilters((f) => ({ ...f, from: e.target.value }))} />
              <input className="input w-full text-xs" type="date" value={logsFilters.to} onChange={(e) => setLogsFilters((f) => ({ ...f, to: e.target.value }))} />
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--color-bg-alt)] text-left text-[var(--color-text-muted)] uppercase tracking-wide border-b border-[var(--color-border)]">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {(logsData?.logs || []).map((log) => (
                  <tr key={log._id} className="border-b border-[var(--color-border)] last:border-0 align-top">
                    <td className="px-3 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2 font-medium text-[var(--color-text)]">{log.action}</td>
                    <td className="px-3 py-2 capitalize text-[var(--color-text-muted)]">{log.category || '-'}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{log.userEmail || log.userName || '—'}</td>
                    <td className="px-3 py-2 capitalize text-[var(--color-text-muted)]">{log.severity || 'info'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logsData?.logs?.length === 0 && <p className="text-[var(--color-text-muted)] py-4 px-3 text-sm">No logs yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || 'overview';
  const activeTab = TABS.some(t => t.id === tabParam) ? tabParam : 'overview';
  const setActiveTab = (id) => setSearchParams({ tab: id }, { replace: true });
  const isOverview = activeTab === 'overview';

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && !TABS.some(x => x.id === t)) {
      setSearchParams({ tab: 'overview' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: statsData } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminApi.stats().then(r => r.data),
    enabled: activeTab === 'overview',
  });

  return (
    <div className="animate-fade-in px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="min-w-0">
          {isOverview && (
            <>
              <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">LikhitAI admin</h1>
              <p className="text-[var(--color-text-muted)] text-sm mt-1.5 leading-relaxed">
                Full platform metrics and shortcuts into each management area. Use the sidebar or the cards below to open a section.
              </p>
            </>
          )}
        </div>
        <div className={`shrink-0 w-full sm:w-52 ${isOverview ? 'sm:hidden' : 'lg:hidden'}`}>
          <label htmlFor="admin-tab-select" className="sr-only">Switch section</label>
          <select
            id="admin-tab-select"
            className="input text-sm w-full"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {isOverview && (
        <div className="space-y-10">
          <OverviewTab stats={statsData} onSetTab={setActiveTab} />
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Management areas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {HUB_TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className="text-left group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex items-start gap-3 transition-all hover:border-[var(--color-primary)]/35 hover:shadow-md"
                  >
                    <div className="p-2.5 rounded-xl bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)] text-sm leading-snug">{t.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">Open workspace</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {!isOverview && ADMIN_TAB_PAGE[activeTab] && (
        <div className="min-w-0">
          <AdminTabPageHeader tabId={activeTab} onBack={() => setActiveTab('overview')} />
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'plans' && <PlansTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
          {activeTab === 'groups' && <GroupsTab />}
          {activeTab === 'contacts' && <ContactsTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'payments' && <PaymentsTab />}
          {activeTab === 'feedback' && <FeedbackTab />}
          {activeTab === 'resources' && <ResourcesTab />}
          {activeTab === 'help' && <HelpTopicsTab />}
          {activeTab === 'enterprises' && <EnterprisesTab />}
        </div>
      )}
    </div>
  );
}
