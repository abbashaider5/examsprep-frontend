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

const LINE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, callback: v => `${v}%` } },
  },
};

const BAR_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}%` } } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, callback: v => `${v}%` } },
  },
};

function StatCard({ icon: Icon, label, value, sub, color = 'var(--color-primary)' }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <p className="text-xl font-extrabold text-[var(--color-text)] leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

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

  // Compute average score from trend
  const avgScore = trend.length > 0
    ? Math.round(trend.reduce((s, t) => s + t.percentage, 0) / trend.length)
    : null;

  // Best / worst topic
  const topicEntries = Object.entries(topicPerf);
  const bestTopic = topicEntries.length > 0
    ? topicEntries.reduce((a, b) => a[1] > b[1] ? a : b)
    : null;
  const worstTopic = topicEntries.length > 0
    ? topicEntries.reduce((a, b) => a[1] < b[1] ? a : b)
    : null;

  // Line chart data — last 10 results
  const recentTrend = trend.slice(-10);
  const lineData = {
    labels: recentTrend.map((t, i) => {
      const d = new Date(t.date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [{
      data: recentTrend.map(t => t.percentage),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.08)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#3b82f6',
      pointRadius: 4,
    }],
  };

  // Bar chart data — topic accuracy
  const topicLabels = topicEntries.map(([k]) => k.length > 14 ? k.slice(0, 13) + '…' : k);
  const topicValues = topicEntries.map(([, v]) => Math.round(v));
  const barData = {
    labels: topicLabels,
    datasets: [{
      data: topicValues,
      backgroundColor: topicValues.map(v =>
        v >= 80 ? 'rgba(34,197,94,0.7)' : v >= 50 ? 'rgba(59,130,246,0.7)' : 'rgba(239,68,68,0.65)'
      ),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  if (aLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-4xl mx-auto animate-fade-in">
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (totalExams === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-4xl mx-auto animate-fade-in text-center">
        <BookOpen size={48} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-30" />
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">No data yet</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">Complete at least one exam to see your performance insights.</p>
        <Link to="/create-exam" className="btn-primary px-6 py-2.5 rounded-xl text-sm">Generate Your First Exam</Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={20} className="text-[var(--color-primary)]" />
          <h1 className="text-xl font-extrabold text-[var(--color-text)]">Study Performance</h1>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">A full picture of how you're progressing</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={BookOpen} label="Exams Taken" value={totalExams} />
        <StatCard icon={Target} label="Avg. Score" value={avgScore !== null ? `${avgScore}%` : '—'} />
        <StatCard icon={Flame} label="Streak" value={`${streak}d`} color="#f97316" />
        <StatCard icon={Zap} label="Topics" value={topicEntries.length} color="#8b5cf6" />
      </div>

      {/* Score trend chart */}
      {recentTrend.length > 1 && (
        <div className="card p-5">
          <h2 className="text-sm font-bold text-[var(--color-text)] mb-4">Score Trend (last {recentTrend.length} exams)</h2>
          <div style={{ height: 200 }}>
            <Line data={lineData} options={LINE_OPTS} />
          </div>
        </div>
      )}

      {/* Topic accuracy chart */}
      {topicEntries.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[var(--color-text)]">Topic Accuracy</h2>
            <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />≥80%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />50–79%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />&lt;50%</span>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <Bar data={barData} options={BAR_OPTS} />
          </div>
        </div>
      )}

      {/* Best / worst topics */}
      {(bestTopic || worstTopic) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {bestTopic && (
            <div className="card border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Target size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">Strongest Topic</p>
                <p className="text-sm font-bold text-[var(--color-text)] mt-0.5">{bestTopic[0]}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{Math.round(bestTopic[1])}% accuracy</p>
              </div>
            </div>
          )}
          {worstTopic && worstTopic[0] !== bestTopic?.[0] && (
            <div className="card border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertCircle size={16} className="text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">Needs Work</p>
                <p className="text-sm font-bold text-[var(--color-text)] mt-0.5">{worstTopic[0]}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{Math.round(worstTopic[1])}% accuracy</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Recommendation */}
      {!rLoading && (
        <div className="card border-[var(--color-primary)]/20 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-900/10 dark:to-indigo-900/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Brain size={16} className="text-[var(--color-primary)]" />
            </div>
            <h2 className="text-sm font-bold text-[var(--color-text)]">AI Study Recommendation</h2>
          </div>
          {rec ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold px-3 py-1 rounded-full">
                  <BookOpen size={11} /> Focus: {rec.topic}
                </span>
                <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                  <Zap size={11} /> {rec.difficulty} difficulty
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-[var(--color-text)] leading-relaxed">{rec.tip}</p>
              </div>
              <Link
                to={`/create-exam`}
                className="inline-flex items-center gap-1.5 btn-primary text-xs px-4 py-2 rounded-lg mt-1"
              >
                Practice {rec.topic} now →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Complete a few more exams to unlock personalized AI recommendations.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
