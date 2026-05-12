import { ArrowLeft } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import HelpSearch from '../components/HelpSearch.jsx';
import { useAuthStore } from '../store/index.js';
import { getDashboardPath } from '../utils/dashboardPath.js';
import likhitaiLogo from '../assets/logos/likhitai-logo.png';
import LegalFooterLinks from '../components/LegalFooterLinks.jsx';

export default function HelpLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const dash = getDashboardPath(user?.role);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center gap-3 sm:gap-4 h-14 sm:h-16">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] shrink-0 lg:hidden"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={likhitaiLogo} alt="LikhitAI" className="h-7 sm:h-8 w-auto" />
          </Link>
          <div className="flex-1 flex justify-center min-w-0 px-2">
            <HelpSearch />
          </div>
          <div className="flex items-center gap-2 shrink-0 text-sm">
            {isAuthenticated ? (
              <Link to={dash} className="hidden sm:inline font-medium text-[var(--color-primary)] hover:underline">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  Log in
                </Link>
                <Link to="/signup" className="btn-primary text-xs py-2 px-3">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] py-3 px-4">
        <LegalFooterLinks />
      </footer>
    </div>
  );
}
