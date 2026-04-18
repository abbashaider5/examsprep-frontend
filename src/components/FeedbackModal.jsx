import { Star, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { feedbackApi } from '../services/api.js';

const STORAGE_KEY = 'feedback_last_shown';
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function shouldShowFeedback() {
  try {
    const last = localStorage.getItem(STORAGE_KEY);
    if (!last) return true;
    return Date.now() - Number(last) >= COOLDOWN_MS;
  } catch { return false; }
}

export function markFeedbackShown() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

export default function FeedbackModal({ trigger = 'exam_completed', onClose }) {
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
      setTimeout(onClose, 2200);
    } catch {
      toast.error('Could not submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => { markFeedbackShown(); onClose(); };

  const activeRating = hovered || rating;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="w-[320px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div style={{ background: 'var(--color-primary)' }} className="px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {trigger === 'exam_completed' ? 'How was the exam?' : 'How was your experience?'}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              {trigger === 'exam_completed' ? 'You just completed an exam!' : 'Exam created successfully!'}
            </p>
          </div>
          <button onClick={handleSkip} className="text-white/60 hover:text-white transition-colors mt-0.5 shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {done ? (
            <div className="text-center py-3">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-bold text-[var(--color-text)] text-base">Thank you!</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
                Your feedback helps us make ExamPrep better for everyone.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--color-text-muted)] text-center mb-4 leading-relaxed">
                Your honest rating helps us serve you better. It only takes 5 seconds.
              </p>

              {/* Stars */}
              <div className="flex justify-center gap-1.5 mb-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(s)}
                    className="focus:outline-none"
                  >
                    <Star
                      size={30}
                      className={`transition-all duration-100 ${
                        activeRating >= s
                          ? 'fill-amber-400 text-amber-400 scale-110'
                          : 'text-[var(--color-border)] hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <p className={`text-center text-xs font-semibold mb-3 h-4 transition-all ${activeRating > 0 ? 'text-[var(--color-primary)]' : 'text-transparent'}`}>
                {LABELS[activeRating]}
              </p>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="What could we improve? (optional)"
                className="input text-xs resize-none"
              />

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 rounded-lg transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!rating || submitting}
                  className="btn-primary flex-1 py-2 text-xs rounded-lg"
                >
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
