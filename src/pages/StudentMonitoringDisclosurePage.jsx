import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';
import { SCREENSHOT_RETENTION_DAYS } from '../utils/screenshotRetention.js';

export default function StudentMonitoringDisclosurePage() {
  return (
    <LegalPageShell
      title="Student Monitoring Disclosure"
      description="Plain-language disclosure for students: what LikhitAI monitors during proctored exams, why, and how evidence is handled."
    >
      <section>
        <h2>1. Why monitoring exists</h2>
        <p>
          Your school or instructor may require proctored exams to support fair grading and credible results. Monitoring helps deter cheating and documents serious incidents for review.
        </p>
      </section>

      <section>
        <h2>2. What may be monitored</h2>
        <ul>
          <li><strong>Camera:</strong> to confirm you are present, visible, and to detect conditions such as multiple people or prohibited objects where technology allows.</li>
          <li><strong>Microphone:</strong> to assess environment noise or voice activity when enabled for your exam.</li>
          <li><strong>Browser:</strong> tab changes, leaving fullscreen, window focus, and restricted shortcuts may be detected.</li>
          <li><strong>Screenshots:</strong> only where enabled—and typically tied to serious events or scheduled sampling—not every soft reminder.</li>
        </ul>
      </section>

      <section>
        <h2>3. Soft reminders</h2>
        <p>
          You may see on-screen hints (for example, to adjust your position). These soft reminders are meant to help you succeed. They are not stored as timeline events and do not create screenshot evidence in the soft-warning path.
        </p>
      </section>

      <section>
        <h2>4. Serious events</h2>
        <p>
          Serious or repeated integrity concerns may be logged for your instructor. Screenshots, when stored, are automatically deleted after about <strong>{SCREENSHOT_RETENTION_DAYS} days</strong>.
        </p>
      </section>

      <section>
        <h2>5. Privacy protections</h2>
        <p>
          Processing is limited to exam integrity and service operation. Access is role-controlled. Enterprise deployments keep organizational data logically separated. Read our <Link to="/privacy">Privacy Policy</Link> for broader rights and contacts.
        </p>
      </section>

      <section>
        <h2>6. Questions</h2>
        <p>
          Talk to your instructor or institution first. Platform contacts: <Link to="/legal/contact">Legal &amp; grievance desk</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
