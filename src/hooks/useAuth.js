import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api.js';
import { useAuthStore } from '../store/index.js';

export const useAuth = () => {
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const loginMut = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      if (res.data.requiresOTP) return; // caller handles OTP step
      setUser(res.data.user);
      navigate('/dashboard');
      toast.success('Welcome back!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Login failed'),
  });

  const signupMut = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (res) => {
      if (res.data.requiresOTP) return; // caller handles OTP step
      setUser(res.data.user);
      navigate('/dashboard');
      toast.success('Account created!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Signup failed'),
  });

  const verifyOtpMut = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (res) => {
      setUser(res.data.user);
      navigate('/dashboard');
      toast.success(res.data.message || 'Verified!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'OTP verification failed'),
  });

  const logoutMut = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => { clearUser(); qc.clear(); navigate('/login'); toast.success('Logged out'); },
  });

  return { user, isAuthenticated, login: loginMut, signup: signupMut, verifyOtp: verifyOtpMut, logout: logoutMut };
};

export const useMe = () => {
  const { setUser, isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => { const res = await authApi.getMe(); setUser(res.data.user); return res.data.user; },
    enabled: isAuthenticated,
    staleTime: 60000,
  });
};
