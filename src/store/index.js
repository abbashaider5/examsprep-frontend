import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearPersistedAuthStorage, isLogoutInProgress } from '../utils/authLifecycle.js';
import { clearAccessToken } from '../utils/authToken.js';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      needsAccountType: false,
      setUser: (user, options = {}) => {
        if (isLogoutInProgress()) return;
        set({
          user,
          isAuthenticated: !!user,
          needsAccountType: options.needsAccountType ?? false,
        });
      },
      clearNeedsAccountType: () => set({ needsAccountType: false }),
      clearUser: () => {
        clearAccessToken();
        clearPersistedAuthStorage();
        set({ user: null, isAuthenticated: false, needsAccountType: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
        needsAccountType: s.needsAccountType,
      }),
    },
  ),
);

export const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => {
        const next = !get().dark;
        set({ dark: next });
        document.documentElement.classList.toggle('dark', next);
      },
      init: () => {
        const dark = get().dark;
        document.documentElement.classList.toggle('dark', dark);
      },
    }),
    { name: 'theme-storage' }
  )
);
