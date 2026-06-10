import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  BarChart2,
  BookmarkCheck, BookOpen, Building2,
  ChevronDown,
  GraduationCap, HelpCircle, LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  LogOut, Menu,
  Moon,
  Plus, RefreshCw,
  Settings,
  Sun,
  Trophy, User, Users, X, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import likhitaiLogo from '../assets/logos/likhitai-logo.png';
import AnnouncementBanner from '../components/AnnouncementBanner.jsx';
import LegalFooterLinks from '../components/LegalFooterLinks.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import HelpSearch from '../components/HelpSearch.jsx';
import NotificationDropdown from '../components/NotificationDropdown.jsx';
import { ADMIN_PANEL_TABS } from '../config/adminPanelTabs.js';
import { useAuth, useMe } from '../hooks/useAuth.js';
import { authApi, enterpriseApi, notificationApi } from '../services/api.js';
import { useAuthStore, useThemeStore } from '../store/index.js';
import { getDashboardPath } from '../utils/dashboardPath.js';

const INSTRUCTOR_TESTS_GROUP = {
  type: 'group',
  id: 'tests',
  label: 'Tests',
  icon: BookOpen,
  children: [
    { to: '/tests', icon: BookOpen, label: 'All tests' },
    { to: '/create-exam', icon: Plus, label: 'Create test' },
    { to: '/test-reports', icon: BookmarkCheck, label: 'Test reports' },
  ],
};

const INSTRUCTOR_CLASSES_GROUP = {
  type: 'group',
  id: 'classes',
  label: 'Classes',
  icon: Building2,
  children: [
    { to: '/school/classes', icon: Building2, label: 'All classes' },
    { to: '/school/classes/new', icon: Plus, label: 'Create class' },
  ],
};

const INSTRUCTOR_STUDENTS_GROUP = {
  type: 'group',
  id: 'students',
  label: 'Students',
  icon: GraduationCap,
  children: [
    { to: '/school/students', icon: GraduationCap, label: 'All students' },
    { to: '/school/students/new', icon: Plus, label: 'Create student' },
  ],
};

function buildInstructorSidebarNav(enterprise) {
  const isEnterpriseTeacher = Boolean(enterprise?.id || enterprise?._id);
  const nav = [{ type: 'link', to: '/instructor-dashboard', icon: LayoutDashboard, label: 'Dashboard' }];
  if (enterprise?.mode === 'school') {
    nav.push(
      INSTRUCTOR_CLASSES_GROUP,
      INSTRUCTOR_STUDENTS_GROUP,
      INSTRUCTOR_TESTS_GROUP,
      { type: 'link', to: '/batches', icon: Users, label: 'Batches', badgeKey: 'batch' },
    );
  } else {
    nav.push(
      INSTRUCTOR_TESTS_GROUP,
      { type: 'link', to: '/batches', icon: Users, label: 'Batches', badgeKey: 'batch' },
    );
  }
  nav.push(
    { type: 'link', to: '/instructor/performance', icon: BarChart2, label: 'Insights' },
    { type: 'link', to: '/certificates', icon: Award, label: 'Certificates' },
    { type: 'link', to: '/profile', icon: User, label: 'Profile' },
    { type: 'link', to: '/settings', icon: Settings, label: 'Settings' },
  );
  if (!isEnterpriseTeacher) {
    nav.splice(nav.length - 1, 0, { type: 'link', to: '/plan', icon: Zap, label: 'Plan' });
  }
  return nav;
}

function pathMatchesInstructorChild(to, pathname) {
  if (to === '/test-reports') return pathname === '/test-reports' || pathname.startsWith('/instructor/report');
  return pathname === to;
}

function instructorGroupHasActiveChild(children, pathname) {
  return children.some(c => pathMatchesInstructorChild(c.to, pathname));
}

const PRINCIPAL_NAV = [
  { to: '/enterprise-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/plan', icon: Zap, label: 'Plan & billing' },
  { to: '/enterprise/teachers/new', icon: Plus, label: 'Add teacher' },
  { to: '/enterprise/teachers', icon: Users, label: 'All teachers' },
  { to: '/enterprise/logs', icon: BarChart2, label: 'Activity logs' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const STUDENT_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tests', icon: GraduationCap, label: 'My tests' },
  { to: '/performance', icon: BarChart2, label: 'Performance' },
  { to: '/certificates', icon: Award, label: 'Certificates' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/batches', icon: Users, label: 'Batches' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

// For pageTitle lookup
const ALL_NAV_FLAT = [
  ...STUDENT_NAV,
  { to: '/profile', label: 'Profile' },
  { to: '/instructor-dashboard', label: 'Dashboard' },
  { to: '/test-reports', label: 'Reports' },
  { to: '/instructor/performance', label: 'Insights' },
  { to: '/test-reports', label: 'Test Reports' },
  { to: '/tickets', label: 'Ticketing' },
  { to: '/admin-dashboard', label: 'Admin' },
  { to: '/settings', label: 'Settings' },
];

const ROLE_COLORS = {
  user: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  instructor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  principal: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
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
      className={`group flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${indent ? 'pl-2 ml-2.5 border-l border-[var(--color-border)]' : ''} ${active
        ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-[inset_3px_0_0_0_var(--color-primary)]'
        : 'text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--color-text)]'
      } ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
      title={collapsed ? label : ''}
    >
      <div className="relative shrink-0 opacity-90 group-hover:opacity-100">
        <Icon size={indent ? 15 : 17} strokeWidth={active ? 2.25 : 2} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none px-0.5">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </Link>
  );
}

function InstructorNavGroupButton({
  group,
  collapsed,
  open,
  onToggle,
  pathname,
  onMobileClose,
}) {
  const childActive = instructorGroupHasActiveChild(group.children, pathname);
  const Icon = group.icon;

  if (collapsed) {
    return (
      <Link
        to={group.children[0].to}
        onClick={onMobileClose}
        title={`${group.label} — ${group.children.map(c => c.label).join(', ')}`}
        className={`group flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors px-2 py-2.5 ${
          childActive
            ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-[inset_3px_0_0_0_var(--color-primary)]'
            : 'text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--color-text)]'
        }`}
      >
        <Icon size={17} strokeWidth={childActive ? 2.25 : 2} className="shrink-0 opacity-90" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group flex w-full items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors px-3 py-2.5 text-left ${
        childActive
          ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-[inset_3px_0_0_0_var(--color-primary)]'
          : 'text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--color-text)]'
      }`}
    >
      <div className="relative shrink-0 opacity-90">
        <Icon size={17} strokeWidth={childActive ? 2.25 : 2} />
      </div>
      <span className="flex-1 truncate">{group.label}</span>
      <ChevronDown size={16} strokeWidth={2} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}

function AdminNavLink({ tab, label, icon: Icon, collapsed, onClick }) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';
  const active = pathname === '/admin-dashboard' && currentTab === tab;
  const to = `/admin-dashboard?tab=${encodeURIComponent(tab)}`;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors ${active
        ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-[inset_3px_0_0_0_var(--color-primary)]'
        : 'text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[var(--color-text)]'
      } ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
      title={collapsed ? label : ''}
    >
      <Icon size={17} className="shrink-0" strokeWidth={active ? 2.25 : 2} />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
    </Link>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function DashboardLayout() {
  const { user, setUser } = useAuthStore();
  useMe();
  const { dark, toggle } = useThemeStore();
  const { logout } = useAuth();
  const qc = useQueryClient();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [instructorOpenGroup, setInstructorOpenGroup] = useState('tests');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const instructorNav = useMemo(
    () => buildInstructorSidebarNav(user?.enterprise),
    [user?.enterprise?.mode],
  );

  useEffect(() => {
    instructorNav.forEach(entry => {
      if (entry.type === 'group' && instructorGroupHasActiveChild(entry.children, pathname)) {
        setInstructorOpenGroup(entry.id);
      }
    });
  }, [pathname, instructorNav]);

  const stopImpersonationMut = useMutation({
    mutationFn: () => enterpriseApi.stopImpersonation(),
    onSuccess: async () => {
      const me = await authApi.getMe();
      setUser(me.data.user);
      qc.invalidateQueries();
      toast.success('View mode ended');
      window.location.href = '/enterprise-dashboard';
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not exit view mode'),
  });

  // Reuse the cached notifications query to compute batch badge
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll().then(r => r.data),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
  const batchBadge = notifData?.notifications?.filter(n => n.type === 'batch_joined' && !n.isRead).length || 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 600);
  };

  const adminTabLabel = pathname === '/admin-dashboard'
    ? (ADMIN_PANEL_TABS.find(t => t.id === (searchParams.get('tab') || 'overview'))?.label ?? 'Overview')
    : null;

  const pageTitle =
    (pathname === '/admin-dashboard' && adminTabLabel ? adminTabLabel : null)
    || ALL_NAV_FLAT.find(n => n.to === pathname)?.label
    || (pathname.startsWith('/instructor/report') ? 'Exam Report'
      : pathname === '/test-reports' ? 'Reports'
      : pathname === '/instructor/performance' ? 'Insights'
      : pathname === '/create-exam' ? 'Create Test'
      : pathname === '/batches' ? 'Batches'
      : pathname === '/instructor-dashboard' ? 'Dashboard'
      : pathname === '/enterprise-dashboard' ? 'Enterprise'
      : pathname === '/enterprise/teachers' ? 'All teachers'
      : pathname === '/enterprise/teachers/new' ? 'Add teacher'
      : pathname === '/school/classes' ? 'Classes'
      : pathname === '/school/students' ? 'Students'
      : pathname === '/tests' ? user?.role === 'instructor' ? 'All Tests' : 'My Tests'
      : pathname === '/tickets' ? 'Ticketing'
      : 'Dashboard');

  const isFreePlan = !user?.plan || user.plan === 'free';
  const isStudent = user?.role === 'user';
  const remaining = user?.remaining ?? null;
  const isAdmin = user?.role === 'admin';
  const isPrincipalUser = user?.role === 'principal';
  const isInstructorNav = user?.role === 'instructor';
  const isEnterpriseTeacher = isInstructorNav && Boolean(user?.enterprise?.id || user?.enterprise?._id);
  const dashboardHome = getDashboardPath(user?.role);
  const studentNavItems = useMemo(() => {
    if (user?.enterprise?.mode === 'school') {
      return STUDENT_NAV.filter((n) => n.to !== '/batches');
    }
    return STUDENT_NAV;
  }, [user?.enterprise?.mode]);

  return (
    <div className="flex h-screen bg-[var(--color-bg)] overflow-hidden">
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:relative z-30 flex flex-col h-full transition-all duration-300 ease-out
        bg-gradient-to-b from-slate-50/95 to-white dark:from-slate-950 dark:to-slate-900/95
        border-r border-slate-200/80 dark:border-slate-800/90
        shadow-[4px_0_24px_-8px_rgba(15,23,42,0.08)] dark:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.35)]
        ${collapsed ? 'w-[4.25rem]' : 'w-[15.5rem] sm:w-60'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-2 px-4 py-4 border-b border-slate-200/70 dark:border-slate-800 min-h-[64px] ${collapsed ? 'justify-center' : ''}`}>
          <Link
            to={dashboardHome}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 min-w-0 rounded-xl ring-1 ring-transparent hover:ring-[var(--color-primary)]/25 transition-all ${collapsed ? 'justify-center p-1' : ''}`}
          >
            <img src={likhitaiLogo} alt="LikhitAI" className={collapsed ? 'h-8 w-8 object-contain shrink-0' : 'h-8 w-auto shrink-0'} />
            {!collapsed && user?.enterprise?.name && (
              <span className="hidden sm:inline text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate border-l border-slate-200 dark:border-slate-700 pl-2 leading-tight max-w-[7.5rem]">
                {user.enterprise.name}
              </span>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {isAdmin ? (
            <>
              {!collapsed && (
                <div className="px-2 pb-3 mb-1 border-b border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Navigation</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">Console · LikhitAI</p>
                </div>
              )}
              {ADMIN_PANEL_TABS.map(t => (
                <AdminNavLink
                  key={t.id}
                  tab={t.id}
                  label={t.label}
                  icon={t.icon}
                  collapsed={collapsed}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
              <div className="pt-3 mt-2 mx-1 border-t border-slate-200/70 dark:border-slate-800/80" />
              <SidebarLink to="/profile" icon={User} label="Profile" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
              <SidebarLink to="/plan" icon={Zap} label="Plan" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
              <SidebarLink to="/settings" icon={Settings} label="Settings" collapsed={collapsed} onClick={() => setMobileOpen(false)} />
            </>
          ) : isPrincipalUser ? (
            <>
              {!collapsed && (
                <div className="px-2 pb-2 mb-1 border-b border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Enterprise</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Teachers · settings</p>
                </div>
              )}
              {PRINCIPAL_NAV.map((n) => (
                <SidebarLink key={n.to} {...n} collapsed={collapsed} onClick={() => setMobileOpen(false)} />
              ))}
            </>
          ) : isInstructorNav ? (
            <>
              {!collapsed && (
                <div className="px-2 pb-2 mb-1 border-b border-slate-200/60 dark:border-slate-800/80">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Workspace</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Tests · batches · reports</p>
                </div>
              )}
              {instructorNav.map(entry => {
                if (entry.type === 'link') {
                  const badge = entry.badgeKey === 'batch' ? batchBadge : 0;
                  return (
                    <SidebarLink
                      key={entry.to}
                      to={entry.to}
                      icon={entry.icon}
                      label={entry.label}
                      collapsed={collapsed}
                      onClick={() => setMobileOpen(false)}
                      badge={badge}
                    />
                  );
                }
                const open = instructorOpenGroup === entry.id;
                return (
                  <div key={entry.id} className="space-y-0.5">
                    <InstructorNavGroupButton
                      group={entry}
                      collapsed={collapsed}
                      open={open}
                      pathname={pathname}
                      onMobileClose={() => setMobileOpen(false)}
                      onToggle={() => {
                        setInstructorOpenGroup((prev) => (prev === entry.id ? '' : entry.id));
                      }}
                    />
                    {!collapsed && open && (
                      <div className="space-y-0.5 pl-1 ml-2.5 border-l border-[var(--color-border)]">
                        {entry.children.map(child => (
                          <SidebarLink
                            key={child.to}
                            to={child.to}
                            icon={child.icon}
                            label={child.label}
                            collapsed={false}
                            onClick={() => setMobileOpen(false)}
                            indent
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quick create button */}
              {!collapsed && (
                <div className="pt-2 px-0.5">
                  <Link
                    to="/create-exam"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold shadow-sm shadow-teal-900/10 hover:opacity-95 transition-opacity"
                  >
                    <Zap size={14} /> Create test
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              {studentNavItems.map(n => (
                <SidebarLink key={n.to} {...n} collapsed={collapsed} onClick={() => setMobileOpen(false)} badge={n.to === '/batches' ? batchBadge : 0} />
              ))}
            </>
          )}
        </nav>

        {/* Sidebar logout */}
        <div className="p-3 border-t border-slate-200/70 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/40">
          <Link
            to="/help"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 w-full px-3 py-2 mb-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text)] transition-colors ${collapsed ? 'justify-center' : ''}`}
            title="Help"
          >
            <HelpCircle size={16} />
            {!collapsed && 'Help'}
          </Link>
          <Link
            to="/tickets"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 w-full px-3 py-2 mb-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-alt)] hover:text-[var(--color-text)] transition-colors ${collapsed ? 'justify-center' : ''}`}
            title="Ticketing"
          >
            <LifeBuoy size={16} />
            {!collapsed && 'Ticketing'}
          </Link>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 ${collapsed ? 'justify-center' : ''}`}
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
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0 shrink">
            <button className="lg:hidden p-2 rounded-lg hover:bg-[var(--color-bg-alt)]" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button className="hidden lg:flex p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)]" onClick={() => setCollapsed(c => !c)}>
              <Menu size={18} />
            </button>
            <div className="hidden sm:block min-w-0">
              <h1 className="font-semibold text-[var(--color-text)] text-sm truncate leading-tight">{pageTitle}</h1>
              {user?.enterprise?.name && (
                <p className="text-[10px] text-[var(--color-text-muted)] truncate leading-tight mt-0.5">
                  LikhitAI · {user.enterprise.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 flex justify-center min-w-0 px-1 sm:px-3">
            <HelpSearch />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {remaining !== null && remaining <= 1 && !isFreePlan && !isAdmin && !isStudent && !isPrincipalUser && !isEnterpriseTeacher && (
              <Link to="/plan" className="hidden sm:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 text-amber-700 dark:text-amber-400 rounded-full px-3 py-1 text-xs font-medium hover:bg-amber-100 transition-colors">
                <Zap size={11} /> {remaining} exam{remaining !== 1 ? 's' : ''} left
              </Link>
            )}
            {!isFreePlan && !isAdmin && !isStudent && !isPrincipalUser && !isEnterpriseTeacher && (
              <Link
                to="/plan"
                className={`hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${
                  user?.plan === 'enterprise'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200'
                }`}
              >
                <Zap size={11} />
                {(user?.planDisplayName || user?.plan || '').toUpperCase()}
              </Link>
            )}
            <button
              onClick={() => setShowFeedback(true)}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors"
              title="Give feedback"
            >
              <Lightbulb size={18} />
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 hover:bg-[var(--color-bg-alt)] rounded-xl px-2 py-1 transition-colors"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name || 'User'} className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-[var(--color-text)] leading-tight">{user?.name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${ROLE_COLORS[user?.role] || ROLE_COLORS.user}`}>
                    {user?.role || 'user'}
                  </span>
                </div>
                <ChevronDown size={14} className="text-[var(--color-text-muted)]" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl z-50 py-1">
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]">View Profile</Link>
                  {!isStudent && !isEnterpriseTeacher && (user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'principal') && (
                    <Link to="/plan" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]">Plan & billing</Link>
                  )}
                  <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="block px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-alt)]">Settings</Link>
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); logout.mutate(); }}
                    disabled={logout.isPending}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {logout.isPending ? 'Logging out…' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Announcement banners */}
        <AnnouncementBanner />

        {user?.impersonation && (
          <div className="shrink-0 flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 text-sm bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-b border-amber-200/80 dark:border-amber-800/60">
            <span>
              You are viewing as <strong className="font-semibold">{user.name}</strong>
            </span>
            <button
              type="button"
              disabled={stopImpersonationMut.isPending}
              onClick={() => stopImpersonationMut.mutate()}
              className="font-semibold px-3 py-1 rounded-lg bg-amber-800 text-white dark:bg-amber-600 text-xs hover:opacity-95 disabled:opacity-50"
            >
              Exit view
            </button>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)]/90 px-3 py-2">
          <LegalFooterLinks className="max-w-4xl mx-auto" />
        </footer>
      </div>

      {showFeedback && (
        <FeedbackModal mode="direct" trigger="general" onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}
