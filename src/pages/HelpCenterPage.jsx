import { BookOpen, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHelpTopics } from '../hooks/useHelpTopics.js';
import { useAuthStore } from '../store/index.js';
import { getHelpCategories } from '../utils/helpContent.js';

export default function HelpCenterPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const { data: topics = [], isLoading, isError, error } = useHelpTopics();
  const categories = getHelpCategories(topics);

  const byCategory = categories.map((cat) => ({
    category: cat,
    items: topics.filter((t) => t.category === cat),
  }));

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center text-sm text-[var(--color-text-muted)] animate-pulse">
        Loading help topics…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-[var(--color-text)] font-medium">Could not load help articles</p>
        <p className="text-sm text-[var(--color-text-muted)] mt-2">{error?.message || 'Try again later.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 animate-fade-in">
      <div className="mb-10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-2">
          Help center
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight">
          How can we help?
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2 max-w-xl leading-relaxed">
          Browse topics below or use the search bar above. Articles are tailored to your account role.
        </p>
      </div>

      {topics.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          No articles are available yet.
        </p>
      ) : (
      <div className="space-y-10">
        {byCategory.map(({ category, items }) => (
          <section key={category}>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={16} className="text-[var(--color-primary)]" />
              <h2 className="text-sm font-bold text-[var(--color-text)] uppercase tracking-wide">{category}</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((topic) => (
                <Link
                  key={topic.id}
                  to={`/help/${topic.id}`}
                  className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 transition-all hover:border-[var(--color-primary)]/35 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--color-primary)]/15 transition-colors">
                      <BookOpen size={17} className="text-[var(--color-primary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-[var(--color-text)] text-sm leading-snug group-hover:text-[var(--color-primary)] transition-colors">
                          {topic.title}
                        </h3>
                        {topic.audience && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-md bg-[var(--color-bg-alt)] border border-[var(--color-border)] shrink-0">
                            {topic.audience}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 line-clamp-2 leading-relaxed">
                        {topic.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      )}
    </div>
  );
}
