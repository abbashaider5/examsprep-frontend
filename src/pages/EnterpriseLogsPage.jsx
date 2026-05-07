import { useQuery } from '@tanstack/react-query';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import { ArrowLeft, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { enterpriseApi } from '../services/api.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip);

function StatPill({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{value}</p>
    </div>
  );
}

export default function EnterpriseLogsPage() {
  const [page, setPage] = useState(1);

  const { data: statsData } = useQuery({
    queryKey: ['principalLogStats'],
    queryFn: () => enterpriseApi.principalLogStats().then((r) => r.data),
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['principalLogs', page],
    queryFn: () => enterpriseApi.principalLogs({ page, limit: 40 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const daily = statsData?.daily || [];
  const lineData = useMemo(() => ({
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
  }), [daily]);

  const total7d = daily.reduce((a, b) => a + (b.count || 0), 0);
  const bySeverity = statsData?.bySeverity || [];
  const severityMap = Object.fromEntries(bySeverity.map((s) => [s._id, s.count]));

  const logs = data?.logs || [];
  const pages = data?.pages || 1;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/enterprise-dashboard" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Activity logs</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Audit teacher activity and enterprise events (last 7 days summary shown above).</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Shield size={14} className="text-[var(--color-primary)]" />
          All actions are recorded for compliance.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-6">
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Events (last 7 days)</p>
          <Line
            data={lineData}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } },
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 content-start">
          <StatPill label="Total (7d)" value={total7d} />
          <StatPill label="Critical" value={severityMap.critical || 0} />
          <StatPill label="Warnings" value={severityMap.warning || 0} />
          <StatPill label="Info" value={severityMap.info || 0} />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--color-text)]">Latest events</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-[var(--color-text-muted)] tabular-nums">{page} / {pages}</span>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)] text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l._id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-3 py-2 text-[var(--color-text-muted)] whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 font-medium text-[var(--color-text)]">{l.action}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)]">{l.userEmail || l.user?.email || l.userName || '—'}</td>
                  <td className="px-3 py-2 text-[var(--color-text-muted)] capitalize">{l.severity || 'info'}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-[var(--color-text-muted)]">No logs yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

