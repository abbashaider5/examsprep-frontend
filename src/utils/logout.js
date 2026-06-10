import { authApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

let logoutInProgress = false;

export function isLogoutInProgress() {
  return logoutInProgress;
}

/**
 * End the client session immediately, invalidate server session (best effort), then hard-redirect.
 * Hard redirect avoids races with useMe refetch or AuthLayout bouncing back to the dashboard.
 */
export async function performLogout({ queryClient } = {}) {
  if (logoutInProgress) return;
  logoutInProgress = true;

  try {
    queryClient?.cancelQueries();
    useAuthStore.getState().clearUser();
    queryClient?.clear();

    try {
      await Promise.race([
        authApi.logout(),
        new Promise((resolve) => { setTimeout(resolve, 4000); }),
      ]);
    } catch {
      /* Local session already cleared — still redirect. */
    }
  } finally {
    window.location.replace('/login');
  }
}
