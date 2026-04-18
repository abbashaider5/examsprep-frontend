import { MessageSquare, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { feedbackApi } from '../services/api.js';

// ── Storage helpers ───────────────────────────────────────────────────────────
const LAST_SHOWN_KEY = 'feedback_last_shown';
const INTERACTION_KEY = 'feedback_interactions';
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MIN_INTERACTIONS = 3; // must interact with at least 3 features

export function trackFeedbackInteraction() {
  try {
    const n = Number(localStorage.getItem(INTERACTION_KEY) || 0);
    localStorage.setItem(INTERACTION_KEY, String(n + 1));
  } catch {}
}

export function shouldShowFeedback() {
  try {
    const last = localStorage.getItem(LAST_SHOWN_KEY);
    if (last && Date.now() - Number(last) < COOLDOWN_MS) return false;
    const interactions = Number(localStorage.getItem(INTERACTION_KEY) || 0);
    return interactions >= MIN_INTERACTIONS;
  } catch { return false; }
}

export function markFeedbackShown() {
  try { localStorage.setItem(LAST_SHOWN_KEY, String(Date.now())); } catch {}
}

// ── Labels ────────────────────────────────────────────────────────────────────
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

// ── Full Modal ────────────────────────────────────────────────────────────────
function FeedbackForm({ trigger, onClose }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!rating) { toast.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      await feedbackApi.submit({ rating, message: message.trim(), trigger });
      markFeedbackShown();
      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      toast.error('Could not submit feedback.');
    } finally { setSubmitting(false); }
  };

  const handleSkip = () => { markFeedbackShown(); onClose(); };
  const active = hovered || rating;

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[var(--color-primary)] flex items-start justify-between">
          <div>
            <p className="text-white font-bold text-sm">How was your experience?</p>
            <p className="text-white/70 text-xs mt-0.5">Your feedback helps us improve.</p>
          </div>
          <button onClick={handleSkip} className="text-white/60 hover:text-white mt-0.5 shrink-0 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-[var(--color-text)]">Thank you!</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Your feedback helps us improve ExamPrep AI.</p>
            </div>
          ) : (
            <>
              {/* Stars */}
              <div className="flex justify-center gap-1.5 mb-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(s)} className="focus:outline-none">
                    <Star size={30} className={`transition-all duration-100 ${active >= s ? 'fill-amber-400 text-amber-400 scale-110' : 'text-[var(--color-border)] hover:text-amber-300'}`} />
                  </button>
                ))}
              </div>
              <p className={`text-center text-xs font-semibold mb-4 h-4 transition-all ${active > 0 ? 'text-[var(--color-primary)]' : 'text-transparent'}`}>
                {LABELS[active]}
              </p>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="What could we improve? (optional)"
                className="input text-xs resize-none"
              />

              <div className="flex gap-2 mt-3">
                <button onClick={handleSkip} className="flex-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 rounded-lg transition-colors">
                  Skip
                </button>
                <button onClick={handleSubmit} disabled={!rating || submitting} className="btn-primary flex-1 py-2 text-xs rounded-lg disabled:opacity-50">
                  {submitting ? 'Sending…' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Notification Banner (shown first) ────────────────────────────────────────
function FeedbackBanner({ onAccept, onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
      <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl px-4 py-3 max-w-xs">
        <div className="w-8 h-8 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center shrink-0">
          <MessageSquare size={16} className="text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] leading-tight">Enjoying ExamPrep AI?</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">It takes just 5 seconds.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onAccept} className="text-xs bg-[var(--color-primary)] text-white font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
            Sure!
          </button>
          <button onClick={onDismiss} className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function FeedbackModal({ trigger = 'general', onClose }) {
  const [phase, setPhase] = useState('banner'); // 'banner' | 'modal'

  return (
    <>
      {phase === 'banner' && (
        <FeedbackBanner
          onAccept={() => setPhase('modal')}
          onDismiss={() => { markFeedbackShown(); onClose(); }}
        />
      )}
      {phase === 'modal' && (
        <FeedbackForm trigger={trigger} onClose={onClose} />
      )}
    </>
  );
}
