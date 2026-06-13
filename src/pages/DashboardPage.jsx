import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CategoryScale, Chart as ChartJS, Filler,
  LinearScale, LineElement, PointElement, Tooltip
} from 'chart.js';
import {
  ArrowRight, Award, BarChart2, Bell, BookOpen, CalendarDays, CheckCircle, ChevronRight,
  KeyRound, Loader2,
  Shield, Sparkles, X,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { enterpriseApi, examApi, instructorApi, profileApi, resultApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import AccessKeyEnrollModal from '../components/AccessKeyEnrollModal.jsx';
import UserPageHeader from '../components/UserPageHeader.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const STUDENT_QUICK_LINKS = [
  { to: '/tests', title: 'My Tests', desc: 'Start or continue', icon: BookOpen },
  { to: '/performance', title: 'Performance', desc: 'View analytics', icon: BarChart2 },
  { to: '/certificates', title: 'Certificates', desc: 'Track achievements', icon: Award },
  { to: '/batches', title: 'Batches', desc: 'Manage groups', icon: Users },
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
  const navigate = useNavigate();
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [accessKeyPreview, setAccessKeyPreview] = useState(null);

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
  const { data: schoolMyChatsData } = useQuery({
    queryKey: ['schoolMyChats'],
    queryFn: () => enterpriseApi.schoolMyChats().then((r) => r.data),
    enabled: isStudent && !!user?.enterpriseId,
    retry: false,
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

  const previewKeyMut = useMutation({
    mutationFn: (key) => instructorApi.previewAccessKey(key),
    onSuccess: (res) => {
      setAccessKeyPreview(res.data);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Invalid exam access key'),
  });

  const publicExams   = publicData?.exams || [];
  const myExams       = myExamsData?.exams || [];
  const results       = resultsData?.results || [];
  const schoolClassChats = schoolMyChatsData?.classes || [];
  const trend         = analyticsData?.trend || [];
  const pendingInvites = invitesData?.invites || [];
  const planExpiryDays = user?.planExpiresAt
    ? Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const showExpiryBanner = ['instructor', 'admin'].includes(user?.role)
    && user?.plan
    && user.plan !== 'free'
    && typeof planExpiryDays === 'number'
    && planExpiryDays >= 0
    && planExpiryDays <= 7;


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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const recentResults = results.slice(0, 5);
  const recentPerformance = recentResults.length
    ? Math.round(recentResults.reduce((sum, r) => sum + r.percentage, 0) / recentResults.length)
    : 0;
  const passedCount = results.filter(r => r.passed).length;
  const passRate = results.length ? Math.round((passedCount / results.length) * 100) : 0;
  const thisMonth = new Date().getMonth();
  const thisMonthAttempts = results.filter(r => new Date(r.createdAt).getMonth() === thisMonth).length;

  return (
    <div className="p-4 sm:p-5 space-y-4 animate-fade-in">

      <UserPageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0] || ''}`}
        subtitle={isStudent ? 'Your learning workspace is ready.' : 'Welcome back. Continue from the sections below.'}
        icon={BookOpen}
        right={
          isInstructor ? (
            <Link to="/create-exam" className="btn-primary text-sm px-4 py-2 rounded-xl inline-flex items-center gap-2">
              <Sparkles size={15} /> Create test
            </Link>
          ) : null
        }
        className={isStudent ? 'bg-teal-50/70 border-teal-100' : ''}
      />

      {showExpiryBanner && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            Your plan is expiring soon. Please renew to avoid interruption.
          </p>
          <Link to="/profile" className="text-sm font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2">
            Renew Now
          </Link>
        </div>
      )}

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
                <Link
                  to={`/exam/${invite.exam?._id}?invite=${invite.token}`}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 rounded-xl"
                >
                  <CheckCircle size={12} /> Accept &amp; Start
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {isStudent && (
        <>
          <div className="card border border-[var(--color-border)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <KeyRound size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--color-text)]">Join Exam</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 mb-3">Enter an exam access key from your instructor.</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="input flex-1 font-mono text-sm uppercase"
                    placeholder="e.g. MATH-ABX7K9"
                    value={accessKeyInput}
                    onChange={(e) => setAccessKeyInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && accessKeyInput.trim()) {
                        previewKeyMut.mutate(accessKeyInput.trim());
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => previewKeyMut.mutate(accessKeyInput.trim())}
                    disabled={!accessKeyInput.trim() || previewKeyMut.isPending}
                    className="btn-primary text-sm px-5 py-2 inline-flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {previewKeyMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Checking…</> : 'Continue'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Quick Navigation</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {STUDENT_QUICK_LINKS.map((item, idx) => {
                const badgeBg =
                  idx === 0 ? 'bg-blue-50'
                  : idx === 1 ? 'bg-teal-50'
                  : idx === 2 ? 'bg-emerald-50'
                  : 'bg-sky-50';
                const badgeBorder =
                  idx === 0 ? 'border-blue-100'
                  : idx === 1 ? 'border-teal-100'
                  : idx === 2 ? 'border-emerald-100'
                  : 'border-sky-100';
                return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${badgeBg} ${badgeBorder}`}>
                      <item.icon size={14} className="text-[var(--color-primary)]" />
                    </div>
                    <ArrowRight size={12} className="text-[var(--color-text-muted)] shrink-0" />
                  </div>
                  <p className="text-sm font-semibold mt-2 text-[var(--color-text)]">{item.title}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{item.desc}</p>
                </Link>
              );})}
            </div>
          </div>

          {schoolClassChats.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Class discussions</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Chats for classes you are enrolled in.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {schoolClassChats.map((c) => (
                  <Link
                    key={c.classId}
                    to={`/batches/${c.chatGroupId}`}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 flex items-center justify-between gap-2 hover:border-[var(--color-primary)]/40 transition-colors"
                  >
                    <span className="text-sm font-medium text-[var(--color-text)] truncate">
                      {c.name}{c.section ? ` · ${c.section}` : ''}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--color-primary)] shrink-0">Open</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Tests Taken', value: results.length, accent: 'bg-blue-100', icon: BookOpen },
              { label: 'Recent Performance', value: `${recentPerformance}%`, accent: 'bg-emerald-100', icon: BarChart2 },
              { label: 'Pass Rate', value: `${passRate}%`, accent: 'bg-teal-100', icon: CheckCircle },
              { label: 'This Month', value: thisMonthAttempts, accent: 'bg-indigo-100', icon: CalendarDays },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex items-center gap-3 shadow-sm"
              >
                <span className={`w-7 h-7 rounded-full ${card.accent} flex items-center justify-center`}>
                  <card.icon size={13} className="text-[var(--color-primary)]" />
                </span>
                <div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{card.label}</p>
                  <p className="text-lg font-semibold text-[var(--color-text)] mt-0.5">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!isStudent && (
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
      )}

      {/* Available Exams */}
      {!isStudent && <div>
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
                      {examStats[exam._id] && (
                        <Link to={`/exam/${exam._id}?practice=true`}
                          className="flex items-center justify-center px-3 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-400 text-xs transition-colors"
                          title="Practice Mode">
                          <BookOpen size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

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
      {accessKeyPreview && (
        <AccessKeyEnrollModal
          preview={accessKeyPreview}
          onClose={() => setAccessKeyPreview(null)}
          onEnrolled={() => {
            setAccessKeyInput('');
            queryClient.invalidateQueries({ queryKey: ['myAcceptedInvites'] });
            navigate('/tests');
          }}
        />
      )}
    </div>
  );
}
