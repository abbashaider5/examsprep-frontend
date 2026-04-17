import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, BarChart2, BookmarkCheck, Camera, CheckCircle,
  ChevronRight, Clock, Code2, Eye, EyeOff, FileText, FlipHorizontal,
  Mail, Percent, RefreshCw, Send, Shield, Trophy, Users, X, Zap, Award, Edit3, RotateCw,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { examApi, instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ToggleSwitch({ checked, onChange, disabled = false }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} disabled={disabled} onChange={onChange} />
      <div className="w-9 h-5 bg-[var(--color-border)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]" />
    </label>
  );
}

// ── Edit Exam Modal ───────────────────────────────────────────────────────────
function EditExamModal({ exam, onClose }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isEnterprise = user?.plan === 'enterprise';

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
  });

  const updateMut = useMutation({
    mutationFn: (data) => examApi.update(exam._id, data),
    onSuccess: () => {
      toast.success('Exam updated!');
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const regenMut = useMutation({
    mutationFn: () => examApi.regenerate(exam._id, {}),
    onSuccess: () => {
      toast.success('Questions regenerated!');
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Regeneration failed'),
  });

  const f = (key) => (val) => setForm(s => ({ ...s, [key]: val }));

  const toggleRows = [
    { key: 'allowReattempt', icon: RefreshCw, label: 'Allow Reattempt', iconCls: 'text-[var(--color-primary)]', bgCls: 'bg-blue-100 dark:bg-blue-900/30' },
    { key: 'showFlashcards', icon: FlipHorizontal, label: 'Show Flashcards', iconCls: 'text-purple-600 dark:text-purple-400', bgCls: 'bg-purple-100 dark:bg-purple-900/30' },
    { key: 'showReview', icon: Eye, label: 'Show Answer Review (Study)', iconCls: 'text-green-600 dark:text-green-400', bgCls: 'bg-green-100 dark:bg-green-900/30' },
    { key: 'certificateEnabled', icon: Award, label: 'Generate Certificate', iconCls: 'text-amber-600 dark:text-amber-400', bgCls: 'bg-amber-100 dark:bg-amber-900/30' },
    { key: 'proctored', icon: Shield, label: 'AI Proctoring', iconCls: 'text-blue-600 dark:text-blue-400', bgCls: 'bg-blue-100 dark:bg-blue-900/30' },
    { key: 'screenshotEnabled', icon: Camera, label: 'Screenshot Capture', disabled: !form.proctored, iconCls: 'text-rose-600 dark:text-rose-400', bgCls: 'bg-rose-100 dark:bg-rose-900/30' },
    { key: 'enableCoding', icon: Code2, label: 'Coding Questions', disabled: !isEnterprise, iconCls: 'text-purple-600 dark:text-purple-400', bgCls: 'bg-purple-100 dark:bg-purple-900/30' },
    { key: 'allowCodeExecution', icon: Zap, label: 'Code Execution', disabled: !isEnterprise || !form.enableCoding, iconCls: 'text-slate-600 dark:text-slate-400', bgCls: 'bg-slate-100 dark:bg-slate-800' },
    { key: 'showResultToUser', icon: Eye, label: 'Show Result to Candidate', iconCls: 'text-indigo-600 dark:text-indigo-400', bgCls: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { key: 'showAnswersToUser', icon: EyeOff, label: 'Show Answer Review (Post-exam)', iconCls: 'text-teal-600 dark:text-teal-400', bgCls: 'bg-teal-100 dark:bg-teal-900/30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-[var(--color-bg)] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] shrink-0">
          <h2 className="font-bold text-[var(--color-text)] flex items-center gap-2">
            <Edit3 size={16} className="text-[var(--color-primary)]" /> Edit Exam
          </h2>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Basic fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label text-xs">Title</label>
              <input className="input text-sm" value={form.title} onChange={e => f('title')(e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Subject</label>
              <input className="input text-sm" value={form.subject} onChange={e => f('subject')(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          {/* Toggles */}
          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
            {toggleRows.map(({ key, icon: Icon, label, disabled, iconCls, bgCls }, idx) => (
              <div key={key} className={`flex items-center justify-between px-4 py-3 ${disabled ? 'opacity-50' : ''} ${idx < toggleRows.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${bgCls}`}>
                    <Icon size={12} className={iconCls} />
                  </div>
                  <span className="text-sm text-[var(--color-text)]">{label}</span>
                </div>
                <ToggleSwitch
                  checked={!!form[key]}
                  disabled={disabled}
                  onChange={e => !disabled && f(key)(e.target.checked)}
                />
              </div>
            ))}
          </div>

          {/* Regenerate section */}
          <div className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-bg-alt)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Regenerate Questions</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Replace all questions with a fresh AI batch</p>
              </div>
              <button
                onClick={() => regenMut.mutate()}
                disabled={regenMut.isPending}
                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 shrink-0 ml-3"
              >
                <RotateCw size={13} className={regenMut.isPending ? 'animate-spin' : ''} />
                {regenMut.isPending ? 'Generating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-[var(--color-border)] shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => updateMut.mutate(form)}
            disabled={updateMut.isPending}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5"
          >
            {updateMut.isPending ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><CheckCircle size={14} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Panel ──────────────────────────────────────────────────────────────
function ReportPanel({ examId, onClose }) {
  const [expandedRow, setExpandedRow] = useState(null);
  const [tab, setTab] = useState('candidates'); // 'candidates' | 'screenshots'

  const { data, isLoading, error } = useQuery({
    queryKey: ['examReport', examId],
    queryFn: () => instructorApi.getExamReport(examId).then(r => r.data),
    enabled: !!examId,
  });

  const { data: ssData, isLoading: ssLoading } = useQuery({
    queryKey: ['examScreenshots', examId],
    queryFn: () => instructorApi.getExamScreenshots(examId).then(r => r.data),
    enabled: !!examId && tab === 'screenshots',
  });

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-[var(--color-bg)] rounded-2xl p-8 w-full max-w-4xl">
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="skeleton h-12" />)}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="bg-[var(--color-bg)] rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
          <AlertCircle size={40} className="mx-auto mb-3 text-red-500" />
          <p className="text-[var(--color-text-muted)]">Failed to load report.</p>
          <button onClick={onClose} className="btn-secondary mt-4 text-sm">Close</button>
        </div>
      </div>
    );
  }

  const { exam, rows = [], summary = {} } = data || {};
  const screenshotsEnabled = exam?.screenshotEnabled;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-[var(--color-bg)] rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)] shrink-0">
          <div>
            <h2 className="font-bold text-[var(--color-text)]">{exam?.title}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{exam?.subject} · {exam?.difficulty} · {exam?.questions?.length || 0} questions</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-1"><X size={20} /></button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 p-5 border-b border-[var(--color-border)] shrink-0">
          {[
            { label: 'Invited', value: summary.totalInvites || 0, color: 'text-blue-500' },
            { label: 'Accepted', value: summary.accepted || 0, color: 'text-purple-500' },
            { label: 'Pending', value: summary.pending || 0, color: 'text-amber-500' },
            { label: 'Attempted', value: summary.attempted || 0, color: 'text-cyan-500' },
            { label: 'Passed', value: summary.passed || 0, color: 'text-green-500' },
            { label: 'Avg Score', value: `${summary.avgScore || 0}%`, color: 'text-[var(--color-primary)]' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-[var(--color-text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)] px-5 shrink-0">
          {[
            { key: 'candidates', label: 'Candidates', icon: Users },
            ...(screenshotsEnabled ? [{ key: 'screenshots', label: 'Screenshots', icon: Camera }] : []),
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 text-sm px-4 py-3 border-b-2 transition-colors -mb-px ${tab === key ? 'border-[var(--color-primary)] text-[var(--color-primary)] font-semibold' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 p-5">
          {tab === 'candidates' && (
            <>
              {rows.length === 0 ? (
                <div className="text-center py-10">
                  <Mail size={32} className="mx-auto mb-2 text-[var(--color-border)]" />
                  <p className="text-sm text-[var(--color-text-muted)]">No invites sent yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rows.map(row => (
                    <div key={row._id} className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--color-bg-alt)] transition-colors"
                        onClick={() => setExpandedRow(expandedRow === row._id ? null : row._id)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[var(--color-text)] truncate">{row.name || row.email}</span>
                            {row.name && <span className="text-xs text-[var(--color-text-muted)] truncate">{row.email}</span>}
                          </div>
                        </div>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          row.inviteStatus === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          row.inviteStatus === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        } capitalize`}>
                          {row.inviteStatus}
                        </span>

                        {row.latestResult ? (
                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              <div className={`text-sm font-bold ${row.latestResult.passed ? 'text-green-500' : 'text-red-500'}`}>
                                {row.latestResult.percentage}%
                              </div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">{row.latestResult.passed ? 'Passed' : 'Failed'}</div>
                            </div>
                            <div className="hidden sm:block">
                              <div className="text-xs font-medium text-[var(--color-text)]">{fmtTime(row.latestResult.timeTaken)}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">Time</div>
                            </div>
                            <div className="hidden sm:block">
                              <div className="text-xs text-[var(--color-text)]">{fmtDateTime(row.latestResult.attemptedAt)}</div>
                              <div className="text-[10px] text-[var(--color-text-muted)]">Attempted</div>
                            </div>
                            {row.totalAttempts > 1 && (
                              <div className="hidden sm:block">
                                <div className="text-xs font-medium text-[var(--color-primary)]">{row.totalAttempts}×</div>
                                <div className="text-[10px] text-[var(--color-text-muted)]">Attempts</div>
                              </div>
                            )}
                            {row.screenshotCount > 0 && (
                              <div className="hidden sm:flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                                <Camera size={10} /> {row.screenshotCount}
                              </div>
                            )}
                            {row.latestResult.proctored && (
                              <Shield size={13} className={row.latestResult.violations > 0 ? 'text-red-500' : 'text-green-500'} title="AI Proctored" />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)] shrink-0">Not attempted</span>
                        )}

                        <ChevronRight size={14} className={`text-[var(--color-text-muted)] transition-transform shrink-0 ${expandedRow === row._id ? 'rotate-90' : ''}`} />
                      </div>

                      {expandedRow === row._id && (
                        <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-alt)] p-4">
                          {row.allAttempts.length === 0 ? (
                            <p className="text-xs text-[var(--color-text-muted)]">No attempts yet.</p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">All Attempts</p>
                              {row.allAttempts.map((attempt, i) => (
                                <div key={attempt.resultId} className="flex items-center gap-3 text-xs py-2 border-b border-[var(--color-border)] last:border-0">
                                  <span className="text-[var(--color-text-muted)] w-5 shrink-0">#{i + 1}</span>
                                  <span className={`font-bold w-12 shrink-0 ${attempt.passed ? 'text-green-500' : 'text-red-500'}`}>
                                    {attempt.percentage}%
                                  </span>
                                  <span className={`w-12 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-center ${attempt.passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                    {attempt.passed ? 'Pass' : 'Fail'}
                                  </span>
                                  <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                                    <Clock size={10} /> {fmtTime(attempt.timeTaken)}
                                  </span>
                                  {attempt.proctored && (
                                    <span className={`flex items-center gap-1 ${attempt.violations > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                                      <Shield size={10} /> {attempt.violations > 0 ? `${attempt.violations} violation${attempt.violations !== 1 ? 's' : ''}` : 'Clean'}
                                    </span>
                                  )}
                                  <span className="ml-auto text-[var(--color-text-muted)]">{fmtDateTime(attempt.attemptedAt)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {row.bestResult && row.totalAttempts > 1 && (
                            <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-xs">
                              <Trophy size={12} className="text-amber-500" />
                              <span className="text-[var(--color-text-muted)]">Best: <span className="font-semibold text-[var(--color-text)]">{row.bestResult.percentage}%</span> on {fmtDateTime(row.bestResult.attemptedAt)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'screenshots' && (
            <>
              {ssLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton rounded-xl aspect-[4/3]" />)}
                </div>
              ) : !ssData?.screenshots?.length ? (
                <div className="text-center py-10">
                  <Camera size={32} className="mx-auto mb-2 text-[var(--color-border)]" />
                  <p className="text-sm text-[var(--color-text-muted)]">No screenshots captured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {ssData.screenshots.map(ss => (
                    <div key={ss._id} className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-alt)]">
                      <div className="aspect-[4/3] bg-black">
                        <img src={ss.imageUrl || ss.imageData} alt="screenshot" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-medium text-[var(--color-text)] truncate">{ss.user?.name || ss.user?.email || 'Unknown'}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{new Date(ss.capturedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        {ss.result && (
                          <span className={`mt-1 inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${ss.result.passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {ss.result.percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InstructorPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedExam, setSelectedExam] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [reportExamId, setReportExamId] = useState(null);
  const [editExam, setEditExam] = useState(null);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['instructorAnalytics'],
    queryFn: () => instructorApi.getAnalytics().then(r => r.data),
  });

  const { data: inviteData, isLoading: loadingInvites } = useQuery({
    queryKey: ['examInvites', selectedExam?._id],
    queryFn: () => instructorApi.getExamInvites(selectedExam._id).then(r => r.data),
    enabled: !!selectedExam,
  });

  const inviteMut = useMutation({
    mutationFn: ({ examId, email }) => instructorApi.sendInvite(examId, email),
    onSuccess: () => {
      toast.success('Invite sent!');
      setInviteEmail('');
      setShowInviteModal(false);
      qc.invalidateQueries({ queryKey: ['examInvites', selectedExam?._id] });
      qc.invalidateQueries({ queryKey: ['instructorAnalytics'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send invite'),
  });

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24" />)}</div>
      </div>
    );
  }

  const { totalExams = 0, totalInvites = 0, acceptedInvites = 0, avgScore = 0, exams = [] } = analyticsData || {};

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookmarkCheck size={22} className="text-[var(--color-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Instructor Dashboard</h1>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">Manage tests, track candidates, view analytics.</p>
        </div>
        <Link to="/create-exam" className="btn-primary flex items-center gap-1.5 text-sm">
          <Zap size={14} /> Create Test
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tests', value: totalExams, icon: BookmarkCheck, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Invites Sent', value: totalInvites, icon: Mail, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Accepted', value: acceptedInvites, icon: Users, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{s.value}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam list */}
        <div className="lg:col-span-2">
          <div className="card flex flex-col" style={{ maxHeight: '480px' }}>
            <h2 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2 text-sm shrink-0">
              <BarChart2 size={15} className="text-[var(--color-primary)]" /> Your Tests
            </h2>
            {exams.length === 0 ? (
              <div className="text-center py-10">
                <BookmarkCheck size={36} className="mx-auto mb-2 text-[var(--color-border)]" />
                <p className="text-sm text-[var(--color-text-muted)]">No tests yet.</p>
                <Link to="/create-exam" className="text-xs text-[var(--color-primary)] hover:underline mt-1 inline-block">Create your first test</Link>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {exams.map(exam => (
                  <div
                    key={exam._id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:border-[var(--color-primary)] ${selectedExam?._id === exam._id ? 'border-[var(--color-primary)] bg-blue-50/50 dark:bg-blue-900/10' : 'border-[var(--color-border)]'}`}
                    onClick={() => setSelectedExam(exam)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-[var(--color-text)] truncate">{exam.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{exam.subject} · {exam.difficulty}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <div className="text-center hidden sm:block">
                        <div className="text-xs font-bold text-[var(--color-text)]">{exam.inviteCount || 0}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Invites</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-bold text-[var(--color-primary)]">{exam.stats?.count || exam.timesAttempted || 0}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">Attempts</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditExam(exam); }}
                        className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                        title="Edit exam"
                      >
                        <Edit3 size={11} /> Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setReportExamId(exam._id); }}
                        className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                        title="View report"
                      >
                        <FileText size={11} /> Report
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedExam(exam); setShowInviteModal(true); }}
                        className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                      >
                        <Send size={11} /> Invite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invite details panel */}
        <div>
          {selectedExam ? (
            <div className="card flex flex-col" style={{ maxHeight: '480px' }}>
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="font-semibold text-sm text-[var(--color-text)] truncate">{selectedExam.title}</h2>
                <button onClick={() => setShowInviteModal(true)} className="btn-primary text-xs py-1 px-3 flex items-center gap-1 shrink-0 ml-2">
                  <Send size={11} /> Invite
                </button>
              </div>

              {loadingInvites ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12" />)}</div>
              ) : inviteData?.invites?.length === 0 ? (
                <div className="text-center py-8">
                  <Mail size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
                  <p className="text-xs text-[var(--color-text-muted)]">No invites sent yet.</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {inviteData?.invites?.map(inv => (
                    <div key={inv._id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-[var(--color-text)] truncate">{inv.email}</p>
                        {inv.result && (
                          <p className="text-[10px] text-green-600">Score: {inv.result.percentage}% · {inv.result.passed ? 'Passed' : 'Failed'}</p>
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                        inv.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        inv.status === 'expired' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      } capitalize`}>
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-[var(--color-border)] pt-3 mt-3 shrink-0">
                <button
                  onClick={() => setReportExamId(selectedExam._id)}
                  className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <FileText size={12} /> View Detailed Report
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Users size={32} className="mx-auto mb-2 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-muted)]">Select a test to view invites</p>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="card max-w-sm w-full animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--color-text)]">Send Test Invite</h3>
              <button onClick={() => setShowInviteModal(false)}><X size={18} className="text-[var(--color-text-muted)]" /></button>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Inviting to: <strong className="text-[var(--color-text)]">{selectedExam.title}</strong>
            </p>
            <input
              type="email"
              placeholder="candidate@email.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="input w-full mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowInviteModal(false)} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button
                onClick={() => inviteMut.mutate({ examId: selectedExam._id, email: inviteEmail })}
                disabled={!inviteEmail || inviteMut.isPending}
                className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send size={14} /> {inviteMut.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {editExam && <EditExamModal exam={editExam} onClose={() => setEditExam(null)} />}

      {/* Report Modal */}
      {reportExamId && <ReportPanel examId={reportExamId} onClose={() => setReportExamId(null)} />}
    </div>
  );
}
