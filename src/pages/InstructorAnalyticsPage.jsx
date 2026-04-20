import { useQuery } from '@tanstack/react-query';
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
} from 'chart.js';
import {
    ArrowLeft, Award, BarChart2, BookOpen,
    TrendingUp, Users, Zap
} from 'lucide-react';
import { useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { instructorApi } from '../services/api.js';
import { useThemeStore } from '../store/index.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

// ── Chart theme helpers ───────────────────────────────────────────────────────

function useChartColors() {
  const { dark } = useThemeStore();
  return {
    text:    dark ? '#cbd5e1' : '#334155',
    muted:   dark ? '#64748b' : '#94a3b8',
    grid:    dark ? '#1e293b' : '#f1f5f9',
    surface: dark ? '#1e293b' : '#ffffff',
    primary: '#3b82f6',
    green:   '#22c55e',
    amber:   '#f59e0b',
    red:     '#ef4444',
    purple:  '#a855f7',
    teal:    '#14b8a6',
  };
}

const baseChartOpts = (c, title = '') => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: c.surface,
      titleColor: c.text,
      bodyColor: c.muted,
      borderColor: c.grid,
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
    },
    ...(title ? { title: { display: true, text: title, color: c.text, font: { size: 13, weight: '600' } } } : {}),
  },
  scales: {
    x: {
      grid: { color: c.grid },
      ticks: { color: c.muted, font: { size: 11 } },
    },
    y: {
      grid: { color: c.grid },
      ticks: { color: c.muted, font: { size: 11 } },
      beginAtZero: true,
    },
  },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[var(--color-text)] leading-tight">{value}</div>
        <div className="text-xs font-medium text-[var(--color-text-muted)]">{label}</div>
        {sub && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function ChartCard({ title, height = 220, children }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function difficultyColor(d) {
  return d === 'easy' ? 'text-green-500' : d === 'medium' ? 'text-amber-500' : 'text-red-500';
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InstructorAnalyticsPage() {
  const c = useChartColors();
  const [studentSearch, setStudentSearch] = useState('');
  const [activeExam, setActiveExam] = useState(null); // exam filter for student table

  const { data, isLoading, error } = useQuery({
    queryKey: ['instructorAnalyticsDetailed'],
    queryFn: () => instructorApi.getDetailedAnalytics().then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="px-6 py-8 space-y-6">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center py-20">
          <BarChart2 size={48} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="font-semibold text-[var(--color-text)]">Failed to load analytics</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const { summary = {}, examStats = [], timeSeries = [], subjectBreakdown = [], studentPerformance = [] } = data || {};

  // ── Chart data ───────────────────────────────────────────────────────────────

  // Bar: avg score per exam (top 10)
  const topExams = [...examStats].sort((a, b) => b.attempts - a.attempts).slice(0, 10);
  const barData = {
    labels: topExams.map(e => e.title.length > 18 ? e.title.slice(0, 18) + '…' : e.title),
    datasets: [{
      label: 'Avg Score (%)',
      data:  topExams.map(e => e.avgScore),
      backgroundColor: topExams.map(e => e.avgScore >= 70 ? `${c.green}cc` : e.avgScore >= 50 ? `${c.amber}cc` : `${c.red}cc`),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  // Line: attempts per day last 30 days (fill gaps)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const tsMap = Object.fromEntries(timeSeries.map(t => [t._id, t]));
  const lineData = {
    labels: last30.map(d => {
      const dt = new Date(d);
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }),
    datasets: [{
      label: 'Attempts',
      data: last30.map(d => tsMap[d]?.attempts || 0),
      borderColor: c.primary,
      backgroundColor: `${c.primary}22`,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
    }],
  };

  // Doughnut: pass vs fail
  const totalPass = examStats.reduce((a, e) => a + (e.passCount || 0), 0);
  const totalFail = (summary.totalAttempts || 0) - totalPass;
  const doughnutData = {
    labels: ['Passed', 'Failed'],
    datasets: [{
      data: [totalPass, totalFail],
      backgroundColor: [`${c.green}cc`, `${c.red}cc`],
      borderColor: [c.green, c.red],
      borderWidth: 2,
    }],
  };

  // Bar: subject breakdown
  const subjData = {
    labels: subjectBreakdown.map(s => s._id || 'Unknown'),
    datasets: [
      {
        label: 'Avg Score',
        data: subjectBreakdown.map(s => Math.round(s.avgScore)),
        backgroundColor: `${c.purple}cc`,
        borderRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Attempts',
        data: subjectBreakdown.map(s => s.count),
        backgroundColor: `${c.teal}cc`,
        borderRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  // ── Student filtering ────────────────────────────────────────────────────────
  const filteredStudents = studentPerformance.filter(s => {
    const matchSearch = !studentSearch || s.user.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.user.email?.toLowerCase().includes(studentSearch.toLowerCase());
    const matchExam   = !activeExam || s.exams.some(e => e.examId?.toString() === activeExam);
    return matchSearch && matchExam;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 animate-fade-in space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/instructor" className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--color-text)]">Analytics Dashboard</h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Performance insights across all your tests</p>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={BookOpen}   label="Total Tests"    value={summary.totalExams || 0}     color="bg-blue-500" />
        <StatCard icon={Zap}        label="Total Attempts" value={summary.totalAttempts || 0}  color="bg-indigo-500" />
        <StatCard icon={TrendingUp} label="Avg Score"      value={`${summary.avgScore || 0}%`} color="bg-[var(--color-primary)]" />
        <StatCard icon={Award}      label="Pass Rate"      value={`${summary.passRate || 0}%`} color="bg-green-500" />
        <StatCard icon={Users}      label="Students"       value={summary.totalStudents || 0}  color="bg-purple-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <ChartCard title="Pass vs Fail" height={200}>
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true, maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                  legend: { display: true, position: 'bottom', labels: { color: c.muted, font: { size: 11 }, boxWidth: 12, padding: 12 } },
                  tooltip: { backgroundColor: c.surface, titleColor: c.text, bodyColor: c.muted, borderColor: c.grid, borderWidth: 1, cornerRadius: 8 },
                },
              }}
            />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <ChartCard title="Avg Score per Test (by attempts)" height={200}>
            <Bar data={barData} options={{
              ...baseChartOpts(c),
              scales: {
                ...baseChartOpts(c).scales,
                y: { ...baseChartOpts(c).scales.y, max: 100, ticks: { ...baseChartOpts(c).scales.y.ticks, callback: v => `${v}%` } },
              },
            }} />
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Attempts Over Last 30 Days" height={200}>
          <Line data={lineData} options={{
            ...baseChartOpts(c),
            plugins: { ...baseChartOpts(c).plugins, legend: { display: false } },
          }} />
        </ChartCard>
        <ChartCard title="Performance by Subject" height={200}>
          <Bar data={subjData} options={{
            ...baseChartOpts(c),
            plugins: { ...baseChartOpts(c).plugins, legend: { display: true, labels: { color: c.muted, font: { size: 11 }, boxWidth: 10, padding: 10 } } },
            scales: {
              x: baseChartOpts(c).scales.x,
              y:  { ...baseChartOpts(c).scales.y, id: 'y',  position: 'left',  title: { display: true, text: 'Avg Score (%)', color: c.muted, font: { size: 10 } } },
              y1: { ...baseChartOpts(c).scales.y, id: 'y1', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Attempts', color: c.muted, font: { size: 10 } } },
            },
          }} />
        </ChartCard>
      </div>

      {/* Per-exam table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Test-wise Performance</h3>
          {activeExam && (
            <button onClick={() => setActiveExam(null)} className="text-xs text-[var(--color-primary)] hover:underline">
              Clear filter
            </button>
          )}
        </div>
        {examStats.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No test data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {['Test', 'Subject', 'Difficulty', 'Attempts', 'Avg Score', 'Pass Rate', 'Filter'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {examStats.map(exam => (
                  <tr key={exam._id} className={`hover:bg-[var(--color-bg-alt)]/50 transition-colors ${activeExam === exam._id?.toString() ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                    <td className="py-3 px-3">
                      <p className="font-medium text-[var(--color-text)] truncate max-w-[180px]">{exam.title}</p>
                    </td>
                    <td className="py-3 px-3 text-[var(--color-text-muted)] text-xs">{exam.subject}</td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-semibold capitalize ${difficultyColor(exam.difficulty)}`}>{exam.difficulty}</span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[var(--color-text)]">{exam.attempts}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${exam.avgScore >= 70 ? 'bg-green-500' : exam.avgScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${exam.avgScore}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-text)]">{exam.avgScore}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-bold ${exam.passRate >= 70 ? 'text-green-600' : exam.passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {exam.passRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setActiveExam(prev => prev === exam._id?.toString() ? null : exam._id?.toString())}
                        className="text-[10px] text-[var(--color-primary)] hover:underline"
                      >
                        {activeExam === exam._id?.toString() ? 'Clear' : 'Filter'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student performance table */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Individual Student Reports</h3>
            {activeExam && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Filtered by: <span className="font-medium text-[var(--color-primary)]">{examStats.find(e => e._id?.toString() === activeExam)?.title}</span>
              </p>
            )}
          </div>
          <input
            type="text"
            placeholder="Search students…"
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
            className="input text-sm py-2 w-full sm:w-56"
          />
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-10">
            <Users size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
            <p className="text-sm text-[var(--color-text-muted)]">
              {studentPerformance.length === 0 ? 'No students have attempted your tests yet.' : 'No students match your search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {['Student', 'Attempts', 'Avg Score', 'Pass Rate', 'Best Score', 'Last Attempt'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {filteredStudents.map(s => {
                  const relevantExams = activeExam ? s.exams.filter(e => e.examId?.toString() === activeExam) : s.exams;
                  const attempts = relevantExams.length;
                  const avgScore = attempts ? Math.round(relevantExams.reduce((a, e) => a + e.score, 0) / attempts) : 0;
                  const passCount = relevantExams.filter(e => e.passed).length;
                  const passRate  = attempts ? Math.round((passCount / attempts) * 100) : 0;
                  const bestScore = attempts ? Math.max(...relevantExams.map(e => e.score)) : 0;
                  const lastDate  = relevantExams.length ? new Date(Math.max(...relevantExams.map(e => new Date(e.date)))) : null;
                  if (!attempts) return null;
                  return (
                    <tr key={s.user._id} className="hover:bg-[var(--color-bg-alt)]/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {s.user.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-text)] truncate">{s.user.name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] truncate">{s.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-[var(--color-text)]">{attempts}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${avgScore >= 70 ? 'bg-green-500' : avgScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${avgScore}%` }} />
                          </div>
                          <span className="text-xs font-semibold">{avgScore}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-bold ${passRate >= 70 ? 'text-green-600' : passRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{passRate}%</span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-green-600">{bestScore}%</td>
                      <td className="py-3 px-3 text-xs text-[var(--color-text-muted)]">
                        {lastDate ? lastDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                }).filter(Boolean)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
