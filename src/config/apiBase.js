/**
 * Resolve API base URL for axios.
 * On production LikhitAI / Vercel hosts, always use same-origin /api (Vercel proxy → backend).
 * This avoids cross-origin CORS/cookie issues when VITE_API_URL points at the backend host.
 */
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const useSameOriginProxy =
      /^(www\.)?likhitai\.com$/i.test(host)
      || /\.vercel\.app$/i.test(host)
      || /abbaslogic\.com$/i.test(host);
    if (useSameOriginProxy) return '/api';
  }

  const configured = import.meta.env.VITE_API_URL;
  if (configured && String(configured).trim()) {
    return String(configured).trim().replace(/\/$/, '');
  }
  return '/api';
}

/**
 * Direct backend URL for multipart uploads (Bearer auth — cookies are not sent cross-origin).
 */
export function getDirectUploadApiBaseUrl() {
  const configured = import.meta.env.VITE_API_DIRECT_URL;
  if (configured && String(configured).trim()) {
    return String(configured).trim().replace(/\/$/, '');
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

