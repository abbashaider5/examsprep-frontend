import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Award,
    BarChart2,
    BookmarkCheck, BookOpen, Brain,
    ChevronDown,
    GraduationCap, LayoutDashboard, LogOut, Menu,
    LifeBuoy,
    MessageSquare,
    Moon,
    Plus, RefreshCw,
    Settings,
    Shield, Sun,
    Trophy, User, Users, X, Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import AnnouncementBanner from '../components/AnnouncementBanner.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import NotificationDropdown from '../components/NotificationDropdown.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { notificationApi } from '../services/api.js';
import { useAuthStore, useThemeStore } from '../store/index.js';

// Instructor nav — items may have `children` for submenus
const INSTRUCTOR_SIDEBAR_NAV = [
  { to: '/instructor-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    id: 'tests', icon: BookmarkCheck, label: 'Tests',
    children: [
      { to: '/tests', icon: BookOpen, label: 'All Tests' },
      { to: '/create-exam', icon: Plus, label: 'Create Test' },
    ],
  },
  { to: '/batches', icon: Users, label: 'Batches' },
  {
    id: 'reports', icon: BarChart2, label: 'Reports',
    children: [
      { to: '/instructor/performance', icon: Brain, label: 'AI Insights' },
      { to: '/test-reports', icon: BookmarkCheck, label: 'Test Reports' },
    ],
  },
  { to: '/certificates', icon: Award, label: 'Certificates' },
  { to: '/profile', icon: Settings, label: 'Settings' },
];

// Student nav
const STUDENT_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tests', icon: GraduationCap, label: 'My Tests' },
  { to: '/performance', icon: BarChart2, label: 'Performance' },
  { to: '/certificates', icon: Award, label: 'Certificates' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/batches', icon: Users, label: 'Batches' },
  { to: '/profile', icon: User, label: 'Profile' },
];

// For pageTitle lookup
const ALL_NAV_FLAT = [
  ...STUDENT_NAV,
  { to: '/instructor-dashboard', label: 'Dashboard' },
  { to: '/test-reports', label: 'Reports' },
  { to: '/instructor/performance', label: 'AI Insights' },
  { to: '/test-reports', label: 'Test Reports' },
  { to: '/tickets', label: 'Ticketing' },
];

const ROLE_COLORS = {
  user: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  instructor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

// ── Flat sidebar link ─────────────────────────────────────────────────────────
function SidebarLink({ to, icon: Icon, label, collapsed, onClick, indent = false, badge = 0 }) {
  const { pathname } = useLocation();
  const active = pathname === to
    || (to === '/test-reports' && (pathname === '/test-reports' || pathname.startsWith('/instructor/report')))
    || (to === '/instructor/performance' && pathname === '/instructor/performance');
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${indent ? 'pl-4' : ''} ${active
        ? 'bg-gradient-to-r from-[var(--color-primary)]/15 to-[var(--color-primary)]/5 text-[var(--color-primary)] font-semibold border border-[var(--color-primary)]/20'
        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text)]'
      }`}
      title={collapsed ? label : ''}
    >
      <div className="relative shrink-0">
        <Icon size={indent ? 14 : 18} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

// ── Submenu group ─────────────────────────────────────────────────────────────
function NavGroup({ id, icon: Icon, label, children, collapsed, openMenus, setOpenMenus, onChildClick }) {
  const { pathname } = useLocation();
  const isChildActive = children.some(c => pathname === c.to || pathname.startsWith(c.to + '/'));
  // isOpen is ONLY driven by openMenus — so user can always toggle open/close
  const isOpen = openMenus.includes(id);

  const toggle = () => {
    setOpenMenus(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all ${
          isChildActive
            ? 'bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-primary)]/5 text-[var(--color-primary)] font-semibold'
            : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text)]'
        }`}
        title={collapsed ? label : ''}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Children — shown when expanded and not collapsed */}
      {!collapsed && isOpen && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-[var(--color-border)] space-y-0.5">
          {children.map(child => (
            <SidebarLink
              key={child.to + child.label}
              to={child.to}
              icon={child.icon}
              label={child.label}
              collapsed={false}
              indent
              onClick={onChildClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const { user } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [openMenus, setOpenMenus] = useState(['tests']); // tests open by default

  // Reuse the cached notifications query to compute batch badge
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then(r => r.data),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
  const batchBadge = notifData?.notifications?.filter(n => n.type === 'batch_joined' && !n.isRead).length || 0;

  // Auto-open submenu groups when navigating to a child route
  useEffect(() => {
    const activeGroups = INSTRUCTOR_SIDEBAR_NAV
      .filter(item => item.children?.some(c => pathname === c.to || pathname.startsWith(c.to + '/')))
      .map(item => item.id);
    if (activeGroups.length > 0) {
      setOpenMenus(prev => {
        const next = [...prev];
        activeGroups.forEach(id => { if (!next.includes(id)) next.push(id); });
        return next;
      });
    }
  }, [pathname]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  const pageTitle =
    ALL_NAV_FLAT.find(n => n.to === pathname)?.label
    || (pathname === '/admin' ? 'Admin Panel'
      : pathname.startsWith('/instructor/report') ? 'Exam Report'
      : pathname === '/test-reports' ? 'Reports'
      : pathname === '/instructor/performance' ? 'AI Insights'
      : pathname === '/create-exam' ? 'Create Test'
      : pathname === '/batches' ? 'Batches'
      : pathname === '/instructor-dashboard' ? 'Dashboard'
      : pathname === '/tests' ? isInstructorRole(user) ? 'All Tests' : 'My Tests'
      : pathname === '/tickets' ? 'Ticketing'
      : 'Dashboard');

  function isInstructorRole(u) {
    return u?.role === 'instructor' || u?.role === 'admin';
  }

  const isFreePlan = !user?.plan || user.plan === 'free';
  const remaining = user?.remaining ?? null;
  const isAdmin = user?.role === 'admin';
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  return (
    <div className="flex h-screen bg-[var(--color-bg)] overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:relative z-30 flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-2.5 p-4 border-b border-[var(--color-border)] min-h-[64px] ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen size={16} className="text-white" />
          </div>
          {!collapsed && <span className="font-extrabold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent text-base">ExamPrep AI</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {isInstructor ? (
            <>
              {/* Instructor navigation with submenus */}
              {INSTRUCTOR_SIDEBAR_NAV.map(item =>
                item.children ? (
                  <NavGroup
                    key={item.id}
                    id={item.id}
                    icon={item.icon}
                    label={item.label}
                    children={item.children}
                    collapsed={collapsed}
                    openMenus={openMenus}
                    setOpenMenus={setOpenMenus}
                    onChildClick={() => setMobileOpen(false)}
                  />
                ) : (
                  <SidebarLink key={item.to} {...item} collapsed={collapsed} onClick={() => setMobileOpen(false)} badge={item.to === '/batches' ? batchBadge : 0} />
                )
              )}

              {/* Quick create button */}
              {!collapsed && (
                <div className="pt-2">
                  <Link
                    to="/create-exam"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-semibold transition-colors border border-[var(--color-primary)]/20"
                  >
                    <Zap size={13} /> + Create Test
                  </Link>
                </div>
              )}
            </>
          ) : (
            /* Student navigation */
            STUDENT_NAV.map(n => (
              <SidebarLink key={n.to} {...n} collapsed={collapsed} onClick={() => setMobileOpen(false)} badge={n.to === '/batches' ? batchBadge : 0} />
            ))
          )}

          {/* Admin section */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div className="pt-3 pb-1 px-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] opacity-60">Admin</span>
                </div>
              )}
              {collapsed && <div className="my-2 border-t border-[var(--color-border)]" />}
              <SidebarLink to="/admin" icon={Shield} label="Admin Panel" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
            </>
          )}
        </nav>

        {/* Sidebar logout */}
        <div className="p-3 border-t border-[var(--color-border)]">
          {isInstructor && (
            <Link
              to="/tickets"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 w-full px-3 py-2 mb-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text)] transition-colors ${collapsed ? 'justify-center' : ''}`}
              title="Ticketing"
            >
              <LifeBuoy size={16} />
              {!collapsed && 'Ticketing'}
            </Link>
          )}
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

      {/* ── Main area ── */}
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
            {/* XP (students only) */}
            {!isInstructor && (
              <div className="hidden sm:flex items-center gap-2 bg-[var(--color-bg-alt)] rounded-full px-3 py-1 text-xs">
                <span className="text-[var(--color-text-muted)]">XP</span>
                <span className="font-bold text-[var(--color-primary)]">{user?.xp || 0}</span>
              </div>
            )}
            <button
              onClick={() => setShowFeedback(true)}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors"
              title="Give feedback"
            >
              <MessageSquare size={18} />
            </button>
            <NotificationDropdown />
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
            {/* User avatar */}
            <Link to="/profile" className="flex items-center gap-2 hover:bg-[var(--color-bg-alt)] rounded-xl px-2 py-1 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
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

        {/* Announcement banners */}
        <AnnouncementBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {showFeedback && (
        <FeedbackModal mode="direct" trigger="general" onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
