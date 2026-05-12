import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';
import { SUPPORT_EMAIL } from '../config/legalContact.js';

export default function RefundCancellationPolicyPage() {
  return (
    <LegalPageShell
      title="Refund & Cancellation Policy"
      description="LikhitAI refund and cancellation terms for subscriptions, enterprise billing, and dispute handling."
    >
      <section>
        <h2>1. Scope</h2>
        <p>This policy applies to paid subscriptions and enterprise arrangements purchased through LikhitAI or authorized channels. Free-tier usage is not billed.</p>
      </section>

      <section>
        <h2>2. Subscription cancellation</h2>
        <p>
          You may cancel recurring subscriptions through the billing controls available on your account or via your payment provider where applicable. Cancellation stops future renewals; access typically continues until the end of the current paid period unless otherwise stated at purchase.
        </p>
      </section>

      <section>
        <h2>3. Refunds — consumer-style purchases</h2>
        <p>
          If you believe you were charged in error or a payment duplicated, contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within <strong>7 days</strong> of the charge with your account email, invoice or transaction reference, and a short description. We will investigate in good faith. Approved refunds for card/UPI/wallet payments are processed through our payment partner and may take several business days to appear.
        </p>
        <p>
          Where mandatory consumer laws grant a cooling-off or statutory refund right, those rights apply in addition to this policy.
        </p>
      </section>

      <section>
        <h2>4. Enterprise and school contracts</h2>
        <p>
          Enterprise customers may be subject to a separate order form, statement of work, or master agreement. In case of conflict, the executed enterprise agreement prevails over this general policy for that customer.
        </p>
      </section>

      <section>
        <h2>5. Non-refundable items</h2>
        <p>
          Certain professional services, custom integrations, or third-party pass-through fees may be identified as non-refundable at order time. Partial refunds for partially used billing periods are generally not offered except where required by law or explicit promotion terms.
        </p>
      </section>

      <section>
        <h2>6. Chargebacks</h2>
        <p>
          Please contact support before initiating a chargeback so we can resolve billing issues quickly. Unfounded chargebacks may result in account suspension pending review.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> · <Link to="/legal/contact">Legal &amp; grievance desk</Link>
        </p>
      </section>
    </LegalPageShell>
  );
}
