import { Check, GraduationCap, Loader2, Shield, Sparkles } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { paymentApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { getDashboardPath } from '../utils/dashboardPath.js';

export const PLANS = [
  {
    id: 'pro',
    name: 'Premium',
    price: 149,
    originalPrice: 999,
    period: 'month',
    icon: Shield,
    color: 'text-[var(--color-primary)]',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-[var(--color-primary)]',
    badge: 'Most Popular',
    testsPerMonth: 10,
    maxQuestions: 50,
    features: [
      '10 AI-generated exams per month',
      'Up to 50 questions per exam',
      'AI proctoring with face detection',
      'Screenshot capture during exams',
      'Advanced analytics and insights',
      'AI-powered study recommendations',
      'PDF certificates with verification',
      'Priority email support',
    ],
    limitations: [],
  },
];

const ENTERPRISE_PLAN = {
  id: 'enterprise-custom',
  name: 'Enterprise',
  subtitle: 'Custom pricing for schools and institutes',
  icon: GraduationCap,
  color: 'text-indigo-600 dark:text-indigo-400',
  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  borderColor: 'border-indigo-200 dark:border-indigo-800',
  badge: 'Custom',
  features: [
    'Dedicated school/institute onboarding',
    'Principal and teacher role management',
    'Teacher-level limits and enterprise governance',
    'Class and student workflows for school mode',
    'Batch workflows for institute mode',
    'Enterprise activity logs and audit tracking',
    'Centralized AI proctoring policy controls',
    'Custom pricing based on usage and requirements',
    'Priority implementation and support',
  ],
};

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
        name: 'LikhitAI',
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
            navigate(getDashboardPath(user?.role));
          } catch (verifyErr) {
            toast.error(verifyErr.response?.data?.message || 'Payment verification failed. Please contact support if amount was deducted.');
          }
          setLoading(null);
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#0d9488' },
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
    if (!isAuthenticated) return `Sign Up & Upgrade`;
    if (user?.plan === plan.id) return 'Current Plan';
    return `Upgrade to ${plan.name}`;
  };

  const instructorPlans = PLANS;
  const enterpriseMailTo =
    'mailto:sales@likhitai.com?subject=' +
    encodeURIComponent('Enterprise Plan Inquiry - LikhitAI') +
    '&body=' +
    encodeURIComponent(
      'Hi LikhitAI Sales Team,%0D%0A%0D%0A' +
      'We are interested in the Enterprise plan.%0D%0A' +
      'Organization Name:%0D%0A' +
      'Mode (School/Institute):%0D%0A' +
      'Expected Teachers:%0D%0A' +
      'Expected Exams per Month:%0D%0A' +
      'Expected Questions per Exam:%0D%0A%0D%0A' +
      'Please share pricing and onboarding details.%0D%0A'
    );

  return (
    <div className="relative py-16 px-4 sm:px-6 lg:px-8 bg-[var(--color-bg)] min-h-screen overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-radial from-teal-100/50 via-cyan-50/25 to-transparent dark:from-teal-900/15 dark:via-cyan-900/8 dark:to-transparent rounded-full blur-3xl" />
        <div className="absolute top-32 right-0 w-56 h-56 bg-violet-100/30 dark:bg-violet-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
            <Sparkles size={13} /> Plans & Pricing
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--color-text)] mb-4 tracking-tight">
            Create. Manage. <span className="text-[var(--color-primary)]">Analyze.</span>
          </h1>
          <p className="text-[var(--color-text-muted)] text-lg max-w-xl mx-auto">
            Choose the right plan for your workflow. Upgrade instantly for individual use or contact sales for enterprise deployment.
          </p>
        </div>

        {/* Students are free callout */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/15 dark:to-emerald-900/15 border border-green-200 dark:border-green-800 rounded-2xl px-6 py-5 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap size={22} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[var(--color-text)] text-base">Students — Always Free</p>
              <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                Take exams, study with flashcards, earn certificates, track performance — no plan needed.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
              {['Exams via invite', 'PDF Certificates', 'Analytics', 'Leaderboard'].map(f => (
                <span key={f} className="flex items-center gap-1 text-xs">
                  <Check size={12} className="text-green-500 shrink-0" /> {f}
                </span>
              ))}
            </div>
            <a href="/signup" className="btn-secondary text-sm px-4 py-2 shrink-0 rounded-xl whitespace-nowrap">
              Join Free
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-12 items-stretch">
          {instructorPlans.map((plan) => {
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

                {/* Plan header */}
                <div className="flex items-center gap-3 mb-5">
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
                    <p className="text-xs text-[var(--color-text-muted)]">{plan.testsPerMonth} exams / month · up to {plan.maxQuestions} questions</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  {plan.originalPrice && (
                    <div className="text-sm text-[var(--color-text-muted)] line-through mb-0.5">₹{plan.originalPrice}/month</div>
                  )}
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-[var(--color-text)]">₹{plan.price}</span>
                    <span className="text-[var(--color-text-muted)] text-sm mb-1.5">/month</span>
                  </div>
                  {plan.originalPrice && (
                    <div className="mt-1 inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                      Save {Math.round((1 - plan.price / plan.originalPrice) * 100)}% — Limited time
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrent || loading === plan.id}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mb-6 ${
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
                      <span className="w-3.5 mt-0.5 shrink-0 text-center text-[var(--color-text-muted)]">×</span>
                      <span className="text-[var(--color-text-muted)]">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div
            className={`relative flex flex-col rounded-2xl border p-8 transition-all shadow-sm hover:shadow-md bg-[var(--color-surface)] ${ENTERPRISE_PLAN.borderColor}`}
          >
            <div className="absolute -top-3.5 left-6">
              <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                {ENTERPRISE_PLAN.badge}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl ${ENTERPRISE_PLAN.bgColor} flex items-center justify-center`}>
                <ENTERPRISE_PLAN.icon size={20} className={ENTERPRISE_PLAN.color} />
              </div>
              <div>
                <h3 className="font-bold text-[var(--color-text)] text-lg">{ENTERPRISE_PLAN.name}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{ENTERPRISE_PLAN.subtitle}</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-[var(--color-text)]">Custom</span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Tailored onboarding, controls, and pricing for organizations.
              </p>
            </div>

            <a
              href={enterpriseMailTo}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mb-6 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            >
              Contact Sales
            </a>

            <div className="border-t border-[var(--color-border)] mb-5" />

            <ul className="space-y-2.5 flex-1">
              {ENTERPRISE_PLAN.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <Check size={15} className="text-green-500 mt-0.5 shrink-0" />
                  <span className="text-[var(--color-text)]">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { q: 'Do students need to pay?', a: 'No. Students can take exams they\'ve been invited to, earn certificates, and track their progress — all for free.' },
            { q: 'What do instructor plans unlock?', a: 'Instructor plans let you create AI-generated exams, invite candidates, manage batches, run analytics, and enable AI proctoring.' },
            { q: 'How does Enterprise pricing work?', a: 'Enterprise pricing is customized based on your setup, expected usage, and feature needs. Use Contact Sales to get a tailored quote.' },
            { q: 'Can I cancel any time?', a: 'Yes. All plans are monthly with no lock-in. You can cancel or change your plan at any time from your profile.' },
          ].map(({ q, a }) => (
            <div key={q} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
              <p className="font-semibold text-sm text-[var(--color-text)] mb-2">{q}</p>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-[var(--color-text-muted)] text-sm">
            All paid plans renew monthly. Cancel any time. Payments processed securely via Razorpay.
          </p>
        </div>
      </div>
    </div>
  );
}
