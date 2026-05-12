import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';

export default function AcceptableUsePolicyPage() {
  return (
    <LegalPageShell
      title="Acceptable Use Policy"
      description="LikhitAI acceptable use: integrity, security, chat moderation, and enforcement."
    >
      <section>
        <h2>1. Fair and lawful use</h2>
        <p>Use LikhitAI only for lawful educational and professional purposes consistent with your agreements and institutional policies.</p>
      </section>

      <section>
        <h2>2. Exam and assessment integrity</h2>
        <ul>
          <li>Do not cheat, collude without authorization, or misrepresent identity.</li>
          <li>Do not tamper with proctoring, timers, or submission flows.</li>
          <li>Do not share live exam items publicly while an assessment window is open if that violates instructor rules.</li>
        </ul>
      </section>

      <section>
        <h2>3. Security</h2>
        <ul>
          <li>Do not probe, scan, or attack the platform or other users&apos; accounts.</li>
          <li>Do not upload malware or abusive content.</li>
          <li>Report vulnerabilities through coordinated disclosure channels provided by LikhitAI.</li>
        </ul>
      </section>

      <section>
        <h2>4. Communications and chat moderation</h2>
        <p>
          Group and class chat features may be moderated automatically (including keyword lists and rate limits) and by authorized moderators. Violations may lead to warnings, muting, removal of messages, suspension, or referral to an institution.
        </p>
      </section>

      <section>
        <h2>5. AI and content</h2>
        <p>
          Do not use the service to generate unlawful content, infringe copyright at scale, or harass individuals. Respect intellectual property when uploading materials used to generate exams.
        </p>
      </section>

      <section>
        <h2>6. Enforcement</h2>
        <p>
          We may throttle, suspend, or terminate access; remove content; notify institutions; or cooperate with law enforcement as required. See <Link to="/terms">Terms &amp; Conditions</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
