import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';
import { SUPPORT_EMAIL } from '../config/legalContact.js';

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      description="LikhitAI terms of service: acceptable use, exam integrity, AI proctoring, subscriptions, enterprise responsibilities, and limitations."
    >
      <section>
        <h2>1. Agreement</h2>
        <p>
          By accessing or using LikhitAI (&quot;LikhitAI&quot;, &quot;we&quot;, &quot;us&quot;, &quot;the platform&quot;), you agree to these Terms &amp; Conditions and our <Link to="/privacy">Privacy Policy</Link>, <Link to="/legal/cookies">Cookie Policy</Link>, and applicable supplemental policies linked from the platform. If you do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2>2. Educational use and account responsibilities</h2>
        <p>
          You must provide accurate registration information and keep credentials confidential. You are responsible for all activity under your account. Organizations are responsible for how they configure access for staff and students and for complying with their own policies and laws.
        </p>
      </section>

      <section>
        <h2>3. Exam integrity and prohibited conduct</h2>
        <p>You must not:</p>
        <ul>
          <li>Attempt to cheat, impersonate another person, or submit work that is not your own in assessed contexts without authorization.</li>
          <li>Bypass, disable, interfere with, or spoof AI proctoring, timers, fullscreen requirements, or monitoring controls.</li>
          <li>Use the platform to distribute malware, scrape or overload systems, reverse engineer except as permitted by law, or exfiltrate others&apos; data.</li>
          <li>Harass, threaten, or abuse others in any product channel. Automated and human moderation—including keyword and policy checks—may apply to chat and similar features.</li>
          <li>Misuse AI outputs to generate unlawful, harmful, or deceptive content, or to infringe intellectual property.</li>
        </ul>
        <p>
          We may investigate suspected misuse, suspend or terminate accounts, remove content, withhold certificates, invalidate attempts, or cooperate with institutions and law enforcement where required.
        </p>
      </section>

      <section>
        <h2>4. AI monitoring agreement</h2>
        <p>
          Proctored exams may use camera, microphone, browser, and fullscreen monitoring as disclosed at exam start and in our <Link to="/legal/ai-proctoring">AI Proctoring Consent Policy</Link> and <Link to="/legal/student-monitoring">Student Monitoring Disclosure</Link>. By starting a proctored exam after providing required consent, you agree to that processing.
        </p>
      </section>

      <section>
        <h2>5. Subscriptions, billing, and refunds</h2>
        <p>
          Paid plans, limits, and renewal terms are presented at purchase. Taxes and currency depend on your payment method and region. Refund and cancellation rules are set out in our <Link to="/legal/refunds">Refund &amp; Cancellation Policy</Link>. Billing questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>6. Enterprise responsibilities</h2>
        <p>
          Enterprise and school customers are responsible for lawful basis to process student and staff data on the platform, for notices they provide to end users, and for roster accuracy. Administrators should review <Link to="/legal/enterprise-security">Enterprise Data &amp; Security Information</Link> and configure features consistent with internal policy.
        </p>
      </section>

      <section>
        <h2>7. User-generated content</h2>
        <p>
          You retain rights in content you create, subject to the license needed for us to host, process, back up, and display it to deliver the service (including AI generation and analytics). You represent that you have rights to materials you upload (e.g. PDF resources). We may remove content that violates law or these Terms.
        </p>
      </section>

      <section>
        <h2>8. AI-generated content disclaimer</h2>
        <p>
          AI-generated questions and feedback may contain errors. Instructors should review content before high-stakes use. LikhitAI does not warrant fitness for a particular academic accreditation.
        </p>
      </section>

      <section>
        <h2>9. Certificates</h2>
        <p>
          Certificates evidence completion on the platform unless otherwise labeled. They are not a substitute for accredited qualifications unless explicitly stated by your institution.
        </p>
      </section>

      <section>
        <h2>10. Suspension and termination</h2>
        <p>
          We may suspend or terminate access for breach of Terms, risk to security, non-payment, or legal requirement. You may stop using the service at any time; certain data retention applies as described in our policies.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, LikhitAI and its suppliers are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill. Our aggregate liability for any claim relating to the service is limited to the greater of (a) amounts you paid us for the service in the three months before the event giving rise to liability or (b) a nominal cap where no fees applied—except where prohibited by law.
        </p>
        <p>The service is provided &quot;as is&quot; without warranties of merchantability or fitness for a particular purpose, to the extent permitted by law.</p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>
          We may modify these Terms. Continued use after updates constitutes acceptance of the revised Terms where permitted by law.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          <Link to="/legal/contact">Legal &amp; grievance contact</Link> · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </section>
    </LegalPageShell>
  );
}
