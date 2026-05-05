import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import HelpArticleView from '../components/HelpArticleView.jsx';
import { useHelpTopic } from '../hooks/useHelpTopics.js';

export default function HelpTopicPage() {
  const { topicId } = useParams();
  const { data: topic, isLoading, isError } = useHelpTopic(topicId);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-sm text-[var(--color-text-muted)] animate-pulse">
        Loading article…
      </div>
    );
  }

  if (isError || !topic) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-[var(--color-text)]">Topic not found</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-2 mb-6">
          This article does not exist or is not available for your role.
        </p>
        <Link to="/help" className="text-[var(--color-primary)] font-medium hover:underline">
          ← Back to Help center
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
      <Link
        to="/help"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline mb-8"
      >
        <ArrowLeft size={16} /> All topics
      </Link>

      <HelpArticleView topic={topic} />

      <div className="mt-12 pt-8 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-muted)]">
          Still stuck?{' '}
          <Link to="/tickets" className="text-[var(--color-primary)] font-medium hover:underline">
            Open a support ticket
          </Link>
          {' '}or{' '}
          <Link to="/contact" className="text-[var(--color-primary)] font-medium hover:underline">
            contact us
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
