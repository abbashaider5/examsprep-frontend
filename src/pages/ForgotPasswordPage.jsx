import { CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../services/api.js';

// ── Step indicators ────────────────────────────────────────────────────────────
function Steps({ current }) {
  const steps = ['Email', 'Verify', 'Reset', 'Done'];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-[var(--color-primary)] text-white' :
                active ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-2 border-[var(--color-primary)]' :
                'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-10 h-px mb-4 mx-1 ${done ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── OTP digit input ────────────────────────────────────────────────────────────
function OTPInput({ onComplete }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    const code = next.join('');
    if (code.length === 6) onComplete(code);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setDigits(paste.split(''));
      refs.current[5]?.focus();
      onComplete(paste);
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-11 h-13 text-center text-xl font-bold input rounded-xl"
          style={{ height: '3.25rem' }}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}

// ── Password strength meter ────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'Number or symbol', pass: /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-[var(--color-border)]'}`} />
        ))}
      </div>
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          {checks.map(c => (
            <p key={c.label} className={`text-[10px] flex items-center gap-1 ${c.pass ? 'text-green-500' : 'text-[var(--color-text-muted)]'}`}>
              <span>{c.pass ? '✓' : '·'}</span> {c.label}
            </p>
          ))}
        </div>
        {score > 0 && (
          <span className={`text-xs font-semibold ${colors[score - 1].replace('bg-', 'text-')}`}>
            {labels[score - 1]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(0); // 0: email, 1: otp, 2: new password, 3: success
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [resending, setResending] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Step 0: request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const emailSchema = z.string().email('Enter a valid email address');
    const parse = emailSchema.safeParse(email);
    if (!parse.success) { setEmailError(parse.error.errors[0].message); return; }
    setEmailError('');
    setRequestMessage('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setRequestMessage(res?.data?.message || 'A reset code has been sent to your email address.');
      setCountdown(60);
      setStep(1);
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Unable to process this request right now.');
    } finally { setLoading(false); }
  };

  // Step 1: verify OTP
  const handleOtpComplete = (code) => setOtpValue(code);

  const handleOtpSubmit = async (e) => {
    e?.preventDefault();
    if (otpValue.length < 6) { setOtpError('Enter all 6 digits'); return; }
    setOtpError('');
    // We don't pre-verify the OTP here — just advance to password step
    // The OTP will be validated server-side on reset
    setStep(2);
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setRequestMessage(res?.data?.message || 'A new reset code has been sent to your email address.');
      setCountdown(60);
      setOtpValue('');
      setOtpError('');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Unable to resend code right now.');
    } finally { setResending(false); }
  };

  // Step 2: reset password
  const passwordSchema = z.object({
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  }).refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const parse = passwordSchema.safeParse({ password, confirmPassword });
    if (!parse.success) {
      const errs = {};
      parse.error.errors.forEach(err => { errs[err.path[0]] = err.message; });
      setPasswordErrors(errs);
      return;
    }
    setPasswordErrors({});
    setLoading(true);
    try {
      await authApi.resetPassword({ email, otp: otpValue, newPassword: password });
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. Check your code and try again.';
      // If OTP is wrong, send user back to OTP step
      if (msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('code') || msg.toLowerCase().includes('expired')) {
        setOtpError(msg);
        setOtpValue('');
        setStep(1);
      } else {
        setPasswordErrors({ submit: msg });
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="animate-fade-in w-full">
      <Steps current={step} />

      {/* ── Step 0: Email ── */}
      {step === 0 && (
        <>
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <KeyRound size={22} className="text-[var(--color-primary)]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Forgot password?</h1>
          <p className="text-[var(--color-text-muted)] text-sm text-center mb-7">
            Enter your email and we'll send a reset code.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  className={`input pl-9 ${emailError ? 'border-red-400' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl font-semibold">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</span>
                : 'Send Reset Code'}
            </button>
          </form>
          <p className="text-sm text-center text-[var(--color-text-muted)] mt-6">
            Remember it?{' '}
            <Link to="/login" className="text-[var(--color-primary)] font-semibold hover:underline">Sign in</Link>
          </p>
        </>
      )}

      {/* ── Step 1: OTP ── */}
      {step === 1 && (
        <>
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <ShieldCheck size={22} className="text-[var(--color-primary)]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Check your email</h1>
          <p className="text-[var(--color-text-muted)] text-sm text-center mb-7">
            We sent a 6-digit code to <span className="font-medium text-[var(--color-text)]">{email}</span>
          </p>
          {requestMessage && (
            <p className="text-xs text-center bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2.5 text-blue-700 dark:text-blue-300 mb-4">
              {requestMessage}
            </p>
          )}
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <OTPInput onComplete={handleOtpComplete} />
            {otpError && <p className="text-red-500 text-sm text-center">{otpError}</p>}
            <button
              type="submit"
              disabled={otpValue.length < 6}
              className="btn-primary w-full py-3 rounded-xl font-semibold"
            >
              Continue
            </button>
          </form>
          <div className="mt-5 text-center space-y-1">
            {countdown > 0
              ? <p className="text-xs text-[var(--color-text-muted)]">Resend in <span className="tabular-nums font-semibold">{countdown}s</span></p>
              : <button onClick={handleResend} disabled={resending} className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] font-semibold hover:underline mx-auto disabled:opacity-50">
                  <RefreshCw size={11} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Sending…' : 'Resend code'}
                </button>
            }
            <p className="text-xs text-[var(--color-text-muted)]">Expires in 10 min · Check spam</p>
          </div>
          <button onClick={() => setStep(0)} className="w-full text-center text-sm text-[var(--color-text-muted)] hover:underline mt-4">
            ← Use a different email
          </button>
        </>
      )}

      {/* ── Step 2: New password ── */}
      {step === 2 && (
        <>
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <Lock size={22} className="text-[var(--color-primary)]" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] text-center mb-1">Create new password</h1>
          <p className="text-[var(--color-text-muted)] text-sm text-center mb-7">
            Choose a strong password for your account.
          </p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">New password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  className={`input pl-9 pr-10 ${passwordErrors.password ? 'border-red-400' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordErrors(p => ({ ...p, password: '' })); }}
                  autoComplete="new-password"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {passwordErrors.password && <p className="text-red-500 text-xs mt-1">{passwordErrors.password}</p>}
              <PasswordStrength password={password} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Confirm password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  className={`input pl-9 pr-10 ${passwordErrors.confirmPassword ? 'border-red-400' : ''}`}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordErrors(p => ({ ...p, confirmPassword: '' })); }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {passwordErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword}</p>}
            </div>

            {passwordErrors.submit && (
              <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                {passwordErrors.submit}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-xl font-semibold">
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</span>
                : 'Update Password'}
            </button>
          </form>
        </>
      )}

      {/* ── Step 3: Success ── */}
      {step === 3 && (
        <div className="text-center animate-fade-in">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Password updated!</h1>
          <p className="text-[var(--color-text-muted)] text-sm mb-8">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
          <Link to="/login" className="btn-primary w-full py-3 rounded-xl font-semibold block text-center">
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
