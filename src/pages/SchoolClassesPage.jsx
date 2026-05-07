import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, CalendarDays, Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { enterpriseApi } from '../services/api.js';

export default function SchoolClassesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [section, setSection] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['schoolClasses'],
    queryFn: () => enterpriseApi.schoolClasses().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: () => enterpriseApi.schoolCreateClass({ name: name.trim(), section }),
    onSuccess: () => {
      toast.success('Class created');
      setName('');
      setSection('');
      qc.invalidateQueries({ queryKey: ['schoolClasses'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const classes = data?.classes || [];
  const totalClasses = classes.length;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/school/classes" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6">
        <ArrowLeft size={16} /> Back to classes
      </Link>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Classes</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">Create a new class for your school workspace.</p>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <section className="space-y-5">
          <form
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
            onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(); }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-[var(--color-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text)]">Create class</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Class name</label>
                <input className="input w-full mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 10" />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--color-text-muted)]">Section</label>
                <input className="input w-full mt-1" value={section} onChange={(e) => setSection(e.target.value)} placeholder="A" />
              </div>
            </div>
            <div className="mt-4">
              <button type="submit" disabled={createMut.isPending || !name.trim()} className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold">
                <Plus size={16} /> {createMut.isPending ? 'Adding...' : 'Add class'}
              </button>
              <Link to="/school/classes" className="ml-2 btn-secondary inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold">
                View all
              </Link>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-3">Overview</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center"><Building2 size={16} /></div>
                <div><p className="text-xs text-[var(--color-text-muted)]">Classes</p><p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{totalClasses}</p></div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2"><CalendarDays size={15} className="text-[var(--color-primary)]" /><p className="text-sm font-semibold text-[var(--color-text)]">Helpful tips</p></div>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
              <li>Use clear naming like Grade + Section (example: Grade 8 - B).</li>
              <li>Create classes first, then add students in the Students page.</li>
              <li>Keep section labels consistent to avoid duplicate records.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
