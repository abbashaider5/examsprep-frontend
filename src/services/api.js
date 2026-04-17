import axios from 'axios';
import { useAuthStore } from '../store/index.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve());
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 503 && err.response?.data?.maintenance) {
      window.location.href = '/maintenance';
      return Promise.reject(err);
    }
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original)).catch(e => Promise.reject(e));
      }
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr);
        useAuthStore.getState().clearUser();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    if (err.response?.status === 401 && !original._retry) {
      useAuthStore.getState().clearUser();
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  requestOtp: (data) => api.post('/auth/request-otp', data),
};

export const examApi = {
  create: (data) => api.post('/exams', data),
  getAll: () => api.get('/exams'),
  getPublic: () => api.get('/exams/public'),
  getById: (id) => api.get(`/exams/${id}`),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  regenerate: (id, data) => api.post(`/exams/${id}/regenerate`, data),
  saveScreenshot: (id, imageData) => api.post(`/exams/${id}/screenshot`, { imageData }),
  executeCode: (data) => api.post('/exams/execute-code', data),
};

export const resultApi = {
  submit: (data) => api.post('/results', data),
  getAll: () => api.get('/results'),
  getById: (id) => api.get(`/results/${id}`),
};

export const certificateApi = {
  getAll: () => api.get('/certificates'),
  verify: (certId) => api.get(`/certificates/verify/${certId}`),
  download: (certId) => api.get(`/certificates/download/${certId}`, { responseType: 'blob' }),
};

export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
  analytics: () => api.get('/profile/analytics'),
  recommendation: () => api.get('/profile/recommendation'),
  changePassword: (data) => api.post('/profile/change-password', data),
};

export const leaderboardApi = {
  get: () => api.get('/leaderboard'),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (page, search = '', plan = '') => api.get(`/admin/users?page=${page}&search=${search}&plan=${plan}`),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleBlock: (id) => api.patch(`/admin/users/${id}/block`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updatePlan: (id, plan, months = 1) => api.patch(`/admin/users/${id}/plan`, { plan, months }),
  transactions: (page = 1) => api.get(`/admin/transactions?page=${page}`),
  subscriptions: (status = '', page = 1) => api.get(`/admin/subscriptions?status=${status}&page=${page}`),
};

export const settingsApi = {
  getPublic: () => api.get('/settings/public'),
  get: () => api.get('/settings'),
  update: (data) => api.patch('/settings', data),
};

export const logsApi = {
  get: (params = {}) => api.get('/logs', { params }),
  stats: () => api.get('/logs/stats'),
  clear: (days) => api.delete('/logs/clear', { data: { days } }),
};

export const paymentApi = {
  createOrder: (data) => api.post('/payments/create-order', data),
  verify: (data) => api.post('/payments/verify', data),
  getSubscription: () => api.get('/payments/subscription'),
  getTransactions: () => api.get('/payments/transactions'),
};

export const instructorApi = {
  become: () => api.post('/instructor/become'),
  getMyExams: () => api.get('/instructor/exams'),
  sendInvite: (examId, email) => api.post(`/instructor/exams/${examId}/invite`, { email }),
  getExamInvites: (examId) => api.get(`/instructor/exams/${examId}/invites`),
  getExamReport: (examId) => api.get(`/instructor/exams/${examId}/report`),
  getExamScreenshots: (examId) => api.get(`/instructor/exams/${examId}/screenshots`),
  getAnalytics: () => api.get('/instructor/analytics'),
  validateInvite: (token) => api.get(`/instructor/invite/${token}/validate`),
  acceptInvite: (token) => api.post(`/instructor/invite/${token}/accept`),
  rejectInvite: (token) => api.post(`/instructor/invite/${token}/reject`),
  getMyInvites: () => api.get('/instructor/my-invites'),
  getMyAcceptedInvites: () => api.get('/instructor/my-accepted-invites'),
};

export default api;
