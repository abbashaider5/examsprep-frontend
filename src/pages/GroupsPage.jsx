import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Check, ChevronLeft, Crown, Download, Edit3, FileText,
  Info, LogOut, Mail, MessageSquare, Paperclip, Plus, RefreshCw,
  Search, Send, Settings, Shield, Trash2, Upload, UserCheck, UserPlus, Users, X, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { groupApi, instructorApi, resultApi, resourceApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

// ── helpers ───────────────────────────────────────────────────────────────────
const isPro            = (u) => ['pro', 'enterprise'].includes(u?.plan) || u?.role === 'admin';
const isInstructorRole = (u) => u?.role === 'instructor' || u?.role === 'admin';
/** Org-linked instructors: batches included with org; do not gate on personal Pro. */
const isOrganizationInstructor = (u) =>
  u?.role === 'instructor' &&
  (u?.subscriptionBillingManagedByOrg === true ||
    !!u?.enterpriseId ||
    !!(u?.enterprise?.id || u?.enterprise?._id));

function fmtTime(d) {
  const dt   = new Date(d);
  const diff = (Date.now() - dt) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800) return dt.toLocaleDateString('en-IN', { weekday: 'short' });
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtMsgTime(d) {
  const dt    = new Date(d);
  const today = new Date();
  const isToday = dt.toDateString() === today.toDateString();
  const time  = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const date  = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (isToday) return `Today · ${time}`;
  return `${date} · ${time}`;
}

function formatDateDivider(d) {
  const dt   = new Date(d);
  const diff = (Date.now() - dt) / 86400000;
  if (diff < 1) return 'Today';
  if (diff < 2) return 'Yesterday';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear()
      && da.getMonth()    === db.getMonth()
      && da.getDate()     === db.getDate();
}

function bytesToSize(b) {
  if (!b) return '';
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function idStr(v) { return v?.toString?.() || String(v || ''); }

// ── MessageContent: URLs + @mention highlights ────────────────────────────────
function MessageContent({ text, isMine, members = [] }) {
  if (!text) return null;
  const re    = /https?:\/\/[^\s<>"{}|\\^`[\]]+|@\w+/g;
  const parts = [];
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[0].startsWith('http')) {
      parts.push({ t: 'url', v: m[0] });
    } else {
      const word   = m[0].slice(1).toLowerCase();
      const isReal = members.some(mb => mb.name?.toLowerCase().startsWith(word));
      parts.push({ t: 'mention', v: m[0], valid: isReal });
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ t: 'text', v: text.slice(last) });
  return (
    <p className="leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((p, i) => {
        if (p.t === 'url')
          return <a key={i} href={p.v} target="_blank" rel="noreferrer"
            className={`underline break-all ${isMine ? 'opacity-80 hover:opacity-100' : 'text-[var(--color-primary)]'}`}>{p.v}</a>;
        if (p.t === 'mention')
          return <span key={i}
            className={`font-semibold rounded px-0.5 ${isMine ? 'bg-white/25 text-white' : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'}`}>{p.v}</span>;
        return p.v;
      })}
    </p>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
        ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
        ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
    </button>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ icon: Icon = Trash2, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <Icon size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--color-text)] text-base">{title}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── GroupSettingsPanel ────────────────────────────────────────────────────────
function GroupSettingsPanel({ group, isOwner, onClose, onDeleted, onLeft }) {
  const isSchoolClassChat = group.kind === 'school_class';
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name:        group.name        || '',
    description: group.description || '',
    settings: {
      allowMedia:       group.settings?.allowMedia !== false,
      whoCanSend:       group.settings?.whoCanSend       || 'all',
      isPrivate:        group.settings?.isPrivate        || false,
      allowReactions:   group.settings?.allowReactions   !== false,
      allowReplies:     group.settings?.allowReplies     !== false,
      maxMembers:       group.settings?.maxMembers       || 100,
      muteNotifications: group.settings?.muteNotifications || false,
    },
  });
  const [confirm, setConfirm] = useState(null); // 'delete' | 'leave'

  const saveMut = useMutation({
    mutationFn: async () => {
      await groupApi.update(group._id, { name: form.name.trim(), description: form.description.trim() });
      await groupApi.updateSettings(group._id, form.settings);
    },
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['group', group._id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to save'),
  });

  const deleteMut = useMutation({
    mutationFn: () => groupApi.remove(group._id),
    onSuccess: () => {
      toast.success('Batch deleted');
      qc.invalidateQueries({ queryKey: ['groups'] });
      onClose();
      onDeleted?.();
    },
    onError: () => toast.error('Failed to delete group'),
  });

  const leaveMut = useMutation({
    mutationFn: () => groupApi.leave(group._id),
    onSuccess: () => {
      toast.success('You left the batch');
      qc.invalidateQueries({ queryKey: ['groups'] });
      onClose();
      onLeft?.();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const setS = (key, val) => setForm(f => ({ ...f, settings: { ...f.settings, [key]: val } }));

  return (
    <>
      <div className="fixed inset-0 z-[9998] flex">
        <div className="flex-1 bg-black/40" onClick={onClose} />
        <div className="w-full max-w-sm bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col h-full animate-slide-left shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="font-bold text-[var(--color-text)] text-base">{isSchoolClassChat ? 'Class chat' : 'Batch Settings'}</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Group info */}
            {isOwner ? (
              <div className="p-5 space-y-3 border-b border-[var(--color-border)]">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Batch Info</p>
                <div>
                  <label className="label text-xs">Batch Name</label>
                  <input className="input w-full" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs">Description</label>
                  <textarea className="input w-full resize-none" rows={2} value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="p-5 border-b border-[var(--color-border)]">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Batch Info</p>
                <p className="font-semibold text-[var(--color-text)]">{group.name}</p>
                {group.description && <p className="text-sm text-[var(--color-text-muted)] mt-1">{group.description}</p>}
                <p className="text-xs text-[var(--color-text-muted)] mt-2">
                  {group.members?.length || 0} members · Owned by {group.instructor?.name}
                </p>
              </div>
            )}

            {/* Permissions (owner only) */}
            {isOwner && (
              <div className="p-5 space-y-3 border-b border-[var(--color-border)]">
                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Permissions</p>
                {[
                  { key: 'allowMedia',     label: 'Allow Media Sharing',   desc: 'Members can share images and files' },
                  { key: 'allowReactions', label: 'Allow Reactions',        desc: 'Members can react to messages with emoji' },
                  { key: 'allowReplies',   label: 'Allow Replies',          desc: 'Members can reply to specific messages' },
                  { key: 'isPrivate',      label: 'Private Batch',          desc: 'Only invited members can see this batch' },
                  { key: 'muteNotifications', label: 'Mute Notifications',  desc: 'Suppress notifications for all members' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{desc}</p>
                    </div>
                    <Toggle checked={!!form.settings[key]} onChange={v => setS(key, v)} />
                  </div>
                ))}

                {/* Who can send */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
                  <p className="text-sm font-medium text-[var(--color-text)] mb-2">Who Can Send Messages</p>
                  <div className="flex gap-2">
                    {[['all', 'Everyone'], ['instructorOnly', 'Instructor Only']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setS('whoCanSend', val)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors
                          ${form.settings.whoCanSend === val
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max members */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
                  <p className="text-sm font-medium text-[var(--color-text)] mb-1">Max Members</p>
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Maximum number of members allowed in this group</p>
                  <div className="flex gap-2">
                    {[25, 50, 100, 200].map(n => (
                      <button key={n} onClick={() => setS('maxMembers', n)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors
                          ${form.settings.maxMembers === n
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Danger zone — school class chats are tied to roster; no delete/leave here */}
            <div className="p-5 space-y-2">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-3">Danger Zone</p>
              {isSchoolClassChat ? (
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  This room is your school class chat. Membership follows class enrollment; it cannot be deleted or left from here.
                </p>
              ) : isOwner ? (
                <button
                  onClick={() => setConfirm('delete')}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                >
                  <Trash2 size={15} /> Delete Batch
                </button>
              ) : (
                <button
                  onClick={() => setConfirm('leave')}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                >
                  <LogOut size={15} /> Leave Batch
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          {isOwner && (
            <div className="p-5 border-t border-[var(--color-border)] flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={!form.name.trim() || saveMut.isPending}
                className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
              >
                {saveMut.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {confirm === 'delete' && (
        <ConfirmDialog
          icon={Trash2}
          title="Delete Batch"
          message={`Are you sure you want to delete "${group.name}"? All messages and data will be permanently lost. This cannot be undone.`}
          confirmLabel="Yes, Delete Batch"
          onConfirm={() => { setConfirm(null); deleteMut.mutate(); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'leave' && (
        <ConfirmDialog
          icon={LogOut}
          title="Leave Batch"
          message={`Are you sure you want to leave "${group.name}"? You will need to be invited again to rejoin.`}
          confirmLabel="Leave Batch"
          onConfirm={() => { setConfirm(null); leaveMut.mutate(); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ── Group Drawer (Create / Edit) ──────────────────────────────────────────────
function GroupDrawer({ initial, onClose, onSaved }) {
  const qc     = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    description: initial?.description || '',
    settings: {
      allowMedia:        initial?.settings?.allowMedia        !== false,
      whoCanSend:        initial?.settings?.whoCanSend        || 'all',
      isPrivate:         initial?.settings?.isPrivate         || false,
      allowReactions:    initial?.settings?.allowReactions    !== false,
      allowReplies:      initial?.settings?.allowReplies      !== false,
      maxMembers:        initial?.settings?.maxMembers        || 100,
      muteNotifications: initial?.settings?.muteNotifications || false,
    },
  });

  const mut = useMutation({
    mutationFn: (d) => isEdit
      ? groupApi.update(initial._id, { name: d.name, description: d.description })
      : groupApi.create(d),
    onSuccess: async (res) => {
      const id = isEdit ? initial._id : res.data.group._id;
      try { await groupApi.updateSettings(id, form.settings); } catch {}
      toast.success(isEdit ? 'Batch updated' : 'Batch created!');
      qc.invalidateQueries({ queryKey: ['groups'] });
      if (!isEdit) onSaved?.(res.data.group);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const setS = (key, val) => setForm(f => ({ ...f, settings: { ...f.settings, [key]: val } }));

  return (
    <div className="fixed inset-0 z-[9998] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col h-full animate-slide-left shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="font-bold text-[var(--color-text)]">{isEdit ? 'Edit Batch' : 'Create New Batch'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Batch Info</h3>
            <div>
              <label className="label text-xs">Batch Name *</label>
              <input className="input w-full" placeholder="e.g. GATE 2025 Batch"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Description</label>
              <textarea className="input w-full resize-none" rows={3} placeholder="Brief description…"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Settings</h3>
            {[
              { key: 'allowMedia',        label: 'Allow Media Sharing',  desc: 'Members can share images and files' },
              { key: 'allowReactions',    label: 'Allow Reactions',       desc: 'Members can react to messages with emoji' },
              { key: 'allowReplies',      label: 'Allow Replies',         desc: 'Members can reply to specific messages' },
              { key: 'isPrivate',         label: 'Private Batch',         desc: 'Only invited members can see this batch' },
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
                  <button key={val} onClick={() => setS('whoCanSend', val)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors
                      ${form.settings.whoCanSend === val
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-alt)]/40">
              <p className="text-sm font-medium text-[var(--color-text)] mb-1">Max Members</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Maximum number of members allowed</p>
              <div className="flex gap-2">
                {[25, 50, 100, 200].map(n => (
                  <button key={n} onClick={() => setS('maxMembers', n)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors
                      ${form.settings.maxMembers === n
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-[var(--color-border)] flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-3 text-sm">Cancel</button>
          <button onClick={() => mut.mutate(form)} disabled={!form.name.trim() || mut.isPending}
            className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            <Plus size={14} /> {mut.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invite Popup (replaces separate accept page) ──────────────────────────────
function InvitePopup({ invite, onClose, onAccepted }) {
  const qc      = useQueryClient();
  const navigate = useNavigate();

  const acceptMut = useMutation({
    mutationFn: () => groupApi.acceptInvite(invite.token),
    onSuccess: (res) => {
      toast.success('Welcome to the batch!');
      // Optimistically remove from pending invites immediately
      qc.setQueryData(['myGroupInvites'], old =>
        old ? { ...old, invites: (old.invites || []).filter(i => i._id !== invite._id) } : old
      );
      qc.invalidateQueries({ queryKey: ['groups'] });
      onAccepted?.(res.data?.groupId);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to accept'),
  });

  const declineMut = useMutation({
    mutationFn: () => groupApi.declineInvite(invite.token),
    onSuccess: () => {
      toast.success('Invite declined');
      // Optimistically remove from pending invites immediately
      qc.setQueryData(['myGroupInvites'], old =>
        old ? { ...old, invites: (old.invites || []).filter(i => i._id !== invite._id) } : old
      );
      qc.invalidateQueries({ queryKey: ['myGroupInvites'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <Modal onClose={onClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-slide-up">
        <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <Users size={24} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="font-bold text-[var(--color-text)] text-lg mb-1">You're Invited to a Batch!</h2>
        {invite.invitedBy?.name && (
          <p className="text-sm text-[var(--color-text-muted)] mb-3">
            <strong className="text-[var(--color-text)]">{invite.invitedBy.name}</strong> invited you to join
          </p>
        )}
        <div className="bg-[var(--color-bg-alt)] rounded-xl p-4 mb-5 text-left">
          <p className="font-bold text-[var(--color-text)]">{invite.group?.name}</p>
          {invite.group?.description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{invite.group.description}</p>
          )}
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Instructor: {invite.group?.instructor?.name}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => declineMut.mutate()} disabled={declineMut.isPending || acceptMut.isPending}
            className="btn-secondary flex-1 py-2.5 text-sm">
            {declineMut.isPending ? 'Declining…' : 'Decline'}
          </button>
          <button onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending || declineMut.isPending}
            className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2">
            <UserCheck size={15} />
            {acceptMut.isPending ? 'Joining…' : 'Accept & Join'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Invite Accept Page (via direct link / email) ──────────────────────────────
// Kept for email invite links; renders same popup style inside a centered overlay
export function GroupInviteAcceptPage() {
  const { token }           = useParams();
  const navigate            = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['groupInvite', token],
    queryFn:  () => groupApi.validateInvite(token).then(r => r.data),
    enabled:  !!token && isAuthenticated,
  });

  if (!isAuthenticated) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="card max-w-sm w-full p-8 text-center">
        <Users size={40} className="mx-auto mb-3 text-[var(--color-primary)]" />
        <h2 className="font-bold text-[var(--color-text)] text-lg mb-2">Batch Invitation</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">Please log in to accept this batch invitation.</p>
        <Link to="/login" className="btn-primary block w-full py-3 text-sm">Log In to Accept</Link>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="card max-w-sm w-full p-8 text-center">
        <X size={40} className="mx-auto mb-3 text-red-500" />
        <h2 className="font-bold text-[var(--color-text)] text-lg mb-2">Invalid Invite</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          {error.response?.data?.message || 'This invite link is invalid or expired.'}
        </p>
        <Link to="/batches" className="btn-secondary block w-full py-3 text-sm">Back to Batches</Link>
      </div>
    </div>
  );

  // Build a synthetic invite object from the validated data so InvitePopup can reuse it
  const raw = data?.invite;
  const syntheticInvite = {
    _id: raw?._id || token,
    token,
    invitedBy: raw?.invitedBy,
    group: raw?.group,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <InvitePopup
        invite={syntheticInvite}
        onClose={() => navigate('/batches')}
        onAccepted={(groupId) => navigate(groupId ? `/batches?join=${groupId}` : '/batches')}
      />
    </div>
  );
}

// ── Chat Panel ────────────────────────────────────────────────────────────────
function ChatPanel({ group, isOwner }) {
  const { user }   = useAuthStore();
  const qc         = useQueryClient();
  const members    = group.members || [];
  // Include instructor in mention list
  const allMentionable = [
    ...(group.instructor ? [group.instructor] : []),
    ...members.filter(m => idStr(m._id) !== idStr(group.instructor?._id)),
  ];

  const [text,          setText]          = useState('');
  const [replyTo,       setReplyTo]       = useState(null);
  const [pendingFile,   setPendingFile]   = useState(null); // { base64, type, name, size, preview }
  const [editingMsgId,  setEditingMsgId]  = useState(null);
  const [editText,      setEditText]      = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions,  setShowMentions]  = useState(false);
  const [warningBanner, setWarningBanner] = useState('');
  const mentionStart = useRef(-1);

  const bottomRef    = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef  = useRef(null);

  const canSend    = group.settings?.whoCanSend === 'all' || isOwner;
  const allowMedia = group.settings?.allowMedia !== false || isOwner;

  const { data, isLoading } = useQuery({
    queryKey:        ['groupMessages', group._id],
    queryFn:         () => groupApi.getMessages(group._id, { limit: 80 }).then(r => r.data),
    refetchInterval: 8000,
  });
  const messages = data?.messages || [];
  const moderationState = data?.moderation || { warningCount: 0, isBlocked: false };
  const isChatBlocked = !!moderationState.isBlocked;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMut = useMutation({
    mutationFn: (payload) => groupApi.sendMessage(group._id, payload),
    onMutate: async (payload) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ['groupMessages', group._id] });
      const prev = qc.getQueryData(['groupMessages', group._id]);
      const myId = user?.id || user?._id;
      const tempMsg = {
        _id: `temp-${Date.now()}`,
        text: payload.text || null,
        type: payload.mediaBase64 ? 'media' : 'text',
        sender: { _id: myId, name: user?.name || 'You', role: user?.role },
        createdAt: new Date().toISOString(),
        replyTo: replyTo || null,
        _pending: true,
        ...(payload.mediaBase64 ? {
          mediaType: payload.mediaType,
          fileName:  payload.fileName,
          fileSize:  payload.fileSize,
          mediaUrl:  payload.mediaType === 'image' ? payload.mediaBase64 : null,
        } : {}),
      };
      qc.setQueryData(['groupMessages', group._id], (old) => ({
        ...(old || {}),
        messages: [...(old?.messages || []), tempMsg],
      }));
      setText(''); setReplyTo(null); setPendingFile(null); setShowMentions(false);
      return { prev };
    },
    onError: (err, vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['groupMessages', group._id], ctx.prev);
      toast.error(err.response?.data?.message || 'Failed to send');
    },
    onSuccess: (res) => {
      const mod = res?.data?.moderation;
      if (mod?.isBlocked && mod?.blockedMessage) {
        setWarningBanner('');
        toast.error(mod.blockedMessage);
      } else if (mod?.warningMessage) {
        setWarningBanner(mod.warningMessage);
        toast(mod.warningMessage, { icon: '⚠️' });
      } else {
        setWarningBanner('');
      }
      qc.invalidateQueries({ queryKey: ['groupMessages', group._id] });
      qc.invalidateQueries({ queryKey: ['groupModeration', group._id] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (msgId) => groupApi.deleteMessage(group._id, msgId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['groupMessages', group._id] }),
  });

  const editMut = useMutation({
    mutationFn: ({ msgId, text }) => groupApi.editMessage(group._id, msgId, text),
    onSuccess:  () => {
      setEditingMsgId(null); setEditText('');
      qc.invalidateQueries({ queryKey: ['groupMessages', group._id] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to edit'),
  });

  // @mention logic
  const handleTextChange = useCallback((e) => {
    const val    = e.target.value;
    const cursor = e.target.selectionStart;
    setText(val);
    const before = val.slice(0, cursor);
    const match  = before.match(/@(\w*)$/);
    if (match) {
      setMentionSearch(match[1].toLowerCase());
      setShowMentions(true);
      mentionStart.current = cursor - match[0].length;
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  }, []);

  const insertMention = useCallback((member) => {
    const firstName = member.name?.split(' ')[0] || member.name;
    const cursorPos  = textareaRef.current?.selectionStart ?? text.length;
    const before     = text.slice(0, mentionStart.current);
    const after      = text.slice(cursorPos);
    const newText    = `${before}@${firstName} ${after}`;
    setText(newText);
    setShowMentions(false);
    setMentionSearch('');
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const pos = before.length + firstName.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    });
  }, [text]);

  const filteredMentions = allMentionable.filter(m =>
    !mentionSearch || m.name?.toLowerCase().includes(mentionSearch)
  ).slice(0, 6);

  const handleSend = () => {
    const hasText = !!text.trim();
    const hasFile = !!pendingFile;
    if (!hasText && !hasFile) return;
    if (sendMut.isPending) return;
    if (isChatBlocked) return;
    sendMut.mutate({
      text:   text.trim() || null,
      replyTo: replyTo?._id || null,
      ...(pendingFile ? {
        mediaBase64: pendingFile.base64,
        mediaType:   pendingFile.type,
        fileName:    pendingFile.name,
        fileSize:    pendingFile.size,
      } : {}),
    });
  };

  // Only reads the file and sets preview — does NOT send
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { toast.error('File too large (max 8 MB)'); return; }
    try {
      const base64 = await fileToBase64(file);
      setPendingFile({
        base64,
        type:    file.type.startsWith('image/') ? 'image' : 'document',
        name:    file.name,
        size:    file.size,
        preview: file.type.startsWith('image/') ? base64 : null,
      });
    } catch { toast.error('Failed to read file'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Build grouped messages with date dividers + consecutive-sender tracking
  const grouped = [];
  let lastDate     = null;
  let lastSenderId = null;
  for (const msg of messages) {
    if (!lastDate || !sameDay(lastDate, msg.createdAt)) {
      grouped.push({ type: 'divider', date: msg.createdAt });
      lastDate     = msg.createdAt;
      lastSenderId = null;
    }
    const sid      = idStr(msg.sender?._id || msg.sender);
    const sameAsPrev = msg.type !== 'system' && !!sid && sid === lastSenderId;
    grouped.push({ type: 'message', msg, sameAsPrev });
    if (msg.type !== 'system') lastSenderId = sid;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ background: 'var(--color-bg)' }}
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <div className="text-center">
              <MessageSquare size={36} className="mx-auto mb-2 text-[var(--color-border)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">No messages yet</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Start the conversation!</p>
            </div>
          </div>
        )}

        {grouped.map((item, idx) => {
          if (item.type === 'divider') return (
            <div key={`d-${idx}`} className="flex items-center justify-center my-4">
              <span className="bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] text-[10px] font-medium px-3 py-1 rounded-full border border-[var(--color-border)]">
                {formatDateDivider(item.date)}
              </span>
            </div>
          );

          const { msg, sameAsPrev } = item;
          // Robust isMine: compare both populated _id and raw id string
          const isMine   = idStr(msg.sender?._id || msg.sender) === idStr(user?.id || user?._id);
          const isSystem = msg.type === 'system';
          const isExam   = msg.type === 'exam_share';
          const isMedia  = msg.type === 'media';
          const isModerationWarning = msg.type === 'text'
            && msg.text?.trim?.() === '⚠ Message removed due to inappropriate language.';
          const isInstruct = msg.sender?.role === 'instructor' || msg.sender?.role === 'admin';
          const canEdit   = isMine && msg.type === 'text' && !isSystem && !msg._pending;
          const canDelete = isMine && !isSystem && !msg._pending; // only own messages

          if (isSystem) return (
            <div key={msg._id} className="flex justify-center my-2">
              <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] px-3 py-1 rounded-full border border-[var(--color-border)]">
                {msg.text}
              </span>
            </div>
          );

          return (
            <div
              key={msg._id}
              className={`flex items-end gap-2 group/msg ${isMine ? 'flex-row-reverse' : 'flex-row'} ${sameAsPrev ? 'mt-0.5' : 'mt-3'}`}
            >
              {/* Avatar — others only, hidden for consecutive */}
              {!isMine && (
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white
                  bg-gradient-to-br from-[var(--color-primary)] to-teal-500
                  ${sameAsPrev ? 'invisible' : ''}`}>
                  {msg.sender?.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}

              <div className={`max-w-[68%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                {/* Sender name — only first in group */}
                {!isMine && !sameAsPrev && (
                  <div className="flex items-center gap-1.5 px-1 mb-0.5">
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
                  <div className={`px-2.5 py-1.5 rounded-lg text-[10px] border-l-2 border-[var(--color-primary)]/60 bg-[var(--color-bg-alt)] max-w-full mb-0.5 ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                    <span className="font-semibold text-[var(--color-primary)]">{msg.replyTo.sender?.name || 'Unknown'}</span>
                    <p className="text-[var(--color-text-muted)] truncate mt-0.5">{msg.replyTo.text || '[media]'}</p>
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`rounded-2xl px-3 py-1.5 text-sm shadow-sm
                    ${isModerationWarning
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : isMine
                      ? 'bg-[var(--color-primary)] text-white rounded-br-none'
                      : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] rounded-bl-none'
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
                        <Link to={`/exam/${msg.examRef._id}`}
                          className={`block rounded-xl px-3 py-2.5 mt-1 transition-colors ${isMine ? 'bg-white/15 hover:bg-white/25' : 'bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)]'}`}>
                          <p className="font-semibold text-sm leading-tight">{msg.examRef.title}</p>
                          <p className={`text-xs mt-0.5 ${isMine ? 'opacity-70' : 'text-[var(--color-text-muted)]'}`}>
                            {msg.examRef.subject} · {msg.examRef.difficulty}
                          </p>
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
                          <img src={msg.mediaUrl} alt={msg.fileName || 'image'}
                            className="rounded-xl max-w-[220px] max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onError={e => { e.target.style.display = 'none'; }} />
                        </a>
                      ) : (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer"
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl ${isMine ? 'bg-white/15 hover:bg-white/25' : 'bg-[var(--color-bg-alt)] hover:bg-[var(--color-border)]'} transition-colors`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-[var(--color-primary)]/10'}`}>
                            <FileText size={14} className={isMine ? 'text-white' : 'text-[var(--color-primary)]'} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate max-w-[150px]">{msg.fileName}</p>
                            {msg.fileSize && <p className={`text-[10px] ${isMine ? 'opacity-70' : 'text-[var(--color-text-muted)]'}`}>{bytesToSize(msg.fileSize)}</p>}
                          </div>
                        </a>
                      )}
                      {msg.text && <div className="mt-1.5"><MessageContent text={msg.text} isMine={isMine} members={allMentionable} /></div>}
                    </div>
                  )}

                  {/* Text message */}
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
                          className="input text-sm resize-none py-1.5 bg-white/10 border-white/20 text-inherit"
                          rows={2} autoFocus
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => setEditingMsgId(null)}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors">Cancel</button>
                          <button onClick={() => editMut.mutate({ msgId: msg._id, text: editText })}
                            disabled={!editText.trim() || editMut.isPending}
                            className="text-[10px] px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-semibold disabled:opacity-50">
                            {editMut.isPending ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <MessageContent text={msg.text} isMine={isMine} members={allMentionable} />
                    )
                  )}

                  {/* Timestamp + edited + pending */}
                  <div className={`flex items-center justify-end gap-1.5 mt-0.5 ${isMine ? 'opacity-60' : ''}`}>
                    {msg.edited && (
                      <span className={`text-[9px] italic ${isModerationWarning ? 'text-amber-700' : isMine ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>edited</span>
                    )}
                    {msg._pending ? (
                      <span className={`text-[9px] italic ${isModerationWarning ? 'text-amber-700' : isMine ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>Sending…</span>
                    ) : (
                      <span className={`text-[9px] ${isModerationWarning ? 'text-amber-700' : isMine ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                        {fmtMsgTime(msg.createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message actions */}
                <div className={`flex items-center gap-0.5 mt-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                  {!isSystem && !isExam && (
                    <button onClick={() => setReplyTo(msg)}
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-alt)] transition-colors">
                      Reply
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={() => { setEditingMsgId(msg._id); setEditText(msg.text); }}
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-alt)] transition-colors">
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => deleteMut.mutate(msg._id)}
                      className="text-[10px] text-[var(--color-text-muted)] hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-[var(--color-bg-alt)] transition-colors">
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

      {/* File attachment preview strip */}
      {pendingFile && (
        <div className="px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            {pendingFile.preview
              ? <img src={pendingFile.preview} alt="" className="w-8 h-8 rounded-lg object-cover" />
              : <FileText size={16} className="text-[var(--color-primary)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--color-text)] truncate">{pendingFile.name}</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">{bytesToSize(pendingFile.size)} · Click Send to attach</p>
          </div>
          <button onClick={() => setPendingFile(null)} className="p-1 text-[var(--color-text-muted)] hover:text-red-500">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Reply strip */}
      {replyTo && (
        <div className="px-4 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center gap-3">
          <div className="w-0.5 h-8 bg-[var(--color-primary)] rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[var(--color-primary)]">Replying to {replyTo.sender?.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] truncate">{replyTo.text || '[media]'}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Input */}
      {canSend && !isChatBlocked ? (
        <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] relative">
          {warningBanner && (
            <p className="mb-1.5 text-[11px] text-amber-700">
              Please keep communication respectful in this batch chat.
            </p>
          )}
          {/* @mention dropdown */}
          {showMentions && filteredMentions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden z-20">
              <p className="text-[10px] font-semibold text-[var(--color-text-muted)] px-3 py-1.5 border-b border-[var(--color-border)] uppercase tracking-wide">
                Mention member
              </p>
              {filteredMentions.map(m => (
                <button
                  key={idStr(m._id)}
                  onMouseDown={e => { e.preventDefault(); insertMention(m); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-[var(--color-bg-alt)] transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{m.name}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{m.email}</p>
                  </div>
                  {(m.role === 'instructor' || m.role === 'admin') && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                      Instructor
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {allowMedia && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                  className="hidden" onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()}
                  disabled={sendMut.isPending}
                  className={`p-2.5 rounded-xl hover:bg-[var(--color-bg-alt)] transition-colors shrink-0 mb-0.5 disabled:opacity-50
                    ${pendingFile ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}>
                  <Paperclip size={18} />
                </button>
              </>
            )}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={e => {
                if (showMentions && e.key === 'Escape') { setShowMentions(false); return; }
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={pendingFile ? 'Add a caption… (optional)' : 'Type a message… (@ to mention, Enter to send)'}
              rows={1}
              className="flex-1 input resize-none text-sm py-2.5 max-h-28 overflow-y-auto"
              style={{ minHeight: '44px' }}
              disabled={isChatBlocked}
            />
            <button onClick={handleSend} disabled={(!text.trim() && !pendingFile) || sendMut.isPending || isChatBlocked}
              className="p-2.5 btn-primary rounded-xl disabled:opacity-50 shrink-0 mb-0.5">
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-[var(--color-surface)] border-t border-[var(--color-border)] text-center">
          {isChatBlocked ? (
            <p className="text-xs text-red-500">🚫 Your chat access has been blocked due to repeated inappropriate language.</p>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Only the instructor can send messages in this batch.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab({ group, isOwner }) {
  const isSchoolClassChat = group.kind === 'school_class';
  const qc = useQueryClient();
  const fileInputRef  = useRef(null);
  const [showInvite,   setShowInvite]   = useState(false);
  const [inviteTab,    setInviteTab]    = useState('email'); // 'email' | 'file'
  const [emailInput,   setEmailInput]   = useState('');
  const [inviteEmails, setInviteEmails] = useState([]); // unified list shown in preview
  const [inviting,     setInviting]     = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [fileName,     setFileName]     = useState('');

  const { data: invitesData } = useQuery({
    queryKey: ['groupInvites', group._id],
    queryFn:  () => groupApi.getInvites(group._id).then(r => r.data),
    enabled:  isOwner && !isSchoolClassChat,
  });
  const pendingInvites = (invitesData?.invites || []).filter(i => i.status === 'pending');
  const { data: moderationData } = useQuery({
    queryKey: ['groupModeration', group._id],
    queryFn: () => groupApi.getChatModeration(group._id).then(r => r.data),
    enabled: isOwner,
    refetchInterval: 12000,
  });
  const moderatedUsers = moderationData?.users || [];
  const blockedUsers = moderatedUsers.filter(u => u.isBlocked);

  const cancelMut = useMutation({
    mutationFn: (invId) => groupApi.cancelInvite(group._id, invId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['groupInvites', group._id] }),
  });
  const removeMut = useMutation({
    mutationFn: (userId) => groupApi.removeMember(group._id, userId),
    onSuccess:  () => { toast.success('Member removed'); qc.invalidateQueries({ queryKey: ['group', group._id] }); },
  });
  const bulkMut = useMutation({
    mutationFn: (emails) => groupApi.bulkInvite(group._id, emails),
    onSuccess: (res) => {
      const { results } = res.data;
      toast.success(`${results?.sent?.length || 0} invite(s) sent`);
      if (results?.skipped?.length) toast(`${results.skipped.length} skipped`, { icon: '⚠️' });
      setInviteEmails([]); setFileName('');
      setShowInvite(false);
      qc.invalidateQueries({ queryKey: ['groupInvites', group._id] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });
  const unlockMut = useMutation({
    mutationFn: (userId) => groupApi.unlockChatUser(group._id, userId),
    onSuccess: () => {
      toast.success('Chat access restored');
      qc.invalidateQueries({ queryKey: ['groupModeration', group._id] });
      qc.invalidateQueries({ queryKey: ['groupMessages', group._id] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to unlock chat'),
  });

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('Enter a valid email'); return; }
    if (inviteEmails.includes(e)) { toast.error('Already added'); return; }
    setInviteEmails(p => [...p, e]);
    setEmailInput('');
  };

  const sendManualInvites = async () => {
    if (!inviteEmails.length) return;
    setInviting(true);
    let sent = 0;
    for (const email of inviteEmails) {
      try { await groupApi.inviteMember(group._id, email); sent++; }
      catch (err) { toast.error(`${email}: ${err.response?.data?.message || 'Failed'}`); }
    }
    setInviting(false);
    if (sent) {
      toast.success(`${sent} invite${sent !== 1 ? 's' : ''} sent`);
      setInviteEmails([]);
      setShowInvite(false);
    }
    qc.invalidateQueries({ queryKey: ['groupInvites', group._id] });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb    = XLSX.read(evt.target.result, { type: 'array' });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Skip header row if it contains 'email' text, extract email column
        const emails = [];
        for (const row of rows) {
          for (const cell of row) {
            const val = String(cell || '').trim().toLowerCase();
            if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) emails.push(val);
          }
        }
        const unique = [...new Set(emails)].filter(e => !inviteEmails.includes(e));
        if (!unique.length) { toast.error('No new valid emails found in file'); return; }
        setInviteEmails(p => [...p, ...unique]);
        toast.success(`Added ${unique.length} email(s) from file`);
      } catch { toast.error('Failed to parse file'); }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadSample = () => {
    const ws  = XLSX.utils.aoa_to_sheet([['Name', 'Email'], ['Alice Smith', 'alice@example.com'], ['Bob Jones', 'bob@example.com']]);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'sample_members.xlsx');
  };

  const totalMembers = (group.members?.length || 0) + 1; // +1 for instructor
  const rosterStudentCount = group.members?.length || 0;
  const rosterLabel = isSchoolClassChat
    ? `${rosterStudentCount} Student${rosterStudentCount !== 1 ? 's' : ''}`
    : `${totalMembers} Member${totalMembers !== 1 ? 's' : ''}`;

  return (
    <div className={`flex-1 overflow-y-auto ${!isOwner ? 'pt-4' : ''}`}>
      {isOwner && isSchoolClassChat && (
        <p className="px-4 pt-3 text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          Students are added from{' '}
          <Link to="/school/students" className="text-[var(--color-primary)] font-medium hover:underline">Students</Link>
          . The list below stays in sync with class enrollment.
        </p>
      )}
      {/* Add Members — batch only; class rosters use school Students */}
      {isOwner && !isSchoolClassChat && (
        <div className="px-4 pt-3 pb-2">
          <button
            onClick={() => setShowInvite(v => !v)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[var(--color-primary)]/40 text-[var(--color-primary)] text-sm font-semibold hover:bg-[var(--color-primary)]/5 hover:border-[var(--color-primary)] transition-all"
          >
            <UserPlus size={15} />
            {showInvite ? 'Close' : 'Add / Invite Members'}
          </button>
        </div>
      )}

      {/* Add Members Modal */}
      {isOwner && showInvite && !isSchoolClassChat && (
        <Modal onClose={() => { setShowInvite(false); setInviteEmails([]); setEmailInput(''); setFileName(''); }}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl flex overflow-hidden" style={{ height: '80vh', maxHeight: '600px' }}>

            {/* LEFT — preview (fixed width, internal scroll) */}
            <div className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 flex flex-col min-h-0">
              <div className="px-4 py-4 border-b border-[var(--color-border)] shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Members to Add</p>
                {inviteEmails.length > 0 && (
                  <p className="text-xs font-bold text-[var(--color-primary)] mt-0.5">{inviteEmails.length} email{inviteEmails.length !== 1 ? 's' : ''}</p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {inviteEmails.length === 0 ? (
                  <p className="text-xs text-center text-[var(--color-text-muted)] py-8 px-2">
                    Add emails on the right to see a preview here
                  </p>
                ) : inviteEmails.map(email => (
                  <div key={email} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] group">
                    <span className="text-[11px] text-[var(--color-text)] flex-1 min-w-0 truncate">{email}</span>
                    <button
                      onClick={() => setInviteEmails(p => p.filter(e => e !== email))}
                      className="opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-500 shrink-0 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
              {inviteEmails.length > 0 && (
                <div className="p-2 border-t border-[var(--color-border)] shrink-0">
                  <button
                    onClick={() => setInviteEmails([])}
                    className="text-[10px] text-red-500 hover:underline w-full text-center"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT — input */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">Add Members</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Invite students to <strong>{group.name}</strong></p>
                </div>
                <button onClick={() => { setShowInvite(false); setInviteEmails([]); setEmailInput(''); setFileName(''); }}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)]">
                  <X size={16} className="text-[var(--color-text-muted)]" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[var(--color-border)] shrink-0">
                {[['email', 'Single Email'], ['file', 'Upload Excel / CSV']].map(([key, lbl]) => (
                  <button key={key} onClick={() => setInviteTab(key)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                      inviteTab === key
                        ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] -mb-px'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}>
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {inviteTab === 'email' ? (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 block">Student Email Address</label>
                      <div className="flex gap-2">
                        <input type="email" placeholder="student@email.com" value={emailInput}
                          onChange={e => setEmailInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                          className="input flex-1 text-sm py-2" />
                        <button onClick={addEmail} disabled={!emailInput}
                          className="btn-secondary px-4 disabled:opacity-50 text-sm flex items-center gap-1 shrink-0">
                          <Plus size={13} /> Add
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                        Press <kbd className="px-1 py-0.5 bg-[var(--color-bg-alt)] rounded text-[9px] font-mono">Enter</kbd> or click Add. Added emails appear in the preview.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-[var(--color-text-muted)]">Upload .xlsx or .csv with an email column</p>
                      <button onClick={downloadSample}
                        className="flex items-center gap-1 text-[10px] text-[var(--color-primary)] hover:underline">
                        <Download size={10} /> Sample
                      </button>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-sm transition-colors">
                      <Upload size={18} />
                      {fileName ? fileName : 'Click to select file'}
                    </button>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      Emails from the file will be added to the preview list on the left.
                    </p>
                  </>
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-5 py-4 border-t border-[var(--color-border)] shrink-0 space-y-2">
                <button
                  onClick={() => bulkMut.mutate(inviteEmails)}
                  disabled={!inviteEmails.length || bulkMut.isPending || inviting}
                  className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus size={14} />
                  {bulkMut.isPending ? 'Sending…' : `Confirm & Add ${inviteEmails.length || ''} Member${inviteEmails.length !== 1 ? 's' : ''}`}
                </button>
                {inviteEmails.length > 0 && (
                  <p className="text-[10px] text-center text-[var(--color-text-muted)]">
                    {inviteEmails.length} email{inviteEmails.length !== 1 ? 's' : ''} queued — review the list on the left before confirming
                  </p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Search */}
      {(isSchoolClassChat ? rosterStudentCount > 3 : totalMembers > 3) && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-[var(--color-bg-alt)] rounded-lg px-2.5 py-1.5">
            <Search size={11} className="text-[var(--color-text-muted)] shrink-0" />
            <input type="text" placeholder="Search by name…" value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none" />
            {memberSearch && (
              <button onClick={() => setMemberSearch('')} className="text-[var(--color-text-muted)]"><X size={10} /></button>
            )}
          </div>
        </div>
      )}

      {/* Member list */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
          {rosterLabel}
        </p>

        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
          {/* Instructor row */}
          {(!memberSearch || group.instructor?.name?.toLowerCase().includes(memberSearch.toLowerCase())) && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50/70 dark:bg-amber-900/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                {group.instructor?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{group.instructor?.name}</p>
                {isOwner && (
                  <p className="text-[10px] text-[var(--color-text-muted)] truncate">{group.instructor?.email}</p>
                )}
              </div>
              <span className="flex items-center gap-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full shrink-0">
                <Crown size={9} /> Owner
              </span>
            </div>
          )}

          {/* Member rows */}
          {(!group.members || group.members.length === 0) ? (
            <div className="px-4 py-8 text-center">
              <Users size={22} className="mx-auto mb-2 text-[var(--color-border)]" />
              <p className="text-xs text-[var(--color-text-muted)]">{isSchoolClassChat ? 'No students yet.' : 'No members yet.'}</p>
            </div>
          ) : (() => {
            const filtered = memberSearch
              ? group.members.filter(m => m.name?.toLowerCase().includes(memberSearch.toLowerCase()))
              : group.members;
            return filtered.length === 0
              ? <p className="text-xs text-center text-[var(--color-text-muted)] py-4">No match for "{memberSearch}"</p>
              : filtered.map((m, idx) => (
                <div key={m._id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-bg-alt)]/40 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-cyan-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                    {m.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{m.name}</p>
                    {isOwner && (
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate hidden sm:block">{m.email}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-alt)] px-2 py-0.5 rounded-full shrink-0">{isSchoolClassChat ? 'Student' : 'Member'}</span>
                  {isOwner && !isSchoolClassChat && (
                    <button onClick={() => removeMut.mutate(m._id)} title="Remove"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-muted)] hover:text-red-500 transition-colors shrink-0">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ));
          })()}
        </div>

        {/* Pending invites */}
        {isOwner && !isSchoolClassChat && pendingInvites.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Pending ({pendingInvites.length})
            </p>
            <div className="rounded-xl border border-dashed border-[var(--color-border)] overflow-hidden divide-y divide-[var(--color-border)]">
              {pendingInvites.map(inv => (
                <div key={inv._id} className="flex items-center gap-3 px-4 py-3 opacity-70 hover:opacity-90 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-bg-alt)] border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center justify-center text-xs shrink-0">?</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--color-text)] truncate">{inv.email}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      Expires {new Date(inv.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <button onClick={() => cancelMut.mutate(inv._id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-[var(--color-text-muted)] transition-colors shrink-0">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div className="mt-3">
            <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
              Chat Moderation
            </p>
            <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
              {moderatedUsers.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] px-4 py-3">
                  No warnings or chat blocks yet.
                </p>
              ) : (
                moderatedUsers.map((entry) => (
                  <div key={idStr(entry.user?._id)} className="px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{entry.user?.name || 'Unknown user'}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                        Warning {entry.warningCount || 0}/3
                        {entry.isBlocked ? ' · Chat blocked' : ''}
                      </p>
                    </div>
                    {entry.isBlocked && (
                      <button
                        onClick={() => unlockMut.mutate(entry.user?._id)}
                        disabled={unlockMut.isPending}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors disabled:opacity-50"
                      >
                        Unlock Chat
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            {blockedUsers.length > 0 && (
              <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                {blockedUsers.length} blocked user{blockedUsers.length !== 1 ? 's' : ''} currently require instructor unlock.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tests Tab ─────────────────────────────────────────────────────────────────
function ResourcesTab({ group }) {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['groupResources', group._id],
    queryFn: () => resourceApi.getGroupResources(group._id).then(r => r.data),
    refetchOnMount: 'always',
  });

  const deleteMut = useMutation({
    mutationFn: (id) => resourceApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groupResources', group._id] }); toast.success('Resource deleted'); },
    onError: () => toast.error('Failed to delete resource'),
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return toast.error('Title and file are required');
    setUploading(true);
    try {
      const { data: res } = await resourceApi.upload(file, title.trim(), group._id);
      if (res?.resource) {
        qc.setQueryData(['groupResources', group._id], old => ({
          resources: [res.resource, ...(old?.resources || [])],
        }));
      } else {
        qc.invalidateQueries({ queryKey: ['groupResources', group._id] });
      }
      toast.success('Resource uploaded');
      setFile(null);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resources = data?.resources || [];

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      {/* Upload */}
      <div className="card p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2 text-sm">
          <Upload size={14} /> Upload Resource / Book
        </h3>
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            className="input text-sm"
            placeholder="Resource title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,.ppt,.pptx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf,text/plain"
            className="block w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-[var(--color-primary)] file:text-white hover:file:opacity-90 cursor-pointer"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          <button
            type="submit"
            disabled={uploading || !file || !title.trim()}
            className="btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"
          >
            {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="card p-5">
        <h3 className="font-semibold text-[var(--color-text)] mb-3 flex items-center gap-2 text-sm">
          <FileText size={14} /> Resources ({resources.length})
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-6"><RefreshCw size={18} className="animate-spin text-[var(--color-text-muted)]" /></div>
        ) : resources.length === 0 ? (
          <p className="text-center py-6 text-[var(--color-text-muted)] text-sm">No resources yet. Upload PDFs or docs for AI test generation.</p>
        ) : (
          <div className="space-y-2">
            {resources.map(r => (
              <div key={r._id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={16} className="text-[var(--color-primary)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{r.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {r.originalName} · {r.size ? `${(r.size / 1024).toFixed(1)} KB` : ''}{r.pages ? ` · ${r.pages}p` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { if (window.confirm(`Delete "${r.title}"?`)) deleteMut.mutate(r._id); }}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TestsTab({ group, isOwner }) {
  const qc             = useQueryClient();
  const [showShare, setShowShare] = useState(false);
  const [selectedShareExam, setSelectedShareExam] = useState(null);
  const [shareExpiry, setShareExpiry] = useState('');

  const { data: myExamsData } = useQuery({
    queryKey: ['instructorAnalytics'],
    queryFn:  () => instructorApi.getAnalytics().then(r => r.data),
    enabled:  isOwner,
  });
  const myExams = myExamsData?.exams || [];

  // Fetch user's results to check attempt status per exam
  const { data: resultsData } = useQuery({
    queryKey: ['results'],
    queryFn:  () => resultApi.getAll().then(r => r.data),
    staleTime: 60 * 1000,
  });
  const userResults = resultsData?.results || [];

  const hasAttempted = (examId) =>
    userResults.some(r => (r.exam?._id || r.exam)?.toString() === examId?.toString());

  const shareMut = useMutation({
    mutationFn: (examId) => groupApi.shareExam(group._id, examId),
    onSuccess:  () => {
      toast.success('Exam shared!');
      setShowShare(false);
      qc.invalidateQueries({ queryKey: ['group', group._id] });
      qc.invalidateQueries({ queryKey: ['groupMessages', group._id] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const unshareMut = useMutation({
    mutationFn: (examId) => groupApi.unshareExam(group._id, examId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['group', group._id] }),
  });

  // group.sharedExams is now [{ exam: {...}, sharedAt: Date }]
  const sharedExams = group.sharedExams || [];
  const validExams  = sharedExams.filter(({ exam }) => exam?._id);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-3">
      {/* {isOwner && (
        <button onClick={() => setShowShare(true)}
          className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2">
          <Zap size={14} /> Share a Test with Batch
        </button>
      )} */}
      {validExams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-alt)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} className="text-[var(--color-text-muted)] opacity-50" />
          </div>
          {isOwner ? (
            <>
              <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No tests shared yet</p>
              <p className="text-xs text-[var(--color-text-muted)] max-w-[220px] leading-relaxed">
                Share a test with this batch so members can view and attempt it.
              </p>
              <button onClick={() => setShowShare(true)} className="btn-primary mt-5 px-5 py-2 text-sm flex items-center gap-2 mx-auto">
                <Zap size={13} /> Share a Test
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No tests available yet</p>
              <p className="text-xs text-[var(--color-text-muted)] max-w-[220px] leading-relaxed">
                Your instructor hasn't shared any tests in this batch yet. Check back later.
              </p>
            </>
          )}
        </div>
      ) : (
        validExams.map(({ exam, sharedAt }) => {
          const attempted   = hasAttempted(exam._id);
          const canAttempt  = exam.allowReattempt !== false || !attempted;
          const isExpired   = !!exam.expiryDate && new Date(exam.expiryDate) < new Date();
          return (
            <div key={exam._id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <BookOpen size={16} className="text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">{exam.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{exam.subject} · {exam.difficulty} · {exam.questions?.length || 0}q</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {sharedAt && (
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        Shared {new Date(sharedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                      isExpired && !attempted
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : attempted
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {isExpired && !attempted ? 'Expired' : attempted ? 'Attempted' : 'Not attempted'}
                    </span>
                    {!canAttempt && !isExpired && (
                      <span className="text-[10px] text-[var(--color-text-muted)] italic">No reattempt</span>
                    )}
                    {exam.expiryDate && !isExpired && (
                      <span className="text-[10px] text-rose-500 dark:text-rose-400">
                        Expires {new Date(exam.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOwner ? (
                    <Link to={`/instructor/report/${exam._id}`}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 font-medium shrink-0">
                      View Report
                    </Link>
                  ) : isExpired && !attempted ? (
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 shrink-0">Expired</span>
                  ) : canAttempt ? (
                    <Link to={`/exam/${exam._id}`} className="btn-primary text-xs px-3 py-1.5 shrink-0">
                      {attempted ? 'Retry' : 'Attempt'}
                    </Link>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] shrink-0">Done</span>
                  )}
                  {isOwner && (
                    <button onClick={() => unshareMut.mutate(exam._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-muted)] hover:text-red-500 shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {showShare && (
        <Modal onClose={() => { setShowShare(false); setSelectedShareExam(null); setShareExpiry(''); }}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-2xl flex overflow-hidden" style={{ height: '80vh', maxHeight: '600px' }}>

            {/* LEFT — test list (fixed width, internal scroll) */}
            <div className="w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-bg-alt)]/50 flex flex-col min-h-0">
              <div className="px-4 py-4 border-b border-[var(--color-border)] shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Your Tests</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {myExams.length === 0 ? (
                  <p className="text-xs text-center text-[var(--color-text-muted)] py-6 px-2">
                    No tests yet.{' '}
                    <Link to="/create-exam" className="text-[var(--color-primary)] hover:underline">Create one.</Link>
                  </p>
                ) : myExams.map(exam => {
                  const isSelected = selectedShareExam?._id === exam._id;
                  const alreadyShared = sharedExams.some(se => (se.exam?._id || se.exam)?.toString() === exam._id?.toString());
                  return (
                    <button
                      key={exam._id}
                      onClick={() => !alreadyShared && setSelectedShareExam(exam)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                        alreadyShared ? 'opacity-50 cursor-not-allowed' :
                        isSelected ? 'bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30' :
                        'hover:bg-[var(--color-bg)] border border-transparent'
                      }`}
                    >
                      <p className="text-xs font-medium text-[var(--color-text)] truncate">{exam.title}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">{exam.subject}</p>
                      {alreadyShared && (
                        <span className="text-[9px] font-bold text-green-600 dark:text-green-400 flex items-center gap-0.5 mt-0.5">
                          <Check size={9} /> Shared
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — details + action */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
                <div>
                  <h3 className="font-semibold text-[var(--color-text)]">Share Test with Batch</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Select a test to share with <strong>{group.name}</strong></p>
                </div>
                <button onClick={() => { setShowShare(false); setSelectedShareExam(null); setShareExpiry(''); }}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)]">
                  <X size={16} className="text-[var(--color-text-muted)]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {selectedShareExam ? (
                  <div className="space-y-5">
                    {/* Test details */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Test Details</p>
                      <h4 className="font-bold text-sm text-[var(--color-text)] leading-snug mb-2">{selectedShareExam.title}</h4>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {selectedShareExam.subject && (
                          <span className="text-[10px] font-medium bg-[var(--color-bg-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">
                            {selectedShareExam.subject}
                          </span>
                        )}
                        {selectedShareExam.difficulty && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            selectedShareExam.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : selectedShareExam.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          }`}>{selectedShareExam.difficulty}</span>
                        )}
                        {selectedShareExam.proctored && (
                          <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400 px-2 py-0.5 rounded-full">
                            Proctored
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Settings</p>
                      <div className="space-y-1.5">
                        {[
                          { label: 'AI Proctoring', value: selectedShareExam.proctored },
                          { label: 'Reattempt',     value: selectedShareExam.allowReattempt },
                          { label: 'Certificate',   value: selectedShareExam.certificate !== false },
                          { label: 'Show Answers',  value: selectedShareExam.showAnswersAfter },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              value ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                            }`}>{value ? 'On' : 'Off'}</span>
                          </div>
                        ))}
                        {selectedShareExam.passingPercentage != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-muted)]">Passing Score</span>
                            <span className="text-xs font-bold text-[var(--color-text)]">{selectedShareExam.passingPercentage}%</span>
                          </div>
                        )}
                        {selectedShareExam.questions?.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-text-muted)]">Questions</span>
                            <span className="text-xs font-bold text-[var(--color-text)]">{selectedShareExam.questions.length}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Optional expiry */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
                        Expiry <span className="normal-case font-normal">(optional override)</span>
                      </p>
                      <input
                        type="datetime-local"
                        value={shareExpiry}
                        onChange={e => setShareExpiry(e.target.value)}
                        className="input w-full text-sm py-2"
                      />
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Leave blank to use the test's existing expiry setting.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-bg-alt)] border border-[var(--color-border)] flex items-center justify-center mb-3">
                      <BookOpen size={20} className="text-[var(--color-text-muted)] opacity-50" />
                    </div>
                    <p className="text-sm text-[var(--color-text-muted)]">Select a test from the list to preview details</p>
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-5 py-4 border-t border-[var(--color-border)] shrink-0">
                <button
                  onClick={() => {
                    if (!selectedShareExam?._id) return;
                    shareMut.mutate(selectedShareExam._id);
                  }}
                  disabled={!selectedShareExam || shareMut.isPending}
                  className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Zap size={14} />
                  {shareMut.isPending ? 'Sharing…' : selectedShareExam ? `Share "${selectedShareExam.title}"` : 'Select a test first'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Group Detail Panel ────────────────────────────────────────────────────────
function GroupDetail({ groupId, onBack }) {
  const { user }  = useAuthStore();
  const qc        = useQueryClient();
  const [tab,          setTab]          = useState('chat');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setTab('chat');
  }, [groupId]);

  const { data, isLoading } = useQuery({
    queryKey:        ['group', groupId],
    queryFn:         () => groupApi.getOne(groupId).then(r => r.data),
    enabled:         !!groupId,
    refetchInterval: 30000,
  });
  const group = data?.group;

  // Robust owner check: sanitizeUser stores id (not _id)
  const uid = idStr(user?.id || user?._id);
  const isOwner = !!group && !!uid && (
    idStr(group.instructor?._id) === uid ||
    idStr(group.instructor)      === uid
  );

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!group) return null;

  const isSchoolClass = group.kind === 'school_class';
  const TABS = isSchoolClass
    ? [
        { key: 'chat', label: 'Chat', icon: MessageSquare },
        { key: 'members', label: 'Students', icon: Users },
      ]
    : [
        { key: 'chat', label: 'Chat', icon: MessageSquare },
        { key: 'members', label: 'Members', icon: Users },
        { key: 'tests', label: 'Tests', icon: BookOpen },
        ...(isOwner ? [{ key: 'resources', label: 'Resources', icon: FileText }] : []),
      ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] md:hidden">
          <ChevronLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shrink-0">
          {group.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-[var(--color-text)] text-sm truncate">{group.name}</h2>
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {group.kind === 'school_class' ? 'School class chat' : 'Batch'}
            {' · '}
            {group.kind === 'school_class'
              ? `${group.members?.length || 0} students`
              : `${group.members?.length || 0} members`}
            {' · '}
            {isOwner
              ? (group.kind === 'school_class' ? 'You teach this class' : 'You own this batch')
              : (group.kind === 'school_class' ? `Teacher: ${group.instructor?.name}` : `by ${group.instructor?.name}`)}
          </p>
        </div>
        {/* Settings gear — opens settings panel for both owner and member */}
        <div className="flex items-center gap-1 shrink-0">
          {group.settings?.isPrivate && (
            <div title="Private group" className="p-1.5 text-[var(--color-text-muted)]"><Shield size={13} /></div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            title="Group settings"
            className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[var(--color-surface)] border-b border-[var(--color-border)] shrink-0">
        <div className="flex px-4 gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap
                ${tab === key
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-border)]'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'chat'      && <ChatPanel    group={group} isOwner={isOwner} />}
      {tab === 'members'   && <MembersTab   group={group} isOwner={isOwner} />}
      {!isSchoolClass && tab === 'tests'     && <TestsTab     group={group} isOwner={isOwner} />}
      {!isSchoolClass && tab === 'resources' && <ResourcesTab group={group} />}

      {/* Settings panel */}
      {showSettings && (
        <GroupSettingsPanel
          group={group}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onDeleted={onBack}
          onLeft={onBack}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const { groupId: groupIdParam } = useParams();
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [showDrawer,      setShowDrawer]      = useState(false);
  const [search,          setSearch]          = useState('');
  const [invitePopup,     setInvitePopup]     = useState(null); // holds the invite object
  const canCreate = isInstructorRole(user) && (isPro(user) || isOrganizationInstructor(user));

  const joinId = new URLSearchParams(window.location.search).get('join');

  const { data, isLoading } = useQuery({
    queryKey:        ['groups'],
    queryFn:         () => groupApi.getAll().then(r => r.data),
    refetchInterval: 30000,
  });
  const allGroups = data?.groups || [];
  const groups    = search.trim()
    ? allGroups.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()))
    : allGroups;

  const { data: myInvitesData } = useQuery({
    queryKey:        ['myGroupInvites'],
    queryFn:         () => groupApi.getMyInvites().then(r => r.data),
    refetchInterval: 60000,
  });
  const pendingInvites = myInvitesData?.invites || [];

  useEffect(() => {
    if (groupIdParam) setSelectedGroupId(groupIdParam);
  }, [groupIdParam]);

  useEffect(() => {
    if (joinId) {
      setSelectedGroupId(joinId);
      navigate(`/batches/${joinId}`, { replace: true });
    }
  }, [joinId, navigate]);

  return (
    <div className="flex h-full bg-[var(--color-bg)] overflow-hidden">

      {/* Sidebar */}
      <aside className={`w-72 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col ${selectedGroupId ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5">
                <Link to="/dashboard" className="btn-secondary px-2 py-1 text-xs inline-flex items-center gap-1">
                  <ChevronLeft size={12} /> Back
                </Link>
              </div>
              <h2 className="font-semibold text-[var(--color-text)] text-lg tracking-tight mt-2">Chats</h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Batches and class discussions</p>
            </div>
            {pendingInvites.length > 0 && (
              <span className="inline-flex self-start text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                {pendingInvites.length}
              </span>
            )}
            {isInstructorRole(user) && (
              canCreate ? (
                <button
                  onClick={() => setShowDrawer(true)}
                  className="p-1.5 btn-primary rounded-lg text-white self-start"
                  title="Create batch"
                >
                  <Plus size={14} />
                </button>
              ) : (
                <Link
                  to="/pricing"
                  className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 self-start"
                  title="Pro plan required"
                >
                  <Zap size={14} />
                </Link>
              )
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 bg-[var(--color-bg-alt)] rounded-lg px-3 py-2">
            <Search size={13} className="text-[var(--color-text-muted)] shrink-0" />
            <input
              type="text"
              placeholder="Search chats…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Pending invites */}
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
                  <button
                    onClick={() => setInvitePopup(inv)}
                    className="text-[10px] font-semibold text-green-700 dark:text-green-400 hover:underline shrink-0">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pro gate */}
        {isInstructorRole(user) && !canCreate && (
          <div className="mx-3 mt-3 p-3 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-900/10">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">Pro Plan Required</p>
            <p className="text-[10px] text-amber-700 dark:text-amber-400 mb-2">Upgrade to create and manage batches.</p>
            <Link to="/pricing" className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline">View Plans →</Link>
          </div>
        )}

        {/* Group list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">{[1,2,3].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
              <p className="text-sm font-medium text-[var(--color-text)]">
                {search ? 'No chats found' : 'No chats yet'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {search
                  ? `No results for "${search}"`
                  : isInstructorRole(user) && canCreate
                    ? 'Create your first batch to get started.'
                    : "You'll appear here once added to a batch or class."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {groups.map(g => (
                <div
                  key={g._id}
                  onClick={() => setSelectedGroupId(g._id)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors relative
                    ${selectedGroupId === g._id
                      ? 'bg-[var(--color-primary)]/10'
                      : 'hover:bg-[var(--color-bg-alt)]'}`}
                >
                  {selectedGroupId === g._id && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--color-primary)] rounded-r" />
                  )}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0
                    ${selectedGroupId === g._id ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                    {g.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${selectedGroupId === g._id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                      {g.name}
                      {g.kind === 'school_class' && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400">Class</span>
                      )}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] truncate mt-0.5">
                      {g.lastMessage?.text
                        ? `${g.lastMessage.sender?.name?.split(' ')[0]}: ${g.lastMessage.text.slice(0, 30)}…`
                        : `${g.members?.length || 0} member${g.members?.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  {g.lastMessage && (
                    <span className="text-[9px] text-[var(--color-text-muted)] shrink-0 ml-1">{fmtTime(g.lastMessage.createdAt)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-alt)]/30">
          <div className="flex items-center gap-1.5">
            {isInstructorRole(user)
              ? <Shield size={11} className="text-amber-500" />
              : <Info   size={11} className="text-[var(--color-text-muted)]" />}
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {isInstructorRole(user) ? 'Instructor view' : 'Student view'}
            </span>
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
              <h3 className="font-bold text-[var(--color-text)] text-lg">Select a chat</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">Choose a batch or class from the sidebar to start messaging.</p>
              {isInstructorRole(user) && canCreate && (
                <button onClick={() => setShowDrawer(true)}
                  className="btn-primary mt-5 px-6 py-2.5 text-sm flex items-center gap-2 mx-auto">
                  <Plus size={14} /> Create Batch
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create drawer */}
      {showDrawer && (
        <GroupDrawer
          onClose={() => setShowDrawer(false)}
          onSaved={(g) => setSelectedGroupId(g._id)}
        />
      )}

      {/* Invite popup */}
      {invitePopup && (
        <InvitePopup
          invite={invitePopup}
          onClose={() => setInvitePopup(null)}
          onAccepted={(groupId) => {
            setInvitePopup(null);
            if (groupId) setSelectedGroupId(groupId);
          }}
        />
      )}
    </div>
  );
}
