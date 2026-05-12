import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';

export default function EnterpriseDataSecurityPage() {
  return (
    <LegalPageShell
      title="Enterprise Data & Security Information"
      description="How LikhitAI approaches enterprise data separation, access control, and security practices for schools and institutes."
    >
      <section>
        <h2>1. Logical separation</h2>
        <p>
          Enterprise accounts are associated with an organization identifier. Application logic routes queries and permissions so teachers and principals ordinarily see only their organization&apos;s users, classes, exams, and reports. We do not market one customer&apos;s exam content to another.
        </p>
      </section>

      <section>
        <h2>2. Roles</h2>
        <p>
          Typical roles include student, instructor, principal (or org admin), and platform administrator. Each role receives the least privilege needed for its function. Impersonation or support access, if used, should be limited, logged, and governed by policy.
        </p>
      </section>

      <section>
        <h2>3. School vs institute modes</h2>
        <p>
          Product modes (for example school-style classes versus batch-style training) may change navigation and data shapes, but the same underlying security principles apply. Customers should choose the mode that matches their operating model.
        </p>
      </section>

      <section>
        <h2>4. Security measures</h2>
        <ul>
          <li>Encryption in transit (HTTPS) and encryption at rest on supported storage tiers.</li>
          <li>Hashed passwords and secure session handling.</li>
          <li>Rate limiting and abuse detection at API boundaries.</li>
          <li>Dependency updates and monitoring aligned with operational maturity.</li>
        </ul>
      </section>

      <section>
        <h2>5. Subprocessors and audits</h2>
        <p>
          Enterprises may request a summary of key subprocessors and security practices for vendor due diligence. Formal SOC reports, if available, may be provided under NDA for qualified customers.
        </p>
      </section>

      <section>
        <h2>6. Incident response</h2>
        <p>
          We maintain procedures to detect, contain, and notify affected customers of security incidents as required by law and contract.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          <Link to="/legal/contact">Enterprise &amp; legal contact</Link>
        </p>
      </section>
    </LegalPageShell>
  );
}
