import { Award, BookOpen, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store/index.js';

const SLIDES = [
  {
    img: 'https://images.pexels.com/photos/4143793/pexels-photo-4143793.jpeg?auto=compress&cs=tinysrgb&w=900',
    heading: 'Ace any exam with AI',
    sub: 'Generate unique MCQs on any subject in under 10 seconds.',
  },
  {
    img: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=900',
    heading: 'Learn smarter, not harder',
    sub: 'Get personalised AI recommendations based on your weak topics.',
  },
  {
    img: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=900',
    heading: 'Earn verified certificates',
    sub: 'Score 75%+ and instantly receive a QR-verifiable PDF certificate.',
  },
  {
    img: 'https://images.pexels.com/photos/256395/pexels-photo-256395.jpeg?auto=compress&cs=tinysrgb&w=900',
    heading: 'Study with confidence',
    sub: 'Proctored exams, flashcards, leaderboards — all in one place.',
  },
];

function ImageCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[active];

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden">
      {/* Background image */}
      {SLIDES.map((s, i) => (
        <img
          key={i}
          src={s.img}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === active ? 'opacity-100' : 'opacity-0'}`}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 px-10 pb-12">
        <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
          <Sparkles size={11} /> AI-Powered Learning
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 leading-snug">{slide.heading}</h2>
        <p className="text-white/70 text-sm leading-relaxed max-w-xs">{slide.sub}</p>

        {/* Dots */}
        <div className="flex gap-1.5 mt-5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`rounded-full transition-all duration-300 ${i === active ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      {/* Trust chips at top */}
      <div className="absolute top-8 left-8 right-8 flex flex-wrap gap-2">
        {[
          { icon: ShieldCheck, label: 'AI Proctoring', color: 'text-violet-300' },
          { icon: Award, label: 'Verified Certificates', color: 'text-amber-300' },
          { icon: Sparkles, label: 'Instant Generation', color: 'text-blue-300' },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium px-3 py-1.5 rounded-full border border-white/15">
            <c.icon size={11} className={c.color} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const { dark, toggle } = useThemeStore();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">

      {/* ── Left: Form Panel ── */}
      <div className="flex-1 flex flex-col min-h-screen relative">
        {/* Soft background blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-[400px] h-[400px] bg-blue-100/50 dark:bg-blue-900/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-indigo-100/40 dark:bg-indigo-900/10 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col flex-1 max-w-md mx-auto w-full px-8 py-10">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-12">
            <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-[var(--color-primary)]">
              <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center shadow-sm">
                <BookOpen size={16} className="text-white" />
              </div>
              ExamPrep AI
            </Link>
            <button
              onClick={toggle}
              className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>

          {/* Form — vertically centered */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full">
              <Outlet />
            </div>
          </div>

          {/* Bottom trust line */}
          <p className="text-center text-xs text-[var(--color-text-muted)] mt-10">
            Free forever &middot; No credit card needed &middot; 10,000+ learners
          </p>
        </div>
      </div>

      {/* ── Right: Image Carousel (desktop only) ── */}
      <div className="hidden lg:block w-[48%] xl:w-[52%] relative overflow-hidden">
        <ImageCarousel />
      </div>
    </div>
  );
}
