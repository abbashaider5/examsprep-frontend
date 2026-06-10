import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import ReCAPTCHA from 'react-google-recaptcha';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import GoogleAccountTypeStep from '../components/onboarding/GoogleAccountTypeStep.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { authApi, settingsApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { completeAuthSession, isLogin2FAResponse } from '../utils/authSession.js';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

function TwoFactorMethodPicker({ email, methods, pendingToken, onBack }) {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const selectMethod = async (method) => {
    setLoading(method);
    setError('');
    try {
      const res = await authApi.begin2FA({ pendingToken, method });
      if (res.data.requiresTOTP) {
        onBack.setTotpSession({ pendingToken: res.data.pendingToken, email: res.data.email || email });
        onBack.setTwoFactorChoice(null);
      } else if (res.data.requiresOTP) {
        onBack.setOtpEmail(res.data.email || email);
        onBack.setTwoFactorChoice(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not start verification. Try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <ShieldCheck size={24} className="text-[var(--color-primary)]" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Verify your identity</h1>
      <p className="text-[var(--color-text-muted)] text-sm text-center mb-6">
        Choose how you&apos;d like to verify <span className="font-medium text-[var(--color-text)]">{email}</span>
      </p>
      <div className="space-y-3">
        {methods.includes('email') && (
          <button
            type="button"
            onClick={() => selectMethod('email')}
            disabled={!!loading}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Mail size={18} className="text-[var(--color-primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">Email code</p>
              <p className="text-xs text-[var(--color-text-muted)]">Send a 6-digit code to your inbox</p>
            </div>
            {loading === 'email' && (
              <span className="w-4 h-4 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
            )}
          </button>
        )}
        {methods.includes('totp') && (
          <button
            type="button"
            onClick={() => selectMethod('totp')}
            disabled={!!loading}
            className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-subtle)] transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
              <Smartphone size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">Authenticator app</p>
              <p className="text-xs text-[var(--color-text-muted)]">Enter the code from your app</p>
            </div>
            {loading === 'totp' && (
              <span className="w-4 h-4 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
            )}
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm text-center mt-4">{error}</p>}
    </div>
  );
}

function TOTPInput({ email, pendingToken, onVerify, verifyMut }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef([]);

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
    onVerify({ pendingToken, code });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <ShieldCheck size={24} className="text-[var(--color-primary)]" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Authenticator code</h1>
      <p className="text-[var(--color-text-muted)] text-sm text-center mb-5">
        Enter the 6-digit code from your authenticator app for <span className="font-medium text-[var(--color-text)]">{email}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            {verifyMut.error.response?.data?.message || 'Invalid verification code.'}
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
    </div>
  );
}

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
      <div className="flex justify-center mb-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <ShieldCheck size={24} className="text-[var(--color-primary)]" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Check your email</h1>
      <p className="text-[var(--color-text-muted)] text-sm text-center mb-5">
        We sent a 6-digit code to <span className="font-medium text-[var(--color-text)]">{email}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
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

      <div className="mt-4 text-center space-y-1">
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
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const { login, google, verifyOtp, verifyTotp, needsAccountType } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const [otpEmail, setOtpEmail] = useState(null);
  const [totpSession, setTotpSession] = useState(null);
  const [twoFactorChoice, setTwoFactorChoice] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const { data: publicSettings } = useQuery({
    queryKey: ['publicSettings'],
    queryFn: () => settingsApi.getPublic().then((r) => r.data),
    staleTime: 60_000,
  });
  const recaptchaEnforced = !!publicSettings?.recaptchaEnforced;
  const mustSolveRecaptcha = recaptchaEnforced && !!recaptchaSiteKey;

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
    if (recaptchaEnforced && !recaptchaSiteKey) {
      toast.error(
        'Server enforces reCAPTCHA but the browser has no site key. Add VITE_RECAPTCHA_SITE_KEY (client .env), turn reCAPTCHA off in Admin, or remove RECAPTCHA_SECRET_KEY from the server until keys are set.',
      );
      return;
    }
    if (mustSolveRecaptcha && !recaptchaToken) {
      toast.error('Please complete the reCAPTCHA.');
      return;
    }
    login.mutate(
      { ...form, recaptchaToken: mustSolveRecaptcha ? recaptchaToken : undefined },
      {
        onSuccess: (res) => {
          const data = res.data;
          if (data.requires2FA) {
            setTwoFactorChoice({
              pendingToken: data.pendingToken,
              email: data.email || form.email,
              methods: data.methods || [],
            });
            return;
          }
          if (data.requiresTOTP) {
            setTotpSession({ pendingToken: data.pendingToken, email: data.email || form.email });
            return;
          }
          if (data.requiresOTP) {
            setOtpEmail(data.email || form.email);
            return;
          }
          if (!isLogin2FAResponse(data) && completeAuthSession(data, { setUser, navigate, toast })) {
            toast.success('Welcome back!');
          }
        },
      },
    );
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (needsAccountType) {
    return <GoogleAccountTypeStep />;
  }

  if (twoFactorChoice) {
    return (
      <div className="w-full">
        <TwoFactorMethodPicker
          email={twoFactorChoice.email}
          methods={twoFactorChoice.methods}
          pendingToken={twoFactorChoice.pendingToken}
          onBack={{ setTotpSession, setOtpEmail, setTwoFactorChoice }}
        />
        <button onClick={() => setTwoFactorChoice(null)} className="w-full text-center text-sm text-[var(--color-text-muted)] hover:underline mt-4">
          ← Back to sign in
        </button>
      </div>
    );
  }

  if (totpSession) {
    return (
      <div className="w-full">
        <TOTPInput
          email={totpSession.email}
          pendingToken={totpSession.pendingToken}
          onVerify={verifyTotp.mutate}
          verifyMut={verifyTotp}
        />
        <button onClick={() => setTotpSession(null)} className="w-full text-center text-sm text-[var(--color-text-muted)] hover:underline mt-4">
          ← Back
        </button>
      </div>
    );
  }

  if (otpEmail) {
    return (
      <div className="w-full">
        <OTPInput email={otpEmail} purpose="login" onVerify={verifyOtp.mutate} verifyMut={verifyOtp} />
        <button onClick={() => setOtpEmail(null)} className="w-full text-center text-sm text-[var(--color-text-muted)] hover:underline mt-4">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">Welcome back</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-4">Sign in to continue learning</p>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Email</label>
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-[var(--color-text)]">Password</label>
            <Link to="/forgot-password" className="text-xs text-[var(--color-primary)] hover:underline font-medium">
              Forgot password?
            </Link>
          </div>
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
          <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {login.error.response?.data?.message || 'Login failed. Try again.'}
          </p>
        )}

        {mustSolveRecaptcha && (
          <div className="flex justify-center py-0.5">
            <div className="h-[112px] w-[128px] overflow-hidden rounded-lg">
              <div className="origin-top-left scale-[0.78] sm:scale-[0.82]">
              <ReCAPTCHA
                sitekey={recaptchaSiteKey}
                size="compact"
                onChange={(token) => setRecaptchaToken(token)}
                onExpired={() => setRecaptchaToken(null)}
              />
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={login.isPending} className="btn-primary w-full py-2.5 rounded-xl font-semibold">
          {login.isPending
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span>
            : 'Sign In'}
        </button>
      </form>

      <div className="my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <GoogleAuthButton
        label=""
        disabled={google.isPending}
        onCredential={(payload) => {
          google.mutate(payload, {
            onSuccess: (res) => {
              const data = res.data;
              if (data.requires2FA) {
                setTwoFactorChoice({
                  pendingToken: data.pendingToken,
                  email: data.email,
                  methods: data.methods || [],
                });
                return;
              }
              if (data.requiresTOTP) {
                setTotpSession({ pendingToken: data.pendingToken, email: data.email });
                return;
              }
              if (data.requiresOTP) {
                setOtpEmail(data.email);
              }
            },
          });
        }}
      />

      <p className="text-sm text-center text-[var(--color-text-muted)] mt-4">
        No account?{' '}
        <Link to="/signup" className="text-[var(--color-primary)] font-semibold hover:underline">Create one free</Link>
      </p>
    </div>
  );
}
