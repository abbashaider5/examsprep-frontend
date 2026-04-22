import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CategoryScale, Chart as ChartJS, Filler,
  LinearScale, LineElement, PointElement, Tooltip
} from 'chart.js';
import {
  BarChart2, Bell, BookmarkCheck, BookOpen, CheckCircle, ChevronRight, Flame,
  GraduationCap, Lightbulb, Shield, Sparkles, Star, Trophy, X, Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import BecomeInstructorModal from '../components/BecomeInstructorModal.jsx';
import { examApi, instructorApi, profileApi, resultApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const LEVEL_ICONS = { Beginner: GraduationCap, Intermediate: BarChart2, Advanced: Star, Expert: Trophy };

const STAT_CARDS = [
  { key: 'tests',  icon: BookOpen,  label: 'Total Tests',  gradient: 'from-teal-400 to-cyan-500' },
  { key: 'score',  icon: Star,      label: 'Avg Score',    gradient: 'from-blue-400 to-indigo-500' },
  { key: 'streak', icon: Flame,     label: 'Day Streak',   gradient: 'from-sky-400 to-blue-500' },
  { key: 'xp',     icon: Zap,       label: 'XP Points',    gradient: 'from-teal-500 to-blue-600' },
];

function DiffBadge({ difficulty }) {
  const map = {
    easy:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    hard:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={`badge capitalize ${map[difficulty] || ''}`}>{difficulty}</span>;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showInstructorModal, setShowInstructorModal] = useState(false);

  const isInstructor = ['instructor', 'admin'].includes(user?.role);
  const isStudent    = user?.role === 'user';

  const { data: publicData, isLoading: loadingPublic } = useQuery({
    queryKey: ['publicExams'],
    queryFn: () => examApi.getPublic().then(r => r.data),
  });
  const { data: myExamsData } = useQuery({
    queryKey: ['myExams'],
    queryFn: () => examApi.getAll().then(r => r.data),
  });
  const { data: resultsData } = useQuery({
    queryKey: ['myResults'],
    queryFn: () => resultApi.getAll().then(r => r.data),
  });
  const { data: analyticsData } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => profileApi.analytics().then(r => r.data),
  });
  const { data: recData } = useQuery({
    queryKey: ['recommendation'],
    queryFn: () => profileApi.recommendation().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const { data: invitesData } = useQuery({
    queryKey: ['myInvites'],
    queryFn: () => instructorApi.getMyInvites().then(r => r.data),
    refetchInterval: 60 * 1000,
  });

  const rejectMut = useMutation({
    mutationFn: (token) => instructorApi.rejectInvite(token),
    onSuccess: () => {
      toast.success('Invite declined.');
      queryClient.invalidateQueries({ queryKey: ['myInvites'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to decline invite'),
  });

  const publicExams   = publicData?.exams || [];
  const myExams       = myExamsData?.exams || [];
  const results       = resultsData?.results || [];
  const trend         = analyticsData?.trend || [];
  const pendingInvites = invitesData?.invites || [];
  const avgScore      = results.length ? Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length) : 0;

  const statValues = {
    tests:  myExams.length + results.length,
    score:  `${avgScore}%`,
    streak: user?.streak || 0,
    xp:     user?.xp || 0,
  };

  const chartData = {
    labels: trend.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Score %',
      data: trend.map(t => t.percentage),
      fill: true,
      backgroundColor: 'rgba(13,148,136,0.08)',
      borderColor: '#0d9488',
      pointBackgroundColor: '#0d9488',
      pointRadius: 4,
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y}%` } } },
    scales: {
      y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => `${v}%`, font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { maxRotation: 0, font: { size: 11 } } },
    },
  };

  const LevelIcon = LEVEL_ICONS[user?.level] || GraduationCap;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 sm:p-5 space-y-4 animate-fade-in">

      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 px-5 py-4 shadow-lg">
        <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-teal-50 text-sm mt-0.5">Here's your learning overview for today</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Generate AI Test — only for instructors/admins */}
            {isInstructor && (
              <Link to="/create-exam" className="flex items-center gap-2 bg-white text-teal-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors shadow-sm whitespace-nowrap">
                <Sparkles size={15} /> Generate AI Test
              </Link>
            )}
            {isStudent && (
              <button
                onClick={() => setShowInstructorModal(true)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
              >
                <BookmarkCheck size={14} /> Become Instructor
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2 text-sm">
            <Bell size={15} className="text-[var(--color-primary)]" />
            Test Invitations
            <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingInvites.length}</span>
          </h3>
          {pendingInvites.map(invite => (
            <div key={invite._id} className="bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-primary)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-50 to-blue-100 dark:from-teal-900/30 dark:to-blue-900/20 flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">{invite.exam?.title || 'Test Invitation'}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-[var(--color-text-muted)]">From <strong>{invite.invitedBy?.name || 'Instructor'}</strong></span>
                    {invite.exam?.subject && (
                      <span className="text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">{invite.exam.subject}</span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">{invite.exam?.questions?.length || '?'} questions</span>
                    {invite.exam?.proctored && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Shield size={10} /> Proctored
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => rejectMut.mutate(invite.token)} disabled={rejectMut.isPending}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 rounded-xl">
                  <X size={12} /> Decline
                </button>
                <Link to={`/exam/${invite.exam?._id}?invite=${invite.token}`}
                  className="text-xs py-1.5 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 text-white font-medium hover:opacity-90 flex items-center gap-1 transition-opacity">
                  <CheckCircle size={12} /> Accept &amp; Start
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, icon: Icon, label, gradient }) => (
          <div key={key} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}>
              <Icon size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{statValues[key]}</div>
              <div className="text-xs text-[var(--color-text-muted)] truncate">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Score trend */}
        <div className="xl:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2 text-sm">
              <BarChart2 size={16} className="text-[var(--color-primary)]" /> Score Trend
            </h3>
            <span className="text-xs text-[var(--color-text-muted)]">Last {trend.length} tests</span>
          </div>
          {trend.length > 0 ? (
            <div className="h-48"><Line data={chartData} options={chartOptions} /></div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <BarChart2 size={32} className="text-[var(--color-border)] mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Take tests to see your score trend</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {recData?.recommendation && (
            <div className="bg-gradient-to-br from-teal-50 to-blue-50/60 dark:from-teal-900/20 dark:to-blue-900/10 border border-teal-200 dark:border-teal-800/40 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-[var(--color-primary)] font-bold text-xs mb-2">
                <Lightbulb size={14} /> AI RECOMMENDATION
              </div>
              <p className="text-sm text-[var(--color-text)] font-medium mb-1">
                Practice: <span className="text-[var(--color-primary)]">{recData.recommendation.topic}</span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mb-3 leading-relaxed">{recData.recommendation.tip}</p>
              {isInstructor && (
                <Link to="/create-exam" className="inline-flex items-center gap-1 text-xs py-1.5 px-3 rounded-xl bg-[var(--color-primary)] text-white font-medium hover:bg-[var(--color-primary-dark)] transition-colors">
                  <Sparkles size={11} /> Start Now
                </Link>
              )}
            </div>
          )}

          {/* Level progress */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-sm">
                <LevelIcon size={20} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-[var(--color-text)]">{user?.level || 'Beginner'}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{user?.xp || 0} XP total</div>
              </div>
            </div>
            <div className="bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-blue-600 h-2 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, ((user?.xp || 0) % 500) / 5)}%` }}
              />
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1.5">
              {500 - ((user?.xp || 0) % 500)} XP to next level
            </div>
          </div>
        </div>
      </div>

      {/* Available Exams */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--color-primary)]" /> Available Tests
          </h3>
          {isInstructor && (
            <Link to="/create-exam" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
              <Sparkles size={12} /> Create your own
            </Link>
          )}
        </div>

        {loadingPublic ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
          </div>
        ) : publicExams.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-12">
            <BookOpen size={36} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="text-[var(--color-text-muted)] text-sm">No public tests yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicExams.map((exam, idx) => {
              const gradients = ['from-teal-400 to-cyan-500', 'from-blue-400 to-indigo-500', 'from-teal-500 to-blue-600', 'from-sky-400 to-blue-500', 'from-cyan-400 to-teal-500', 'from-blue-500 to-indigo-600'];
              const grad = gradients[idx % gradients.length];
              return (
                <div key={exam._id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${grad}`} />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-sm`}>
                        <BookOpen size={16} className="text-white" />
                      </div>
                      <DiffBadge difficulty={exam.difficulty} />
                    </div>
                    <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1 group-hover:text-[var(--color-primary)] transition-colors">{exam.title}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">{exam.questions?.length || 10} questions · {exam.timePerQuestion}s/q</p>
                    {exam.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {exam.topics.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Link to={`/exam/${exam._id}`} className={`flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-xl bg-gradient-to-r ${grad} text-white font-semibold hover:opacity-90 transition-opacity`}>
                        Start <ChevronRight size={12} />
                      </Link>
                      <Link to={`/exam/${exam._id}?practice=true`}
                        className="flex items-center justify-center px-3 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-400 text-xs transition-colors"
                        title="Practice Mode">
                        <BookOpen size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Results */}
      {results.length > 0 && (
        <div>
          <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-[var(--color-primary)]" /> Recent Results
          </h3>
          <div className="space-y-2">
            {results.slice(0, 5).map(r => (
              <div key={r._id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{r.exam?.title || 'Exam'}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-lg font-bold ${r.percentage >= 75 ? 'text-emerald-500' : r.percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {r.percentage}%
                  </span>
                  <span className={`badge ${r.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                    {r.passed ? 'Passed' : 'Failed'}
                  </span>
                  <Link to={`/results/${r._id}`} className="text-xs text-[var(--color-primary)] hover:underline">View</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInstructorModal && <BecomeInstructorModal onClose={() => setShowInstructorModal(false)} />}
    </div>
  );
}
