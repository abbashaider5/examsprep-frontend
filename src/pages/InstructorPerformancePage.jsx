import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Award, Brain, Lightbulb, TrendingDown, TrendingUp
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { getDashboardPath } from '../utils/dashboardPath.js';

function scoreColor(v) {
  return v >= 70 ? 'text-emerald-600 dark:text-emerald-400' : v >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
}
function scoreBg(v) {
  return v >= 70 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500';
}

function getStudentSubjectPerf(student, examStats) {
  const bySubject = {};
  student.exams.forEach(e => {
    const stat = examStats.find(s => s._id?.toString() === e.examId?.toString());
    const subject = stat?.subject || 'General';
    if (!bySubject[subject]) bySubject[subject] = { scores: [], passed: 0 };
    bySubject[subject].scores.push(e.score);
    if (e.passed) bySubject[subject].passed++;
  });
  return Object.entries(bySubject).map(([subject, { scores, passed }]) => {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const level = avg >= 75 ? 'strong' : avg >= 50 ? 'average' : 'weak';
    return { subject, avg, attempts: scores.length, passed, level };
  }).sort((a, b) => b.avg - a.avg);
}

function getAIRecommendation(subjectPerf, overallAvg) {
  const weak = subjectPerf.filter(s => s.level === 'weak');
  const strong = subjectPerf.filter(s => s.level === 'strong');
  const average = subjectPerf.filter(s => s.level === 'average');

  if (subjectPerf.length === 0) return 'Not enough data to generate recommendations yet.';

  const lines = [];
  if (weak.length > 0) {
    lines.push(`Struggling in: ${weak.map(s => s.subject).join(', ')}. Recommend focused practice or additional study materials in these areas.`);
  }
  if (average.length > 0 && weak.length === 0) {
    lines.push(`Room for improvement in: ${average.map(s => s.subject).join(', ')}. Consistent practice can push these above 75%.`);
  }
  if (strong.length > 0 && strong.length === subjectPerf.length) {
    lines.push('Performing well across all tested subjects. Consider challenging with harder difficulty tests.');
  }
  if (overallAvg < 50) {
    lines.push('Overall performance is below average. A structured revision plan is recommended.');
  } else if (overallAvg >= 80) {
    lines.push('Strong overall performance. Keep up the momentum.');
  }
  return lines.join(' ') || 'Performance is consistent. Continue regular assessments to monitor progress.';
}

export default function InstructorPerformancePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | weak | average | strong
  const [groupFilter, setGroupFilter] = useState('all'); // all | cohortId
  const isEnterpriseSchoolInstructor = user?.role === 'instructor' && user?.enterprise?.mode === 'school';

  const { data, isLoading, error } = useQuery({
    queryKey: ['instructorAnalyticsDetailed'],
    queryFn: () => instructorApi.getDetailedAnalytics().then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const { examStats = [], studentPerformance = [], groupPerformance = [], classPerformance = [] } = data || {};
  const cohortPerformance = isEnterpriseSchoolInstructor ? classPerformance : groupPerformance;

  const aiStudents = useMemo(() => {
    return studentPerformance.map(s => {
      const attempts = s.exams.length;
      if (!attempts) return null;
      const overallAvg = Math.round(s.exams.reduce((a, e) => a + e.score, 0) / attempts);
      const subjectPerf = getStudentSubjectPerf(s, examStats);
      const recommendation = getAIRecommendation(subjectPerf, overallAvg);
      const overallLevel = overallAvg >= 75 ? 'strong' : overallAvg >= 50 ? 'average' : 'weak';
      return { ...s, _overallAvg: overallAvg, _subjectPerf: subjectPerf, _recommendation: recommendation, _overallLevel: overallLevel };
    }).filter(Boolean);
  }, [studentPerformance, examStats]);

  const filteredStudents = useMemo(() => {
    return aiStudents.filter(s => {
      const matchSearch = !search || s.user.name?.toLowerCase().includes(search.toLowerCase()) || s.user.email?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || s._overallLevel === filter;
      const matchGroup = groupFilter === 'all' ||
        cohortPerformance.find(g => g._id?.toString() === groupFilter)
          ?.students?.some(gs => gs.user?._id?.toString() === s.user._id?.toString());
      return matchSearch && matchFilter && matchGroup;
    }).sort((a, b) => a._overallAvg - b._overallAvg); // worst-first so struggling students are at top
  }, [aiStudents, search, filter, groupFilter, cohortPerformance]);

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <div className="skeleton h-28 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="skeleton h-64 rounded-2xl" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-20">
          <Brain size={48} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="font-semibold text-[var(--color-text)]">Failed to load performance data</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const weakCount    = aiStudents.filter(s => s._overallLevel === 'weak').length;
  const averageCount = aiStudents.filter(s => s._overallLevel === 'average').length;
  const strongCount  = aiStudents.filter(s => s._overallLevel === 'strong').length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 animate-fade-in space-y-6">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 px-6 py-5 mb-8 shadow-md">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-0 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-white leading-tight">Student insights</h1>
              <p className="text-sm text-indigo-100 mt-0.5">Per-student performance and focused recommendations</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Total', value: aiStudents.length },
              { label: 'Struggling', value: weakCount },
              { label: 'Excelling', value: strongCount },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-xl px-3 py-2">
                <span className="text-white/70 text-xs">{label}:</span>
                <span className="text-white font-bold text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Struggling',  count: weakCount,    color: 'from-red-400 to-rose-500',     icon: TrendingDown, filter: 'weak' },
          { label: 'Progressing', count: averageCount, color: 'from-amber-400 to-orange-500', icon: TrendingUp,   filter: 'average' },
          { label: 'Excelling',   count: strongCount,  color: 'from-emerald-400 to-teal-500', icon: Award,        filter: 'strong' },
        ].map(({ label, count, color, icon: Icon, filter: f }) => (
          <button
            key={label}
            onClick={() => setFilter(filter === f ? 'all' : f)}
            className={`bg-[var(--color-surface)] border rounded-2xl p-4 flex items-center gap-4 text-left transition-all ${
              filter === f ? 'border-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-[var(--color-text)]">{count}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by student name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input flex-1 text-sm py-2"
          />
          {cohortPerformance.length > 0 && (
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="input text-sm py-2 w-full sm:w-48 shrink-0"
            >
              <option value="all">{isEnterpriseSchoolInstructor ? 'All Classes' : 'All Batches'}</option>
              {cohortPerformance.map(g => (
                <option key={g._id} value={g._id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'weak', 'average', 'strong'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                filter === f
                  ? f === 'weak'    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                  : f === 'average' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : f === 'strong'  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20'
                  : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg-alt)]'
              }`}
            >
              {f === 'all' ? 'All Students' : f}
            </button>
          ))}
        </div>
        {(search || filter !== 'all' || groupFilter !== 'all') && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Showing <strong className="text-[var(--color-primary)]">{filteredStudents.length}</strong> of {aiStudents.length} students
            {filter !== 'all' && ` · filtered by "${filter}"`}
            {groupFilter !== 'all' && ` · ${cohortPerformance.find(g => g._id?.toString() === groupFilter)?.name || (isEnterpriseSchoolInstructor ? 'class' : 'batch')}`}
          </p>
        )}
      </div>

      {/* Student cards */}
      {filteredStudents.length === 0 ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-16">
          <Brain size={40} className="mx-auto mb-3 text-[var(--color-border)]" />
          <p className="font-semibold text-[var(--color-text)] mb-1">
            {studentPerformance.length === 0 ? 'No student data yet' : 'No students match your filter'}
          </p>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto">
            {studentPerformance.length === 0
              ? 'Once students attempt your tests, insights will appear here.'
              : 'Try adjusting your search or clearing the filter.'}
          </p>
          {studentPerformance.length === 0 && (
            <Link
              to={getDashboardPath(user?.role)}
              className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary)]/15 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredStudents.map(s => {
            const levelColor = s._overallLevel === 'strong'
              ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : s._overallLevel === 'average'
              ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
            const levelLabel = s._overallLevel === 'strong' ? 'Excelling' : s._overallLevel === 'average' ? 'Progressing' : 'Struggling';

            return (
              <div key={s.user._id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {s.user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text)] truncate">{s.user.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] truncate">{s.user.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <div className="text-sm font-bold text-[var(--color-text)]">{s.exams.length}</div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">Attempts</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${levelColor}`}>{levelLabel}</span>
                  </div>
                </div>

                {/* Subject accuracy bars */}
                <div className="px-5 py-4 space-y-2.5">
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                    Subject Performance
                  </p>
                  {s._subjectPerf.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No subject breakdown available.</p>
                  ) : s._subjectPerf.map(sp => (
                    <div key={sp.subject} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-[var(--color-text)] truncate">{sp.subject}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 capitalize ${
                            sp.level === 'strong' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : sp.level === 'average' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                          }`}>{sp.level}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] text-[var(--color-text-muted)]">{sp.attempts} attempt{sp.attempts !== 1 ? 's' : ''}</span>
                          <span className={`text-xs font-bold w-8 text-right ${scoreColor(sp.avg)}`}>{sp.avg}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${scoreBg(sp.avg)}`} style={{ width: `${sp.avg}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* AI recommendation */}
                <div className="mx-5 mb-5 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb size={13} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Recommendation</p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">{s._recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
