import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, GraduationCap, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.jsx';
import { enterpriseApi } from '../services/api.js';

export default function SchoolStudentsManagePage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [classId, setClassId] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [editStudent, setEditStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '' });

  const { data: classesData } = useQuery({
    queryKey: ['schoolClasses'],
    queryFn: () => enterpriseApi.schoolClasses().then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['schoolStudents', classId],
    queryFn: () => enterpriseApi.schoolStudents(classId || undefined).then((r) => r.data),
  });

  const updateMut = useMutation({
    mutationFn: () => enterpriseApi.schoolUpdateStudent(editStudent._id, editForm),
    onSuccess: () => {
      toast.success('Student updated');
      qc.invalidateQueries({ queryKey: ['schoolStudents'] });
      setEditStudent(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update student'),
  });

  const deleteMut = useMutation({
    mutationFn: (userId) => enterpriseApi.schoolDeleteStudent(userId),
    onSuccess: () => {
      toast.success('Student removed');
      qc.invalidateQueries({ queryKey: ['schoolStudents'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not delete student'),
  });

  const classes = classesData?.classes || [];
  const students = data?.students || [];

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = !s
      ? students
      : students.filter((st) => `${st.name} ${st.email} ${st.schoolClassId?.name || ''} ${st.schoolClassId?.section || ''}`.toLowerCase().includes(s));
    const sorted = [...base].sort((a, b) => {
      const av = sortKey === 'class'
        ? `${a.schoolClassId?.name || ''} ${a.schoolClassId?.section || ''}`.toLowerCase()
        : String(a[sortKey] || '').toLowerCase();
      const bv = sortKey === 'class'
        ? `${b.schoolClassId?.name || ''} ${b.schoolClassId?.section || ''}`.toLowerCase()
        : String(b[sortKey] || '').toLowerCase();
      if (av === bv) return 0;
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av > bv ? -1 : 1);
    });
    return sorted;
  }, [students, q, sortKey, sortDir]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [q, classId]);

  const openEdit = (s) => {
    setEditForm({ name: s.name || '', email: s.email || '' });
    setEditStudent(s);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/instructor-dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Students</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage enrolled students. Filter by class and search by name/email.</p>
        </div>
        <Link to="/school/students/new" className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold">
          <Plus size={16} /> New student
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Class</label>
          <select className="input w-full mt-1" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}{c.section ? ` · ${c.section}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">Search</label>
          <div className="relative mt-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input className="input w-full pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Student name or email..." />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text)]">Student list</p>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{filtered.length} shown</span>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)] text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  <th className="px-3 py-2 cursor-pointer" onClick={() => { setSortKey('name'); setSortDir((d) => (sortKey === 'name' && d === 'asc') ? 'desc' : 'asc'); }}>Name</th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => { setSortKey('email'); setSortDir((d) => (sortKey === 'email' && d === 'asc') ? 'desc' : 'asc'); }}>Email</th>
                  <th className="px-3 py-2 cursor-pointer" onClick={() => { setSortKey('class'); setSortDir((d) => (sortKey === 'class' && d === 'asc') ? 'desc' : 'asc'); }}>Class</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s) => (
                  <tr key={`${s._id}-${s.schoolClassId?._id || s.schoolClassId}`} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-3 py-2 font-medium text-[var(--color-text)]">{s.name}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">{s.email}</td>
                    <td className="px-3 py-2 text-[var(--color-text-muted)]">
                      {s.schoolClassId?.name}{s.schoolClassId?.section ? ` · ${s.schoolClassId.section}` : ''}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          title="Edit student"
                          onClick={() => openEdit(s)}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-primary)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          title="Delete student"
                          disabled={deleteMut.isPending}
                          onClick={() => {
                            if (!window.confirm('Permanently delete this student account? Only allowed when they are not enrolled in any class.')) return;
                            deleteMut.mutate(s._id);
                          }}
                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-text-muted)]">
        <span>Page {page} / {totalPages}</span>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary px-3 py-1 rounded-lg" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <button type="button" className="btn-secondary px-3 py-1 rounded-lg" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>

      <div className="mt-4 text-xs text-[var(--color-text-muted)] flex items-center gap-2">
        <GraduationCap size={14} className="text-[var(--color-primary)]" />
        Student accounts are scoped to your organization.
      </div>

      {editStudent && (
        <Modal onClose={() => setEditStudent(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
            <p className="text-sm font-semibold text-[var(--color-text)]">Edit student</p>
            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">Name</label>
              <input className="input w-full mt-1 text-sm" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-muted)]">Email</label>
              <input className="input w-full mt-1 text-sm" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" className="btn-secondary px-4 py-2 rounded-xl text-sm" onClick={() => setEditStudent(null)}>Cancel</button>
              <button
                type="button"
                className="btn-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50"
                disabled={updateMut.isPending || !editForm.name.trim() || !editForm.email.trim()}
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
