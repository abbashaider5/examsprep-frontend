import {
  ArrowRight, Award, BarChart2, BookOpen, Brain, Briefcase,
  Camera, Check, CheckCircle, ChevronRight, Clock, Code2, Crown, FileText,
  GraduationCap, LayoutDashboard, Mail, Monitor,
  PlayCircle, ShieldCheck, Sparkles, Star, Trophy, UserCheck, Users
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { PLANS } from './PricingPage.jsx';

// Screenshot imports — Vite hashes these filenames for automatic cache-busting
import ssDashboard from '../assets/screenshots/dashboard-for-instructor-or-user-also-show-ai-recommendation-based-on-previous-exams.png';
import ssStudy from '../assets/screenshots/flashcards-reviews.png';
import ssInstructor from '../assets/screenshots/instructor-can-invite-others-or-can-attempt-exams-himself.png';
import ssReport from '../assets/screenshots/instructor-will-check-the-report-of-all-inviteds-users.png';
import ssCreate from '../assets/screenshots/user-or-instructor-will-create-exams-here.png';
import ssAnalytics from '../assets/screenshots/user-performance.png';

const FEATURES = [
  { icon: Sparkles, title: 'AI Question Generation', desc: 'Generate high-quality MCQs on any topic in seconds using advanced AI. Choose difficulty, subject, and number of questions.', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  { icon: ShieldCheck, title: 'AI Proctoring', desc: 'Real-time face detection, tab-switch monitoring, and fullscreen enforcement ensure exam integrity automatically.', color: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  { icon: Code2, title: 'Coding Assessments', desc: 'Create coding questions evaluated by AI. Candidates write and run code in a sandboxed browser environment.', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' },
  { icon: BarChart2, title: 'Smart Analytics', desc: 'Track progress over time, identify weak topics, and get personalized AI study recommendations.', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
  { icon: Trophy, title: 'Gamification', desc: 'Earn XP, level up, unlock achievement badges, and compete with others on the global leaderboard.', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
  { icon: Award, title: 'Verified Certificates', desc: 'Score 75%+ to earn a verifiable PDF certificate with a unique QR code. Share with employers instantly.', color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  { icon: BookOpen, title: 'Study Mode', desc: 'Interactive flashcards and review mode to reinforce learning. Flashcard through any exam at your own pace.', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  { icon: Users, title: 'Instructor Tools', desc: 'Create exams, invite candidates by email, control settings per-exam, and view detailed performance reports.', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' },
  { icon: Camera, title: 'Screenshot Capture', desc: 'Automatically capture random webcam snapshots during proctored exams. Evidence stored securely for review.', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
];

const STEPS = [
  { num: '01', icon: Sparkles, title: 'Generate Your Exam', desc: 'Enter a subject, pick difficulty and question count. Our AI generates unique, high-quality MCQs in under 10 seconds.' },
  { num: '02', icon: Monitor, title: 'Take the Exam', desc: 'Complete the timed exam in a secure fullscreen environment. AI proctoring monitors in real-time.' },
  { num: '03', icon: Award, title: 'Earn Your Certificate', desc: 'Pass with 75%+ to instantly receive a verifiable PDF certificate. Review analytics to improve.' },
];

const USE_CASES = [
  { icon: GraduationCap, title: 'Students', desc: 'Prepare for entrance exams, certifications, or competitive tests with AI-generated practice sets tailored to your syllabus.', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  { icon: Briefcase, title: 'Professionals', desc: 'Sharpen your domain expertise, prepare for technical interviews, or earn verifiable certificates to showcase skills.', color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  { icon: Brain, title: 'Instructors & Trainers', desc: 'Create and share exams with your students. Track performance, view analytics, and identify who needs support.', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  { icon: FileText, title: 'Organizations', desc: 'Run proctored assessments at scale. Issue branded certificates and maintain complete audit trails.', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
];

const BENEFITS = [
  { text: 'No setup required — start in 30 seconds', icon: Clock },
  { text: 'AI generates unique questions every time', icon: Sparkles },
  { text: 'Tamper-proof certificates with QR verification', icon: Award },
  { text: 'Works on any device — desktop or mobile', icon: Monitor },
  { text: 'Real-time proctoring without external tools', icon: ShieldCheck },
  { text: 'Detailed per-topic accuracy reports', icon: BarChart2 },
];

const STATS = [
  { value: '50K+', label: 'Exams Generated', icon: Sparkles },
  { value: '10K+', label: 'Students', icon: Users },
  { value: '95%', label: 'Satisfaction Rate', icon: Star },
  { value: '200+', label: 'Subjects Covered', icon: BookOpen },
];

const DEMO_SCREENSHOTS = [
  {
    src: ssCreate,
    tag: 'AI Exam Creator',
    accentColor: 'blue',
    tabBg: 'bg-blue-500',
    heading: 'Create any exam in seconds',
    desc: 'Type a subject, pick how many questions, choose difficulty — and AI writes the entire exam for you. No manual work needed.',
    bullets: ['Works for any subject or topic', 'MCQ and coding questions supported', 'Instant generation — under 10 seconds'],
  },
  {
    src: ssDashboard,
    tag: 'Smart Dashboard',
    accentColor: 'indigo',
    tabBg: 'bg-indigo-500',
    heading: 'Know exactly where you stand',
    desc: 'Your dashboard shows all recent exams, scores, XP earned, and streaks — plus AI-powered study tips based on your weakest topics.',
    bullets: ['AI recommends what to study next', 'Track streaks and level progress', 'See all past results at a glance'],
  },
  {
    src: ssStudy,
    tag: 'Flashcards',
    accentColor: 'purple',
    tabBg: 'bg-purple-500',
    heading: 'Study smarter with flashcards',
    desc: 'Every exam becomes a study set. Flip through questions as flashcards, review answers, and repeat until you have mastered the topic.',
    bullets: ['Flashcard mode for every exam', 'Attempt, reattempt, or just review', 'Works on any device'],
  },
  {
    src: ssInstructor,
    tag: 'Instructor Tools',
    accentColor: 'teal',
    tabBg: 'bg-teal-500',
    heading: 'Invite candidates effortlessly',
    desc: 'As an instructor you can create exams, invite candidates by email, set exam controls, and attempt exams yourself.',
    bullets: ['Email-based invite system', 'Per-exam settings & proctoring controls', 'Take exams yourself before sending'],
  },
  {
    src: ssReport,
    tag: 'Reports',
    accentColor: 'rose',
    tabBg: 'bg-rose-500',
    heading: 'See how every candidate performed',
    desc: 'Get a full breakdown — who attempted, what they scored, how long they took, and which questions they got wrong.',
    bullets: ['Per-candidate score and time', 'Question-level accuracy breakdown', 'Proctoring screenshots included'],
  },
  {
    src: ssAnalytics,
    tag: 'Your Analytics',
    accentColor: 'amber',
    tabBg: 'bg-amber-500',
    heading: 'Track your progress over time',
    desc: "See your personal performance analytics — topic accuracy, exam history, XP growth, and AI-powered recommendations.",
    bullets: ['Accuracy per topic over time', 'AI study recommendations', 'Full exam history at a glance'],
  },
];

// ── Tabbed Screenshot Showcase ────────────────────────────────────────────────
function ScreenshotShowcase() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const intervalRef = useRef(null);
  const ss = DEMO_SCREENSHOTS[active];

  const goTo = (idx) => {
    if (idx === active) return;
    setFading(true);
    setTimeout(() => { setActive(idx); setFading(false); }, 200);
  };

  // Auto-advance every 5s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive(i => (i + 1) % DEMO_SCREENSHOTS.length);
        setFading(false);
      }, 200);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const resetTimer = (idx) => {
    clearInterval(intervalRef.current);
    goTo(idx);
    intervalRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setActive(i => (i + 1) % DEMO_SCREENSHOTS.length);
        setFading(false);
      }, 200);
    }, 5000);
  };

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Soft gradient background */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--color-bg)] via-indigo-50/30 to-[var(--color-bg)] dark:via-indigo-900/8" />
      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            <Monitor size={13} /> Product Preview
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">See it in action</h2>
          <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">A clean, modern interface built for real use — from exam creation to analytics.</p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {DEMO_SCREENSHOTS.map((s, i) => (
            <button
              key={i}
              onClick={() => resetTimer(i)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 border ${
                active === i
                  ? `${s.tabBg} text-white border-transparent shadow-lg scale-105`
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {s.tag}
            </button>
          ))}
        </div>

        {/* Main preview area */}
        <div className={`transition-opacity duration-200 ${fading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-center">
            {/* Info panel */}
            <div className="order-2 lg:order-1">
              <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full mb-4 bg-${ss.accentColor}-100 dark:bg-${ss.accentColor}-900/30 text-${ss.accentColor}-600 dark:text-${ss.accentColor}-400`}>
                {ss.tag}
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text)] mb-3 leading-snug">{ss.heading}</h3>
              <p className="text-[var(--color-text-muted)] text-sm leading-relaxed mb-5">{ss.desc}</p>
              <ul className="space-y-2.5">
                {ss.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
                    <CheckCircle size={14} className={`text-${ss.accentColor}-500 shrink-0`} />
                    {b}
                  </li>
                ))}
              </ul>
              {/* Dot progress */}
              <div className="flex gap-1.5 mt-8">
                {DEMO_SCREENSHOTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => resetTimer(i)}
                    className={`rounded-full transition-all duration-300 ${i === active ? 'w-6 h-2 bg-[var(--color-primary)]' : 'w-2 h-2 bg-[var(--color-border)] hover:bg-[var(--color-primary)]/50'}`}
                  />
                ))}
              </div>
            </div>

            {/* Screenshot */}
            <div className="order-1 lg:order-2">
              <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl shadow-black/10">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[var(--color-bg-alt)] border-b border-[var(--color-border)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  <div className="flex-1 mx-3">
                    <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2.5 py-0.5 text-[10px] text-[var(--color-text-muted)] font-mono">
                      exams.abbaslogic.com
                    </div>
                  </div>
                </div>
                <img
                  src={ss.src}
                  alt={ss.heading}
                  className="w-full object-cover object-top"
                  loading="lazy"
                  style={{ maxHeight: '420px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="bg-[var(--color-bg)]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-blue-100/60 via-indigo-50/30 to-transparent dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 left-0 w-72 h-72 bg-violet-100/40 dark:bg-violet-900/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-80 h-80 bg-blue-100/40 dark:bg-blue-900/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-sm">
              <Sparkles size={12} />
              Powered by Advanced AI — Fast & Accurate
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-extrabold text-[var(--color-text)] mb-6 leading-[1.12] tracking-tight">
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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-50/60 dark:bg-blue-900/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-indigo-50/50 dark:bg-indigo-900/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <PlayCircle size={13} /> Simple Process
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">From zero to certified in 3 steps</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">No complex setup. No waiting. Start practicing and earning certificates today.</p>
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

      {/* ── Screenshots Showcase ── */}
      <ScreenshotShowcase />

      {/* ── Features ── */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[var(--color-surface)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-radial from-blue-50/40 via-indigo-50/20 to-transparent dark:from-blue-900/8 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Sparkles size={13} /> Full Feature Set
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Everything you need to succeed</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">A complete exam preparation platform built for serious learners and organisations.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card hover:shadow-md transition-all hover:-translate-y-0.5 group">
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
              <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed text-sm">
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
                <div key={item.label} className={`card border ${item.color} hover:shadow-sm transition-shadow`}>
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
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 dark:from-slate-700 dark:to-slate-800 p-8 sm:p-12 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/10 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
                  <ShieldCheck size={13} /> Enterprise-Grade Proctoring
                </div>
                <h2 className="text-3xl font-bold mb-4">Exam integrity you can trust</h2>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Our AI proctoring uses real-time webcam analysis, tab monitoring, and keyboard blocking — no external software needed. Violations are logged and emailed automatically.
                </p>
                <ul className="space-y-3">
                  {[
                    'Real-time face detection — detects multiple people',
                    'Fullscreen enforcement with violation tracking',
                    'Tab-switch and window-blur monitoring',
                    'Auto-submit after 3 violations + email alert',
                    'AI Proctored badge printed on certificate',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <CheckCircle size={15} className="text-green-400 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-50/40 dark:bg-violet-900/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50/40 dark:bg-blue-900/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Users size={13} /> Who It's For
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Built for every learner</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">Whether you're a student, professional, instructor, or organisation — ExamPrep AI scales to your needs.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {USE_CASES.map((uc) => (
              <div key={uc.title} className="card hover:shadow-md transition-all hover:-translate-y-0.5">
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
                <CheckCircle size={13} /> Why choose ExamPrep AI
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text)] mb-4">All the tools. Zero friction.</h2>
              <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed text-sm">
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
                <div key={b.text} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] hover:border-green-300 dark:hover:border-green-700 transition-colors">
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
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial from-blue-50/50 via-indigo-50/20 to-transparent dark:from-blue-900/10 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Crown size={13} /> Pricing
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Simple, transparent pricing</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">Start free, upgrade when you need more. Cancel any time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border-2 p-8 transition-all ${plan.borderColor} ${plan.badge ? 'shadow-xl scale-[1.02]' : 'shadow-sm hover:shadow-md'} bg-[var(--color-surface)]`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-full shadow">{plan.badge}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl ${plan.bgColor} flex items-center justify-center`}>
                      <Icon size={20} className={plan.color} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text)] text-lg">{plan.name}</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">{plan.testsPerMonth} exams · {plan.maxQuestions} questions max</p>
                    </div>
                  </div>
                  <div className="mb-6">
                    {plan.originalPrice && (
                      <div className="text-sm text-[var(--color-text-muted)] line-through mb-0.5">₹{plan.originalPrice}/month</div>
                    )}
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-[var(--color-text)]">{plan.price === 0 ? 'Free' : `₹${plan.price}`}</span>
                      {plan.price > 0 && <span className="text-[var(--color-text-muted)] text-sm mb-1.5">/month</span>}
                    </div>
                    {plan.originalPrice && (
                      <div className="mt-1 inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Save {Math.round((1 - plan.price / plan.originalPrice) * 100)}% — Limited time
                      </div>
                    )}
                  </div>
                  <Link
                    to={isAuthenticated ? '/pricing' : '/signup'}
                    className={`w-full py-3 rounded-xl font-semibold text-sm text-center transition-all flex items-center justify-center gap-2 mb-6 ${
                      plan.badge
                        ? 'btn-primary hover:opacity-90'
                        : 'border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--color-text)]'
                    }`}
                  >
                    {plan.price === 0 ? 'Get Started Free' : `Upgrade to ${plan.name}`}
                  </Link>
                  <div className="border-t border-[var(--color-border)] mb-5" />
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check size={15} className="text-green-500 mt-0.5 shrink-0" />
                        <span className="text-[var(--color-text)]">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-[var(--color-primary)] text-sm font-medium hover:underline inline-flex items-center gap-1">
              View full plan comparison <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-radial from-blue-100/50 via-indigo-50/20 to-transparent dark:from-blue-900/15 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)] to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
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
