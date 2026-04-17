import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CategoryScale, Chart as ChartJS, Filler,
  LinearScale, LineElement, PointElement, Tooltip
} from 'chart.js';
import {
  BarChart2, BookmarkCheck, BookOpen, Bell, CheckCircle, ChevronRight, Flame,
  Lightbulb, Plus, Shield, Sparkles, Star, Trophy, GraduationCap, Monitor, X,
} from 'lucide-react';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import BecomeInstructorModal from '../components/BecomeInstructorModal.jsx';
import { examApi, instructorApi, profileApi, resultApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

function StatCard({ icon, label, value, color = 'text-[var(--color-primary)]', bg = 'bg-blue-50 dark:bg-blue-900/20' }) {
  return (
    <div className="card flex items-center gap-4 min-w-0">
      <div className={`${color} ${bg} p-3 rounded-xl shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{value}</div>
        <div className="text-xs text-[var(--color-text-muted)] truncate">{label}</div>
      </div>
    </div>
  );
}

function DiffBadge({ difficulty }) {
  const map = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={`badge capitalize ${map[difficulty] || ''}`}>{difficulty}</span>;
}

const LEVEL_ICONS = { Beginner: GraduationCap, Intermediate: BarChart2, Advanced: Star, Expert: Trophy };

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showInstructorModal, setShowInstructorModal] = useState(false);

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
    refetchInterval: 60 * 1000, // re-check every minute
  });

  const rejectMut = useMutation({
    mutationFn: (token) => instructorApi.rejectInvite(token),
    onSuccess: () => {
      toast.success('Invite declined.');
      queryClient.invalidateQueries({ queryKey: ['myInvites'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to decline invite'),
  });

  const publicExams = publicData?.exams || [];
  const myExams = myExamsData?.exams || [];
  const results = resultsData?.results || [];
  const trend = analyticsData?.trend || [];
  const pendingInvites = invitesData?.invites || [];
  const avgScore = results.length
    ? Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length)
    : 0;

  const chartData = {
    labels: trend.map(t => new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Score %',
      data: trend.map(t => t.percentage),
      fill: true,
      backgroundColor: 'rgba(3, 102, 172, 0.08)',
      borderColor: '#0366AC',
      pointBackgroundColor: '#0366AC',
      pointRadius: 4,
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y}%` } } },
    scales: {
      y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: v => `${v}%` } },
      x: { grid: { display: false }, ticks: { maxRotation: 0 } },
    },
  };

  const LevelIcon = LEVEL_ICONS[user?.level] || GraduationCap;

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
          </h2>
          <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Here's your learning overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link to="/create-exam" className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap">
            <Sparkles size={15} /> Generate AI Exam
          </Link>
          {user?.role === 'user' && (
            <button
              onClick={() => setShowInstructorModal(true)}
              className="btn-secondary text-sm flex items-center gap-1.5"
            >
              <BookmarkCheck size={14} /> Become Instructor
            </button>
          )}
        </div>
      </div>

      {/* Exam Invite Notifications */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2 text-sm">
            <Bell size={15} className="text-[var(--color-primary)]" />
            Exam Invitations
            <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingInvites.length}</span>
          </h3>
          {pendingInvites.map(invite => (
            <div key={invite._id} className="card border-l-4 border-l-[var(--color-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <BookOpen size={16} className="text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">{invite.exam?.title || 'Exam Invitation'}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-[var(--color-text-muted)]">From <strong>{invite.invitedBy?.name || 'Instructor'}</strong></span>
                    {invite.exam?.subject && (
                      <span className="text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">{invite.exam.subject}</span>
                    )}
                    <span className="text-xs text-[var(--color-text-muted)]">{invite.exam?.questions?.length || '?'} questions</span>
                    {invite.exam?.proctored && (
                      <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Shield size={10} /> AI Proctored
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 sm:ml-4">
                <button
                  onClick={() => rejectMut.mutate(invite.token)}
                  disabled={rejectMut.isPending}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <X size={12} /> Decline
                </button>
                <Link
                  to={`/exam/${invite.exam?._id}?invite=${invite.token}`}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  <CheckCircle size={12} /> Accept &amp; Start
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen size={20} />} label="Total Exams" value={myExams.length + results.length} />
        <StatCard icon={<Star size={20} />} label="Avg Score" value={`${avgScore}%`} color="text-yellow-500" bg="bg-yellow-50 dark:bg-yellow-900/20" />
        <StatCard icon={<Flame size={20} />} label="Day Streak" value={user?.streak || 0} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-900/20" />
        <StatCard icon={<Trophy size={20} />} label="XP Points" value={user?.xp || 0} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Score trend chart */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2 text-sm">
              <BarChart2 size={16} className="text-[var(--color-primary)]" /> Score Trend
            </h3>
            <span className="text-xs text-[var(--color-text-muted)]">Last {trend.length} exams</span>
          </div>
          {trend.length > 0 ? (
            <div className="h-48"><Line data={chartData} options={chartOptions} /></div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <BarChart2 size={32} className="text-[var(--color-border)] mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">Take exams to see your score trend</p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {recData?.recommendation && (
            <div className="card border-[var(--color-primary)] bg-blue-50/50 dark:bg-blue-900/10">
              <div className="flex items-center gap-1.5 text-[var(--color-primary)] font-semibold text-xs mb-2">
                <Lightbulb size={14} /> AI RECOMMENDATION
              </div>
              <p className="text-sm text-[var(--color-text)] font-medium mb-1">
                Practice: <span className="text-[var(--color-primary)]">{recData.recommendation.topic}</span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mb-3 leading-relaxed">{recData.recommendation.tip}</p>
              <Link to="/create-exam" className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1">
                <Plus size={12} /> Start Now
              </Link>
            </div>
          )}

          {/* Level progress */}
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <LevelIcon size={20} className="text-purple-600" />
              </div>
              <div>
                <div className="font-bold text-[var(--color-text)]">{user?.level || 'Beginner'}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{user?.xp || 0} XP total</div>
              </div>
            </div>
            <div className="bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-500"
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
            <BookOpen size={16} className="text-[var(--color-primary)]" /> Available Exams
          </h3>
          <Link to="/create-exam" className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
            <Plus size={12} /> Create your own
          </Link>
        </div>

        {loadingPublic ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-36" />)}
          </div>
        ) : publicExams.length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen size={36} className="mx-auto mb-3 text-[var(--color-border)]" />
            <p className="text-[var(--color-text-muted)] text-sm">No public exams yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicExams.map(exam => (
              <div key={exam._id} className="card hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-bg-alt)] flex items-center justify-center">
                    <Monitor size={18} className="text-[var(--color-primary)]" />
                  </div>
                  <DiffBadge difficulty={exam.difficulty} />
                </div>
                <h4 className="font-semibold text-[var(--color-text)] text-sm mb-1 group-hover:text-[var(--color-primary)] transition-colors">{exam.title}</h4>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">{exam.questions?.length || 10} questions · {exam.timePerQuestion}s/question</p>
                {exam.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {exam.topics.slice(0, 3).map(t => (
                      <span key={t} className="text-xs bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Link to={`/exam/${exam._id}`} className="flex-1 flex items-center justify-center gap-1 btn-primary text-xs py-2 group-hover:gap-2 transition-all">
                    Start <ChevronRight size={12} />
                  </Link>
                  <Link
                    to={`/exam/${exam._id}?practice=true`}
                    className="flex items-center justify-center px-3 py-2 rounded-lg border border-green-400 text-green-600 dark:text-green-400 text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    title="Practice Mode"
                  >
                    <BookOpen size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Recent Results */}
      {results.length > 0 && (
        <div>
          <h3 className="font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-[var(--color-primary)]" /> Recent Results
          </h3>
          <div className="space-y-2">
            {results.slice(0, 5).map(r => (
              <div key={r._id} className="card flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{r.exam?.title || 'Exam'}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-lg font-bold ${r.percentage >= 75 ? 'text-green-500' : 'text-red-500'}`}>
                    {r.percentage}%
                  </span>
                  <span className={`badge ${r.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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
