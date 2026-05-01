import { useQuery } from '@tanstack/react-query';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import {
  CheckCircle, Clock, Code2, Download, Eye, EyeOff,
  Lightbulb, MinusCircle, Shield, Target, Trophy, XCircle, Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Link, useLocation, useParams } from 'react-router-dom';
import FeedbackModal, { shouldShowFeedback, trackFeedbackInteraction } from '../components/FeedbackModal.jsx';
import { resultApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ResultPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const isInstructor = ['instructor', 'admin'].includes(user?.role);
  const [showFeedback, setShowFeedback] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['result', id],
    queryFn: () => resultApi.getById(id).then(r => r.data),
    enabled: !state?.result,
  });

  const result = state?.result || data?.result;

  useEffect(() => {
    if (result && isAuthenticated) {
      trackFeedbackInteraction();
      if (shouldShowFeedback()) {
        const t = setTimeout(() => setShowFeedback(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [result, isAuthenticated]);

  if (isLoading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const {
    percentage, passed, correctCount, incorrectCount, unattemptedCount,
    timeTaken, topicAccuracy, certificate, questions, answers, xpEarned,
    showResultToUser, showAnswersToUser, terminatedByProctoring,
  } = result;

  // Instructor has hidden the result
  if (showResultToUser === false) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="card">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-alt)] flex items-center justify-center mx-auto mb-4">
            <EyeOff size={28} className="text-[var(--color-text-muted)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">Result Not Available</h1>
          <p className="text-[var(--color-text-muted)] text-sm mb-1">Your exam has been submitted successfully.</p>
          <p className="text-[var(--color-text-muted)] text-sm mb-6">
            The instructor has chosen to keep results private. You will be notified when results are released.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/dashboard" className="btn-secondary text-sm">Back to Dashboard</Link>
            {isInstructor && <Link to="/create-exam" className="btn-primary text-sm">Create New Exam</Link>}
          </div>
        </div>
      </div>
    );
  }

  const donutData = {
    labels: ['Correct', 'Incorrect', 'Unattempted'],
    datasets: [{
      data: [correctCount, incorrectCount, unattemptedCount],
      backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'],
      borderWidth: 0,
    }],
  };

  const mins = Math.floor((timeTaken || 0) / 60);
  const secs = (timeTaken || 0) % 60;
  const total = (correctCount || 0) + (incorrectCount || 0) + (unattemptedCount || 0);
  const topicEntries = topicAccuracy ? Object.entries(topicAccuracy) : [];
  const passColor = passed ? '#22c55e' : '#ef4444';
  const passGradient = passed
    ? 'from-green-50 via-emerald-50/60 to-teal-50/40 dark:from-green-900/20 dark:via-emerald-900/10 dark:to-teal-900/5 border-green-100 dark:border-green-900/30'
    : 'from-red-50 via-rose-50/60 to-orange-50/40 dark:from-red-900/20 dark:via-rose-900/10 dark:to-orange-900/5 border-red-100 dark:border-red-900/30';
  const blobColor = passed ? 'bg-green-200/30 dark:bg-green-700/10' : 'bg-red-200/30 dark:bg-red-700/10';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

      {/* ── Proctoring Termination Banner ──────────────────────────────────── */}
      {terminatedByProctoring && (
        <div className="mb-5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-5 py-4 flex items-start gap-3">
          <Shield size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">Exam Terminated — Proctoring Violation</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">
              This exam was automatically submitted after repeated proctoring violations were detected. The result reflects your progress at the time of termination.
            </p>
          </div>
        </div>
      )}

      {/* ── Hero Card ─────────────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${passGradient} border px-6 py-6 mb-6`}>
        <div className={`absolute -top-10 -right-10 w-48 h-48 ${blobColor} rounded-full blur-3xl pointer-events-none`} />
        <div className="relative flex flex-col sm:flex-row items-center gap-6">

          {/* Score circle */}
          <div className="text-center shrink-0">
            <div className="text-[3.5rem] font-extrabold leading-none" style={{ color: passColor }}>
              {percentage}%
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: `${passColor}18`, color: passColor }}>
              {passed ? '🏆 PASSED' : '💪 NOT PASSED'}
            </div>
            {xpEarned > 0 && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                <Zap size={11} /> +{xpEarned} XP
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px self-stretch bg-[var(--color-border)]" />

          {/* Quick stats */}
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 flex-1">
            <div className="text-center">
              <div className="text-xl font-bold text-green-500">{correctCount}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-500">{incorrectCount}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Wrong</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-slate-400">{unattemptedCount}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[var(--color-text)]">{total}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">Total</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[var(--color-primary)]">{mins}m {secs}s</div>
              <div className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-0.5 justify-center"><Clock size={9} />Time</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <Link to="/dashboard" className="btn-secondary text-sm">Dashboard</Link>
            {isInstructor && <Link to="/create-exam" className="btn-primary text-sm">New Exam</Link>}
          </div>
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">

        {/* ── Left Column: analytics ── */}
        <div className="space-y-4">

          {/* Doughnut */}
          <div className="card">
            <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <Target size={14} className="text-[var(--color-primary)]" /> Score Breakdown
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 shrink-0">
                <Doughnut
                  data={donutData}
                  options={{
                    plugins: { legend: { display: false } },
                    cutout: '68%',
                  }}
                />
              </div>
              <div className="space-y-2 flex-1">
                {[
                  { label: 'Correct', value: correctCount, color: 'bg-green-500' },
                  { label: 'Wrong', value: incorrectCount, color: 'bg-red-500' },
                  { label: 'Skipped', value: unattemptedCount, color: 'bg-slate-300 dark:bg-slate-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                    <span className="text-[var(--color-text-muted)] flex-1">{label}</span>
                    <span className="font-bold text-[var(--color-text)]">{value}</span>
                    <span className="text-[var(--color-text-muted)]">({total > 0 ? Math.round((value / total) * 100) : 0}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Certificate */}
          {certificate && (
            <div className="card border-[var(--color-primary)]/30 bg-blue-50/60 dark:bg-blue-900/10">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold mb-2 text-sm">
                <Trophy size={14} /> Certificate Earned!
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3 font-mono">ID: {certificate.certId}</p>
              <div className="flex gap-2">
                <a
                  href={`/api/certificates/download/${certificate.certId}`}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-1 justify-center"
                  target="_blank" rel="noreferrer"
                >
                  <Download size={12} /> Download PDF
                </a>
                <Link to={`/verify/${certificate.certId}`} className="btn-secondary text-xs py-1.5 px-3">Verify</Link>
              </div>
            </div>
          )}

          {/* Topic Accuracy */}
          {topicEntries.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
                <Target size={14} className="text-[var(--color-primary)]" /> Topic Accuracy
              </h3>
              <div className="space-y-2.5">
                {topicEntries.map(([topic, acc]) => (
                  <div key={topic}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--color-text-muted)] truncate">{topic}</span>
                      <span className={`font-bold ml-2 shrink-0 ${acc >= 70 ? 'text-green-500' : acc >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {acc}%
                      </span>
                    </div>
                    <div className="bg-[var(--color-border)] rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${acc >= 70 ? 'bg-green-500' : acc >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${acc}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Answer Review ── */}
        {showAnswersToUser === false ? (
          <div className="card flex items-center justify-center py-12 text-center">
            <div>
              <Eye size={28} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">Answer Review Restricted</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                The instructor has disabled answer review for this exam.
              </p>
            </div>
          </div>
        ) : questions && questions.length > 0 ? (
          <div className="card flex flex-col overflow-hidden p-0">
            <div className="px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                <CheckCircle size={14} className="text-[var(--color-primary)]" />
                Review Answers
                <span className="ml-auto text-[10px] text-[var(--color-text-muted)] font-normal">
                  {questions.length} questions
                </span>
              </h2>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {questions.map((q, i) => {
                const a = answers?.[i];
                const isCorrect = a?.isCorrect;
                const isCoding = q.type === 'coding';

                if (isCoding) {
                  return (
                    <div key={i} className={`p-4 rounded-xl border ${isCorrect
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'}`}>
                      <div className="flex items-start gap-2 mb-3">
                        {isCorrect
                          ? <CheckCircle size={15} className="text-green-500 shrink-0 mt-0.5" />
                          : <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <Code2 size={11} className="text-[var(--color-primary)]" />
                            <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide">Coding</span>
                            {a?.aiScore != null && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                a.aiScore >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : a.aiScore >= 50 ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                AI: {a.aiScore}/100
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[var(--color-text)] font-medium">{i + 1}. {q.question}</p>
                        </div>
                      </div>

                      {a?.code ? (
                        <div className="ml-5 mb-3">
                          <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Your code:</p>
                          <pre className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 text-xs font-mono text-[var(--color-text)] overflow-x-auto whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                            {a.code}
                          </pre>
                        </div>
                      ) : (
                        <p className="ml-5 text-xs text-[var(--color-text-muted)] italic mb-3">No code submitted</p>
                      )}

                      {a?.aiFeedback && (
                        <div className="ml-5 mb-2 flex items-start gap-1.5 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                          <Lightbulb size={11} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                          <p className="text-xs text-[var(--color-text)]">{a.aiFeedback}</p>
                        </div>
                      )}

                      {q.sampleSolution && (
                        <details className="ml-5 mt-1">
                          <summary className="text-xs text-[var(--color-primary)] cursor-pointer select-none hover:underline">
                            View sample solution
                          </summary>
                          <pre className="mt-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {q.sampleSolution}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                }

                // MCQ
                const unattempted = a?.selectedOption === null || a?.selectedOption === undefined;
                return (
                  <div key={i} className={`p-4 rounded-xl border ${isCorrect
                    ? 'border-green-200 bg-green-50/70 dark:border-green-800 dark:bg-green-900/10'
                    : unattempted
                    ? 'border-[var(--color-border)]'
                    : 'border-red-200 bg-red-50/70 dark:border-red-800 dark:bg-red-900/10'}`}>
                    <div className="flex items-start gap-2 mb-2.5">
                      {isCorrect
                        ? <CheckCircle size={15} className="text-green-500 shrink-0 mt-0.5" />
                        : unattempted
                        ? <MinusCircle size={15} className="text-slate-400 shrink-0 mt-0.5" />
                        : <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />}
                      <p className="text-sm text-[var(--color-text)] font-medium leading-snug">{i + 1}. {q.question}</p>
                    </div>
                    <div className="space-y-1 ml-5">
                      {q.options.map((opt, j) => (
                        <div key={j} className={`text-xs px-3 py-2 rounded-lg ${
                          j === q.correctAnswer
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                            : j === a?.selectedOption && !isCorrect
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'text-[var(--color-text-muted)]'}`}>
                          {String.fromCharCode(65 + j)}. {opt}
                          {j === q.correctAnswer && ' ✓'}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-2.5 ml-5 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] rounded-lg p-2.5 flex items-start gap-1.5">
                        <Lightbulb size={10} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {showFeedback && (
        <FeedbackModal trigger="exam_completed" onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
