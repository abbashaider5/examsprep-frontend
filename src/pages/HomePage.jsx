import {
  ArrowRight, Award, BarChart2, BookOpen, Brain, Briefcase,
  Camera,
  CheckCircle,
  Clock, Code2, Crown,
  GraduationCap, LayoutDashboard,
  Monitor,
  ShieldCheck, Sparkles, Star,
  Target,
  TrendingUp,
  UserCheck, Users, Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';

// Screenshot imports — Vite hashes these filenames for automatic cache-busting
import ss1 from '../assets/screenshots/demo-screenshots/1.png';
import ss2 from '../assets/screenshots/demo-screenshots/2.png';
import ss3 from '../assets/screenshots/demo-screenshots/3.png';
import ss4 from '../assets/screenshots/demo-screenshots/4.png';
import ss5 from '../assets/screenshots/demo-screenshots/5.png';
import ss6 from '../assets/screenshots/demo-screenshots/6.png';
import ss7 from '../assets/screenshots/demo-screenshots/7.png';
import ss8 from '../assets/screenshots/demo-screenshots/8.png';

const FEATURES = [
  { icon: Sparkles, title: 'AI Test Generator', desc: 'Automatically generate high-quality questions by subject, difficulty, and topic — MCQ and coding questions with built-in compiler. Done in seconds.', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  { icon: ShieldCheck, title: 'AI Proctoring & Monitoring', desc: 'Webcam-based monitoring, tab-switch detection, violation tracking, and random photo capture. You control whether proctoring is enabled per test.', color: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  { icon: BarChart2, title: 'Student Performance Tracking', desc: 'See how every student performs across each test. Track accuracy, score trends, attempt history, and time analysis — per student and per test.', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' },
  { icon: Users, title: 'Batch Management', desc: 'Create batches, add or remove students, and assign tests to entire groups at once. Manage all your students from one place.', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' },
  { icon: Brain, title: 'AI Recommendations', desc: 'Our AI analyzes your students\' recent test performance and identifies strong topics, weak areas, and suggests what they should focus on next.', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600' },
  { icon: Code2, title: 'Coding Assessments', desc: 'Create coding questions evaluated by AI. Candidates write and run code in a sandboxed browser environment — no setup needed.', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  { icon: Award, title: 'Certificates & Verification', desc: 'Auto-generate branded PDF certificates for passing students. QR-code based verification so anyone can confirm authenticity instantly.', color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  { icon: Clock, title: 'Test Expiry Control', desc: 'Set expiry date/time or lifetime availability. Tests automatically become inaccessible after expiry — no manual intervention needed.', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
  { icon: Camera, title: 'Screenshot Evidence', desc: 'Randomly capture webcam snapshots during proctored exams. Evidence stored securely for instructor review to ensure exam integrity.', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' },
];

const INSTRUCTOR_CONTROLS = [
  { label: 'Reattempt', desc: 'Allow or block retakes' },
  { label: 'Answer Review', desc: 'Show answers after exam' },
  { label: 'Certificates', desc: 'Auto-issue on pass' },
  { label: 'AI Proctoring', desc: 'Enable per test' },
  { label: 'Expiry Date', desc: 'Date/time or lifetime' },
  { label: 'Passing Score', desc: 'Set your own threshold' },
];

const HOW_HELPS = [
  { icon: TrendingUp, title: 'Understand student strengths & weaknesses', desc: 'Topic-wise accuracy and weak area detection across every student in your batches.', color: 'text-teal-600' },
  { icon: Clock, title: 'Save time with automated evaluation', desc: 'AI grades every exam instantly — MCQ and coding questions included. No manual work.', color: 'text-blue-600' },
  { icon: ShieldCheck, title: 'Ensure fair exams with AI proctoring', desc: 'Detect violations, capture evidence, and maintain complete integrity without external tools.', color: 'text-red-600' },
  { icon: Target, title: 'Make data-driven teaching decisions', desc: 'Real reports tell you exactly who needs help and on what — before it\'s too late.', color: 'text-indigo-600' },
  { icon: BarChart2, title: 'Improve overall student performance', desc: 'Track trends over time. AI recommendations tell students what to practice next.', color: 'text-violet-600' },
  { icon: Zap, title: 'Scale evaluation effortlessly', desc: 'Run assessments for 5 or 500 students with the same effort. Batch invites in one click.', color: 'text-amber-600' },
];

const WHO_FOR = [
  { icon: UserCheck, title: 'Instructors & Trainers', desc: 'Create and manage assessments for your students. Track individual performance, issue certificates, and improve outcomes using AI insights.', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' },
  { icon: GraduationCap, title: 'Coaching Institutes', desc: 'Run batch-level assessments, manage multiple student groups, and get institute-wide performance reports with proctored exam support.', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  { icon: Briefcase, title: 'HR & L&D Teams', desc: 'Screen candidates, run skill assessments, and evaluate employee training outcomes. Proctored tests with verified certificates.', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  { icon: Crown, title: 'Organizations & Enterprises', desc: 'Deploy assessments at scale. Full audit trails, proctoring violations log, and branded certificates. SSO and enterprise plans available.', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
];

const STATS = [
  { value: '50K+', label: 'Tests Generated', icon: Sparkles },
  { value: '10K+', label: 'Students Managed', icon: Users },
  { value: '95%', label: 'Satisfaction Rate', icon: Star },
  { value: '200+', label: 'Subjects Covered', icon: BookOpen },
];

const DEMO_SCREENSHOTS = [
  {
    src: ss7,
    tag: 'Dashboard',
    accentColor: 'teal',
    tabBg: 'bg-teal-500',
    heading: 'Your complete instructor control panel',
    desc: 'See score trends, AI-powered study recommendations, and a full overview of student activity — all from a clean, modern dashboard built for real instructor workflows.',
    bullets: ['At-a-glance stats for all your tests', 'AI recommendation engine per student', 'Score trend chart across recent tests'],
  },
  {
    src: ss6,
    tag: 'My Tests',
    accentColor: 'blue',
    tabBg: 'bg-blue-500',
    heading: 'Manage and assign all your tests',
    desc: 'Browse every test you\'ve created. See attempts, accuracy, batch assignments, and expiry status. One-click invite for email or batch.',
    bullets: ['Filter by subject, difficulty, or status', 'Expired and proctored indicators on cards', 'Batch and email invite from same view'],
  },
  {
    src: ss5,
    tag: 'AI Test Creator',
    accentColor: 'violet',
    tabBg: 'bg-violet-500',
    heading: 'Create any test in seconds with AI',
    desc: 'Type a subject, pick how many questions, choose difficulty — AI writes the entire test for you. Includes MCQ and coding questions with built-in proctoring controls.',
    bullets: ['Works for any subject or topic', 'MCQ and coding questions supported', 'Advanced settings: proctoring, certificates, passing score'],
  },
  {
    src: ss3,
    tag: 'Reports',
    accentColor: 'rose',
    tabBg: 'bg-rose-500',
    heading: 'Deep analytics across all your tests',
    desc: 'Track pass vs fail rates, attempts over 30 days, avg scores per test, and performance by subject — all in one analytics dashboard.',
    bullets: ['Pass vs fail doughnut with trends', 'Attempts over last 30 days chart', 'Performance breakdown by subject'],
  },
  {
    src: ss1,
    tag: 'AI Insights',
    accentColor: 'indigo',
    tabBg: 'bg-indigo-500',
    heading: 'AI-powered student recommendations',
    desc: 'The platform analyzes test performance for each student and pinpoints exactly what they need to improve — by subject, weak area, and difficulty.',
    bullets: ['Topic-wise accuracy per student', 'Struggling / Progressing / Excelling labels', 'Personalized AI recommendation per student'],
  },
  {
    src: ss2,
    tag: 'Certificates',
    accentColor: 'amber',
    tabBg: 'bg-amber-500',
    heading: 'Auto-issue branded certificates on pass',
    desc: 'Every passing student automatically receives a PDF certificate. View all student certificates from one place — filterable and linked to exam reports.',
    bullets: ['Auto-generated on every pass', 'See all student certificates in one view', 'QR-code based public verification'],
  },
  {
    src: ss4,
    tag: 'Batches',
    accentColor: 'emerald',
    tabBg: 'bg-emerald-500',
    heading: 'Manage student groups effortlessly',
    desc: 'Create batches, add students, and share tests to entire groups with one action. Track attempt status, expiry, and reattempt settings per test.',
    bullets: ['One-click batch test assignment', 'Per-test attempt and expiry status', 'Chat and member management built in'],
  },
  {
    src: ss8,
    tag: 'Exam Interface',
    accentColor: 'purple',
    tabBg: 'bg-purple-500',
    heading: 'A clean, focused exam experience',
    desc: 'Students get a distraction-free exam interface with built-in timer, question navigation, and flagging — ensuring integrity and ease of use on any device.',
    bullets: ['Timed exam with auto-submit', 'Question navigator and flag for review', 'Works on any device — no install needed'],
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
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--color-bg)] via-indigo-50/30 to-[var(--color-bg)] dark:via-indigo-900/8" />
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            <Monitor size={13} /> Platform Preview
          </div>
          <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">See your dashboard in action</h2>
          <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">A clean, modern interface built for real instructor workflows — from test creation to deep analytics.</p>
        </div>

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

        <div className={`transition-opacity duration-200 ${fading ? 'opacity-0' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 items-center">
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

            <div className="order-1 lg:order-2">
              <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-2xl shadow-black/10">
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
  const { isAuthenticated, user } = useAuthStore();
  const isInstructor = user?.role === 'instructor';

  return (
    <div className="bg-[var(--color-bg)]">

      {/* ── Hero: Instructor-First ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-teal-100/50 via-cyan-50/25 to-transparent dark:from-teal-900/15 dark:via-cyan-900/8 dark:to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 left-0 w-72 h-72 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-0 w-80 h-80 bg-teal-100/30 dark:bg-teal-900/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 shadow-sm">
              <Sparkles size={12} /> AI-Powered Instructor Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-[var(--color-text)] mb-5 leading-[1.12] tracking-tight">
              Create, Manage & Analyze Tests<br />
              <span className="text-[var(--color-primary)]">All in One Instructor Platform</span>
            </h1>
            <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto leading-relaxed">
              Create exams in seconds using AI, manage batches, and track how your students perform with detailed analytics and smart recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link
                to={isAuthenticated ? '/create-exam' : '/signup?role=instructor'}
                className="btn-primary px-7 py-3.5 flex items-center justify-center gap-2 font-semibold rounded-xl shadow-lg shadow-teal-500/20 text-base"
              >
                <Sparkles size={18} /> Create Your First Test
              </Link>
              <Link
                to={isAuthenticated ? '/instructor-dashboard' : '/signup?role=instructor'}
                className="btn-secondary px-7 py-3.5 flex items-center justify-center gap-2 font-semibold rounded-xl text-base"
              >
                <LayoutDashboard size={18} /> View Dashboard
              </Link>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-xs text-[var(--color-text-muted)] mb-10">
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> No setup required</span>
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Exam in 10 seconds</span>
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> AI proctoring built-in</span>
            <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Verifiable certificates</span>
          </div>

          {/* Core value props — 3 cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { icon: Users, title: 'Manage all your students from one place', desc: 'Create batches, assign tests, track who attempted, who passed, and who needs support.', color: 'from-teal-400 to-cyan-500' },
              { icon: BarChart2, title: 'Track performance with real data', desc: 'Per-student analytics, topic-wise accuracy, score trends, and time analysis on every test.', color: 'from-blue-400 to-indigo-500' },
              { icon: Brain, title: 'Improve results using AI insights', desc: 'AI identifies weak areas for each student and suggests what they should focus on next.', color: 'from-violet-400 to-purple-500' },
            ].map(item => (
              <div key={item.title} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-sm`}>
                  <item.icon size={20} className="text-white" />
                </div>
                <h3 className="font-bold text-[var(--color-text)] mb-2 text-sm leading-snug">{item.title}</h3>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div> */}

          {/* Student join note */}
          {/* <div className="text-center mt-8">
            <p className="text-xs text-[var(--color-text-muted)]">
              <CheckCircle size={12} className="inline mr-1 text-green-500" />
              Your students join <strong className="text-[var(--color-text)]">completely free</strong> — they take your tests, earn certificates, and never pay a thing.
            </p>
          </div> */}
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

      {/* ── How It Works — Instructor Flow ── */}
      {/* <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-teal-50/60 dark:bg-teal-900/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-50/50 dark:bg-blue-900/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <PlayCircle size={13} /> How It Works
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Up and running in minutes</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">From zero to running a proctored exam for your entire batch — no setup, no infrastructure.</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/10 dark:to-cyan-900/10 rounded-2xl border border-teal-200 dark:border-teal-800 p-8 md:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { num: '1', title: 'Choose a Plan', desc: 'Pick Pro or Enterprise based on your exam volume. No setup or infrastructure required — start immediately.' },
                  { num: '2', title: 'Generate Your Test', desc: 'Enter a topic, pick difficulty and question count. AI writes the entire test in under 10 seconds. Edit questions if needed.' },
                  { num: '3', title: 'Invite Your Students', desc: 'Send invites by email or assign an entire batch. Set proctoring, time limits, expiry, and per-exam settings.' },
                  { num: '4', title: 'View Analytics & Reports', desc: 'See who attempted, scores, time taken, per-question accuracy, AI recommendations, and proctoring screenshots.' },
                ].map((s) => (
                  <div key={s.num} className="flex gap-4">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-sm">{s.num}</div>
                    <div>
                      <p className="font-semibold text-sm text-[var(--color-text)]">{s.title}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to={isAuthenticated ? '/create-exam' : '/signup?role=instructor'} className="btn-primary px-6 py-3 flex items-center justify-center gap-2 font-semibold rounded-xl">
                  <Sparkles size={16} /> {isAuthenticated ? 'Create a Test Now' : 'Get Started as Instructor'}
                </Link>
                <p className="flex items-center text-xs text-[var(--color-text-muted)] sm:ml-2">
                  <CheckCircle size={12} className="text-green-500 mr-1.5 shrink-0" />
                  Students join free — they never pay
                </p>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* ── Screenshots Showcase ── */}
      <ScreenshotShowcase />

      {/* ── Features — Instructor Benefits ── */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[var(--color-surface)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-radial from-blue-50/40 via-indigo-50/20 to-transparent dark:from-blue-900/8 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Sparkles size={13} /> Platform Features
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Everything you need to manage your students</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">A complete assessment platform built for instructors, trainers, and organizations who want results.</p>
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

      {/* ── Advanced Test Controls ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
                <UserCheck size={13} /> Advanced Test Controls
              </div>
              <h2 className="text-3xl font-bold text-[var(--color-text)] mb-4">You control every aspect of every test</h2>
              <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed text-sm">
                Set duration, difficulty, and passing score. Enable or disable reattempt, answer review, certificates, and AI proctoring — independently for each test you create.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {INSTRUCTOR_CONTROLS.map(ctrl => (
                  <div key={ctrl.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-text)]">{ctrl.label}</p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{ctrl.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link to={isAuthenticated ? '/create-exam' : '/signup?role=instructor'} className="btn-primary px-6 py-3 inline-flex items-center gap-2 font-semibold rounded-xl">
                <Zap size={16} /> {isAuthenticated ? 'Create a Test' : 'Start Creating Tests'}
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Test Created', value: 'Python Fundamentals', badge: '24 students invited', color: 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800' },
                { label: 'Avg Score', value: '82%', badge: 'Pass rate: 91%', color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' },
                { label: 'Proctoring', value: 'Active', badge: '0 violations detected', color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' },
                { label: 'Certificates', value: '22', badge: 'Auto-issued on pass', color: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' },
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
                  <ShieldCheck size={13} /> AI Proctoring & Monitoring
                </div>
                <h2 className="text-3xl font-bold mb-4">Ensure exam integrity across your entire batch</h2>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Enable AI proctoring per test. Real-time webcam analysis, tab monitoring, random photo capture, and violation tracking — all in your instructor dashboard. No external software needed.
                </p>
                <ul className="space-y-3">
                  {[
                    'Webcam-based face detection during exam',
                    'Tab-switch and window-blur monitoring',
                    'Random photo capture at instructor\'s discretion',
                    'Violation tracking with auto-submit after 3 violations',
                    'Full proctoring screenshots available in your report',
                    'AI Proctored badge printed on issued certificates',
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
                    { label: 'Photo Captures', status: '3 taken', ok: true },
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

      {/* ── How This Helps You (instructor benefits) ── */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[var(--color-surface)]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-50/40 dark:bg-violet-900/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-50/40 dark:bg-teal-900/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <CheckCircle size={13} /> How This Helps You
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Built for real instructor outcomes</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">Every feature is designed to make you more effective — saving time, improving results, and giving you the data to act.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HOW_HELPS.map((item) => (
              <div key={item.title} className="card hover:shadow-md transition-all hover:-translate-y-0.5">
                <item.icon size={22} className={`${item.color} mb-4`} />
                <h3 className="font-bold text-[var(--color-text)] mb-2 text-sm">{item.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

 {/* ── AI Insights Section (School Version) ── */}
<section className="py-20 px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div>
        <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
          <Brain size={13} /> Smart School Insights
        </div>

        <h2 className="text-3xl font-bold text-[var(--color-text)] mb-4">
          Track class performance and identify students who need attention
        </h2>

        <p className="text-[var(--color-text-muted)] mb-6 leading-relaxed text-sm">
          After every exam, LikhitAI automatically analyzes student performance across subjects and topics. Teachers and schools can quickly identify weak areas, monitor progress, and improve learning outcomes.
        </p>

        <ul className="space-y-3 mb-8">
          {[
            ['Class-wise student performance tracking', BarChart2],
            ['Weak students and weak topics detection', Target],
            ['Subject-wise progress analysis', Brain],
            ['Performance trends across multiple exams', TrendingUp],
          ].map(([text, Icon]) => (
            <li
              key={text}
              className="flex items-center gap-2.5 text-sm text-[var(--color-text-muted)]"
            >
              <Icon size={15} className="text-indigo-500 shrink-0" />
              {text}
            </li>
          ))}
        </ul>

        <Link
          to={isAuthenticated ? '/instructor/analytics' : '/signup?role=instructor'}
          className="btn-primary px-6 py-3 inline-flex items-center gap-2 font-semibold rounded-xl"
        >
          <BarChart2 size={16} />
          {isAuthenticated ? 'View Analytics' : 'Explore School Analytics'}
        </Link>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Brain size={16} className="text-indigo-500" />
          <span className="font-semibold text-sm text-[var(--color-text)]">
            Class 10-A — Mathematics Performance
          </span>
        </div>

        <div className="space-y-3">
          {[
            { topic: 'Algebra', accuracy: 88, status: 'Strong', color: 'bg-green-500' },
            { topic: 'Geometry', accuracy: 74, status: 'Good', color: 'bg-blue-500' },
            { topic: 'Trigonometry', accuracy: 52, status: 'Needs Work', color: 'bg-amber-500' },
            { topic: 'Mensuration', accuracy: 35, status: 'Weak', color: 'bg-red-500' },
          ].map(item => (
            <div key={item.topic}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--color-text)]">
                  {item.topic}
                </span>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.status === 'Strong'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : item.status === 'Good'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : item.status === 'Needs Work'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full`}
                  style={{ width: `${item.accuracy}%` }}
                />
              </div>

              <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                {item.accuracy}% class accuracy
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
            Recommended Focus
          </p>

          <p className="text-xs text-[var(--color-text-muted)]">
            Students are struggling in Mensuration and Trigonometry. Schedule revision classes and conduct a follow-up assessment next week.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>

      {/* ── Who It's For ── */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[var(--color-surface)]">
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Users size={13} /> Who It's For
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Built for instructors & organizations</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">Whether you're an individual trainer or running assessments for thousands — this platform scales with you.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHO_FOR.map((uc) => (
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

      {/* ── Instructor Pricing ── */}
      {/* <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-radial from-teal-50/50 via-cyan-50/20 to-transparent dark:from-teal-900/10 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
              <Crown size={13} /> Instructor Plans
            </div>
            <h2 className="text-3xl font-bold text-[var(--color-text)] mb-3">Upgrade to unlock your full potential</h2>
            <p className="text-[var(--color-text-muted)] max-w-xl mx-auto text-sm">
              Manage unlimited students, create unlimited tests, access advanced analytics, and enable full proctoring features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {PLANS.filter(p => p.id !== 'free').map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border-2 p-7 transition-all ${plan.borderColor} ${plan.badge ? 'shadow-xl' : 'shadow-sm hover:shadow-md'} bg-[var(--color-surface)]`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-full shadow">{plan.badge}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${plan.bgColor} flex items-center justify-center`}>
                      <Icon size={20} className={plan.color} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text)] text-lg">{plan.name}</h3>
                      <p className="text-xs text-[var(--color-text-muted)]">{plan.testsPerMonth} exams/mo · {plan.maxQuestions} questions max</p>
                    </div>
                  </div>
                  <div className="mb-5">
                    {plan.originalPrice && (
                      <div className="text-sm text-[var(--color-text-muted)] line-through mb-0.5">₹{plan.originalPrice}/month</div>
                    )}
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold text-[var(--color-text)]">₹{plan.price}</span>
                      <span className="text-[var(--color-text-muted)] text-sm mb-1.5">/month</span>
                    </div>
                    {plan.originalPrice && (
                      <div className="mt-1 inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Save {Math.round((1 - plan.price / plan.originalPrice) * 100)}% — Limited time
                      </div>
                    )}
                  </div>
                  <Link
                    to={isAuthenticated ? '/pricing' : '/signup?role=instructor'}
                    className={`w-full py-2.5 rounded-xl font-semibold text-sm text-center transition-all flex items-center justify-center gap-2 mb-5 ${
                      plan.badge ? 'btn-primary hover:opacity-90' : 'border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--color-text)]'
                    }`}
                  >
                    {isAuthenticated ? `Upgrade to ${plan.name}` : 'Start as Instructor'}
                  </Link>
                  <div className="border-t border-[var(--color-border)] mb-4" />
                  <ul className="space-y-2 flex-1">
                    {plan.features.slice(0, 5).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <Check size={12} className="text-green-500 mt-0.5 shrink-0" />
                        <span className="text-[var(--color-text)]">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="text-center">
            <Link to="/pricing" className="text-[var(--color-primary)] text-sm font-medium hover:underline inline-flex items-center gap-1">
              View full plan details <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section> */}

      {/* ── CTA ── */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-radial from-teal-100/50 via-cyan-50/20 to-transparent dark:from-teal-900/15 dark:to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            <Sparkles size={12} /> Start Today
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--color-text)] mb-4 tracking-tight">
            Your students deserve better assessments.<br />
            <span className="text-[var(--color-primary)]">You deserve better tools.</span>
          </h2>
          <p className="text-[var(--color-text-muted)] text-lg mb-8 leading-relaxed">
            Join instructors and organizations already using LikhitAI to create smarter tests, track real performance, and improve student outcomes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={isAuthenticated ? '/create-exam' : '/signup?role=instructor'}
              className="btn-primary px-8 py-4 flex items-center justify-center gap-2 font-semibold rounded-xl shadow-lg shadow-teal-500/20 text-base"
            >
              <Sparkles size={18} /> {isAuthenticated ? 'Create a Test Now' : 'Get Started as Instructor'}
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/pricing"
              className="btn-secondary px-8 py-4 flex items-center justify-center gap-2 font-semibold rounded-xl text-base"
            >
              View Plans & Pricing
            </Link>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-5">
            <CheckCircle size={12} className="inline mr-1 text-green-500" />
            Students always join free · No credit card for trial
          </p>
        </div>
      </section>
    </div>
  );
}
