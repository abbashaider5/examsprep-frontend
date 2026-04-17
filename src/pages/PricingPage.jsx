import { Check, Code2, Crown, Loader2, Shield, Sparkles, Users, Zap } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

export const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    originalPrice: null,
    period: 'forever',
    icon: Zap,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-[var(--color-border)]',
    testsPerMonth: 3,
    maxQuestions: 20,
    features: [
      '3 AI-generated exams per month',
      'Up to 20 questions per exam',
      'Study mode with flashcards',
      'Basic performance analytics',
      'Community leaderboard',
      'PDF certificate on passing score',
    ],
    limitations: ['No AI proctoring', 'No coding questions', 'No advanced analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    originalPrice: 999,
    period: 'month',
    icon: Shield,
    color: 'text-[var(--color-primary)]',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-[var(--color-primary)]',
    badge: 'Most Popular',
    instructorBadge: 'Great for Instructors',
    testsPerMonth: 10,
    maxQuestions: 50,
    features: [
      '10 AI-generated exams per month',
      'Up to 50 questions per exam',
      'AI proctoring with face detection',
      'Screenshot capture during exams',
      'Advanced analytics & insights',
      'AI-powered study recommendations',
      'PDF certificates with verification',
      'Priority email support',
    ],
    limitations: ['No coding questions'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 349,
    originalPrice: 2500,
    period: 'month',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-400',
    instructorBadge: 'Best for Instructors',
    testsPerMonth: 30,
    maxQuestions: 100,
    codingBadge: true,
    features: [
      '30 AI-generated exams per month',
      'Up to 100 questions per exam',
      'AI proctoring with face detection',
      'Screenshot capture during exams',
      'Coding questions with AI evaluation',
      'Full analytics suite',
      'AI-powered study recommendations',
      'Custom exam branding',
      'Dedicated account support',
      'Priority AI processing',
    ],
    limitations: [],
  },
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

export default function PricingPage() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (plan) => {
    if (!user) {
      navigate('/signup?redirect=/pricing');
      return;
    }
    if (plan.id === 'free') return;
    if (user.plan === plan.id) {
      toast('You are already on this plan.');
      return;
    }

    setLoading(plan.id);
    try {
      const ready = await loadRazorpay();
      if (!ready) {
        toast.error('Payment gateway failed to load. Please check your connection.');
        setLoading(null);
        return;
      }

      const { data } = await paymentApi.createOrder({ plan: plan.id });

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'ExamPrep AI',
        description: `${plan.name} Plan – 1 Month`,
        order_id: data.orderId,
        handler: async (response) => {
          try {
            const { data: verifyData } = await paymentApi.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan.id,
            });
            setUser({
              ...user,
              plan: verifyData.plan,
              planExpiresAt: verifyData.planExpiresAt,
              remaining: verifyData.remaining,
            });
            toast.success(`${plan.name} plan activated! Enjoy your new features.`);
            navigate('/dashboard');
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || 'Payment verification failed. Please contact support if amount was deducted.');
          }
          setLoading(null);
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#0366AC' },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setLoading(null);
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setLoading(null);
    }
  };

  const currentPlan = user?.plan || 'free';
  const isAuthenticated = !!user;

  const getButtonText = (plan) => {
    if (!isAuthenticated) return plan.id === 'free' ? 'Get Started Free' : 'Sign Up & Upgrade';
    if (user?.plan === plan.id) return 'Current Plan';
    return plan.id === 'free' ? 'Free Plan' : `Upgrade to ${plan.name}`;
  };

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 bg-[var(--color-bg)] min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-[var(--color-primary)] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            <Sparkles size={13} />
            Simple, Transparent Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--color-text)] mb-4 tracking-tight">
            Choose the right plan<br />
            <span className="text-[var(--color-primary)]">for your learning</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-lg max-w-xl mx-auto">
            Start free, upgrade when you need more. All plans include AI-powered exam generation.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border-2 p-8 transition-all ${plan.borderColor} ${plan.badge ? 'shadow-xl scale-[1.02]' : 'shadow-sm hover:shadow-md'} bg-[var(--color-surface)]`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--color-primary)] text-white text-xs font-bold px-4 py-1 rounded-full shadow">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {plan.instructorBadge && !plan.badge && (
                  <div className="absolute -top-3.5 right-4">
                    <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                      <Users size={10} /> {plan.instructorBadge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-xl ${plan.bgColor} flex items-center justify-center`}>
                    <Icon size={20} className={plan.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[var(--color-text)] text-lg">{plan.name}</h3>
                      {plan.codingBadge && (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                          <Code2 size={9} /> Coding
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">{plan.testsPerMonth} exams / month · {plan.maxQuestions} questions max</p>
                    {plan.instructorBadge && (
                      <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-1 mt-0.5">
                        <Users size={9} /> {plan.instructorBadge}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  {plan.originalPrice && (
                    <div className="text-sm text-[var(--color-text-muted)] line-through mb-0.5">₹{plan.originalPrice}/month</div>
                  )}
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-[var(--color-text)]">
                      {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-[var(--color-text-muted)] text-sm mb-1.5">/month</span>}
                  </div>
                  {plan.originalPrice && (
                    <div className="mt-1 inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                      Save {Math.round((1 - plan.price / plan.originalPrice) * 100)}% — Limited time
                    </div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent || loading === plan.id}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mb-7 ${
                    isCurrent
                      ? 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] cursor-default'
                      : plan.badge
                      ? 'btn-primary hover:opacity-90'
                      : 'border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] text-[var(--color-text)]'
                  }`}
                >
                  {loading === plan.id ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  ) : isCurrent ? (
                    <><Check size={16} /> Current Plan</>
                  ) : (
                    getButtonText(plan)
                  )}
                </button>

                <div className="border-t border-[var(--color-border)] mb-5" />

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check size={15} className="text-green-500 mt-0.5 shrink-0" />
                      <span className="text-[var(--color-text)]">{f}</span>
                    </li>
                  ))}
                  {plan.limitations.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm opacity-50">
                      <span className="w-3.5 h-3.5 mt-0.5 shrink-0 text-center text-[var(--color-text-muted)] leading-none">×</span>
                      <span className="text-[var(--color-text-muted)]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-[var(--color-text-muted)] text-sm">
            All paid plans renew monthly. Cancel any time. Payments are processed securely via Razorpay.
          </p>
        </div>
      </div>
    </div>
  );
}
