import { LayoutDashboard, LogOut, Menu, Moon, Sun, User, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useAuthStore, useThemeStore } from '../store/index.js';
import { LEGAL_ALL_PAGES } from '../config/legalLinks.js';
import { getDashboardPath } from '../utils/dashboardPath.js';
import likhitaiLogo from '../assets/logos/likhitai-logo.png';

export default function MainLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();
  const dashPath = getDashboardPath(user?.role);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/about', label: 'About' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <nav className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 font-bold text-[var(--color-primary)]">
              <img src={likhitaiLogo} alt="LikhitAI" className="h-8 w-auto" />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === l.to ? 'text-[var(--color-primary)] bg-blue-50 dark:bg-blue-900/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]'}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {isAuthenticated ? (
                <div className="hidden md:flex items-center gap-2">
                  {user?.plan && user.plan !== 'free' && (
                    <Link to="/pricing" className={`text-xs font-bold px-2.5 py-1 rounded-full ${user.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {(user.planDisplayName || user.plan || '').toUpperCase()}
                    </Link>
                  )}
                  <Link to={dashPath} className="flex items-center gap-1.5 btn-secondary text-sm py-2 px-3">
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={() => logout.mutate()}
                    disabled={logout.isPending}
                    className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Logout"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link to="/login" className="btn-secondary text-sm py-2 px-4">Login</Link>
                  <Link to="/signup" className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                    <Zap size={14} /> Get Started
                  </Link>
                </div>
              )}

              <button className="md:hidden p-2 rounded-lg hover:bg-[var(--color-bg-alt)]" onClick={() => setMobileOpen(o => !o)}>
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] px-4 py-4 space-y-1 bg-[var(--color-surface)]">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === l.to ? 'text-[var(--color-primary)] bg-blue-50 dark:bg-blue-900/20' : 'text-[var(--color-text-muted)]'}`}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-[var(--color-border)] pt-3 mt-3">
              {isAuthenticated ? (
                <div className="flex flex-col gap-2">
                  <Link to={dashPath} className="btn-primary text-sm py-2 text-center" onClick={() => setMobileOpen(false)}>Go to Dashboard</Link>
                  <button
                    type="button"
                    onClick={() => { logout.mutate(); setMobileOpen(false); }}
                    disabled={logout.isPending}
                    className="text-sm text-red-500 text-center py-1 disabled:opacity-50"
                  >
                    {logout.isPending ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link to="/login" className="btn-secondary text-sm py-2 px-4 flex-1 text-center" onClick={() => setMobileOpen(false)}>Login</Link>
                  <Link to="/signup" className="btn-primary text-sm py-2 px-4 flex-1 text-center" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 text-[var(--color-primary)] font-bold mb-3">
                <img src={likhitaiLogo} alt="LikhitAI" className="h-7 w-auto" />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3">
                AI-powered exam preparation platform. Generate, take, and ace your exams.
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">Payments secured by Razorpay · AI by Groq</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)] text-sm mb-3">Product</p>
              <div className="space-y-2">
                {[{ to: '/pricing', label: 'Pricing' }, { to: '/leaderboard', label: 'Leaderboard' }, { to: '/about', label: 'About' }].map(l => (
                  <Link key={l.to} to={l.to} className="block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text)] text-sm mb-3">Platform</p>
              <div className="space-y-2">
                {[{ to: dashPath, label: 'Dashboard' }, { to: '/create-exam', label: 'Generate Exam' }, { to: '/study', label: 'Study Mode' }].map(l => (
                  <Link key={l.to} to={l.to} className="block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
            <div className="md:col-span-1">
              <p className="font-semibold text-[var(--color-text)] text-sm mb-3">Legal &amp; compliance</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                <Link to="/contact" className="block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">Contact (product)</Link>
                {LEGAL_ALL_PAGES.map((l) => (
                  <Link key={l.to} to={l.to} className="block text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">{l.label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[var(--color-text-muted)]">© {new Date().getFullYear()} LikhitAI. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to="/privacy" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">Privacy</Link>
              <Link to="/terms" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">Terms</Link>
              <Link to="/legal/refunds" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">Refunds</Link>
              <Link to="/legal/cookies" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">Cookies</Link>
              <Link to="/legal/ai-proctoring" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">AI Proctoring</Link>
              <Link to="/legal/contact" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">Legal contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
