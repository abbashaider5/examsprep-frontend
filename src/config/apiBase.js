/** Strip trailing slashes. */
function trimTrailingSlash(url) {
  return String(url).trim().replace(/\/+$/, '');
}

/** Default production API host (Vercel backend). */
export const PRODUCTION_BACKEND_API = 'https://examsprep-backend.vercel.app/api';

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

export function isLocalDevHost() {
  if (typeof window === 'undefined') return false;
  return /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
}

export function usesSameOriginApiProxy() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return /^(www\.)?likhitai\.com$/i.test(host)
    || /\.likhitai\.com$/i.test(host)
    || /\.vercel\.app$/i.test(host)
    || /(^|\.)abbaslogic\.com$/i.test(host);
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
 * Direct backend URL for uploads (Bearer auth — cookies are not sent cross-origin).
 * Always includes the `/api` prefix required by the live backend.
 */
export function getDirectUploadApiBaseUrl() {
  const configured = import.meta.env.VITE_API_DIRECT_URL;
  if (configured && String(configured).trim()) {
    return normalizeApiBaseUrl(configured);
  }
  if (import.meta.env.PROD && !isLocalDevHost()) {
    return PRODUCTION_BACKEND_API;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (/^(www\.)?likhitai\.com$/i.test(host) || /\.likhitai\.com$/i.test(host)) {
      return PRODUCTION_BACKEND_API;
    }
    if (/\.vercel\.app$/i.test(host) && !host.includes('examsprep-backend')) {
      return PRODUCTION_BACKEND_API;
    }
  }
  return null;
}

/**
 * Base URL for resource uploads — guaranteed to hit `/api/resources/*` on production.
 * Prefer same-origin `/api` when the host has a Vercel proxy so session cookies work.
 */
export function getResourceUploadBaseUrl() {
  if (usesSameOriginApiProxy()) return getApiBaseUrl();
  if (isLocalDevHost()) {
    const configured = import.meta.env.VITE_API_URL;
    if (configured && String(configured).trim()) {
      return normalizeApiBaseUrl(configured);
    }
    return 'http://localhost:5000/api';
  }
  return getDirectUploadApiBaseUrl() || PRODUCTION_BACKEND_API;
}
