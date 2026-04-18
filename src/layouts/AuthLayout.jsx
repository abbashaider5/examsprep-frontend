import { Award, BarChart2, BookOpen, Moon, ShieldCheck, Sparkles, Sun, Users } from 'lucide-react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store/index.js';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Powered Exam Generation',
    desc: 'Generate unique MCQ exams on any topic in under 10 seconds.',
    color: 'bg-blue-500/10 text-blue-400',
  },
  {
    icon: ShieldCheck,
    title: 'AI Proctoring Built-In',
    desc: 'Face detection, tab monitoring & screenshot capture — no extra tools.',
    color: 'bg-violet-500/10 text-violet-400',
  },
  {
    icon: Award,
    title: 'Verifiable Certificates',
    desc: 'Score 75%+ to earn a PDF certificate with a unique QR code.',
    color: 'bg-amber-500/10 text-amber-400',
  },
  {
    icon: BarChart2,
    title: 'Smart Analytics',
    desc: 'Track your progress and get AI-powered study recommendations.',
    color: 'bg-green-500/10 text-green-400',
  },
  {
    icon: Users,
    title: 'Instructor Tools',
    desc: 'Create exams, invite candidates, and review performance reports.',
    color: 'bg-teal-500/10 text-teal-400',
  },
  {
    icon: BookOpen,
    title: 'Study Mode & Flashcards',
    desc: 'Reinforce learning with interactive flashcards at your own pace.',
    color: 'bg-rose-500/10 text-rose-400',
  },
];

const STATS = [
  { value: '50K+', label: 'Exams Generated' },
  { value: '100%', label: 'Free to Start' },
  { value: '10K+', label: 'Active Learners' },
];

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const { dark, toggle } = useThemeStore();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* ── Left: Form ── */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-[var(--color-primary)]">
            <BookOpen size={24} /> ExamPrep AI
          </Link>
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <Outlet />
      </div>

      {/* ── Right: Feature Panel ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0a1628] to-slate-900">
        {/* Subtle radial glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-center px-12 py-16 w-full">
          {/* Brand */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
              <Sparkles size={12} className="text-blue-400" />
              <span className="text-white/70 text-xs font-medium">AI-Powered Learning Platform</span>
            </div>
            <h2 className="text-3xl font-bold text-white leading-tight mb-3">
              The smartest way to<br />
              <span className="text-blue-400">prepare for any exam</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Generate exams, get proctored, earn verified certificates. Everything you need — free.
            </p>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 mb-10">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 hover:bg-white/[0.06] transition-colors">
                <div className={`w-8 h-8 rounded-lg ${f.color} flex items-center justify-center mb-3`}>
                  <f.icon size={15} />
                </div>
                <p className="text-white/90 text-xs font-semibold mb-1 leading-tight">{f.title}</p>
                <p className="text-white/40 text-[11px] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Footer trust line */}
          <p className="mt-8 text-white/25 text-xs">
            Free forever · No credit card required · Join 10,000+ learners
          </p>
        </div>
      </div>
    </div>
  );
}
