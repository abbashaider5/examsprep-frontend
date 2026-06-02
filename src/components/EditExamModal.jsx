import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Award, BookOpen, Calendar, Camera, CheckCircle, Code2, Edit3,
    Eye, EyeOff, FlipHorizontal, Percent, RefreshCw,
    RotateCw, Shield, X, Zap,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { getAiErrorPresentation } from '../utils/aiErrorPresentation.js';
import AiServiceUnavailableModal from './AiServiceUnavailableModal.jsx';
import Modal from './Modal.jsx';

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} disabled={disabled} onChange={onChange} />
      <div className="w-9 h-5 bg-[var(--color-border)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]" />
    </label>
  );
}

export default function EditExamModal({ exam, onClose, invalidateKey }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isEnterprise = user?.plan === 'enterprise';
  const enterpriseProctoringDisabled = user?.role === 'instructor' && Boolean(user?.enterprise) && user?.enterprise?.aiProctoringEnabled === false;

  const [aiErrorModal, setAiErrorModal] = useState(null);

  const [form, setForm] = useState({
    title: exam.title || '',
    subject: exam.subject || '',
    difficulty: exam.difficulty || 'medium',
    passingPercentage: exam.passingPercentage ?? 75,
    allowReattempt: exam.allowReattempt ?? true,
    showFlashcards: exam.showFlashcards ?? true,
    showReview: exam.showReview ?? true,
    certificateEnabled: exam.certificateEnabled ?? true,
    proctored: exam.proctored ?? false,
    screenshotEnabled: exam.screenshotEnabled ?? false,
    enableCoding: exam.enableCoding ?? false,
    allowCodeExecution: exam.allowCodeExecution ?? false,
    showResultToUser: exam.showResultToUser ?? true,
    showAnswersToUser: exam.showAnswersToUser ?? true,
    expiryDate: exam.expiryDate ? new Date(exam.expiryDate).toISOString().slice(0, 16) : '',
  });

  const updateMut = useMutation({
    mutationFn: (data) => examApi.update(exam._id, data),
    onSuccess: () => {
      toast.success('Exam updated!');
      qc.invalidateQueries({ queryKey: [invalidateKey || 'instructorAnalytics'] });
      qc.invalidateQueries({ queryKey: ['myExams'] });
      qc.invalidateQueries({ queryKey: ['myAcceptedInvites'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const regenMut = useMutation({
    mutationFn: () => examApi.regenerate(exam._id, {}),
    onSuccess: () => {
      toast.success('Questions regenerated!');
      qc.invalidateQueries({ queryKey: [invalidateKey || 'instructorAnalytics'] });
      qc.invalidateQueries({ queryKey: ['myExams'] });
    },
    onError: (err) => {
      const aiPres = getAiErrorPresentation(err, { isAdmin: user?.role === 'admin' });
      if (aiPres) {
        setAiErrorModal(aiPres);
        toast.error(aiPres.kind === 'admin' ? 'AI service failure' : aiPres.title);
        return;
      }
      toast.error(err.response?.data?.message || 'Regeneration failed');
    },
  });

  const f = (key) => (val) => setForm(s => ({ ...s, [key]: val }));

  const toggleRows = [
    { key: 'allowReattempt', icon: RefreshCw, label: 'Allow Reattempt', iconCls: 'text-[var(--color-primary)]', bgCls: 'bg-blue-100 dark:bg-blue-900/30' },
    { key: 'showFlashcards', icon: FlipHorizontal, label: 'Show Flashcards', iconCls: 'text-purple-600 dark:text-purple-400', bgCls: 'bg-purple-100 dark:bg-purple-900/30' },
    { key: 'showReview', icon: Eye, label: 'Show Answer Review (Study)', iconCls: 'text-green-600 dark:text-green-400', bgCls: 'bg-green-100 dark:bg-green-900/30' },
    { key: 'certificateEnabled', icon: Award, label: 'Generate Certificate', iconCls: 'text-amber-600 dark:text-amber-400', bgCls: 'bg-amber-100 dark:bg-amber-900/30' },
    { key: 'proctored', icon: Shield, label: 'AI Proctoring', disabled: enterpriseProctoringDisabled, iconCls: 'text-blue-600 dark:text-blue-400', bgCls: 'bg-blue-100 dark:bg-blue-900/30' },
    { key: 'screenshotEnabled', icon: Camera, label: 'Screenshot Capture', disabled: !form.proctored || enterpriseProctoringDisabled, iconCls: 'text-rose-600 dark:text-rose-400', bgCls: 'bg-rose-100 dark:bg-rose-900/30' },
    { key: 'enableCoding', icon: Code2, label: 'Coding Questions', iconCls: 'text-purple-600 dark:text-purple-400', bgCls: 'bg-purple-100 dark:bg-purple-900/30' },
    { key: 'allowCodeExecution', icon: Zap, label: 'Code Execution', disabled: !form.enableCoding, iconCls: 'text-slate-600 dark:text-slate-400', bgCls: 'bg-slate-100 dark:bg-slate-800' },
    { key: 'showResultToUser', icon: Eye, label: 'Show Result to Candidate', iconCls: 'text-indigo-600 dark:text-indigo-400', bgCls: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { key: 'showAnswersToUser', icon: EyeOff, label: 'Show Answer Review (Post-exam)', iconCls: 'text-teal-600 dark:text-teal-400', bgCls: 'bg-teal-100 dark:bg-teal-900/30' },
  ];

  return (
    <>
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <Edit3 size={16} className="text-[var(--color-primary)]" /> Edit Exam
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={18} /></button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0">

          {/* Left column — fields, expiry, actions */}
          <div className="w-[52%] flex flex-col overflow-y-auto border-r border-[var(--color-border)] p-5 space-y-4">

            {/* Title & Subject */}
            <div className="space-y-3">
              <div>
                <label className="label text-xs">Title</label>
                <input className="input text-sm" value={form.title} onChange={e => f('title')(e.target.value)} />
              </div>
              <div>
                <label className="label text-xs">Subject</label>
                <input className="input text-sm" value={form.subject} onChange={e => f('subject')(e.target.value)} />
              </div>
            </div>

            {/* Difficulty & Passing % */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Difficulty</label>
                <select className="input text-sm" value={form.difficulty} onChange={e => f('difficulty')(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Passing %</label>
                <div className="flex items-center gap-1.5">
                  <input className="input text-sm text-center" type="number" min={1} max={100} value={form.passingPercentage} onChange={e => f('passingPercentage')(e.target.value)} />
                  <Percent size={14} className="text-[var(--color-text-muted)] shrink-0" />
                </div>
              </div>
            </div>

            {/* Expiry Date */}
            <div className="border border-[var(--color-border)] rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-rose-100 dark:bg-rose-900/30">
                    <Calendar size={12} className="text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <span className="text-sm text-[var(--color-text)]">Set Expiry Date</span>
                    {!form.expiryDate && (
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Never expires (lifetime access).</p>
                    )}
                  </div>
                </div>
                <ToggleSwitch
                  checked={!!form.expiryDate}
                  onChange={e => f('expiryDate')(e.target.checked ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) : '')}
                />
              </div>
              {form.expiryDate && (
                <input
                  type="datetime-local"
                  className="input text-sm w-full mt-3"
                  value={form.expiryDate}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => f('expiryDate')(e.target.value)}
                />
              )}
            </div>

            {/* Spacer to push actions to bottom */}
            <div className="flex-1" />

            {/* Edit Questions */}
            <div className="border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-sm font-medium text-[var(--color-text)] mb-1">Review & Edit Questions</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">View and edit individual question text, options, and answers</p>
              <button
                onClick={() => { onClose(); navigate(`/exam/${exam._id}/edit-questions`); }}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 w-full justify-center"
              >
                <BookOpen size={13} /> Edit Questions
              </button>
            </div>

            {/* Regenerate */}
            <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-alt)]">
              <p className="text-sm font-medium text-[var(--color-text)] mb-1">Regenerate Questions</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">Replace all questions with a fresh AI batch</p>
              <button
                onClick={() => regenMut.mutate()}
                disabled={regenMut.isPending}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 w-full justify-center"
              >
                <RotateCw size={13} className={regenMut.isPending ? 'animate-spin' : ''} />
                {regenMut.isPending ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          </div>

          {/* Right column — toggles */}
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Settings</p>
            {enterpriseProctoringDisabled && (
              <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                AI Proctoring is not enabled in your plan. Please contact your administrator.
              </div>
            )}
            <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
              {toggleRows.map(({ key, icon: Icon, label, disabled, iconCls, bgCls }, idx) => (
                <div
                  key={key}
                  className={`flex items-center justify-between px-4 py-3 ${disabled ? 'opacity-50' : ''} ${idx < toggleRows.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${bgCls}`}>
                      <Icon size={12} className={iconCls} />
                    </div>
                    <span className="text-sm text-[var(--color-text)]">{label}</span>
                  </div>
                  <ToggleSwitch checked={!!form[key]} disabled={disabled} onChange={e => !disabled && f(key)(e.target.checked)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--color-border)] shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => updateMut.mutate({ ...form, expiryDate: form.expiryDate || null })}
            disabled={updateMut.isPending}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5"
          >
            {updateMut.isPending
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              : <><CheckCircle size={14} /> Save Changes</>}
          </button>
        </div>
      </div>
    </Modal>
    <AiServiceUnavailableModal
      open={!!aiErrorModal}
      presentation={aiErrorModal}
      onClose={() => setAiErrorModal(null)}
      onRetry={() => {
        setAiErrorModal(null);
        regenMut.mutate();
      }}
    />
    </>
  );
}
