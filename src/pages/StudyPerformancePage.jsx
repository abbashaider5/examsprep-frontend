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
import {
    AlertCircle, ArrowLeft, BookOpen, Brain, Filter, Lightbulb,
    Target, TrendingUp, X, Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { profileApi, resultApi } from '../services/api.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const LINE_OPTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, callback: v => `${v}%` } },
    },
};

const BAR_OPTS = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
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

    const { data: resultsData, isLoading: resLoading } = useQuery({
        queryKey: ['myResults'],
        queryFn: () => resultApi.getAll().then(r => r.data),
        staleTime: 60000,
    });

    const [filterExam, setFilterExam] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterTopic, setFilterTopic] = useState('all');
    const [showFilters, setShowFilters] = useState(false);

    const allResults = resultsData?.results || [];
    const trend = analytics?.trend || [];
    const topicPerfGlobal = analytics?.topicPerf || {};
    const totalExams = analytics?.totalExams || 0;
    const rec = recData?.recommendation;

    // Build filter options from results
    const examOptions = useMemo(() => {
        const map = {};
        allResults.forEach(r => {
            const id = r.exam?._id || r.exam;
            const title = r.exam?.title;
            if (id && title) map[id] = title;
        });
        return Object.entries(map);
    }, [allResults]);

    const subjectOptions = useMemo(() => {
        const set = new Set();
        allResults.forEach(r => { if (r.exam?.subject) set.add(r.exam.subject); });
        return [...set];
    }, [allResults]);

    const topicOptions = useMemo(() => {
        const set = new Set(Object.keys(topicPerfGlobal));
        allResults.forEach(r => {
            if (r.topicAccuracy) Object.keys(r.topicAccuracy).forEach(t => set.add(t));
        });
        return [...set];
    }, [allResults, topicPerfGlobal]);

    // Apply filters to results
    const filteredResults = useMemo(() => {
        return allResults.filter(r => {
            const examId = r.exam?._id || r.exam;
            if (filterExam !== 'all' && examId !== filterExam) return false;
            if (filterSubject !== 'all' && r.exam?.subject !== filterSubject) return false;
            if (filterTopic !== 'all' && r.topicAccuracy && !(filterTopic in r.topicAccuracy)) return false;
            return true;
        });
    }, [allResults, filterExam, filterSubject, filterTopic]);

    const hasFilter = filterExam !== 'all' || filterSubject !== 'all' || filterTopic !== 'all';

    // Compute filtered analytics
    const filteredTrend = useMemo(() => {
        if (!hasFilter) return trend.slice(-10);
        return filteredResults
            .slice(-10)
            .map(r => ({ date: r.createdAt, percentage: r.percentage }));
    }, [filteredResults, trend, hasFilter]);

    const filteredTopicPerf = useMemo(() => {
        if (!hasFilter) return topicPerfGlobal;
        if (filterTopic !== 'all') {
            // Show only the selected topic
            const val = topicPerfGlobal[filterTopic];
            return val !== undefined ? { [filterTopic]: val } : {};
        }
        // Aggregate from filtered results
        const acc = {};
        const count = {};
        filteredResults.forEach(r => {
            if (r.topicAccuracy) {
                Object.entries(r.topicAccuracy).forEach(([topic, val]) => {
                    acc[topic] = (acc[topic] || 0) + val;
                    count[topic] = (count[topic] || 0) + 1;
                });
            }
        });
        const result = {};
        Object.keys(acc).forEach(t => { result[t] = acc[t] / count[t]; });
        return result;
    }, [filteredResults, topicPerfGlobal, filterTopic, hasFilter]);

    const filteredAvgScore = filteredResults.length > 0
        ? Math.round(filteredResults.reduce((s, r) => s + r.percentage, 0) / filteredResults.length)
        : null;

    const subjectStats = useMemo(() => {
        const map = {};
        filteredResults.forEach((r) => {
            const subject = r.exam?.subject || 'General';
            if (!map[subject]) map[subject] = { total: 0, score: 0, time: 0, count: 0 };
            map[subject].total += 1;
            map[subject].score += r.percentage || 0;
            map[subject].time += r.timeTaken || 0;
            map[subject].count += 1;
        });
        return Object.entries(map).map(([subject, stats]) => ({
            subject,
            attempts: stats.total,
            accuracy: Math.round(stats.score / Math.max(1, stats.count)),
            avgTimeMin: Math.round((stats.time / Math.max(1, stats.count)) / 60),
        }));
    }, [filteredResults]);

    const bestSubject = subjectStats.length ? [...subjectStats].sort((a, b) => b.accuracy - a.accuracy)[0] : null;
    const weakSubject = subjectStats.length ? [...subjectStats].sort((a, b) => a.accuracy - b.accuracy)[0] : null;

    const topicEntries = Object.entries(filteredTopicPerf);
    const bestTopic = topicEntries.length > 0 ? topicEntries.reduce((a, b) => a[1] > b[1] ? a : b) : null;
    const worstTopic = topicEntries.length > 0 ? topicEntries.reduce((a, b) => a[1] < b[1] ? a : b) : null;

    const lineData = {
        labels: filteredTrend.map(t => { const d = new Date(t.date); return `${d.getDate()}/${d.getMonth() + 1}`; }),
        datasets: [{
            data: filteredTrend.map(t => t.percentage),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13,148,136,0.10)',
            tension: 0.4, fill: true,
            pointBackgroundColor: '#0d9488', pointRadius: 4,
        }],
    };

    const topicLabels = topicEntries.map(([k]) => k.length > 14 ? k.slice(0, 13) + '…' : k);
    const topicValues = topicEntries.map(([, v]) => Math.round(v));
    const barData = {
        labels: topicLabels,
        datasets: [{
            data: topicValues,
            backgroundColor: topicValues.map(v => v >= 80 ? 'rgba(16,185,129,0.75)' : v >= 50 ? 'rgba(13,148,136,0.75)' : 'rgba(239,68,68,0.65)'),
            borderRadius: 6, borderSkipped: false,
        }],
    };

    if (aLoading || resLoading) {
        return (
            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto animate-fade-in">
                <div className="skeleton h-28 rounded-2xl mb-6" />
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
            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto animate-fade-in text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--color-bg-alt)] border border-[var(--color-border)] flex items-center justify-center">
                    <TrendingUp size={32} className="text-[var(--color-primary)]" />
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">No performance data yet</h2>
                <p className="text-[var(--color-text-muted)] text-sm mb-6">Complete at least one exam to see your performance insights.</p>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto animate-fade-in space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--color-text)] tracking-tight">Performance</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Detailed insights across tests, subjects, and topics.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        className={`btn-secondary inline-flex items-center gap-2 ${showFilters || hasFilter ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : ''}`}
                    >
                        <Filter size={15} />
                        {hasFilter ? 'Filters active' : 'Filter'}
                        {hasFilter && (
                            <span className="ml-1 w-5 h-5 bg-[var(--color-primary)]/15 text-[var(--color-primary)] rounded-full text-xs flex items-center justify-center shrink-0">
                                {[filterExam !== 'all', filterSubject !== 'all', filterTopic !== 'all'].filter(Boolean).length}
                            </span>
                        )}
                    </button>
                    <Link to="/dashboard" className="btn-secondary inline-flex items-center gap-1.5">
                        <ArrowLeft size={14} /> Back
                    </Link>
                </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2"><Filter size={14} /> Filter Performance</h3>
                        {hasFilter && (
                            <button onClick={() => { setFilterExam('all'); setFilterSubject('all'); setFilterTopic('all'); }}
                                className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                <X size={12} /> Clear all
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">By Test</label>
                            <select value={filterExam} onChange={e => setFilterExam(e.target.value)} className="input w-full text-sm py-2">
                                <option value="all">All Tests</option>
                                {examOptions.map(([id, title]) => (
                                    <option key={id} value={id}>{title.length > 30 ? title.slice(0, 30) + '…' : title}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">By Subject</label>
                            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="input w-full text-sm py-2">
                                <option value="all">All Subjects</option>
                                {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">By Topic</label>
                            <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="input w-full text-sm py-2">
                                <option value="all">All Topics</option>
                                {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    {hasFilter && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-3">
                            Showing <strong className="text-[var(--color-primary)]">{filteredResults.length}</strong> results out of {allResults.length} total
                        </p>
                    )}
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                    { label: 'Exams Taken', value: hasFilter ? filteredResults.length : totalExams, icon: BookOpen, gradient: 'from-teal-400 to-cyan-500' },
                    { label: 'Subject Accuracy', value: bestSubject ? `${bestSubject.accuracy}%` : (filteredAvgScore !== null ? `${filteredAvgScore}%` : '—'), icon: Target, gradient: 'from-blue-400 to-indigo-500' },
                    { label: 'Avg Time / Test', value: filteredResults.length ? `${Math.round((filteredResults.reduce((s, r) => s + (r.timeTaken || 0), 0) / filteredResults.length) / 60)}m` : '—', icon: TrendingUp, gradient: 'from-sky-400 to-blue-500' },
                    { label: 'Topics', value: topicEntries.length, icon: Zap, gradient: 'from-teal-500 to-blue-600' },
                ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-bg-alt)] border border-[var(--color-border)] flex items-center justify-center shrink-0 shadow-sm">
                            <Icon size={18} className="text-[var(--color-primary)]" />
                        </div>
                        <div>
                            <p className="text-[10px] text-[var(--color-text-muted)] leading-none mb-1">{label}</p>
                            <p className="text-xl font-extrabold text-[var(--color-text)] leading-none">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Subject wise performance */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                <h3 className="text-sm font-bold text-[var(--color-text)] mb-4">Subject-wise Performance</h3>
                {subjectStats.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">No subject-level data available for the current filter.</p>
                ) : (
                    <div className="space-y-2">
                        {subjectStats.map((s) => (
                            <div key={s.subject} className="p-3 rounded-xl bg-[var(--color-bg-alt)] border border-[var(--color-border)]">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-[var(--color-text)]">{s.subject}</p>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.accuracy >= 75 ? 'bg-emerald-100 text-emerald-700' : s.accuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                        {s.accuracy}% accuracy
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-2 text-xs text-[var(--color-text-muted)]">
                                    <span>{s.attempts} attempts</span>
                                    <span>{s.avgTimeMin} min avg time</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-bold text-[var(--color-text)]">Score Trend</h2>
                            {hasFilter && <p className="text-[10px] text-[var(--color-primary)] mt-0.5">Filtered view</p>}
                        </div>
                        <span className="text-[10px] text-[var(--color-text-muted)]">Last {filteredTrend.length} exams</span>
                    </div>
                    {filteredTrend.length > 1 ? (
                        <div style={{ height: 180 }}><Line data={lineData} options={LINE_OPTS} /></div>
                    ) : (
                        <div className="flex items-center justify-center h-44 text-[var(--color-text-muted)] text-sm">
                            {hasFilter ? 'Not enough filtered data to show trend' : 'Take more exams to see your trend'}
                        </div>
                    )}
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-sm font-bold text-[var(--color-text)]">Topic Accuracy</h2>
                            {filterTopic !== 'all' && <p className="text-[10px] text-[var(--color-primary)] mt-0.5">Topic: {filterTopic}</p>}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400 inline-block" />≥80%</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-500 inline-block" />50–79%</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400 inline-block" />&lt;50%</span>
                        </div>
                    </div>
                    {topicEntries.length > 0 ? (
                        <div style={{ height: 180 }}><Bar data={barData} options={BAR_OPTS} /></div>
                    ) : (
                        <div className="flex items-center justify-center h-44 text-[var(--color-text-muted)] text-sm">
                            {hasFilter ? 'No topic data for this filter' : 'No topic data yet'}
                        </div>
                    )}
                </div>
            </div>

            {/* Per-test breakdown (when filtered by test) */}
            {filterExam !== 'all' && filteredResults.length > 0 && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-[var(--color-text)] mb-4">Attempt History</h3>
                    <div className="space-y-2">
                        {filteredResults.map((r, i) => (
                            <div key={r._id} className="flex items-center gap-3 p-3 bg-[var(--color-bg-alt)] rounded-xl">
                                <span className="text-xs text-[var(--color-text-muted)] w-6 text-center">#{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-[var(--color-text)]">{new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div className="h-1.5 w-20 bg-[var(--color-border)] rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${r.percentage >= 75 ? 'bg-emerald-500' : r.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${r.percentage}%` }} />
                                </div>
                                <span className={`text-sm font-bold w-12 text-right ${r.percentage >= 75 ? 'text-emerald-500' : r.percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{r.percentage}%</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                    {r.passed ? 'Pass' : 'Fail'}
                                </span>
                                <Link to={`/results/${r._id}`} className="text-xs text-[var(--color-primary)] hover:underline shrink-0">View</Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Topics + AI Recommendation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {bestSubject && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Strong Subject</p>
                        <p className="text-sm font-bold text-[var(--color-text)]">{bestSubject.subject}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{bestSubject.accuracy}% accuracy</p>
                    </div>
                )}
                {weakSubject && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                        <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide mb-1">Weak Subject</p>
                        <p className="text-sm font-bold text-[var(--color-text)]">{weakSubject.subject}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">{weakSubject.accuracy}% accuracy</p>
                    </div>
                )}
                {bestTopic && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                            <Target size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-0.5">Strongest</p>
                            <p className="text-sm font-bold text-[var(--color-text)]">{bestTopic[0]}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">{Math.round(bestTopic[1])}% accuracy</p>
                        </div>
                    </div>
                )}

                {worstTopic && worstTopic[0] !== bestTopic?.[0] && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center shrink-0 shadow-sm">
                            <AlertCircle size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wide mb-0.5">Needs Work</p>
                            <p className="text-sm font-bold text-[var(--color-text)]">{worstTopic[0]}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">{Math.round(worstTopic[1])}% accuracy</p>
                        </div>
                    </div>
                )}

                {!rLoading && (
                    <div className={`bg-[var(--color-bg-alt)] border border-[var(--color-border)] rounded-2xl p-4 ${(!bestTopic || worstTopic?.[0] === bestTopic?.[0]) ? 'lg:col-span-2' : ''}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-alt)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                                <Brain size={14} className="text-[var(--color-primary)]" />
                            </div>
                            <p className="text-xs font-bold text-[var(--color-text)]">AI Recommendation</p>
                        </div>
                        {rec ? (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="inline-flex items-center gap-1 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                        <BookOpen size={9} /> {rec.topic}
                                    </span>
                                    <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize">
                                        <Zap size={9} /> {rec.difficulty}
                                    </span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                    <Lightbulb size={12} className="text-amber-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-[var(--color-text)] leading-relaxed">{rec.tip}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--color-text-muted)]">Complete a few more exams to unlock personalized AI recommendations.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
