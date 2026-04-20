import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Check, ChevronLeft, ChevronRight, Edit3, FileText,
  Image, Info, LogOut, Mail, MessageSquare, Paperclip, Plus,
  Send, Settings, Shield, Trash2, UserCheck, UserPlus, Users,
  X, Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { groupApi, instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

// ── helpers ───────────────────────────────────────────────────────────────────

const isPro = (user) => ['pro', 'enterprise'].includes(user?.plan) || user?.role === 'admin';
const isInstructorRole = (user) => user?.role === 'instructor' || user?.role === 'admin';

function fmtTime(d) {
  const dt = new Date(d);
  const now = new Date();
  const diff = (now - dt) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff < 7 * 86400) return dt.toLocaleDateString('en-IN', { weekday: 'short' });
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtFull(d) {
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(d) {
  const dt = new Date(d);
  const now = new Date();
  const diff = (now - dt) / 86400000;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function bytesToSize(b) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// Convert file to base64 data URI
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// URL auto-linkify component
function Linkified({ text, isMine }) {
  if (!text) return null;
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  const parts = [];
  let lastIndex = 0;
  let m;
  while ((m = urlRegex.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push({ t: 'text', v: text.slice(lastIndex, m.index) });
    parts.push({ t: 'link', v: m[0] });
    lastIndex = urlRegex.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ t: 'text', v: text.slice(lastIndex) });
  return (
    <p className="leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((p, i) =>
        p.t === 'link'
          ? <a key={i} href={p.v} target="_blank" rel="noreferrer" className={`underline break-all ${isMine ? 'opacity-80 hover:opacity-100' : 'text-[var(--color-primary)]'}`}>{p.v}</a>
          : p.v
      )}
    </p>
  );
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ── Group Drawer (Create / Edit) ──────────────────────────────────────────────
function GroupDrawer({ initial, onClose, onSaved }) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    description: initial?.description || '',
    settings: {
      allowMedia:  initial?.settings?.allowMedia  !== false,
      whoCanSend:  initial?.settings?.whoCanSend   || 'all',
      isPrivate:   initial?.settings?.isPrivate    || false,
    },
  });

  const mut = useMutation({
    mutationFn: (d) => isEdit
      ? groupApi.update(initial._id, { name: d.name, description: d.description })
      : groupApi.create(d),
    onSuccess: async (res) => {
      if (!isEdit && form.settings) {
        try { await groupApi.updateSettings(res.data.group._id, form.settings); } catch {}
      }
      toast.success(isEdit ? 'Group updated' : 'Group created!');
      qc.invalidateQueries({ queryKey: ['groups'] });
      onSaved?.(res.data.group);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const settingsMut = useMutation({
    mutationFn: (s) => groupApi.updateSettings(initial._id, s),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['groups'] }); qc.invalidateQueries({ queryKey: ['group', initial._id] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  const setS = (key, val) => setForm(f => ({ ...f, settings: { ...f.settings, [key]: val } }));

  return (
    <div className="fixed inset-0 z-[9998] flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Drawer */}
      <div className="w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col h-full animate-slide-left shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text)]">{isEdit ? 'Edit Group' : 'Create New Group'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Group Info</h3>
            <div>
              <label className="label text-xs">Group Name *</label>
              <input
                className="input w-full"
                placeholder="e.g. GATE 2025 Batch"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label text-xs">Description</label>
              <textarea
                className="input w-full resize-none"
                rows={3}
                placeholder="Brief description of this group…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Group Settings</h3>

            {[
              { key: 'allowMedia',  label: 'Allow Media Sharing', desc: 'Members can share images and files in chat' },
              { key: 'isPrivate',   label: 'Private Group',        desc: 'Only invited members can see this group' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
                </div>
                <Toggle checked={!!form.settings[key]} onChange={v => setS(key, v)} />
              </div>
            ))}

            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
              <p className="text-sm font-medium text-[var(--color-text)] mb-2">Who Can Send Messages</p>
              <div className="flex gap-2">
                {[['all', 'Everyone'], ['instructorOnly', 'Instructor Only']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setS('whoCanSend', val)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${form.settings.whoCanSend === val ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save settings separately if editing */}
          {isEdit && (
            <button
              onClick={() => settingsMut.mutate(form.settings)}
              disabled={settingsMut.isPending}
              className="btn-secondary w-full py-2.5 text-sm"
            >
              {settingsMut.isPending ? 'Saving…' : 'Save Settings'}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--color-border)] flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-3 text-sm">Cancel</button>
          <button
            onClick={() => mut.mutate(form)}
            disabled={!form.name.trim() || mut.isPending}
            className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={14} /> {mut.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invite Accept Page (via token) ────────────────────────────────────────────
export function GroupInviteAcceptPage() {
  const { token } = useParams();
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['groupInvite', token],
    queryFn:  () => groupApi.validateInvite(token).then(r => r.data),
  });

  const acceptMut = useMutation({
    mutationFn: () => groupApi.acceptInvite(token),
    onSuccess: (res) => {
      toast.success('Welcome to the group!');
      qc.invalidateQueries({ queryKey: ['groups'] });
      navigate(`/groups?join=${res.data.groupId}`);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to accept'),
  });

  const declineMut = useMutation({
    mutationFn: () => groupApi.declineInvite(token),
    onSuccess: () => { toast.success('Invite declined'); navigate('/groups'); },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
        <div className="card max-w-sm w-full p-8 text-center">
          <Users size={40} className="mx-auto mb-3 text-[var(--color-primary)]" />
          <h2 className="font-bold text-[var(--color-text)] text-lg mb-2">Group Invitation</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">Please log in to accept this group invitation.</p>
          <Link to="/login" className="btn-primary block w-full py-3 text-sm">Log In to Accept</Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
        <div className="card max-w-sm w-full p-8 text-center">
          <X size={40} className="mx-auto mb-3 text-red-500" />
          <h2 className="font-bold text-[var(--color-text)] text-lg mb-2">Invalid Invite</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">{error.response?.data?.message || 'This invite link is invalid or expired.'}</p>
          <Link to="/groups" className="btn-secondary block w-full py-3 text-sm">Back to Groups</Link>
        </div>
      </div>
    );
  }

  const invite = data?.invite;
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="card max-w-sm w-full p-8 text-center animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <Users size={28} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="font-bold text-[var(--color-text)] text-xl mb-1">You're Invited!</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          <strong className="text-[var(--color-text)]">{invite?.invitedBy?.name}</strong> invited you to join
        </p>
        <div className="bg-[var(--color-bg-alt)] rounded-xl p-4 mb-6">
          <p className="font-bold text-[var(--color-text)] text-lg">{invite?.group?.name}</p>
          {invite?.group?.description && <p className="text-sm text-[var(--color-text-muted)] mt-1">{invite?.group?.description}</p>}
          <p className="text-xs text-[var(--color-text-muted)] mt-2">Instructor: {invite?.group?.instructor?.name}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => declineMut.mutate()}
            disabled={declineMut.isPending}
            className="btn-secondary flex-1 py-3 text-sm"
          >
            Decline
          </button>
          <button
            onClick={() => acceptMut.mutate()}
            disabled={acceptMut.isPending}
            className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2"
          >
            <UserCheck size={15} /> {acceptMut.isPending ? 'Joining…' : 'Accept & Join'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── WhatsApp-style Chat Panel ─────────────────────────────────────────────────
function ChatPanel({ group, isOwner }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const canSend = group.settings?.whoCanSend === 'all' || isOwner;
  const allowMedia = group.settings?.allowMedia !== false || isOwner;

  const { data, isLoading } = useQuery({
    queryKey: ['groupMessages', group._id],
    queryFn:  () => groupApi.getMessages(group._id, { limit: 60 }).then(r => r.data),
    refetchInterval: 3000,
  });
  const messages = data?.messages || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: (payload) => groupApi.sendMessage(group._id, payload),
    onSuccess: () => { setText(''); setReplyTo(null); qc.invalidateQueries({ queryKey: ['groupMessages', group._id] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send'),
  });

  const deleteMut = useMutation({
    mutationFn: (msgId) => groupApi.deleteMessage(group._id, msgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groupMessages', group._id] }),
  });

  const editMut = useMutation({
    mutationFn: ({ msgId, text }) => groupApi.editMessage(group._id, msgId, text),
    onSuccess: () => {
      setEditingMsgId(null);
      setEditText('');
      qc.invalidateQueries({ queryKey: ['groupMessages', group._id] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to edit'),
  });

  const handleSend = () => {
    if (!text.trim() || sendMut.isPending) return;
    sendMut.mutate({ text: text.trim(), replyTo: replyTo?._id || null });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('File too large (max 8 MB)'); return; }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const isImage = file.type.startsWith('image/');
      sendMut.mutate({
        text:        text.trim() || null,
        replyTo:     replyTo?._id || null,
        mediaBase64: base64,
        mediaType:   isImage ? 'image' : 'document',
        fileName:    file.name,
        fileSize:    file.size,
      });
      setText('');
      setReplyTo(null);
    } catch { toast.error('Failed to read file'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>;

  // Group messages by date for dividers
  const groupedMessages = [];
  let lastDate = null;
  for (const msg of messages) {
    const dateKey = msg.createdAt;
    if (!lastDate || !sameDay(lastDate, dateKey)) {
      groupedMessages.push({ type: 'divider', date: dateKey });
      lastDate = dateKey;
    }
    groupedMessages.push({ type: 'message', msg });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--color-bg)]">
      {/* Chat background pattern */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.015\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>

        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center">
              <MessageSquare size={36} className="mx-auto mb-2 text-[var(--color-border)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">No messages yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Start the conversation!</p>
            </div>
          </div>
        )}

        {groupedMessages.map((item, idx) => {
          if (item.type === 'divider') {
            return (
              <div key={`div-${idx}`} className="flex items-center justify-center my-3">
                <span className="bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] text-[10px] font-medium px-3 py-1 rounded-full border border-[var(--color-border)]">
                  {formatDateDivider(item.date)}
                </span>
              </div>
            );
          }

          const { msg } = item;
          const isMine    = msg.sender?._id === user?._id;
          const isSystem  = msg.type === 'system';
          const isExam    = msg.type === 'exam_share';
          const isMedia   = msg.type === 'media';
          const isInstruct = msg.sender?.role === 'instructor' || msg.sender?.role === 'admin';

          if (isSystem) {
            return (
              <div key={msg._id} className="flex justify-center my-2">
                <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] px-3 py-1 rounded-full border border-[var(--color-border)]">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div key={msg._id} className={`flex gap-2 group ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end mb-1`}>
              {/* Avatar (others only) */}
              {!isMine && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-teal-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mb-1">
                  {msg.sender?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}

              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Sender + role */}
                {!isMine && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-xs font-semibold text-[var(--color-text)]">{msg.sender?.name}</span>
                    {isInstruct && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 leading-none">
                        Instructor
                      </span>
                    )}
                  </div>
                )}

                {/* Reply quote */}
                {msg.replyTo && (
                  <div className={`px-2.5 py-1.5 rounded-lg text-[10px] border-l-2 border-[var(--color-primary)]/50 bg-[var(--color-bg-alt)] max-w-full ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                    <span className="font-semibold text-[var(--color-primary)]">{msg.replyTo.sender?.name || 'Unknown'}</span>
                    <p className="text-[var(--color-text-muted)] truncate mt-0.5">{msg.replyTo.text || '[media]'}</p>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-sm shadow-sm relative ${
                    isMine
                      ? 'bg-[var(--color-primary)] text-white rounded-br-sm'
                      : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-sm'
                  }`}
                >
                  {/* Exam share */}
                  {isExam && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-2 opacity-80">
                        <BookOpen size={12} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Shared Test</span>
                      </div>
                      {msg.examRef ? (
                        <Link
                          to={`/exam/${msg.examRef._id}`}
                          className={`block rounded-xl px-3 py-2.5 mt-1 transition-colors ${isMine ? 'bg-white/15 hover:bg-white/25' : 'bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)]'}`}
                        >
                          <p className="font-semibold text-sm leading-tight">{msg.examRef.title}</p>
                          <p className={`text-xs mt-0.5 ${isMine ? 'opacity-70' : 'text-[var(--color-text-muted)]'}`}>{msg.examRef.subject} · {msg.examRef.difficulty}</p>
                          <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${isMine ? 'bg-white/20' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                            Attempt Now →
                          </span>
                        </Link>
                      ) : (
                        <p className="text-xs opacity-60 italic">Exam no longer available</p>
                      )}
                    </div>
                  )}

                  {/* Media */}
                  {isMedia && (
                    <div>
                      {msg.mediaType === 'image' ? (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                          <img
                            src={msg.mediaUrl}
                            alt={msg.fileName || 'image'}
                            className="rounded-xl max-w-[220px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </a>
                      ) : (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl ${isMine ? 'bg-white/15 hover:bg-white/25' : 'bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)]'} transition-colors`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-[var(--color-primary)]/10'}`}>
                            <FileText size={14} className={isMine ? 'text-white' : 'text-[var(--color-primary)]'} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate max-w-[150px]">{msg.fileName}</p>
                            {msg.fileSize && <p className={`text-[10px] ${isMine ? 'opacity-70' : 'text-[var(--color-text-muted)]'}`}>{bytesToSize(msg.fileSize)}</p>}
                          </div>
                        </a>
                      )}
                      {msg.text && <Linkified text={msg.text} isMine={isMine} />}
                    </div>
                  )}

                  {/* Text */}
                  {msg.type === 'text' && (
                    editingMsgId === msg._id ? (
                      <div className="flex flex-col gap-1.5 min-w-[200px]">
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editMut.mutate({ msgId: msg._id, text: editText }); }
                            if (e.key === 'Escape') setEditingMsgId(null);
                          }}
                          className="input text-sm resize-none py-1.5 bg-white/10 border-white/20 text-inherit placeholder-white/50"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => setEditingMsgId(null)} className="text-[10px] px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors">Cancel</button>
                          <button
                            onClick={() => editMut.mutate({ msgId: msg._id, text: editText })}
                            disabled={!editText.trim() || editMut.isPending}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-semibold transition-colors disabled:opacity-50"
                          >
                            {editMut.isPending ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Linkified text={msg.text} isMine={isMine} />
                        {msg.edited && (
                          <span className={`text-[9px] italic ${isMine ? 'opacity-50' : 'text-[var(--color-text-muted)]'}`}>edited</span>
                        )}
                      </>
                    )
                  )}

                  {/* Timestamp inside bubble */}
                  <span className={`text-[9px] block text-right mt-1 ${isMine ? 'opacity-60' : 'text-[var(--color-text-muted)]'}`}>
                    {fmtFull(msg.createdAt)}
                  </span>
                </div>

                {/* Actions on hover */}
                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isSystem && !isExam && (
                    <button onClick={() => setReplyTo(msg)} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-alt)]">
                      Reply
                    </button>
                  )}
                  {isMine && msg.type === 'text' && !isSystem && (
                    <button
                      onClick={() => { setEditingMsgId(msg._id); setEditText(msg.text); }}
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-alt)]"
                    >
                      Edit
                    </button>
                  )}
                  {(isMine || isOwner) && (
                    <button onClick={() => deleteMut.mutate(msg._id)} className="text-[10px] text-[var(--color-text-muted)] hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-alt)]">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center gap-3">
          <div className="w-0.5 h-8 bg-[var(--color-primary)] rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[var(--color-primary)]">Replying to {replyTo.sender?.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{replyTo.text || '[media]'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><X size={13} /></button>
        </div>
      )}

      {/* Input */}
      {canSend ? (
        <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
          <div className="flex items-end gap-2">
            {allowMedia && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={handleFileSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sendMut.isPending}
                  className="p-2.5 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors shrink-0 mb-0.5 disabled:opacity-50"
                  title="Attach file"
                >
                  {uploading ? <div className="w-4 h-4 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /> : <Paperclip size={18} />}
                </button>
              </>
            )}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={canSend ? 'Type a message… (Enter to send)' : 'Only instructor can send messages'}
              rows={1}
              className="flex-1 input resize-none text-sm py-2.5 max-h-28 overflow-y-auto"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={!text.trim() || sendMut.isPending}
              className="p-2.5 btn-primary rounded-xl disabled:opacity-50 shrink-0 mb-0.5"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] text-center">
          <p className="text-xs text-[var(--color-text-muted)]">Only the instructor can send messages in this group.</p>
        </div>
      )}
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ group, isOwner }) {
  const qc = useQueryClient();
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState([]);
  const [inviting, setInviting] = useState(false);

  const { data: invitesData } = useQuery({
    queryKey: ['groupInvites', group._id],
    queryFn:  () => groupApi.getInvites(group._id).then(r => r.data),
    enabled:  isOwner,
  });
  const invites = invitesData?.invites || [];
  const pendingInvites = invites.filter(i => i.status === 'pending');

  const cancelMut = useMutation({
    mutationFn: (invId) => groupApi.cancelInvite(group._id, invId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groupInvites', group._id] }),
  });

  const removeMut = useMutation({
    mutationFn: (userId) => groupApi.removeMember(group._id, userId),
    onSuccess: () => {
      toast.success('Member removed');
      qc.invalidateQueries({ queryKey: ['group', group._id] });
    },
  });

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('Enter a valid email'); return; }
    if (emailList.includes(e)) { toast.error('Already added'); return; }
    setEmailList(prev => [...prev, e]);
    setEmailInput('');
  };

  const sendInvites = async () => {
    if (!emailList.length) return;
    setInviting(true);
    let sent = 0, failed = 0;
    for (const email of emailList) {
      try { await groupApi.inviteMember(group._id, email); sent++; }
      catch (err) { failed++; toast.error(`${email}: ${err.response?.data?.message || 'Failed'}`); }
    }
    setInviting(false);
    if (sent) { toast.success(`${sent} invite${sent !== 1 ? 's' : ''} sent`); setEmailList([]); }
    qc.invalidateQueries({ queryKey: ['groupInvites', group._id] });
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Instructor */}
      <div>
        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Instructor</p>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
          <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {group.instructor?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text)] truncate">{group.instructor?.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{group.instructor?.email}</p>
          </div>
          <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">Owner</span>
        </div>
      </div>

      {/* Members */}
      <div>
        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
          Members ({group.members?.length || 0})
        </p>
        {(!group.members || group.members.length === 0) ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No members yet. Invite someone!</p>
        ) : (
          <div className="space-y-2">
            {group.members.map(m => (
              <div key={m._id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/30">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {m.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{m.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{m.email}</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => removeMut.mutate(m._id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <LogOut size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {isOwner && pendingInvites.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
            Pending Invites ({pendingInvites.length})
          </p>
          <div className="space-y-2">
            {pendingInvites.map(inv => (
              <div key={inv._id} className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-[var(--color-border)] opacity-80">
                <div className="w-8 h-8 rounded-full bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] flex items-center justify-center text-xs shrink-0">?</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text)] truncate">{inv.email}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Invited · expires {new Date(inv.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                </div>
                <button onClick={() => cancelMut.mutate(inv._id)} className="p-1 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"><X size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add member */}
      {isOwner && (
        <div className="pt-2 border-t border-[var(--color-border)]">
          <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Invite by Email</p>
          <div className="flex gap-2 mb-2">
            <input
              type="email"
              placeholder="student@email.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
              className="input flex-1 text-sm"
            />
            <button
              onClick={addEmail}
              disabled={!emailInput}
              className="btn-secondary px-3 py-2 text-sm disabled:opacity-50 shrink-0 flex items-center gap-1"
              title="Add email"
            >
              <Plus size={14} />
            </button>
          </div>
          {emailList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {emailList.map(e => (
                <span key={e} className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                  <Mail size={10} /> {e}
                  <button onClick={() => setEmailList(prev => prev.filter(x => x !== e))} className="ml-0.5 hover:text-red-500 transition-colors"><X size={10} /></button>
                </span>
              ))}
            </div>
          )}
          <button
            onClick={sendInvites}
            disabled={emailList.length === 0 || inviting}
            className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UserPlus size={14} />
            {inviting ? 'Sending…' : `Send ${emailList.length > 0 ? emailList.length + ' ' : ''}Invite${emailList.length !== 1 ? 's' : ''}`}
          </button>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">Press Enter or + to add emails. They must accept to join.</p>
        </div>
      )}
    </div>
  );
}

// ── Tests Tab ─────────────────────────────────────────────────────────────────
function TestsTab({ group, isOwner }) {
  const qc = useQueryClient();
  const [showShare, setShowShare] = useState(false);

  const { data: myExamsData } = useQuery({
    queryKey: ['instructorAnalytics'],
    queryFn:  () => instructorApi.getAnalytics().then(r => r.data),
    enabled:  isOwner,
  });
  const myExams = myExamsData?.exams || [];

  const shareMut = useMutation({
    mutationFn: (examId) => groupApi.shareExam(group._id, examId),
    onSuccess: () => {
      toast.success('Exam shared!');
      setShowShare(false);
      qc.invalidateQueries({ queryKey: ['group', group._id] });
      qc.invalidateQueries({ queryKey: ['groupMessages', group._id] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const unshareMut = useMutation({
    mutationFn: (examId) => groupApi.unshareExam(group._id, examId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group', group._id] }),
  });

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-3">
      {isOwner && (
        <button onClick={() => setShowShare(true)} className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
          <Zap size={14} /> Share a Test with Group
        </button>
      )}

      {(!group.sharedExams || group.sharedExams.length === 0) ? (
        <div className="text-center py-12">
          <BookOpen size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
          <p className="text-sm text-[var(--color-text-muted)]">No tests shared yet.</p>
        </div>
      ) : (
        group.sharedExams.map(exam => (
          <div key={exam._id} className="card flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <BookOpen size={16} className="text-[var(--color-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)] truncate">{exam.title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{exam.subject} · {exam.difficulty} · {exam.questions?.length || 0}q</p>
            </div>
            <Link to={`/exam/${exam._id}`} className="btn-primary text-xs px-3 py-1.5 shrink-0">Attempt</Link>
            {isOwner && (
              <button onClick={() => unshareMut.mutate(exam._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-muted)] hover:text-red-500 shrink-0">
                <X size={13} />
              </button>
            )}
          </div>
        ))
      )}

      {showShare && (
        <Modal onClose={() => setShowShare(false)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
              <h3 className="font-semibold text-[var(--color-text)]">Share Test with Group</h3>
              <button onClick={() => setShowShare(false)} className="p-1 rounded hover:bg-[var(--color-bg-alt)]"><X size={16} className="text-[var(--color-text-muted)]" /></button>
            </div>
            <div className="p-5 space-y-2 max-h-80 overflow-y-auto">
              {myExams.length === 0 ? (
                <p className="text-sm text-center text-[var(--color-text-muted)] py-4">No tests yet. <Link to="/create-exam" className="text-[var(--color-primary)] hover:underline">Create one first.</Link></p>
              ) : myExams.map(exam => {
                const alreadyShared = group.sharedExams?.some(se => (se._id || se)?.toString() === exam._id?.toString());
                return (
                  <div key={exam._id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{exam.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{exam.subject}</p>
                    </div>
                    <button
                      onClick={() => !alreadyShared && shareMut.mutate(exam._id)}
                      disabled={alreadyShared || shareMut.isPending}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${alreadyShared ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default' : 'btn-primary'}`}
                    >
                      {alreadyShared ? <><Check size={11} className="inline mr-1" />Shared</> : 'Share'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ group, isOwner }) {
  const qc = useQueryClient();
  const [settings, setSettings] = useState(group.settings || { allowMedia: true, whoCanSend: 'all', isPrivate: false });

  const saveMut = useMutation({
    mutationFn: (s) => groupApi.updateSettings(group._id, s),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['group', group._id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const leaveMut = useMutation({
    mutationFn: () => groupApi.leave(group._id),
    onSuccess: () => {
      toast.success('You left the group');
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: () => groupApi.remove(group._id),
    onSuccess: () => {
      toast.success('Group deleted');
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: () => toast.error('Failed to delete group'),
  });

  const setS = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {isOwner ? (
        <>
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Messaging</p>

            {[
              { key: 'allowMedia', label: 'Allow Media Sharing', desc: 'Members can share images and files in chat' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{desc}</p>
                </div>
                <Toggle checked={!!settings[key]} onChange={v => setS(key, v)} />
              </div>
            ))}

            <div className="p-4 rounded-xl border border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text)] mb-3">Who Can Send Messages</p>
              <div className="flex gap-2">
                {[['all', 'Everyone'], ['instructorOnly', 'Instructor Only']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setS('whoCanSend', val)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${settings.whoCanSend === val ? 'btn-primary text-white border-transparent' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider pt-2">Privacy</p>
            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border)]">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Private Group</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Only invited members can see this group</p>
              </div>
              <Toggle checked={!!settings.isPrivate} onChange={v => setS('isPrivate', v)} />
            </div>
          </div>

          <button
            onClick={() => saveMut.mutate(settings)}
            disabled={saveMut.isPending}
            className="btn-primary w-full py-3 text-sm"
          >
            {saveMut.isPending ? 'Saving…' : 'Save Settings'}
          </button>

          {/* Danger zone */}
          <div className="border border-red-200 dark:border-red-800/40 rounded-xl p-4 bg-red-50/50 dark:bg-red-900/5 space-y-3">
            <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">Danger Zone</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Delete Group</p>
                <p className="text-xs text-[var(--color-text-muted)]">Permanently delete this group and all messages</p>
              </div>
              <button
                onClick={() => { if (window.confirm('Delete group and all messages?')) deleteMut.mutate(); }}
                className="text-xs text-red-600 border border-red-300 dark:border-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {/* Read-only settings view */}
          <div className="p-4 rounded-xl bg-[var(--color-bg-alt)]/50 border border-[var(--color-border)] space-y-3">
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Group Info</p>
            {[
              ['Media Sharing', group.settings?.allowMedia ? 'Enabled' : 'Disabled'],
              ['Who Can Send', group.settings?.whoCanSend === 'all' ? 'Everyone' : 'Instructor Only'],
              ['Privacy', group.settings?.isPrivate ? 'Private' : 'Standard'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">{label}</span>
                <span className="font-medium text-[var(--color-text)]">{val}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => { if (window.confirm('Leave this group?')) leaveMut.mutate(); }}
            className="w-full py-3 text-sm border border-red-300 dark:border-red-700 text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Leave Group
          </button>
        </div>
      )}
    </div>
  );
}

// ── Group Detail Panel ────────────────────────────────────────────────────────
function GroupDetail({ groupId, onBack }) {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('chat');

  const { data, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn:  () => groupApi.getOne(groupId).then(r => r.data),
    enabled:  !!groupId,
    refetchInterval: 30000,
  });
  const group = data?.group;
  const isOwner = group?.instructor?._id === user?._id || group?.instructor === user?._id;

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!group) return null;

  const TABS = [
    { key: 'chat',    label: 'Chat',     icon: MessageSquare },
    { key: 'members', label: 'Members',  icon: Users },
    { key: 'tests',   label: 'Tests',    icon: BookOpen },
    { key: 'settings',label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] md:hidden">
          <ChevronLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {group.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[var(--color-text)] text-sm truncate">{group.name}</h2>
          <p className="text-[10px] text-[var(--color-text-muted)]">{group.members?.length || 0} members · {isOwner ? 'You own this group' : `by ${group.instructor?.name}`}</p>
        </div>
        <div className="flex items-center gap-1">
          {group.settings?.isPrivate && <div title="Private group" className="p-1.5 text-[var(--color-text-muted)]"><Shield size={13} /></div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 flex-1 py-2.5 text-xs transition-colors border-b-2 -mb-px font-medium ${tab === key ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
          >
            <Icon size={12} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === 'chat'     && <ChatPanel group={group} isOwner={isOwner} />}
      {tab === 'members'  && <MembersTab group={group} isOwner={isOwner} />}
      {tab === 'tests'    && <TestsTab group={group} isOwner={isOwner} />}
      {tab === 'settings' && <SettingsTab group={group} isOwner={isOwner} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const canCreate = isInstructorRole(user) && isPro(user);

  // Listen for ?join= param after invite accept
  const params = new URLSearchParams(window.location.search);
  const joinId = params.get('join');

  const { data, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => groupApi.getAll().then(r => r.data),
    refetchInterval: 30000,
  });
  const groups = data?.groups || [];

  // My pending group invites (for non-instructors)
  const { data: myInvitesData } = useQuery({
    queryKey: ['myGroupInvites'],
    queryFn:  () => groupApi.getMyInvites().then(r => r.data),
    refetchInterval: 60000,
  });
  const pendingInvites = myInvitesData?.invites || [];

  // Auto-select after join redirect
  useEffect(() => {
    if (joinId) {
      setSelectedGroupId(joinId);
      navigate('/groups', { replace: true });
    }
  }, [joinId]);

  const deleteMut = useMutation({
    mutationFn: (id) => groupApi.remove(id),
    onSuccess: () => {
      toast.success('Group deleted');
      if (selectedGroupId) setSelectedGroupId(null);
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return (
    <div className="flex h-full bg-[var(--color-bg)] overflow-hidden">

      {/* Left sidebar */}
      <aside className={`w-72 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col ${selectedGroupId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[var(--color-primary)]" />
            <span className="font-bold text-[var(--color-text)] text-sm">Groups</span>
            {pendingInvites.length > 0 && (
              <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{pendingInvites.length}</span>
            )}
          </div>
          {isInstructorRole(user) && (
            canCreate ? (
              <button onClick={() => setShowDrawer(true)} className="p-1.5 btn-primary rounded-lg text-white" title="Create group">
                <Plus size={14} />
              </button>
            ) : (
              <Link to="/pricing" className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" title="Pro plan required">
                <Zap size={14} />
              </Link>
            )
          )}
        </div>

        {/* Pending invites section */}
        {pendingInvites.length > 0 && (
          <div className="p-2 border-b border-[var(--color-border)]">
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide px-2 mb-1.5">Pending Invites</p>
            <div className="space-y-1">
              {pendingInvites.map(inv => (
                <div key={inv._id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30">
                  <UserPlus size={13} className="text-green-600 dark:text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--color-text)] truncate">{inv.group?.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">by {inv.group?.instructor?.name}</p>
                  </div>
                  <Link
                    to={`/groups/invite/${inv.token}`}
                    className="text-[10px] font-semibold text-green-700 dark:text-green-400 hover:underline shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pro gate for instructors */}
        {isInstructorRole(user) && !canCreate && (
          <div className="mx-3 mt-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Pro Plan Required</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-2">Upgrade to create and manage study groups.</p>
            <Link to="/pricing" className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline">View Plans →</Link>
          </div>
        )}

        {/* Group list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="space-y-2 p-2">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">No groups yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {isInstructorRole(user) && canCreate ? 'Create your first group to get started.' : "You'll appear here once added to a group."}
              </p>
            </div>
          ) : (
            groups.map(g => (
              <div
                key={g._id}
                onClick={() => setSelectedGroupId(g._id)}
                className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors ${selectedGroupId === g._id ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25' : 'hover:bg-[var(--color-bg-alt)]'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${selectedGroupId === g._id ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                  {g.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${selectedGroupId === g._id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{g.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                    {g.lastMessage?.text
                      ? `${g.lastMessage.sender?.name?.split(' ')[0]}: ${g.lastMessage.text.slice(0, 25)}…`
                      : `${g.members?.length || 0} member${g.members?.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                {/* Edit button (instructor only, show on hover) */}
                {isInstructorRole(user) && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditGroup(g)} className="p-1 rounded hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
                      <Edit3 size={11} />
                    </button>
                  </div>
                )}
                {/* Last message time */}
                {g.lastMessage && (
                  <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 ml-auto">{fmtTime(g.lastMessage.createdAt)}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]/30">
          <div className="flex items-center gap-1.5">
            {isInstructorRole(user) ? <Shield size={11} className="text-amber-500" /> : <Info size={11} className="text-[var(--color-text-muted)]" />}
            <span className="text-[10px] text-[var(--color-text-muted)]">{isInstructorRole(user) ? 'Instructor view' : 'Student view'}</span>
          </div>
        </div>
      </aside>

      {/* Detail panel */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${!selectedGroupId ? 'hidden md:flex' : 'flex'}`}>
        {selectedGroupId ? (
          <GroupDetail
            key={selectedGroupId}
            groupId={selectedGroupId}
            onBack={() => setSelectedGroupId(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-8">
              <div className="w-20 h-20 rounded-3xl bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={36} className="text-[var(--color-primary)]" />
              </div>
              <h3 className="font-bold text-[var(--color-text)] text-lg">Select a group</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Choose a group from the sidebar to start chatting.</p>
              {isInstructorRole(user) && canCreate && (
                <button onClick={() => setShowDrawer(true)} className="btn-primary mt-5 px-6 py-2.5 text-sm flex items-center gap-2 mx-auto">
                  <Plus size={14} /> Create Group
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group drawer */}
      {showDrawer && (
        <GroupDrawer
          onClose={() => setShowDrawer(false)}
          onSaved={(g) => setSelectedGroupId(g._id)}
        />
      )}
      {editGroup && (
        <GroupDrawer
          initial={editGroup}
          onClose={() => setEditGroup(null)}
        />
      )}
    </div>
  );
}
