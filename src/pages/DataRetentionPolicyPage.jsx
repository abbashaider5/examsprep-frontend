import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';
import { SCREENSHOT_RETENTION_DAYS } from '../utils/screenshotRetention.js';

export default function DataRetentionPolicyPage() {
  return (
    <LegalPageShell
      title="Data Retention Policy"
      description="LikhitAI retention periods for exams, results, proctoring screenshots, soft warnings, analytics, and enterprise data."
    >
      <section>
        <h2>1. Overview</h2>
        <p>
          We retain data only as long as needed to provide the service, meet legal obligations, resolve disputes, and enforce agreements. Exact periods may depend on your plan, organization settings, and backups.
        </p>
      </section>

      <section>
        <h2>2. Accounts and profiles</h2>
        <p>Account data is retained while your account is active and for a reasonable period after closure for security, audit, and legal compliance.</p>
      </section>

      <section>
        <h2>3. Exams, attempts, and results</h2>
        <p>
          Exam definitions, student answers, scores, and instructor-visible reports are retained so users and organizations can access historical performance unless deletion is requested and permitted.
        </p>
      </section>

      <section>
        <h2>4. Proctoring — serious / hard warnings</h2>
        <p>
          Timeline events associated with serious integrity signals may be stored on the exam attempt record for instructor review. Where screenshot evidence is captured, image files are retained for approximately <strong>{SCREENSHOT_RETENTION_DAYS} days</strong> and then removed by automated cleanup. Metadata needed for aggregate reporting may persist longer in summarized or de-identified form.
        </p>
      </section>

      <section>
        <h2>5. Proctoring — soft warnings</h2>
        <p>
          Soft in-exam reminders are designed not to create stored timeline entries or screenshot evidence in the soft-warning path, reducing noise and storage while still guiding the candidate live.
        </p>
      </section>

      <section>
        <h2>6. Logs and security</h2>
        <p>
          Security, application, and infrastructure logs may be retained for operational detection and forensics. These logs are access-controlled and not used for unrelated profiling.
        </p>
      </section>

      <section>
        <h2>7. Enterprise isolation</h2>
        <p>
          Enterprise customers&apos; administrative and roster data is segregated logically in the application layer; retention follows customer configuration and contract where applicable. See <Link to="/legal/enterprise-security">Enterprise Data &amp; Security Information</Link>.
        </p>
      </section>

      <section>
        <h2>8. Automatic cleanup</h2>
        <p>
          Scheduled jobs remove expired proctoring screenshot artifacts from primary storage and attached media services. Backups may persist for a shorter additional window consistent with backup rotation policy.
        </p>
      </section>

      <section>
        <h2>9. Deletion requests</h2>
        <p>
          See <Link to="/legal/contact">Contact &amp; grievance</Link> for data subject requests.
        </p>
      </section>
    </LegalPageShell>
  );
}
