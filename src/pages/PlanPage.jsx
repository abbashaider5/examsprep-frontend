import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Loader2, Shield, Trophy, Zap } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { paymentApi, profileApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

const PLAN_INFO = {
  free: { label: 'Free', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', icon: Zap },
  pro: { label: 'Pro', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', icon: Shield },
  enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', icon: Trophy },
};

const SUBSCRIPTION_PLANS = [
  { id: 'pro', name: 'Pro', price: 149, monthlyLimit: 10, maxQuestions: 50, desc: 'For active instructors and smaller teams.' },
  { id: 'enterprise', name: 'Enterprise', price: 349, monthlyLimit: 30, maxQuestions: 100, desc: 'For institutes with higher assessment volume.' },
];

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function PlanPage() {
  const { user, setUser } = useAuthStore();
  const qc = useQueryClient();
  const [loadingPlan, setLoadingPlan] = useState('');
  const plan = user?.plan || 'free';
  const isFreePlan = plan === 'free';
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;
  const PlanIcon = planInfo.icon;

  const { data: txnData, isLoading: loadingTxn } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => paymentApi.getTransactions().then(r => r.data),
  });
  const transactions = txnData?.transactions || [];

  const updateMut = useMutation({
    mutationFn: (data) => profileApi.update(data),
    onSuccess: (res) => {
      if (res?.data?.user) setUser(res.data.user);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Plan preferences updated');
    },
    onError: () => toast.error('Update failed'),
  });

  const planExpiryDays = user?.planExpiresAt ? Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / 86400000) : null;
  const expiringSoon = !isFreePlan && typeof planExpiryDays === 'number' && planExpiryDays >= 0 && planExpiryDays <= 7;
  const usedExams = (user?.monthlyLimit || 3) - (user?.remaining ?? user?.monthlyLimit ?? 3);
  const usagePct = Math.min(100, (usedExams / (user?.monthlyLimit || 3)) * 100);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtAmount = (paise) => `₹${(paise / 100).toFixed(0)}`;

  const handleSubscribe = async (planId) => {
    if (user?.role === 'user') return toast.error('Plan upgrades are available for instructor/admin accounts.');
    if (user?.plan === planId) return toast('You are already on this plan.');
    setLoadingPlan(planId);
    try {
      const ready = await loadRazorpay();
      if (!ready) return toast.error('Payment gateway failed to load.');
      const { data } = await paymentApi.createOrder({ plan: planId });
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'LikhitAI',
        description: `${planId.toUpperCase()} - 1 Month`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            const { data: verifyData } = await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            });
            setUser({ ...user, plan: verifyData.plan, planExpiresAt: verifyData.planExpiresAt, remaining: verifyData.remaining });
            qc.invalidateQueries({ queryKey: ['transactions'] });
            toast.success('Plan activated');
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment verification failed.');
          } finally {
            setLoadingPlan('');
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#0d9488' },
        modal: { ondismiss: () => setLoadingPlan('') },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment.');
      setLoadingPlan('');
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 animate-fade-in max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Plan & Billing</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage subscription, renewal preferences, and transactions.</p>
      </div>

      <div className={`card border-2 ${planInfo.border}`}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${planInfo.color}`}>
            <PlanIcon size={13} /> {planInfo.label}
          </div>
          {!isFreePlan && user?.planExpiresAt && <span className="text-xs text-[var(--color-text-muted)]">Expires {fmtDate(user.planExpiresAt)}</span>}
        </div>
        {expiringSoon && <div className="mb-4 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs">Your plan is expiring soon. Please renew to avoid interruption.</div>}
        <div className="text-xs text-[var(--color-text-muted)] mb-2">Monthly Exam Usage: <span className="font-bold text-[var(--color-text)]">{usedExams} / {user?.monthlyLimit || 3}</span></div>
        <div className="bg-[var(--color-border)] rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-amber-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${usagePct}%` }} /></div>
        {!isFreePlan && (
          <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Auto-renew</p>
              <p className="text-xs text-[var(--color-text-muted)]">Enable advance renewal to reduce interruption risk.</p>
            </div>
            <button onClick={() => updateMut.mutate({ autoRenew: !user?.autoRenew })} className={`relative inline-flex h-6 w-11 items-center rounded-full ${user?.autoRenew ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white ${user?.autoRenew ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2"><CreditCard size={15} className="text-[var(--color-primary)]" /> Upgrade Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUBSCRIPTION_PLANS.map((p) => {
            const isCurrent = plan === p.id;
            return (
              <div key={p.id} className={`rounded-xl border p-4 ${isCurrent ? 'border-[var(--color-primary)] bg-[var(--color-bg-alt)]' : 'border-[var(--color-border)]'}`}>
                <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-semibold text-[var(--color-text)]">{p.name}</h4><span className="text-sm font-bold text-[var(--color-text)]">₹{p.price}/mo</span></div>
                <p className="text-xs text-[var(--color-text-muted)] mb-3">{p.desc}</p>
                <button className={`w-full py-2 rounded-lg text-sm font-medium ${isCurrent ? 'bg-[var(--color-bg)] text-[var(--color-text-muted)]' : 'btn-primary'}`} disabled={isCurrent || loadingPlan === p.id} onClick={() => handleSubscribe(p.id)}>
                  {loadingPlan === p.id ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Processing...</span> : isCurrent ? 'Current plan' : `Choose ${p.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-[var(--color-text)] text-sm mb-4 flex items-center gap-2"><CreditCard size={15} className="text-[var(--color-primary)]" /> Transaction History</h3>
        {loadingTxn ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-14" />)}</div> : transactions.length === 0 ? (
          <div className="text-center py-10"><CreditCard size={30} className="mx-auto mb-2 text-[var(--color-border)]" /><p className="text-sm text-[var(--color-text-muted)]">No transactions yet.</p></div>
        ) : (
          <div className="space-y-1">
            {transactions.map(txn => (
              <div key={txn._id} className="py-2.5 px-3 rounded-lg hover:bg-[var(--color-bg-alt)] transition-colors flex items-center justify-between gap-3">
                <div><p className="text-sm text-[var(--color-text)] capitalize">{txn.plan} plan</p><p className="text-xs text-[var(--color-text-muted)]">{fmtDate(txn.createdAt)}</p></div>
                <div className="text-right"><p className="text-sm font-semibold text-[var(--color-text)]">{fmtAmount(txn.amount)}</p><p className={`text-xs ${txn.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>{txn.status}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
