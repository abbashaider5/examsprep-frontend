/**
 * Configure in production via Vite env (see client/.env.example).
 * Values are display strings for legal/support pages only.
 */
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@likhitai.com';
export const LEGAL_PRIVACY_EMAIL = import.meta.env.VITE_LEGAL_EMAIL || 'privacy@likhitai.com';
export const GRIEVANCE_EMAIL = import.meta.env.VITE_GRIEVANCE_EMAIL || 'grievances@likhitai.com';
export const ENTERPRISE_SUPPORT_EMAIL = import.meta.env.VITE_ENTERPRISE_SUPPORT_EMAIL || 'enterprise@likhitai.com';
