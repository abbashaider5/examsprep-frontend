import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';
import { LEGAL_PRIVACY_EMAIL, SUPPORT_EMAIL } from '../config/legalContact.js';
import { SCREENSHOT_RETENTION_DAYS } from '../utils/screenshotRetention.js';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="How LikhitAI collects, uses, and protects student, instructor, and enterprise data—including AI proctoring, retention, and your rights."
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          LikhitAI provides an AI-powered examination and learning platform for individuals, educators, and organizations. This Privacy Policy explains what personal data we process, why, how long we keep it, and your choices.
        </p>
      </section>

      <section>
        <h2>2. Data we collect — students & candidates</h2>
        <ul>
          <li><strong>Account and profile:</strong> name, email, authentication identifiers, optional profile fields, and activity tied to your user ID.</li>
          <li><strong>Exam activity:</strong> answers, scores, timing, flags, device/browser context needed to run exams, and proctoring signals described below.</li>
          <li><strong>AI proctoring (when an exam is configured as proctored):</strong> camera frames are analyzed in-session for integrity (e.g. face visibility, multiple faces, certain objects where object detection is enabled). Microphone audio may be analyzed for noise/voice-activity indicators when enabled. We detect tab visibility changes, fullscreen state, window focus, and certain input patterns (e.g. blocked shortcuts) to support exam rules.</li>
          <li><strong>Screenshot evidence:</strong> where enabled by the exam author, still images may be captured and stored in connection with serious integrity events—not for every minor on-screen reminder.</li>
          <li><strong>Soft vs hard signals:</strong> gentle in-exam reminders (for example, prompts to re-center your face) are shown live and are <strong>not stored</strong> as proctoring timeline events and <strong>do not</strong> create screenshot evidence. Serious or policy-relevant events may be logged for instructor/organization review.</li>
          <li><strong>Screenshot retention:</strong> stored proctoring screenshots are automatically deleted after approximately <strong>{SCREENSHOT_RETENTION_DAYS} days</strong>. Separate analytics and result records may be retained as described in our <Link to="/legal/data-retention">Data Retention Policy</Link>.</li>
        </ul>
      </section>

      <section>
        <h2>3. Data we collect — teachers, instructors, principals</h2>
        <ul>
          <li><strong>Account and billing context:</strong> name, email, role, plan, usage counters, and enterprise linkage where applicable.</li>
          <li><strong>Content you create:</strong> exams, questions, invites, resources, batch/class configuration, tickets, and communications you send through the platform.</li>
          <li><strong>Enterprise administration:</strong> for organization accounts, we process roster-related data you submit (e.g. class lists, student emails for invites) strictly to operate features you enable.</li>
          <li><strong>Review data:</strong> proctoring timelines and evidence made available to you for exams you own or administer, subject to permissions and enterprise settings.</li>
        </ul>
      </section>

      <section>
        <h2>4. Enterprise and school isolation</h2>
        <p>
          Where your organization uses LikhitAI Enterprise features, we design access controls so organization-scoped data is available to authorized roles within that organization (for example, principals and assigned instructors) according to your configuration. We do not use one customer&apos;s confidential exam content to train public models or to advertise to other customers.
        </p>
      </section>

      <section>
        <h2>5. Authentication, sessions, and security</h2>
        <p>
          We use industry-standard authentication mechanisms, including HttpOnly cookies where applicable for session continuity, transport encryption (HTTPS), password hashing, rate limiting, and administrative tooling to detect abuse. Security monitoring may process metadata (e.g. IP addresses, timestamps, error signals) needed to protect accounts and the service.
        </p>
      </section>

      <section>
        <h2>6. Analytics and product improvement</h2>
        <p>
          We may use aggregated or de-identified usage metrics (e.g. feature adoption, performance timings) to operate and improve LikhitAI. We do not sell personal data. Marketing communications, if any, are sent in line with applicable law and your preferences.
        </p>
      </section>

      <section>
        <h2>7. Chat and communications moderation</h2>
        <p>
          Where in-product chat is offered, automated and human moderation may process message content to enforce <Link to="/legal/acceptable-use">Acceptable Use</Link>, safety, and enterprise policies. See also our Terms regarding prohibited conduct.
        </p>
      </section>

      <section>
        <h2>8. Third-party processors</h2>
        <p>
          We rely on vetted infrastructure and service providers (for example, cloud hosting, email delivery, payments, media storage, and AI inference) to deliver the platform. Contracts and configuration aim to limit processing to what is necessary for each service.
        </p>
      </section>

      <section>
        <h2>9. Your rights and account deletion</h2>
        <p>
          Depending on your location, you may have rights to access, rectify, export, restrict, or delete personal data, and to object to certain processing. To exercise rights or request account deletion, contact <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a> or use <Link to="/legal/contact">Contact &amp; grievance</Link>. We will verify requests and respond within reasonable timelines (typically up to 30 days for standard requests, subject to legal exceptions).
        </p>
        <p>
          Deletion may be limited where we must retain certain records for security, billing disputes, or legal compliance. Enterprise accounts may require coordination with your organization&apos;s administrator.
        </p>
      </section>

      <section>
        <h2>10. International transfers</h2>
        <p>
          Our service providers may process data in multiple regions. We implement appropriate safeguards consistent with applicable law and vendor arrangements.
        </p>
      </section>

      <section>
        <h2>11. Children</h2>
        <p>
          LikhitAI is intended for educational use under appropriate institutional supervision. Schools and enterprises are responsible for obtaining any required parental or guardian consent for minors, consistent with local law.
        </p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>
          We may update this Privacy Policy. Material changes will be reflected by the &quot;Last updated&quot; date and, where appropriate, additional notice in-product.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          Privacy inquiries: <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>
          <br />
          General support: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          <br />
          <Link to="/legal/contact">Legal, privacy &amp; grievance desk</Link>
        </p>
      </section>
    </LegalPageShell>
  );
}
