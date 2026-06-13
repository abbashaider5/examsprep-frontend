/** Shared logout-in-progress flag (separate from logout.js to avoid circular imports with the API layer). */
let logoutInProgress = false;

export function isLogoutInProgress() {
  return logoutInProgress;
}

/** @returns {boolean} true when logout was started, false if already in progress */
export function beginLogout() {
  if (logoutInProgress) return false;
  logoutInProgress = true;
  return true;
}

export function clearPersistedAuthStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('auth-storage');
  } catch {
    /* ignore */
  }
}
