import {
  Award, BookmarkCheck, BookOpen,
  GraduationCap, LayoutDashboard, LogOut, Menu,
  Moon, Plus, RefreshCw, Shield, Sun, Trophy, User, X, Zap
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { useAuthStore, useThemeStore } from '../store/index.js';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/create-exam', icon: Plus, label: 'Generate AI Exam' },
  { to: '/study', icon: GraduationCap, label: 'Study Mode' },
  { to: '/certificates', icon: Award, label: 'Certificates' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const PLAN_COLORS = {
  free: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const ROLE_COLORS = {
  user: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  instructor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function SidebarLink({ to, icon: Icon, label, collapsed, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text)]'}`}
      title={collapsed ? label : ''}
    >
      <Icon size={18} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function DashboardLayout() {
  const { user, setUser } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem('upgrade-banner-dismissed') === '1'; } catch { return false; }
  });
  const { pathname } = useLocation();

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  const allNav = [...NAV];
  const pageTitle = allNav.find(n => n.to === pathname)?.label
    || (pathname === '/admin' ? 'Admin Panel' : pathname === '/instructor' ? 'Instructor Dashboard' : pathname === '/profile' ? 'Profile' : 'Dashboard');

  const isFreePlan = !user?.plan || user.plan === 'free';
  const remaining = user?.remaining ?? null;
  const monthlyLimit = user?.monthlyLimit ?? 3;
  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  const showUpgradeBanner = isFreePlan && !isAdmin && !bannerDismissed;

  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem('upgrade-banner-dismissed', '1'); } catch {}
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg)] overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-30 flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 p-4 border-b border-[var(--color-border)] min-h-[64px] ${collapsed ? 'justify-center' : ''}`}>
          <BookOpen size={22} className="text-[var(--color-primary)] shrink-0" />
          {!collapsed && <span className="font-bold text-[var(--color-primary)] text-base">ExamPrep AI</span>}
        </div>

        {/* Plan badge */}
        {/* {!collapsed && user && (
          <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-[var(--color-bg-alt)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[user.plan] || PLAN_COLORS.free}`}>
                {user.plan || 'free'}
              </div>
              {remaining !== null && (
                <span className="text-xs text-[var(--color-text-muted)] truncate">{remaining}/{monthlyLimit}</span>
              )}
            </div>
            {isFreePlan && !isAdmin && (
              <Link to="/pricing" className="text-xs text-[var(--color-primary)] font-semibold hover:underline shrink-0">
                Upgrade
              </Link>
            )}
          </div>
        )} */}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV.map(n => (
            <SidebarLink key={n.to} {...n} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          ))}
          {isInstructor && (
            <SidebarLink to="/instructor" icon={BookmarkCheck} label="Instructor Dashboard" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          )}
          {isAdmin && (
            <SidebarLink to="/admin" icon={Shield} label="Admin Panel" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
          )}
        </nav>

        {/* Upgrade CTA for free users (not admin) */}
        {!collapsed && isFreePlan && !isAdmin && (
          <div className="mx-3 mb-3 p-3 rounded-xl btn-primary text-white">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap size={14} />
              <span className="text-xs font-bold">Unlock Pro Features</span>
            </div>
            <p className="text-xs opacity-80 mb-2.5 leading-relaxed">AI proctoring, instructor tools, 10 exams/month.</p>
            <Link
              to="/pricing"
              className="block text-center text-xs font-semibold bg-white text-blue-700 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
            >
              Upgrade from ₹149/mo
            </Link>
          </div>
        )}

        {/* Sidebar logout */}
        <div className="p-3 border-t border-[var(--color-border)]">
          <button
            onClick={() => logout.mutate()}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title="Logout"
          >
            <LogOut size={16} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-bg-alt)]" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button className="hidden lg:flex p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]" onClick={() => setCollapsed(c => !c)}>
              <Menu size={18} />
            </button>
            <h1 className="font-semibold text-[var(--color-text)] text-sm hidden sm:block">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {remaining !== null && remaining <= 1 && !isFreePlan && !isAdmin && (
              <Link to="/pricing" className="hidden sm:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 text-amber-700 dark:text-amber-400 rounded-full px-3 py-1 text-xs font-medium hover:bg-amber-100 transition-colors">
                <Zap size={11} /> {remaining} exam{remaining !== 1 ? 's' : ''} left
              </Link>
            )}
            {/* Plan badge for paid users */}
            {!isFreePlan && !isAdmin && (
              <Link
                to="/pricing"
                className={`hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                  user?.plan === 'enterprise'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
                }`}
              >
                <Zap size={11} />
                {user?.plan?.toUpperCase()}
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-[var(--color-bg-alt)] rounded-full px-3 py-1 text-xs">
              <span className="text-[var(--color-text-muted)]">XP</span>
              <span className="font-bold text-[var(--color-primary)]">{user?.xp || 0}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {/* User info in topbar */}
            <Link to="/profile" className="flex items-center gap-2 hover:bg-[var(--color-bg-alt)] rounded-xl px-2 py-1 transition-colors">
              <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-[var(--color-text)] leading-tight">{user?.name}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${ROLE_COLORS[user?.role] || ROLE_COLORS.user}`}>
                  {user?.role || 'user'}
                </span>
              </div>
            </Link>
          </div>
        </header>

        {/* Dismissible upgrade banner for free users */}
        {showUpgradeBanner && (
          <div className="bg-gradient-to-r btn-primary text-white px-4 py-2.5 flex items-center justify-between text-sm shrink-0">
            <div className="flex items-center gap-2">
              <Zap size={14} />
              <span className="font-medium">Upgrade to Pro — Get AI proctoring, 10 exams/month & instructor tools from ₹149/mo</span>
              <Link to="/pricing" className="ml-2 bg-white text-blue-700 font-semibold text-xs px-3 py-1 rounded-full hover:bg-blue-50 transition-colors">
                View Plans
              </Link>
            </div>
            <button onClick={dismissBanner} className="p-1 hover:bg-blue-500 rounded transition-colors">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
