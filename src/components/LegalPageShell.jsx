import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_FOOTER_COMPACT } from '../config/legalLinks.js';

export default function LegalPageShell({
  title,
  description,
  children,
  lastUpdated = 'May 2026',
}) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} · LikhitAI`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    const prevDesc = meta.getAttribute('content') || '';
    meta.setAttribute('content', description);
    return () => {
      document.title = prevTitle;
      if (prevDesc) meta.setAttribute('content', prevDesc);
    };
  }, [title, description]);

  return (
    <div className="bg-[var(--color-bg)] animate-fade-in min-h-screen flex flex-col">
      <nav className="border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
          <Link to="/" className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
            ← LikhitAI
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 justify-end">
            {LEGAL_FOOTER_COMPACT.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <header className="mb-8 pb-6 border-b border-[var(--color-border)]">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">{title}</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">Last updated: {lastUpdated}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-4 leading-relaxed rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
            This document describes LikhitAI platform practices. It does not constitute legal advice. Schools, institutes, and enterprises should have counsel review obligations in their jurisdiction.
          </p>
        </header>

        <article className="space-y-6 text-sm text-[var(--color-text-muted)] leading-relaxed [&_strong]:text-[var(--color-text)] [&_h2]:text-[var(--color-text)] [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 first:[&_h2]:mt-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-[var(--color-primary)] [&_a]:underline-offset-2 hover:[&_a]:underline">
          {children}
        </article>
      </div>
    </div>
  );
}
