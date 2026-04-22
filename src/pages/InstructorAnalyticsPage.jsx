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
  ArrowLeft, Award, BarChart2, BookOpen, Brain, ChevronDown, ChevronRight,
  Filter, Lightbulb,
  TrendingDown,
  TrendingUp,
  Users, X, Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Link, useNavigate } from 'react-router-dom';
import { instructorApi } from '../services/api.js';
import { useThemeStore } from '../store/index.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

function useChartColors() {
    const { dark } = useThemeStore();
    return {
        text:    dark ? '#cbd5e1' : '#334155',
        muted:   dark ? '#64748b' : '#94a3b8',
        grid:    dark ? '#1e293b' : '#f1f5f9',
        surface: dark ? '#1e293b' : '#ffffff',
        primary: '#0d9488',
        green:   '#10b981',
        amber:   '#f59e0b',
        red:     '#ef4444',
        purple:  '#8b5cf6',
        teal:    '#14b8a6',
        rose:    '#f43f5e',
    };
}

const baseOpts = (c) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: c.surface, titleColor: c.text, bodyColor: c.muted, borderColor: c.grid, borderWidth: 1, cornerRadius: 8, padding: 10 },
    },
    scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.muted, font: { size: 11 } } },
        y: { grid: { color: c.grid }, ticks: { color: c.muted, font: { size: 11 } }, beginAtZero: true },
    },
});

function StatCard({ icon: Icon, label, value, sub, gradient }) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm shrink-0`}>
                <Icon size={20} className="text-white" />
            </div>
            <div>
                <div className="text-2xl font-extrabold text-[var(--color-text)] leading-tight">{value}</div>
                <div className="text-xs font-medium text-[var(--color-text-muted)]">{label}</div>
                {sub && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{sub}</div>}
            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, height = 220, children }) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col gap-3">
            <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
                {subtitle && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
            </div>
            <div style={{ height }}>{children}</div>
        </div>
    );
}

function scoreColor(v) {
    return v >= 70 ? 'text-emerald-600 dark:text-emerald-400' : v >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
}
function scoreBg(v) {
    return v >= 70 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500';
}
function diffBadge(d) {
    return d === 'easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
        : d === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
}

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'tests', label: 'Tests' },
    { id: 'students', label: 'Students' },
    { id: 'groups', label: 'Batches' },
    { id: 'aiInsights', label: 'AI Insights' },
];

// ── AI Insights helpers ───────────────────────────────────────────────────────

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
        const subjects = weak.map(s => s.subject).join(', ');
        lines.push(`Struggling in: ${subjects}. Recommend focused practice or additional materials in these areas.`);
    }
    if (average.length > 0 && weak.length === 0) {
        const subjects = average.map(s => s.subject).join(', ');
        lines.push(`Room for improvement in: ${subjects}. Consistent practice can push these above 75%.`);
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

export default function InstructorAnalyticsPage() {
    const c = useChartColors();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [studentSearch, setStudentSearch] = useState('');
    const [filterExam, setFilterExam] = useState('all');
    const [filterSubject, setFilterSubject] = useState('all');
    const [filterDiff, setFilterDiff] = useState('all');
    const [sortStudents, setSortStudents] = useState('avgScore'); // avgScore | attempts | passRate | name
    const [sortDir, setSortDir] = useState('desc');
    const [expandedGroup, setExpandedGroup] = useState(null);
    const [aiSearch, setAiSearch] = useState('');
    const [aiFilter, setAiFilter] = useState('all'); // all | weak | average | strong
    const [aiGroupFilter, setAiGroupFilter] = useState('all'); // all | groupId

    const { data, isLoading, error } = useQuery({
        queryKey: ['instructorAnalyticsDetailed'],
        queryFn: () => instructorApi.getDetailedAnalytics().then(r => r.data),
        staleTime: 2 * 60 * 1000,
    });

    const {
        summary = {},
        examStats = [],
        timeSeries = [],
        subjectBreakdown = [],
        studentPerformance = [],
        groupPerformance = [],
    } = data || {};

    // Filter options
    const subjectOptions = [...new Set(examStats.map(e => e.subject).filter(Boolean))];
    const diffOptions = [...new Set(examStats.map(e => e.difficulty).filter(Boolean))];

    // Filtered exam stats
    const filteredExamStats = examStats.filter(e => {
        if (filterSubject !== 'all' && e.subject !== filterSubject) return false;
        if (filterDiff !== 'all' && e.difficulty !== filterDiff) return false;
        return true;
    });

    // Filtered students — must be above early returns to satisfy Rules of Hooks
    const filteredStudents = useMemo(() => {
        let list = studentPerformance.filter(s => {
            const matchSearch = !studentSearch || s.user.name?.toLowerCase().includes(studentSearch.toLowerCase()) || s.user.email?.toLowerCase().includes(studentSearch.toLowerCase());
            const matchExam   = filterExam === 'all' || s.exams.some(e => e.examId?.toString() === filterExam);
            return matchSearch && matchExam;
        }).map(s => {
            const relevant = filterExam === 'all' ? s.exams : s.exams.filter(e => e.examId?.toString() === filterExam);
            const attempts = relevant.length;
            if (!attempts) return null;
            const avg = Math.round(relevant.reduce((a, e) => a + e.score, 0) / attempts);
            const passed = relevant.filter(e => e.passed).length;
            return { ...s, _attempts: attempts, _avg: avg, _passRate: Math.round((passed / attempts) * 100), _best: Math.max(...relevant.map(e => e.score)), _last: new Date(Math.max(...relevant.map(e => new Date(e.date)))) };
        }).filter(Boolean);

        list.sort((a, b) => {
            let va = a[`_${sortStudents}`], vb = b[`_${sortStudents}`];
            if (sortStudents === 'name') { va = a.user.name || ''; vb = b.user.name || ''; }
            return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });
        return list;
    }, [studentPerformance, studentSearch, filterExam, sortStudents, sortDir]);

    // AI Insights computed data
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

    const filteredAiStudents = useMemo(() => {
        return aiStudents.filter(s => {
            const matchSearch = !aiSearch || s.user.name?.toLowerCase().includes(aiSearch.toLowerCase()) || s.user.email?.toLowerCase().includes(aiSearch.toLowerCase());
            const matchFilter = aiFilter === 'all' || s._overallLevel === aiFilter;
            const matchGroup = aiGroupFilter === 'all' ||
                groupPerformance.find(g => g._id?.toString() === aiGroupFilter)
                    ?.students?.some(gs => gs.user?._id?.toString() === s.user._id?.toString());
            return matchSearch && matchFilter && matchGroup;
        }).sort((a, b) => a._overallAvg - b._overallAvg); // worst first for attention
    }, [aiStudents, aiSearch, aiFilter, aiGroupFilter, groupPerformance]);

    if (isLoading) {
        return (
            <div className="px-6 py-8 space-y-6">
                <div className="skeleton h-28 rounded-2xl" />
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
            <div className="px-6 py-8">
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-20">
                    <BarChart2 size={48} className="mx-auto mb-3 text-[var(--color-border)]" />
                    <p className="font-semibold text-[var(--color-text)]">Failed to load analytics</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">{error.message}</p>
                </div>
            </div>
        );
    }

    const toggleSort = (field) => {
        if (sortStudents === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortStudents(field); setSortDir('desc'); }
    };

    // Chart data
    const topExams = [...filteredExamStats].sort((a, b) => b.attempts - a.attempts).slice(0, 8);
    const barData = {
        labels: topExams.map(e => e.title.length > 18 ? e.title.slice(0, 18) + '…' : e.title),
        datasets: [{
            label: 'Avg Score (%)',
            data: topExams.map(e => e.avgScore),
            backgroundColor: topExams.map(e => e.avgScore >= 70 ? `${c.green}cc` : e.avgScore >= 50 ? `${c.amber}cc` : `${c.red}cc`),
            borderRadius: 6, borderSkipped: false,
        }],
    };

    const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(Date.now() - (29 - i) * 86400000);
        return d.toISOString().slice(0, 10);
    });
    const tsMap = Object.fromEntries(timeSeries.map(t => [t._id, t]));
    const lineData = {
        labels: last30.map(d => { const dt = new Date(d); return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }),
        datasets: [{
            label: 'Attempts',
            data: last30.map(d => tsMap[d]?.attempts || 0),
            borderColor: c.primary, backgroundColor: `${c.primary}22`, fill: true, tension: 0.4, pointRadius: 3, pointHoverRadius: 5,
        }],
    };

    const totalPass = examStats.reduce((a, e) => a + (e.passCount || 0), 0);
    const totalFail = (summary.totalAttempts || 0) - totalPass;
    const doughnutData = {
        labels: ['Passed', 'Failed'],
        datasets: [{ data: [totalPass, totalFail], backgroundColor: [`${c.green}cc`, `${c.red}cc`], borderColor: [c.green, c.red], borderWidth: 2 }],
    };

    const subjData = {
        labels: subjectBreakdown.map(s => s._id || 'Unknown'),
        datasets: [
            { label: 'Avg Score', data: subjectBreakdown.map(s => Math.round(s.avgScore)), backgroundColor: `${c.purple}cc`, borderRadius: 4, yAxisID: 'y' },
            { label: 'Attempts', data: subjectBreakdown.map(s => s.count), backgroundColor: `${c.teal}cc`, borderRadius: 4, yAxisID: 'y1' },
        ],
    };

    const hasFilter = filterSubject !== 'all' || filterDiff !== 'all' || filterExam !== 'all';

    const SortTh = ({ field, label }) => (
        <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap cursor-pointer hover:text-[var(--color-text)] select-none" onClick={() => toggleSort(field)}>
            <span className="flex items-center gap-1">
                {label}
                {sortStudents === field && <ChevronDown size={11} className={sortDir === 'asc' ? 'rotate-180' : ''} />}
            </span>
        </th>
    );

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 animate-fade-in space-y-6">

            {/* Empty state — no exams yet */}
            {!examStats.length ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-20">
                    <BarChart2 size={48} className="mx-auto mb-3 text-[var(--color-border)]" />
                    <p className="font-semibold text-[var(--color-text)] text-lg">No analytics data yet</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-xs mx-auto">
                        Create tests and invite students to start seeing analytics here.
                    </p>
                    <Link to="/instructor-dashboard" className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary)]/15 transition-colors">
                        <ArrowLeft size={14} /> Back to Dashboard
                    </Link>
                </div>
            ) : (<>

            {/* Hero header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 px-6 py-6 shadow-lg">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-8 left-0 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-xl font-extrabold text-white leading-tight">Analytics Dashboard</h1>
                            <p className="text-sm text-teal-100 mt-0.5">Performance insights across all your tests & batches</p>
                        </div>
                    </div>
                    {/* Quick stats */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: 'Tests', value: summary.totalExams || 0 },
                            { label: 'Students', value: summary.totalStudents || 0 },
                            { label: 'Pass Rate', value: `${summary.passRate || 0}%` },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-xl px-3 py-2">
                                <span className="text-white/70 text-xs">{label}:</span>
                                <span className="text-white font-bold text-sm">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                <StatCard icon={BookOpen}   label="Total Tests"    value={summary.totalExams || 0}     gradient="from-teal-400 to-cyan-500" />
                <StatCard icon={Zap}        label="Total Attempts" value={summary.totalAttempts || 0}  gradient="from-blue-400 to-indigo-500" />
                <StatCard icon={TrendingUp} label="Avg Score"      value={`${summary.avgScore || 0}%`} gradient="from-teal-500 to-blue-600" />
                <StatCard icon={Award}      label="Pass Rate"      value={`${summary.passRate || 0}%`} gradient="from-sky-400 to-blue-500" />
                <StatCard icon={Users}      label="Students"       value={summary.totalStudents || 0}  gradient="from-cyan-400 to-teal-500" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-fit">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${activeTab === t.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                        {t.label}
                        {t.id === 'groups' && groupPerformance.length > 0 && (
                            <span className="ml-1.5 text-[10px] bg-[var(--color-primary)]/15 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full">{groupPerformance.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <ChartCard title="Pass vs Fail" subtitle="Overall across all tests" height={200}>
                            <Doughnut data={doughnutData} options={{
                                responsive: true, maintainAspectRatio: false, cutout: '68%',
                                plugins: {
                                    legend: { display: true, position: 'bottom', labels: { color: c.muted, font: { size: 11 }, boxWidth: 12, padding: 12 } },
                                    tooltip: { backgroundColor: c.surface, titleColor: c.text, bodyColor: c.muted, borderColor: c.grid, borderWidth: 1, cornerRadius: 8 },
                                },
                            }} />
                        </ChartCard>
                        <div className="lg:col-span-2">
                            <ChartCard title="Attempts Over Last 30 Days" subtitle="Daily attempt activity" height={200}>
                                <Line data={lineData} options={{ ...baseOpts(c), plugins: { ...baseOpts(c).plugins, legend: { display: false } } }} />
                            </ChartCard>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title="Avg Score per Test" subtitle="Top 8 by attempt count" height={200}>
                            <Bar data={barData} options={{ ...baseOpts(c), scales: { ...baseOpts(c).scales, y: { ...baseOpts(c).scales.y, max: 100, ticks: { ...baseOpts(c).scales.y.ticks, callback: v => `${v}%` } } } }} />
                        </ChartCard>
                        <ChartCard title="Performance by Subject" subtitle="Avg score & attempts per subject" height={200}>
                            <Bar data={subjData} options={{
                                ...baseOpts(c),
                                plugins: { ...baseOpts(c).plugins, legend: { display: true, labels: { color: c.muted, font: { size: 11 }, boxWidth: 10, padding: 10 } } },
                                scales: {
                                    x: baseOpts(c).scales.x,
                                    y:  { ...baseOpts(c).scales.y, id: 'y',  position: 'left', title: { display: true, text: 'Avg Score (%)', color: c.muted, font: { size: 10 } } },
                                    y1: { ...baseOpts(c).scales.y, id: 'y1', position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Attempts', color: c.muted, font: { size: 10 } } },
                                },
                            }} />
                        </ChartCard>
                    </div>
                </div>
            )}

            {/* ── TESTS TAB ── */}
            {activeTab === 'tests' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2"><Filter size={14} /> Filter Tests</h3>
                            {(filterSubject !== 'all' || filterDiff !== 'all') && (
                                <button onClick={() => { setFilterSubject('all'); setFilterDiff('all'); }} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                    <X size={12} /> Clear
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <div className="flex-1 min-w-[160px]">
                                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Subject</label>
                                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="input w-full text-sm py-2">
                                    <option value="all">All Subjects</option>
                                    {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Difficulty</label>
                                <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)} className="input w-full text-sm py-2">
                                    <option value="all">All Levels</option>
                                    {diffOptions.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                                </select>
                            </div>
                        </div>
                        {hasFilter && <p className="text-xs text-[var(--color-text-muted)] mt-3">Showing <strong className="text-[var(--color-primary)]">{filteredExamStats.length}</strong> of {examStats.length} tests</p>}
                    </div>

                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                        {filteredExamStats.length === 0 ? (
                            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">No tests match your filters.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]/50">
                                            {['Test', 'Subject', 'Difficulty', 'Attempts', 'Avg Score', 'Pass Rate', 'Actions'].map(h => (
                                                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {filteredExamStats.map(exam => (
                                            <tr key={exam._id} className="hover:bg-[var(--color-bg-alt)]/40 transition-colors">
                                                <td className="py-3 px-4">
                                                    <p className="font-medium text-[var(--color-text)] max-w-[200px] truncate">{exam.title}</p>
                                                </td>
                                                <td className="py-3 px-4 text-[var(--color-text-muted)] text-xs">{exam.subject || '—'}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${diffBadge(exam.difficulty)}`}>{exam.difficulty}</span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-[var(--color-text)]">{exam.attempts}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${scoreBg(exam.avgScore)}`} style={{ width: `${exam.avgScore}%` }} />
                                                        </div>
                                                        <span className={`text-xs font-bold ${scoreColor(exam.avgScore)}`}>{exam.avgScore}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-xs font-bold ${scoreColor(exam.passRate)}`}>{exam.passRate}%</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => { setActiveTab('students'); setFilterExam(exam._id?.toString()); }}
                                                        className="text-[10px] text-[var(--color-primary)] hover:underline flex items-center gap-1">
                                                        Students <ChevronRight size={10} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── STUDENTS TAB ── */}
            {activeTab === 'students' && (
                <div className="space-y-4">
                    {/* Filters */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Search Student</label>
                                <input type="text" placeholder="Name or email…" value={studentSearch}
                                    onChange={e => setStudentSearch(e.target.value)}
                                    className="input w-full text-sm py-2" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-[var(--color-text-muted)] mb-1">Filter by Test</label>
                                <select value={filterExam} onChange={e => setFilterExam(e.target.value)} className="input w-full text-sm py-2">
                                    <option value="all">All Tests</option>
                                    {examStats.map(e => <option key={e._id} value={e._id?.toString()}>{e.title.length > 35 ? e.title.slice(0, 35) + '…' : e.title}</option>)}
                                </select>
                            </div>
                            {(studentSearch || filterExam !== 'all') && (
                                <div className="flex items-end">
                                    <button onClick={() => { setStudentSearch(''); setFilterExam('all'); }}
                                        className="flex items-center gap-1 text-xs text-red-500 hover:underline pb-2"><X size={12} /> Clear</button>
                                </div>
                            )}
                        </div>
                        {filterExam !== 'all' && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                Filtered by: <span className="font-semibold text-[var(--color-primary)]">{examStats.find(e => e._id?.toString() === filterExam)?.title}</span>
                            </p>
                        )}
                    </div>

                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                        {filteredStudents.length === 0 ? (
                            <div className="text-center py-12">
                                <Users size={28} className="mx-auto mb-2 text-[var(--color-border)]" />
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    {studentPerformance.length === 0 ? 'No students have attempted your tests yet.' : 'No students match your search.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-alt)]/50">
                                            <SortTh field="name" label="Student" />
                                            <SortTh field="attempts" label="Attempts" />
                                            <SortTh field="avgScore" label="Avg Score" />
                                            <SortTh field="passRate" label="Pass Rate" />
                                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">Best Score</th>
                                            <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">Last Attempt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {filteredStudents.map(s => (
                                            <tr key={s.user._id} className="hover:bg-[var(--color-bg-alt)]/40 transition-colors">
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                            {s.user.name?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-[var(--color-text)] truncate">{s.user.name}</p>
                                                            <p className="text-[10px] text-[var(--color-text-muted)] truncate">{s.user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 font-semibold text-[var(--color-text)]">{s._attempts}</td>
                                                <td className="py-3 px-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-14 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${scoreBg(s._avg)}`} style={{ width: `${s._avg}%` }} />
                                                        </div>
                                                        <span className={`text-xs font-bold ${scoreColor(s._avg)}`}>{s._avg}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3"><span className={`text-xs font-bold ${scoreColor(s._passRate)}`}>{s._passRate}%</span></td>
                                                <td className="py-3 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{s._best}%</td>
                                                <td className="py-3 px-3 text-xs text-[var(--color-text-muted)]">
                                                    {s._last ? s._last.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── GROUPS TAB ── */}
            {activeTab === 'groups' && (
                <div className="space-y-4">
                    {groupPerformance.length === 0 ? (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-16">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/30 dark:to-blue-900/20 flex items-center justify-center mx-auto mb-4">
                                <Users size={24} className="text-[var(--color-primary)]" />
                            </div>
                            <p className="font-semibold text-[var(--color-text)] mb-1">No batches yet</p>
                            <p className="text-sm text-[var(--color-text-muted)]">Create batches and invite students to see batch-wise analytics.</p>
                            <Link to="/batches" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary)]/15 transition-colors">
                                Manage Batches <ChevronRight size={14} />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {groupPerformance.map(g => (
                                <div key={g._id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                    {/* Group header */}
                                    <button
                                        onClick={() => setExpandedGroup(expandedGroup === g._id ? null : g._id)}
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--color-bg-alt)]/50 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shrink-0">
                                                <Users size={18} className="text-white" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[var(--color-text)]">{g.name}</p>
                                                <p className="text-xs text-[var(--color-text-muted)]">{g.memberCount} members · {g.activeStudents} active</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="hidden sm:flex items-center gap-6 text-center">
                                                {[
                                                    { label: 'Attempts', value: g.totalAttempts },
                                                    { label: 'Avg Score', value: `${g.avgScore}%`, cls: scoreColor(g.avgScore) },
                                                    { label: 'Pass Rate', value: `${g.passRate}%`, cls: scoreColor(g.passRate) },
                                                ].map(({ label, value, cls }) => (
                                                    <div key={label}>
                                                        <p className={`text-sm font-bold ${cls || 'text-[var(--color-text)]'}`}>{value}</p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <ChevronDown size={16} className={`text-[var(--color-text-muted)] transition-transform ${expandedGroup === g._id ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    {/* Group student list */}
                                    {expandedGroup === g._id && (
                                        <div className="border-t border-[var(--color-border)]">
                                            {g.students.length === 0 ? (
                                                <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No students have attempted tests yet.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-[var(--color-bg-alt)]/50 border-b border-[var(--color-border)]">
                                                                {['Student', 'Attempts', 'Avg Score', 'Pass Rate', 'Best Score', 'Last Attempt'].map(h => (
                                                                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-[var(--color-text-muted)] whitespace-nowrap">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[var(--color-border)]">
                                                            {g.students.map(s => {
                                                                const attempts = s.attempts;
                                                                const avg = s.avgScore;
                                                                const pr = s.passRate;
                                                                const best = attempts ? Math.max(...s.exams.map(e => e.score)) : 0;
                                                                const last = s.exams.length ? new Date(Math.max(...s.exams.map(e => new Date(e.date)))) : null;
                                                                return (
                                                                    <tr key={s.user._id} className="hover:bg-[var(--color-bg-alt)]/40 transition-colors">
                                                                        <td className="py-3 px-4">
                                                                            <div className="flex items-center gap-2.5">
                                                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                                                    {s.user.name?.[0]?.toUpperCase() || '?'}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <p className="font-medium text-[var(--color-text)] truncate text-xs">{s.user.name}</p>
                                                                                    <p className="text-[10px] text-[var(--color-text-muted)] truncate">{s.user.email}</p>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3 px-4 font-semibold text-[var(--color-text)] text-xs">{attempts}</td>
                                                                        <td className="py-3 px-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-12 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                                                                                    <div className={`h-full rounded-full ${scoreBg(avg)}`} style={{ width: `${avg}%` }} />
                                                                                </div>
                                                                                <span className={`text-xs font-bold ${scoreColor(avg)}`}>{avg}%</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3 px-4"><span className={`text-xs font-bold ${scoreColor(pr)}`}>{pr}%</span></td>
                                                                        <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">{best}%</td>
                                                                        <td className="py-3 px-4 text-xs text-[var(--color-text-muted)]">
                                                                            {last ? last.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* ── AI INSIGHTS TAB ── */}
            {activeTab === 'aiInsights' && (
                <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Struggling', count: aiStudents.filter(s => s._overallLevel === 'weak').length, color: 'from-red-400 to-rose-500', icon: TrendingDown },
                            { label: 'Progressing', count: aiStudents.filter(s => s._overallLevel === 'average').length, color: 'from-amber-400 to-orange-500', icon: TrendingUp },
                            { label: 'Excelling', count: aiStudents.filter(s => s._overallLevel === 'strong').length, color: 'from-emerald-400 to-teal-500', icon: Award },
                        ].map(({ label, count, color, icon: Icon }) => (
                            <div key={label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                                    <Icon size={18} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-xl font-extrabold text-[var(--color-text)]">{count}</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input type="text" placeholder="Search student by name or email…" value={aiSearch}
                                onChange={e => setAiSearch(e.target.value)}
                                className="input flex-1 text-sm py-2" />
                            {groupPerformance.length > 0 && (
                                <select
                                    value={aiGroupFilter}
                                    onChange={e => setAiGroupFilter(e.target.value)}
                                    className="input text-sm py-2 w-full sm:w-48 shrink-0"
                                >
                                    <option value="all">All Batches</option>
                                    {groupPerformance.map(g => (
                                        <option key={g._id} value={g._id}>{g.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'weak', 'average', 'strong'].map(f => (
                                <button key={f} onClick={() => setAiFilter(f)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all border ${
                                        aiFilter === f
                                            ? f === 'weak' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                            : f === 'average' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                            : f === 'strong' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                            : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20'
                                            : 'text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-bg-alt)]'
                                    }`}
                                >
                                    {f === 'all' ? 'All Students' : f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Student insight cards */}
                    {filteredAiStudents.length === 0 ? (
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl text-center py-16">
                            <Brain size={36} className="mx-auto mb-3 text-[var(--color-border)]" />
                            <p className="font-semibold text-[var(--color-text)] mb-1">
                                {studentPerformance.length === 0 ? 'No student data yet' : 'No students match your filter'}
                            </p>
                            <p className="text-sm text-[var(--color-text-muted)]">
                                {studentPerformance.length === 0
                                    ? 'Once students attempt your tests, AI will generate performance insights here.'
                                    : 'Try adjusting your search or filter.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {filteredAiStudents.map(s => {
                                const levelColor = s._overallLevel === 'strong'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                    : s._overallLevel === 'average'
                                    ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                    : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
                                const levelLabel = s._overallLevel === 'strong' ? 'Excelling' : s._overallLevel === 'average' ? 'Progressing' : 'Struggling';
                                return (
                                    <div key={s.user._id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                                        {/* Student header */}
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
                                                    <div className={`text-lg font-extrabold ${scoreColor(s._overallAvg)}`}>{s._overallAvg}%</div>
                                                    <div className="text-[10px] text-[var(--color-text-muted)]">Avg Score</div>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${levelColor}`}>{levelLabel}</span>
                                            </div>
                                        </div>

                                        {/* Subject accuracy bars */}
                                        <div className="px-5 py-4 space-y-2.5">
                                            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Subject Performance</p>
                                            {s._subjectPerf.length === 0 ? (
                                                <p className="text-xs text-[var(--color-text-muted)]">No subject data available.</p>
                                            ) : s._subjectPerf.map(sp => (
                                                <div key={sp.subject} className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-[var(--color-text)]">{sp.subject}</span>
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${
                                                                sp.level === 'strong' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                                                : sp.level === 'average' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                                                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
                                                            }`}>{sp.level}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-[var(--color-text-muted)]">{sp.attempts} attempt{sp.attempts !== 1 ? 's' : ''}</span>
                                                            <span className={`text-xs font-bold ${scoreColor(sp.avg)}`}>{sp.avg}%</span>
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
                                                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">AI Recommendation</p>
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
            )}
            </>)}
        </div>
    );
}
