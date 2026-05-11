import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.jsx';
import { enterpriseApi } from '../services/api.js';

export default function SchoolClassesManagePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [studentsModalClass, setStudentsModalClass] = useState(null);
  const [editClass, setEditClass] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', section: '', academicYear: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['schoolClasses'],
    queryFn: () => enterpriseApi.schoolClasses().then((r) => r.data),
  });

  const { data: modalStudentsData, isLoading: modalStudentsLoading } = useQuery({
    queryKey: ['schoolStudents', studentsModalClass?._id],
    queryFn: () => enterpriseApi.schoolStudents(studentsModalClass._id).then((r) => r.data),
    enabled: !!studentsModalClass?._id,
  });

  const updateMut = useMutation({
    mutationFn: () => enterpriseApi.schoolUpdateClass(editClass._id, editForm),
    onSuccess: () => {
      toast.success('Class updated');
      qc.invalidateQueries({ queryKey: ['schoolClasses'] });
      setEditClass(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update class'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => enterpriseApi.schoolDeleteClass(id),
    onSuccess: () => {
      toast.success('Class deleted');
      qc.invalidateQueries({ queryKey: ['schoolClasses'] });
      setEditClass(null);
      setStudentsModalClass(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete class'),
  });

  const classes = data?.classes || [];
  const openClassChat = async (classId) => {
    try {
      const { data: res } = await enterpriseApi.schoolClassChatGroup(classId);
      if (res?.groupId) navigate(`/batches/${res.groupId}`);
      else toast.error('Chat is not available for this class yet.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not open class chat');
    }
  };

  const openStudentsModal = (c) => {
    setStudentsModalClass(c);
  };

  const openEdit = (c) => {
    setEditForm({
      name: c.name || '',
      section: c.section || '',
      academicYear: c.academicYear || '',
    });
    setEditClass(c);
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return classes;
    return classes.filter((c) => `${c.name} ${c.section || ''} ${c.academicYear || ''}`.toLowerCase().includes(s));
  }, [classes, q]);

  const modalStudents = modalStudentsData?.students || [];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/instructor-dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Classes</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage all classes in your school workspace.</p>
        </div>
        <Link to="/school/classes/new" className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold">
          <Plus size={16} /> New class
        </Link>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 mb-4">
        <label className="text-xs font-medium text-[var(--color-text-muted)]">Search</label>
        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input className="input w-full pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Grade 10, Section A..." />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text)]">All classes</p>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{filtered.length} shown</span>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)] text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Academic Year</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3 text-right">Chat</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c._id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--color-text)]">{c.name}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{c.section || '—'}</td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{c.academicYear || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openStudentsModal(c)}
                        className="inline-flex items-center gap-1 text-[var(--color-text)] font-semibold tabular-nums rounded-lg px-1.5 py-0.5 -mx-1.5 hover:bg-[var(--color-bg-alt)] transition-colors"
                      >
                        <Users size={13} className="text-[var(--color-primary)]" /> {c.studentCount || 0}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openClassChat(c._id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        <MessageSquare size={14} /> Open
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit class"
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete class"
                          disabled={deleteMut.isPending}
                          onClick={() => {
                            if (!window.confirm('Delete this class permanently? Only allowed when no students are enrolled.')) return;
                            deleteMut.mutate(c._id);
                          }}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">No classes found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {studentsModalClass && (
        <Modal onClose={() => setStudentsModalClass(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">Students</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {studentsModalClass.name}{studentsModalClass.section ? ` · ${studentsModalClass.section}` : ''}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[var(--color-border)]">
              {modalStudentsLoading ? (
                <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>
              ) : modalStudents.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">No students in this class yet.</p>
              ) : (
                modalStudents.map((s) => (
                  <div key={`${s._id}-${s.email}`} className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-text)]">{s.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{s.email}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {editClass && (
        <Modal onClose={() => setEditClass(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">Edit class</p>
            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">Name</label>
              <input className="input w-full mt-1 text-sm" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">Section</label>
              <input className="input w-full mt-1 text-sm" value={editForm.section} onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">Academic year</label>
              <input className="input w-full mt-1 text-sm" value={editForm.academicYear} onChange={(e) => setEditForm((f) => ({ ...f, academicYear: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary px-4 py-2 rounded-xl text-sm" onClick={() => setEditClass(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50"
                disabled={updateMut.isPending || !editForm.name.trim()}
                onClick={() => updateMut.mutate()}
              >
                {updateMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
