import { Link } from 'react-router-dom';
import LegalPageShell from '../components/LegalPageShell.jsx';

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      title="Cookie Policy"
      description="How LikhitAI uses cookies and similar technologies for authentication, sessions, security, and analytics."
    >
      <section>
        <h2>1. What are cookies?</h2>
        <p>Cookies are small text files stored on your device. We also use similar technologies such as local storage where needed for UX or performance.</p>
      </section>

      <section>
        <h2>2. Strictly necessary cookies</h2>
        <p>
          We use cookies that are essential to operate the platform, including authentication and session continuity (for example, secure, HttpOnly cookies for access and refresh tokens where our architecture uses cookie-based auth). These cannot be disabled without breaking login.
        </p>
      </section>

      <section>
        <h2>3. Security and abuse prevention</h2>
        <p>
          We may set short-lived cookies or use storage keys related to CSRF protection, device/session binding, or rate limiting. Server logs may include cookie-related identifiers in aggregated form for security monitoring.
        </p>
      </section>

      <section>
        <h2>4. Analytics</h2>
        <p>
          If we enable product analytics cookies or third-party analytics, they will be described in-product and, where required, offered with appropriate consent controls. You can use browser settings to block non-essential cookies; core features may still require necessary cookies.
        </p>
      </section>

      <section>
        <h2>5. Browser storage</h2>
        <p>
          The application may store preferences (e.g. theme) in local storage. Exam flows may use in-memory or session storage for technical state.
        </p>
      </section>

      <section>
        <h2>6. Managing preferences</h2>
        <p>
          Use your browser&apos;s cookie controls to delete or block cookies. For account-linked processing of personal data, also see our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
