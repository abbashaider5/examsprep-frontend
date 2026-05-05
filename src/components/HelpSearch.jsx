import { HelpCircle, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useHelpTopics } from '../hooks/useHelpTopics.js';
import { escapeRegExp, searchHelpTopics } from '../utils/helpContent.js';

const DEBOUNCE_MS = 280;

function highlightMatches(text, query) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const terms = trimmed.split(/\s+/).filter(Boolean);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = String(text).split(pattern);
  return parts.map((part, i) => {
    const isMatch = terms.some((t) => part.toLowerCase() === t.toLowerCase());
    if (isMatch) {
      return (
        <mark
          key={i}
          className="bg-amber-200/90 dark:bg-amber-500/25 text-[var(--color-text)] rounded px-0.5 font-medium"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

function ResultsList({ query, results, onPick, onClose }) {
  const empty = query.trim().length > 0 && results.length === 0;

  return (
    <div
      className="max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl transition-opacity duration-200"
      role="listbox"
    >
      {empty && (
        <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
          No results found.
          <span className="block mt-1 text-xs opacity-80">Try different keywords or browse all topics from Help.</span>
        </div>
      )}
      {!empty &&
        results.map((topic) => (
          <button
            key={topic.id}
            type="button"
            role="option"
            onClick={() => onPick(topic.id)}
            className="w-full text-left px-4 py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-alt)] transition-colors first:rounded-t-xl last:rounded-b-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-text)] leading-snug">
                  {highlightMatches(topic.title, query)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                  {highlightMatches(topic.description, query)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {topic.audience && (
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] px-1.5 py-0.5 rounded-md bg-[var(--color-bg-alt)] border border-[var(--color-border)]">
                    {topic.audience}
                  </span>
                )}
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--color-primary)] px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/10">
                  {topic.category}
                </span>
              </div>
            </div>
          </button>
        ))}
    </div>
  );
}

/**
 * Global help search: debounced filter, dropdown results, navigates to /help/:id
 */
export default function HelpSearch({ className = '' }) {
  const { data: topics = [] } = useHelpTopics();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  const results = useMemo(() => searchHelpTopics(debounced, topics), [debounced, topics]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const goTopic = (id) => {
    navigate(`/help/${id}`);
    setQ('');
    setDebounced('');
    setOpen(false);
    setMobileOpen(false);
  };

  const inputProps = {
    type: 'search',
    placeholder: 'Search help…',
    value: q,
    onChange: (e) => {
      setQ(e.target.value);
      setOpen(true);
    },
    onFocus: () => setOpen(true),
    autoComplete: 'off',
    'aria-label': 'Search help articles',
    className:
      'w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25 focus:border-[var(--color-primary)]/40 transition-all',
  };

  return (
    <>
      {/* Desktop / tablet */}
      <div ref={wrapRef} className={`relative hidden md:block w-full max-w-sm lg:max-w-md ${className}`}>
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
          aria-hidden
        />
        <input {...inputProps} />
        {open && debounced.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50">
            <ResultsList query={debounced} results={results} onPick={goTopic} />
          </div>
        )}
      </div>

      {/* Mobile trigger */}
      <button
        type="button"
        className="md:hidden p-2 rounded-xl hover:bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] transition-colors shrink-0"
        aria-label="Open help search"
        onClick={() => setMobileOpen(true)}
      >
        <HelpCircle size={20} />
      </button>

      {/* Mobile fullscreen sheet */}
      {mobileOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] md:hidden flex flex-col bg-[var(--color-bg)]">
            <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--color-border)] shrink-0">
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-[var(--color-bg-alt)]"
                aria-label="Close"
                onClick={() => {
                  setMobileOpen(false);
                  setQ('');
                  setDebounced('');
                }}
              >
                <X size={22} className="text-[var(--color-text-muted)]" />
              </button>
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  {...inputProps}
                  autoFocus
                  onChange={(e) => {
                    setQ(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {q.trim().length > 0 ? (
                <ResultsList query={debounced} results={results} onPick={goTopic} />
              ) : (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-12">
                  Type to search help topics…
                </p>
              )}
            </div>
            <button
              type="button"
              className="py-3 text-sm font-medium text-[var(--color-primary)] border-t border-[var(--color-border)]"
              onClick={() => {
                navigate('/help');
                setMobileOpen(false);
              }}
            >
              Browse all help topics
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
