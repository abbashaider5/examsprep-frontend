import { paymentApi } from '../services/api.js';

export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay mandate flow and enable AutoPay on success.
 * @returns {Promise<boolean>} true when mandate approved and AutoPay enabled
 */
export async function openAutoPayMandate({
  checkout,
  user,
  planName = 'your plan',
  onEnabled,
}) {
  if (!checkout?.subscriptionId || !checkout?.keyId) return false;
  const ready = await loadRazorpayScript();
  if (!ready) return false;

  return new Promise((resolve) => {
    const options = {
      key: checkout.keyId,
      subscription_id: checkout.subscriptionId,
      name: 'LikhitAI',
      description: `AutoPay for ${planName}`,
      prefill: { name: user?.name, email: user?.email },
      theme: { color: '#0d9488' },
      handler: async () => {
        try {
          const enableRes = await paymentApi.enableAutoRenew({
            razorpaySubscriptionId: checkout.subscriptionId,
          });
          if (onEnabled) await onEnabled(enableRes.data);
          resolve(true);
        } catch {
          resolve(false);
        }
      },
      modal: {
        ondismiss: () => resolve(false),
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => resolve(false));
    rzp.open();
  });
}
