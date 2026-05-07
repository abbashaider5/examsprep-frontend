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
      // Only clear user on definitive auth failures (not network errors or permission 403s)
      const code = err.response?.data?.code;
      const msg = err.response?.data?.message || '';
      const isDefinitiveLogout = code === 'LOGGED_OUT' || msg === 'User no longer exists.' || msg.includes('suspended');
      if (isDefinitiveLogout && !original.url?.includes('/auth/')) {
        useAuthStore.getState().clearUser();
      }
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  google: (data) => api.post('/auth/google', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  requestOtp: (data) => api.post('/auth/request-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const examApi = {
  create: (data) => api.post('/exams', data),
  getAll: () => api.get('/exams'),
  getPublic: () => api.get('/exams/public'),
  getById: (id, config = {}) => api.get(`/exams/${id}`, config),
  update: (id, data) => api.put(`/exams/${id}`, data),
  updateQuestions: (id, payload) =>
    api.put(`/exams/${id}/questions`, Array.isArray(payload) ? { questions: payload } : payload),
  delete: (id) => api.delete(`/exams/${id}`),
  regenerate: (id, data) => api.post(`/exams/${id}/regenerate`, data),
  regenerateQuestion: (id, index) => api.post(`/exams/${id}/regenerate-question/${index}`),
  parsePDF: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/exams/parse-pdf', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  saveScreenshot: (id, imageData) => api.post(`/exams/${id}/screenshot`, { imageData }),
  executeCode: (data) => api.post('/exams/execute-code', data),
  analyzeProctoring: (data) => api.post('/exams/analyze-proctoring', data),
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
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  analytics: () => api.get('/profile/analytics'),
  recommendation: () => api.get('/profile/recommendation'),
  changePassword: (data) => api.post('/profile/change-password', data),
};

export const leaderboardApi = {
  get: () => api.get('/leaderboard'),
};

export const adminApi = {
  helpTopics: () => api.get('/admin/help/topics'),
  createHelpTopic: (data) => api.post('/admin/help/topics', data),
  updateHelpTopic: (topicId, data) => api.put(`/admin/help/topics/${topicId}`, data),
  deleteHelpTopic: (topicId) => api.delete(`/admin/help/topics/${topicId}`),
  stats: () => api.get('/admin/stats'),
  users: (page, search = '', plan = '') => api.get(`/admin/users?page=${page}&search=${search}&plan=${plan}`),
  createUser: (data) => api.post('/admin/users', data),
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
  sendGroupInvite: (examId, groupId) => api.post(`/instructor/exams/${examId}/invite-group`, { groupId }),
  sendClassInvite: (examId, classIds) => api.post(`/instructor/exams/${examId}/invite-class`, { classIds }),
  getExamInvites: (examId) => api.get(`/instructor/exams/${examId}/invites`),
  getExamReport: (examId) => api.get(`/instructor/exams/${examId}/report`),
  getExamScreenshots: (examId) => api.get(`/instructor/exams/${examId}/screenshots`),
  getStudentExamReport: (examId, userId) => api.get(`/instructor/exams/${examId}/students/${userId}/report`),
  getAnalytics: () => api.get('/instructor/analytics'),
  getDetailedAnalytics: () => api.get('/instructor/analytics/detailed'),
  validateInvite: (token) => api.get(`/instructor/invite/${token}/validate`),
  acceptInvite: (token) => api.post(`/instructor/invite/${token}/accept`),
  rejectInvite: (token) => api.post(`/instructor/invite/${token}/reject`),
  getMyInvites: () => api.get('/instructor/my-invites'),
  getMyAcceptedInvites: () => api.get('/instructor/my-accepted-invites'),
  reevaluateResult: (resultId, data) => api.patch(`/instructor/results/${resultId}/reevaluate`, data),
};

export const groupApi = {
  // Group CRUD
  getAll:           ()           => api.get('/groups'),
  getOne:           (id)         => api.get(`/groups/${id}`),
  create:           (data)       => api.post('/groups', data),
  update:           (id, data)   => api.put(`/groups/${id}`, data),
  updateSettings:   (id, data)   => api.patch(`/groups/${id}/settings`, data),
  remove:           (id)         => api.delete(`/groups/${id}`),
  leave:            (id)         => api.post(`/groups/${id}/leave`),
  // Invite flow
  inviteMember:     (id, email)  => api.post(`/groups/${id}/invite`, { email }),
  getInvites:       (id)         => api.get(`/groups/${id}/invites`),
  cancelInvite:     (id, invId)  => api.delete(`/groups/${id}/invites/${invId}`),
  removeMember:     (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  // My invites
  getMyInvites:     ()           => api.get('/groups/my-invites'),
  validateInvite:   (token)      => api.get(`/groups/invite/${token}/validate`),
  acceptInvite:     (token)      => api.post(`/groups/invite/${token}/accept`),
  declineInvite:    (token)      => api.post(`/groups/invite/${token}/decline`),
  // Shared exams
  shareExam:        (id, examId) => api.post(`/groups/${id}/share-exam`, { examId }),
  unshareExam:      (id, examId) => api.delete(`/groups/${id}/share-exam/${examId}`),
  // Chat
  getMessages:      (id, params) => api.get(`/groups/${id}/messages`, { params }),
  sendMessage:      (id, data)   => api.post(`/groups/${id}/messages`, data),
  editMessage:      (id, msgId, text) => api.patch(`/groups/${id}/messages/${msgId}`, { text }),
  deleteMessage:    (id, msgId)  => api.delete(`/groups/${id}/messages/${msgId}`),
  // Bulk invite
  bulkInvite:       (id, emails) => api.post(`/groups/${id}/bulk-invite`, { emails }),
  // Admin
  adminGetAll:      ()           => api.get('/groups/admin'),
  adminDelete:      (id)         => api.delete(`/groups/admin/${id}`),
};

export const notificationApi = {
  getAll:      ()   => api.get('/notifications'),
  getById:     (id) => api.get(`/notifications/${id}`),
  markRead:    (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: ()   => api.patch('/notifications/read-all'),
  delete:      (id) => api.delete(`/notifications/${id}`),
};

export const resourceApi = {
  // Upload (admin or instructor)
  upload: (file, title, groupId = null) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    if (groupId) form.append('groupId', groupId);
    return api.post('/resources', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Admin: list + upload via admin panel
  adminList: () => api.get('/admin/resources'),
  adminUpload: (file, title) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', title);
    return api.post('/admin/resources', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  adminDelete: (id) => api.delete(`/admin/resources/${id}`),
  // Instructor: get admin resources for dropdown
  getAdminResources: () => api.get('/resources/admin'),
  // Instructor: get own resources (across groups)
  getMyResources: () => api.get('/resources/mine'),
  // Group resources
  getGroupResources: (groupId) => api.get(`/resources/group/${groupId}`),
  // Get extracted text for AI generation
  getText: (id) => api.get(`/resources/${id}/text`),
  // Delete
  delete: (id) => api.delete(`/resources/${id}`),
};

export const contactApi = {
  submit: (data) => api.post('/contact', data),
  getAll: (params) => api.get('/contact', { params }),
  updateStatus: (id, status) => api.patch(`/contact/${id}/status`, { status }),
  reply: (id, reply) => api.post(`/contact/${id}/reply`, { reply }),
  delete: (id) => api.delete(`/contact/${id}`),
};

export const feedbackApi = {
  submit: (data) => api.post('/feedback', data),
  getLimits: () => api.get('/feedback/limits'),
  getAdmin: () => api.get('/feedback/admin'),
  reply: (id, reply) => api.patch(`/feedback/admin/${id}/reply`, { reply }),
};

export const ticketApi = {
  create: ({ title, description, type, attachment }) => {
    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    form.append('type', type);
    if (attachment) form.append('attachment', attachment);
    return api.post('/tickets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getMine: (page = 1) => api.get(`/tickets/mine?page=${page}`),
  adminGetAll: (params = {}) => api.get('/tickets/admin', { params }),
  adminUpdate: (id, data) => api.patch(`/tickets/admin/${id}`, data),
};

/** Help center — uses optional auth cookie; topics filtered by role on server */
export const helpApi = {
  getTopics: () => api.get('/help/topics'),
  getTopic: (topicId) => api.get(`/help/topics/${topicId}`),
};

export const announcementApi = {
  // User
  getAll:   ()   => api.get('/announcements'),
  markRead: (id) => api.post(`/announcements/${id}/read`),
  dismiss:  (id) => api.post(`/announcements/${id}/dismiss`),
  // Admin
  adminGetAll: ()         => api.get('/announcements/admin'),
  adminCreate: (data)     => api.post('/announcements/admin', data),
  adminUpdate: (id, data) => api.put(`/announcements/admin/${id}`, data),
  adminDelete: (id)       => api.delete(`/announcements/admin/${id}`),
  adminToggle: (id)       => api.patch(`/announcements/admin/${id}/toggle`),
};

export const enterpriseApi = {
  adminList: () => api.get('/enterprise/admin/list'),
  adminCreate: (data) => api.post('/enterprise/admin/create', data),
  adminAllLogs: (params = {}) => api.get('/enterprise/admin/logs', { params }),
  adminPatchLimit: (id, teacherLimit) => api.patch(`/enterprise/admin/${id}/teacher-limit`, { teacherLimit }),
  adminUpdate: (id, data) => api.patch(`/enterprise/admin/${id}`, data),
  adminDelete: (id) => api.delete(`/enterprise/admin/${id}`),
  adminLogs: (id, params = {}) => api.get(`/enterprise/admin/${id}/logs`, { params }),
  principalContext: () => api.get('/enterprise/principal/context'),
  principalInvite: (data) => api.post('/enterprise/principal/teachers/invite', data),
  principalTeachers: () => api.get('/enterprise/principal/teachers'),
  principalUpdateTeacher: (id, data) => api.patch(`/enterprise/principal/teachers/${id}`, data),
  principalToggleTeacherBlock: (id) => api.patch(`/enterprise/principal/teachers/${id}/block`),
  principalRemoveTeacher: (id) => api.delete(`/enterprise/principal/teachers/${id}`),
  principalCancelInvite: (id) => api.delete(`/enterprise/principal/invites/${id}`),
  principalImpersonate: (id) => api.post(`/enterprise/principal/impersonate/${id}`),
  principalLogs: (params = {}) => api.get('/enterprise/principal/logs', { params }),
  principalLogStats: () => api.get('/enterprise/principal/logs/stats'),
  stopImpersonation: () => api.post('/enterprise/principal/stop-impersonation'),
  acceptInvite: (token) => api.post(`/enterprise/invites/${encodeURIComponent(token)}/accept`),
  schoolClasses: () => api.get('/enterprise/school/classes'),
  schoolCreateClass: (data) => api.post('/enterprise/school/classes', data),
  schoolStudents: (classId) => api.get('/enterprise/school/students', { params: classId ? { classId } : {} }),
  schoolInviteStudent: (data) => api.post('/enterprise/school/students', data),
  schoolBulkInviteStudents: (students) => api.post('/enterprise/school/students/bulk', { students }),
};

export default api;
