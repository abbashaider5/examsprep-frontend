import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Award, Camera, CheckCircle, Code2, Eye, EyeOff, FlipHorizontal, Lock, Mail, Percent, Plus, RefreshCw, Shield, Sparkles, Users, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import FeedbackModal, { shouldShowFeedback, trackFeedbackInteraction } from '../components/FeedbackModal.jsx';
import { examApi, instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const schema = z.object({
  title: z.string().min(3, 'Title too short'),
  subject: z.string().min(2, 'Subject too short'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-[var(--color-bg)] rounded-2xl shadow-2xl p-6 w-full max-w-md">
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
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--color-bg)] rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--color-text)] text-lg">Exam Created!</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={18} /></button>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-5">
          <span className="font-medium text-[var(--color-text)]">{exam.title}</span> is ready. What would you like to do?
        </p>
        {mode === null && (
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
    </div>
  );
}

export default function CreateExamPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const planMaxQ = user?.plan === 'enterprise' ? 100 : user?.plan === 'pro' ? 50 : 20;
  const isFreePlan = !user?.plan || user.plan === 'free';
  const isEnterprise = user?.plan === 'enterprise';
  const isInstructor = user?.isInstructor || ['instructor', 'admin'].includes(user?.role);
  const remaining = user?.remaining ?? null;

  const [form, setForm] = useState({
    title: '', subject: '', difficulty: 'medium', numQuestions: 10, topics: '', proctored: false,
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
  });
  const [errors, setErrors] = useState({});
  const [createdExam, setCreatedExam] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const createMut = useMutation({
    mutationFn: (data) => examApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['myExams'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['me'] }); // refresh remaining exam count
      toast.success('Exam created!');
      trackFeedbackInteraction(); // count creating an exam as an interaction
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
    setErrors({});
    const topics = form.topics.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { ...form, numQuestions: numQ, topics };
    if (isInstructor) Object.assign(payload, { ...advanced, passingPercentage: pp });
    createMut.mutate(payload);
  };

  const adv = (key) => (val) => setAdvanced(a => ({ ...a, [key]: val }));

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-violet-50/30 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-violet-900/5 border border-blue-100 dark:border-blue-900/30 px-6 py-5 mb-8">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-200/30 dark:bg-indigo-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Create New Exam</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">AI will generate your questions instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Form ── */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">

            {/* ── Coding Questions — TOP (Enterprise instructors) ── */}
            {isInstructor && isEnterprise && (
              <div className={`rounded-xl border-2 transition-all ${advanced.enableCoding ? 'border-purple-400 bg-purple-50/40 dark:bg-purple-900/10' : 'border-[var(--color-border)]'}`}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                    <Code2 size={15} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--color-text)]">Coding Questions</span>
                      <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold">Enterprise</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">Code-writing questions into the exam, evaluated by AI</p>
                  </div>
                  <ToggleSwitch checked={advanced.enableCoding} onChange={e => adv('enableCoding')(e.target.checked)} />
                </div>
                {advanced.enableCoding && (
                  <div className="border-t border-purple-200 dark:border-purple-700 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Sparkles size={13} className="text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">Allow Code Execution</p>
                        <p className="text-xs text-[var(--color-text-muted)]">Candidates can run their code in a browser sandbox</p>
                      </div>
                    </div>
                    <ToggleSwitch checked={advanced.allowCodeExecution} onChange={e => adv('allowCodeExecution')(e.target.checked)} />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Exam Title</label>
                <input className="input" placeholder="e.g., Python Fundamentals Quiz" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="label">Subject</label>
                <input className="input" placeholder="e.g., Python, Biology, History" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label">Difficulty</label>
                <select className="input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                  <option value="easy">Easy (45s/question)</option>
                  <option value="medium">Medium (75s/question)</option>
                  <option value="hard">Hard (120s/question)</option>
                </select>
              </div>
              <div>
                <label className="label">Questions (5–{planMaxQ})</label>
                <input className="input" type="number" min={5} max={planMaxQ} value={form.numQuestions} onChange={e => setForm(f => ({ ...f, numQuestions: e.target.value }))} />
                {errors.numQuestions && <p className="text-red-500 text-xs mt-1">{errors.numQuestions}</p>}
                {isFreePlan && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Free plan: up to {planMaxQ} questions. <Link to="/pricing" className="text-[var(--color-primary)] hover:underline">Upgrade</Link> for more.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label">Topics (optional, comma-separated)</label>
              <input className="input" placeholder="e.g., loops, functions, OOP" value={form.topics} onChange={e => setForm(f => ({ ...f, topics: e.target.value }))} />
            </div>

            {/* AI Proctoring toggle with benefits */}
            <div className={`rounded-xl border ${form.proctored ? 'border-[var(--color-primary)] bg-blue-50/40 dark:bg-blue-900/10' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'} transition-all`}>
              <div className={`flex items-center gap-3 p-4 ${isFreePlan ? 'opacity-60' : ''}`}>
                <ToggleSwitch checked={form.proctored} disabled={isFreePlan} onChange={e => !isFreePlan && setForm(f => ({ ...f, proctored: e.target.checked }))} />
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
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating questions...</>
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
            /* ── Instructor: Advanced Settings in sidebar ── */
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2">
                <Shield size={14} className="text-[var(--color-primary)]" />
                Advanced Settings
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] px-2 py-0.5 rounded-full font-semibold">Instructor</span>
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Control candidate experience for this exam.</p>

              <div className="space-y-1">
                {/* Reattempt */}
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

                {/* Flashcards */}
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

                {/* Review */}
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

                {/* Certificate */}
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

                {/* Screenshot */}
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

                {/* Coding Questions — locked for non-Enterprise */}
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

                {/* Show Result */}
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

                {/* Show Answers */}
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

                {/* Passing Percentage */}
                <div className="flex items-center justify-between py-2">
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
              </div>
            </div>
          ) : (
            /* ── Non-instructor: info cards in sidebar ── */
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

              {isEnterprise && (
                <div className="card border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
                  <div className="flex items-start gap-2">
                    <Code2 size={15} className="mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text)] mb-1">Coding Questions Available</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Use the coding toggle above to code-writing questions. AI evaluates submissions automatically.</p>
                    </div>
                  </div>
                </div>
              )}

              {!isEnterprise && (
                <div className="card bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text)] mb-1">MCQ Format</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Multiple-choice questions. <Link to="/pricing" className="text-[var(--color-primary)] hover:underline">Upgrade to Enterprise</Link> for coding questions with AI evaluation.</p>
                    </div>
                  </div>
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
                    'Hard difficulty gives longer time per question',
                    'Enable proctoring for high-stakes exams',
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

          {isEnterprise ? (
            <div className="card border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
              <div className="flex items-start gap-2">
                <Code2 size={15} className="mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text)] mb-1">Coding Questions Available</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Toggle coding mode in the form. AI evaluates submissions automatically.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text)] mb-1">MCQ Format</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Multiple-choice questions. <Link to="/pricing" className="text-[var(--color-primary)] hover:underline">Upgrade to Enterprise</Link> for coding questions.</p>
                </div>
              </div>
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
                'Hard difficulty gives longer time per question',
                'Enable proctoring for high-stakes exams',
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
    </div>
  );
}
