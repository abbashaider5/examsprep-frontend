import { Mail, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error('Please fill all fields'); return; }
    setSent(true);
    toast.success('Message sent! We will get back to you soon.');
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 animate-fade-in">
      <div className="text-center mb-10">
        <MessageSquare size={40} className="mx-auto mb-3 text-[var(--color-primary)]" />
        <h1 className="text-3xl font-extrabold text-[var(--color-text)] mb-2">Contact Us</h1>
        <p className="text-[var(--color-text-muted)]">Have questions or feedback? We'd love to hear from you.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input min-h-32 resize-none" placeholder="Tell us how we can help..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <Send size={16} /> Send Message
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--color-border)] flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <Mail size={16} /> support@examprep.ai
        </div>
      </div>
    </div>
  );
}
