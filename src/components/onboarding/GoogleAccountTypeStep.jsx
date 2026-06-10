import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AccountTypePicker from './AccountTypePicker.jsx';
import OrganizationPurposePicker from './OrganizationPurposePicker.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardPath } from '../../utils/dashboardPath.js';

/**
 * Post-Google signup: account type, then organization purpose for instructors.
 */
export default function GoogleAccountTypeStep({ examInviteToken = '', onBack }) {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [accountType, setAccountType] = useState('student');
  const [organizationType, setOrganizationType] = useState('school');
  const [step, setStep] = useState(1);

  const handleContinue = () => {
    if (step === 1 && accountType === 'instructor') {
      setStep(2);
      return;
    }

    completeOnboarding.mutate(
      {
        accountType,
        ...(accountType === 'instructor' ? { organizationType } : {}),
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
      <h1 className="text-xl font-semibold text-[var(--color-text)] mb-0.5">
        {step === 1 ? 'Almost done' : 'Your teaching context'}
      </h1>
      <p className="text-[var(--color-text-muted)] text-xs mb-4">
        {step === 1
          ? 'Choose how you\'ll use LikhitAI.'
          : 'We\'ll tailor exam creation to your workflow.'}
      </p>

      {step === 1 ? (
        <AccountTypePicker value={accountType} onChange={setAccountType} />
      ) : (
        <OrganizationPurposePicker value={organizationType} onChange={setOrganizationType} />
      )}

      {completeOnboarding.error && (
        <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mt-4">
          {completeOnboarding.error.response?.data?.message || 'Could not complete setup. Try again.'}
        </p>
      )}

      <div className="flex gap-2 mt-5">
        {(step === 2 || onBack) && (
          <button
            type="button"
            onClick={() => (step === 2 ? setStep(1) : onBack?.())}
            className="btn-secondary flex-1 py-2.5 rounded-xl font-semibold"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleContinue}
          disabled={completeOnboarding.isPending}
          className="btn-primary flex-1 py-2.5 rounded-xl font-semibold"
        >
          {completeOnboarding.isPending
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Setting up…</span>
            : (step === 1 && accountType === 'instructor' ? 'Continue' : 'Finish setup')}
        </button>
      </div>
    </div>
  );
}
