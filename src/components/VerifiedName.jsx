import { BadgeCheck } from 'lucide-react';

/**
 * Instructor display name with optional Twitter-style verified checkmark.
 */
export default function VerifiedName({
  name,
  verified = false,
  className = '',
  nameClassName = 'font-semibold text-[var(--color-text)]',
  iconSize = 14,
  showLabel = false,
}) {
  const display = name || 'Instructor';
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 max-w-full ${className}`}>
      <span className={`truncate ${nameClassName}`}>{display}</span>
      {verified && (
        <span
          className="inline-flex items-center gap-0.5 shrink-0 text-emerald-500"
          title="Verified instructor"
          aria-label="Verified instructor"
        >
          <BadgeCheck size={iconSize} className="fill-emerald-500 text-white" strokeWidth={1.5} aria-hidden />
          {showLabel && <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Verified</span>}
        </span>
      )}
    </span>
  );
}
