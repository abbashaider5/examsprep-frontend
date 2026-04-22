import {
  ArcElement, BarElement, CategoryScale,
  Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award, BarChart2, BookmarkCheck, Clock, Download, Edit3,
  Eye, FileText, Mail, Plus, RefreshCw, Send, Shield,
  Timer, Trophy, Upload, Users, X, Zap,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import EditExamModal from '../components/EditExamModal.jsx';
import Modal from '../components/Modal.jsx';
import { examApi, groupApi, instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { useThemeStore } from '../store/index.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function useChartColors() {
  const { dark } = useThemeStore();
  return {
    text: dark ? '#cbd5e1' : '#334155',
    muted: dark ? '#64748b' : '#94a3b8',
    grid: dark ? '#1e293b' : '#f1f5f9',
    surface: dark ? '#1e293b' : '#ffffff',
    primary: '#0d9488',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
  };
}

function diffBadgeClass(d) {
  return d === 'easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
    : d === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InstructorPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const c = useChartColors();

  const [selectedExam, setSelectedExam] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMode, setInviteMode] = useState('email');
  const [inviteEmailTab, setInviteEmailTab] = useState('single');
  const [inviteGroupId, setInviteGroupId] = useState('');
  const [inviteParsedEmails, setInviteParsedEmails] = useState([]);
  const [inviteFileName, setInviteFileName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const inviteFileRef = useRef(null);

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteEmailTab('single');
    setInviteParsedEmails([]);
    setInviteFileName('');
    setInviteGroupId('');
  };

  const handleInviteFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInviteFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const emails = [];
        for (const row of rows) {
          for (const cell of row) {
            const val = String(cell || '').trim().toLowerCase();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) emails.push(val);
          }
        }
        const unique = [...new Set(emails)];
        if (!unique.length) { toast.error('No valid emails found in file'); return; }
        setInviteParsedEmails(unique);
        toast.success(`Found ${unique.length} email(s)`);
      } catch { toast.error('Failed to parse file'); }
    };
    reader.readAsArrayBuffer(file);
    if (inviteFileRef.current) inviteFileRef.current.value = '';
  };

  const downloadInviteSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([['Name', 'Email'], ['Alice Smith', 'alice@example.com'], ['Bob Jones', 'bob@example.com']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invites');
    XLSX.writeFile(wb, 'invite_sample.xlsx');
  };

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['instructorAnalytics'],
    queryFn: () => instructorApi.getAnalytics().then(r => r.data),
  });

  const inviteMut = useMutation({
    mutationFn: ({ examId, email }) => instructorApi.sendInvite(examId, email),
    onSuccess: () => {
      toast.success('Invite sent!');
      closeInviteModal();
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send invite'),
  });

  const groupInviteMut = useMutation({
    mutationFn: ({ examId, groupId }) => instructorApi.sendGroupInvite(examId, groupId),
    onSuccess: (res) => {
      toast.success(res.data.message);
      closeInviteModal();
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to invite batch'),
  });

  const bulkInviteMut = useMutation({
    mutationFn: async ({ examId, emails }) => {
      const results = await Promise.allSettled(emails.map(email => instructorApi.sendInvite(examId, email)));
      const ok  = results.filter(r => r.status === 'fulfilled').length;
      const err = results.filter(r => r.status === 'rejected').length;
      return { ok, err };
    },
    onSuccess: ({ ok, err }) => {
      if (ok > 0) toast.success(`${ok} invite${ok !== 1 ? 's' : ''} sent!`);
      if (err > 0) toast.error(`${err} invite${err !== 1 ? 's' : ''} failed`);
      closeInviteModal();
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
    },
    onError: () => toast.error('Failed to send invites'),
  });

  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupApi.getAll().then(r => r.data),
    enabled: showInviteModal,
  });

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
      </div>
    );
  }

  const {
    totalExams = 0, totalInvites = 0, acceptedInvites = 0,
    totalAttempts = 0, avgScore = 0, exams = []
  } = analyticsData || {};

  const pendingInvites = totalInvites - acceptedInvites;
  const totalPassCount = exams.reduce((a, e) => a + (e.stats?.passCount || 0), 0);
  const passRate = totalAttempts > 0 ? Math.round((totalPassCount / totalAttempts) * 100) : 0;

  // ── Chart data ──────────────────────────────────────────────────────────────
  const topExams = [...exams]
    .filter(e => (e.stats?.count || e.timesAttempted || 0) > 0)
    .sort((a, b) => (b.stats?.count || 0) - (a.stats?.count || 0))
    .slice(0, 6);

  const scoreBarData = {
    labels: topExams.map(e => e.title.length > 16 ? e.title.slice(0, 16) + '…' : e.title),
    datasets: [{
      label: 'Avg Score %',
      data: topExams.map(e => e.stats?.avgScore ? Math.round(e.stats.avgScore) : 0),
      backgroundColor: topExams.map(e => {
        const s = e.stats?.avgScore || 0;
        return s >= 70 ? `${c.green}cc` : s >= 50 ? `${c.amber}cc` : `${c.red}cc`;
      }),
      borderRadius: 6, borderSkipped: false,
    }],
  };

  const totalFail = totalAttempts - totalPassCount;
  const doughnutData = {
    labels: ['Passed', 'Failed'],
    datasets: [{
      data: [totalPassCount || 0, totalFail || 0],
      backgroundColor: [`${c.green}cc`, `${c.red}cc`],
      borderColor: [c.green, c.red],
      borderWidth: 2,
    }],
  };

  const chartBaseOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: c.surface, titleColor: c.text, bodyColor: c.muted, borderColor: c.grid, borderWidth: 1, cornerRadius: 8, padding: 10 },
    },
    scales: {
      x: { grid: { color: c.grid }, ticks: { color: c.muted, font: { size: 10 } } },
      y: { grid: { color: c.grid }, ticks: { color: c.muted, font: { size: 10 } }, beginAtZero: true, max: 100 },
    },
  };

  const openInviteFor = (exam) => {
    setSelectedExam(exam);
    setShowInviteModal(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 px-6 py-6 mb-6 shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <BookmarkCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white leading-tight">Instructor Dashboard</h1>
              <p className="text-sm text-teal-100 mt-0.5">Manage tests, track students, view performance analytics.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/instructor/analytics" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <BarChart2 size={14} /> Reports
            </Link>
            <Link to="/batches" className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <Users size={14} /> Batches
            </Link>
            <Link to="/create-exam" className="flex items-center gap-1.5 bg-white text-teal-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors shadow-sm">
              <Zap size={14} /> Create Test
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Tests',     value: totalExams,       icon: BookmarkCheck, gradient: 'from-teal-400 to-cyan-500' },
          { label: 'Students',  value: acceptedInvites,  icon: Users,         gradient: 'from-blue-400 to-indigo-500' },
          { label: 'Attempts',  value: totalAttempts,    icon: BarChart2,     gradient: 'from-cyan-400 to-teal-500' },
          { label: 'Avg Score', value: avgScore ? `${Math.round(avgScore)}%` : '—', icon: Trophy, gradient: 'from-amber-400 to-orange-500' },
          { label: 'Pass Rate', value: `${passRate}%`,   icon: Shield,        gradient: 'from-green-400 to-emerald-500' },
          { label: 'Pending',   value: pendingInvites,   icon: Clock,         gradient: 'from-sky-400 to-blue-500' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2.5 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-sm shrink-0`}>
              <s.icon size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-bold text-[var(--color-text)] leading-none truncate">{s.value}</div>
              <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Create Test',  icon: Zap,      to: '/create-exam',           color: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30' },
          { label: 'Create Batch', icon: Plus,     to: '/batches',               color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30' },
          { label: 'View Reports', icon: BarChart2, to: '/instructor/analytics', color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30' },
          { label: 'Certificates', icon: Trophy,   to: '/certificates',          color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30' },
        ].map(action => (
          <Link
            key={action.label}
            to={action.to}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border font-medium text-sm transition-colors ${action.color}`}
          >
            <action.icon size={16} className="shrink-0" />
            {action.label}
          </Link>
        ))}
      </div>

      {/* ── Charts ── */}
      {exams.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Pass vs Fail doughnut */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Pass vs Fail</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mb-4">Overall across all tests</p>
            <div style={{ height: 180 }}>
              <Doughnut data={doughnutData} options={{
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                  legend: { display: true, position: 'bottom', labels: { color: c.muted, font: { size: 11 }, boxWidth: 12, padding: 12 } },
                  tooltip: { backgroundColor: c.surface, titleColor: c.text, bodyColor: c.muted, borderColor: c.grid, borderWidth: 1, cornerRadius: 8 },
                },
              }} />
            </div>
            <div className="flex justify-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600">{totalPassCount}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Passed</p>
              </div>
              <div className="w-px bg-[var(--color-border)]" />
              <div className="text-center">
                <p className="text-lg font-bold text-red-500">{totalFail}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Failed</p>
              </div>
              <div className="w-px bg-[var(--color-border)]" />
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--color-primary)]">{passRate}%</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">Pass Rate</p>
              </div>
            </div>
          </div>

          {/* Avg Score per test bar */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Avg Score by Test</h3>
            <p className="text-[10px] text-[var(--color-text-muted)] mb-4">Top {topExams.length} tests by attempt count</p>
            {topExams.length === 0 ? (
              <div className="flex items-center justify-center h-[180px] text-sm text-[var(--color-text-muted)]">
                No attempt data yet
              </div>
            ) : (
              <div style={{ height: 180 }}>
                <Bar data={scoreBarData} options={{
                  ...chartBaseOpts,
                  scales: {
                    ...chartBaseOpts.scales,
                    y: { ...chartBaseOpts.scales.y, ticks: { ...chartBaseOpts.scales.y.ticks, callback: v => `${v}%` } },
                  },
                  plugins: { ...chartBaseOpts.plugins, legend: { display: false } },
                }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tests List ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[var(--color-text)] flex items-center gap-2 text-sm">
            <BarChart2 size={15} className="text-[var(--color-primary)]" /> Your Tests
            {exams.length > 0 && <span className="text-xs text-[var(--color-text-muted)] font-normal">({exams.length} total)</span>}
          </h2>
          <Link to="/create-exam" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Zap size={12} /> New Test
          </Link>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-16">
            <BookmarkCheck size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="font-medium text-[var(--color-text)] mb-1">No tests yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Create your first AI-powered test and invite your students.</p>
            <Link to="/create-exam" className="btn-primary px-5 py-2 inline-flex items-center gap-2 text-sm">
              <Zap size={14} /> Create Your First Test
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {exams.map(exam => (
              <div
                key={exam._id}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all hover:bg-[var(--color-bg-alt)]/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-[var(--color-text)] truncate">{exam.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-xs text-[var(--color-text-muted)]">{exam.subject} · {exam.difficulty}</span>
                    {exam.proctored && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0.5 rounded-full font-semibold">
                        <Shield size={8} /> Proctored
                      </span>
                    )}
                    {exam.certificate !== false && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
                        <Award size={8} /> Certificate
                      </span>
                    )}
                    {exam.allowReattempt && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">
                        <RefreshCw size={8} /> Reattempt
                      </span>
                    )}
                    {(exam.questions?.length || exam.questionCount) ? (
                      <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] px-1.5 py-0.5 rounded-full">
                        {exam.questions?.length || exam.questionCount}q
                      </span>
                    ) : null}
                    {exam.expiryDate && (() => {
                      const expired = new Date(exam.expiryDate) < new Date();
                      return expired ? (
                        <span className="flex items-center gap-0.5 text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded-full font-semibold">
                          <Timer size={9} /> Expired
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                          <Timer size={9} /> {new Date(exam.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <div className="text-xs font-bold text-[var(--color-text)]">{exam.inviteCount || 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Invited</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-bold text-[var(--color-primary)]">{exam.stats?.count || exam.timesAttempted || 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Attempts</div>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="text-xs font-bold text-teal-600">{exam.stats?.avgScore ? `${Math.round(exam.stats.avgScore)}%` : '—'}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Avg Score</div>
                  </div>
                  <div className="text-center hidden lg:block">
                    <div className="text-xs font-bold text-green-600">{exam.stats?.passCount ?? '—'}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Passed</div>
                  </div>
                  <div className="text-center hidden xl:block">
                    <div className="text-xs font-bold text-amber-600">
                      {exam.stats?.count ? `${Math.round((exam.stats.passCount / exam.stats.count) * 100)}%` : '—'}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Pass Rate</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditExam(exam)}
                    className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                    title="Edit test"
                  >
                    <Edit3 size={11} /> Edit
                  </button>
                  <button
                    onClick={() => navigate(`/instructor/report/${exam._id}`)}
                    className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                    title="View report"
                  >
                    <FileText size={11} /> Report
                  </button>
                  <button
                    onClick={() => openInviteFor(exam)}
                    className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                  >
                    <Mail size={11} /> Invite
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Invite Modal — two-column layout ── */}
      {showInviteModal && selectedExam && (
        <Modal onClose={closeInviteModal}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-3xl flex overflow-hidden" style={{ minHeight: '500px', maxHeight: '90vh' }}>

            {/* LEFT: Test details */}
            <div className="w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Test</p>
                <h4 className="font-bold text-sm text-[var(--color-text)] leading-snug">{selectedExam.title}</h4>
              </div>

              {/* Subject + Difficulty */}
              <div className="flex flex-wrap gap-1.5">
                {selectedExam.subject && (
                  <span className="text-[10px] font-semibold bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                    {selectedExam.subject}
                  </span>
                )}
                {selectedExam.difficulty && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${diffBadgeClass(selectedExam.difficulty)}`}>
                    {selectedExam.difficulty}
                  </span>
                )}
              </div>

              {/* Test settings */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Settings</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'AI Proctoring', value: selectedExam.proctored, icon: Shield },
                    { label: 'Reattempt', value: selectedExam.allowReattempt, icon: RefreshCw },
                    { label: 'Show Answers', value: selectedExam.showAnswersAfter, icon: Eye },
                    { label: 'Certificate', value: selectedExam.certificate !== false, icon: Award },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                        <item.icon size={11} className="shrink-0" /> {item.label}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.value
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                      }`}>
                        {item.value ? 'On' : 'Off'}
                      </span>
                    </div>
                  ))}
                  {selectedExam.passingPercentage != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-text-muted)]">Passing Score</span>
                      <span className="text-xs font-bold text-[var(--color-text)]">{selectedExam.passingPercentage}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry */}
              {selectedExam.expiryDate && (
                <div className="flex items-start gap-1.5">
                  <Timer size={11} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">Expires</p>
                    <p className="text-xs text-[var(--color-text)]">
                      {new Date(selectedExam.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {new Date(selectedExam.expiryDate) < new Date() && (
                      <p className="text-[10px] text-red-500 font-semibold mt-0.5">Expired</p>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Stats</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Invited',   value: selectedExam.inviteCount || 0, color: 'text-[var(--color-text)]' },
                    { label: 'Attempts',  value: selectedExam.stats?.count || selectedExam.timesAttempted || 0, color: 'text-[var(--color-primary)]' },
                    { label: 'Avg Score', value: selectedExam.stats?.avgScore ? `${Math.round(selectedExam.stats.avgScore)}%` : '—', color: 'text-teal-600' },
                    { label: 'Passed',    value: selectedExam.stats?.passCount ?? '—', color: 'text-green-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Invite form */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)] shrink-0">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)] text-base">Send Test Invite</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Invite students to attempt this test</p>
                </div>
                <button onClick={closeInviteModal} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] shrink-0">
                  <X size={18} className="text-[var(--color-text-muted)]" />
                </button>
              </div>

              {/* Mode toggle */}
              <div className="px-5 pt-4 shrink-0">
                <div className="flex gap-1 p-1 bg-[var(--color-bg-alt)] rounded-xl">
                  {[
                    { id: 'email', label: 'By Email', icon: Mail },
                    { id: 'group', label: 'By Batch', icon: Users },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setInviteMode(m.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                        inviteMode === m.id
                          ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      <m.icon size={14} /> {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form content */}
              <div className="flex flex-col flex-1 px-5 pt-4 pb-5 min-h-0">
                {inviteMode === 'email' ? (
                  <>
                    {/* Email sub-tabs */}
                    <div className="flex gap-3 mb-4 border-b border-[var(--color-border)] shrink-0">
                      {[
                        { id: 'single', label: 'Single Email' },
                        { id: 'bulk', label: 'Upload Excel / CSV' },
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setInviteEmailTab(t.id)}
                          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                            inviteEmailTab === t.id
                              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                              : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {inviteEmailTab === 'single' ? (
                      <div className="flex flex-col flex-1 min-h-0">
                        <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 shrink-0">Student Email Address</label>
                        <input
                          type="email"
                          placeholder="student@email.com"
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && inviteEmail) inviteMut.mutate({ examId: selectedExam._id, email: inviteEmail }); }}
                          className="input w-full shrink-0"
                          autoFocus
                        />
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-2 shrink-0">
                          The student will receive an email with a direct link to access this test.
                        </p>
                        <div className="flex gap-3 mt-auto shrink-0 pt-4">
                          <button onClick={closeInviteModal} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                          <button
                            onClick={() => inviteMut.mutate({ examId: selectedExam._id, email: inviteEmail })}
                            disabled={!inviteEmail || inviteMut.isPending}
                            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Mail size={14} /> {inviteMut.isPending ? 'Sending…' : 'Send Invite'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col flex-1 min-h-0">
                        <div
                          onClick={() => inviteFileRef.current?.click()}
                          className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-xl p-5 text-center cursor-pointer transition-colors shrink-0"
                        >
                          <Upload size={20} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
                          <p className="text-sm font-medium text-[var(--color-text)]">
                            {inviteFileName || 'Click to upload .xlsx / .xls / .csv'}
                          </p>
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                            Emails are extracted automatically from any column
                          </p>
                          <input ref={inviteFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleInviteFile} />
                        </div>
                        <button
                          onClick={downloadInviteSample}
                          className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline mt-2 shrink-0 w-fit"
                        >
                          <Download size={11} /> Download sample file
                        </button>
                        {inviteParsedEmails.length > 0 && (
                          <div className="flex-1 overflow-y-auto mt-3 min-h-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-medium text-[var(--color-text)]">{inviteParsedEmails.length} email{inviteParsedEmails.length !== 1 ? 's' : ''} found</span>
                              <button onClick={() => { setInviteParsedEmails([]); setInviteFileName(''); }} className="text-[11px] text-red-500 hover:underline">Clear</button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {inviteParsedEmails.map(e => (
                                <span key={e} className="inline-flex items-center gap-1 text-[11px] bg-[var(--color-bg-alt)] text-[var(--color-text)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                                  {e}
                                  <button onClick={() => setInviteParsedEmails(p => p.filter(x => x !== e))} className="hover:text-red-500"><X size={9} /></button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-3 mt-auto shrink-0 pt-3">
                          <button onClick={closeInviteModal} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                          <button
                            onClick={() => bulkInviteMut.mutate({ examId: selectedExam._id, emails: inviteParsedEmails })}
                            disabled={!inviteParsedEmails.length || bulkInviteMut.isPending}
                            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Mail size={14} /> {bulkInviteMut.isPending ? 'Sending…' : `Send ${inviteParsedEmails.length || ''} Invite${inviteParsedEmails.length !== 1 ? 's' : ''}`}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Batch tab */
                  <div className="flex flex-col flex-1 min-h-0">
                    <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 shrink-0">Select Batch</label>
                    {(groupsData?.groups || []).length === 0 ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center py-6 px-4">
                          <Users size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
                          <p className="text-sm text-[var(--color-text-muted)]">No batches yet.</p>
                          <Link to="/batches" onClick={closeInviteModal} className="text-xs text-[var(--color-primary)] hover:underline mt-1 inline-block">
                            Create a batch first
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <>
                        <select className="input w-full text-sm shrink-0" value={inviteGroupId} onChange={e => setInviteGroupId(e.target.value)}>
                          <option value="">Choose a batch…</option>
                          {(groupsData?.groups || []).map(g => (
                            <option key={g._id} value={g._id}>{g.name} ({g.members?.length || 0} members)</option>
                          ))}
                        </select>
                        {inviteGroupId && (
                          <p className="text-[11px] text-[var(--color-text-muted)] mt-2 shrink-0">
                            All members of this batch will receive a test invite for <strong className="text-[var(--color-text)]">{selectedExam.title}</strong>.
                          </p>
                        )}
                      </>
                    )}
                    <div className="flex gap-3 mt-auto shrink-0 pt-3">
                      <button onClick={closeInviteModal} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                      <button
                        onClick={() => groupInviteMut.mutate({ examId: selectedExam._id, groupId: inviteGroupId })}
                        disabled={!inviteGroupId || groupInviteMut.isPending}
                        className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Users size={14} /> {groupInviteMut.isPending ? 'Sending…' : 'Invite Batch'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Exam Modal */}
      {editExam && <EditExamModal exam={editExam} onClose={() => setEditExam(null)} />}
    </div>
  );
}
