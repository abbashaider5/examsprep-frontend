/** Strip trailing slashes. */
function trimTrailingSlash(url) {
  return String(url).trim().replace(/\/+$/, '');
}

/**
 * Absolute backend roots must end with `/api` so paths like `/resources/upload-bytes`
 * resolve to `/api/resources/upload-bytes` (bare `/resources/*` is not mounted on production).
 */
export function normalizeApiBaseUrl(url) {
  const base = trimTrailingSlash(url);
  if (!base) return '/api';
  if (base === '/api' || base.endsWith('/api')) return base;
  if (/^https?:\/\//i.test(base)) return `${base}/api`;
  return base;
}

export function usesSameOriginApiProxy() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return /^(www\.)?likhitai\.com$/i.test(host)
    || /\.vercel\.app$/i.test(host)
    || /abbaslogic\.com$/i.test(host);
}

/**
 * Resolve API base URL for axios.
 * On production LikhitAI / Vercel hosts, always use same-origin /api (Vercel proxy → backend).
 * This avoids cross-origin CORS/cookie issues when VITE_API_URL points at the backend host.
 */
export function getApiBaseUrl() {
  if (usesSameOriginApiProxy()) return '/api';

  const configured = import.meta.env.VITE_API_URL;
  if (configured && String(configured).trim()) {
    return normalizeApiBaseUrl(configured);
  }
  return '/api';
}

/**
 * Direct backend URL for multipart uploads (Bearer auth — cookies are not sent cross-origin).
 */
export function getDirectUploadApiBaseUrl() {
  const configured = import.meta.env.VITE_API_DIRECT_URL;
  if (configured && String(configured).trim()) {
    return normalizeApiBaseUrl(configured);
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (/^(www\.)?likhitai\.com$/i.test(host)) {
      return 'https://examsprep-backend.vercel.app/api';
    }
    if (/\.vercel\.app$/i.test(host) && !host.includes('examsprep-backend')) {
      return 'https://examsprep-backend.vercel.app/api';
    }
  }
  return null;
}

