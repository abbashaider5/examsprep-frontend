import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowLeft, Award, BookOpen, Camera, CheckCircle, ChevronDown, ChevronUp,
  Clock, Code2, Eye, EyeOff, FileText, FlipHorizontal, Hash, Percent, RefreshCw,
  Save, Shield, Timer, Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { examApi } from '../services/api.js';

function MCQQuestionEditor({ question, index, onChange }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="card border border-[var(--color-border)] overflow-hidden">
      <div className="flex items-start gap-3 cursor-pointer select-none" onClick={() => setCollapsed(c => !c)}>
        <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-medium text-[var(--color-text)] line-clamp-2 min-w-0">
          {question.question || <span className="text-[var(--color-text-muted)] italic">No question text</span>}
        </p>
        <button className="text-[var(--color-text-muted)] shrink-0 p-0.5">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label text-xs">Question</label>
            <textarea
              className="input text-sm resize-y min-h-[72px]"
              value={question.question}
              onChange={e => onChange({ ...question, question: e.target.value })}
              placeholder="Enter the question..."
            />
          </div>

          <div>
            <label className="label text-xs mb-2">Options — click circle to mark correct answer</label>
            <div className="space-y-2">
              {question.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChange({ ...question, correctAnswer: i })}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      question.correctAnswer === i
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-[var(--color-border)] hover:border-green-400'
                    }`}
                  >
                    {question.correctAnswer === i && <CheckCircle size={11} />}
                  </button>
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-text-muted)] w-5">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <input
                    className="input flex-1 text-sm py-1.5"
                    value={opt}
                    onChange={e => {
                      const newOpts = [...question.options];
                      newOpts[i] = e.target.value;
                      onChange({ ...question, options: newOpts });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Explanation (optional)</label>
              <textarea
                className="input text-sm resize-y min-h-[60px]"
                value={question.explanation || ''}
                onChange={e => onChange({ ...question, explanation: e.target.value })}
                placeholder="Why is the correct answer right?"
              />
            </div>
            <div>
              <label className="label text-xs">Topic (optional)</label>
              <input
                className="input text-sm"
                value={question.topic || ''}
                onChange={e => onChange({ ...question, topic: e.target.value })}
                placeholder="e.g., loops, recursion"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodingQuestionEditor({ question, index, onChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const LANGUAGES = ['javascript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'typescript', 'ruby', 'php'];

  return (
    <div className="card border border-purple-200 dark:border-purple-800 overflow-hidden">
      <div className="flex items-start gap-3 cursor-pointer select-none" onClick={() => setCollapsed(c => !c)}>
        <span className="shrink-0 w-7 h-7 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2">
            {question.question || <span className="text-[var(--color-text-muted)] italic">No question text</span>}
          </p>
          <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">
            <Code2 size={9} className="inline mr-0.5" />CODING · {question.language || 'javascript'}
          </span>
        </div>
        <button className="text-[var(--color-text-muted)] shrink-0 p-0.5">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label text-xs">Problem Statement</label>
            <textarea className="input text-sm resize-y min-h-[80px]" value={question.question}
              onChange={e => onChange({ ...question, question: e.target.value })} placeholder="Describe the coding problem..." />
          </div>
          <div>
            <label className="label text-xs">Language</label>
            <select className="input text-sm" value={question.language || 'javascript'}
              onChange={e => onChange({ ...question, language: e.target.value })}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Starter Code</label>
              <textarea className="input text-sm font-mono resize-y min-h-[80px] text-xs" value={question.starterCode || ''}
                onChange={e => onChange({ ...question, starterCode: e.target.value })} placeholder="// Starter code..." />
            </div>
            <div>
              <label className="label text-xs">Sample Solution</label>
              <textarea className="input text-sm font-mono resize-y min-h-[80px] text-xs" value={question.sampleSolution || ''}
                onChange={e => onChange({ ...question, sampleSolution: e.target.value })} placeholder="// Reference solution..." />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Explanation (optional)</label>
              <textarea className="input text-sm resize-y min-h-[60px]" value={question.explanation || ''}
                onChange={e => onChange({ ...question, explanation: e.target.value })} placeholder="Explain the approach..." />
            </div>
            <div>
              <label className="label text-xs">Topic (optional)</label>
              <input className="input text-sm" value={question.topic || ''}
                onChange={e => onChange({ ...question, topic: e.target.value })} placeholder="e.g., dynamic programming" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ icon: Icon, label, value, iconCls, bgCls }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-[var(--color-border)] last:border-0">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${bgCls}`}>
        <Icon size={11} className={iconCls} />
      </div>
      <span className="flex-1 text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="text-xs font-semibold text-[var(--color-text)]">{value}</span>
    </div>
  );
}

export default function EditQuestionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['examForEdit', id],
    queryFn: () => examApi.getById(id).then(r => r.data.exam),
  });

  const [questions, setQuestions] = useState(null);

  useEffect(() => {
    if (data?.questions) setQuestions(data.questions.map(q => ({ ...q })));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => examApi.updateQuestions(id, questions),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myExams'] });
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
      toast.success('Questions saved!');
      navigate('/instructor');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save questions'),
  });

  const updateQuestion = (index, updated) => setQuestions(qs => qs.map((q, i) => i === index ? updated : q));
  const removeQuestion = (index) => {
    if (questions.length <= 1) { toast.error('At least 1 question required'); return; }
    setQuestions(qs => qs.filter((_, i) => i !== index));
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError || !data) return (
    <div className="px-4 py-10 text-center">
      <AlertCircle size={40} className="mx-auto text-red-400 mb-3" />
      <p className="text-[var(--color-text-muted)]">Failed to load exam.</p>
      <button onClick={() => navigate('/instructor')} className="btn-secondary mt-4 text-sm">Back</button>
    </div>
  );

  const exam = data;
  const codingCount = questions?.filter(q => q.type === 'coding').length ?? 0;
  const mcqCount = (questions?.length ?? 0) - codingCount;

  const DIFF_COLORS = { easy: 'text-emerald-600', medium: 'text-amber-600', hard: 'text-red-600' };

  const settingRows = [
    { icon: Percent, label: 'Passing Score', value: `${exam.passingPercentage ?? 75}%`, iconCls: 'text-teal-600', bgCls: 'bg-teal-100 dark:bg-teal-900/30' },
    { icon: RefreshCw, label: 'Allow Reattempt', value: exam.allowReattempt ? 'Yes' : 'No', iconCls: 'text-blue-600', bgCls: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: FlipHorizontal, label: 'Flashcards', value: exam.showFlashcards ? 'Enabled' : 'Disabled', iconCls: 'text-purple-600', bgCls: 'bg-purple-100 dark:bg-purple-900/30' },
    { icon: Eye, label: 'Answer Review', value: exam.showReview ? 'Enabled' : 'Disabled', iconCls: 'text-green-600', bgCls: 'bg-green-100 dark:bg-green-900/30' },
    { icon: Award, label: 'Certificate', value: exam.certificateEnabled ? 'Enabled' : 'Disabled', iconCls: 'text-amber-600', bgCls: 'bg-amber-100 dark:bg-amber-900/30' },
    { icon: Shield, label: 'AI Proctoring', value: exam.proctored ? 'Enabled' : 'Disabled', iconCls: 'text-blue-600', bgCls: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: Camera, label: 'Screenshot', value: exam.screenshotEnabled ? 'Enabled' : 'Disabled', iconCls: 'text-rose-600', bgCls: 'bg-rose-100 dark:bg-rose-900/30' },
    { icon: Eye, label: 'Show Result', value: exam.showResultToUser ? 'Yes' : 'No', iconCls: 'text-indigo-600', bgCls: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { icon: EyeOff, label: 'Show Answers', value: exam.showAnswersToUser ? 'Yes' : 'No', iconCls: 'text-teal-600', bgCls: 'bg-teal-100 dark:bg-teal-900/30' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header — same gradient as other instructor pages */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 px-6 py-6 mb-6 shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <button onClick={() => navigate('/instructor')}
              className="flex items-center gap-1.5 text-teal-100 hover:text-white text-xs mb-2 transition-colors">
              <ArrowLeft size={13} /> Back to Dashboard
            </button>
            <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
              <BookOpen size={18} /> Review &amp; Edit Questions
            </h1>
            <p className="text-teal-100 text-sm mt-0.5 truncate max-w-sm">{exam.title}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-white font-bold text-lg leading-none">{questions?.length ?? 0}</p>
              <p className="text-teal-100 text-xs">Questions</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-right">
              <p className="text-white font-bold text-sm capitalize leading-none">{exam.difficulty}</p>
              <p className="text-teal-100 text-xs">{exam.subject}</p>
            </div>
          </div>
        </div>
      </div>

      {questions && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Question editor */}
          <div className="lg:col-span-2 space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="relative group">
                {q.type === 'coding'
                  ? <CodingQuestionEditor question={q} index={i} onChange={(u) => updateQuestion(i, u)} />
                  : <MCQQuestionEditor question={q} index={i} onChange={(u) => updateQuestion(i, u)} />
                }
                <button type="button" onClick={() => removeQuestion(i)} title="Remove question"
                  className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-text-muted)] hover:text-red-500 p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            {/* Save + Cancel */}
            <div className="flex gap-3 pt-2">
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                {saveMut.isPending
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  : <><Save size={16} /> Save Questions</>}
              </button>
              <button onClick={() => navigate('/instructor')} className="btn-secondary py-3 px-5">Cancel</button>
            </div>
          </div>

          {/* Right: Summary sidebar */}
          <div className="space-y-4">
            {/* Question summary card */}
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
                <FileText size={14} className="text-[var(--color-primary)]" /> Question Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[var(--color-bg-alt)] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--color-text)]">{questions.length}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Total</p>
                </div>
                {codingCount > 0 ? (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-[var(--color-primary)]">{mcqCount}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">MCQ</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center col-span-2">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{codingCount}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Coding</p>
                    </div>
                  </>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <p className={`text-lg font-bold capitalize ${DIFF_COLORS[exam.difficulty] || 'text-[var(--color-text)]'}`}>{exam.difficulty}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Difficulty</p>
                  </div>
                )}
              </div>
              {/* Time per question */}
              <div className="flex items-center gap-2 p-2.5 bg-[var(--color-bg-alt)] rounded-xl">
                <Clock size={13} className="text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-muted)]">Time per question</span>
                <span className="ml-auto text-xs font-semibold text-[var(--color-text)]">
                  {exam.difficulty === 'easy' ? '45s' : exam.difficulty === 'medium' ? '75s' : '120s'}
                </span>
              </div>
              {/* Topics */}
              {exam.topics?.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exam.topics.map(t => (
                      <span key={t} className="text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                        <Hash size={8} className="inline mr-0.5" />{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Exam settings card */}
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
                <Shield size={14} className="text-[var(--color-primary)]" /> Exam Settings
              </h3>
              <div>
                {settingRows.map(r => <SettingRow key={r.label} {...r} />)}
                {exam.expiryDate && (
                  <div className="flex items-center gap-2.5 py-2 mt-0.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-rose-100 dark:bg-rose-900/30">
                      <Timer size={11} className="text-rose-600 dark:text-rose-400" />
                    </div>
                    <span className="flex-1 text-xs text-[var(--color-text-muted)]">Expires</span>
                    <span className={`text-xs font-semibold ${new Date(exam.expiryDate) < new Date() ? 'text-red-500' : 'text-rose-600'}`}>
                      {new Date(exam.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
