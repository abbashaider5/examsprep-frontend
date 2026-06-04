import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountTypePicker from './AccountTypePicker.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardPath } from '../../utils/dashboardPath.js';

/**
 * Shown after Google creates a new account — user picks student vs instructor before entering the app.
 */
export default function GoogleAccountTypeStep({ examInviteToken = '', onBack }) {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [accountType, setAccountType] = useState('student');

  const handleContinue = () => {
    completeOnboarding.mutate(
      {
        accountType,
        ...(examInviteToken ? { examInviteToken } : {}),
      },
      {
        onSuccess: (res) => {
          if (res.data.redirectPath) navigate(res.data.redirectPath);
          else navigate(getDashboardPath(res.data.user?.role));
        },
      },
    );
  };

  return (
    <div className="animate-fade-in w-full">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">One more step</h1>
      <p className="text-[var(--color-text-muted)] text-sm mb-5">
        Your Google account is connected. Tell us how you&apos;ll use ExamPrep.
      </p>

      <AccountTypePicker value={accountType} onChange={setAccountType} />

      {completeOnboarding.error && (
        <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mt-4">
          {completeOnboarding.error.response?.data?.message || 'Could not complete setup. Try again.'}
        </p>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={completeOnboarding.isPending}
        className="btn-primary w-full py-2.5 rounded-xl font-semibold mt-5"
      >
        {completeOnboarding.isPending
          ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting up…</span>
          : 'Continue'}
      </button>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full text-center text-sm text-[var(--color-text-muted)] hover:underline mt-4"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
