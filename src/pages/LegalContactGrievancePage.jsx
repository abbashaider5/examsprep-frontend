import LegalPageShell from '../components/LegalPageShell.jsx';
import {
  ENTERPRISE_SUPPORT_EMAIL,
  GRIEVANCE_EMAIL,
  LEGAL_PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from '../config/legalContact.js';

export default function LegalContactGrievancePage() {
  return (
    <LegalPageShell
      title="Contact & Grievance"
      description="Reach LikhitAI support, privacy, grievances, enterprise desk, and data deletion requests."
    >
      <section>
        <h2>1. General product support</h2>
        <p>
          For bugs, billing questions, and how-to help: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p className="text-[11px]">Typical first response: within <strong>2 business days</strong> for standard issues (subject to volume).</p>
      </section>

      <section>
        <h2>2. Privacy and data protection</h2>
        <p>
          For privacy questions, access/deletion requests, and DPIA-related inquiries: <a href={`mailto:${LEGAL_PRIVACY_EMAIL}`}>{LEGAL_PRIVACY_EMAIL}</a>
        </p>
        <p className="text-[11px]">We aim to acknowledge privacy requests within <strong>7 days</strong> and complete verifiable requests within <strong>30 days</strong> where feasible.</p>
      </section>

      <section>
        <h2>3. Grievances (harassment, abuse, integrity)</h2>
        <p>
          To report harassment, hate, cheating rings, or serious misuse: <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>
        </p>
        <p>Include relevant links, timestamps, and screenshots if safe to share. We may coordinate with your institution for school-related matters.</p>
      </section>

      <section>
        <h2>4. Enterprise and security</h2>
        <p>
          For procurement, security questionnaires, and enterprise onboarding: <a href={`mailto:${ENTERPRISE_SUPPORT_EMAIL}`}>{ENTERPRISE_SUPPORT_EMAIL}</a>
        </p>
      </section>

      <section>
        <h2>5. Data deletion</h2>
        <p>
          Send deletion requests from the account email where possible. We verify identity to prevent unauthorized erasure. Some records may be retained where law or dispute resolution requires.
        </p>
      </section>

      <section>
        <h2>6. Postal / legal notices</h2>
        <p>
          If your jurisdiction requires a physical address for legal service, add your registered business address here in your deployment configuration. For the public site, maintain the address in your organization&apos;s imprint as applicable.
        </p>
      </section>
    </LegalPageShell>
  );
}
