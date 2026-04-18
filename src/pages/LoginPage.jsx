import { Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

function OTPInput({ email, purpose, onVerify, verifyMut }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);
  const [countdown, setCountdown] = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) { setOtp(paste.split('')); inputs.current[5]?.focus(); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) return;
    onVerify({ email, otp: code, purpose });
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      await authApi.requestOtp({ email });
      setCountdown(30);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      toast.success('New code sent.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally { setResending(false); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-center mb-5">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <ShieldCheck size={24} className="text-[var(--color-primary)]" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Check your email</h1>
      <p className="text-[var(--color-text-muted)] text-sm text-center mb-7">
        We sent a 6-digit code to <span className="font-medium text-[var(--color-text)]">{email}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-13 text-center text-xl font-bold input rounded-xl"
              style={{ height: '3.25rem' }}
            />
          ))}
        </div>

        {verifyMut.error && (
          <p className="text-red-500 text-sm text-center">
            {verifyMut.error.response?.data?.message || 'Incorrect code. Try again.'}
          </p>
        )}

        <button
          type="submit"
          disabled={verifyMut.isPending || otp.join('').length < 6}
          className="btn-primary w-full py-3 rounded-xl font-semibold"
        >
          {verifyMut.isPending
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span>
            : 'Verify & Sign In'}
        </button>
      </form>

      <div className="mt-5 text-center space-y-1">
        {countdown > 0
          ? <p className="text-xs text-[var(--color-text-muted)]">Resend in <span className="tabular-nums font-semibold">{countdown}s</span></p>
          : <button onClick={handleResend} disabled={resending} className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-semibold hover:underline mx-auto disabled:opacity-50">
              <RefreshCw size={11} className={resending ? 'animate-spin' : ''} />
              {resending ? 'Sending…' : 'Resend code'}
            </button>}
        <p className="text-xs text-[var(--color-text-muted)]">Expires in 10 min · Check spam</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login, verifyOtp } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [otpEmail, setOtpEmail] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      const fe = {};
      result.error.errors.forEach((e) => { fe[e.path[0]] = e.message; });
      setErrors(fe);
      return;
    }
    setErrors({});
    login.mutate(form, { onSuccess: (res) => { if (res.data.requiresOTP) setOtpEmail(form.email); } });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (otpEmail) {
    return (
      <div className="w-full">
        <OTPInput email={otpEmail} purpose="login" onVerify={verifyOtp.mutate} verifyMut={verifyOtp} />
        <button onClick={() => setOtpEmail(null)} className="w-full text-center text-sm text-[var(--color-text-muted)] hover:underline mt-5">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Welcome back</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-7">Sign in to continue learning</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className={`input pl-9 ${errors.email ? 'border-red-400' : ''}`}
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              autoComplete="email"
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className={`input pl-9 pr-10 ${errors.password ? 'border-red-400' : ''}`}
              type={showPass ? 'text' : 'password'}
              placeholder="Your password"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        {login.error && (
          <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
            {login.error.response?.data?.message || 'Login failed. Try again.'}
          </p>
        )}

        <button type="submit" disabled={login.isPending} className="btn-primary w-full py-3 rounded-xl font-semibold mt-1">
          {login.isPending
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span>
            : 'Sign In'}
        </button>
      </form>

      <p className="text-sm text-center text-[var(--color-text-muted)] mt-6">
        No account?{' '}
        <Link to="/signup" className="text-[var(--color-primary)] font-semibold hover:underline">Create one free</Link>
      </p>
    </div>
  );
}
