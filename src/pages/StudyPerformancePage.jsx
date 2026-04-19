import { useQuery } from '@tanstack/react-query';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import { AlertCircle, BookOpen, Brain, Flame, Lightbulb, Target, TrendingUp, Zap } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { profileApi } from '../services/api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
};

const LINE_OPTS = {
  ...CHART_DEFAULTS,
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: v => `${v}%` } },
  },
};

const BAR_OPTS = {
  ...CHART_DEFAULTS,
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: v => `${v}%` } },
  },
};

export default function StudyPerformancePage() {
  const { data: analytics, isLoading: aLoading } = useQuery({
    queryKey: ['profileAnalytics'],
    queryFn: () => profileApi.analytics().then(r => r.data),
    staleTime: 60000,
  });

  const { data: recData, isLoading: rLoading } = useQuery({
    queryKey: ['profileRecommendation'],
    queryFn: () => profileApi.recommendation().then(r => r.data),
    staleTime: 120000,
  });

  const trend = analytics?.trend || [];
  const topicPerf = analytics?.topicPerf || {};
  const totalExams = analytics?.totalExams || 0;
  const streak = analytics?.streak || 0;
  const rec = recData?.recommendation;

  const avgScore = trend.length > 0
    ? Math.round(trend.reduce((s, t) => s + t.percentage, 0) / trend.length)
    : null;

  const topicEntries = Object.entries(topicPerf);
  const bestTopic = topicEntries.length > 0 ? topicEntries.reduce((a, b) => a[1] > b[1] ? a : b) : null;
  const worstTopic = topicEntries.length > 0 ? topicEntries.reduce((a, b) => a[1] < b[1] ? a : b) : null;

  const recentTrend = trend.slice(-10);
  const lineData = {
    labels: recentTrend.map((t) => { const d = new Date(t.date); return `${d.getDate()}/${d.getMonth() + 1}`; }),
    datasets: [{
      data: recentTrend.map(t => t.percentage),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#3b82f6',
      pointRadius: 3,
    }],
  };

  const topicLabels = topicEntries.map(([k]) => k.length > 12 ? k.slice(0, 11) + '…' : k);
  const topicValues = topicEntries.map(([, v]) => Math.round(v));
  const barData = {
    labels: topicLabels,
    datasets: [{
      data: topicValues,
      backgroundColor: topicValues.map(v => v >= 80 ? 'rgba(34,197,94,0.7)' : v >= 50 ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.65)'),
      borderRadius: 5,
      borderSkipped: false,
    }],
  };

  if (aLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto animate-fade-in">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="skeleton h-56 rounded-xl" />
          <div className="skeleton h-56 rounded-xl" />
        </div>
        <div className="skeleton h-32 rounded-xl" />
      </div>
    );
  }

  if (totalExams === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto animate-fade-in text-center">
        <BookOpen size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">No data yet</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">Complete at least one exam to see your performance insights.</p>
        <Link to="/create-exam" className="btn-primary px-6 py-2.5 rounded-xl text-sm">Generate Your First Exam</Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto animate-fade-in space-y-5">
      {/* ── Page header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-violet-50/30 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-violet-900/5 border border-blue-100 dark:border-blue-900/30 px-6 py-5">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-200/30 dark:bg-indigo-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <TrendingUp size={18} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[var(--color-text)] leading-tight">Study Performance</h1>
            <p className="text-xs text-[var(--color-text-muted)]">A full picture of how you're progressing</p>
          </div>
        </div>
      </div>

      {/* ── Row 1: Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: 'Exams Taken', value: totalExams, color: '#3b82f6' },
          { icon: Target, label: 'Avg. Score', value: avgScore !== null ? `${avgScore}%` : '—', color: '#10b981' },
          { icon: Flame, label: 'Streak', value: `${streak}d`, color: '#f97316' },
          { icon: Zap, label: 'Topics', value: topicEntries.length, color: '#8b5cf6' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
              <Icon size={16} style={{ color }} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] leading-none mb-1">{label}</p>
              <p className="text-xl font-extrabold text-[var(--color-text)] leading-none">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Charts side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score Trend */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--color-text)]">Score Trend</h2>
            <span className="text-[10px] text-[var(--color-text-muted)]">Last {recentTrend.length} exams</span>
          </div>
          {recentTrend.length > 1 ? (
            <div style={{ height: 180 }}><Line data={lineData} options={LINE_OPTS} /></div>
          ) : (
            <div className="flex items-center justify-center h-44 text-[var(--color-text-muted)] text-sm">
              Take more exams to see your trend
            </div>
          )}
        </div>

        {/* Topic Accuracy */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--color-text)]">Topic Accuracy</h2>
            <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400 inline-block" />≥80%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" />50–79%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />&lt;50%</span>
            </div>
          </div>
          {topicEntries.length > 0 ? (
            <div style={{ height: 180 }}><Bar data={barData} options={BAR_OPTS} /></div>
          ) : (
            <div className="flex items-center justify-center h-44 text-[var(--color-text-muted)] text-sm">
              No topic data yet
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Topics + AI Recommendation ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Best topic */}
        {bestTopic && (
          <div className="card border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Target size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5">Strongest</p>
              <p className="text-sm font-bold text-[var(--color-text)]">{bestTopic[0]}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{Math.round(bestTopic[1])}% accuracy</p>
            </div>
          </div>
        )}

        {/* Worst topic */}
        {worstTopic && worstTopic[0] !== bestTopic?.[0] && (
          <div className="card border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <AlertCircle size={16} className="text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wide mb-0.5">Needs Work</p>
              <p className="text-sm font-bold text-[var(--color-text)]">{worstTopic[0]}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{Math.round(worstTopic[1])}% accuracy</p>
            </div>
          </div>
        )}

        {/* AI Recommendation */}
        {!rLoading && (
          <div className={`card border-[var(--color-primary)]/20 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-900/10 dark:to-indigo-900/10 p-4 ${(!bestTopic || worstTopic?.[0] === bestTopic?.[0]) ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                <Brain size={14} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-xs font-bold text-[var(--color-text)]">AI Recommendation</p>
            </div>
            {rec ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    <BookOpen size={9} /> {rec.topic}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                    <Zap size={9} /> {rec.difficulty}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Lightbulb size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-[var(--color-text)] leading-relaxed">{rec.tip}</p>
                </div>
                <Link to="/create-exam" className="inline-flex items-center gap-1 btn-primary text-[10px] px-3 py-1.5 rounded-lg mt-1">
                  Practice now →
                </Link>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                Complete a few more exams to unlock personalized AI recommendations.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
