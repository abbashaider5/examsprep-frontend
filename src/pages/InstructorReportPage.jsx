import { useQuery } from '@tanstack/react-query';
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import {
    AlertCircle, ArrowLeft, BarChart2, Camera, CheckCircle,
    ChevronRight, Clock, Mail, Shield, Trophy, Users, XCircle, FileText, Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { instructorApi } from '../services/api.js';
import Modal from '../components/Modal.jsx';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function fmtTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Score distribution buckets ────────────────────────────────────────────────
function buildScoreBuckets(rows) {
  const buckets = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
  for (const row of rows) {
    if (!row.latestResult) continue;
    const p = row.latestResult.percentage;
    if (p <= 20)       buckets[0]++;
    else if (p <= 40)  buckets[1]++;
    else if (p <= 60)  buckets[2]++;
    else if (p <= 80)  buckets[3]++;
    else               buckets[4]++;
  }
  return buckets;
}

export default function InstructorReportPage() {
  const { examId }       = useParams();
  const navigate         = useNavigate();
  const [expandedRow,    setExpandedRow]    = useState(null);
  const [tab,            setTab]            = useState('overview'); // 'overview' | 'candidates' | 'screenshots'
  const [studentModal,   setStudentModal]   = useState(null); // { userId, name }

  const { data, isLoading, error } = useQuery({
    queryKey: ['examReport', examId],
    queryFn:  () => instructorApi.getExamReport(examId).then(r => r.data),
    enabled:  !!examId,
  });

  const { data: ssData, isLoading: ssLoading } = useQuery({
    queryKey: ['examScreenshots', examId],
    queryFn:  () => instructorApi.getExamScreenshots(examId).then(r => r.data),
    enabled:  !!examId && tab === 'screenshots',
  });

  const { data: studentData, isLoading: studentLoading, error: studentError } = useQuery({
    queryKey: ['studentExamReport', examId, studentModal?.userId],
    queryFn: () => instructorApi.getStudentExamReport(examId, studentModal.userId).then(r => r.data),
    enabled: !!examId && !!studentModal?.userId,
  });

  if (isLoading) return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
    </div>
  );

  if (error) return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 text-center">
      <AlertCircle size={48} className="mx-auto mb-3 text-red-500" />
      <h2 className="font-bold text-[var(--color-text)] text-lg mb-2">Failed to Load Report</h2>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">{error.response?.data?.message || 'Could not load report data.'}</p>
      <Link to="/instructor-dashboard" className="btn-secondary px-5 py-2.5 text-sm inline-flex items-center gap-2">
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
    </div>
  );

  const { exam, rows = [], summary = {} } = data || {};
  const screenshotsEnabled = exam?.screenshotEnabled;
  const attempted = rows.filter(r => r.latestResult);
  const passed    = rows.filter(r => r.latestResult?.passed);
  const failed    = attempted.filter(r => !r.latestResult?.passed);
  const scoreBuckets = buildScoreBuckets(rows);

  const TABS = [
    { key: 'overview',     label: 'Overview',    icon: BarChart2 },
    { key: 'candidates',   label: 'Candidates',  icon: Users },
    ...(screenshotsEnabled ? [{ key: 'screenshots', label: 'Screenshots', icon: Camera }] : []),
  ];

  // Chart.js theme colours (static — safe for both light/dark)
  const passFailData = {
    labels: ['Passed', 'Failed', 'Not Attempted'],
    datasets: [{
      data: [passed.length, failed.length, rows.length - attempted.length],
      backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'],
      borderWidth: 0,
    }],
  };

  const scoreDistData = {
    labels: ['0–20%', '21–40%', '41–60%', '61–80%', '81–100%'],
    datasets: [{
      label: 'Candidates',
      data: scoreBuckets,
      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'],
      borderRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
      y: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 1 } },
    },
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">

      {/* Back button + header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-[var(--color-text)] truncate">{exam?.title}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {exam?.subject} · {exam?.difficulty} · {exam?.questions?.length || 0} questions · Detailed Report
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Invited',   value: summary.totalInvites || 0, color: 'text-blue-500',                      bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Accepted',  value: summary.accepted     || 0, color: 'text-purple-500',                    bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Pending',   value: summary.pending      || 0, color: 'text-amber-500',                     bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Attempted', value: summary.attempted    || 0, color: 'text-cyan-500',                      bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
          { label: 'Passed',    value: summary.passed       || 0, color: 'text-green-500',                     bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Avg Score', value: `${summary.avgScore  || 0}%`, color: 'text-[var(--color-primary)]',     bg: 'bg-[var(--color-primary)]/10' },
        ].map(s => (
          <div key={s.label} className={`card p-3 flex flex-col gap-1.5`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.bg}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${s.color.replace('text-', 'bg-')}`} />
            </div>
            <div className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-[var(--color-text-muted)]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px
                ${tab === key
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pass/Fail doughnut */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4 flex items-center gap-2">
              <CheckCircle size={14} className="text-green-500" /> Pass / Fail Distribution
            </h3>
            {attempted.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-text-muted)] text-sm">No attempts yet</div>
            ) : (
              <div className="flex items-center gap-6">
                <div style={{ height: '180px', width: '180px' }} className="shrink-0">
                  <Doughnut data={passFailData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }} />
                </div>
                <div className="space-y-3 flex-1">
                  {[
                    { label: 'Passed',        count: passed.length,                       color: 'bg-green-500' },
                    { label: 'Failed',         count: failed.length,                       color: 'bg-red-500' },
                    { label: 'Not Attempted',  count: rows.length - attempted.length,       color: 'bg-slate-400' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                      <span className="text-sm text-[var(--color-text)] flex-1">{item.label}</span>
                      <span className="text-sm font-bold text-[var(--color-text)]">{item.count}</span>
                    </div>
                  ))}
                  {attempted.length > 0 && (
                    <div className="pt-2 border-t border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-muted)]">Pass rate</p>
                      <p className="text-xl font-bold text-green-500">
                        {Math.round((passed.length / attempted.length) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Score distribution bar chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4 flex items-center gap-2">
              <BarChart2 size={14} className="text-[var(--color-primary)]" /> Score Distribution
            </h3>
            {attempted.length === 0 ? (
              <div className="text-center py-10 text-[var(--color-text-muted)] text-sm">No attempts yet</div>
            ) : (
              <div style={{ height: '180px' }}>
                <Bar data={scoreDistData} options={chartOptions} />
              </div>
            )}
          </div>

          {/* Top performers */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4 flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" /> Top Performers
            </h3>
            {passed.length === 0 ? (
              <p className="text-sm text-center text-[var(--color-text-muted)] py-6">No passing scores yet</p>
            ) : (
              <div className="space-y-2">
                {[...passed]
                  .sort((a, b) => b.latestResult.percentage - a.latestResult.percentage)
                  .slice(0, 5)
                  .map((row, i) => (
                    <div key={row._id} className="flex items-center gap-3 py-1.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          i === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                          i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                          'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]'}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm text-[var(--color-text)] truncate">{row.name || row.email}</span>
                      <span className="text-sm font-bold text-green-500 shrink-0">{row.latestResult.percentage}%</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Failed candidates */}
          <div className="card p-5">
            <h3 className="font-semibold text-sm text-[var(--color-text)] mb-4 flex items-center gap-2">
              <XCircle size={14} className="text-red-500" /> Failed Candidates
            </h3>
            {failed.length === 0 ? (
              <p className="text-sm text-center text-[var(--color-text-muted)] py-6">
                {attempted.length === 0 ? 'No attempts yet' : 'Everyone passed!'}
              </p>
            ) : (
              <div className="space-y-2">
                {[...failed]
                  .sort((a, b) => b.latestResult.percentage - a.latestResult.percentage)
                  .slice(0, 5)
                  .map(row => (
                    <div key={row._id} className="flex items-center gap-3 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-red-600 dark:text-red-400">{(row.name || row.email)?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="flex-1 text-sm text-[var(--color-text)] truncate">{row.name || row.email}</span>
                      <span className="text-sm font-bold text-red-500 shrink-0">{row.latestResult.percentage}%</span>
                    </div>
                  ))}
                {failed.length > 5 && (
                  <p className="text-xs text-center text-[var(--color-text-muted)] pt-1">+{failed.length - 5} more — see Candidates tab</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Candidates tab ── */}
      {tab === 'candidates' && (
        <div className="space-y-2">
          {rows.length === 0 ? (
            <div className="text-center py-16">
              <Mail size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-muted)]">No invites sent yet.</p>
            </div>
          ) : rows.map(row => (
            <div key={row._id} className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--color-bg-alt)] transition-colors"
                onClick={() => setExpandedRow(expandedRow === row._id ? null : row._id)}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
                  {(row.name || row.email)?.[0]?.toUpperCase()}
                </div>

                {/* Name / email */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--color-text)]">{row.name || row.email}</span>
                    {row.name && <span className="text-xs text-[var(--color-text-muted)] hidden sm:block truncate">{row.email}</span>}
                  </div>
                  {/* Invite status + score bar on mobile */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      row.inviteStatus === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      row.inviteStatus === 'expired'  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    } capitalize`}>
                      {row.inviteStatus === 'accepted' ? <CheckCircle size={9} /> : row.inviteStatus === 'expired' ? <XCircle size={9} /> : <AlertCircle size={9} />}
                      {row.inviteStatus}
                    </span>
                    {row.totalAttempts > 1 && (
                      <span className="text-[10px] text-[var(--color-primary)] font-semibold">{row.totalAttempts} attempts</span>
                    )}
                  </div>
                </div>

                {/* Score + time */}
                {row.latestResult ? (
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Score with bar */}
                    <div className="text-right hidden sm:block min-w-[80px]">
                      <div className={`text-sm font-bold ${row.latestResult.passed ? 'text-green-500' : 'text-red-500'}`}>
                        {row.latestResult.percentage}%
                      </div>
                      <div className="h-1.5 bg-[var(--color-border)] rounded-full mt-1 w-16">
                        <div
                          className={`h-1.5 rounded-full transition-all ${row.latestResult.passed ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${row.latestResult.percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{row.latestResult.passed ? 'Passed' : 'Failed'}</div>
                    </div>
                    {/* Score on mobile */}
                    <div className={`sm:hidden text-sm font-bold ${row.latestResult.passed ? 'text-green-500' : 'text-red-500'}`}>
                      {row.latestResult.percentage}%
                    </div>
                    {/* Time */}
                    <div className="hidden md:flex flex-col items-center text-center">
                      <div className="flex items-center gap-1 text-xs font-medium text-[var(--color-text)]">
                        <Clock size={11} className="text-[var(--color-text-muted)]" /> {fmtTime(row.latestResult.timeTaken)}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">Time</div>
                    </div>
                    {/* Proctoring badge */}
                    {row.latestResult.proctored && (
                      <div className="hidden sm:flex flex-col items-center">
                        <Shield size={14} className={row.latestResult.violations > 0 ? 'text-red-500' : 'text-green-500'} />
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                          {row.latestResult.violations > 0 ? `${row.latestResult.violations}v` : 'Clean'}
                        </div>
                      </div>
                    )}
                    {row.screenshotCount > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
                        <Camera size={10} /> {row.screenshotCount}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)] shrink-0 italic">Not attempted</span>
                )}

                <ChevronRight size={14} className={`text-[var(--color-text-muted)] transition-transform shrink-0 ${expandedRow === row._id ? 'rotate-90' : ''}`} />
              </div>

              {expandedRow === row._id && (
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-alt)] p-4">
                  {row.latestResult?.resultId && row.userId && (
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Detailed report includes question-level feedback and student screenshots (if enabled).
                      </div>
                      <button
                        type="button"
                        onClick={() => setStudentModal({ userId: row.userId, name: row.name || row.email })}
                        className="btn-secondary text-xs py-2 px-3 inline-flex items-center justify-center gap-1.5"
                      >
                        <FileText size={12} /> View detailed report
                      </button>
                    </div>
                  )}
                  {row.allAttempts.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No attempts yet.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">All Attempts</p>
                      {row.allAttempts.map((attempt, i) => (
                        <div key={attempt.resultId} className="flex items-center gap-3 text-xs py-2 border-b border-[var(--color-border)] last:border-0">
                          <span className="text-[var(--color-text-muted)] w-5 shrink-0">#{i + 1}</span>
                          <span className={`font-bold w-12 shrink-0 ${attempt.passed ? 'text-green-500' : 'text-red-500'}`}>
                            {attempt.percentage}%
                          </span>
                          <span className={`w-12 shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold text-center ${attempt.passed ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {attempt.passed ? 'Pass' : 'Fail'}
                          </span>
                          <span className="flex items-center gap-1 text-[var(--color-text-muted)]">
                            <Clock size={10} /> {fmtTime(attempt.timeTaken)}
                          </span>
                          {attempt.proctored && (
                            <span className={`flex items-center gap-1 ${attempt.violations > 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                              <Shield size={10} />
                              {attempt.violations > 0 ? `${attempt.violations} violation${attempt.violations !== 1 ? 's' : ''}` : 'Clean'}
                            </span>
                          )}
                          <span className="ml-auto text-[var(--color-text-muted)]">{fmtDateTime(attempt.attemptedAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {row.bestResult && row.totalAttempts > 1 && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center gap-2 text-xs">
                      <Trophy size={12} className="text-amber-500" />
                      <span className="text-[var(--color-text-muted)]">
                        Best: <span className="font-semibold text-[var(--color-text)]">{row.bestResult.percentage}%</span> on {fmtDateTime(row.bestResult.attemptedAt)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Screenshots tab ── */}
      {tab === 'screenshots' && (
        <>
          {ssLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1,2,3,4,5,6,8].map(i => <div key={i} className="skeleton rounded-xl aspect-[4/3]" />)}
            </div>
          ) : !ssData?.screenshots?.length ? (
            <div className="text-center py-16">
              <Camera size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
              <p className="text-sm text-[var(--color-text-muted)]">No screenshots captured yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {ssData.screenshots.map(ss => (
                <div key={ss._id} className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-alt)]">
                  <div className="aspect-[4/3] bg-black">
                    <img src={ss.imageUrl || ss.imageData} alt="screenshot"
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-[var(--color-text)] truncate">
                      {ss.user?.name || ss.user?.email || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      {new Date(ss.capturedAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {ss.result && (
                      <span className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        ss.result.passed
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {ss.result.percentage}% · {ss.result.passed ? 'Passed' : 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Student detailed modal ── */}
      {studentModal?.userId && (
        <Modal onClose={() => setStudentModal(null)}>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-muted)]">Student report</p>
                <h2 className="text-lg font-bold text-[var(--color-text)] truncate">{studentModal.name}</h2>
              </div>
              <button onClick={() => setStudentModal(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                <XCircle size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {studentLoading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
              ) : studentError ? (
                <div className="text-center py-10">
                  <AlertCircle size={36} className="mx-auto mb-3 text-red-500" />
                  <p className="text-sm text-[var(--color-text-muted)]">{studentError.response?.data?.message || 'Failed to load student report.'}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Latest score', value: studentData?.latestResult ? `${studentData.latestResult.percentage}%` : '—', color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10' },
                      { label: 'Correct', value: studentData?.latestResult ? studentData.latestResult.correctCount : '—', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                      { label: 'Incorrect', value: studentData?.latestResult ? studentData.latestResult.incorrectCount : '—', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                      { label: 'AI avg', value: studentData?.insights?.avgAIScore !== null && studentData?.insights?.avgAIScore !== undefined ? `${studentData.insights.avgAIScore}/100` : '—', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                    ].map(s => (
                      <div key={s.label} className="card p-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
                          <Sparkles size={14} className={s.color} />
                        </div>
                        <div className={`text-xl font-bold mt-2 ${s.color}`}>{s.value}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="card p-4">
                    <h3 className="font-semibold text-sm text-[var(--color-text)] mb-2 flex items-center gap-2">
                      <Sparkles size={14} className="text-[var(--color-primary)]" /> Recommendation
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)]">{studentData?.recommendation?.summary || '—'}</p>
                    {studentData?.recommendation?.tips?.length > 0 && (
                      <ul className="mt-3 space-y-1.5 text-xs text-[var(--color-text-muted)]">
                        {studentData.recommendation.tips.slice(0, 5).map((t, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[var(--color-bg-alt)] flex items-center justify-center text-[10px] font-bold text-[var(--color-text-muted)] shrink-0">{i + 1}</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {studentData?.latestResult?.answers?.length > 0 && studentData?.exam?.questions?.length > 0 && (
                    <div className="card p-4">
                      <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3 flex items-center gap-2">
                        <FileText size={14} className="text-[var(--color-primary)]" /> Question-level performance
                      </h3>
                      <div className="space-y-2">
                        {studentData.latestResult.answers.slice(0, 30).map((a) => {
                          const q = studentData.exam.questions?.[a.questionIndex];
                          if (!q) return null;
                          return (
                            <div key={a.questionIndex} className="border border-[var(--color-border)] rounded-xl p-3 bg-[var(--color-bg-alt)]">
                              <div className="flex items-start gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${a.isCorrect ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                  {a.isCorrect ? '✓' : '✕'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-[var(--color-text)]">{q.question}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[var(--color-text-muted)]">
                                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">{q.type?.toUpperCase() || 'Q'}</span>
                                    {q.topic && <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]">{q.topic}</span>}
                                    {typeof a.aiScore === 'number' && <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">AI {a.aiScore}/100</span>}
                                  </div>
                                  {a.aiFeedback && (
                                    <p className="text-xs text-[var(--color-text-muted)] mt-2 whitespace-pre-wrap">{a.aiFeedback}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {studentData.latestResult.answers.length > 30 && (
                          <p className="text-xs text-[var(--color-text-muted)] pt-2">Showing first 30 questions. (We can paginate if you want.)</p>
                        )}
                      </div>
                    </div>
                  )}

                  {studentData?.latestResult?.proctoringEvents?.length > 0 && (
                    <div className="card p-4">
                      <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3 flex items-center gap-2">
                        <Shield size={14} className="text-[var(--color-primary)]" /> Proctoring Logs
                      </h3>
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {studentData.latestResult.proctoringEvents.slice(-120).reverse().map((ev, idx) => (
                          <div key={`${ev.timestamp || idx}-${idx}`} className="border border-[var(--color-border)] rounded-xl p-2.5 bg-[var(--color-bg-alt)]">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold ${
                                ev.severity === 'critical'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : ev.severity === 'warning'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              }`}>
                                {ev.severity || 'info'}
                              </span>
                              <span className="text-[10px] text-[var(--color-text-muted)]">
                                {ev.timestamp ? new Date(ev.timestamp).toLocaleString('en-IN') : '—'}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-text)] mt-1.5">{ev.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {studentData?.screenshots?.length > 0 && (
                    <div className="card p-4">
                      <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3 flex items-center gap-2">
                        <Camera size={14} className="text-[var(--color-primary)]" /> Screenshots
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {studentData.screenshots.slice(0, 24).map(ss => (
                          <div key={ss._id} className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-bg-alt)]">
                            <div className="aspect-[4/3] bg-black">
                              <img src={ss.imageUrl || ss.imageData} alt="screenshot" className="w-full h-full object-cover" />
                            </div>
                            <div className="p-2">
                              <p className="text-[10px] text-[var(--color-text-muted)]">
                                {new Date(ss.capturedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {ss.result && (
                                <p className="text-[10px] font-semibold text-[var(--color-text)] mt-0.5">
                                  {ss.result.percentage}% · {ss.result.passed ? 'Passed' : 'Failed'}{typeof ss.result.violations === 'number' ? ` · ${ss.result.violations}v` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {studentData.screenshots.length > 24 && (
                        <p className="text-xs text-[var(--color-text-muted)] pt-3">Showing latest 24 screenshots.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
