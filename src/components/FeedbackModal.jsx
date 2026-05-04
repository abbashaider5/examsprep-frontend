import { MessageSquare, Star, X } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { feedbackApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

// ── Storage helpers ───────────────────────────────────────────────────────────
const LAST_SHOWN_KEY = 'feedback_last_shown';
const INTERACTION_KEY = 'feedback_interactions';
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_INTERACTIONS = 3;

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

// ── Mini star row ─────────────────────────────────────────────────────────────
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

function StarRow({ label, value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--color-text)] w-28 shrink-0">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(s)}
            className="focus:outline-none p-0.5"
          >
            <Star
              size={20}
              className={`transition-all duration-75 ${active >= s ? 'fill-[var(--color-primary)] text-[var(--color-primary)] scale-110' : 'text-[var(--color-border)] hover:text-[var(--color-primary)]/50'}`}
            />
          </button>
        ))}
      </div>
      <span className={`text-[10px] font-semibold w-14 text-right transition-all ${active > 0 ? 'text-[var(--color-primary)]' : 'text-transparent'}`}>
        {LABELS[active]}
      </span>
    </div>
  );
}

// ── Full Modal ────────────────────────────────────────────────────────────────
function FeedbackForm({ trigger, onClose, limitsData }) {
  const [ratings, setRatings] = useState({ ui: 0, performance: 0, features: 0 });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = limitsData ? limitsData.canSubmit : true;
  const totalRemaining = limitsData ? (limitsData.totalLimit - limitsData.totalUsed) : null;
  const todayRemaining = limitsData ? (limitsData.todayLimit - limitsData.todayUsed) : null;

  const allRated = ratings.ui > 0 && ratings.performance > 0 && ratings.features > 0;

  const handleSubmit = async () => {
    if (!allRated) { toast.error('Please rate all three categories'); return; }
    setSubmitting(true);
    try {
      await feedbackApi.submit({ ratings, message: message.trim(), trigger });
      markFeedbackShown();
      setDone(true);
      setTimeout(onClose, 2200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not submit feedback.';
      toast.error(msg);
      if (err.response?.status === 429) setTimeout(onClose, 1500);
    } finally { setSubmitting(false); }
  };

  const handleSkip = () => { markFeedbackShown(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[var(--color-primary)] to-blue-500 flex items-start justify-between">
          <div>
            <p className="text-white font-bold text-sm">
              {trigger === 'exam_completed' ? 'How was your exam experience?' : trigger === 'exam_created' ? 'How was the creation experience?' : 'We value your feedback'}
            </p>
            <p className="text-white/70 text-xs mt-0.5">Rate your experience — takes only a moment.</p>
          </div>
          <button onClick={handleSkip} className="text-white/60 hover:text-white transition-colors mt-0.5 shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {!canSubmit ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🙏</div>
              <p className="font-bold text-[var(--color-text)]">Thank you so much!</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">
                {totalRemaining === 0
                  ? "You've shared your maximum feedback. We truly appreciate your support!"
                  : "You've shared 2 feedbacks today. Come back tomorrow!"}
              </p>
              <button onClick={onClose} className="mt-4 text-sm text-[var(--color-primary)] font-semibold hover:underline">Close</button>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-[var(--color-text)]">Thank you!</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                Your feedback helps make LikhitAI better for everyone.
              </p>
            </div>
          ) : (
            <>
              {(todayRemaining !== null || totalRemaining !== null) && (
                <p className="text-center text-[10px] text-[var(--color-text-muted)] mb-3">
                  {todayRemaining !== null && `${todayRemaining} left today`}
                  {todayRemaining !== null && totalRemaining !== null && ' · '}
                  {totalRemaining !== null && `${totalRemaining} total remaining`}
                </p>
              )}

              {/* Multi-category star ratings */}
              <div className="space-y-3 mb-4 p-3 bg-[var(--color-bg-alt)] rounded-xl">
                <StarRow
                  label="UI & Design"
                  value={ratings.ui}
                  onChange={(v) => setRatings(r => ({ ...r, ui: v }))}
                />
                <div className="border-t border-[var(--color-border)]" />
                <StarRow
                  label="Performance"
                  value={ratings.performance}
                  onChange={(v) => setRatings(r => ({ ...r, performance: v }))}
                />
                <div className="border-t border-[var(--color-border)]" />
                <StarRow
                  label="Features"
                  value={ratings.features}
                  onChange={(v) => setRatings(r => ({ ...r, features: v }))}
                />
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Any additional thoughts? (optional)"
                className="input text-xs resize-none"
              />
              <p className="text-right text-[10px] text-[var(--color-text-muted)] mt-0.5">{message.length}/300</p>

              <div className="flex gap-2 mt-3">
                <button onClick={handleSkip} className="flex-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 rounded-lg transition-colors">
                  Later
                </button>
                <button onClick={handleSubmit} disabled={!allRated || submitting} className="btn-primary flex-1 py-2 text-xs rounded-lg disabled:opacity-50">
                  {submitting ? 'Sending…' : 'Submit Feedback'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Notification Banner ───────────────────────────────────────────────────────
function FeedbackBanner({ onAccept, onDismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
      <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl px-4 py-3 max-w-xs">
        <div className="w-8 h-8 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center shrink-0">
          <MessageSquare size={16} className="text-[var(--color-primary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] leading-tight">Enjoying LikhitAI?</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Rate us — it only takes 5 seconds.</p>
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
export default function FeedbackModal({ trigger = 'general', onClose, mode = 'auto' }) {
  const { isAuthenticated } = useAuthStore();
  const [phase, setPhase] = useState(mode === 'direct' ? 'modal' : 'banner');

  const { data: limitsData } = useQuery({
    queryKey: ['feedbackLimits'],
    queryFn: () => feedbackApi.getLimits().then(r => r.data),
    enabled: isAuthenticated && phase === 'modal',
    staleTime: 30000,
  });

  return (
    <>
      {phase === 'banner' && (
        <FeedbackBanner
          onAccept={() => setPhase('modal')}
          onDismiss={() => { markFeedbackShown(); onClose(); }}
        />
      )}
      {phase === 'modal' && (
        <FeedbackForm trigger={trigger} onClose={onClose} limitsData={limitsData} />
      )}
    </>
  );
}
