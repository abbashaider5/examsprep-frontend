import { BookOpen, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../store/index.js';

const SLIDES = [
  { bg: 'from-blue-900 to-blue-700', text: 'Master any subject with AI-generated questions tailored to your level.' },
  { bg: 'from-indigo-900 to-indigo-700', text: 'Track your progress and identify weak areas with detailed analytics.' },
  { bg: 'from-slate-900 to-slate-700', text: 'Earn verified certificates and showcase your achievements.' },
];

export default function AuthLayout() {
  const { isAuthenticated } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, []);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const current = SLIDES[slide];

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-8 py-12 max-w-lg mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-[var(--color-primary)]">
            <BookOpen size={24} /> ExamPrep AI
          </Link>
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <Outlet />
      </div>

      <div className={`hidden lg:flex flex-1 bg-gradient-to-br ${current.bg} relative overflow-hidden transition-all duration-1000`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white">
          <div className="text-5xl mb-8">🎓</div>
          <h2 className="text-3xl font-bold text-center mb-4 leading-tight">{current.text}</h2>
          <div className="flex gap-2 mt-8">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)} className={`w-2 h-2 rounded-full transition-all ${i === slide ? 'w-6 bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        </div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -top-10 -left-10 w-60 h-60 bg-white/5 rounded-full" />
      </div>
    </div>
  );
}
