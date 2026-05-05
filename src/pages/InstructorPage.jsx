import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award, BarChart2, BookmarkCheck,
  Download, Edit3,
  Eye, FileText,
  Layers,
  LayoutDashboard,
  LifeBuoy, Mail, RefreshCw,
  Settings, Shield,
  Timer, Trash2, Upload, Users, X, Zap
} from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EditExamModal from '../components/EditExamModal.jsx';
import Modal from '../components/Modal.jsx';
import { examApi, groupApi, instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

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

  const [selectedExam, setSelectedExam] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMode, setInviteMode] = useState('email');
  const [inviteEmailTab, setInviteEmailTab] = useState('single');
  const [inviteGroupId, setInviteGroupId] = useState('');
  const [inviteParsedEmails, setInviteParsedEmails] = useState([]);
  const [inviteFileName, setInviteFileName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editExam, setEditExam] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  const deleteExamMut = useMutation({
    mutationFn: (examId) => examApi.delete(examId),
    onSuccess: () => {
      toast.success('Test deleted');
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
      qc.invalidateQueries({ queryKey: ['myExams'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete test'),
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

  const { exams = [] } = analyticsData || {};

  const openInviteFor = (exam) => {
    setSelectedExam(exam);
    setShowInviteModal(true);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 px-6 py-6 mb-8 shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <BookmarkCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white leading-tight">Instructor hub</h1>
              <p className="text-sm text-teal-100 mt-0.5">
                Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Create tests, invite students, and review outcomes from here.
              </p>
            </div>
          </div>
          <Link to="/create-exam" className="flex items-center gap-1.5 bg-white text-teal-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors shadow-sm self-start sm:self-center">
            <Zap size={14} /> New test
          </Link>
        </div>
      </div>

      {/* ── Navigation hub ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Create test', desc: 'Generate a new exam', icon: Zap, to: '/create-exam', accent: 'from-teal-400 to-cyan-500' },
          { label: 'All tests', desc: 'Browse and manage tests', icon: BookmarkCheck, to: '/tests', accent: 'from-blue-400 to-indigo-500' },
          { label: 'Test reports', desc: 'Analytics and attempts', icon: BarChart2, to: '/test-reports', accent: 'from-violet-400 to-purple-500' },
          { label: 'Batches', desc: 'Groups and invites', icon: Users, to: '/batches', accent: 'from-sky-400 to-blue-500' },
          { label: 'Insights', desc: 'Student performance notes', icon: LayoutDashboard, to: '/instructor/performance', accent: 'from-emerald-400 to-teal-500' },
          { label: 'Certificates', desc: 'Issued certificates', icon: Award, to: '/certificates', accent: 'from-amber-400 to-orange-500' },
          { label: 'Settings', desc: 'Security and preferences', icon: Settings, to: '/settings', accent: 'from-slate-400 to-slate-600' },
          { label: 'Help & tickets', desc: 'Support requests', icon: LifeBuoy, to: '/tickets', accent: 'from-rose-400 to-pink-500' },
        ].map(item => (
          <Link
            key={item.to + item.label}
            to={item.to}
            className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex gap-3 transition-all hover:border-[var(--color-primary)]/35 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.accent} flex items-center justify-center shadow-sm shrink-0 group-hover:opacity-95`}>
              <item.icon size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--color-text)] text-sm">{item.label}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

            {/* ── Tests List ── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-[var(--color-text)] flex items-center gap-2 text-sm">
              <BarChart2 size={15} className="text-[var(--color-primary)]" /> Your Tests
              {exams.length > 0 && <span className="text-xs text-[var(--color-text-muted)] font-normal">({exams.length} total)</span>}
            </h2>

          </div>
          <Link to="/create-exam" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 self-start">
            <Zap size={12} /> New Test
          </Link>
        </div>

        {exams.length === 0 ? (
          <div className="text-center py-16">
            <BookmarkCheck size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="font-medium text-[var(--color-text)] mb-1">No tests yet</p>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Create your first test and invite students when you’re ready.</p>
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
                    {exam.certificate !== false && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
                        <Award size={8} /> Certificate
                      </span>
                    )}
                    {exam.proctored && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 px-1.5 py-0.5 rounded-full font-semibold">
                        <Shield size={8} /> Proctored
                      </span>
                    )}
                    {exam.multipleSets && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-1.5 py-0.5 rounded-full font-semibold">
                        <Layers size={8} /> Multiple Sets
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

                <div className="hidden lg:flex items-center gap-4 xl:gap-5 shrink-0 flex-wrap justify-end">
                  <div className="text-center min-w-[3rem]">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{exam.stats?.passCount ?? 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Passed</div>
                  </div>
                  <div className="text-center min-w-[3rem]">
                    <div className="text-xs font-bold text-red-600 dark:text-red-400">{exam.stats?.failCount ?? 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Failed</div>
                  </div>
                  <div className="text-center min-w-[3rem]">
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400">{exam.stats?.notAttempted ?? 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Remaining</div>
                  </div>
                  <div className="text-center min-w-[3rem]">
                    <div className="text-xs font-bold text-[var(--color-primary)]">{exam.stats?.count ?? 0}</div>
                    <div className="text-[10px] text-[var(--color-text-muted)]">Students</div>
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
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(exam)}
                    disabled={deleteExamMut.isPending}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Delete test"
                  >
                    <Trash2 size={14} />
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
                    { label: 'Proctoring', value: selectedExam.proctored, icon: Shield },
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Activity</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'Students', value: selectedExam.stats?.count ?? selectedExam.timesAttempted ?? 0, color: 'text-[var(--color-primary)]', hint: 'unique learners' },
                  ].map(s => (
                    <div key={s.label} className="bg-[var(--color-bg)] rounded-lg p-2 text-center">
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{s.label}{s.hint ? ` · ${s.hint}` : ''}</p>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => !deleteExamMut.isPending && setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const id = deleteTarget._id;
          deleteExamMut.mutate(id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
        title="Delete this test?"
        description={deleteTarget ? `“${deleteTarget.title}” will be removed. Invites and reports for this test will be affected. This cannot be undone.` : ''}
        confirmLabel="Delete test"
        isPending={deleteExamMut.isPending}
      />
    </div>
  );
}
