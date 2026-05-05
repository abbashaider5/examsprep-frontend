import React from 'react';

export default function UserPageHeader({
  title,
  subtitle,
  icon: Icon,
  right,
  className = '',
  compact = false,
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-5 sm:p-6 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon ? (
            <div className={`${compact ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl'} bg-[var(--color-bg-alt)] border border-[var(--color-border)] flex items-center justify-center shrink-0`}>
              <Icon size={compact ? 16 : 20} className="text-[var(--color-primary)]" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className={`${compact ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} font-bold text-[var(--color-text)] tracking-tight`}>
              {title}
            </h1>
            {subtitle ? (
              <p className={`${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'} text-[var(--color-text-muted)] max-w-2xl leading-relaxed`}>
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

