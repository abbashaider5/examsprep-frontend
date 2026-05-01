import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Award, BookOpen, Camera, CheckCircle, Clock, Code2, Edit3, Eye, EyeOff, FileText, FlipHorizontal, FolderOpen, Globe, Lock, Mail, Percent, Plus, RefreshCw, Search, Shield, Sparkles, Timer, Users, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import FeedbackModal, { shouldShowFeedback, trackFeedbackInteraction } from '../components/FeedbackModal.jsx';
import Modal from '../components/Modal.jsx';
import { examApi, instructorApi, resourceApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const schema = z.object({
  title: z.string().min(3, 'Title too short'),
  subject: z.string().min(2, 'Subject too short'),
  numQuestions: z.number().int().min(5),
});

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} disabled={disabled} onChange={onChange} />
      <div className="w-9 h-5 bg-[var(--color-border)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]" />
    </label>
  );
}

function ResourcePickerModal({ resources, loading, selected, onSelect, onClose, title }) {
  const [q, setQ] = useState('');
  const filtered = loading ? [] : (resources || []).filter(r =>
    !q || r.title.toLowerCase().includes(q.toLowerCase()) || r.originalName?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[var(--color-primary)]" />
            <span className="font-semibold text-[var(--color-text)] text-sm">{title}</span>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={18} />
          </button>
        </div>
        {/* Search */}
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              autoFocus
              className="input pl-8 text-sm"
              placeholder="Search resources…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={20} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
              <FileText size={28} className="mb-2 opacity-40" />
              <p className="text-sm">{q ? 'No matching resources' : 'No resources available'}</p>
            </div>
          ) : filtered.map(r => {
            const isSelected = selected === r._id;
            return (
              <button
                key={r._id}
                type="button"
                onClick={() => { onSelect(r._id); onClose(); }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors border-b border-[var(--color-border)] last:border-0 ${isSelected ? 'bg-[var(--color-primary)]/8 dark:bg-[var(--color-primary)]/10' : 'hover:bg-[var(--color-surface-hover)]'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-alt)] text-[var(--color-primary)]'}`}>
                  <FileText size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-[var(--color-text)] truncate">{r.title}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                    {r.originalName}{r.pages ? ` · ${r.pages} pages` : ''}{r.group?.name ? ` · ${r.group.name}` : ''}
                  </p>
                </div>
                {isSelected && <CheckCircle size={16} className="shrink-0 text-[var(--color-primary)]" />}
              </button>
            );
          })}
        </div>
        {/* Footer count */}
        {!loading && (
          <div className="px-5 py-3 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)]">
            {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Modal>
  );
}

function InstructorPostCreationModal({ exam, onClose }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('Enter a valid email'); return; }
    if (emails.includes(e)) { toast.error('Already added'); return; }
    setEmails(prev => [...prev, e]);
    setEmailInput('');
  };

  const removeEmail = (e) => setEmails(prev => prev.filter(x => x !== e));

  const handleSendInvites = async () => {
    if (emails.length === 0) { toast.error('Add at least one email'); return; }
    setSending(true);
    const results = [];
    for (const email of emails) {
      try {
        await instructorApi.sendInvite(exam._id, email);
        results.push({ email, ok: true });
      } catch {
        results.push({ email, ok: false });
      }
    }
    setSent(results);
    setSending(false);
    const ok = results.filter(r => r.ok).length;
    if (ok > 0) toast.success(`${ok} invite${ok !== 1 ? 's' : ''} sent`);
  };

  if (sent.length > 0) {
    return (
      <Modal onClose={onClose}>
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 w-full max-w-md">
          <h3 className="font-bold text-[var(--color-text)] text-lg mb-4">Invites Sent</h3>
          <div className="space-y-2 mb-5">
            {sent.map(r => (
              <div key={r.email} className={`flex items-center gap-2 text-sm ${r.ok ? 'text-green-600' : 'text-red-500'}`}>
                {r.ok ? <CheckCircle size={14} /> : <X size={14} />}
                {r.email}
                <span className="text-xs ml-auto">{r.ok ? 'Sent' : 'Failed'}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate(`/exam/${exam._id}`)} className="btn-primary flex-1 text-sm py-2">Attempt Exam</button>
            <button onClick={onClose} className="btn-secondary flex-1 text-sm py-2">Dashboard</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--color-text)] text-lg">Exam Created!</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={18} /></button>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-5">
          <span className="font-medium text-[var(--color-text)]">{exam.title}</span> is ready. What would you like to do?
        </p>
        {mode === null && (
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/exam/${exam._id}/edit-questions`)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-[var(--color-primary)] bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                <Edit3 size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--color-text)]">Review & Edit Questions</p>
                <p className="text-xs text-[var(--color-text-muted)]">View all generated questions and make edits</p>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode('invite')} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all">
                <Users size={22} className="text-[var(--color-primary)]" />
                <span className="font-semibold text-sm text-[var(--color-text)]">Invite Users</span>
                <span className="text-xs text-[var(--color-text-muted)] text-center">Send email invites</span>
              </button>
              <button onClick={() => navigate(`/exam/${exam._id}`)} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all">
                <Sparkles size={22} className="text-[var(--color-primary)]" />
                <span className="font-semibold text-sm text-[var(--color-text)]">Attempt Exam</span>
                <span className="text-xs text-[var(--color-text-muted)] text-center">Take the exam now</span>
              </button>
            </div>

            <button onClick={onClose} className="btn-secondary w-full text-sm py-2">
              Close — go to Dashboard
            </button>
          </div>
        )}
        {mode === 'invite' && (
          <div className="space-y-4">
            <button onClick={() => setMode(null)} className="text-xs text-[var(--color-text-muted)] hover:underline flex items-center gap-1">&larr; Back</button>
            <div>
              <label className="label text-xs mb-1">Add email addresses</label>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" type="email" placeholder="user@example.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())} />
                <button onClick={addEmail} className="btn-secondary p-2 shrink-0"><Plus size={16} /></button>
              </div>
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {emails.map(e => (
                  <span key={e} className="flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                    <Mail size={11} /> {e} <button onClick={() => removeEmail(e)} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={handleSendInvites} disabled={sending || emails.length === 0} className="btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-1.5 disabled:opacity-60">
                {sending ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</> : <><Mail size={14} /> Send {emails.length > 0 ? `${emails.length} ` : ''}Invite{emails.length !== 1 ? 's' : ''}</>}
              </button>
              <button onClick={() => navigate(`/exam/${exam._id}`)} className="btn-secondary text-sm py-2 px-3">Skip</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function CreateExamPage() {
  const parseDurationInput = (value) => {
    const raw = value.trim();
    if (!raw) return null;
    const parts = raw.split(':');
    if (parts.length === 1) {
      const secs = Number(parts[0]);
      return Number.isInteger(secs) && secs >= 0 ? secs : null;
    }
    if (parts.length === 2) {
      const mins = Number(parts[0]);
      const secs = Number(parts[1]);
      if (!Number.isInteger(mins) || !Number.isInteger(secs) || mins < 0 || secs < 0 || secs > 59) return null;
      return (mins * 60) + secs;
    }
    return null;
  };

  const formatDurationLabel = (totalSeconds) => {
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m${secs > 0 ? ` ${secs}s` : ''}`;
  };

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const planMaxQ = user?.plan === 'enterprise' ? 100 : user?.plan === 'pro' ? 50 : 20;
  const isFreePlan = !user?.plan || user.plan === 'free';
  const isEnterprise = user?.plan === 'enterprise';
  const isInstructor = user?.isInstructor || ['instructor', 'admin'].includes(user?.role);
  const remaining = user?.remaining ?? null;

  const [form, setForm] = useState({
    title: '', subject: '', numQuestions: 10, topics: '',
    proctored: false, examType: 'mcq', timePerQuestionInput: '',
  });
  const [advanced, setAdvanced] = useState({
    allowReattempt: false,
    showFlashcards: false,
    showReview: false,
    certificateEnabled: false,
    passingPercentage: 75,
    screenshotEnabled: true,
    enableCoding: false,
    allowCodeExecution: false,
    showResultToUser: false,
    showAnswersToUser: false,
    expiryDate: '',
  });
  // source: 'ai' | 'examprep' | 'myresources'
  const [source, setSource] = useState('ai');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [createdExam, setCreatedExam] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Queries for resource dropdowns
  const { data: adminResourcesData, isLoading: adminResLoading } = useQuery({
    queryKey: ['adminResourcesForCreate'],
    queryFn: () => resourceApi.getAdminResources().then(r => r.data),
    enabled: isInstructor && source === 'examprep',
    staleTime: 2 * 60 * 1000,
  });
  const { data: myResourcesData, isLoading: myResLoading } = useQuery({
    queryKey: ['myResourcesForCreate'],
    queryFn: () => resourceApi.getMyResources().then(r => r.data),
    enabled: isInstructor && source === 'myresources',
    staleTime: 2 * 60 * 1000,
  });

  const createMut = useMutation({
    mutationFn: (data) => examApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['myExams'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Exam created!');
      trackFeedbackInteraction();
      if (isInstructor) {
        setCreatedExam(res.data.exam);
        if (shouldShowFeedback()) setTimeout(() => setShowFeedback(true), 3000);
      } else {
        navigate(`/exam/${res.data.exam._id}`);
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create exam'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = schema.safeParse({ ...form, numQuestions: Number(form.numQuestions) });
    if (!result.success) {
      const fe = {};
      result.error.errors.forEach(e => { fe[e.path[0]] = e.message; });
      setErrors(fe);
      return;
    }
    if (isInstructor && (source === 'examprep' || source === 'myresources') && !selectedResourceId) {
      setErrors({ resource: 'Please select a resource' });
      return;
    }
    const numQ = Number(form.numQuestions);
    if (numQ > planMaxQ) {
      setErrors({ numQuestions: `Your ${user?.plan || 'free'} plan allows up to ${planMaxQ} questions.` });
      return;
    }
    const pp = Number(advanced.passingPercentage);
    if (isNaN(pp) || pp < 1 || pp > 100) {
      setErrors({ passingPercentage: 'Must be between 1 and 100' });
      return;
    }
    const timePerQuestion = parseDurationInput(form.timePerQuestionInput);
    if (timePerQuestion === null) {
      setErrors({ time: 'Enter time as ss or mm:ss (example: 90 or 01:30)' });
      return;
    }
    if (timePerQuestion < 10) {
      setErrors({ time: 'Minimum time is 10 seconds' });
      return;
    }
    setErrors({});
    const topics = form.topics.split(',').map(t => t.trim()).filter(Boolean);
    const examType = advanced.enableCoding ? 'coding' : form.examType;
    const payload = {
      title: form.title,
      subject: form.subject,
      numQuestions: numQ,
      topics,
      proctored: form.proctored,
      examType,
      timePerQuestion,
      ...((source === 'examprep' || source === 'myresources') && selectedResourceId ? { resourceId: selectedResourceId } : {}),
    };
    if (isInstructor) Object.assign(payload, { ...advanced, examType, timePerQuestion, passingPercentage: pp, expiryDate: advanced.expiryDate || null });
    createMut.mutate(payload);
  };

  const adv = (key) => (val) => setAdvanced(a => ({ ...a, [key]: val }));
  const setF = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const timeTotal = parseDurationInput(form.timePerQuestionInput);

  const SOURCES = [
    { value: 'ai',          icon: Globe,       label: 'Web',                   desc: 'Generate from AI knowledge' },
    { value: 'examprep',    icon: BookOpen,    label: 'ExamPrep AI Resources', desc: 'Admin-curated materials' },
    { value: 'myresources', icon: FolderOpen,  label: 'My Resources',          desc: 'Your uploaded files' },
  ];

  // Resolved resource lists
  const adminResources = adminResourcesData?.resources || [];
  const myResources = myResourcesData?.resources || [];
  const activeResources = source === 'examprep' ? adminResources : myResources;
  const activeResLoading = source === 'examprep' ? adminResLoading : myResLoading;
  const selectedResource = activeResources.find(r => r._id === selectedResourceId);

  const EXAM_TYPES = [
    { value: 'mcq', label: 'MCQ', desc: 'Multiple choice', icon: '☑' },
    { value: 'descriptive', label: 'Descriptive', desc: 'Open-ended written', icon: '✍' },
    { value: 'mixed', label: 'Mixed', desc: 'MCQ + Descriptive', icon: '⚡' },
    { value: 'coding', label: 'Coding', desc: 'Code challenges', icon: '</>', enterpriseOnly: true },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 px-6 py-5 mb-8 shadow-md">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles size={20} /> Create New Exam</h1>
          <p className="text-teal-100 text-sm mt-1">AI will generate your questions instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Form ── */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">

            {/* ── Exam Type ── */}
            {(isInstructor || isEnterprise) && (
              <div>
                <label className="label mb-2">Exam Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EXAM_TYPES.map(et => (
                    <button
                      key={et.value}
                      type="button"
                      onClick={() => {
                        if (et.enterpriseOnly && !isEnterprise) {
                          toast('Coding exams require Enterprise plan', { icon: '🔒' });
                          navigate('/pricing');
                          return;
                        }
                        setF('examType')(et.value);
                        if (et.value === 'coding') adv('enableCoding')(true);
                        else adv('enableCoding')(false);
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all ${et.enterpriseOnly && !isEnterprise ? 'opacity-60 cursor-not-allowed' : ''} ${(form.examType === et.value && !advanced.enableCoding) || (et.value === 'coding' && advanced.enableCoding) ? 'border-[var(--color-primary)] bg-blue-50/50 dark:bg-blue-900/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}`}
                    >
                      <span className="text-lg">{et.icon}</span>
                      <span className="text-xs font-semibold text-[var(--color-text)] flex items-center gap-1">
                        {et.label}
                        {et.enterpriseOnly && !isEnterprise && <Lock size={11} className="text-[var(--color-text-muted)]" />}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {et.enterpriseOnly && !isEnterprise ? 'Enterprise only' : et.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Exam Title</label>
                <input className="input" placeholder="e.g., Python Fundamentals Quiz" value={form.title} onChange={e => setF('title')(e.target.value)} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="label">Subject</label>
                <input className="input" placeholder="e.g., Python, Biology, History" value={form.subject} onChange={e => setF('subject')(e.target.value)} />
                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label flex items-center gap-1.5"><Clock size={12} /> Time per Question</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="mm:ss (e.g., 01:30)"
                      value={form.timePerQuestionInput}
                      onChange={e => setF('timePerQuestionInput')(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 flex items-center gap-1">
                  <Timer size={9} />
                  {timeTotal === null ? 'Use ss or mm:ss format' : `${formatDurationLabel(timeTotal)} per question`}
                </p>
                {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
              </div>
              <div>
                <label className="label">Questions (5–{planMaxQ})</label>
                <input className="input" type="number" min={5} max={planMaxQ} value={form.numQuestions} onChange={e => setF('numQuestions')(e.target.value)} />
                {errors.numQuestions && <p className="text-red-500 text-xs mt-1">{errors.numQuestions}</p>}
                {isFreePlan && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Free: up to {planMaxQ}. <Link to="/pricing" className="text-[var(--color-primary)] hover:underline">Upgrade</Link>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Topics (optional, comma-separated)</label>
              <input className="input" placeholder="e.g., loops, functions, OOP" value={form.topics} onChange={e => setF('topics')(e.target.value)} />
            </div>

            {/* ── Question Source (instructors only) ── */}
            {isInstructor && (
              <div>
                <label className="label mb-2">Question Generate Source</label>

                {/* 3 source cards */}
                <div className="grid grid-cols-3 gap-2">
                  {SOURCES.map(s => {
                    const Icon = s.icon;
                    const active = source === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => { setSource(s.value); setSelectedResourceId(''); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-alt)] text-[var(--color-primary)]'}`}>
                          <Icon size={15} />
                        </div>
                        <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{s.label}</span>
                        <span className="text-[9px] text-[var(--color-text-muted)] leading-tight">{s.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Resource picker — shown for examprep and myresources */}
                {(source === 'examprep' || source === 'myresources') && (
                  <div className="mt-3">
                    {selectedResource ? (
                      /* Selected file chip */
                      <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5">
                        <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                          <FileText size={13} className="text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">{selectedResource.title}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)] truncate">{selectedResource.originalName}{selectedResource.pages ? ` · ${selectedResource.pages} pages` : ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowResourceModal(true)}
                          className="text-xs text-[var(--color-primary)] hover:underline shrink-0"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedResourceId('')}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      /* Pick button */
                      <button
                        type="button"
                        onClick={() => setShowResourceModal(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/60 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all"
                      >
                        <Search size={14} />
                        Browse &amp; select a resource…
                      </button>
                    )}
                    {errors.resource && <p className="text-red-500 text-xs mt-1.5">{errors.resource}</p>}
                  </div>
                )}

                {/* Notice: resource-based generation takes longer */}
                {(source === 'examprep' || source === 'myresources') && selectedResourceId && (
                  <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                    <Clock size={13} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      AI will analyse your resource document to generate questions. This may take a little longer than usual.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* AI Proctoring toggle */}
            <div className={`rounded-xl border ${form.proctored ? 'border-[var(--color-primary)] bg-blue-50/40 dark:bg-blue-900/10' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'} transition-all`}>
              <div className={`flex items-center gap-3 p-4 ${isFreePlan ? 'opacity-60' : ''}`}>
                <ToggleSwitch checked={form.proctored} disabled={isFreePlan} onChange={e => !isFreePlan && setF('proctored')(e.target.checked)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text)] flex items-center gap-2">
                    <Shield size={14} className="text-[var(--color-primary)]" />
                    Enable AI Proctoring
                    {isFreePlan && <Lock size={13} className="text-[var(--color-text-muted)]" />}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {isFreePlan
                      ? <><Link to="/pricing" className="text-[var(--color-primary)] hover:underline font-medium">Upgrade to Pro</Link> to unlock AI Proctoring.</>
                      : 'Webcam monitoring, tab-switch detection, violation tracking.'
                    }
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={createMut.isPending || remaining === 0} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {createMut.isPending ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating questions…</>
              ) : remaining === 0 ? (
                <><Lock size={16} /> No exams remaining — Upgrade your plan</>
              ) : (
                <><Sparkles size={16} /> Generate Exam with AI</>
              )}
            </button>
          </form>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-4">
          {isInstructor ? (
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
                <Shield size={14} className="text-[var(--color-primary)]" />
                Advanced Settings
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Control candidate experience for this exam.</p>

              <div className="space-y-1">
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <RefreshCw size={12} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Allow Reattempt</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Candidates can retake</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={advanced.allowReattempt} onChange={e => adv('allowReattempt')(e.target.checked)} />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <FlipHorizontal size={12} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Show Flashcards</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Study mode available</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={advanced.showFlashcards} onChange={e => adv('showFlashcards')(e.target.checked)} />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <Eye size={12} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Show Answer Review</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">After exam completion</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={advanced.showReview} onChange={e => adv('showReview')(e.target.checked)} />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                      <Award size={12} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Generate Certificate</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">PDF on pass</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={advanced.certificateEnabled} onChange={e => adv('certificateEnabled')(e.target.checked)} />
                </div>

                <div className={`flex items-center justify-between py-2 border-b border-[var(--color-border)] ${!form.proctored ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                      <Camera size={12} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Screenshot Capture</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{!form.proctored ? 'Requires proctoring' : 'Random snapshots'}</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={advanced.screenshotEnabled && form.proctored} disabled={!form.proctored} onChange={e => adv('screenshotEnabled')(e.target.checked)} />
                </div>

                {!isEnterprise && (
                  <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)] opacity-60">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                        <Code2 size={12} className="text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-medium text-[var(--color-text)]">Coding Questions</p>
                          <Lock size={10} className="text-[var(--color-text-muted)]" />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]"><Link to="/pricing" className="text-[var(--color-primary)] hover:underline">Enterprise only</Link></p>
                      </div>
                    </div>
                    <ToggleSwitch checked={false} disabled={true} onChange={() => {}} />
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                      <Eye size={12} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Show Result</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Candidate sees score</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={advanced.showResultToUser} onChange={e => adv('showResultToUser')(e.target.checked)} />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                      <EyeOff size={12} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Show Answers</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">Full AI feedback</p>
                    </div>
                  </div>
                  <ToggleSwitch checked={advanced.showAnswersToUser} onChange={e => adv('showAnswersToUser')(e.target.checked)} />
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                      <Percent size={12} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)]">Passing Score</p>
                      {errors.passingPercentage && <p className="text-red-500 text-[10px]">{errors.passingPercentage}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="number" min={1} max={100} value={advanced.passingPercentage} onChange={e => adv('passingPercentage')(e.target.value)} className="input w-14 text-xs text-center py-1" />
                    <span className="text-xs text-[var(--color-text-muted)]">%</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                        <Timer size={12} className="text-rose-600 dark:text-rose-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[var(--color-text)]">Set Expiry Date</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{advanced.expiryDate ? 'Test expires at set time' : 'Lifetime (no expiry)'}</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={!!advanced.expiryDate}
                      onChange={e => adv('expiryDate')(e.target.checked ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) : '')}
                    />
                  </div>
                  {advanced.expiryDate && (
                    <input
                      type="datetime-local"
                      className="input w-full text-xs mt-1"
                      value={advanced.expiryDate}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={e => adv('expiryDate')(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {remaining !== null && (
                <div className={`card ${remaining === 0 ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Monthly Usage</p>
                  <div className="flex items-end justify-between mb-2">
                    <span className={`text-2xl font-bold ${remaining === 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text)]'}`}>{remaining}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">/ {user?.monthlyLimit ?? 3} exams</span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-alt)] rounded-full h-1.5 mb-3">
                    <div className={`h-1.5 rounded-full transition-all ${remaining === 0 ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${Math.max(0, 100 - (remaining / (user?.monthlyLimit ?? 3)) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-3 capitalize">{user?.plan || 'free'} plan</p>
                  {remaining === 0 ? (
                    <Link to="/pricing" className="btn-primary text-xs py-1.5 w-full text-center block">Upgrade to continue</Link>
                  ) : isFreePlan ? (
                    <Link to="/pricing" className="text-xs text-[var(--color-primary)] font-semibold hover:underline">Upgrade for more exams &rarr;</Link>
                  ) : null}
                </div>
              )}

              <div className="card">
                <p className="text-xs font-semibold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[var(--color-primary)]" /> Tips for better results
                </p>
                <ul className="space-y-2 text-xs text-[var(--color-text-muted)]">
                  {[
                    'Be specific with topic (e.g., "Python loops" not "Python")',
                    'Comma-separate topics to cover more ground',
                    'Enable proctoring for high-stakes exams',
                    'Upgrade to instructor plan to use resource-based generation',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[var(--color-primary)] font-bold shrink-0">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Instructor: info cards below grid ── */}
      {isInstructor && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          {remaining !== null && (
            <div className={`card ${remaining === 0 ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Monthly Usage</p>
              <div className="flex items-end justify-between mb-2">
                <span className={`text-2xl font-bold ${remaining === 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text)]'}`}>{remaining}</span>
                <span className="text-xs text-[var(--color-text-muted)]">/ {user?.monthlyLimit ?? 3} exams</span>
              </div>
              <div className="w-full bg-[var(--color-bg-alt)] rounded-full h-1.5 mb-3">
                <div className={`h-1.5 rounded-full transition-all ${remaining === 0 ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${Math.max(0, 100 - (remaining / (user?.monthlyLimit ?? 3)) * 100)}%` }} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] capitalize">{user?.plan || 'free'} plan</p>
              {remaining === 0 && <Link to="/pricing" className="btn-primary text-xs py-1.5 w-full text-center block mt-2">Upgrade to continue</Link>}
            </div>
          )}

          <div className="card bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-text)] mb-1">Resource-based Generation</p>
                <p className="text-xs text-[var(--color-text-muted)]">Select ExamPrep AI or My Resources as source to generate questions strictly from your uploaded material.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
              <Sparkles size={13} className="text-[var(--color-primary)]" /> Tips for better results
            </p>
            <ul className="space-y-2 text-xs text-[var(--color-text-muted)]">
              {[
                'Use Descriptive type for written exams',
                'Mixed type combines MCQ + open-ended questions',
                'Set custom time per question for your audience',
                'Upload PDFs for curriculum-aligned questions',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-[var(--color-primary)] font-bold shrink-0">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {createdExam && (
        <InstructorPostCreationModal exam={createdExam} onClose={() => { setCreatedExam(null); navigate('/dashboard'); }} />
      )}

      {showFeedback && (
        <FeedbackModal trigger="exam_created" onClose={() => setShowFeedback(false)} />
      )}

      {/* Resource picker modal */}
      {showResourceModal && (
        <ResourcePickerModal
          resources={activeResources}
          loading={activeResLoading}
          selected={selectedResourceId}
          onSelect={setSelectedResourceId}
          onClose={() => setShowResourceModal(false)}
          title={source === 'examprep' ? 'ExamPrep AI Resources' : 'My Resources'}
        />
      )}
    </div>
  );
}
