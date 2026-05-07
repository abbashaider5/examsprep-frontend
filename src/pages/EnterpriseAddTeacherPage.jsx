import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Info, Mail, User, Users } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { enterpriseApi } from '../services/api.js';

export default function EnterpriseAddTeacherPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const { data: ctxData } = useQuery({
    queryKey: ['enterpriseContext'],
    queryFn: () => enterpriseApi.principalContext().then((r) => r.data),
    staleTime: 15_000,
  });
  const ent = ctxData?.enterprise;

  const inviteMut = useMutation({
    mutationFn: () => enterpriseApi.principalInvite({ name: name.trim(), email: email.trim() }),
    onSuccess: () => {
      toast.success('Invitation sent');
      setName('');
      setEmail('');
      qc.invalidateQueries({ queryKey: ['enterpriseTeachers'] });
      qc.invalidateQueries({ queryKey: ['enterpriseContext'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not send invite'),
  });

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/enterprise-dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6"
      >
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Add teacher</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Invite a teacher by email. They’ll join under your organization.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <form
          className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !email.trim()) return;
            inviteMut.mutate();
          }}
        >
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input className="input pl-9 w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Teacher name" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input className="input pl-9 w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@school.edu" />
            </div>
          </div>
          <button type="submit" disabled={inviteMut.isPending || !name.trim() || !email.trim()} className="btn-primary w-full py-2.5 rounded-xl font-semibold">
            {inviteMut.isPending ? 'Sending…' : 'Send invitation'}
          </button>
        </form>

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
              <p className="text-sm font-semibold text-[var(--color-text)]">Notes</p>
            </div>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-2 leading-relaxed">
              <li>Teachers must sign up using the invited email address.</li>
              <li>You can remove access later from the All teachers page.</li>
              <li>Use “View as” to audit actions—everything is logged.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
