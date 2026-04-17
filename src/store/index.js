import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }) }
  )
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
