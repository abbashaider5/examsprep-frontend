import { useMutation } from '@tanstack/react-query';
import { BarChart2, BookmarkCheck, Mail, Shield, Users, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { instructorApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const INSTRUCTOR_PERKS = [
  { icon: BookmarkCheck, text: 'Create & share tests with invite links' },
  { icon: Mail, text: 'Invite candidates directly via email' },
  { icon: BarChart2, text: 'Track results and performance analytics' },
  { icon: Users, text: 'HR-style candidate management dashboard' },
  { icon: Shield, text: 'AI proctoring for all your tests' },
];

export default function BecomeInstructorModal({ onClose }) {
  const { user, setUser } = useAuthStore();
  const isPremium = user?.plan && user.plan !== 'free';

  const becomeMut = useMutation({
    mutationFn: () => instructorApi.become(),
    onSuccess: (res) => {
      setUser({ ...user, role: 'instructor', isInstructor: true });
      toast.success('You are now an Instructor!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to upgrade'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="relative bg-gradient-to-br bg-primary px-6 pt-6 pb-8 text-white">
          <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={18} />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
            <BookmarkCheck size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">Become an Instructor</h2>
          <p className="text-blue-100 text-sm">Create tests, invite candidates, track performance.</p>
        </div>

        <div className="p-6">
          {isPremium ? (
            <>
              {/* Show instructor perks and CTA */}
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                With your <strong className="text-[var(--color-text)] capitalize">{user.plan}</strong> plan, you're eligible to become an instructor. Unlock HR-like tools instantly.
              </p>
              <div className="space-y-2.5 mb-6">
                {INSTRUCTOR_PERKS.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                      <p.icon size={13} className="text-[var(--color-primary)]" />
                    </div>
                    <span className="text-sm text-[var(--color-text)]">{p.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => becomeMut.mutate()}
                disabled={becomeMut.isPending}
                className="btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <BookmarkCheck size={16} />
                {becomeMut.isPending ? 'Upgrading...' : 'Become an Instructor'}
              </button>
            </>
          ) : (
            <>
              {/* Show pricing cards first */}
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Instructor role requires an active <strong className="text-[var(--color-text)]">Pro or Enterprise</strong> plan. Upgrade to unlock:
              </p>
              <div className="space-y-2.5 mb-5">
                {INSTRUCTOR_PERKS.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 opacity-60">
                    <div className="w-7 h-7 bg-[var(--color-bg-alt)] rounded-lg flex items-center justify-center shrink-0">
                      <p.icon size={13} className="text-[var(--color-text-muted)]" />
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">{p.text}</span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 mb-4">
                <Zap size={13} className="shrink-0 mt-0.5" />
                Premium plan required. Starting at ₹149/month.
              </div>
              <Link
                to="/pricing"
                onClick={onClose}
                className="btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2 text-sm"
              >
                <Zap size={15} /> View Pricing Plans
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
