/** Short-lived access token for cross-origin API calls (e.g. direct file uploads). */
const STORAGE_KEY = 'likhitai_access_token';

export function setAccessToken(token) {
  if (typeof window === 'undefined') return;
  if (token) sessionStorage.setItem(STORAGE_KEY, token);
  else sessionStorage.removeItem(STORAGE_KEY);
}

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearAccessToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** True if JWT is missing, malformed, or expires within skewMs. */
export function isAccessTokenExpired(token, skewMs = 60_000) {
  if (!token || typeof token !== 'string') return true;
  const parts = token.split('.');
  if (parts.length < 2) return true;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now() + skewMs;
  } catch {
    return true;
  }
}

export function getValidAccessToken() {
  const token = getAccessToken();
  if (!token || isAccessTokenExpired(token)) return null;
  return token;
}
