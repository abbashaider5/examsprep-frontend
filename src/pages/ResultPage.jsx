import { useQuery } from '@tanstack/react-query';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { CheckCircle, Clock, Code2, Download, Eye, EyeOff, Lightbulb, MinusCircle, Trophy, XCircle } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Link, useLocation, useParams } from 'react-router-dom';
import { resultApi } from '../services/api.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ResultPage() {
  const { id } = useParams();
  const { state } = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['result', id],
    queryFn: () => resultApi.getById(id).then(r => r.data),
    enabled: !state?.result,
  });

  const result = state?.result || data?.result;

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
    showResultToUser, showAnswersToUser,
  } = result;

  // Instructor has hidden the result from this candidate
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
            <Link to="/create-exam" className="btn-primary text-sm">Create New Exam</Link>
          </div>
        </div>
      </div>
    );
  }

  const donutData = {
    labels: ['Correct', 'Incorrect', 'Unattempted'],
    datasets: [{ data: [correctCount, incorrectCount, unattemptedCount], backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'], borderWidth: 0 }],
  };

  const mins = Math.floor((timeTaken || 0) / 60);
  const secs = (timeTaken || 0) % 60;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className={`card text-center mb-8 ${passed ? 'border-green-300 dark:border-green-700' : 'border-red-200 dark:border-red-800'}`}>
        <div className="text-5xl mb-3">{passed ? '🏆' : '💪'}</div>
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: passed ? '#22c55e' : '#ef4444' }}>
          {percentage}%
        </h1>
        <p className="text-[var(--color-text-muted)] mb-3">
          {passed ? 'Congratulations! You passed!' : "You didn't pass this time. Keep practicing!"}
        </p>
        {xpEarned > 0 && (
          <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            +{xpEarned} XP earned
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Doughnut */}
        <div className="card flex flex-col items-center">
          <h2 className="font-semibold text-[var(--color-text)] mb-4 self-start text-sm">Score Breakdown</h2>
          <div className="w-44 h-44">
            <Doughnut data={donutData} options={{ plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, cutout: '65%' }} />
          </div>
          <div className="grid grid-cols-3 gap-3 w-full mt-4 text-center">
            <div><div className="font-bold text-green-500 text-sm">{correctCount}</div><div className="text-xs text-[var(--color-text-muted)]">Correct</div></div>
            <div><div className="font-bold text-red-500 text-sm">{incorrectCount}</div><div className="text-xs text-[var(--color-text-muted)]">Wrong</div></div>
            <div><div className="font-bold text-slate-400 text-sm">{unattemptedCount}</div><div className="text-xs text-[var(--color-text-muted)]">Skipped</div></div>
          </div>
        </div>

        {/* Stats & Certificate */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-2 font-semibold text-[var(--color-text)] text-sm">
              <Clock size={15} /> Time Taken
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{mins}m {secs}s</div>
          </div>

          {certificate && (
            <div className="card border-[var(--color-primary)] bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold mb-2 text-sm">
                <Trophy size={15} /> Certificate Earned!
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">ID: {certificate.certId}</p>
              <div className="flex gap-2">
                <a href={`/api/certificates/download/${certificate.certId}`} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1" target="_blank" rel="noreferrer">
                  <Download size={12} /> Download PDF
                </a>
                <Link to={`/verify/${certificate.certId}`} className="btn-secondary text-xs py-1.5 px-3">Verify</Link>
              </div>
            </div>
          )}

          {topicAccuracy && Object.keys(topicAccuracy).length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-[var(--color-text)] text-sm mb-3">Topic Accuracy</h3>
              <div className="space-y-2">
                {Object.entries(topicAccuracy).map(([topic, acc]) => (
                  <div key={topic}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--color-text-muted)]">{topic}</span>
                      <span className={`font-medium ${acc >= 70 ? 'text-green-500' : acc >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>{acc}%</span>
                    </div>
                    <div className="bg-[var(--color-border)] rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${acc >= 70 ? 'bg-green-500' : acc >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${acc}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Answer Review */}
      {showAnswersToUser === false ? (
        <div className="card text-center py-8 mb-6">
          <Eye size={28} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
          <p className="text-sm font-medium text-[var(--color-text)]">Answer Review Restricted</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            The instructor has disabled answer review for this exam.
          </p>
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="card">
          <h2 className="font-semibold text-[var(--color-text)] mb-5 text-sm">Review Answers</h2>
          <div className="space-y-5">
            {questions.map((q, i) => {
              const a = answers?.[i];
              const isCorrect = a?.isCorrect;
              const isCoding = q.type === 'coding';

              if (isCoding) {
                return (
                  <div key={i} className={`p-4 rounded-xl border ${isCorrect ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'}`}>
                    <div className="flex items-start gap-2 mb-3 flex-wrap">
                      {isCorrect
                        ? <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                        : <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Code2 size={12} className="text-[var(--color-primary)]" />
                          <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide">Coding</span>
                          {a?.aiScore != null && (
                            <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${a.aiScore >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : a.aiScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              AI: {a.aiScore}/100
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--color-text)] font-medium">{i + 1}. {q.question}</p>
                      </div>
                    </div>

                    {a?.code ? (
                      <div className="ml-6 mb-3">
                        <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Your code:</p>
                        <pre className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 text-xs font-mono text-[var(--color-text)] overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                          {a.code}
                        </pre>
                      </div>
                    ) : (
                      <p className="ml-6 text-xs text-[var(--color-text-muted)] italic mb-3">No code submitted</p>
                    )}

                    {a?.aiFeedback && (
                      <div className="ml-6 mb-2 flex items-start gap-1.5 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <Lightbulb size={11} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                        <p className="text-xs text-[var(--color-text)]">{a.aiFeedback}</p>
                      </div>
                    )}

                    {q.sampleSolution && (
                      <details className="ml-6 mt-1">
                        <summary className="text-xs text-[var(--color-primary)] cursor-pointer select-none hover:underline">
                          View sample solution
                        </summary>
                        <pre className="mt-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
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
                <div key={i} className={`p-4 rounded-xl border ${isCorrect ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' : unattempted ? 'border-[var(--color-border)]' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'}`}>
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect
                      ? <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                      : unattempted
                      ? <MinusCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                      : <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />}
                    <p className="text-sm text-[var(--color-text)] font-medium">{i + 1}. {q.question}</p>
                  </div>
                  <div className="space-y-1 ml-6">
                    {q.options.map((opt, j) => (
                      <div key={j} className={`text-xs px-3 py-2 rounded-lg ${j === q.correctAnswer ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium' : j === a?.selectedOption && !isCorrect ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'text-[var(--color-text-muted)]'}`}>
                        {String.fromCharCode(65 + j)}. {opt}
                        {j === q.correctAnswer && ' ✓'}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 ml-6 text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] rounded-lg p-2.5 flex items-start gap-1.5">
                      <Lightbulb size={11} className="text-[var(--color-primary)] mt-0.5 shrink-0" />
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 mt-8 justify-center">
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        <Link to="/create-exam" className="btn-primary">Create New Exam</Link>
      </div>
    </div>
  );
}
