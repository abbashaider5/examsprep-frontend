import { Link } from 'react-router-dom';
import PageSeo from '../components/PageSeo.jsx';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center animate-fade-in">
      <PageSeo
        title="Page Not Found"
        description="The page you are looking for does not exist on LikhitAI."
        robots="noindex, nofollow"
      />
      <div className="text-8xl font-extrabold text-[var(--color-primary)] opacity-20 mb-4">404</div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Page Not Found</h1>
      <p className="text-[var(--color-text-muted)] mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );
}
