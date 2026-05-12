import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';
import { SCREENSHOT_RETENTION_DAYS } from '../utils/screenshotRetention.js';

export default function AiProctoringConsentPolicyPage() {
  return (
    <LegalPageShell
      title="AI Proctoring Consent Policy"
      description="LikhitAI AI-assisted exam monitoring: camera, audio, browser signals, evidence capture, retention, and soft vs serious warnings."
    >
      <section>
        <h2>1. Purpose</h2>
        <p>
          AI-assisted proctoring helps instructors and institutions promote fair exams. This policy explains what may be processed, what is stored, and how long evidence is kept.
        </p>
      </section>

      <section>
        <h2>2. Camera and face-related processing</h2>
        <p>
          Video from the candidate camera may be analyzed in real time for face presence, approximate position in frame, multiple-face conditions, and—where enabled—certain object categories associated with academic integrity risks. Outputs drive in-exam alerts and, for serious conditions, may contribute to logged events for instructor review.
        </p>
      </section>

      <section>
        <h2>3. Audio</h2>
        <p>
          Where enabled for an exam, microphone audio may be analyzed for level and pattern indicators (e.g. sustained noise or voice activity). Audio is not sold and is not used for advertising.
        </p>
      </section>

      <section>
        <h2>4. Browser and fullscreen monitoring</h2>
        <p>
          The client monitors tab visibility, fullscreen state, window focus, and certain keyboard/mouse patterns that are commonly restricted during exams. These signals may generate events when they indicate potential policy violations.
        </p>
      </section>

      <section>
        <h2>5. Screenshot evidence</h2>
        <p>
          If the exam author enables screenshot capture, still images may be uploaded in connection with serious integrity events and periodic sampling where configured—not for every minor UI reminder.
        </p>
        <p>
          Stored screenshots are automatically deleted after approximately <strong>{SCREENSHOT_RETENTION_DAYS} days</strong>. See <Link to="/legal/data-retention">Data Retention Policy</Link>.
        </p>
      </section>

      <section>
        <h2>6. Soft warnings</h2>
        <p>
          Soft or non-serious reminders (for example, a prompt to re-center in frame) are intended as coaching. They are shown in the exam UI and are <strong>not</strong> written to the proctoring event timeline and <strong>do not</strong> trigger screenshot evidence collection as part of the soft-warning path described in product documentation.
        </p>
      </section>

      <section>
        <h2>7. Consent at exam start</h2>
        <p>
          Proctored exams require explicit in-product acknowledgment before the timed exam begins. If you do not agree, you cannot start the proctored attempt.
        </p>
      </section>

      <section>
        <h2>8. Related documents</h2>
        <p>
          <Link to="/privacy">Privacy Policy</Link> · <Link to="/legal/student-monitoring">Student Monitoring Disclosure</Link> · <Link to="/terms">Terms &amp; Conditions</Link>
        </p>
      </section>
    </LegalPageShell>
  );
}
