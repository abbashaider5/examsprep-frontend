import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { enterpriseApi } from '../services/api.js';

export default function SchoolClassesManagePage() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['schoolClasses'],
    queryFn: () => enterpriseApi.schoolClasses().then((r) => r.data),
  });

  const classes = data?.classes || [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return classes;
    return classes.filter((c) => `${c.name} ${c.section || ''} ${c.academicYear || ''}`.toLowerCase().includes(s));
  }, [classes, q]);

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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)] text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3">Students</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{c.section || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">{c.academicYear || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[var(--color-text)] font-semibold tabular-nums">
                      <Users size={13} className="text-[var(--color-primary)]" /> {c.studentCount || 0}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">No classes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

