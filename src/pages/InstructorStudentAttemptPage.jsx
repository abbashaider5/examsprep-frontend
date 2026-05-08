import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowLeft, BarChart2, Camera, Clock, FileText, Lightbulb, Shield,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { getDashboardPath } from '../utils/dashboardPath.js';
import { normalizeAnswers } from '../utils/normalizeAnswers.js';

function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function InstructorStudentAttemptPage() {
  const { examId, userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const returnTo = searchParams.get('returnTo');

  const [answerOverrides, setAnswerOverrides] = useState({});

  const { data: studentData, isLoading, error } = useQuery({
    queryKey: ['studentExamReport', examId, userId],
    queryFn: () => instructorApi.getStudentExamReport(examId, userId).then((r) => r.data),
    enabled: !!examId && !!userId,
  });

  const reevalMut = useMutation({
    mutationFn: ({ resultId, overrides }) => instructorApi.reevaluateResult(resultId, { overrides }),
    onSuccess: () => {
      toast.success('Scores updated');
      qc.invalidateQueries({ queryKey: ['studentExamReport', examId, userId] });
      qc.invalidateQueries({ queryKey: ['examReport', examId] });
      setAnswerOverrides({});
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update scores'),
  });

  useEffect(() => {
    setAnswerOverrides({});
  }, [userId, studentData?.latestResult?._id]);

  const mergedAnswers = useMemo(() => {
    const ans = normalizeAnswers(studentData?.latestResult?.answers);
    return ans.map((a) => {
      const o = answerOverrides[a.questionIndex];
      return {
        ...a,
        isCorrect: o && Object.prototype.hasOwnProperty.call(o, 'isCorrect') ? o.isCorrect : a.isCorrect,
        aiScore: o && o.aiScore !== undefined ? o.aiScore : a.aiScore,
      };
    });
  }, [studentData?.latestResult?.answers, answerOverrides]);

  const proctoringSummary = useMemo(() => {
    const events = studentData?.latestResult?.proctoringEvents || [];
    const byType = events.reduce((acc, ev) => {
      const key = ev?.type || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const warningCount = events.filter((e) => e?.severity === 'warning').length;
    const criticalCount = events.filter((e) => e?.severity === 'critical').length;
    const score = (criticalCount * 3) + warningCount + (byType.fullscreen_exit || 0) + (byType.tab_switch || 0) + (byType.multiple_faces || 0) + (byType.audio_voice || 0) + (byType.audio_noise || 0);
    const riskLevel = score >= 12 ? 'High Risk' : score >= 6 ? 'Medium Risk' : 'Low Risk';
    return { byType, warningCount, criticalCount, riskLevel };
  }, [studentData?.latestResult?.proctoringEvents]);

  const goBack = () => {
    if (returnTo) {
      try {
        const path = decodeURIComponent(returnTo);
        if (path.startsWith('/') && !path.startsWith('//')) {
          navigate(path);
          return;
        }
      } catch {
        /* fall through */
      }
    }
    navigate(examId ? `/instructor/report/${examId}?view=candidates` : '/test-reports');
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
        <h2 className="font-bold text-[var(--color-text)] text-lg mb-2">Could not load attempt</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">{error?.response?.data?.message || 'Something went wrong.'}</p>
        <button type="button" onClick={goBack} className="btn-secondary px-5 py-2.5 text-sm inline-flex items-center gap-2">
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  const displayName = studentData.student?.name || studentData.student?.email || 'Student';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={goBack}
          className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Student attempt</p>
          <h1 className="text-xl font-extrabold text-[var(--color-text)] truncate">{displayName}</h1>
          <p className="text-xs text-[var(--color-text-muted)] truncate">
            {studentData.exam?.title} · {studentData.exam?.subject}
          </p>
        </div>
        <Link to={getDashboardPath(user?.role)} className="text-xs text-[var(--color-primary)] hover:underline shrink-0 hidden sm:inline">
          Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Latest score', value: studentData.latestResult ? `${studentData.latestResult.percentage}%` : '—', color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
          { label: 'Correct', value: studentData.latestResult ? studentData.latestResult.correctCount : '—', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Incorrect', value: studentData.latestResult ? studentData.latestResult.incorrectCount : '—', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map((s) => (
          <div key={s.label} className="card p-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
              <BarChart2 size={14} className={s.color} />
            </div>
            <div className={`text-xl font-bold mt-2 ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-6">
        <h3 className="font-semibold text-sm text-[var(--color-text)] mb-2 flex items-center gap-2">
          <Lightbulb size={14} className="text-[var(--color-primary)]" /> Recommendation
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">{studentData.recommendation?.summary || '—'}</p>
        {Array.isArray(studentData.recommendation?.tips) && studentData.recommendation.tips.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs text-[var(--color-text-muted)]">
            {studentData.recommendation.tips.slice(0, 5).map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)] shrink-0">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mergedAnswers.length > 0 && Array.isArray(studentData.exam?.questions) && studentData.exam.questions.length > 0 && (
        <div className="card p-4 mb-6">
          <h3 className="font-semibold text-sm text-[var(--color-text)] mb-1 flex items-center gap-2">
            <FileText size={14} className="text-[var(--color-primary)]" /> Questions &amp; answers
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Override scoring for this attempt, then save.</p>
          <div className="space-y-3">
            {mergedAnswers.map((a) => {
              const q = studentData.exam.questions[a.questionIndex];
              if (!q) return null;
              const showScore = q.type === 'descriptive' || q.type === 'coding';
              return (
                <div key={a.questionIndex} className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-bg-alt)]">
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${a.isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {a.isCorrect ? '✓' : '✕'}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-sm font-medium text-[var(--color-text)]">{q.question}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                        <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">{(q.type || 'mcq').toUpperCase()}</span>
                        {q.topic && <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">{q.topic}</span>}
                        {typeof a.timeTaken === 'number' && a.timeTaken > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">
                            <Clock size={10} className="shrink-0 opacity-70" />
                            {fmtTime(a.timeTaken)}
                          </span>
                        )}
                        {typeof a.aiScore === 'number' && <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">Score {a.aiScore}/100</span>}
                      </div>
                      {(q.type === 'mcq' || !q.type) && Array.isArray(q.options) && (
                        <p className="text-xs text-[var(--color-text)]">
                          <span className="text-[var(--color-text-muted)]">Submitted: </span>
                          {a.selectedOption != null && a.selectedOption !== undefined
                            ? (q.options[a.selectedOption] || `Option ${Number(a.selectedOption) + 1}`)
                            : '—'}
                        </p>
                      )}
                      {q.type === 'descriptive' && (
                        <p className="text-xs text-[var(--color-text)] whitespace-pre-wrap border border-[var(--color-border)] rounded-lg p-2 bg-[var(--color-surface)]">{a.textAnswer?.trim() ? a.textAnswer : '—'}</p>
                      )}
                      {q.type === 'coding' && (
                        <pre className="text-[11px] text-[var(--color-text)] whitespace-pre-wrap border border-[var(--color-border)] rounded-lg p-2 bg-[var(--color-surface)] overflow-x-auto max-h-40">{a.code || '—'}</pre>
                      )}
                      {q.type === 'mcq' && Array.isArray(q.options) && q.correctAnswer != null && q.options[q.correctAnswer] && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          <span className="font-semibold text-[var(--color-text)]">Correct: </span>
                          {q.options[q.correctAnswer]}
                        </p>
                      )}
                      {a.aiFeedback && (
                        <p className="text-xs text-[var(--color-text-muted)] whitespace-pre-wrap border-l-2 border-[var(--color-primary)]/40 pl-2">{a.aiFeedback}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Mark</span>
                        <button
                          type="button"
                          onClick={() => setAnswerOverrides((prev) => ({
                            ...prev,
                            [a.questionIndex]: { ...prev[a.questionIndex], isCorrect: true },
                          }))}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${a.isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 'border-[var(--color-border)] hover:border-green-400'}`}
                        >
                          Correct
                        </button>
                        <button
                          type="button"
                          onClick={() => setAnswerOverrides((prev) => ({
                            ...prev,
                            [a.questionIndex]: { ...prev[a.questionIndex], isCorrect: false },
                          }))}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${!a.isCorrect ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300' : 'border-[var(--color-border)] hover:border-red-400'}`}
                        >
                          Incorrect
                        </button>
                        {showScore && (
                          <label className="flex items-center gap-1.5 text-xs ml-auto">
                            <span className="text-[var(--color-text-muted)]">Score /100</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="input w-16 py-1 text-xs"
                              value={typeof a.aiScore === 'number' && !Number.isNaN(a.aiScore) ? a.aiScore : ''}
                              placeholder="—"
                              onChange={(e) => {
                                const v = e.target.value;
                                setAnswerOverrides((prev) => ({
                                  ...prev,
                                  [a.questionIndex]: {
                                    ...prev[a.questionIndex],
                                    aiScore: v === '' ? undefined : Math.max(0, Math.min(100, Number(v))),
                                  },
                                }));
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={reevalMut.isPending || !studentData.latestResult?._id}
              onClick={() => {
                const orig = normalizeAnswers(studentData.latestResult.answers);
                const overrides = [];
                for (const ans of orig) {
                  const o = answerOverrides[ans.questionIndex];
                  if (!o) continue;
                  const row = { questionIndex: ans.questionIndex };
                  if (Object.prototype.hasOwnProperty.call(o, 'isCorrect') && o.isCorrect !== ans.isCorrect) {
                    row.isCorrect = o.isCorrect;
                  }
                  if (o.aiScore !== undefined && o.aiScore !== ans.aiScore) {
                    row.aiScore = o.aiScore;
                  }
                  if (row.isCorrect !== undefined || row.aiScore !== undefined) overrides.push(row);
                }
                if (!overrides.length) {
                  toast.error('Change at least one question before saving');
                  return;
                }
                reevalMut.mutate({ resultId: studentData.latestResult._id, overrides });
              }}
              className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {reevalMut.isPending ? 'Saving…' : 'Save scoring changes'}
            </button>
            <p className="text-[11px] text-[var(--color-text-muted)]">Updates overall percentage and pass/fail from your marks.</p>
          </div>
        </div>
      )}

      {studentData?.latestResult?.proctoringEvents?.length > 0 && (
        <div className="card p-4 mb-6">
          <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Shield size={14} className="text-[var(--color-primary)]" /> Proctoring logs
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="rounded-lg border border-[var(--color-border)] p-2 bg-[var(--color-bg-alt)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">Risk level</p>
              <p className="text-xs font-semibold text-[var(--color-text)]">{proctoringSummary.riskLevel}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-2 bg-[var(--color-bg-alt)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">Warnings</p>
              <p className="text-xs font-semibold text-[var(--color-text)]">{proctoringSummary.warningCount}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-2 bg-[var(--color-bg-alt)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">Critical</p>
              <p className="text-xs font-semibold text-[var(--color-text)]">{proctoringSummary.criticalCount}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] p-2 bg-[var(--color-bg-alt)]">
              <p className="text-[10px] text-[var(--color-text-muted)]">Total Events</p>
              <p className="text-xs font-semibold text-[var(--color-text)]">{(studentData?.latestResult?.proctoringEvents || []).length}</p>
            </div>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {studentData.latestResult.proctoringEvents.slice(-120).reverse().map((ev, idx) => (
              <div key={`${ev.timestamp || idx}-${idx}`} className="border border-[var(--color-border)] rounded-xl p-2.5 bg-[var(--color-bg-alt)]">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold ${
                    ev.severity === 'critical'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : ev.severity === 'warning'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}
                  >
                    {ev.severity || 'info'}
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN') : '—'}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text)] mt-1.5">{ev.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {studentData?.screenshots?.length > 0 && (
        <div className="card p-4">
          <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3 flex items-center gap-2">
            <Camera size={14} className="text-[var(--color-primary)]" /> Screenshots
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {studentData.screenshots.slice(0, 24).map((ss) => (
              <div key={ss._id} className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-alt)]">
                <div className="aspect-[4/3] bg-black">
                  <img src={ss.imageUrl || ss.imageData} alt="screenshot" className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  {ss.eventType && (
                    <p className="text-[10px] font-semibold text-[var(--color-text)] mb-0.5">
                      {ss.eventType.replace(/_/g, ' ')}
                    </p>
                  )}
                  <p className="text-[10px] text-[var(--color-text-muted)]">
                    {new Date(ss.capturedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {ss.eventMessage && (
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{ss.eventMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
