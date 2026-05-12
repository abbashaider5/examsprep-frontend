import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowLeft, Award, BookOpen, Camera, CheckCircle, ChevronDown, ChevronUp,
  Clock, Code2, Eye, EyeOff, FileText, FlipHorizontal, Hash, ListPlus, Percent, RefreshCw,
  Save, Shield, Sparkles, Timer, Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { examApi } from '../services/api.js';

function stripReviewMeta(q) {
  if (!q || typeof q !== 'object') return q;
  const { _reviewMeta, ...rest } = q;
  return rest;
}

function rebuildVariantsFromMerged(mergedList, originalVariants) {
  if (!Array.isArray(originalVariants) || originalVariants.length === 0) {
    return { questions: mergedList.map(stripReviewMeta), questionVariants: undefined };
  }
  const numVariants = originalVariants.length;
  const qsPer = originalVariants[0]?.length ?? 0;
  const variants = Array.from({ length: numVariants }, (_, vi) =>
    Array.from({ length: qsPer }, (_, ii) => {
      const orig = originalVariants[vi]?.[ii];
      return orig ? JSON.parse(JSON.stringify(orig)) : null;
    }),
  );
  for (const q of mergedList) {
    const m = q._reviewMeta;
    if (!m || typeof m.variantIndex !== 'number' || typeof m.indexInVariant !== 'number') continue;
    const { variantIndex: vi, indexInVariant: ii } = m;
    if (variants[vi] && ii >= 0 && ii < variants[vi].length) {
      variants[vi][ii] = stripReviewMeta(q);
    }
  }
  for (let vi = 0; vi < numVariants; vi++) {
    for (let ii = 0; ii < qsPer; ii++) {
      if (variants[vi][ii] == null && originalVariants[vi]?.[ii]) {
        variants[vi][ii] = JSON.parse(JSON.stringify(originalVariants[vi][ii]));
      }
    }
  }
  return { questions: variants[0] || mergedList.map(stripReviewMeta), questionVariants: variants };
}

function QuestionHeader({
  index, type, title, collapsed, onToggle, onRegenerate, onGenerateFromTopic, onDelete, regenerating, generatingTopic,
}) {
  const typeColors = {
    coding: 'bg-purple-500',
    descriptive: 'bg-teal-500',
    mcq: 'bg-[var(--color-primary)]',
  };
  return (
    <div className="flex items-start gap-3">
      <span className={`shrink-0 w-7 h-7 rounded-full ${typeColors[type] || typeColors.mcq} text-white text-xs font-bold flex items-center justify-center mt-0.5`}>
        {index + 1}
      </span>
      <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={onToggle}>
        <p className="text-sm font-medium text-[var(--color-text)] line-clamp-2">{title || <span className="text-[var(--color-text-muted)] italic">No question text</span>}</p>
        {type !== 'mcq' && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold mt-1 inline-block ${type === 'coding' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
            {type === 'coding' ? <><Code2 size={9} className="inline mr-0.5" />CODING</> : '✍ DESCRIPTIVE'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button type="button" onClick={onRegenerate} disabled={regenerating}
          title="AI regenerate this question"
          className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-50 transition-colors"
        >
          {regenerating
            ? <div className="w-3.5 h-3.5 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
            : <Sparkles size={13} />}
        </button>
        <button
          type="button"
          onClick={onGenerateFromTopic}
          disabled={generatingTopic || regenerating}
          title="Replace this question with a new one for your topic (Generate from topic)"
          className="p-1 text-[var(--color-text-muted)] hover:text-teal-600 dark:hover:text-teal-400 disabled:opacity-50 transition-colors"
        >
          {generatingTopic ? (
            <div className="w-3.5 h-3.5 border-2 border-teal-500/30 border-t-teal-600 rounded-full animate-spin" />
          ) : (
            <ListPlus size={13} />
          )}
        </button>
        <button type="button" onClick={onDelete} title="Remove question"
          className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors">
          <Trash2 size={13} />
        </button>
        <button type="button" onClick={onToggle} className="p-1 text-[var(--color-text-muted)]">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>
    </div>
  );
}

function MCQQuestionEditor({ question, index, onChange, onRegenerate, onGenerateFromTopic, onDelete, regenerating, generatingTopic }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="card border border-[var(--color-border)] overflow-hidden">
      <QuestionHeader
        index={index} type="mcq" title={question.question}
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
        onRegenerate={onRegenerate} onGenerateFromTopic={onGenerateFromTopic} onDelete={onDelete}
        regenerating={regenerating} generatingTopic={generatingTopic}
      />
      {!collapsed && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label text-xs">Question</label>
            <textarea className="input text-sm resize-y min-h-[72px]" value={question.question}
              onChange={e => onChange({ ...question, question: e.target.value })} placeholder="Enter the question..." />
          </div>
          <div>
            <label className="label text-xs mb-2">Options — click circle to mark correct answer</label>
            <div className="space-y-2">
              {question.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => onChange({ ...question, correctAnswer: i })}
                    className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${question.correctAnswer === i ? 'border-green-500 bg-green-500 text-white' : 'border-[var(--color-border)] hover:border-green-400'}`}>
                    {question.correctAnswer === i && <CheckCircle size={11} />}
                  </button>
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-text-muted)] w-5">{String.fromCharCode(65 + i)}.</span>
                  <input className="input flex-1 text-sm py-1.5" value={opt}
                    onChange={e => { const o = [...question.options]; o[i] = e.target.value; onChange({ ...question, options: o }); }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Explanation (optional)</label>
              <textarea className="input text-sm resize-y min-h-[60px]" value={question.explanation || ''}
                onChange={e => onChange({ ...question, explanation: e.target.value })} placeholder="Why is the correct answer right?" />
            </div>
            <div>
              <label className="label text-xs">Topic (optional)</label>
              <input className="input text-sm" value={question.topic || ''}
                onChange={e => onChange({ ...question, topic: e.target.value })} placeholder="e.g., loops, recursion" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CodingQuestionEditor({ question, index, onChange, onRegenerate, onGenerateFromTopic, onDelete, regenerating, generatingTopic }) {
  const [collapsed, setCollapsed] = useState(false);
  const LANGUAGES = ['javascript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'typescript', 'ruby', 'php'];
  return (
    <div className="card border border-purple-200 dark:border-purple-800 overflow-hidden">
      <QuestionHeader
        index={index} type="coding" title={question.question}
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
        onRegenerate={onRegenerate} onGenerateFromTopic={onGenerateFromTopic} onDelete={onDelete}
        regenerating={regenerating} generatingTopic={generatingTopic}
      />
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

function DescriptiveQuestionEditor({ question, index, onChange, onRegenerate, onGenerateFromTopic, onDelete, regenerating, generatingTopic }) {
  const [collapsed, setCollapsed] = useState(false);
  const [kpInput, setKpInput] = useState('');
  return (
    <div className="card border border-teal-200 dark:border-teal-800 overflow-hidden">
      <QuestionHeader
        index={index} type="descriptive" title={question.question}
        collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}
        onRegenerate={onRegenerate} onGenerateFromTopic={onGenerateFromTopic} onDelete={onDelete}
        regenerating={regenerating} generatingTopic={generatingTopic}
      />
      {!collapsed && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label text-xs">Question</label>
            <textarea className="input text-sm resize-y min-h-[72px]" value={question.question}
              onChange={e => onChange({ ...question, question: e.target.value })} placeholder="Enter the open-ended question..." />
          </div>
          <div>
            <label className="label text-xs">Model Answer (reference)</label>
            <textarea className="input text-sm resize-y min-h-[80px]" value={question.modelAnswer || ''}
              onChange={e => onChange({ ...question, modelAnswer: e.target.value })}
              placeholder="A comprehensive model answer (used by AI to evaluate student responses)..." />
          </div>
          <div>
            <label className="label text-xs mb-1.5">Key Points (AI checks for these in student answers)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(question.keyPoints || []).map((kp, ki) => (
                <span key={ki} className="flex items-center gap-1 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded-full">
                  {kp}
                  <button type="button" onClick={() => onChange({ ...question, keyPoints: question.keyPoints.filter((_, j) => j !== ki) })}
                    className="ml-0.5 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" value={kpInput} onChange={e => setKpInput(e.target.value)}
                placeholder="Add key concept..." onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const kp = kpInput.trim();
                    if (kp) { onChange({ ...question, keyPoints: [...(question.keyPoints || []), kp] }); setKpInput(''); }
                  }
                }} />
              <button type="button" className="btn-secondary text-xs px-3"
                onClick={() => { const kp = kpInput.trim(); if (kp) { onChange({ ...question, keyPoints: [...(question.keyPoints || []), kp] }); setKpInput(''); } }}>
                Add
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Explanation (optional)</label>
              <textarea className="input text-sm resize-y min-h-[60px]" value={question.explanation || ''}
                onChange={e => onChange({ ...question, explanation: e.target.value })} placeholder="Why this question matters..." />
            </div>
            <div>
              <label className="label text-xs">Topic (optional)</label>
              <input className="input text-sm" value={question.topic || ''}
                onChange={e => onChange({ ...question, topic: e.target.value })} placeholder="e.g., memory management" />
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
  const [regeneratingIdx, setRegeneratingIdx] = useState(null);
  const [generatingTopicIdx, setGeneratingTopicIdx] = useState(null);
  const [topicModalAnchor, setTopicModalAnchor] = useState(null);
  const [topicDraft, setTopicDraft] = useState('');
  const [topicGuidance, setTopicGuidance] = useState('');
  const [topicDifficulty, setTopicDifficulty] = useState('inherit');
  const [topicStyle, setTopicStyle] = useState('');
  const [topicGenPending, setTopicGenPending] = useState(false);
  const [usingMerged, setUsingMerged] = useState(false);
  const [sourceVariants, setSourceVariants] = useState(null);

  useEffect(() => {
    if (!data) return;
    if (Array.isArray(data.mergedQuestionsReview) && data.mergedQuestionsReview.length > 0 && data.multipleSets) {
      setQuestions(data.mergedQuestionsReview.map((q) => ({ ...q })));
      setSourceVariants(data.questionVariants);
      setUsingMerged(true);
    } else {
      setQuestions((data.questions || []).map((q) => ({ ...q })));
      setSourceVariants(null);
      setUsingMerged(false);
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => {
      if (usingMerged && Array.isArray(sourceVariants) && sourceVariants.length > 0) {
        const { questions: q0, questionVariants } = rebuildVariantsFromMerged(questions, sourceVariants);
        return examApi.updateQuestions(id, { questions: q0, questionVariants });
      }
      return examApi.updateQuestions(id, { questions });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myExams'] });
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
      toast.success('Questions saved!');
      navigate('/instructor');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save questions'),
  });

  const handleRegenerate = async (index) => {
    setRegeneratingIdx(index);
    try {
      const res = await examApi.regenerateQuestion(id, index);
      setQuestions(qs => qs.map((q, i) => i === index ? res.data.question : q));
      toast.success('Question regenerated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate question');
    } finally {
      setRegeneratingIdx(null);
    }
  };

  const openTopicModal = (anchorIdx) => {
    setTopicModalAnchor(anchorIdx);
    setTopicDraft(String(questions[anchorIdx]?.topic || '').trim());
    setTopicGuidance('');
    setTopicDifficulty('inherit');
    setTopicStyle('');
  };

  const closeTopicModal = () => {
    if (topicGenPending) return;
    setTopicModalAnchor(null);
  };

  const submitTopicGenerate = async () => {
    if (topicModalAnchor == null) return;
    const t = topicDraft.trim();
    if (t.length < 2) {
      toast.error('Enter a topic or concept (at least 2 characters).');
      return;
    }
    setTopicGenPending(true);
    setGeneratingTopicIdx(topicModalAnchor);
    try {
      const body = {
        anchorIndex: topicModalAnchor,
        topic: t,
        guidance: topicGuidance.trim() || undefined,
        difficulty: topicDifficulty === 'inherit' ? undefined : topicDifficulty,
        questionStyle: topicStyle || undefined,
      };
      const res = await examApi.generateQuestionFromTopic(id, body);
      const { index, question } = res.data;
      setQuestions((qs) => qs.map((q, i) => (i === index ? question : q)));
      toast.success('Question updated from topic — review and save when ready.');
      setTopicModalAnchor(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not generate question from topic');
    } finally {
      setTopicGenPending(false);
      setGeneratingTopicIdx(null);
    }
  };

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
  const descriptiveCount = questions?.filter(q => q.type === 'descriptive').length ?? 0;
  const mcqCount = (questions?.length ?? 0) - codingCount - descriptiveCount;
  const hasMultipleTypes = codingCount > 0 || descriptiveCount > 0;

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
          <div className="lg:col-span-2 space-y-3">
            {usingMerged && (
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 mb-2">
                Multi-set review: all variants are shown in one list. Saving updates every set. Regenerate and delete are disabled here.
              </div>
            )}
            {questions.map((q, i) => {
              const commonProps = {
                question: q, index: i,
                onChange: (u) => updateQuestion(i, u),
                onRegenerate: () => {
                  if (usingMerged) {
                    toast.error('Regenerate is not available in multi-set merged review.');
                    return;
                  }
                  handleRegenerate(i);
                },
                onGenerateFromTopic: () => {
                  if (usingMerged) {
                    toast.error('Generate from topic is not available in multi-set merged review.');
                    return;
                  }
                  openTopicModal(i);
                },
                onDelete: () => {
                  if (usingMerged) {
                    toast.error('Cannot remove questions from merged multi-set view.');
                    return;
                  }
                  removeQuestion(i);
                },
                regenerating: usingMerged ? false : regeneratingIdx === i,
                generatingTopic: usingMerged ? false : generatingTopicIdx === i,
              };
              if (q.type === 'coding') return <CodingQuestionEditor key={i} {...commonProps} />;
              if (q.type === 'descriptive') return <DescriptiveQuestionEditor key={i} {...commonProps} />;
              return <MCQQuestionEditor key={i} {...commonProps} />;
            })}

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

          <div className="space-y-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2">
                <FileText size={14} className="text-[var(--color-primary)]" /> Question Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[var(--color-bg-alt)] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-[var(--color-text)]">{questions.length}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Total</p>
                </div>
                {hasMultipleTypes ? (
                  <>
                    {mcqCount > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-[var(--color-primary)]">{mcqCount}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">MCQ</p>
                      </div>
                    )}
                    {descriptiveCount > 0 && (
                      <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{descriptiveCount}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Descriptive</p>
                      </div>
                    )}
                    {codingCount > 0 && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{codingCount}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Coding</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                    <p className={`text-lg font-bold capitalize ${DIFF_COLORS[exam.difficulty] || 'text-[var(--color-text)]'}`}>{exam.difficulty}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Difficulty</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-[var(--color-bg-alt)] rounded-xl mb-2">
                <Clock size={13} className="text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-muted)]">Time per question</span>
                <span className="ml-auto text-xs font-semibold text-[var(--color-text)]">
                  {exam.timePerQuestion ? `${exam.timePerQuestion}s` : (exam.difficulty === 'easy' ? '45s' : exam.difficulty === 'medium' ? '60s' : '90s')}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2.5 bg-amber-50/60 dark:bg-amber-900/10 rounded-xl">
                <p className="text-xs text-[var(--color-text-muted)] leading-snug">
                  <Sparkles size={12} className="inline text-amber-600 shrink-0 mr-1 align-text-bottom" />
                  <Sparkles size={10} className="inline text-amber-600" /> <strong>Regenerate</strong> replaces this item.
                  <ListPlus size={10} className="inline text-teal-600 mx-0.5 align-text-bottom" />
                  <strong>Generate from topic</strong> replaces this slot with a new question for the topic you enter (regenerate still uses the current question as context).
                </p>
              </div>
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

      {topicModalAnchor != null && questions && (
        <Modal onClose={closeTopicModal}>
          <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-xl max-w-md w-full p-4 sm:p-5">
            <h2 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
              <ListPlus size={17} className="text-teal-600 shrink-0" aria-hidden />
              Generate from topic
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
              Replaces question #{topicModalAnchor + 1} with a new{' '}
              <span className="font-semibold text-[var(--color-text)]">
                {questions[topicModalAnchor]?.type === 'coding' ? 'coding' : questions[topicModalAnchor]?.type === 'descriptive' ? 'descriptive' : 'MCQ'}
              </span>{' '}
              focused on your topic. Other questions stay the same until you save.
            </p>
            {exam.sourceResource && (
              <p className="text-[10px] text-teal-700 dark:text-teal-300/90 bg-teal-50/80 dark:bg-teal-950/40 rounded-lg px-2.5 py-1.5 mt-2 leading-snug">
                This exam is linked to an uploaded resource — retrieval will prioritize passages related to your topic when possible.
              </p>
            )}
            <div className="mt-3 space-y-3">
              <div>
                <label className="label text-xs">Topic / concept / objective</label>
                <textarea
                  className="input text-sm w-full resize-y min-h-[64px] py-2"
                  value={topicDraft}
                  onChange={(e) => setTopicDraft(e.target.value)}
                  placeholder="e.g. Photosynthesis, JavaScript closures, Mughal administration…"
                  maxLength={400}
                  autoFocus
                />
              </div>
              <div>
                <label className="label text-xs">Optional guidance</label>
                <textarea
                  className="input text-sm w-full resize-y min-h-[52px] py-2"
                  value={topicGuidance}
                  onChange={(e) => setTopicGuidance(e.target.value)}
                  placeholder="e.g. Emphasize misconceptions, include a numeric example…"
                  maxLength={800}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Difficulty</label>
                  <select
                    className="input text-sm py-1.5"
                    value={topicDifficulty}
                    onChange={(e) => setTopicDifficulty(e.target.value)}
                  >
                    <option value="inherit">Same as exam ({exam.difficulty})</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Question style</label>
                  <select className="input text-sm py-1.5" value={topicStyle} onChange={(e) => setTopicStyle(e.target.value)}>
                    <option value="">Default</option>
                    <option value="concept_check">Concept check</option>
                    <option value="application">Application / scenario</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" className="btn-secondary flex-1 text-sm py-2" onClick={closeTopicModal} disabled={topicGenPending}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1 text-sm py-2 disabled:opacity-60"
                disabled={topicGenPending || topicDraft.trim().length < 2}
                onClick={() => submitTopicGenerate()}
              >
                {topicGenPending ? 'Generating…' : 'Generate question'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
