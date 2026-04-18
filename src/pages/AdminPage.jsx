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
  Activity,
  BarChart2,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Inbox,
  Layers,
  Mail,
  MessageSquare,
  RefreshCw,
  Reply,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, feedbackApi, logsApi, settingsApi, contactApi } from '../services/api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const TABS = [
  { id: 'overview',  label: 'Overview',         icon: BarChart2 },
  { id: 'users',     label: 'Users',             icon: Users },
  { id: 'plans',     label: 'Plan Management',   icon: Layers },
  { id: 'contacts',  label: 'Contact Queries',   icon: Inbox },
  { id: 'logs',      label: 'Activity Logs',     icon: Activity },
  { id: 'settings',  label: 'Settings',          icon: Settings },
  { id: 'payments',  label: 'Payments',          icon: CreditCard },
  { id: 'feedback',  label: 'Feedback',          icon: MessageSquare },
];

const SEVERITY_COLORS = { info: 'bg-blue-100 text-blue-700', warning: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
const CATEGORY_COLORS = { auth: 'bg-purple-100 text-purple-700', exam: 'bg-green-100 text-green-700', admin: 'bg-yellow-100 text-yellow-700', proctoring: 'bg-red-100 text-red-700', certificate: 'bg-blue-100 text-blue-700', profile: 'bg-gray-100 text-gray-700' };

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatBox label="Total Users" value={stats.users} icon={<Users size={20} className="text-blue-600" />} color="bg-blue-100 dark:bg-blue-900/30" onClick={() => onSetTab('users')} />
        <StatBox label="Instructors" value={stats.instructors ?? 0} icon={<Shield size={20} className="text-amber-600" />} color="bg-amber-100 dark:bg-amber-900/30" onClick={() => onSetTab('users')} />
        <StatBox label="Total Exams" value={stats.exams} icon={<BookOpen size={20} className="text-green-600" />} color="bg-green-100 dark:bg-green-900/30" />
        <StatBox label="Total Results" value={stats.results} icon={<CheckCircle size={20} className="text-purple-600" />} color="bg-purple-100 dark:bg-purple-900/30" onClick={() => onSetTab('logs')} />
        <StatBox label="Pass Rate" value={stats.passRate !== undefined ? `${stats.passRate}%` : null} icon={<Shield size={20} className="text-orange-600" />} color="bg-orange-100 dark:bg-orange-900/30" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">New Users (7 days)</h3>
          <div className="h-48"><Line data={lineDataset(userDays, '#6366f1')} options={baseChartOpts} /></div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">Exam Attempts (7 days)</h3>
          <div className="h-48"><Line data={lineDataset(examDays, '#22c55e')} options={baseChartOpts} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">Score Distribution</h3>
          <div className="h-56 flex items-center justify-center">
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'right', labels: { font: { size: 11 } } } } }} />
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-[var(--color-text)] mb-4">Top Subjects</h3>
          <div className="h-56"><Bar data={barData} options={baseChartOpts} /></div>
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

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers', page, search],
    queryFn: () => adminApi.users(page, search).then(r => r.data),
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

  const users = usersData?.users || [];
  const totalPages = usersData?.pages || 1;

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input className="input pl-8 text-sm py-2" placeholder="Search users..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }} />
        </div>
        <button onClick={() => { setSearch(searchInput); setPage(1); }} className="btn-secondary text-xs py-2 px-3">Search</button>
        {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }} className="text-xs text-[var(--color-text-muted)] hover:underline">Clear</button>}
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
                  <th className="pb-3 font-semibold">Level</th>
                  <th className="pb-3 font-semibold">XP / Exams</th>
                  <th className="pb-3 font-semibold">Status</th>
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
                            <option value="admin">admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4"><span className="badge bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">{u.level}</span></td>
                    <td className="py-3 pr-4 text-xs text-[var(--color-text-muted)]"><span className="font-semibold text-[var(--color-text)]">{u.xp}</span> XP · {u.totalExams} exams</td>
                    <td className="py-3 pr-4">{u.isBlocked ? <span className="badge bg-red-100 text-red-700">Blocked</span> : <span className="badge bg-green-100 text-green-700">Active</span>}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        {u.role !== 'admin' && (
                          <>
                            <button onClick={() => blockMut.mutate(u._id)} className={`text-xs px-2 py-1 rounded border transition-colors ${u.isBlocked ? 'border-green-400 text-green-600 hover:bg-green-50' : 'border-orange-400 text-orange-600 hover:bg-orange-50'}`}>
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button onClick={() => { if (window.confirm(`Delete user ${u.name}?`)) deleteMut.mutate(u._id); }} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
            <input className="input text-sm" value={local.certOrganizationName || ''} onChange={e => setLocal(s => ({ ...s, certOrganizationName: e.target.value }))} placeholder="ExamPrep AI" />
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
        <h3 className="font-semibold text-[var(--color-text)] mb-1">Plan Pricing</h3>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">Set prices for paid plans (in ₹). Changes reflect immediately on checkout.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label text-xs">Pro Plan Price (₹/month)</label>
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
            <label className="label text-xs">Enterprise Plan Price (₹/month)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">₹</span>
              <input
                type="number"
                min={1}
                className="input text-sm flex-1"
                value={Math.round((local.planPriceEnterprise || 34900) / 100)}
                onChange={e => setLocal(s => ({ ...s, planPriceEnterprise: Math.round(Number(e.target.value) * 100) }))}
                placeholder="349"
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
    mutationFn: ({ id, plan }) => adminApi.updatePlan(id, plan),
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
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
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
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ plan: 'free', months: 1 });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['adminPlanUsers', page, search, planFilter],
    queryFn: () => adminApi.users(page, search, planFilter).then(r => r.data),
    keepPreviousData: true,
  });

  const planMut = useMutation({
    mutationFn: ({ id, plan, months }) => adminApi.updatePlan(id, plan, months),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adminPlanUsers'] });
      qc.invalidateQueries({ queryKey: ['adminStats'] });
      toast.success('Plan updated — user notified by email');
      setEditingId(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update plan'),
  });

  const users = data?.users || [];
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const planCounts = users.reduce((acc, u) => { acc[u.plan] = (acc[u.plan] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: data?.total ?? '—', icon: <Users size={18} />, color: 'bg-blue-50 dark:bg-blue-900/20 text-[var(--color-primary)]' },
          { label: 'Free Plan', value: planCounts.free ?? 0, icon: <Zap size={18} />, color: 'bg-slate-50 dark:bg-slate-800 text-slate-600' },
          { label: 'Pro Plan', value: planCounts.pro ?? 0, icon: <Shield size={18} />, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' },
          { label: 'Enterprise Plan', value: planCounts.enterprise ?? 0, icon: <Layers size={18} />, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3 py-3">
            <div className={`${s.color} p-2.5 rounded-xl shrink-0`}>{s.icon}</div>
            <div>
              <div className="text-xl font-bold text-[var(--color-text)]">{s.value}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            className="input pl-9 text-sm w-full"
            placeholder="Search name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex gap-1.5">
          {[{ v: '', l: 'All Plans' }, { v: 'free', l: 'Free' }, { v: 'pro', l: 'Pro' }, { v: 'enterprise', l: 'Enterprise' }].map(f => (
            <button
              key={f.v}
              onClick={() => { setPlanFilter(f.v); setPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${planFilter === f.v ? 'bg-[var(--color-primary)] text-white' : 'btn-secondary'}`}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-left">Used/Limit</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-muted)]">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--color-text-muted)]">No users found.</td></tr>
            ) : users.map(u => (
              <tr key={u._id} className="hover:bg-[var(--color-bg-alt)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--color-text)] text-xs">{u.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge capitalize text-xs ${PLAN_COLORS[u.plan] || PLAN_COLORS.free}`}>{u.plan}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge capitalize text-xs ${STATUS_COLORS[u.planStatus] || STATUS_COLORS.free}`}>
                    {u.planStatus || 'free'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">{fmtDate(u.planExpiresAt)}</td>
                <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                  {u.examsCreatedThisMonth ?? 0} / {u.plan === 'enterprise' ? 30 : u.plan === 'pro' ? 10 : 3}
                </td>
                <td className="px-4 py-3">
                  {editingId === u._id ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <select
                        value={editForm.plan}
                        onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))}
                        className="input text-xs py-1 px-2 h-7 w-28"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                      {editForm.plan !== 'free' && (
                        <select
                          value={editForm.months}
                          onChange={e => setEditForm(f => ({ ...f, months: Number(e.target.value) }))}
                          className="input text-xs py-1 px-2 h-7 w-24"
                        >
                          {[1, 3, 6, 12].map(m => <option key={m} value={m}>{m} mo</option>)}
                        </select>
                      )}
                      <button
                        onClick={() => planMut.mutate({ id: u._id, plan: editForm.plan, months: editForm.months })}
                        disabled={planMut.isPending}
                        className="btn-primary text-xs py-1 px-3 h-7"
                      >
                        {planMut.isPending ? '...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1 px-2 h-7">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(u._id); setEditForm({ plan: u.plan, months: 1 }); }}
                      className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
                    >
                      <RefreshCw size={11} /> Change Plan
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {(data?.pages || 1) > 1 && (
          <div className="flex justify-center gap-2 p-3 border-t border-[var(--color-border)]">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1 disabled:opacity-40">
              <ChevronLeft size={12} /> Prev
            </button>
            <span className="text-xs self-center text-[var(--color-text-muted)]">{page} / {data?.pages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.pages || 1)} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1 disabled:opacity-40">
              Next <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="card bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 p-4">
        <strong>Note:</strong> Changing a user's plan sends an automatic email notification to the user. Duration only applies to paid plans (Pro / Enterprise).
      </div>
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

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>;

  const { feedback = [], stats = { avg: '0.0', total: 0, distribution: [0, 0, 0, 0, 0] } } = data || {};

  const ratingChartData = {
    labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
    datasets: [{
      data: stats.distribution,
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
      borderWidth: 0,
    }],
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-xl">
            <Star size={20} className="text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{stats.avg}</div>
            <div className="text-xs text-[var(--color-text-muted)]">Average Rating</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl">
            <MessageSquare size={20} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{stats.total}</div>
            <div className="text-xs text-[var(--color-text-muted)]">Total Responses</div>
          </div>
        </div>
        {/* Rating distribution chart */}
        <div className="card flex items-center gap-4">
          <div className="w-16 h-16 shrink-0">
            <Doughnut data={ratingChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--color-text)]">Distribution</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {['1★', '2★', '3★', '4★', '5★'].map((l, i) => (
                <span key={l} className="text-[10px] text-[var(--color-text-muted)]">{l}:{stats.distribution[i]}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback list */}
      {feedback.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">No feedback yet.</div>
      ) : (
        <div className="space-y-3">
          {feedback.map((fb) => (
            <div key={fb._id} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-xs font-bold text-[var(--color-primary)]">
                    {fb.user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{fb.user?.name || 'Anonymous'}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{fb.user?.email} · {new Date(fb.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={13} className={s <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--color-border)]'} />
                  ))}
                </div>
              </div>

              {fb.message && (
                <p className="text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] rounded-lg px-3 py-2 mb-2 italic">
                  "{fb.message}"
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full capitalize">
                  {fb.trigger?.replace('_', ' ')}
                </span>
                {fb.adminReply && (
                  <span className="text-xs text-green-600 dark:text-green-400">✓ Replied</span>
                )}
                <button
                  onClick={() => { setReplyingId(fb._id); setReplyText(fb.adminReply || ''); }}
                  className="text-xs text-[var(--color-primary)] hover:underline ml-auto"
                >
                  {fb.adminReply ? 'Edit reply' : 'Reply'}
                </button>
              </div>

              {fb.adminReply && replyingId !== fb._id && (
                <div className="mt-2 pl-3 border-l-2 border-[var(--color-primary)]/30 text-xs text-[var(--color-text-muted)]">
                  <span className="font-semibold text-[var(--color-primary)]">Admin: </span>{fb.adminReply}
                </div>
              )}

              {replyingId === fb._id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Write a reply..."
                    className="input text-xs resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setReplyingId(null)} className="text-xs text-[var(--color-text-muted)] hover:underline">Cancel</button>
                    <button
                      onClick={() => replyMut.mutate({ id: fb._id, reply: replyText })}
                      disabled={replyMut.isPending || !replyText.trim()}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: statsData } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminApi.stats().then(r => r.data),
    enabled: activeTab === 'overview',
  });

  return (
    <div className="space-y-6 animate-fade-in px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Admin Panel</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Platform management and analytics</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-[var(--color-border)] overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && <OverviewTab stats={statsData} onSetTab={setActiveTab} />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'contacts' && <ContactsTab />}
      {activeTab === 'logs' && <LogsTab />}
      {activeTab === 'settings' && <SettingsTab />}
      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
    </div>
  );
}
