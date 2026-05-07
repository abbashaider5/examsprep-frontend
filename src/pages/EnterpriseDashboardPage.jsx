import { useQuery } from '@tanstack/react-query';
import { CategoryScale, Chart as ChartJS, Filler, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { Building2, Settings, Shield, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { enterpriseApi } from '../services/api.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const cards = [
  { to: '/profile', icon: Building2, label: 'Profile', desc: 'Your account and public details' },
  { to: '/settings', icon: Settings, label: 'Settings', desc: 'Preferences and security' },
  { to: '/enterprise/teachers/new', icon: UserPlus, label: 'Add teacher', desc: 'Invite by email' },
  { to: '/enterprise/teachers', icon: Users, label: 'All teachers', desc: 'Manage your team' },
];

export default function EnterpriseDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['enterpriseContext'],
    queryFn: () => enterpriseApi.principalContext().then((r) => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['principalLogStats'],
    queryFn: () => enterpriseApi.principalLogStats().then((r) => r.data),
    staleTime: 30_000,
  });

  const ent = data?.enterprise;
  const daily = statsData?.daily || [];
  const total7d = daily.reduce((a, b) => a + (b.count || 0), 0);

  const lineData = {
    labels: daily.map((d) => d._id),
    datasets: [
      {
        label: 'Events',
        data: daily.map((d) => d.count),
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13,148,136,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 2.5,
      },
    ],
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">Enterprise dashboard</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1.5">
          {isLoading ? 'Loading…' : ent ? `${ent.name} · ${ent.mode === 'school' ? 'School' : 'Institute'} mode` : ''}
        </p>
        {!isLoading && ent && (
          <p className="text-xs text-[var(--color-text-muted)] mt-2 inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
            <span className="font-medium text-[var(--color-text)]">Teachers</span>
            <span className="tabular-nums">{ent.teacherUsed} / {ent.teacherLimit} used</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {cards.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex gap-4 transition-all hover:border-[var(--color-primary)]/40 hover:shadow-md"
          >
            <div className="shrink-0 w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center group-hover:bg-[var(--color-primary)]/15 transition-colors">
              <Icon size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[var(--color-text)]">{label}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold text-[var(--color-text)]">Teacher activity (7 days)</p>
            <Link to="/enterprise/logs" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">View logs</Link>
          </div>
          <Line
            data={lineData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            }}
          />
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Events (7d)</p>
            <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums mt-1">{total7d}</p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={15} className="text-[var(--color-primary)]" />
              <p className="text-sm font-semibold text-[var(--color-text)]">Compliance</p>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">Impersonation is view-only and all actions are logged under your organization.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
