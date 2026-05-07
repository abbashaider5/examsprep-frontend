import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, Eye, Info, Pencil, Plus, Trash2, UserCircle, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { authApi, enterpriseApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

export default function EnterpriseTeachersPage() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [detail, setDetail] = useState(null);
  const [impersonateTarget, setImpersonateTarget] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '' });
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  const { data: ctxData } = useQuery({
    queryKey: ['enterpriseContext'],
    queryFn: () => enterpriseApi.principalContext().then((r) => r.data),
    staleTime: 15_000,
  });
  const ent = ctxData?.enterprise;

  const { data, isLoading } = useQuery({
    queryKey: ['enterpriseTeachers'],
    queryFn: () => enterpriseApi.principalTeachers().then((r) => r.data),
  });

  const removeMut = useMutation({
    mutationFn: (id) => enterpriseApi.principalRemoveTeacher(id),
    onSuccess: () => {
      toast.success('Teacher removed');
      qc.invalidateQueries({ queryKey: ['enterpriseTeachers'] });
      qc.invalidateQueries({ queryKey: ['enterpriseContext'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const cancelInviteMut = useMutation({
    mutationFn: (id) => enterpriseApi.principalCancelInvite(id),
    onSuccess: () => {
      toast.success('Invitation cancelled');
      qc.invalidateQueries({ queryKey: ['enterpriseTeachers'] });
      qc.invalidateQueries({ queryKey: ['enterpriseContext'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const createMut = useMutation({
    mutationFn: (payload) => enterpriseApi.principalInvite(payload),
    onSuccess: () => {
      toast.success('Teacher invitation sent');
      setCreateForm({ name: '', email: '' });
      qc.invalidateQueries({ queryKey: ['enterpriseTeachers'] });
      qc.invalidateQueries({ queryKey: ['enterpriseContext'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }) => enterpriseApi.principalUpdateTeacher(id, payload),
    onSuccess: () => {
      toast.success('Teacher updated');
      setEditTarget(null);
      qc.invalidateQueries({ queryKey: ['enterpriseTeachers'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const blockMut = useMutation({
    mutationFn: (id) => enterpriseApi.principalToggleTeacherBlock(id),
    onSuccess: (res) => {
      toast.success(res?.data?.isBlocked ? 'Teacher suspended' : 'Teacher unsuspended');
      qc.invalidateQueries({ queryKey: ['enterpriseTeachers'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const impersonateMut = useMutation({
    mutationFn: (id) => enterpriseApi.principalImpersonate(id),
    onSuccess: async () => {
      toast.success('Opening teacher view…');
      setImpersonateTarget(null);
      const me = await authApi.getMe();
      setUser(me.data.user);
      qc.invalidateQueries();
      window.location.href = '/instructor-dashboard';
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const teachers = data?.teachers || [];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/enterprise-dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6"
      >
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">All teachers</h1>
        <p className="text-sm text-[var(--color-text-muted)]">View invitations, manage access, and enter view mode.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <section>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mb-4">
            <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Create teacher</p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
              <input className="input" placeholder="Teacher name" value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="input" placeholder="Teacher email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
              <button
                type="button"
                className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2"
                disabled={createMut.isPending || !createForm.name.trim() || !createForm.email.trim()}
                onClick={() => createMut.mutate({ name: createForm.name.trim(), email: createForm.email.trim() })}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
          ) : (
            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)] text-left text-[var(--color-text-muted)] text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                        No teachers yet. Invite someone from Add teacher.
                      </td>
                    </tr>
                  )}
                  {teachers.map((t) => (
                    <tr key={`${t.status}-${t.id}`} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">{t.name}</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{t.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : t.isBlocked ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                          {t.status === 'pending' ? 'pending' : t.isBlocked ? 'suspended' : 'active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setDetail(t)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                        >
                          <UserCircle size={14} /> Details
                        </button>
                        {t.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditTarget(t);
                              setEditForm({ name: t.name || '', email: t.email || '' });
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                        )}
                        {t.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => blockMut.mutate(t.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${t.isBlocked ? 'text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                          >
                            <Ban size={14} /> {t.isBlocked ? 'Unsuspend' : 'Suspend'}
                          </button>
                        )}
                        {t.status === 'active' && !t.isBlocked && (
                          <button
                            type="button"
                            onClick={() => setImpersonateTarget(t)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]"
                          >
                            <Eye size={14} /> View as
                          </button>
                        )}
                        {t.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => { if (window.confirm(`Remove ${t.name} from your organization?`)) removeMut.mutate(t.id); }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { if (window.confirm('Cancel this invitation?')) cancelInviteMut.mutate(t.id); }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={14} /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-3">Teacher usage</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Used</p>
                <p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">
                  {ent ? `${ent.teacherUsed} / ${ent.teacherLimit}` : '—'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-3">Pending invitations count towards the limit.</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info size={15} className="text-[var(--color-primary)]" />
              <p className="text-sm font-semibold text-[var(--color-text)]">Tip</p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Use <strong className="text-[var(--color-text)]">View as</strong> to verify what a teacher sees. Your session stays intact and all actions are logged.
            </p>
          </div>
        </aside>
      </div>

      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <div className="p-6 max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">Teacher details</h3>
            <p className="text-sm text-[var(--color-text)]"><span className="text-[var(--color-text-muted)]">Name</span><br />{detail.name}</p>
            <p className="text-sm text-[var(--color-text)] mt-2"><span className="text-[var(--color-text-muted)]">Email</span><br />{detail.email}</p>
            <p className="text-sm text-[var(--color-text)] mt-2"><span className="text-[var(--color-text-muted)]">Status</span><br />{detail.status}</p>
            <button type="button" className="btn-primary mt-6 w-full py-2 rounded-xl" onClick={() => setDetail(null)}>Close</button>
          </div>
        </Modal>
      )}

      {impersonateTarget && (
        <Modal onClose={() => setImpersonateTarget(null)}>
          <div className="p-6 max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">View as Teacher</h3>
            <p className="text-sm text-[var(--color-text)] font-medium">{impersonateTarget.name}</p>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">{impersonateTarget.email}</p>
            <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-6">
              You are about to access this account. All actions will be logged.
            </p>
            <div className="flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium" onClick={() => setImpersonateTarget(null)}>Cancel</button>
              <button
                type="button"
                className="flex-1 btn-primary py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                disabled={impersonateMut.isPending}
                onClick={() => impersonateMut.mutate(impersonateTarget.id)}
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editTarget && (
        <Modal onClose={() => setEditTarget(null)}>
          <div className="p-6 max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Update teacher</h3>
            <div className="space-y-3">
              <input className="input w-full" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
              <input className="input w-full" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" className="flex-1 py-2 rounded-xl border border-[var(--color-border)] text-sm font-medium" onClick={() => setEditTarget(null)}>Cancel</button>
              <button
                type="button"
                className="flex-1 btn-primary py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                disabled={updateMut.isPending || !editForm.name.trim() || !editForm.email.trim()}
                onClick={() => updateMut.mutate({ id: editTarget.id, payload: { name: editForm.name.trim(), email: editForm.email.trim() } })}
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
