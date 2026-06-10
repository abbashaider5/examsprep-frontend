import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart2, BookOpen, CheckCircle, Clock, Download, Edit3, FlipHorizontal, Hash, Layers,
  Lightbulb, Loader2, Mail,
  KeyRound,
  RotateCcw, Search, Shield, Star,
  Target, Timer,
  Trash2,
  TrendingUp, Upload, UserCheck, Users, X
} from 'lucide-react';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EditExamModal from '../components/EditExamModal.jsx';
import ExamAccessKeyModal from '../components/ExamAccessKeyModal.jsx';
import Modal from '../components/Modal.jsx';
import { enterpriseApi, examApi, groupApi, instructorApi, resultApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

function diffBadgeClass(d) {
  return d === 'easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
    : d === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
}

// ── Invite modal — two-column layout ─────────────────────────────────────────
function InviteModal({ exam, onClose }) {
  const { user } = useAuthStore();
  const isEnterpriseInstructor = user?.role === 'instructor' && Boolean(user?.enterprise);
  const [inviteMode, setInviteMode] = useState(isEnterpriseInstructor ? 'class' : 'email');
  const [inviteEmailTab, setInviteEmailTab] = useState('single');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteParsedEmails, setInviteParsedEmails] = useState([]);
  const [inviteFileName, setInviteFileName] = useState('');
  const [inviteGroupId, setInviteGroupId] = useState('');
  const [inviteClassIds, setInviteClassIds] = useState([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const { data: groupsData } = useQuery({
    queryKey: ['myGroups'],
    queryFn: () => groupApi.getAll().then(r => r.data),
  });
  const myGroups = (groupsData?.groups || []).filter(
    g => g.instructor?._id === user?._id || g.instructor === user?._id
  );

  const { data: schoolClassesData } = useQuery({
    queryKey: ['schoolClasses'],
    queryFn: () => enterpriseApi.schoolClasses().then((r) => r.data),
    enabled: isEnterpriseInstructor,
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInviteFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const emails = [];
        for (const row of rows) {
          for (const cell of row) {
            const val = String(cell || '').trim().toLowerCase();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) emails.push(val);
          }
        }
        const unique = [...new Set(emails)];
        if (!unique.length) { toast.error('No valid emails found in file'); return; }
        setInviteParsedEmails(unique);
        toast.success(`Found ${unique.length} email(s)`);
      } catch { toast.error('Failed to parse file'); }
    };
    reader.readAsArrayBuffer(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([['Name', 'Email'], ['Alice Smith', 'alice@example.com'], ['Bob Jones', 'bob@example.com']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invites');
    XLSX.writeFile(wb, 'invite_sample.xlsx');
  };

  const sendSingle = async () => {
    if (!inviteEmail) return;
    setSending(true);
    try {
      await instructorApi.sendInvite(exam._id, inviteEmail);
      toast.success('Invite sent!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally { setSending(false); }
  };

  const sendBulk = async () => {
    if (!inviteParsedEmails.length) return;
    setSending(true);
    const results = await Promise.allSettled(inviteParsedEmails.map(email => instructorApi.sendInvite(exam._id, email)));
    const ok  = results.filter(r => r.status === 'fulfilled').length;
    const err = results.filter(r => r.status === 'rejected').length;
    setSending(false);
    if (ok > 0) toast.success(`${ok} invite${ok !== 1 ? 's' : ''} sent!`);
    if (err > 0) toast.error(`${err} invite${err !== 1 ? 's' : ''} failed`);
    onClose();
  };

  const sendGroup = async () => {
    if (!inviteGroupId) return;
    setSending(true);
    try {
      const res = await instructorApi.sendGroupInvite(exam._id, inviteGroupId);
      toast.success(res.data.message || 'Batch invited');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite batch');
    } finally { setSending(false); }
  };

  const sendClassInvite = async () => {
    if (!inviteClassIds.length) return;
    setSending(true);
    try {
      const res = await instructorApi.sendClassInvite(exam._id, inviteClassIds);
      toast.success(res.data.message || 'Class invite sent');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite class');
    } finally { setSending(false); }
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-7xl h-[520px] flex overflow-hidden" style={{ maxHeight: '85vh' }}>

        {/* LEFT: Test details panel */}
        <div className="w-80 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 p-5 flex flex-col gap-4 overflow-y-auto">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Test</p>
            <h4 className="font-bold text-sm text-[var(--color-text)] leading-snug">{exam.title}</h4>
          </div>

          {/* Subject + Difficulty */}
          <div className="flex flex-wrap gap-1.5">
            {exam.subject && (
              <span className="text-[10px] font-semibold bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                {exam.subject}
              </span>
            )}
            {exam.difficulty && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${diffBadgeClass(exam.difficulty)}`}>
                {exam.difficulty}
              </span>
            )}
          </div>

          {/* Settings */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Settings</p>
            <div className="space-y-1.5">
              {[
                { label: 'AI Proctoring', value: exam.proctored, icon: Shield },
                { label: 'Multiple Sets', value: exam.multipleSets, icon: Layers },
                { label: 'Reattempt', value: exam.allowReattempt, icon: RotateCcw },
                { label: 'Certificate', value: exam.certificateEnabled !== false, icon: Star },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                    <item.icon size={11} className="shrink-0" /> {item.label}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.value
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                  }`}>
                    {item.value ? 'On' : 'Off'}
                  </span>
                </div>
              ))}
              {exam.passingPercentage != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Passing Score</span>
                  <span className="text-xs font-bold text-[var(--color-text)]">{exam.passingPercentage}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Expiry */}
          {exam.expiryDate && (
            <div className="flex items-start gap-1.5">
              <Timer size={11} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-[var(--color-text-muted)]">Expires</p>
                <p className="text-xs text-[var(--color-text)]">
                  {new Date(exam.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                {new Date(exam.expiryDate) < new Date() && (
                  <p className="text-[10px] text-red-500 font-semibold mt-0.5">Expired</p>
                )}
              </div>
            </div>
          )}

          {/* Questions count */}
          {exam.questions?.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Layers size={11} className="text-[var(--color-text-muted)]" />
              <span className="text-xs text-[var(--color-text-muted)]">{exam.questions.length} questions</span>
            </div>
          )}
        </div>

        {/* RIGHT: Invite form */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-[var(--color-border)] shrink-0">
            <div>
              <h3 className="font-semibold text-[var(--color-text)] text-base">Send Test Invite</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Invite students to attempt this test</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] shrink-0">
              <X size={18} className="text-[var(--color-text-muted)]" />
            </button>
          </div>

          {/* Mode toggle */}
          {!isEnterpriseInstructor && (
            <div className="px-5 pt-4 shrink-0">
              <div className="flex gap-1 p-1 bg-[var(--color-bg-alt)] rounded-xl">
                {[
                  { id: 'email', label: 'By Email', icon: Mail },
                  { id: 'group', label: 'By Batch', icon: Users },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setInviteMode(m.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                      inviteMode === m.id
                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    <m.icon size={14} /> {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form content */}
          <div className="flex flex-col flex-1 px-5 pt-4 pb-5 min-h-0">
            {isEnterpriseInstructor ? (
              <div className="flex flex-col flex-1 min-h-0">
                <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 shrink-0">Select Class(es)</label>
                {(schoolClassesData?.classes || []).length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-6 px-4">
                      <Users size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
                      <p className="text-sm text-[var(--color-text-muted)]">No classes yet.</p>
                      <Link to="/school/classes/new" onClick={onClose} className="text-xs text-[var(--color-primary)] hover:underline mt-1 inline-block">
                        Create a class first
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-2 max-h-[220px] overflow-y-auto shrink-0">
                      {(schoolClassesData?.classes || []).map(c => {
                        const checked = inviteClassIds.includes(c._id);
                        return (
                          <label key={c._id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setInviteClassIds(prev => checked ? prev.filter(id => id !== c._id) : [...prev, c._id])}
                            />
                            <span className="text-sm text-[var(--color-text)]">
                              {c.name}{c.section ? ` · ${c.section}` : ''} <span className="text-xs text-[var(--color-text-muted)]">({c.studentCount || 0} students)</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="min-h-5 mt-2 shrink-0">
                      {inviteClassIds.length > 0 && (
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          Students in selected classes will receive a test invite for <strong className="text-[var(--color-text)]">{exam.title}</strong>.
                        </p>
                      )}
                    </div>
                  </>
                )}
                <div className="flex gap-3 mt-auto shrink-0 pt-3">
                  <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                  <button
                    onClick={sendClassInvite}
                    disabled={!inviteClassIds.length || sending}
                    className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Users size={14} /> {sending ? 'Sending…' : 'Invite Class'}
                  </button>
                </div>
              </div>
            ) : inviteMode === 'email' ? (
              <>
                {/* Email sub-tabs */}
                <div className="flex gap-3 mb-4 border-b border-[var(--color-border)] shrink-0">
                  {[
                    { id: 'single', label: 'Single Email' },
                    { id: 'bulk', label: 'Upload Excel / CSV' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setInviteEmailTab(t.id)}
                      className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                        inviteEmailTab === t.id
                          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                          : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {inviteEmailTab === 'single' ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 shrink-0">Student Email Address</label>
                    <input
                      type="email"
                      placeholder="student@email.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && inviteEmail && sendSingle()}
                      className="input w-full shrink-0"
                      autoFocus
                    />
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-2 shrink-0">
                      The student will receive an email with a direct link to this test.
                    </p>
                    <div className="flex gap-3 mt-auto shrink-0 pt-4">
                      <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                      <button
                        onClick={sendSingle}
                        disabled={!inviteEmail || sending}
                        className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Mail size={14} /> {sending ? 'Sending…' : 'Send Invite'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 rounded-xl p-5 text-center cursor-pointer transition-colors shrink-0"
                    >
                      <Upload size={20} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {inviteFileName || 'Click to upload .xlsx / .xls / .csv'}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Emails extracted automatically from any column</p>
                      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
                    </div>
                    <button onClick={downloadSample} className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline mt-2 shrink-0 w-fit">
                      <Download size={11} /> Download sample file
                    </button>
                    {inviteParsedEmails.length > 0 && (
                      <div className="flex-1 overflow-y-auto mt-3 min-h-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-[var(--color-text)]">{inviteParsedEmails.length} email{inviteParsedEmails.length !== 1 ? 's' : ''} found</span>
                          <button onClick={() => { setInviteParsedEmails([]); setInviteFileName(''); }} className="text-[11px] text-red-500 hover:underline">Clear</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {inviteParsedEmails.map(e => (
                            <span key={e} className="inline-flex items-center gap-1 text-[11px] bg-[var(--color-bg-alt)] text-[var(--color-text)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                              {e}
                              <button onClick={() => setInviteParsedEmails(p => p.filter(x => x !== e))} className="hover:text-red-500"><X size={9} /></button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 mt-auto shrink-0 pt-3">
                      <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                      <button
                        onClick={sendBulk}
                        disabled={!inviteParsedEmails.length || sending}
                        className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Mail size={14} /> {sending ? 'Sending…' : `Send ${inviteParsedEmails.length || ''} Invite${inviteParsedEmails.length !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Batch tab */
              <div className="flex flex-col flex-1 min-h-0">
                <label className="text-xs font-medium text-[var(--color-text-muted)] mb-1.5 shrink-0">Select Batch</label>
                {myGroups.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-6 px-4">
                      <Users size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
                      <p className="text-sm text-[var(--color-text-muted)]">No batches yet.</p>
                      <Link to="/batches" onClick={onClose} className="text-xs text-[var(--color-primary)] hover:underline mt-1 inline-block">
                        Create a batch first
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <select className="input w-full text-sm shrink-0" value={inviteGroupId} onChange={e => setInviteGroupId(e.target.value)}>
                      <option value="">Choose a batch…</option>
                      {myGroups.map(g => (
                        <option key={g._id} value={g._id}>{g.name} ({g.members?.length || 0} members)</option>
                      ))}
                    </select>
                    {inviteGroupId && (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-2 shrink-0">
                        All members of this batch will receive a test invite for <strong className="text-[var(--color-text)]">{exam.title}</strong>.
                      </p>
                    )}
                    <div className="flex gap-3 mt-auto shrink-0 pt-4">
                      <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
                      <button
                        onClick={sendGroup}
                        disabled={!inviteGroupId || sending}
                        className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Users size={14} /> {sending ? 'Sending…' : 'Invite Batch'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

const DIFF_COLORS = {
  easy: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-400' },
  medium: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-400' },
  hard: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-400' },
};

const CARD_GRADIENTS = [
  'from-teal-400 to-cyan-500',
  'from-blue-400 to-indigo-500',
  'from-teal-500 to-blue-600',
  'from-sky-400 to-blue-500',
  'from-cyan-400 to-teal-500',
  'from-blue-500 to-indigo-600',
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudyModePage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isInstructorOnly = user?.role === 'instructor';
  const { data, isLoading: examsLoading } = useQuery({ queryKey: ['myExams'], queryFn: () => examApi.getAll().then(r => r.data) });
  const { data: resultsData } = useQuery({ queryKey: ['myResults'], queryFn: () => resultApi.getAll().then(r => r.data) });
  const { data: acceptedInvitesData } = useQuery({
    queryKey: ['myAcceptedInvites'],
    queryFn: () => instructorApi.getMyAcceptedInvites().then(r => r.data),
  });
  const { data: groupsData } = useQuery({
    queryKey: ['myGroups'],
    queryFn: () => groupApi.getAll().then(r => r.data),
  });

  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [examData, setExamData] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState('flashcard');
  const [inviteExam, setInviteExam] = useState(null);
  const [editExam, setEditExam] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [accessKeyExam, setAccessKeyExam] = useState(null);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('all');

  const ownExams = data?.exams || [];
  const results = resultsData?.results || [];
  const acceptedInvites = isInstructorOnly ? [] : (acceptedInvitesData?.invites || []);
  const isInstructor = user?.isInstructor || ['instructor', 'admin'].includes(user?.role);

  const deleteExamMut = useMutation({
    mutationFn: (id) => examApi.delete(id),
    onSuccess: () => {
      toast.success('Test deleted');
      qc.invalidateQueries({ queryKey: ['myExams'] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete test'),
  });

  // Build a map of group ID → name for fallback when invite.group isn't populated
  const groupMap = Object.fromEntries(
    (groupsData?.groups || []).map(g => [g._id, g.name])
  );

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  const ownExamIds = new Set(ownExams.map(e => String(e._id)));
  const invitedEntries = acceptedInvites
    .filter(inv => inv.exam?._id && !ownExamIds.has(String(inv.exam._id)))
    .map(inv => ({
      ...inv.exam,
      _inviteId: inv._id,
      _inviteToken: inv.token,
      _invitedBy: inv.invitedBy?.name,
      _groupName: inv.group?.name || (inv.group ? groupMap[inv.group._id || inv.group] : null) || null,
      _isInvited: true,
      _inviteDate: inv.createdAt,
    }));

  const allExams = [...ownExams, ...invitedEntries];

  const searchQuery = search.trim().toLowerCase();
  const filteredExams = allExams.filter(e => {
    if (filterDiff !== 'all' && e.difficulty !== filterDiff) return false;
    if (searchQuery && !(
      e.title?.toLowerCase().includes(searchQuery) ||
      e.subject?.toLowerCase().includes(searchQuery) ||
      e.difficulty?.toLowerCase().includes(searchQuery)
    )) return false;
    return true;
  });

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

  const canPreviewStudyAsInstructor = (exam) => {
    const isOwnerCard = !exam._isInvited && ownExamIds.has(exam._id);
    return isOwnerCard && ['instructor', 'admin'].includes(user?.role);
  };

  const canUseStudyForExam = (exam) => {
    const hasFlashOrReview = exam._isInvited
      ? (exam.showFlashcards !== false || exam.showReview !== false)
      : true;
    if (!hasFlashOrReview) return false;
    return canPreviewStudyAsInstructor(exam) || Boolean(examStats[exam._id]);
  };

  const loadExam = async (exam) => {
    if (!canUseStudyForExam(exam)) {
      toast.error('Complete the exam at least once before using flashcards or review.');
      return;
    }
    try {
      const res = await examApi.getById(exam._id, { params: { practice: 'true' } });
      setExamData(res.data.exam);
      setSelectedExam(exam);
      const inv = exam._isInvited ? acceptedInvites.find(i => i.exam?._id === exam._id) : null;
      setSelectedInvite(inv || null);
      setCardIndex(0);
      setFlipped(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Study mode is not available yet.');
    }
  };

  const exitStudy = () => {
    setSelectedExam(null);
    setSelectedInvite(null);
    setExamData(null);
  };

  if (!selectedExam) {
    if (examsLoading) {
      return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
          <div className="flex flex-col items-center justify-center gap-3 py-10 mb-6">
            <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" aria-hidden />
            <p className="text-sm font-medium text-[var(--color-text)]">Loading tests…</p>
            <p className="text-xs text-[var(--color-text-muted)]">Fetching your exams and invites</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-pulse">
                <div className="h-1.5 w-full bg-[var(--color-border)]" />
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="h-10 w-10 rounded-xl bg-[var(--color-border)]" />
                    <div className="h-5 w-14 rounded-full bg-[var(--color-border)]" />
                  </div>
                  <div className="h-4 w-[85%] max-w-[220px] rounded bg-[var(--color-border)]" />
                  <div className="h-3 w-1/2 rounded bg-[var(--color-border)] max-w-[140px]" />
                  <div className="h-9 w-full rounded-xl bg-[var(--color-border)] mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">My Tests</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {isInstructorOnly
                ? `${allExams.length} total · ${Object.keys(examStats).length} attempted`
                : `${allExams.length} total · ${Object.keys(examStats).length} attempted · ${invitedEntries.length} invited`}
            </p>
          </div>
          <Link to="/dashboard" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        {/* Filters bar + search */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
            {[{ id: 'all', label: 'All Levels' }, { id: 'easy', label: 'Easy' }, { id: 'medium', label: 'Medium' }, { id: 'hard', label: 'Hard' }].map(f => (
              <button key={f.id} onClick={() => setFilterDiff(f.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${filterDiff === f.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-sm font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {/* Search — right of filters */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input type="text" placeholder="Search tests…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="ml-auto text-xs text-[var(--color-text-muted)] flex items-center shrink-0">
            {filteredExams.length} result{filteredExams.length !== 1 ? 's' : ''}
          </div>
        </div>

        {allExams.length === 0 ? (
          <div className="card text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/30 dark:to-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={28} className="text-[var(--color-primary)]" />
            </div>
            <p className="font-semibold text-[var(--color-text)] mb-1">No tests yet</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {isInstructorOnly
                ? 'Tests you create will appear here.'
                : 'Tests you create or are invited to will appear here.'}
            </p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="card text-center py-16">
            <Search size={32} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="text-[var(--color-text-muted)] text-sm">No tests match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((e, idx) => {
              const stats = examStats[e._id];
              const attempted = !!stats;
              const isInvited = !!e._isInvited;
              const isExpired = !!e.expiryDate && new Date(e.expiryDate) < new Date();
              const showFlashcards = isInvited ? e.showFlashcards !== false : true;
              const showReview = isInvited ? e.showReview !== false : true;
              const allowReattempt = isInvited ? e.allowReattempt !== false : true;
              /** First attempt must not be blocked when allowReattempt is false (that flag is for retakes only). */
              const canStartOrReattempt = !isExpired && (!isInvited || !attempted || allowReattempt);
              const examTakeHref = isInvited && e._inviteToken
                ? `/exam/${e._id}?invite=${encodeURIComponent(e._inviteToken)}`
                : `/exam/${e._id}`;
              const hasStudyMode = showFlashcards || showReview;
              const canStudy = canUseStudyForExam(e);
              const qCount = e.questions?.length || 0;
              const diffColors = DIFF_COLORS[e.difficulty] || DIFF_COLORS.medium;
              const gradClass = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
              const accuracy = stats?.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;
              const isOwnerCard = !isInvited && ownExamIds.has(e._id);
              const cohort = ['instructor', 'admin'].includes(user?.role) && isOwnerCard
                ? (e.attemptSummary ?? {
                    participants: 0,
                    uniqueAttempted: 0,
                    passed: 0,
                    failed: 0,
                    notAttempted: 0,
                    totalSubmissions: 0,
                  })
                : null;

              return (
                <div key={e._id + (e._inviteId || '')}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group flex flex-col">

                  {/* Colored top strip */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${gradClass}`} />

                  <div className="p-4 flex flex-col flex-1">
                    {/* Top row: icon + badges */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradClass} flex items-center justify-center shadow-sm`}>
                        <BookOpen size={18} className="text-white" />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isExpired && (
                          <span className="flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                            <Timer size={9} /> Expired
                          </span>
                        )}
                        {isInvited && (
                          <span className="flex items-center gap-1 text-[10px] bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-semibold">
                            <UserCheck size={9} /> Invited
                          </span>
                        )}
                        {e.proctored && (
                          <span className="flex items-center gap-1 text-[10px] bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                            <Shield size={9} /> Proctored
                          </span>
                        )}
                        {e.multipleSets && (
                          <span className="flex items-center gap-1 text-[10px] bg-indigo-100 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                            <Layers size={9} /> Multiple Sets
                          </span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${diffColors.badge}`}>
                          {e.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Title + subject */}
                    <h3 className="font-bold text-[var(--color-text)] mb-0.5 group-hover:text-[var(--color-primary)] transition-colors leading-snug">{e.title}</h3>
                    {e.subject && (
                      <p className="text-xs text-[var(--color-text-muted)] mb-2 font-medium">{e.subject}</p>
                    )}

                    {/* Invited-by row */}
                    {isInvited && (
                      <div className="flex items-center gap-1.5 mb-2">
                        {e._groupName ? (
                          <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-lg font-medium">
                            <Users size={10} /> {e._groupName}
                          </span>
                        ) : null}
                        {e._invitedBy && (
                          <span className="text-xs text-[var(--color-text-muted)]">
                            {e._groupName ? 'via' : 'From'} <span className="font-semibold text-[var(--color-text)]">{e._invitedBy}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {qCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                          <Hash size={9} /> {qCount} questions
                        </span>
                      )}
                      {e.timePerQuestion > 0 && (
                        <span className="flex items-center gap-1 text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                          <Clock size={9} /> {e.timePerQuestion}s/q
                        </span>
                      )}
                      {e.passingPercentage > 0 && (
                        <span className="flex items-center gap-1 text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                          <Target size={9} /> Pass: {e.passingPercentage}%
                        </span>
                      )}
                      {e.certificateEnabled && (
                        <span className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                          <Star size={9} /> Certificate
                        </span>
                      )}
                      {e.expiryDate && !isExpired && (
                        <span className="flex items-center gap-1 text-[10px] bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 px-2 py-0.5 rounded-full">
                          <Timer size={9} /> Expires {fmtDate(e.expiryDate)}
                        </span>
                      )}
                      {e.accessKey?.isActive && (
                        <span className="flex items-center gap-1 text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full" title={`Key: ${e.accessKey.accessKey}`}>
                          <KeyRound size={9} /> Key · {e.accessKey.enrolledCount}/{e.accessKey.enrollmentLimit}
                        </span>
                      )}
                    </div>

                    {/* Topics */}
                    {(e.topics?.length > 0) && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {e.topics.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                        {e.topics.length > 3 && <span className="text-[10px] text-[var(--color-text-muted)]">+{e.topics.length - 3} more</span>}
                      </div>
                    )}

                    {/* Restriction chips */}
                    {isInvited && (!showFlashcards || !showReview) && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {!showFlashcards && <span className="text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">No flashcards</span>}
                        {!showReview && <span className="text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">No review</span>}
                      </div>
                    )}

                    {/* Attempt stats — instructor: cohort from API; others: personal attempts */}
                    {cohort ? (
                      <div className="mt-auto border-t border-[var(--color-border)] pt-3 mb-3">
                        <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
                          Cohort · {cohort.participants} tracked
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="bg-[var(--color-bg-alt)] rounded-lg p-2">
                            <div className="text-sm font-bold text-[var(--color-primary)]">{cohort.uniqueAttempted}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">Attempted</div>
                          </div>
                          <div className="bg-[var(--color-bg-alt)] rounded-lg p-2">
                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{cohort.passed}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">Passed</div>
                          </div>
                          <div className="bg-[var(--color-bg-alt)] rounded-lg p-2">
                            <div className="text-sm font-bold text-red-600 dark:text-red-400">{cohort.failed}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">Failed</div>
                          </div>
                          <div className="bg-[var(--color-bg-alt)] rounded-lg p-2">
                            <div className="text-sm font-bold text-[var(--color-text-muted)]">{cohort.notAttempted}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">Remaining</div>
                          </div>
                        </div>
                        {/* <p className="text-[9px] text-[var(--color-text-muted)] mt-1.5 leading-snug">
                          Unique students with a submission; pass/fail from latest attempt. {cohort.totalSubmissions > 0 && (
                            <span>{cohort.totalSubmissions} total submission{cohort.totalSubmissions !== 1 ? 's' : ''}.</span>
                          )}
                        </p> */}
                      </div>
                    ) : attempted ? (
                      <div className="mt-auto border-t border-[var(--color-border)] pt-3 mb-3">
                        <div className="grid grid-cols-3 gap-2 text-center mb-2">
                          <div className="bg-[var(--color-bg-alt)] rounded-lg p-2">
                            <div className="text-sm font-bold text-[var(--color-primary)]">{stats.count}</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">Attempts</div>
                          </div>
                          <div className="bg-[var(--color-bg-alt)] rounded-lg p-2">
                            <div className={`text-sm font-bold ${stats.best >= 75 ? 'text-emerald-500' : stats.best >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{stats.best}%</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">Best</div>
                          </div>
                          <div className="bg-[var(--color-bg-alt)] rounded-lg p-2">
                            <div className={`text-sm font-bold ${accuracy >= 75 ? 'text-emerald-500' : accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{accuracy ?? 0}%</div>
                            <div className="text-[10px] text-[var(--color-text-muted)]">Accuracy</div>
                          </div>
                        </div>
                        {/* Score bar */}
                        <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${stats.best >= 75 ? 'from-emerald-400 to-teal-500' : stats.best >= 50 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500'}`}
                            style={{ width: `${stats.best}%` }} />
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                          Last: {fmtDate(stats.lastAttemptAt)}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-auto border-t border-[var(--color-border)] pt-3 mb-3 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-400' : 'bg-[var(--color-border)]'}`} />
                        <span className={`text-xs ${isExpired ? 'text-red-500 dark:text-red-400 font-medium' : 'text-[var(--color-text-muted)]'}`}>
                          {isExpired ? 'This test has expired' : 'Not attempted yet'}
                        </span>
                        {isInvited && e._inviteDate && !isExpired && (
                          <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">Invited {fmtDate(e._inviteDate)}</span>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isInstructorOnly && !isInvited ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditExam(e)}
                            className="flex-1 min-w-[100px] text-center text-xs py-2 rounded-xl font-semibold btn-secondary inline-flex items-center justify-center gap-1.5"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <Link
                            to={`/instructor/report/${e._id}?returnTo=${encodeURIComponent('/tests')}`}
                            className="flex-1 min-w-[100px] text-center text-xs py-2 rounded-xl font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors inline-flex items-center justify-center gap-1.5"
                          >
                            <BarChart2 size={13} /> Report
                          </Link>
                          <button
                            type="button"
                            onClick={() => setAccessKeyExam(e)}
                            className="shrink-0 p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-violet-600 hover:border-violet-300 transition-colors"
                            title="Generate access key"
                          >
                            <KeyRound size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteExam(e)}
                            className="shrink-0 p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors disabled:opacity-50"
                            title="Invite users"
                            disabled={isExpired}
                          >
                            <Users size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(e)}
                            disabled={deleteExamMut.isPending}
                            className="shrink-0 p-2 rounded-xl border border-[var(--color-border)] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 transition-colors disabled:opacity-50"
                            title="Delete test"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          {isExpired ? (
                            <span className="flex-1 text-center text-xs py-2 rounded-xl font-semibold bg-red-50 dark:bg-red-900/20 text-red-400 dark:text-red-500 cursor-not-allowed">
                              Expired
                            </span>
                          ) : canStartOrReattempt ? (
                            <Link to={examTakeHref}
                              className={`flex-1 text-center text-xs py-2 rounded-xl font-semibold transition-all bg-gradient-to-r ${gradClass} text-white hover:opacity-90 shadow-sm`}>
                              {attempted ? 'Reattempt' : 'Start Exam'}
                            </Link>
                          ) : null}
                          {hasStudyMode ? (
                            canStudy ? (
                              <button type="button" onClick={() => loadExam(e)}
                                className="flex-1 text-center text-xs btn-secondary py-2 rounded-xl font-semibold flex items-center justify-center gap-1">
                                <FlipHorizontal size={12} /> Study
                              </button>
                            ) : (
                              <span
                                className="flex-1 text-center text-xs text-[var(--color-text-muted)] py-2 rounded-xl border border-dashed border-[var(--color-border)]"
                                title="Complete the exam first to unlock flashcards and review"
                              >
                                Study after attempt
                              </span>
                            )
                          ) : (
                            <span className="flex-1 text-center text-xs text-[var(--color-text-muted)] py-2">No study mode</span>
                          )}
                          {isInstructor && !isInvited && (
                            <button type="button" onClick={() => setEditExam(e)}
                              className="shrink-0 p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
                              title="Edit test">
                              <Edit3 size={13} />
                            </button>
                          )}
                          {isInstructor && !isInvited && (
                            <button type="button" onClick={() => setInviteExam(e)}
                              className="shrink-0 p-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
                              title="Invite users">
                              <Users size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {inviteExam && <InviteModal exam={inviteExam} onClose={() => setInviteExam(null)} />}
        {editExam && <EditExamModal exam={editExam} onClose={() => setEditExam(null)} invalidateKey="myExams" />}
        {accessKeyExam && <ExamAccessKeyModal exam={accessKeyExam} onClose={() => setAccessKeyExam(null)} />}

        <ConfirmDialog
          open={!!deleteTarget}
          onClose={() => !deleteExamMut.isPending && setDeleteTarget(null)}
          onConfirm={() => deleteTarget && deleteExamMut.mutate(deleteTarget._id)}
          title="Delete this test?"
          description={deleteTarget ? `“${deleteTarget.title}” will be removed. Invites and reports for this test will be affected. This cannot be undone.` : ''}
          confirmLabel="Delete test"
          isPending={deleteExamMut.isPending}
        />
      </div>
    );
  }

  // ── Study view ────────────────────────────────────────────────────────────
  if (!canUseStudyForExam(selectedExam)) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="card text-center py-16 max-w-lg mx-auto">
          <BookOpen size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="font-medium text-[var(--color-text)]">Study mode is locked</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-2">Complete the exam at least once before using flashcards or review.</p>
          <button type="button" onClick={exitStudy} className="btn-secondary text-sm mt-6 px-4 py-2">← Back to My Tests</button>
        </div>
      </div>
    );
  }

  const questions = examData?.questions || [];
  const q = questions[cardIndex];
  const isInvitedExam = !!selectedExam._isInvited;
  const showFlashcardsMode = isInvitedExam ? selectedExam.showFlashcards !== false : true;
  const showReviewMode = isInvitedExam ? selectedExam.showReview !== false : true;
  const availableModes = [
    showFlashcardsMode && { id: 'flashcard', icon: FlipHorizontal, label: 'Flashcards' },
    showReviewMode && { id: 'practice', icon: TrendingUp, label: 'Review' },
  ].filter(Boolean);
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
          <p className="text-xs text-[var(--color-text-muted)] mt-1">The instructor has disabled flashcards and review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Study header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 px-6 py-5 mb-6 shadow-lg">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="font-extrabold text-white text-lg leading-tight">{selectedExam.title}</h1>
            <p className="text-sm text-teal-100 mt-0.5">Study Mode · {questions.length} questions
              {selectedExam._groupName && <span className="ml-2 inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs"><Users size={10} /> {selectedExam._groupName}</span>}
            </p>
          </div>
          <button onClick={exitStudy} className="bg-white/20 hover:bg-white/30 text-white text-xs py-2 px-4 rounded-xl transition-colors font-medium">← Back</button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        {availableModes.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex items-center gap-1.5 text-sm px-5 py-2 rounded-xl transition-all font-medium ${currentMode === m.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-sm font-semibold border border-[var(--color-primary)]/20' : 'btn-secondary'}`}>
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
            className="card min-h-52 flex flex-col items-center justify-center cursor-pointer select-none hover:shadow-lg transition-all text-center mb-4 border-2 hover:border-[var(--color-primary)]"
            onClick={() => setFlipped(f => !f)}
          >
            {!flipped ? (
              <div>
                <div className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-4">Question</div>
                <p className="text-[var(--color-text)] text-base sm:text-lg font-medium leading-relaxed">{q.question}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-6 flex items-center justify-center gap-1"><FlipHorizontal size={12} /> Tap to reveal answer</p>
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3">Answer</div>
                <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold px-4 py-2 rounded-xl mb-3">
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
            <button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-sm px-5 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              onClick={() => { setCardIndex(i => Math.min(questions.length - 1, i + 1)); setFlipped(false); }} disabled={cardIndex === questions.length - 1}>Next →</button>
          </div>
        </div>
      )}

      {currentMode === 'practice' && q && (
        <div className="max-w-2xl space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Q {cardIndex + 1} / {questions.length}</span>
              {q.topic && <span className="badge bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">{q.topic}</span>}
            </div>
            <p className="font-medium text-[var(--color-text)] mb-4 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <div key={i} className={`p-3 rounded-xl text-sm border-2 flex items-center gap-3 ${i === q.correctAnswer ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === q.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-[var(--color-bg-alt)]'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {i === q.correctAnswer && <CheckCircle size={15} className="shrink-0" />}
                </div>
              ))}
            </div>
            {q.explanation && (
              <div className="mt-4 p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-xl flex items-start gap-2">
                <Lightbulb size={14} className="text-teal-500 mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--color-text)] leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center">
            <button className="btn-secondary text-sm" onClick={() => setCardIndex(i => Math.max(0, i - 1))} disabled={cardIndex === 0}>← Prev</button>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all cursor-pointer ${i === cardIndex ? 'bg-[var(--color-primary)] w-4' : 'bg-[var(--color-border)] w-1.5'}`} onClick={() => setCardIndex(i)} />
              ))}
            </div>
            <button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-sm px-5 py-2 rounded-xl font-medium hover:opacity-90 disabled:opacity-40"
              onClick={() => setCardIndex(i => Math.min(questions.length - 1, i + 1))} disabled={cardIndex === questions.length - 1}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
