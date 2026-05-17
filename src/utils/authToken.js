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
