import { Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { settingsApi } from '../services/api.js';

export default function MaintenancePage() {
  const [message, setMessage] = useState('We are currently performing scheduled maintenance. Please check back shortly.');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    settingsApi.getPublic().then(r => {
      if (r.data.maintenanceMessage) setMessage(r.data.maintenanceMessage);
    }).catch(() => {});
  }, []);

  const checkAgain = async () => {
    setChecking(true);
    try {
      const res = await settingsApi.getPublic();
      if (!res.data.maintenanceMode) window.location.href = '/';
      else if (res.data.maintenanceMessage) setMessage(res.data.maintenanceMessage);
    } catch {
      // still down
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="text-center max-w-md animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Wrench size={36} className="text-[var(--color-primary)]" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-text)] mb-3">Under Maintenance</h1>
        <p className="text-[var(--color-text-muted)] mb-8 leading-relaxed">{message}</p>
        <button onClick={checkAgain} disabled={checking} className="btn-primary px-6 py-2.5">
          {checking ? (
            <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Checking...</span>
          ) : 'Check Again'}
        </button>
      </div>
    </div>
  );
}
