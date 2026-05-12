import { Shield } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal.jsx';
import { SCREENSHOT_RETENTION_DAYS } from '../utils/screenshotRetention.js';

export default function ProctoringConsentModal({ open, onClose, onAccept }) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  const handleAccept = () => {
    if (!checked) return;
    onAccept();
    setChecked(false);
  };

  const handleClose = () => {
    setChecked(false);
    onClose();
  };

  return (
    <Modal onClose={handleClose}>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-[var(--color-border)] shrink-0 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <Shield size={20} className="text-violet-600 dark:text-violet-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--color-text)]">AI proctoring consent</h2>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-snug">
              This exam uses integrity monitoring. Please read carefully before you continue.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 overflow-y-auto min-h-0 space-y-3 text-[12px] text-[var(--color-text-muted)] leading-relaxed">
          <p className="text-[var(--color-text)] font-medium text-xs">During this exam, LikhitAI may:</p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>Use your <strong>camera</strong> for face visibility, approximate gaze/position, multiple-face checks, and related visual integrity signals.</li>
            <li>Use your <strong>microphone</strong> for environment and noise-level monitoring where enabled by your instructor.</li>
            <li>Require <strong>fullscreen</strong> and detect leaving fullscreen or losing window focus.</li>
            <li>Detect <strong>tab visibility</strong> changes, certain keyboard shortcuts, and similar browser signals to discourage cheating.</li>
            <li>Where the instructor has enabled it, capture limited <strong>screenshot evidence</strong> linked to serious integrity events (not routine “soft” reminders).</li>
          </ul>
          <p>
            <strong className="text-[var(--color-text)]">Soft reminders</strong> (for example, gentle prompts to re-center your face) are shown in the exam interface only. They are{' '}
            <strong className="text-[var(--color-text)]">not stored</strong> as timeline logs and do not generate screenshot evidence.
          </p>
          <p>
            <strong className="text-[var(--color-text)]">Serious warnings</strong> may be logged for instructor review. Screenshot evidence, when collected, is retained for approximately{' '}
            <strong className="text-[var(--color-text)]">{SCREENSHOT_RETENTION_DAYS} days</strong> and then automatically removed from storage while higher-level event summaries needed for reporting may be retained as described in our{' '}
            <Link to="/legal/data-retention" className="text-[var(--color-primary)] font-medium">Data Retention Policy</Link>.
          </p>
          <p>
            Monitoring is used for <strong className="text-[var(--color-text)]">educational exam integrity</strong> only, within the relationship between your institution/instructor and candidates on the platform.
          </p>
          <p className="text-[11px]">
            Full details:{' '}
            <Link to="/legal/ai-proctoring" className="text-[var(--color-primary)] font-medium">AI Proctoring Consent Policy</Link>
            {' · '}
            <Link to="/legal/student-monitoring" className="text-[var(--color-primary)] font-medium">Student Monitoring Disclosure</Link>
            {' · '}
            <Link to="/privacy" className="text-[var(--color-primary)] font-medium">Privacy Policy</Link>
          </p>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)] shrink-0 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <span className="text-xs text-[var(--color-text)] leading-snug">
              I understand and agree to AI-assisted proctoring for this exam, including the processing described above.
            </span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1 py-2.5 text-xs rounded-xl">
              Go back
            </button>
            <button
              type="button"
              disabled={!checked}
              onClick={handleAccept}
              className="btn-primary flex-1 py-2.5 text-xs rounded-xl disabled:opacity-45"
            >
              I agree — continue
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
