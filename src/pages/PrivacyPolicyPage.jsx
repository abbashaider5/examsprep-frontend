import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            <Shield size={13} /> Legal
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--color-text)] mb-2">Privacy Policy</h1>
          <p className="text-[var(--color-text-muted)] text-sm">Last updated: April 2026</p>
        </div>

        <div className="prose-like space-y-8 text-[var(--color-text)]">

          <section>
            <h2 className="text-lg font-bold mb-2">1. Information We Collect</h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
              When you create an account, we collect your name, email address, and password (hashed). When you take exams, we store your answers, scores, and time taken. If proctoring is enabled, we may capture webcam snapshots during the exam session. Payment information is processed securely by Razorpay — we do not store your card details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">2. How We Use Your Information</h2>
            <ul className="text-[var(--color-text-muted)] text-sm space-y-1.5 list-disc list-inside leading-relaxed">
              <li>To provide, maintain, and improve the platform.</li>
              <li>To generate and display your exam results and certificates.</li>
              <li>To send transactional emails (OTP, results, payment receipts).</li>
              <li>To display personalised AI study recommendations.</li>
              <li>To detect and prevent fraud or misuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">3. Data Storage & Security</h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
              Your data is stored on MongoDB Atlas with encryption at rest. Passwords are bcrypt-hashed and never stored in plain text. Access tokens are short-lived and transmitted over HTTPS only. We follow OWASP security best practices and perform regular dependency audits.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">4. Cookies</h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
              We use HttpOnly, Secure cookies to manage authentication sessions (access token and refresh token). These are essential for the platform to function and cannot be disabled. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">5. Third-Party Services</h2>
            <ul className="text-[var(--color-text-muted)] text-sm space-y-1.5 list-disc list-inside leading-relaxed">
              <li><strong>Razorpay</strong> — payment processing (PCI-DSS compliant).</li>
              <li><strong>Groq AI</strong> — exam question generation (no personal data is sent).</li>
              <li><strong>Resend</strong> — transactional email delivery.</li>
              <li><strong>MongoDB Atlas</strong> — cloud database hosting.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">6. Data Retention</h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
              We retain your account data for as long as your account is active. Exam results and certificates are kept indefinitely so you can access them at any time. You may request deletion of your account and all associated data by contacting us at the email below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">7. Your Rights</h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
              You have the right to access, correct, or delete your personal data. To exercise these rights, contact us using the information below. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">8. Changes to This Policy</h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
              We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. Continued use of the platform after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">9. Contact Us</h2>
            <p className="text-[var(--color-text-muted)] leading-relaxed text-sm">
              For privacy-related questions or data requests, contact us via the <a href="/contact" className="text-[var(--color-primary)] hover:underline">Contact page</a> or connect with Abbas Haider on <a href="https://www.linkedin.com/in/abbashaider14/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">LinkedIn</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
