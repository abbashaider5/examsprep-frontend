import { authApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { clearAccessToken } from '../utils/authToken.js';
import {
  beginLogout,
  clearPersistedAuthStorage,
  isLogoutInProgress,
} from '../utils/authLifecycle.js';

export { isLogoutInProgress } from '../utils/authLifecycle.js';

/**
 * End the client session immediately, invalidate server session (best effort), then hard-redirect.
 * Redirect happens synchronously after local cleanup so in-flight requests cannot restore auth state.
 */
export function performLogout({ queryClient } = {}) {
  if (!beginLogout()) return;

  queryClient?.cancelQueries();
  queryClient?.clear();

  clearAccessToken();
  clearPersistedAuthStorage();
  useAuthStore.getState().clearUser();

  try {
    void authApi.logout().catch(() => {});
  } catch {
    /* Local session already cleared — still redirect. */
  }

  window.location.replace('/login');
}
