import {
  ArrowRight, Award, BarChart2, BookOpen, Brain, Briefcase,
  Camera, CheckCircle, ChevronRight, Clock, Code2, Crown, FileText,
  GraduationCap, LayoutDashboard, Mail, Monitor,
  PlayCircle, ShieldCheck, Sparkles, Star, Trophy, UserCheck, Users, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI Question Generation',
    desc: 'Generate high-quality MCQs on any topic in seconds using Groq AI. Choose difficulty, subject, and number of questions.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  },
  {
    icon: ShieldCheck,
    title: 'AI Proctoring',
    desc: 'Real-time face detection, tab-switch monitoring, and fullscreen enforcement ensure exam integrity automatically.',
    color: 'bg-red-100 dark:bg-red-900/30 text-red-600',
  },
  {
    icon: Code2,
    title: 'Coding Assessments',
    desc: 'Create coding questions evaluated by AI. Candidates write and run code in a sandboxed browser environment.',
    color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600',
  },
  {
    icon: BarChart2,
    title: 'Smart Analytics',
    desc: 'Track progress over time, identify weak topics, and get personalized AI study recommendations.',
    color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600',
  },
  {
    icon: Trophy,
    title: 'Gamification',
    desc: 'Earn XP, level up, unlock achievement badges, and compete with others on the global leaderboard.',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  },
  {
    icon: Award,
    title: 'Verified Certificates',
    desc: 'Score 75%+ to earn a verifiable PDF certificate with a unique QR code. Share with employers instantly.',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  },
  {
    icon: BookOpen,
    title: 'Study Mode',
    desc: 'Interactive flashcards and review mode to reinforce learning. Flashcard through any exam at your own pace.',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  },
  {
    icon: Users,
    title: 'Instructor Tools',
    desc: 'Create exams, invite candidates by email, control settings per-exam, and view detailed performance reports.',
    color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600',
  },
  {
    icon: Camera,
    title: 'Screenshot Capture',
    desc: 'Automatically capture random webcam snapshots during proctored exams. Evidence stored securely for review.',
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600',
  },
];

const STEPS = [
  {
    num: '01',
    icon: Sparkles,
    title: 'Generate Your Exam',
    desc: 'Enter a subject, pick difficulty and question count. Our AI generates unique, high-quality MCQs in under 10 seconds.',
  },
  {
    num: '02',
    icon: Monitor,
    title: 'Take the Exam',
    desc: 'Complete the timed exam in a secure fullscreen environment. AI proctoring monitors in real-time.',
  },
  {
    num: '03',
    icon: Award,
    title: 'Earn Your Certificate',
    desc: 'Pass with 75%+ to instantly receive a verifiable PDF certificate. Review analytics to improve.',
  },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    title: 'Students',
    desc: 'Prepare for entrance exams, certifications, or competitive tests with AI-generated practice sets tailored to your syllabus.',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  },
  {
    icon: Briefcase,
    title: 'Professionals',
    desc: 'Sharpen your domain expertise, prepare for technical interviews, or earn verifiable certificates to showcase skills.',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600',
  },
  {
    icon: Brain,
    title: 'Instructors & Trainers',
    desc: 'Create and share exams with your students. Track performance, view analytics, and identify who needs support.',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
  },
  {
    icon: FileText,
    title: 'Organizations',
    desc: 'Run proctored assessments at scale. Issue branded certificates and maintain complete audit trails.',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
  },
];

const BENEFITS = [
  { text: 'No setup required — start in 30 seconds', icon: Clock },
  { text: 'AI generates unique questions every time', icon: Sparkles },
  { text: 'Tamper-proof certificates with QR verification', icon: Award },
  { text: 'Works on any device — desktop or mobile', icon: Monitor },
  { text: 'Real-time proctoring without external tools', icon: ShieldCheck },
  { text: 'Detailed per-topic accuracy reports', icon: BarChart2 },
];

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    icon: Zap,
    color: 'text-slate-600',
    bg: 'bg-slate-100 dark:bg-slate-800',
    features: ['3 AI exams / month', 'Up to 20 questions/exam', 'Study mode & flashcards', 'Basic analytics', 'PDF certificate on passing'],
  },
  {
    name: 'Pro',
    price: '₹149',
    originalPrice: '₹999',
    period: '/month',
    icon: ShieldCheck,
    color: 'text-[var(--color-primary)]',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    badge: 'Most Popular',
    features: ['10 AI exams / month', 'Up to 50 questions/exam', 'AI proctoring & face detection', 'Screenshot capture', 'Advanced analytics', 'PDF certificates with verification'],
  },
  {
    name: 'Enterprise',
    price: '₹349',
    originalPrice: '₹2500',
    period: '/month',
    icon: Crown,
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    features: ['30 AI exams / month', 'Up to 100 questions/exam', 'AI proctoring & face detection', 'Coding questions with AI evaluation', 'Full analytics suite', 'Priority support'],
  },
];

const STATS = [
  { value: '50K+', label: 'Exams Generated', icon: Sparkles },
  { value: '10K+', label: 'Students', icon: Users },
  { value: '95%', label: 'Satisfaction Rate', icon: Star },
  { value: '200+', label: 'Subjects Covered', icon: BookOpen },
];

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="bg-[var(--color-bg)]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5 pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <Sparkles size={13} />
              Powered by Groq AI — Blazing-Fast LLM Inference
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[var(--color-text)] mb-6 leading-tight tracking-tight">
              The Smartest Way to<br />
              <span className="text-[var(--color-primary)]">Prepare for Any Exam</span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--color-text-muted)] mb-10 max-w-2xl mx-auto leading-relaxed">
              Generate AI-powered MCQ exams in seconds. Take proctored tests. Earn verifiable certificates. Improve with intelligent analytics — all in one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link
                to={isAuthenticated ? '/create-exam' : '/signup'}
                className="btn-primary px-8 py-3.5 text-base font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
              >
                <Sparkles size={18} />
                {isAuthenticated ? 'Generate Exam Now' : 'Start for Free'}
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/pricing"
                className="border border-[var(--color-border)] px-8 py-3.5 text-base font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-[var(--color-bg-alt)] hover:border-[var(--color-primary)] transition-all text-[var(--color-text)]"
              >
                <Crown size={16} />
                View Plans & Pricing
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Free forever — no credit card</span>
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Generate exam in 10 seconds</span>
              <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Verifiable PDF certificates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <s.icon size={18} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <div className="text-xl font-bold text-[var(--color-text)]">{s.value}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <PlayCircle size={13} /> Simple Process
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">From zero to certified in 3 steps</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">No complex setup. No waiting. Start practicing and earning certificates today.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%_-_24px)] w-12 border-t-2 border-dashed border-[var(--color-border)] z-10" />
                )}
                <div className="card h-full hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-[var(--color-primary)] rounded-xl flex items-center justify-center shrink-0">
                      <step.icon size={22} className="text-white" />
                    </div>
                    <span className="text-3xl font-black text-[var(--color-border)]">{step.num}</span>
                  </div>
                  <h3 className="font-bold text-[var(--color-text)] mb-2">{step.title}</h3>
                  <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Everything you need to succeed</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">A complete exam preparation platform built for serious learners and organisations.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card hover:shadow-md transition-shadow group">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon size={20} />
                </div>
                <h3 className="font-bold text-[var(--color-text)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instructor Tools highlight ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
                <UserCheck size={13} /> For Instructors & Trainers
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text)] mb-4">Complete exam management for instructors</h2>
              <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed">
                Create exams, invite candidates by email, control what they see, and monitor performance in real-time — all from one dashboard.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  ['Create and share exams with candidates via email invite', Mail],
                  ['Control reattempt, flashcards, review & certificate per exam', ShieldCheck],
                  ['View per-candidate score, attempt time & answers', BarChart2],
                  ['Proctored exam screenshots reviewed in instructor dashboard', Camera],
                  ['Coding assessments with auto AI evaluation', Code2],
                ].map(([text, Icon]) => (
                  <li key={text} className="flex items-center gap-2.5 text-sm text-[var(--color-text-muted)]">
                    <Icon size={15} className="text-teal-500 shrink-0" />
                    {text}
                  </li>
                ))}
              </ul>
              <Link to={isAuthenticated ? '/instructor' : '/signup'} className="btn-primary px-6 py-3 inline-flex items-center gap-2 font-semibold rounded-xl">
                <LayoutDashboard size={16} /> {isAuthenticated ? 'Instructor Dashboard' : 'Start as Instructor'}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Exam Created', value: 'Python Fundamentals', badge: '12 candidates', color: 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800' },
                { label: 'Avg Score', value: '82%', badge: 'Pass rate: 91%', color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' },
                { label: 'Invites Sent', value: '12', badge: '11 attempted', color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' },
                { label: 'Certificates', value: '10', badge: 'Auto-issued', color: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' },
              ].map(item => (
                <div key={item.label} className={`card border ${item.color}`}>
                  <p className="text-xs text-[var(--color-text-muted)] mb-1">{item.label}</p>
                  <p className="text-xl font-bold text-[var(--color-text)]">{item.value}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{item.badge}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Proctoring highlight ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 p-8 sm:p-12 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                  <ShieldCheck size={13} /> Enterprise-Grade Proctoring
                </div>
                <h2 className="text-3xl font-bold mb-4">Exam integrity you can trust</h2>
                <p className="text-slate-300 text-base leading-relaxed mb-6">
                  Our AI proctoring uses real-time webcam analysis, tab monitoring, and keyboard blocking — no external software needed. Violations are logged and emailed automatically.
                </p>
                <ul className="space-y-3">
                  {[
                    ['Real-time face detection — detects multiple people', CheckCircle],
                    ['Fullscreen enforcement with violation tracking', CheckCircle],
                    ['Tab-switch and window-blur monitoring', CheckCircle],
                    ['Auto-submit after 3 violations + email alert', CheckCircle],
                    ['AI Proctored badge printed on certificate', CheckCircle],
                  ].map(([item, Icon]) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Icon size={15} className="text-green-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Mock proctoring UI card */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs text-slate-400 font-mono tracking-wider">PROCTORING ACTIVE</span>
                </div>
                <div className="space-y-0.5 text-sm">
                  {[
                    { label: 'Face Detected', status: 'Confirmed', ok: true },
                    { label: 'Tab Monitoring', status: 'Active', ok: true },
                    { label: 'Fullscreen', status: 'Enforced', ok: true },
                    { label: 'Copy / Paste', status: 'Blocked', ok: true },
                    { label: 'Violations', status: '0 / 3', ok: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-0">
                      <span className="text-slate-300">{item.label}</span>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${item.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use Cases ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Built for every learner</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">Whether you're a student, professional, instructor, or organisation — ExamPrep AI scales to your needs.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="card hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${uc.color} flex items-center justify-center mb-4`}>
                  <uc.icon size={20} />
                </div>
                <h3 className="font-bold text-[var(--color-text)] mb-2">{uc.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
                <CheckCircle size={13} /> Why choose ExamPrep AI
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text)] mb-4">All the tools. Zero friction.</h2>
              <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed">
                We built ExamPrep AI to eliminate the gap between knowledge and certification. Everything you need is in one platform, designed to get out of your way.
              </p>
              <Link
                to={isAuthenticated ? '/create-exam' : '/signup'}
                className="btn-primary px-6 py-3 inline-flex items-center gap-2 font-semibold rounded-xl"
              >
                <Sparkles size={16} />
                {isAuthenticated ? 'Start Generating' : 'Get Started Free'}
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BENEFITS.map((b) => (
                <div key={b.text} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0">
                    <b.icon size={15} className="text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-[var(--color-text)] leading-snug">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Simple, transparent pricing</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">Start free, upgrade when you need more. Cancel any time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`card relative flex flex-col ${plan.badge ? 'border-[var(--color-primary)] border-2 shadow-lg' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-full">{plan.badge}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-9 h-9 rounded-xl ${plan.bg} flex items-center justify-center`}>
                    <plan.icon size={18} className={plan.color} />
                  </div>
                  <span className="font-bold text-[var(--color-text)]">{plan.name}</span>
                </div>
                <div className="mb-5">
                  {plan.originalPrice && <div className="text-xs text-[var(--color-text-muted)] line-through">{plan.originalPrice}/month</div>}
                  <span className="text-3xl font-bold text-[var(--color-text)]">{plan.price}</span>
                  <span className="text-[var(--color-text-muted)] text-sm ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                      <CheckCircle size={14} className="text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={isAuthenticated ? '/pricing' : '/signup'}
                  className={`text-center text-sm font-semibold py-2.5 rounded-xl transition-all ${plan.badge ? 'btn-primary' : 'border border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)] hover:text-[var(--color-primary)]'}`}
                >
                  {plan.name === 'Free' ? 'Get Started' : 'Subscribe'}
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-[var(--color-primary)] text-sm font-medium hover:underline inline-flex items-center gap-1">
              View full plan comparison <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text)] mb-4">
            Ready to ace your next exam?
          </h2>
          <p className="text-[var(--color-text-muted)] mb-8 text-lg max-w-xl mx-auto">
            Join thousands of learners who generate exams, earn certificates, and track their growth — all for free.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={isAuthenticated ? '/create-exam' : '/signup'}
              className="btn-primary px-10 py-4 text-base font-semibold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-blue-500/20"
            >
              <Sparkles size={18} />
              {isAuthenticated ? 'Create Exam Now' : 'Start Free Today'}
              <ArrowRight size={18} />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/pricing"
                className="border border-[var(--color-border)] px-8 py-4 text-base font-medium rounded-xl inline-flex items-center gap-2 hover:bg-[var(--color-bg-alt)] transition-all text-[var(--color-text)]"
              >
                View Pricing
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
