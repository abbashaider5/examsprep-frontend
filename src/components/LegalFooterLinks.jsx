import { Link } from 'react-router-dom';
import { LEGAL_FOOTER_COMPACT } from '../config/legalLinks.js';

/** Compact horizontal legal links for auth, dashboard strip, help. */
export default function LegalFooterLinks({ className = '' }) {
  return (
    <nav className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] text-[var(--color-text-muted)] ${className}`} aria-label="Legal">
      {LEGAL_FOOTER_COMPACT.map((l, i) => (
        <span key={l.to} className="inline-flex items-center gap-x-2">
          {i > 0 && <span className="text-[var(--color-border)] select-none" aria-hidden>·</span>}
          <Link to={l.to} className="hover:text-[var(--color-primary)] transition-colors whitespace-nowrap">
            {l.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
