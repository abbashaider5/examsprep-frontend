import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, LayoutDashboard, BookOpen, Users, BarChart2, Award, GraduationCap, Trophy } from 'lucide-react';

const INSTRUCTOR_STEPS = [
  {
    icon: LayoutDashboard,
    title: 'Welcome to Your Dashboard',
    description: 'This is your command centre. See stats, pending invites, and activity at a glance.',
    highlight: 'instructor-dashboard',
    color: 'from-violet-500 to-indigo-500',
  },
  {
    icon: BookOpen,
    title: 'Create & Manage Tests',
    description: 'Build AI-powered tests with proctoring, certificates, and expiry dates. Invite students directly or share with a batch.',
    highlight: 'create-exam',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Users,
    title: 'Organise Students into Batches',
    description: 'Group students into batches and share tests with the whole batch in one click. Manage members easily.',
    highlight: 'batches',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: BarChart2,
    title: 'Deep Analytics & AI Insights',
    description: 'Track performance across all tests. The AI Insights tab flags struggling students and weak topic areas automatically.',
    highlight: 'analytics',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Award,
    title: 'Certificates & Reports',
    description: 'Students earn certificates on passing. You can view per-test reports including batch-accessed students.',
    highlight: 'certificates',
    color: 'from-pink-500 to-rose-500',
  },
];

const STUDENT_STEPS = [
  {
    icon: LayoutDashboard,
    title: 'Your Dashboard',
    description: "Pending test invites appear here. Accept an invite to add it to your My Tests page.",
    highlight: 'dashboard',
    color: 'from-violet-500 to-indigo-500',
  },
  {
    icon: GraduationCap,
    title: 'My Tests',
    description: 'All your accepted tests live here — attempt them, retry, or review past results. Expired tests are clearly marked.',
    highlight: 'tests',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BarChart2,
    title: 'Track Your Performance',
    description: 'See your score trends, strong and weak subjects, and time-per-question — all in one place.',
    highlight: 'performance',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Award,
    title: 'Earn Certificates',
    description: 'Pass a test to earn a certificate. Download or share them directly from this page.',
    highlight: 'certificates',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Trophy,
    title: 'Leaderboard',
    description: 'See how you rank against other students across tests. Compete and climb the ranks!',
    highlight: 'leaderboard',
    color: 'from-pink-500 to-rose-500',
  },
];

const STORAGE_KEY_INSTRUCTOR = 'examprep_tour_instructor_done';
const STORAGE_KEY_STUDENT = 'examprep_tour_student_done';

export default function TourGuide({ role }) {
  const isInstructor = role === 'instructor';
  const storageKey = isInstructor ? STORAGE_KEY_INSTRUCTOR : STORAGE_KEY_STUDENT;
  const steps = isInstructor ? INSTRUCTOR_STEPS : STUDENT_STEPS;

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(storageKey);
    if (!done) {
      // Small delay so the page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(storageKey, '1');
      setVisible(false);
      setExiting(false);
    }, 300);
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else dismiss();
  };

  const prev = () => setStep(s => Math.max(0, s - 1));

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
        onClick={dismiss}
      />

      {/* Card */}
      <div
        className={`fixed z-[201] inset-0 flex items-center justify-center p-4 pointer-events-none transition-all duration-300 ${exiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      >
        <div className="pointer-events-auto w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">

          {/* Gradient header */}
          <div className={`bg-gradient-to-r ${current.color} p-6 relative`}>
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X size={14} />
            </button>
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <Icon size={22} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">{current.title}</h2>
          </div>

          {/* Body */}
          <div className="p-6">
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
              {current.description}
            </p>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-5 mb-4">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === step
                      ? 'w-5 h-2 bg-[var(--color-primary)]'
                      : 'w-2 h-2 bg-[var(--color-border)] hover:bg-[var(--color-text-muted)]'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={dismiss}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Skip tour
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={prev}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                  >
                    <ChevronLeft size={13} /> Back
                  </button>
                )}
                <button
                  onClick={next}
                  className={`flex items-center gap-1 px-4 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                    isLast
                      ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                      : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                  }`}
                >
                  {isLast ? (
                    <><Sparkles size={12} /> Get Started</>
                  ) : (
                    <>Next <ChevronRight size={13} /></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
