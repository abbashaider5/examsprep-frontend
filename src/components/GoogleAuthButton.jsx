import { GoogleLogin } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';

export default function GoogleAuthButton({ label, onCredential, disabled = false, role }) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-text)] opacity-60"
      >
        <Loader2 size={16} className="animate-spin" />
        {label}
      </button>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 text-center text-sm font-medium text-[var(--color-text)]">{label}</div>
      <div className="google-auth-button flex justify-center">
        <GoogleLogin
          theme="outline"
          size="large"
          shape="pill"
          width="320"
          text="continue_with"
          onSuccess={(response) => onCredential({ credential: response.credential, role })}
          onError={() => {}}
        />
      </div>
    </div>
  );
}
