import { Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const CONTACT_TYPES = ['Individual', 'Instructor', 'Institute'];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', type: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.type || !form.message) {
      toast.error('Please fill in all fields');
      return;
    }
    setSent(true);
    toast.success('Message sent! We\'ll get back to you soon.');
    setForm({ name: '', email: '', type: '', message: '' });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="text-center mb-10">
        <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare size={26} className="text-[var(--color-primary)]" />
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--color-text)] mb-2">Get in Touch</h1>
        <p className="text-[var(--color-text-muted)]">Have a question, feedback, or partnership inquiry? We'd love to hear from you.</p>
      </div>

      {/* Contact info bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
          <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
            <Mail size={16} className="text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Email us</p>
            <a href="mailto:contact@abbaslogic.com" className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
              contact@abbaslogic.com
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
          <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center shrink-0">
            <Phone size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)]">Call / WhatsApp</p>
            <a href="tel:+919517771770" className="text-sm font-semibold text-[var(--color-text)] hover:text-green-600 transition-colors">
              +91 9517771770
            </a>
          </div>
        </div>
      </div>

      <div className="card">
        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">✉️</div>
            <h3 className="font-bold text-[var(--color-text)] text-lg mb-1">Message Sent!</h3>
            <p className="text-[var(--color-text-muted)] text-sm">We'll get back to you within 24 hours.</p>
            <button onClick={() => setSent(false)} className="mt-4 text-sm text-[var(--color-primary)] font-semibold hover:underline">
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Your Name</label>
                <input
                  className="input"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={set('name')}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
            </div>

            <div>
              <label className="label">I am reaching out as</label>
              <select
                className="input"
                value={form.type}
                onChange={set('type')}
              >
                <option value="">Select type…</option>
                {CONTACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Message</label>
              <textarea
                className="input min-h-28 resize-none"
                placeholder="How can we help you?"
                value={form.message}
                onChange={set('message')}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <Send size={16} /> Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
