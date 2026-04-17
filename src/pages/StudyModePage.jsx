import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, CheckCircle,
  FlipHorizontal,
  Lightbulb, Mail, Plus, RotateCcw, Search, TrendingUp,
  UserCheck,
  Users, X
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { examApi, instructorApi, resultApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

// ── Invite modal ──────────────────────────────────────────────────────────────
function InviteModal({ exam, onClose }) {
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('Enter a valid email'); return; }
    if (emails.includes(e)) { toast.error('Already added'); return; }
    setEmails(prev => [...prev, e]);
    setEmailInput('');
  };

  const sendAll = async () => {
    if (emails.length === 0) { toast.error('Add at least one email'); return; }
    setSending(true);
    const out = [];
    for (const email of emails) {
      try {
        await instructorApi.sendInvite(exam._id, email);
        out.push({ email, ok: true });
      } catch (err) {
        out.push({ email, ok: false, msg: err.response?.data?.message || 'Failed' });
      }
    }
    setSending(false);
    setResults(out);
    const ok = out.filter(r => r.ok).length;
    if (ok) toast.success(`${ok} invite${ok !== 1 ? 's' : ''} sent`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg)] rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-[var(--color-text)] text-base">Invite to Exam</h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={18} /></button>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{exam.title}</p>

        {results ? (
          <>
            <div className="space-y-2 mb-5">
              {results.map(r => (
                <div key={r.email} className={`flex items-center gap-2 text-sm ${r.ok ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                  {r.ok ? <CheckCircle size={14} /> : <X size={14} />}
                  <span className="flex-1 truncate">{r.email}</span>
                  <span className="text-xs shrink-0">{r.ok ? 'Sent' : r.msg}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-secondary w-full text-sm py-2">Done</button>
          </>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              <input
                className="input flex-1 text-sm"
                type="email"
                placeholder="user@example.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              />
              <button onClick={addEmail} className="btn-secondary p-2 shrink-0"><Plus size={16} /></button>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {emails.map(e => (
                  <span key={e} className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                    <Mail size={10} /> {e}
                    <button onClick={() => setEmails(prev => prev.filter(x => x !== e))} className="ml-0.5 hover:text-red-500"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={sendAll}
              disabled={sending || emails.length === 0}
              className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sending
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                : <><Mail size={14} /> Send {emails.length > 0 ? `${emails.length} ` : ''}Invite{emails.length !== 1 ? 's' : ''}</>
              }
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudyModePage() {
  const { user } = useAuthStore();
  const { data } = useQuery({ queryKey: ['myExams'], queryFn: () => examApi.getAll().then(r => r.data) });
  const { data: resultsData } = useQuery({ queryKey: ['myResults'], queryFn: () => resultApi.getAll().then(r => r.data) });
  const { data: acceptedInvitesData } = useQuery({
    queryKey: ['myAcceptedInvites'],
    queryFn: () => instructorApi.getMyAcceptedInvites().then(r => r.data),
  });

  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null); // invite object if it's an invited exam
  const [examData, setExamData] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState('flashcard');
  const [inviteExam, setInviteExam] = useState(null);
  const [search, setSearch] = useState('');

  const ownExams = data?.exams || [];
  const results = resultsData?.results || [];
  const acceptedInvites = acceptedInvitesData?.invites || [];
  const isInstructor = user?.isInstructor || ['instructor', 'admin'].includes(user?.role);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  // Merge: own exams + invited exams (avoid duplicates — own exam takes priority)
  const ownExamIds = new Set(ownExams.map(e => e._id));
  const invitedEntries = acceptedInvites
    .filter(inv => !ownExamIds.has(inv.exam?._id))
    .map(inv => ({ ...inv.exam, _inviteId: inv._id, _invitedBy: inv.invitedBy?.name, _isInvited: true, _inviteDate: inv.createdAt }));

  const allExams = [...ownExams, ...invitedEntries];

  const q = search.trim().toLowerCase();
  const filteredExams = q
    ? allExams.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.subject?.toLowerCase().includes(q) ||
        e.difficulty?.toLowerCase().includes(q)
      )
    : allExams;

  // Build per-exam attempt stats
  const examStats = results.reduce((acc, r) => {
    const id = r.exam?._id || r.exam;
    if (!id) return acc;
    if (!acc[id]) acc[id] = { count: 0, best: 0, correct: 0, total: 0, lastAttemptAt: null };
    acc[id].count += 1;
    acc[id].best = Math.max(acc[id].best, r.percentage);
    acc[id].correct += r.correctCount || 0;
    acc[id].total += r.totalQuestions || 0;
    const attemptDate = r.createdAt || r.attemptedAt;
    if (attemptDate && (!acc[id].lastAttemptAt || new Date(attemptDate) > new Date(acc[id].lastAttemptAt))) {
      acc[id].lastAttemptAt = attemptDate;
    }
    return acc;
  }, {});

  const loadExam = async (exam) => {
    const res = await examApi.getById(exam._id);
    setExamData(res.data.exam);
    setSelectedExam(exam);
    // Find matching invite for this exam (if invited)
    const inv = exam._isInvited ? acceptedInvites.find(i => i.exam?._id === exam._id) : null;
    setSelectedInvite(inv || null);
    setCardIndex(0);
    setFlipped(false);
  };

  const exitStudy = () => {
    setSelectedExam(null);
    setSelectedInvite(null);
    setExamData(null);
  };

  if (!selectedExam) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <BookOpen size={24} className="text-[var(--color-primary)]" />
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Study Mode</h1>
            </div>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">Choose an exam to study with flashcards or review mode.</p>
          </div>
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by title, subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 pr-8 text-sm w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {allExams.length === 0 ? (
          <div className="card text-center py-16">
            <BookOpen size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="text-[var(--color-text-muted)]">No exams yet. Create one first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Search size={32} className="mx-auto mb-3 text-[var(--color-border)]" />
                <p className="text-[var(--color-text-muted)] text-sm">No exams match your search.</p>
              </div>
            ) : filteredExams.map(e => {
              const stats = examStats[e._id];
              const attempted = !!stats;
              const isInvited = !!e._isInvited;
              const showFlashcards = isInvited ? e.showFlashcards !== false : true;
              const showReview = isInvited ? e.showReview !== false : true;
              const allowReattempt = isInvited ? e.allowReattempt !== false : true;
              const hasStudyMode = showFlashcards || showReview;

              return (
                <div
                  key={e._id + (e._inviteId || '')}
                  className="card hover:shadow-md transition-all hover:border-[var(--color-primary)] hover:-translate-y-0.5 group flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-alt)] flex items-center justify-center">
                      <BookOpen size={18} className="text-[var(--color-primary)]" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isInvited && (
                        <span className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                          <UserCheck size={10} /> Invited
                        </span>
                      )}
                      <span className={`badge capitalize ${e.difficulty === 'easy' ? 'bg-green-100 text-green-700' : e.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {e.difficulty}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-[var(--color-text)] mb-1 group-hover:text-[var(--color-primary)] transition-colors">{e.title}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">{e.subject}</p>
                  {isInvited && e._invitedBy && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">From: {e._invitedBy}</p>
                  )}
                  {stats?.lastAttemptAt ? (
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">Last attempt: {fmtDate(stats.lastAttemptAt)}</p>
                  ) : isInvited && e._inviteDate ? (
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">Invited: {fmtDate(e._inviteDate)}</p>
                  ) : e.createdAt ? (
                    <p className="text-xs text-[var(--color-text-muted)] mb-2">Created: {fmtDate(e.createdAt)}</p>
                  ) : null}

                  {/* Restriction chips for invited exams */}
                  {isInvited && (!showFlashcards || !showReview) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {!showFlashcards && (
                        <span className="text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">No flashcards</span>
                      )}
                      {!showReview && (
                        <span className="text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">No review</span>
                      )}
                    </div>
                  )}

                  {/* Attempt stats */}
                  {attempted ? (
                    <div className="border-t border-[var(--color-border)] pt-3 mt-auto grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-xs font-bold text-[var(--color-primary)]">{stats.count}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">Attempts</div>
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${stats.best >= 75 ? 'text-green-500' : 'text-amber-500'}`}>{stats.best}%</div>
                        <div className="text-xs text-[var(--color-text-muted)]">Best</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--color-text)]">{stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%</div>
                        <div className="text-xs text-[var(--color-text-muted)]">Accuracy</div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-[var(--color-border)] pt-3 mt-auto flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-border)]" />
                      <span className="text-xs text-[var(--color-text-muted)]">Not attempted yet</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    {/* Attempt/Reattempt button */}
                    {(!isInvited || allowReattempt) && (
                      <Link
                        to={`/exam/${e._id}`}
                        className="flex-1 text-center text-xs bg-[var(--color-primary)] text-white rounded-lg py-1.5 font-medium hover:opacity-90 transition-opacity"
                      >
                        {attempted ? 'Reattempt' : 'Attempt'}
                      </Link>
                    )}
                    {/* Study button */}
                    {hasStudyMode ? (
                      <button
                        onClick={() => loadExam(e)}
                        className="flex-1 text-center text-xs btn-secondary py-1.5 font-medium"
                      >
                        Study
                      </button>
                    ) : (
                      <span className="flex-1 text-center text-xs text-[var(--color-text-muted)] py-1.5">No study mode</span>
                    )}
                    {isInstructor && !isInvited && (
                      <button
                        onClick={() => setInviteExam(e)}
                        className="shrink-0 p-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
                        title="Invite users"
                      >
                        <Users size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {inviteExam && <InviteModal exam={inviteExam} onClose={() => setInviteExam(null)} />}
      </div>
    );
  }

  // ── Study view ────────────────────────────────────────────────────────────
  const questions = examData?.questions || [];
  // const q = questions[cardIndex];

  // Determine available modes based on invite settings
  const isInvitedExam = !!selectedExam._isInvited;
  const showFlashcardsMode = isInvitedExam ? selectedExam.showFlashcards !== false : true;
  const showReviewMode = isInvitedExam ? selectedExam.showReview !== false : true;

  const availableModes = [
    showFlashcardsMode && { id: 'flashcard', icon: FlipHorizontal, label: 'Flashcards' },
    showReviewMode && { id: 'practice', icon: TrendingUp, label: 'Review' },
  ].filter(Boolean);

  // Reset mode if current mode is not available
  const currentMode = availableModes.find(m => m.id === mode) ? mode : availableModes[0]?.id;

  if (availableModes.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-[var(--color-text)] text-lg">{selectedExam.title}</h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Invited Exam</p>
          </div>
          <button onClick={exitStudy} className="btn-secondary text-xs py-1.5 px-3">← Back</button>
        </div>
        <div className="card text-center py-16">
          <BookOpen size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="text-[var(--color-text-muted)]">Study mode is not available for this exam.</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">The instructor has disabled flashcards and review for this exam.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-[var(--color-text)] text-lg">{selectedExam.title}</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Study Mode · {questions.length} questions</p>
        </div>
        <button onClick={exitStudy} className="btn-secondary text-xs py-1.5 px-3">← Back</button>
      </div>

      <div className="flex gap-2 mb-6">
        {availableModes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full transition-all ${currentMode === m.id ? 'bg-[var(--color-primary)] text-white' : 'btn-secondary'}`}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      {currentMode === 'flashcard' && q && (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-3">
            <span>Card {cardIndex + 1} of {questions.length}</span>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === cardIndex ? 'bg-[var(--color-primary)] w-4' : 'bg-[var(--color-border)] w-1.5'}`} />
              ))}
            </div>
          </div>

          <div
            className="card min-h-52 flex flex-col items-center justify-center cursor-pointer select-none hover:shadow-md transition-all text-center mb-4 border-2 hover:border-[var(--color-primary)]"
            onClick={() => setFlipped(f => !f)}
          >
            {!flipped ? (
              <div>
                <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">Question</div>
                <p className="text-[var(--color-text)] text-base sm:text-lg font-medium leading-relaxed">{q.question}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-6 flex items-center justify-center gap-1"><FlipHorizontal size={12} /> Tap to reveal answer</p>
              </div>
            ) : (
              <div>
                <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-3">Answer</div>
                <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold px-4 py-2 rounded-xl mb-3">
                  <CheckCircle size={15} />
                  {q.options[q.correctAnswer]}
                </div>
                {q.explanation && <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-md">{q.explanation}</p>}
                <p className="text-xs text-[var(--color-text-muted)] mt-4 flex items-center justify-center gap-1"><RotateCcw size={12} /> Tap to see question</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button className="btn-secondary text-sm px-4" onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setFlipped(false); }} disabled={cardIndex === 0}>← Prev</button>
            <button onClick={() => setFlipped(f => !f)} className="btn-secondary p-2.5 rounded-xl"><RotateCcw size={15} /></button>
            <button className="btn-primary text-sm px-4" onClick={() => { setCardIndex(i => Math.min(questions.length - 1, i + 1)); setFlipped(false); }} disabled={cardIndex === questions.length - 1}>Next →</button>
          </div>
        </div>
      )}

      {currentMode === 'practice' && q && (
        <div className="max-w-2xl space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Q {cardIndex + 1} / {questions.length}</span>
              {q.topic && <span className="badge bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">{q.topic}</span>}
            </div>
            <p className="font-medium text-[var(--color-text)] mb-4 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-sm border-2 flex items-center gap-3 ${
                    i === q.correctAnswer
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === q.correctAnswer ? 'bg-green-500 text-white' : 'bg-[var(--color-bg-alt)]'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {i === q.correctAnswer && <CheckCircle size={15} className="shrink-0" />}
                </div>
              ))}
            </div>
            {q.explanation && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl flex items-start gap-2">
                <Lightbulb size={14} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--color-text)] leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <button className="btn-secondary text-sm" onClick={() => setCardIndex(i => Math.max(0, i - 1))} disabled={cardIndex === 0}>← Prev</button>
            <span className="text-xs text-[var(--color-text-muted)]">{cardIndex + 1} / {questions.length}</span>
            <button className="btn-primary text-sm" onClick={() => setCardIndex(i => Math.min(questions.length - 1, i + 1))} disabled={cardIndex === questions.length - 1}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
