import { Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { contactApi } from '../services/api.js';

const CONTACT_TYPES = ['Individual', 'Instructor', 'Institute', 'Other'];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', type: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email is required';
    if (!form.type) e.type = 'Please select a type';
    if (!form.message.trim() || form.message.trim().length < 10) e.message = 'Message must be at least 10 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await contactApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        type: form.type,
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: '', email: '', type: '', message: '' });
      toast.success('Message sent! We\'ll get back to you soon.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  return (
    <div className="bg-[var(--color-bg)] min-h-screen">
      {/* Soft gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-blue-100/50 via-indigo-50/20 to-transparent dark:from-blue-900/15 dark:to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MessageSquare size={26} className="text-[var(--color-primary)]" />
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--color-text)] mb-2">Get in Touch</h1>
          <p className="text-[var(--color-text-muted)]">Have a question, feedback, or partnership inquiry? We'd love to hear from you.</p>
        </div>

        {/* Contact info bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
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
          <div className="flex items-center gap-3 p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm">
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

        <div className="card shadow-sm">
          {sent ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">✉️</div>
              <h3 className="font-bold text-[var(--color-text)] text-lg mb-1">Message Received!</h3>
              <p className="text-[var(--color-text-muted)] text-sm mb-1">We'll get back to you within 24 hours.</p>
              <p className="text-xs text-[var(--color-text-muted)]">Check your email for a confirmation.</p>
              <button onClick={() => setSent(false)} className="mt-5 text-sm text-[var(--color-primary)] font-semibold hover:underline">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Your Name</label>
                  <input
                    className={`input ${errors.name ? 'border-red-400' : ''}`}
                    placeholder="John Doe"
                    value={form.name}
                    onChange={set('name')}
                    autoComplete="name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    className={`input ${errors.email ? 'border-red-400' : ''}`}
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set('email')}
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>

              <div>
                <label className="label">I am reaching out as</label>
                <select
                  className={`input ${errors.type ? 'border-red-400' : ''}`}
                  value={form.type}
                  onChange={set('type')}
                >
                  <option value="">Select type…</option>
                  {CONTACT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
              </div>

              <div>
                <label className="label">Message</label>
                <textarea
                  className={`input resize-none ${errors.message ? 'border-red-400' : ''}`}
                  style={{ minHeight: '7rem' }}
                  placeholder="How can we help you? (min. 10 characters)"
                  value={form.message}
                  onChange={set('message')}
                  maxLength={2000}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.message
                    ? <p className="text-red-500 text-xs">{errors.message}</p>
                    : <span />}
                  <span className="text-xs text-[var(--color-text-muted)]">{form.message.length}/2000</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 font-semibold rounded-xl disabled:opacity-60"
              >
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</>
                  : <><Send size={16} /> Send Message</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
