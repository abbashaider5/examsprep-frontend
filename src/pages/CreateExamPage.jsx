import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Award, BookOpen, Brain, Building2, Camera, CheckCircle, CheckCircle2, ChevronDown, ChevronRight, Clock, Code2, Edit3, Eye, EyeOff, File as FileIcon, FileText, FlipHorizontal, FolderOpen, Globe, Headphones, Info, Layers, Loader2, Lock, Mail, Mic, Percent, Plus, Presentation, RefreshCw, Search, Shield, Sparkles, Timer, Trash2, Upload, Users, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import ExamLimitReachedModal from '../components/ExamLimitReachedModal.jsx';
import FeedbackModal, { shouldShowFeedback, trackFeedbackInteraction } from '../components/FeedbackModal.jsx';
import HelpTooltip from '../components/HelpTooltip.jsx';
import Modal from '../components/Modal.jsx';
import { FEATURE_AI_LISTENING } from '../config/featureFlags.js';
import { authApi, examApi, instructorApi, resourceApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { getDashboardPath } from '../utils/dashboardPath.js';
import { playWarningAudio } from '../utils/warningAudio.js';

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

/** Material-style info icon; tooltip renders in a portal so it is never clipped. */
function FieldHint({ text, placement = 'top' }) {
  return (
    <HelpTooltip content={text} placement={placement}>
      <button
        type="button"
        className="rounded-full p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 align-middle shrink-0"
        aria-label="More information"
      >
        <Info size={14} aria-hidden />
      </button>
    </HelpTooltip>
  );
}

const INITIAL_RESOURCE_FLOW = {
  open: false,
  phase: 'idle',
  resourceId: null,
  uploadPct: 0,
  startedAt: null,
  fileLabel: '',
  fileSize: 0,
  ext: '',
  libraryTitle: '',
  errorFriendly: '',
  /** @type {{ title: string, subtitle: string, tips: string[], stageLine: string, code: string } | null} */
  failurePresentation: null,
};

const FAILURE_STAGE_LABEL = {
  download: 'Loading your file',
  extract: 'Extracting PDF text',
  ocr: 'Running OCR',
  rasterize: 'Processing scanned pages',
  prepare: 'Preparing AI content',
  index: 'Saving your study index',
  upload: 'Finishing upload',
  other: 'Processing',
};

/**
 * Premium, code-specific copy for the resource AI modal (matches backend processingErrorCode).
 */
function getResourceFailurePresentation(payload) {
  const code = payload?.error?.code ?? payload?.processingErrorCode ?? 'FAILED';
  const stageKey = payload?.error?.stage ?? payload?.processingFailedStage ?? '';
  const rawMsg = (payload?.error?.message ?? payload?.processingErrorMessage ?? '').trim();

  const stageLine = stageKey && FAILURE_STAGE_LABEL[stageKey]
    ? `Stopped while: ${FAILURE_STAGE_LABEL[stageKey]}`
    : '';

  const catalog = {
    PDF_TOO_LARGE_FOR_OCR: {
      title: 'PDF too large for OCR',
      subtitle: 'This file is above what we can scan automatically.',
      tips: ['Export fewer pages or compress the PDF', 'Split into smaller uploads'],
    },
    OCR_TIMEOUT: {
      title: 'OCR timed out',
      subtitle: 'Reading scanned pages took longer than our time limit.',
      tips: ['Try fewer pages', 'Use a lighter or lower-resolution file', 'Retry after reducing size'],
    },
    OCR_FAILED: {
      title: 'Couldn’t read scanned pages',
      subtitle: 'We couldn’t pull readable text from this scan.',
      tips: ['Use a clearer, straighter scan', 'For best results, convert to Word', 'Check the file isn’t mostly blank'],
    },
    NO_TEXT_OCR: {
      title: 'Scanned PDF quality too low',
      subtitle: 'The pages may be image-only, very faint, or unreadable after OCR.',
      tips: ['Use a clearer scan', 'Convert scanned PDFs to Word for best results', 'Try a text-based export if available'],
    },
    NO_TEXT: {
      title: 'No readable text detected',
      subtitle: 'We couldn’t find enough text to build exam content.',
      tips: ['Re-export the PDF', 'Use DOCX when possible', 'Reduce image-only pages'],
    },
    EXTRACTION_FAILED: {
      title: 'PDF structure not supported',
      subtitle: 'The file may be corrupted, password-locked, or an unusual export.',
      tips: ['Export the PDF again from the original app', 'Remove password protection', 'Try DOCX instead'],
    },
    PDF_NOT_SUPPORTED: {
      title: 'This PDF couldn’t be opened',
      subtitle: 'We couldn’t process this file as a PDF.',
      tips: ['Save again from Word, Docs, or your scanner', 'Try a different export preset'],
    },
    CHUNK_FAILED: {
      title: 'Couldn’t extract study-ready content',
      subtitle: 'We couldn’t shape this into useful segments for exams.',
      tips: ['Use a document with more continuous text', 'Simplify layout', 'Re-export and try again'],
    },
    AI_INDEXING_FAILED: {
      title: 'Couldn’t save the AI index',
      subtitle: 'Something went wrong while saving indexed content.',
      tips: ['Tap Retry in a moment', 'If it repeats, try a smaller file'],
    },
    DOWNLOAD_FAILED: {
      title: 'Couldn’t load your file',
      subtitle: 'We couldn’t download it from storage.',
      tips: ['Try again shortly', 'Re-upload if it keeps happening'],
    },
    NO_FILE: {
      title: 'Upload didn’t complete',
      subtitle: 'The file didn’t attach correctly on our side.',
      tips: ['Upload again', 'Check your connection'],
    },
    UNSUPPORTED_FILE: {
      title: 'This file type isn’t supported',
      subtitle: 'Use a format LikhitAI can read for resources.',
      tips: ['DOCX, PPTX, PDF, and TXT are supported', 'Save old .ppt as .pptx'],
    },
    LEGACY_PPT: {
      title: 'Older .ppt not supported',
      subtitle: 'We need the modern .pptx format.',
      tips: ['Open in PowerPoint and Save As .pptx', 'Then upload again'],
    },
    UNEXPECTED: {
      title: 'Something interrupted processing',
      subtitle: 'The run stopped before finishing.',
      tips: ['Try Retry below', 'Or remove and upload again'],
    },
    FAILED: {
      title: 'Couldn’t finish processing',
      subtitle: 'AI preparation didn’t complete.',
      tips: ['Try Retry', 'Export the document again'],
    },
  };

  const entry = catalog[code];
  if (entry) {
    return {
      title: entry.title,
      subtitle: (rawMsg && rawMsg.length <= 280 ? rawMsg : '') || entry.subtitle,
      tips: entry.tips,
      stageLine,
      code,
    };
  }

  return {
    title: 'Couldn’t finish preparing your file',
    subtitle: rawMsg || 'Something prevented AI from completing this upload.',
    tips: ['Try Retry', 'Re-export the document', 'DOCX usually works best'],
    stageLine,
    code,
  };
}

function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileExtension(file) {
  const n = file?.name || '';
  const i = n.lastIndexOf('.');
  return i > 0 ? n.slice(i + 1).toLowerCase() : '';
}

function uploadErrorFriendly(err) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.message;
  if (status === 413) return 'File is too large for upload.';
  if (status === 403) return 'You don’t have permission to upload this resource.';
  if (status === 502) return 'Storage is temporarily unavailable. Try again shortly.';
  if (msg) return String(msg);
  return 'Upload didn’t complete. Check your connection and try again.';
}

function FileKindIcon({ ext, className = 'w-5 h-5' }) {
  const e = (ext || '').toLowerCase();
  if (e === 'pdf') return <FileText className={className} aria-hidden />;
  if (['ppt', 'pptx'].includes(e)) return <Presentation className={className} aria-hidden />;
  if (['doc', 'docx'].includes(e)) return <FileText className={className} aria-hidden />;
  if (e === 'txt') return <FileIcon className={className} aria-hidden />;
  return <FileIcon className={className} aria-hidden />;
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
                    {r.processingStatus === 'processing' || r.processingStatus === 'uploading' ? ' · Indexing…' : ''}
                    {r.processingStatus === 'failed' ? ' · Failed' : ''}
                    {(r.chunkCount > 0 || r.processingStatus === 'ready') && r.processingStatus !== 'failed' ? ' · AI ready' : ''}
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
  const { user, setUser } = useAuthStore();

  const isEnterpriseInstructor = user?.role === 'instructor' && Boolean(user?.enterprise);
  /** Org-linked instructors: billing and upgrades are handled by the organization. */
  const orgManagedBilling = user?.subscriptionBillingManagedByOrg === true;
  const enterpriseQuestionsLimit = user?.enterprise?.questionsPerExamLimit;
  const planMaxQ = isEnterpriseInstructor
    ? (enterpriseQuestionsLimit || 100)
    : (user?.plan === 'enterprise' ? 100 : user?.plan === 'pro' ? 50 : 20);
  const isFreePlan = !user?.plan || user.plan === 'free';
  const isEnterprise = user?.plan === 'enterprise';
  const enterpriseProctoringDisabled = isEnterpriseInstructor && user?.enterprise?.aiProctoringEnabled === false;
  const isInstructor = Boolean(user?.isInstructor) || ['instructor', 'admin', 'principal'].includes(user?.role);
  const usageCap = user?.monthlyLimit ?? 3;
  const usageRemaining =
    typeof user?.remaining === 'number'
      ? user.remaining
      : Math.max(0, usageCap - (user?.examsUsedThisMonth ?? 0));
  /** Legacy: null when no signal from API (avoid treating unknown as unlimited). */
  const remaining = typeof user?.remaining === 'number' ? user.remaining : (user?.monthlyLimit != null ? usageRemaining : null);
  const usageUsed = user?.examsUsedThisMonth ?? Math.max(0, usageCap - usageRemaining);
  const usagePct = usageCap > 0 ? Math.min(100, (usageUsed / usageCap) * 100) : 0;

  const [form, setForm] = useState({
    title: '', subject: '', numQuestions: 10, topics: '',
    proctored: false, examType: 'mcq', timePerQuestionInput: '',
    mixedMcqPercent: 50,
    multipleSets: false,
    includeListeningQuestions: false,
    listeningQuestionCount: 2,
    audioReplayMode: 'unlimited',
    audioReplayMax: 3,
    listeningVoiceAccent: 'american',
    listeningNarrationStyle: 'academic',
    listeningResourceGrounded: true,
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
  const resourceUploadRef = useRef(null);
  const [resourceUploadTitle, setResourceUploadTitle] = useState('');
  const [pickedUploadFile, setPickedUploadFile] = useState(null);
  const [resourceFlow, setResourceFlow] = useState(() => ({ ...INITIAL_RESOURCE_FLOW }));
  const resourceFlowRef = useRef(resourceFlow);
  resourceFlowRef.current = resourceFlow;
  const resourceSuccessDismissRef = useRef(null);
  const voicePreviewAudioRef = useRef(null);
  const [uploadInFlight, setUploadInFlight] = useState(false);
  const [uploadedResourceStub, setUploadedResourceStub] = useState(null);
  const [myLibraryExpanded, setMyLibraryExpanded] = useState(true);
  const [myLibraryQuery, setMyLibraryQuery] = useState('');
  /** `{ _id, title }` when showing delete confirmation (replaces `window.confirm`). */
  const [resourceDeleteConfirm, setResourceDeleteConfirm] = useState(null);
  const [errors, setErrors] = useState({});
  const [createdExam, setCreatedExam] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  /** Advanced listening controls: open when enabling listening, or via chevron (preview/configure before enable). */
  const [listeningSettingsExpanded, setListeningSettingsExpanded] = useState(false);

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

  const resourcePollId = resourceFlow.open && resourceFlow.phase === 'processing' ? resourceFlow.resourceId : null;
  const { data: resourceAiStatus } = useQuery({
    queryKey: ['resourceProcessing', resourcePollId],
    queryFn: () => resourceApi.getProcessingStatus(resourcePollId).then(r => r.data),
    enabled: Boolean(resourcePollId),
    refetchInterval: (q) => {
      const st = q.state.data?.processingStatus;
      if (st === 'ready' || st === 'failed') return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (!resourceFlow.open || resourceFlow.phase !== 'processing' || !resourceFlow.resourceId) return;
    const st = resourceAiStatus?.processingStatus;
    if (!st) return;
    if (st === 'ready') {
      qc.invalidateQueries({ queryKey: ['myResourcesForCreate'] });
      qc.invalidateQueries({ queryKey: ['adminResourcesForCreate'] });
      setResourceFlow((prev) => ({ ...prev, phase: 'success', uploadPct: 100 }));
    }
    if (st === 'failed') {
      setResourceFlow((prev) => ({
        ...prev,
        phase: 'failed',
        failurePresentation: getResourceFailurePresentation(resourceAiStatus),
      }));
    }
  }, [resourceAiStatus, resourceFlow.open, resourceFlow.phase, resourceFlow.resourceId, qc]);

  useEffect(() => {
    if (resourceFlow.phase !== 'success' || !resourceFlow.open) return undefined;
    if (resourceSuccessDismissRef.current) clearTimeout(resourceSuccessDismissRef.current);
    resourceSuccessDismissRef.current = window.setTimeout(() => {
      resourceSuccessDismissRef.current = null;
      setResourceFlow({ ...INITIAL_RESOURCE_FLOW });
      setPickedUploadFile(null);
      if (resourceUploadRef.current) resourceUploadRef.current.value = '';
    }, 2800);
    return () => {
      if (resourceSuccessDismissRef.current) clearTimeout(resourceSuccessDismissRef.current);
    };
  }, [resourceFlow.phase, resourceFlow.open]);

  useEffect(() => {
    if (source !== 'myresources') {
      setPickedUploadFile(null);
      if (resourceUploadRef.current) resourceUploadRef.current.value = '';
      if (resourceSuccessDismissRef.current) {
        clearTimeout(resourceSuccessDismissRef.current);
        resourceSuccessDismissRef.current = null;
      }
      setResourceFlow({ ...INITIAL_RESOURCE_FLOW });
      setMyLibraryQuery('');
      setResourceDeleteConfirm(null);
    }
  }, [source]);

  useEffect(() => {
    if (uploadedResourceStub && selectedResourceId !== uploadedResourceStub._id) {
      setUploadedResourceStub(null);
    }
  }, [selectedResourceId, uploadedResourceStub]);

  useEffect(() => {
    if (source === 'ai') {
      setForm((f) => ({ ...f, listeningResourceGrounded: false }));
    } else if (source === 'examprep' || source === 'myresources') {
      setForm((f) => ({ ...f, listeningResourceGrounded: true }));
    }
  }, [source]);

  const retryResourceProcessingMut = useMutation({
    mutationFn: (id) => resourceApi.retryProcessing(id),
    onSuccess: (_, id) => {
      toast.success('Retry started');
      setResourceFlow((prev) => ({
        ...prev,
        open: true,
        phase: 'processing',
        resourceId: id,
        errorFriendly: '',
        failurePresentation: null,
        uploadPct: 100,
      }));
      qc.invalidateQueries({ queryKey: ['myResourcesForCreate'] });
      qc.invalidateQueries({ queryKey: ['adminResourcesForCreate'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Retry failed'),
  });

  const deleteResourceMut = useMutation({
    mutationFn: (id) => resourceApi.delete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['myResourcesForCreate'] });
      if (selectedResourceId === id) setSelectedResourceId('');
      if (uploadedResourceStub?._id === id) setUploadedResourceStub(null);
      if (resourceFlowRef.current.resourceId === id) {
        setResourceFlow({ ...INITIAL_RESOURCE_FLOW });
        setPickedUploadFile(null);
        if (resourceUploadRef.current) resourceUploadRef.current.value = '';
      }
      toast.success('Removed');
      setResourceDeleteConfirm((c) => (c?._id === id ? null : c));
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not remove'),
  });

  const runMyResourceUpload = async () => {
    const file = pickedUploadFile || resourceUploadRef.current?.files?.[0];
    if (!file) {
      toast.error('Choose a supported file');
      return;
    }
    const t = resourceUploadTitle.trim();
    if (!t) {
      toast.error('Enter a title');
      return;
    }
    const ext = fileExtension(file);
    setUploadInFlight(true);
    setResourceFlow({
      ...INITIAL_RESOURCE_FLOW,
      open: true,
      phase: 'uploading',
      resourceId: null,
      uploadPct: 0,
      startedAt: Date.now(),
      fileLabel: file.name || 'Document',
      fileSize: file.size ?? 0,
      ext,
      libraryTitle: t,
    });
    try {
      const res = await resourceApi.uploadWithProgress(
        file,
        t,
        null,
        { subject: form.subject?.trim() || '' },
        ({ pct }) => {
          setResourceFlow((prev) => (prev.open && prev.phase === 'uploading' ? { ...prev, uploadPct: pct } : prev));
        },
      );
      qc.invalidateQueries({ queryKey: ['myResourcesForCreate'] });
      const r = res.data?.resource;
      if (r?._id) {
        setSelectedResourceId(r._id);
        setUploadedResourceStub(r);
        setResourceUploadTitle('');
        if (resourceUploadRef.current) resourceUploadRef.current.value = '';
        setPickedUploadFile(null);
        const st = r.processingStatus;
        if (st === 'ready') {
          setResourceFlow((prev) => ({
            ...prev,
            phase: 'success',
            resourceId: r._id,
            uploadPct: 100,
          }));
        } else if (st === 'failed') {
          setResourceFlow((prev) => ({
            ...prev,
            phase: 'failed',
            resourceId: r._id,
            uploadPct: 100,
            failurePresentation: getResourceFailurePresentation(r),
          }));
        } else {
          setResourceFlow((prev) => ({
            ...prev,
            phase: 'processing',
            resourceId: r._id,
            uploadPct: 100,
          }));
        }
      } else {
        setResourceFlow((prev) => ({
          ...prev,
          phase: 'upload_error',
          errorFriendly: 'Upload completed but the server did not return a resource. Try again.',
        }));
      }
    } catch (err) {
      setResourceFlow((prev) => ({
        ...prev,
        phase: 'upload_error',
        errorFriendly: uploadErrorFriendly(err),
      }));
    } finally {
      setUploadInFlight(false);
    }
  };

  const closeResourceAiModal = () => {
    if (resourceSuccessDismissRef.current) {
      clearTimeout(resourceSuccessDismissRef.current);
      resourceSuccessDismissRef.current = null;
    }
    setResourceFlow({ ...INITIAL_RESOURCE_FLOW });
  };

  const dismissSuccessModal = () => {
    if (resourceSuccessDismissRef.current) {
      clearTimeout(resourceSuccessDismissRef.current);
      resourceSuccessDismissRef.current = null;
    }
    setResourceFlow({ ...INITIAL_RESOURCE_FLOW });
    setPickedUploadFile(null);
    if (resourceUploadRef.current) resourceUploadRef.current.value = '';
  };

  const [showExamLimitModal, setShowExamLimitModal] = useState(false);
  const [listenGenTick, setListenGenTick] = useState(0);
  const [overlayListeningGen, setOverlayListeningGen] = useState(false);

  const createMut = useMutation({
    mutationFn: (data) => examApi.create(data),
    onMutate: (variables) => {
      setOverlayListeningGen(!!(FEATURE_AI_LISTENING && variables?.includeListeningQuestions));
      setListenGenTick(0);
    },
    onSuccess: async (res) => {
      setOverlayListeningGen(false);
      qc.invalidateQueries({ queryKey: ['myExams'] });
      qc.invalidateQueries({ queryKey: ['subscription'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      try {
        const me = await authApi.getMe();
        setUser(me.data.user);
      } catch {
        /* ignore — limits still invalidated */
      }
      toast.success('Exam created!');
      playWarningAudio('examCreationCompleted');
      trackFeedbackInteraction();
      if (isInstructor) {
        setCreatedExam(res.data.exam);
        if (shouldShowFeedback()) setTimeout(() => setShowFeedback(true), 3000);
      } else {
        navigate(`/exam/${res.data.exam._id}`);
      }
    },
    onError: (err) => {
      setOverlayListeningGen(false);
      if (err.response?.status === 429 && err.response?.data?.code === 'EXAM_LIMIT_REACHED') {
        setShowExamLimitModal(true);
      }
      toast.error(err.response?.data?.message || 'Failed to create exam');
    },
  });

  useEffect(() => {
    if (!createMut.isPending || !overlayListeningGen) return undefined;
    const id = window.setInterval(() => setListenGenTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, [createMut.isPending, overlayListeningGen]);

  useEffect(() => {
    if (!createMut.isPending) return undefined;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, [createMut.isPending]);

  const adminResources = adminResourcesData?.resources || [];
  const myResources = myResourcesData?.resources || [];
  const myLibraryQ = myLibraryQuery.trim().toLowerCase();
  const filteredMyResources = !myLibraryQ
    ? myResources
    : myResources.filter((r) =>
        (r.title || '').toLowerCase().includes(myLibraryQ)
        || (r.originalName || '').toLowerCase().includes(myLibraryQ),
      );
  const activeResources = source === 'examprep' ? adminResources : myResources;
  const activeResLoading = source === 'examprep' ? adminResLoading : myResLoading;

  const listeningDurEstimate = useMemo(() => {
    const n = Math.max(1, Math.min(15, Number(form.listeningQuestionCount) || 1));
    const lo = Math.max(1, Math.round(n * 0.48));
    const hi = Math.max(lo, Math.round(n * 0.92));
    return { lo, hi };
  }, [form.listeningQuestionCount]);

  useEffect(() => {
    if (advanced.enableCoding || form.examType === 'coding') {
      setForm((f) => (f.includeListeningQuestions ? { ...f, includeListeningQuestions: false } : f));
      setListeningSettingsExpanded(false);
    }
  }, [advanced.enableCoding, form.examType]);

  const previewVoiceMut = useMutation({
    mutationFn: () =>
      examApi.previewListeningVoice({
        accent: form.listeningVoiceAccent,
        style: form.listeningNarrationStyle,
      }),
    onSuccess: (res) => {
      const u = res?.data?.dataUrl;
      if (!u) {
        toast.error('No preview audio returned');
        return;
      }
      const el = voicePreviewAudioRef.current;
      if (el) {
        el.src = u;
        el.play().catch(() => toast.error('Playback blocked — interact with the page first.'));
      } else {
        const a = new Audio(u);
        a.play().catch(() => {});
      }
      toast.success('Playing preview');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Preview unavailable'),
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
    const selectedFromList = activeResources.find(r => r._id === selectedResourceId);
    const selRes = selectedFromList || (uploadedResourceStub?._id === selectedResourceId ? uploadedResourceStub : null);
    if (isInstructor && (source === 'examprep' || source === 'myresources') && selRes) {
      const st = selRes.processingStatus;
      if (st === 'processing' || st === 'uploading') {
        setErrors({ resource: 'Wait until AI finishes reading your material (Ready) before generating questions.' });
        return;
      }
      if (st === 'failed') {
        const fp = getResourceFailurePresentation(selRes);
        setErrors({
          resource: `${fp.title}. ${fp.tips?.[0] || 'Use Retry on the file or pick another resource.'}`,
        });
        return;
      }
    }
    const numQ = Number(form.numQuestions);
    if (numQ > planMaxQ) {
      setErrors({ numQuestions: `${isEnterpriseInstructor ? 'Your enterprise configuration' : `Your ${user?.plan || 'free'} plan`} allows up to ${planMaxQ} questions.` });
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
      proctored: enterpriseProctoringDisabled ? false : form.proctored,
      examType,
      timePerQuestion,
      ...((source === 'examprep' || source === 'myresources') && selectedResourceId ? { resourceId: selectedResourceId } : {}),
    };
    if (isInstructor && examType === 'mixed') {
      const mp = Number(form.mixedMcqPercent);
      if (!Number.isFinite(mp) || mp < 10 || mp > 90) {
        setErrors({ mixedMcqPercent: 'Choose how many questions are MCQ vs descriptive (10–90% MCQ).' });
        return;
      }
      payload.mixedMcqPercent = Math.round(mp);
    }
    if (isInstructor) {
      Object.assign(payload, {
        ...advanced,
        examType,
        timePerQuestion,
        passingPercentage: pp,
        expiryDate: advanced.expiryDate || null,
        multipleSets: !!form.multipleSets,
      });
      if (FEATURE_AI_LISTENING && !advanced.enableCoding && examType !== 'coding') {
        payload.includeListeningQuestions = !!form.includeListeningQuestions;
        if (form.includeListeningQuestions) {
          const lc = Math.min(Number(form.numQuestions) - 1, Math.max(1, Number(form.listeningQuestionCount) || 1));
          payload.listeningQuestionCount = Math.min(15, lc);
          payload.audioReplayMode = form.audioReplayMode || 'unlimited';
          if (form.audioReplayMode === 'limited') {
            payload.audioReplayMax = Math.max(2, Math.min(20, Number(form.audioReplayMax) || 3));
          }
          payload.listeningVoiceAccent = form.listeningVoiceAccent;
          payload.listeningNarrationStyle = form.listeningNarrationStyle;
          const canGroundListen = (source === 'examprep' || source === 'myresources') && !!selectedResourceId;
          payload.listeningResourceGrounded = canGroundListen ? !!form.listeningResourceGrounded : false;
        }
      }
    }
    createMut.mutate(payload);
  };

  const adv = (key) => (val) => setAdvanced(a => ({ ...a, [key]: val }));
  const setF = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const timeTotal = parseDurationInput(form.timePerQuestionInput);

  const showResourceAiOverlay = resourceFlow.open;

  useEffect(() => {
    if (!showResourceAiOverlay) return undefined;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, [showResourceAiOverlay]);

  const SOURCES = [
    { value: 'ai',          icon: Globe,       label: 'Web',                   desc: 'Generate from AI knowledge' },
    { value: 'examprep',    icon: BookOpen,    label: 'LikhitAI Resources', desc: 'Admin-curated materials' },
    { value: 'myresources', icon: FolderOpen,  label: 'My Resources',          desc: 'Your uploaded files' },
  ];

  const selectedResource = activeResources.find(r => r._id === selectedResourceId)
    || (uploadedResourceStub?._id === selectedResourceId ? uploadedResourceStub : null);

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
          <p className="text-teal-100 text-sm mt-1">Build a test with questions generated for your topic and settings.</p>
          {orgManagedBilling && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-teal-50/95 text-[11px] sm:text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Building2 size={13} className="opacity-90 shrink-0" aria-hidden />
                Managed by {user?.enterprise?.name || 'your organization'}
              </span>
              <span className="hidden sm:inline text-teal-200/80">·</span>
              <span className="tabular-nums text-teal-50/90">
                Exams this month: <strong className="font-semibold text-white">{usageUsed}</strong> / {usageCap} used
                <span className="opacity-90"> ({usageRemaining} left)</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Form ── */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">

            {/* ── Exam Type ── */}
            {(isInstructor || isEnterprise) && (
              <div>
                <label className="label mb-2 flex items-center gap-1.5 flex-wrap">
                  Exam Type
                  {isInstructor && (
                    <FieldHint
                      placement="bottom"
                      text="MCQ: all multiple choice. Descriptive: written answers. Mixed: both types in one exam. Coding: programming tasks (Enterprise)."
                    />
                  )}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EXAM_TYPES.map(et => (
                    <button
                      key={et.value}
                      type="button"
                      onClick={() => {
                        if (et.enterpriseOnly && !isEnterprise) {
                          toast('Coding exams require an Enterprise plan.', { icon: '🔒' });
                          if (!orgManagedBilling) navigate('/plan');
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
                {isInstructor && form.examType === 'mixed' && !advanced.enableCoding && (
                  <div className="mt-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 space-y-2">
                    <label className="label flex items-center gap-1.5">
                      Question mix (required)
                      <FieldHint
                        placement="bottom"
                        text="Sets how many questions are auto-graded MCQ versus descriptive answers. You can adjust the slider between 10% and 90% MCQ."
                      />
                    </label>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Choose what share of questions are multiple choice vs written answers (descriptive).
                    </p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <input
                        type="range"
                        min={10}
                        max={90}
                        value={form.mixedMcqPercent}
                        onChange={e => setF('mixedMcqPercent')(Number(e.target.value))}
                        className="flex-1 min-w-[180px] accent-[var(--color-primary)] h-2"
                      />
                      <p className="text-sm font-semibold text-[var(--color-text)] tabular-nums shrink-0">
                        {form.mixedMcqPercent}% MCQ · {100 - form.mixedMcqPercent}% written
                      </p>
                    </div>
                    {errors.mixedMcqPercent && <p className="text-red-500 text-xs">{errors.mixedMcqPercent}</p>}
                  </div>
                )}
              </div>
            )}

            {FEATURE_AI_LISTENING && isInstructor && !advanced.enableCoding && form.examType !== 'coding' && (
              <div className="relative rounded-xl p-px bg-gradient-to-br from-teal-400/45 via-indigo-400/25 to-violet-500/40 shadow-md shadow-teal-500/8 dark:from-teal-500/20 dark:via-indigo-500/15 dark:to-violet-500/25 dark:shadow-violet-900/15">
                <div className="relative rounded-[11px] bg-[var(--color-surface)] ring-1 ring-black/[0.04] dark:ring-white/[0.06] overflow-hidden">
                  <div className="absolute inset-0 rounded-[11px] pointer-events-none bg-gradient-to-br from-teal-500/[0.04] via-transparent to-violet-500/[0.06] dark:from-teal-400/[0.06]" aria-hidden />
                  <audio ref={voicePreviewAudioRef} className="hidden" preload="none" />
                  <div className="relative px-2.5 py-2 sm:px-3 sm:py-2.5">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500/15 to-violet-500/20 flex items-center justify-center text-[var(--color-primary)] border border-teal-500/10 shadow-inner">
                        <Headphones size={17} strokeWidth={1.75} aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-sm font-semibold text-[var(--color-text)] tracking-tight truncate">AI Listening Assessment</h3>
                          <Sparkles size={12} className="text-violet-500 dark:text-violet-400 shrink-0 opacity-80" aria-hidden />
                          <FieldHint
                            placement="bottom"
                            text="AI-generated items with narration; audio via CAMB.AI, stored securely. Requires CAMB_AI_API_KEY and Cloudinary."
                          />
                        </div>
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-snug truncate sm:whitespace-normal sm:line-clamp-1">
                          Generate AI-narrated listening questions automatically.
                        </p>
                      </div>
                      <ToggleSwitch
                        checked={form.includeListeningQuestions}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setF('includeListeningQuestions')(on);
                          setListeningSettingsExpanded(on);
                        }}
                      />
                      <button
                        type="button"
                        aria-expanded={listeningSettingsExpanded}
                        aria-label={listeningSettingsExpanded ? 'Collapse listening settings' : 'Expand listening settings'}
                        onClick={() => setListeningSettingsExpanded((v) => !v)}
                        className="shrink-0 p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-teal-500/10 active:scale-95 transition-all"
                      >
                        <ChevronDown size={17} className={`transition-transform duration-300 ease-out ${listeningSettingsExpanded ? 'rotate-180' : ''}`} aria-hidden />
                      </button>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${listeningSettingsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                    >
                      <div className="overflow-hidden min-h-0">
                        <div
                          className={`space-y-2 pt-2 mt-2 border-t border-[var(--color-border)]/70 transition-opacity duration-200 ${listeningSettingsExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 justify-between">
                            <p className="text-[10px] text-[var(--color-text-muted)] tabular-nums">
                              Est. duration{' '}
                              <span className="font-semibold text-[var(--color-text)]">
                                {listeningDurEstimate.lo}–{listeningDurEstimate.hi} min
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() => previewVoiceMut.mutate()}
                              disabled={previewVoiceMut.isPending}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-alt)]/60 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-teal-400/45 transition-colors disabled:opacity-50"
                            >
                              {previewVoiceMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
                              Preview voice
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 items-end">
                            <div className="flex flex-wrap items-end gap-2">
                              <div>
                                <label className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-0.5">Items</label>
                                <input
                                  type="number"
                                  className="input text-xs h-8 py-1 w-[4.25rem]"
                                  min={1}
                                  max={Math.max(1, Math.min(15, Number(form.numQuestions) - 1))}
                                  value={form.listeningQuestionCount}
                                  onChange={(e) => {
                                    const maxL = Math.max(1, Math.min(15, Number(form.numQuestions) - 1));
                                    setF('listeningQuestionCount')(Math.min(maxL, Math.max(1, Number(e.target.value) || 1)));
                                  }}
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                <span className="text-[10px] font-medium text-[var(--color-text-muted)] shrink-0">Replay</span>
                                <div className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 p-0.5 gap-px">
                                  {[
                                    { id: 'unlimited', label: 'Unlimited' },
                                    { id: 'once', label: 'Once' },
                                    { id: 'limited', label: 'Max' },
                                  ].map((opt) => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => setF('audioReplayMode')(opt.id)}
                                      className={`px-2 sm:px-2.5 py-1 rounded-[5px] text-[10px] font-semibold transition-all ${
                                        form.audioReplayMode === opt.id
                                          ? 'bg-teal-500/15 text-teal-800 dark:text-teal-100 shadow-sm ring-1 ring-teal-400/25'
                                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                                {form.audioReplayMode === 'limited' && (
                                  <input
                                    type="number"
                                    title="Max plays"
                                    className="input text-[10px] h-8 w-10 py-0 px-1 text-center tabular-nums"
                                    min={2}
                                    max={20}
                                    value={form.audioReplayMax}
                                    onChange={(e) => setF('audioReplayMax')(Math.max(2, Math.min(20, Number(e.target.value) || 3)))}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Accent</span>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { id: 'american', label: 'US', title: 'American English' },
                                  { id: 'british', label: 'UK', title: 'British English' },
                                  { id: 'indian', label: 'IN', title: 'Indian English' },
                                ].map((a) => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    title={a.title}
                                    onClick={() => setF('listeningVoiceAccent')(a.id)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                                      form.listeningVoiceAccent === a.id
                                        ? 'border-teal-400/80 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100'
                                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-teal-400/40'
                                    }`}
                                  >
                                    {a.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-medium text-[var(--color-text-muted)]">Style</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {[
                                { id: 'formal', label: 'Formal' },
                                { id: 'conversational', label: 'Casual' },
                                { id: 'academic', label: 'Academic' },
                                { id: 'kids_friendly', label: 'Kids' },
                              ].map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  title={s.id === 'conversational' ? 'Conversational' : s.id === 'kids_friendly' ? 'Kids friendly' : s.label}
                                  onClick={() => setF('listeningNarrationStyle')(s.id)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
                                    form.listeningNarrationStyle === s.id
                                      ? 'border-violet-400/70 bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100'
                                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-violet-400/40'
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(source === 'examprep' || source === 'myresources') && selectedResourceId && (
                            <label className="flex items-start gap-2 cursor-pointer rounded-lg border border-[var(--color-border)]/70 px-2 py-1.5 hover:border-teal-400/35 transition-colors">
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded accent-[var(--color-primary)] shrink-0"
                                checked={!!form.listeningResourceGrounded}
                                onChange={(e) => setF('listeningResourceGrounded')(e.target.checked)}
                              />
                              <span className="text-[10px] leading-snug text-[var(--color-text)]">
                                <span className="font-semibold">Ground in resource</span>
                                <span className="text-[var(--color-text-muted)]"> — align narration with your uploaded material.</span>
                              </span>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label flex items-center gap-1.5">
                  Exam Title
                  {isInstructor && (
                    <FieldHint placement="bottom" text="Shown to you and to candidates in invites, dashboards, and the exam header." />
                  )}
                </label>
                <input className="input" placeholder="e.g., Python Fundamentals Quiz" value={form.title} onChange={e => setF('title')(e.target.value)} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  Subject
                  {isInstructor && (
                    <FieldHint placement="bottom" text="Helps the AI focus question generation on the right domain (e.g. Biology, Python)." />
                  )}
                </label>
                <input className="input" placeholder="e.g., Python, Biology, History" value={form.subject} onChange={e => setF('subject')(e.target.value)} />
                {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="label flex items-center gap-1.5 flex-wrap">
                  <Clock size={12} /> Time per Question
                  {isInstructor && (
                    <FieldHint
                      placement="bottom"
                      text="Countdown time for each question during the live exam. Use mm:ss (e.g. 01:30) or seconds only. Minimum 10 seconds."
                    />
                  )}
                </label>
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
                <label className="label flex items-center gap-1.5">
                  Questions (5–{planMaxQ})
                  {isInstructor && (
                    <FieldHint
                      placement="bottom"
                      text={`How many questions AI will generate. Your plan allows up to ${planMaxQ} per exam.`}
                    />
                  )}
                </label>
                <input className="input" type="number" min={5} max={planMaxQ} value={form.numQuestions} onChange={e => setF('numQuestions')(e.target.value)} />
                {errors.numQuestions && <p className="text-red-500 text-xs mt-1">{errors.numQuestions}</p>}
                {isFreePlan && !orgManagedBilling && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Free: up to {planMaxQ}. <Link to="/plan" className="text-[var(--color-primary)] hover:underline">Upgrade</Link>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-1.5 flex-wrap">
                Topics (optional, comma-separated)
                {isInstructor && (
                  <FieldHint
                    placement="bottom"
                    text="Optional keywords (comma-separated) to steer which concepts appear in the generated questions."
                  />
                )}
              </label>
              <input className="input" placeholder="e.g., loops, functions, OOP" value={form.topics} onChange={e => setF('topics')(e.target.value)} />
            </div>

            {/* ── Question Source (instructors only) ── */}
            {isInstructor && (
              <div>
                <label className="label mb-2 flex items-center gap-1.5 flex-wrap">
                  Question Generate Source
                  <FieldHint
                    placement="bottom"
                    text="Web: general AI knowledge. LikhitAI Resources: curated documents. My Resources: your uploads (DOCX, PPTX, PDF, TXT). PDFs use smart text extraction and OCR for scans. Resource modes analyse the file to build questions."
                  />
                </label>

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

                {source === 'myresources' && isInstructor && (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl border border-teal-200/70 dark:border-teal-800/50 bg-gradient-to-br from-teal-50/90 via-cyan-50/40 to-violet-100/50 dark:from-teal-950/35 dark:via-[var(--color-bg-alt)] dark:to-violet-950/30 p-3 space-y-3 shadow-sm ring-1 ring-teal-500/10 dark:ring-teal-400/10">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-violet-600 flex items-center justify-center shadow-sm shrink-0">
                          <Sparkles size={14} className="text-white" aria-hidden />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold text-[var(--color-text)]">Upload for AI</p>
                          <p className="text-[9px] text-[var(--color-text-muted)]">Teal zone: new file → LikhitAI reads it</p>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-teal-800/80 dark:text-teal-300/90">Library title</label>
                        <input
                          className="input text-sm mt-1 bg-white/80 dark:bg-[var(--color-surface)]/90 border-teal-200/60 dark:border-teal-800/40"
                          value={resourceUploadTitle}
                          onChange={e => setResourceUploadTitle(e.target.value)}
                          placeholder="Title shown in your library"
                        />
                      </div>
                      <input
                        ref={resourceUploadRef}
                        type="file"
                        accept=".doc,.docx,.ppt,.pptx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          setPickedUploadFile(e.target.files?.[0] || null);
                        }}
                      />
                      {pickedUploadFile ? (
                        <div className="rounded-xl border border-violet-200/70 dark:border-violet-800/45 bg-white/70 dark:bg-violet-950/20 px-3 py-2.5 flex items-start gap-3 shadow-sm ring-1 ring-violet-400/15">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-teal-500/25 border border-violet-300/50 dark:border-violet-600/30 flex items-center justify-center shrink-0 text-violet-700 dark:text-violet-300">
                            <FileKindIcon ext={fileExtension(pickedUploadFile)} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-600/90 dark:text-violet-300/90">Chosen file</p>
                            <p className="text-xs font-semibold text-[var(--color-text)] truncate leading-snug mt-0.5" title={pickedUploadFile.name}>
                              {pickedUploadFile.name}
                            </p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 tabular-nums">
                              <span className="inline-flex items-center rounded-md border border-[var(--color-border)] px-1 py-0 font-medium uppercase tracking-wide">
                                {fileExtension(pickedUploadFile) || 'file'}
                              </span>
                              {pickedUploadFile.size ? (
                                <span className="ml-1.5">{formatFileSize(pickedUploadFile.size)}</span>
                              ) : null}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setPickedUploadFile(null);
                                if (resourceUploadRef.current) resourceUploadRef.current.value = '';
                              }}
                              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-500/10 transition-colors"
                              aria-label="Remove selected file"
                            >
                              <Trash2 size={15} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => resourceUploadRef.current?.click()}
                              className="text-[10px] font-medium text-[var(--color-primary)] hover:underline py-0.5"
                            >
                              Change file
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => resourceUploadRef.current?.click()}
                          className="w-full rounded-xl border-2 border-dashed border-teal-300/60 dark:border-teal-700/50 hover:border-teal-500/70 hover:bg-teal-50/50 dark:hover:bg-teal-950/25 py-3 px-3 text-left transition-all"
                        >
                          <span className="text-xs font-semibold text-teal-900 dark:text-teal-200">Choose file</span>
                          <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5">DOCX, PPTX, PDF, or TXT</span>
                        </button>
                      )}
                      <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed mt-2">
                        LikhitAI reads text PDFs directly and runs OCR on scanned pages automatically. Very large scans may need a smaller export.
                      </p>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={uploadInFlight || resourceFlow.open}
                          onClick={() => { void runMyResourceUpload(); }}
                          className="btn-primary text-xs py-2 px-4 rounded-xl inline-flex items-center gap-1.5"
                        >
                          {uploadInFlight ? <Loader2 size={14} className="animate-spin shrink-0" aria-hidden /> : <Upload size={14} aria-hidden />}
                          Upload & prepare with AI
                        </button>
                      </div>
                    </div>
                    {myResources.length > 0 && (
                      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-gradient-to-b from-slate-50/95 to-blue-50/30 dark:from-slate-900/40 dark:to-blue-950/20 overflow-hidden shadow-sm ring-1 ring-slate-300/20 dark:ring-slate-600/20">
                        <button
                          type="button"
                          onClick={() => setMyLibraryExpanded((e) => !e)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left bg-gradient-to-r from-blue-500/8 to-violet-500/8 hover:from-blue-500/12 hover:to-violet-500/12 transition-colors border-b border-slate-200/60 dark:border-slate-700/50"
                        >
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                            Your library
                            <span className="text-slate-500 dark:text-slate-400 font-normal"> ({myResources.length})</span>
                          </span>
                          {myLibraryExpanded ? <ChevronDown size={16} className="text-blue-600/70 dark:text-blue-400 shrink-0" aria-hidden /> : <ChevronRight size={16} className="text-blue-600/70 dark:text-blue-400 shrink-0" aria-hidden />}
                        </button>
                        {myLibraryExpanded && (
                          <>
                            <div className="px-3 pb-2 pt-2 bg-white/40 dark:bg-black/10">
                              <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500/70 pointer-events-none" aria-hidden />
                                <input
                                  type="search"
                                  className="input text-xs py-1.5 pl-8 w-full border-blue-200/50 dark:border-blue-900/40 bg-white/90 dark:bg-[var(--color-surface)]/80"
                                  placeholder="Search files…"
                                  value={myLibraryQuery}
                                  onChange={(e) => setMyLibraryQuery(e.target.value)}
                                  aria-label="Search your files"
                                />
                              </div>
                            </div>
                            <div className="max-h-52 overflow-auto border-t border-slate-200/70 dark:border-slate-700/50 bg-white/30 dark:bg-black/15">
                              <table className="w-full text-left text-[11px]">
                                <thead className="sticky top-0 z-[1] bg-gradient-to-r from-blue-100/90 to-violet-100/70 dark:from-slate-800/95 dark:to-slate-800/90 border-b border-slate-200/80 dark:border-slate-600/50">
                                  <tr className="text-slate-600 dark:text-slate-300 font-medium">
                                    <th className="px-2 py-1.5 font-medium">Title</th>
                                    <th className="px-2 py-1.5 font-medium w-[4.5rem]">Status</th>
                                    <th className="px-1 py-1.5 w-9 text-right font-medium" aria-label="Actions" />
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/50">
                                  {filteredMyResources.map((r) => {
                                    const ext = fileExtension({ name: r.originalName || '' });
                                    const busy = deleteResourceMut.isPending && deleteResourceMut.variables === r._id;
                                    const st = r.processingStatus;
                                    const statusLabel = st === 'failed' ? 'Failed' : st === 'processing' || st === 'uploading' ? 'Busy' : r.chunkCount > 0 || st === 'ready' ? 'Ready' : '—';
                                    return (
                                      <tr
                                        key={r._id}
                                        className={`cursor-pointer transition-colors ${selectedResourceId === r._id ? 'bg-teal-500/12 dark:bg-teal-500/15' : 'hover:bg-blue-50/80 dark:hover:bg-slate-800/50'}`}
                                        onClick={() => { setSelectedResourceId(r._id); setErrors((e) => ({ ...e, resource: undefined })); }}
                                      >
                                        <td className="px-2 py-1.5 min-w-0">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <FileKindIcon ext={ext} className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                                            <span className="truncate text-[var(--color-text)]" title={r.title}>{r.title}</span>
                                          </div>
                                        </td>
                                        <td className="px-2 py-1.5 text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">{statusLabel}</td>
                                        <td className="px-1 py-1 text-right">
                                          <button
                                            type="button"
                                            className="inline-flex p-1 rounded-md text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-500/10 disabled:opacity-40"
                                            disabled={busy}
                                            aria-label={`Delete ${r.title}`}
                                            onClick={(ev) => {
                                              ev.stopPropagation();
                                              setResourceDeleteConfirm({ _id: r._id, title: r.title });
                                            }}
                                          >
                                            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {filteredMyResources.length === 0 && (
                                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 py-6 px-2">No matches</p>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
                          <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                            {selectedResource.originalName}{selectedResource.pages ? ` · ${selectedResource.pages} pages` : ''}
                            {selectedResource.processingStatus === 'processing' || selectedResource.processingStatus === 'uploading' ? ' · Indexing…' : ''}
                            {selectedResource.processingStatus === 'failed' ? ' · Failed' : ''}
                            {(selectedResource.chunkCount > 0 || selectedResource.processingStatus === 'ready') && selectedResource.processingStatus !== 'failed' ? ' · AI ready' : ''}
                          </p>
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
                        Browse & select a resource…
                      </button>
                    )}
                    {errors.resource && <p className="text-red-500 text-xs mt-1.5">{errors.resource}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Multiple sets — instructors only; above proctoring */}
            {isInstructor && (
              <div className={`rounded-xl border ${form.multipleSets ? 'border-teal-400/70 bg-teal-50/40 dark:bg-teal-900/15' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'} transition-all`}>
                <div className="flex items-center gap-3 p-4">
                  <ToggleSwitch
                    checked={form.multipleSets}
                    onChange={(e) => {
                      const on = e.target.checked;
                      if (on && usageRemaining < 3) {
                        toast.error('Multiple sets use 3 tests from your usage limit. You need at least 3 remaining.');
                        return;
                      }
                      setF('multipleSets')(on);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--color-text)] flex items-center gap-2 flex-wrap">
                      <Layers size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
                      Multiple Sets
                      <FieldHint
                        placement="bottom"
                        text="Enabling this will create 3 different sets of this test. Each set will be counted as a separate test in your usage limit."
                      />
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      Each student gets one random set. You still see a single test in your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Proctoring toggle */}
            <div className={`rounded-xl border ${form.proctored ? 'border-[var(--color-primary)] bg-blue-50/40 dark:bg-blue-900/10' : 'border-[var(--color-border)] bg-[var(--color-bg-alt)]'} transition-all`}>
              <div className={`flex items-center gap-3 p-4 ${isFreePlan || enterpriseProctoringDisabled ? 'opacity-60' : ''}`}>
                <ToggleSwitch
                  checked={enterpriseProctoringDisabled ? false : form.proctored}
                  disabled={isFreePlan || enterpriseProctoringDisabled}
                  onChange={e => !isFreePlan && !enterpriseProctoringDisabled && setF('proctored')(e.target.checked)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text)] flex items-center gap-2 flex-wrap">
                    <Shield size={14} className="text-[var(--color-primary)] shrink-0" />
                    Enable AI Proctoring
                    <FieldHint
                      placement="bottom"
                      text={
                        enterpriseProctoringDisabled
                          ? 'AI Proctoring is disabled by your enterprise administrator for this organization.'
                          : isFreePlan
                          ? 'AI Proctoring is available on paid plans. It uses camera and microphone checks, detects tab and window changes, and requires fullscreen during the exam.'
                          : 'Monitors camera and microphone, detects tab switches and leaving fullscreen, and records violations. You can turn on occasional screenshots under Advanced Settings when proctoring is enabled.'
                      }
                    />
                    {(isFreePlan || enterpriseProctoringDisabled) && <Lock size={13} className="text-[var(--color-text-muted)] shrink-0" />}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {enterpriseProctoringDisabled
                      ? 'AI Proctoring is not enabled in your plan. Please contact your administrator.'
                      : isFreePlan
                      ? orgManagedBilling
                        ? 'AI Proctoring follows your organization policy. Contact your administrator if you need it enabled.'
                        : <><Link to="/plan" className="text-[var(--color-primary)] hover:underline font-medium">Upgrade to Premium</Link> to unlock AI Proctoring.</>
                      : 'Webcam monitoring, tab-switch detection, violation tracking.'
                    }
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                createMut.isPending
                || usageRemaining === 0
                || (isInstructor && form.multipleSets && usageRemaining < 3)
              }
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {createMut.isPending ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating questions…</>
              ) : usageRemaining === 0 ? (
                <><Lock size={16} /> {orgManagedBilling ? 'No exams remaining — contact your organization' : 'No exams remaining — upgrade your plan'}</>
              ) : isInstructor && form.multipleSets && usageRemaining < 3 ? (
                <><Lock size={16} /> Multiple sets need at least 3 tests left on your plan</>
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
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1 flex items-center gap-2 flex-wrap">
                <Shield size={14} className="text-[var(--color-primary)] shrink-0" />
                Advanced Settings
                <FieldHint
                  placement="left"
                  text="These options control retakes, study tools, what candidates see after the exam, passing rules, and optional expiry. They apply once the exam is generated."
                />
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">Control candidate experience for this exam.</p>

              <div className="space-y-1">
                <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <RefreshCw size={12} className="text-[var(--color-primary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Allow Reattempt
                        <FieldHint placement="left" text="Lets a candidate start a new attempt after they finish. Turn off for one-shot assessments." />
                      </p>
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
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Show Flashcards
                        <FieldHint placement="left" text="Adds flashcard study mode for this exam’s content on the student tests page, when you allow study features." />
                      </p>
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
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Show Answer Review
                        <FieldHint placement="left" text="After submitting, candidates can review their attempt. Pair with Show Answers if you want solutions visible." />
                      </p>
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
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Generate Certificate
                        <FieldHint placement="left" text="Issues a certificate when the candidate’s score meets your passing percentage." />
                      </p>
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
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Screenshot Capture
                        <FieldHint placement="left" text="During proctored exams, captures occasional screen snapshots for instructor review. Requires AI Proctoring." />
                      </p>
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
                          <FieldHint placement="left" text="Code-based questions with execution checks are limited to Enterprise. Pick the Coding exam type when available." />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          {orgManagedBilling ? 'Enterprise feature — ask your organization.' : <Link to="/plan" className="text-[var(--color-primary)] hover:underline">Enterprise only</Link>}
                        </p>
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
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Show Result
                        <FieldHint placement="left" text="Candidates see their score and outcome after the exam. Turn off if you want results only visible to instructors." />
                      </p>
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
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Show Answers
                        <FieldHint placement="left" text="Shows correct answers and AI explanations after the exam when combined with your review settings." />
                      </p>
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
                      <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                        Passing Score
                        <FieldHint placement="left" text="Minimum percentage to pass. Used for pass/fail, certificates, and reports." />
                      </p>
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
                        <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                          Set Expiry Date
                          <FieldHint placement="left" text="After this date and time, candidates can no longer start a new attempt. Existing invites respect the same cutoff." />
                        </p>
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
              {remaining !== null && !orgManagedBilling && (
                <div className={`card ${usageRemaining === 0 ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Monthly Usage</p>
                  <div className="flex items-end justify-between mb-1 gap-2">
                    <div>
                      <span className={`text-2xl font-bold ${usageRemaining === 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text)]'}`}>{usageRemaining}</span>
                      <span className="text-xs text-[var(--color-text-muted)] ml-1">remaining</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)] text-right tabular-nums">{usageUsed} / {usageCap} used</span>
                  </div>
                  <div className="w-full bg-[var(--color-bg-alt)] rounded-full h-1.5 mb-3">
                    <div className={`h-1.5 rounded-full transition-all ${usageRemaining === 0 ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${usagePct}%` }} />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-3 capitalize">{user?.plan || 'free'} plan</p>
                  {(user?.examsBonusSlots ?? 0) > 0 && (
                    <p className="text-[10px] text-[var(--color-text-muted)] mb-2">Includes {user.examsBonusSlots} add-on credit{user.examsBonusSlots === 1 ? '' : 's'} (expire with your paid plan).</p>
                  )}
                  {usageRemaining === 0 ? (
                    <button type="button" onClick={() => setShowExamLimitModal(true)} className="btn-primary text-xs py-1.5 w-full text-center block">View upgrade options</button>
                  ) : isFreePlan ? (
                    <Link to="/plan" className="text-xs text-[var(--color-primary)] font-semibold hover:underline">Upgrade for more exams &rarr;</Link>
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
        <div className={`grid grid-cols-1 gap-4 mt-6 ${orgManagedBilling ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {!orgManagedBilling && (
            <div className={`card ${usageRemaining === 0 ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
              <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Monthly exam allowance</p>
              <div className="flex items-end justify-between mb-1 gap-2">
                <div>
                  <span className={`text-2xl font-bold ${usageRemaining === 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text)]'}`}>{usageRemaining}</span>
                  <span className="text-xs text-[var(--color-text-muted)] ml-1">remaining</span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] text-right tabular-nums">{usageUsed} / {usageCap} used</span>
              </div>
              <div className="w-full bg-[var(--color-bg-alt)] rounded-full h-1.5 mb-3">
                <div className={`h-1.5 rounded-full transition-all ${usageRemaining === 0 ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${usagePct}%` }} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] capitalize">{user?.plan || 'free'} plan</p>
              {(user?.examsBonusSlots ?? 0) > 0 && (
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">+{user.examsBonusSlots} add-on credit{user.examsBonusSlots === 1 ? '' : 's'} (with paid plan).</p>
              )}
              {usageRemaining === 0 && (
                <button type="button" onClick={() => setShowExamLimitModal(true)} className="btn-primary text-xs py-1.5 w-full text-center block mt-2">View upgrade options</button>
              )}
            </div>
          )}

          <div className="card bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--color-primary)]" />
              <div>
                <p className="text-xs font-semibold text-[var(--color-text)] mb-1">Resource-based Generation</p>
                <p className="text-xs text-[var(--color-text-muted)]">Select LikhitAI Resources or My Resources as source to generate questions strictly from your uploaded material.</p>
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
                'Upload DOCX, PPTX, PDF, or TXT for curriculum-aligned, resource-grounded questions (scanned PDFs use OCR automatically)',
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
        <InstructorPostCreationModal exam={createdExam} onClose={() => { setCreatedExam(null); navigate(getDashboardPath(user?.role)); }} />
      )}

      {showFeedback && (
        <FeedbackModal trigger="exam_created" onClose={() => setShowFeedback(false)} />
      )}

      <ExamLimitReachedModal open={showExamLimitModal} onClose={() => setShowExamLimitModal(false)} managedByOrganization={orgManagedBilling} />

      {/* Resource picker modal */}
      {showResourceModal && (
        <ResourcePickerModal
          resources={activeResources}
          loading={activeResLoading}
          selected={selectedResourceId}
          onSelect={setSelectedResourceId}
          onClose={() => setShowResourceModal(false)}
          title={source === 'examprep' ? 'LikhitAI Resources' : 'My Resources'}
        />
      )}

      {resourceDeleteConfirm && (
        <Modal onClose={() => !deleteResourceMut.isPending && setResourceDeleteConfirm(null)}>
          <div className="bg-gradient-to-b from-rose-50/95 to-white dark:from-rose-950/40 dark:to-[var(--color-surface)] rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-2xl p-5 w-[min(100vw-2rem,380px)] ring-1 ring-rose-300/30 dark:ring-rose-800/30">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Remove from library?</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                  <span className="font-medium text-[var(--color-text)]">“{resourceDeleteConfirm.title}”</span>
                  {' '}will be deleted. You can’t undo this.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={deleteResourceMut.isPending}
                onClick={() => setResourceDeleteConfirm(null)}
                className="btn-secondary text-xs py-2 px-4 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteResourceMut.isPending}
                onClick={() => { deleteResourceMut.mutate(resourceDeleteConfirm._id); }}
                className="text-xs py-2 px-4 rounded-xl font-medium bg-rose-600 hover:bg-rose-700 text-white border border-rose-700/30 inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {deleteResourceMut.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showResourceAiOverlay && typeof document !== 'undefined' && createPortal(
        (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 pointer-events-auto touch-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-ai-title"
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
          >
            <style>{`
              @keyframes resourceAiSpinRing { to { transform: rotate(360deg); } }
              @keyframes resourceAiSpinRingRev { to { transform: rotate(-360deg); } }
              @keyframes resourceAiDot {
                0%, 75%, 100% { transform: translateY(0); opacity: 0.2; }
                35% { transform: translateY(-5px); opacity: 1; }
              }
              @keyframes resourceAiBar {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              @keyframes resourceAiGlowPulse {
                0%, 100% { opacity: 0.35; transform: scale(1); }
                50% { opacity: 0.65; transform: scale(1.08); }
              }
              @keyframes resourceAiBorderFlow {
                0%, 100% { filter: hue-rotate(0deg) brightness(1); }
                50% { filter: hue-rotate(-18deg) brightness(1.08); }
              }
              @keyframes resourceAiMeshDrift {
                0% { transform: translate(0, 0); }
                100% { transform: translate(-20px, -20px); }
              }
            `}</style>
            <div
              className="absolute inset-0 bg-white/40 dark:bg-slate-950/20"
              style={{ backdropFilter: 'blur(4px)' }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/25 via-transparent to-violet-100/30 dark:from-emerald-900/10 dark:via-transparent dark:to-violet-900/10 pointer-events-none" aria-hidden />
            <div className="relative z-10 w-full max-w-[min(100%,380px)]">
              <div
                className="rounded-[1.35rem] p-[2px] shadow-lg shadow-teal-400/15 dark:shadow-slate-900/25"
                style={{
                  background: 'linear-gradient(135deg, #a7f3d0, #bae6fd, #ddd6fe, #99f6e4)',
                  animation: 'resourceAiBorderFlow 5s ease-in-out infinite',
                }}
              >
                <div className="rounded-[1.2rem] bg-white dark:bg-slate-800 overflow-hidden relative min-h-[200px] border border-slate-100 dark:border-slate-600/40 shadow-sm">
                  <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
                    <div
                      className="absolute -inset-1/2 opacity-[0.06] dark:opacity-[0.04]"
                      style={{
                        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(45,212,191,0.28), transparent 55%), radial-gradient(ellipse 60% 45% at 100% 100%, rgba(167,139,250,0.18), transparent 50%)',
                        animation: 'resourceAiGlowPulse 3.2s ease-in-out infinite',
                      }}
                    />
                    <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.05] text-teal-500" style={{ animation: 'resourceAiMeshDrift 18s linear infinite' }}>
                      <svg className="w-[200%] h-[200%]" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="createResourceAiMesh" width="24" height="24" patternUnits="userSpaceOnUse">
                            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#createResourceAiMesh)" />
                      </svg>
                    </div>
                  </div>
                  <div className="relative p-6 pt-8">
                    <button
                      type="button"
                      onClick={closeResourceAiModal}
                      className={`absolute top-3 right-3 z-20 p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-600 dark:hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-200/80 transition-colors ${resourceFlow.phase === 'success' ? 'hidden' : ''}`}
                      aria-label="Close"
                    >
                      <X size={16} aria-hidden />
                    </button>

                    {resourceFlow.phase === 'success' && (
                      <div className="text-center">
                        <div className="mx-auto mb-4 relative w-16 h-16">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-teal-400/40 to-emerald-400/30 blur-md animate-pulse" />
                          <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
                            <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2} aria-hidden />
                          </div>
                        </div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-1">LikhitAI</p>
                        <h2 id="resource-ai-title" className="text-base font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-300 dark:to-emerald-300 bg-clip-text text-transparent">
                          All set
                        </h2>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 leading-snug">This file is ready. You can generate your exam when you like.</p>
                        <p className="text-xs font-semibold tabular-nums text-violet-600/90 dark:text-violet-300 mt-2">Complete · 100%</p>
                        <button type="button" onClick={dismissSuccessModal} className="btn-primary text-xs py-2.5 px-5 rounded-xl mt-5 w-full shadow-md shadow-teal-500/20">
                          Done
                        </button>
                      </div>
                    )}

                    {resourceFlow.phase === 'failed' && (() => {
                      const fp = resourceFlow.failurePresentation
                        || getResourceFailurePresentation({ processingStatus: 'failed', processingErrorCode: 'FAILED' });
                      return (
                      <div>
                        <div className="flex justify-center mb-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/25 border border-rose-300/50 dark:border-rose-800/50 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" aria-hidden />
                          </div>
                        </div>
                        <h2 id="resource-ai-title" className="text-center text-[15px] font-bold text-rose-700 dark:text-rose-300 leading-snug px-0.5">
                          {fp.title}
                        </h2>
                        <p className="text-[11px] text-[var(--color-text-muted)] text-center mt-2 leading-snug px-1">
                          {fp.subtitle}
                        </p>
                        {fp.stageLine ? (
                          <p className="text-[10px] font-medium text-violet-600/85 dark:text-violet-300/90 text-center mt-1.5 px-1">
                            {fp.stageLine}
                          </p>
                        ) : null}
                        {fp.tips?.length ? (
                          <ul className="mt-3 text-left rounded-xl border border-rose-200/40 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 px-3 py-2.5 space-y-1.5">
                            {fp.tips.map((tip, i) => (
                              <li key={i} className="text-[10px] text-[var(--color-text-muted)] leading-snug flex gap-2">
                                <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0" aria-hidden>·</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={!resourceFlow.resourceId || retryResourceProcessingMut.isPending}
                            onClick={() => resourceFlow.resourceId && retryResourceProcessingMut.mutate(resourceFlow.resourceId)}
                            className="btn-primary text-xs py-2.5 rounded-xl inline-flex items-center justify-center gap-1"
                          >
                            {retryResourceProcessingMut.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <RefreshCw size={14} aria-hidden />}
                            Retry
                          </button>
                          <button type="button" onClick={closeResourceAiModal} className="btn-secondary text-xs py-2.5 rounded-xl">
                            Close
                          </button>
                          <button
                            type="button"
                            disabled={!resourceFlow.resourceId || deleteResourceMut.isPending}
                            onClick={() => resourceFlow.resourceId && deleteResourceMut.mutate(resourceFlow.resourceId)}
                            className="btn-secondary text-xs py-2.5 rounded-xl col-span-2 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/50 inline-flex items-center justify-center gap-1"
                          >
                            {deleteResourceMut.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
                            Remove file
                          </button>
                        </div>
                      </div>
                      );
                    })()}

                    {resourceFlow.phase === 'upload_error' && (
                      <div>
                        <div className="flex justify-center mb-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/25 to-orange-500/20 border border-amber-300/50 flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden />
                          </div>
                        </div>
                        <h2 id="resource-ai-title" className="text-center text-base font-bold text-amber-800 dark:text-amber-200">Upload not sent</h2>
                        <p className="text-[10px] font-medium text-amber-700/85 dark:text-amber-300/90 text-center mt-1">Your chosen file did not reach the server</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] text-center mt-2 line-clamp-3 px-1">{resourceFlow.errorFriendly}</p>
                        <div className="mt-5 flex gap-2">
                          <button type="button" disabled={uploadInFlight} onClick={() => { void runMyResourceUpload(); }} className="btn-primary flex-1 text-xs py-2.5 rounded-xl">
                            Retry
                          </button>
                          <button type="button" onClick={closeResourceAiModal} className="btn-secondary flex-1 text-xs py-2.5 rounded-xl">
                            Close
                          </button>
                        </div>
                      </div>
                    )}

                    {(resourceFlow.phase === 'uploading' || resourceFlow.phase === 'processing') && (
                      <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-teal-600 dark:text-teal-400 mb-4">LikhitAI</p>
                        <div className="relative mx-auto mb-5 h-28 w-28">
                          <div
                            className="absolute inset-0 rounded-full border-2 border-dashed border-teal-400/35"
                            style={{ animation: 'resourceAiSpinRing 12s linear infinite' }}
                            aria-hidden
                          />
                          <div
                            className="absolute inset-1 rounded-full border-2 border-violet-400/30 border-t-violet-500 border-b-transparent"
                            style={{ animation: 'resourceAiSpinRingRev 2.4s linear infinite' }}
                            aria-hidden
                          />
                          <div
                            className="absolute inset-3 rounded-full bg-gradient-to-br from-teal-500/25 via-cyan-500/15 to-violet-500/25 blur-sm"
                            style={{ animation: 'resourceAiGlowPulse 2s ease-in-out infinite' }}
                            aria-hidden
                          />
                          <div className="absolute inset-5 rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-violet-600 flex items-center justify-center shadow-xl shadow-teal-500/35">
                            {resourceFlow.phase === 'uploading' ? (
                              <Upload className="w-9 h-9 text-white drop-shadow-md" aria-hidden />
                            ) : (
                              <Brain className="w-9 h-9 text-white drop-shadow-md" strokeWidth={1.5} aria-hidden />
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-9 h-9 rounded-xl bg-white dark:bg-slate-700 border border-teal-200/70 dark:border-teal-700/50 flex items-center justify-center shadow-md text-teal-600 dark:text-teal-300">
                            <Sparkles className="w-4 h-4" aria-hidden />
                          </div>
                        </div>
                        <h2 id="resource-ai-title" className="text-sm font-bold text-[var(--color-text)]">
                          {resourceFlow.phase === 'uploading' ? 'Uploading your chosen file' : 'LikhitAI is preparing your file'}
                        </h2>
                        <p className="text-[11px] text-violet-600/85 dark:text-violet-300/90 mt-1 font-medium leading-snug px-1">
                          {resourceFlow.phase === 'uploading'
                            ? 'Sending securely — you’ll see progress below.'
                            : (resourceAiStatus?.processingStageLabel?.trim()
                              || 'Extracting text and building the index for exam questions. This usually takes a short while.')}
                        </p>
                        <p className="text-2xl font-bold tabular-nums bg-gradient-to-r from-teal-600 to-violet-600 dark:from-teal-300 dark:to-violet-300 bg-clip-text text-transparent mt-3">
                          {resourceFlow.phase === 'uploading' ? `${Math.min(100, resourceFlow.uploadPct || 0)}%` : 'In progress'}
                        </p>
                        <p className="text-[10px] font-medium text-teal-700/80 dark:text-teal-300/90 mt-1">
                          {resourceFlow.phase === 'uploading' ? 'Upload status' : 'Processing status'}
                        </p>
                        <div className="mt-4 h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden relative ring-1 ring-teal-500/15">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-violet-500 transition-[width] duration-200 shadow-sm"
                            style={{ width: `${resourceFlow.phase === 'uploading' ? Math.min(100, resourceFlow.uploadPct || 0) : 100}%` }}
                          />
                          {resourceFlow.phase === 'processing' && (
                            <div
                              className="absolute inset-0 opacity-40 pointer-events-none"
                              style={{
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)',
                                animation: 'resourceAiBar 1.2s ease-in-out infinite',
                              }}
                            />
                          )}
                        </div>
                        <div className="flex justify-center gap-1.5 mt-4">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <span
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-teal-500 to-violet-500"
                              style={{ animation: 'resourceAiDot 1.05s ease-in-out infinite', animationDelay: `${i * 0.06}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
        document.body,
      )}

      {createMut.isPending && typeof document !== 'undefined' && createPortal(
        (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-auto touch-none"
            role="alertdialog"
            aria-modal="true"
            aria-busy="true"
            aria-labelledby="test-gen-overlay-title"
            onWheel={(e) => e.preventDefault()}
            onTouchMove={(e) => e.preventDefault()}
          >
            <style>{`
              @keyframes testGenOverlayFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes testGenModalEnter {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
              @keyframes testGenDot {
                0%, 75%, 100% { transform: translateY(0); opacity: 0.35; }
                35% { transform: translateY(-8px); opacity: 1; }
              }
            `}</style>
            <div
              className="absolute inset-0 cursor-wait"
              style={{
                backgroundColor: 'rgba(0,0,0,0.5)',
                animation: 'testGenOverlayFadeIn 0.22s ease-out forwards',
              }}
              aria-hidden
            />
            <div
              className="relative z-10 w-full max-w-lg rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/20 overflow-hidden pointer-events-none"
              style={{ animation: 'testGenModalEnter 0.32s cubic-bezier(0.16, 1, 0.3, 1) 0.04s both' }}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[140%] h-64 bg-gradient-to-r from-teal-400/35 via-cyan-400/25 to-violet-500/30 opacity-90 animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.07] dark:opacity-[0.12]">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="createExamGenGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[var(--color-primary)]" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#createExamGenGrid)" />
                  </svg>
                </div>
              </div>

              <div className="relative px-8 sm:px-12 py-12 sm:py-14 text-center">
                <div className="relative mx-auto mb-10 w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-teal-400/50 animate-ping" style={{ animationDuration: '2.2s' }} />
                  <div
                    className="absolute inset-3 rounded-full border border-blue-400/40 animate-ping"
                    style={{ animationDuration: '2.8s', animationDelay: '0.35s' }}
                  />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 shadow-xl shadow-teal-500/35">
                    <Sparkles className="w-11 h-11 text-white drop-shadow-md" strokeWidth={1.35} />
                  </div>
                  <div className="absolute -right-1 -bottom-1 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-bg-alt)] border border-[var(--color-border)] shadow-md text-[var(--color-primary)]">
                    <Brain className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-alt)]/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
                  <Wand2 className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  AI generation
                </div>

                <h2 id="test-gen-overlay-title" className="text-xl sm:text-2xl font-bold text-[var(--color-text)] tracking-tight mb-3">
                  Your test is being generated
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-sm mx-auto mb-10">
                  {overlayListeningGen
                    ? [
                        'Generating listening exercises…',
                        'Creating AI narration…',
                        'Preparing educational audio…',
                        'Generating comprehension content…',
                        'Finalizing audio questions…',
                      ][listenGenTick % 5]
                    : 'Our AI is composing questions to match your topic, difficulty, and format. This may take up to a minute — please keep this page open.'}
                </p>

                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-[var(--color-primary)]"
                      style={{
                        animation: 'testGenDot 1.15s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        ),
        document.body,
      )}
    </div>
  );
}
