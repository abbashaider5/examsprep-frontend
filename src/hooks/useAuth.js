import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authApi, enterpriseApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';
import { setAccessToken } from '../utils/authToken.js';
import { getDashboardPath } from '../utils/dashboardPath.js';

function persistSessionToken(res) {
  if (res?.data?.accessToken) setAccessToken(res.data.accessToken);
}

export const useAuth = () => {
  const { user, isAuthenticated, needsAccountType, setUser, clearNeedsAccountType, clearUser } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const loginMut = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (res) => {
      if (res.data.requiresOTP) return; // caller handles OTP step
      setUser(res.data.user);
      if (res.data.accessToken) setAccessToken(res.data.accessToken);
      const pending = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('enterpriseInvite')
        : null;
      if (pending) {
        try {
          const acc = await enterpriseApi.acceptInvite(pending);
          const me = await authApi.getMe();
          setUser(me.data.user);
          persistSessionToken(me);
          navigate(acc.data?.redirectPath || getDashboardPath(me.data.user?.role));
          toast.success('Welcome back — you joined the organization.');
          return;
        } catch (err) {
          toast.error(err.response?.data?.message || 'Could not accept organization invite.');
        }
      }
      navigate(getDashboardPath(res.data.user?.role));
      toast.success('Welcome back!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Login failed'),
  });

  const signupMut = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (res) => {
      if (res.data.requiresOTP) return; // caller handles OTP step
      setUser(res.data.user);
      if (res.data.accessToken) setAccessToken(res.data.accessToken);
      if (res.data.redirectPath) navigate(res.data.redirectPath);
      else navigate(getDashboardPath(res.data.user?.role));
      toast.success('Account created!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Signup failed'),
  });

  const verifyOtpMut = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (res) => {
      setUser(res.data.user);
      if (res.data.accessToken) setAccessToken(res.data.accessToken);
      if (res.data.redirectPath) navigate(res.data.redirectPath);
      else navigate(getDashboardPath(res.data.user?.role));
      toast.success(res.data.message || 'Verified!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'OTP verification failed'),
  });

  const logoutMut = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => { clearUser(); qc.clear(); navigate('/login'); toast.success('Logged out'); },
  });

  const googleMut = useMutation({
    mutationFn: authApi.google,
    onSuccess: async (res) => {
      if (res.data.requiresOTP) return;
      if (res.data.needsAccountType) {
        setUser(res.data.user, { needsAccountType: true });
        if (res.data.accessToken) setAccessToken(res.data.accessToken);
        return;
      }
      setUser(res.data.user);
      if (res.data.accessToken) setAccessToken(res.data.accessToken);
      const pending = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('enterpriseInvite')
        : null;
      if (pending) {
        try {
          const acc = await enterpriseApi.acceptInvite(pending);
          const me = await authApi.getMe();
          setUser(me.data.user);
          persistSessionToken(me);
          navigate(acc.data?.redirectPath || res.data.redirectPath || getDashboardPath(me.data.user?.role));
          toast.success('Signed in with Google — you joined the organization.');
          return;
        } catch (err) {
          toast.error(err.response?.data?.message || 'Could not accept organization invite.');
        }
      }
      if (res.data.redirectPath) navigate(res.data.redirectPath);
      else navigate(getDashboardPath(res.data.user?.role));
      toast.success(res.data.message || 'Signed in with Google');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Google sign-in failed'),
  });

  const completeOnboardingMut = useMutation({
    mutationFn: authApi.completeOnboarding,
    onSuccess: (res) => {
      setUser(res.data.user, { needsAccountType: false });
      clearNeedsAccountType();
      if (res.data.accessToken) setAccessToken(res.data.accessToken);
      if (res.data.redirectPath) navigate(res.data.redirectPath);
      else navigate(getDashboardPath(res.data.user?.role));
      toast.success(res.data.message || 'Account setup complete');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not complete account setup'),
  });

  return {
    user,
    isAuthenticated,
    needsAccountType,
    login: loginMut,
    signup: signupMut,
    google: googleMut,
    completeOnboarding: completeOnboardingMut,
    verifyOtp: verifyOtpMut,
    logout: logoutMut,
  };
};

export const useMe = () => {
  const { setUser, isAuthenticated, clearUser } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await authApi.getMe();
        setUser(res.data.user);
        persistSessionToken(res);
        return res.data.user;
      } catch (err) {
        // Only clear user on definitive auth failures (not network errors)
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          clearUser();
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    retry: 1,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
};
