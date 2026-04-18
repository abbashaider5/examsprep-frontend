import { Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
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
    if (paste.length === 6) {
      setOtp(paste.split(''));
      inputs.current[5]?.focus();
    }
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
      toast.success('New OTP sent! Check your email.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
          <ShieldCheck size={28} className="text-[var(--color-primary)]" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Verify your identity</h1>
      <p className="text-[var(--color-text-muted)] text-sm text-center mb-6">
        We sent a 6-digit code to <span className="font-semibold text-[var(--color-text)]">{email}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-11 h-14 text-center text-xl font-bold input rounded-xl"
            />
          ))}
        </div>

        {verifyMut.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
            {verifyMut.error.response?.data?.message || 'Verification failed'}
          </div>
        )}

        <button type="submit" disabled={verifyMut.isPending || otp.join('').length < 6} className="btn-primary w-full py-3">
          {verifyMut.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying...
            </span>
          ) : 'Verify & Sign In'}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-1">
        {countdown > 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            Resend available in <span className="font-semibold tabular-nums">{countdown}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-semibold hover:underline disabled:opacity-50"
          >
            <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
            {resending ? 'Resending…' : 'Resend OTP'}
          </button>
        )}
        <p className="text-xs text-[var(--color-text-muted)]">Code expires in 10 minutes · Check spam if not received</p>
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
    login.mutate(form, {
      onSuccess: (res) => {
        if (res.data.requiresOTP) setOtpEmail(form.email);
      },
    });
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (otpEmail) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <OTPInput email={otpEmail} purpose="login" onVerify={verifyOtp.mutate} verifyMut={verifyOtp} />
        <button onClick={() => setOtpEmail(null)} className="w-full text-center text-sm text-[var(--color-text-muted)] hover:underline mt-4 block">
          ← Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full max-w-sm mx-auto">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Welcome back</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-8">Sign in to continue your learning journey</p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="label">Email address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className={`input pl-9 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
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
          <label className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              className={`input pl-9 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              autoComplete="current-password"
            />
            <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>

        {login.error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {login.error.response?.data?.message || 'Login failed. Please try again.'}
          </div>
        )}

        <button type="submit" disabled={login.isPending} className="btn-primary w-full py-3 mt-2">
          {login.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : 'Sign In'}
        </button>
      </form>

      <p className="text-sm text-center text-[var(--color-text-muted)] mt-5">
        Don't have an account?{' '}
        <Link to="/signup" className="text-[var(--color-primary)] font-semibold hover:underline">Sign up free</Link>
      </p>
    </div>
  );
}
