import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore, useThemeStore } from './store/index.js';

import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import HelpLayout from './layouts/HelpLayout.jsx';
import MainLayout from './layouts/MainLayout.jsx';

import AboutPage from './pages/AboutPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CertificatesPage from './pages/CertificatesPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import CreateExamPage from './pages/CreateExamPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EnterpriseAddTeacherPage from './pages/EnterpriseAddTeacherPage.jsx';
import EnterpriseDashboardPage from './pages/EnterpriseDashboardPage.jsx';
import EnterpriseTeachersPage from './pages/EnterpriseTeachersPage.jsx';
import EnterpriseLogsPage from './pages/EnterpriseLogsPage.jsx';
import EditQuestionsPage from './pages/EditQuestionsPage.jsx';
import ExamPage from './pages/ExamPage.jsx';
import HelpCenterPage from './pages/HelpCenterPage.jsx';
import HelpTopicPage from './pages/HelpTopicPage.jsx';
import HomePage from './pages/HomePage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import GroupsPage, { GroupInviteAcceptPage } from './pages/GroupsPage.jsx';
import InstructorAnalyticsPage from './pages/InstructorAnalyticsPage.jsx';
import InstructorPage from './pages/InstructorPage.jsx';
import InstructorPerformancePage from './pages/InstructorPerformancePage.jsx';
import InstructorReportPage from './pages/InstructorReportPage.jsx';
import InstructorStudentAttemptPage from './pages/InstructorStudentAttemptPage.jsx';
import InstructorProctoringReviewPage from './pages/InstructorProctoringReviewPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import NotificationDetailPage from './pages/NotificationDetailPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import AcceptableUsePolicyPage from './pages/AcceptableUsePolicyPage.jsx';
import AiProctoringConsentPolicyPage from './pages/AiProctoringConsentPolicyPage.jsx';
import CookiePolicyPage from './pages/CookiePolicyPage.jsx';
import DataRetentionPolicyPage from './pages/DataRetentionPolicyPage.jsx';
import EnterpriseDataSecurityPage from './pages/EnterpriseDataSecurityPage.jsx';
import LegalContactGrievancePage from './pages/LegalContactGrievancePage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import RefundCancellationPolicyPage from './pages/RefundCancellationPolicyPage.jsx';
import StudentMonitoringDisclosurePage from './pages/StudentMonitoringDisclosurePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PlanPage from './pages/PlanPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import SchoolClassesCreatePage from './pages/SchoolClassesPage.jsx';
import SchoolClassesManagePage from './pages/SchoolClassesManagePage.jsx';
import SchoolStudentsCreatePage from './pages/SchoolStudentsPage.jsx';
import SchoolStudentsManagePage from './pages/SchoolStudentsManagePage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import StudyModePage from './pages/StudyModePage.jsx';
import StudyPerformancePage from './pages/StudyPerformancePage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import VerifyCertPage from './pages/VerifyCertPage.jsx';
import { getDashboardPath } from './utils/dashboardPath.js';
import RouteSeo from './components/RouteSeo.jsx';

function DashboardPageRoute() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }
  if (user?.role === 'principal') {
    return <Navigate to="/enterprise-dashboard" replace />;
  }
  if (user?.role === 'instructor') {
    return <Navigate to="/instructor-dashboard" replace />;
  }
  return <DashboardPage />;
}

/** Instructor home only — admins are sent to the platform admin panel. */
function InstructorDashboardRoute() {
  const { user } = useAuthStore();
  if (user?.role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }
  if (user?.role === 'principal') {
    return <Navigate to="/enterprise-dashboard" replace />;
  }
  return <InstructorPage />;
}

/** Instructor workspace routes (tests, create exam, etc.) */
const Guard = ({ children, adminOnly, instructorOnly, instructorPrincipalOrAdmin, principalOnly }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }
  if (principalOnly && user?.role !== 'principal') {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }
  if (instructorPrincipalOrAdmin && !['instructor', 'admin', 'principal'].includes(user?.role)) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }
  if (instructorOnly && !['instructor', 'admin'].includes(user?.role)) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }
  return children;
};

export default function App() {
  const { init } = useThemeStore();
  useEffect(() => { init(); }, [init]);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId || 'missing-google-client-id'}>
      <BrowserRouter>
        <RouteSeo />
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '10px', fontSize: '14px', fontFamily: 'Inter, sans-serif' } }} />

      <Routes>
        {/* Public marketing pages */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="legal/refunds" element={<RefundCancellationPolicyPage />} />
          <Route path="legal/cookies" element={<CookiePolicyPage />} />
          <Route path="legal/ai-proctoring" element={<AiProctoringConsentPolicyPage />} />
          <Route path="legal/data-retention" element={<DataRetentionPolicyPage />} />
          <Route path="legal/acceptable-use" element={<AcceptableUsePolicyPage />} />
          <Route path="legal/student-monitoring" element={<StudentMonitoringDisclosurePage />} />
          <Route path="legal/enterprise-security" element={<EnterpriseDataSecurityPage />} />
          <Route path="legal/contact" element={<LegalContactGrievancePage />} />
          <Route path="verify/:certId" element={<VerifyCertPage />} />
        </Route>

        {/* Help center — public, full-width layout with search */}
        <Route path="help" element={<HelpLayout />}>
          <Route index element={<HelpCenterPage />} />
          <Route path=":topicId" element={<HelpTopicPage />} />
        </Route>

        {/* Auth pages */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Fullscreen exam (no layout) */}
        <Route path="exam/:id" element={<Guard><ExamPage /></Guard>} />
        <Route path="results/:id" element={<Guard><ResultPage /></Guard>} />

        {/* Dashboard (sidebar layout) */}
        <Route element={<Guard><DashboardLayout /></Guard>}>
          <Route path="dashboard" element={<DashboardPageRoute />} />
          <Route path="create-exam" element={<Guard instructorOnly><CreateExamPage /></Guard>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="plan" element={<Guard instructorPrincipalOrAdmin><PlanPage /></Guard>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="study" element={<Navigate to="/tests" replace />} />
          <Route path="tests" element={<StudyModePage />} />
          <Route path="performance" element={<StudyPerformancePage />} />
          <Route path="admin" element={<Navigate to="/admin-dashboard" replace />} />
          <Route path="admin-dashboard" element={<Guard adminOnly><AdminPage /></Guard>} />
          <Route path="instructor" element={<Navigate to="/instructor-dashboard" replace />} />
          <Route path="instructor-dashboard" element={<Guard instructorOnly><InstructorDashboardRoute /></Guard>} />
          <Route path="test-reports" element={<Guard instructorOnly><InstructorAnalyticsPage /></Guard>} />
          <Route path="instructor/analytics" element={<Navigate to="/test-reports" replace />} />
          <Route path="instructor/performance" element={<Guard instructorOnly><InstructorPerformancePage /></Guard>} />
          <Route path="instructor/report/:examId/student/:userId" element={<Guard instructorOnly><InstructorStudentAttemptPage /></Guard>} />
          <Route path="instructor/report/:examId/student/:userId/proctoring" element={<Guard instructorOnly><InstructorProctoringReviewPage /></Guard>} />
          <Route path="instructor/report/:examId" element={<Guard instructorOnly><InstructorReportPage /></Guard>} />
          <Route path="exam/:id/edit-questions" element={<Guard instructorOnly><EditQuestionsPage /></Guard>} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="groups/:groupId" element={<GroupsPage />} />
          <Route path="batches" element={<GroupsPage />} />
          <Route path="batches/:groupId" element={<GroupsPage />} />
          <Route path="notifications/:id" element={<NotificationDetailPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="enterprise-dashboard" element={<Guard principalOnly><EnterpriseDashboardPage /></Guard>} />
          <Route path="enterprise/teachers" element={<Guard principalOnly><EnterpriseTeachersPage /></Guard>} />
          <Route path="enterprise/teachers/new" element={<Guard principalOnly><EnterpriseAddTeacherPage /></Guard>} />
          <Route path="enterprise/logs" element={<Guard principalOnly><EnterpriseLogsPage /></Guard>} />
          <Route path="school/classes" element={<Guard instructorOnly><SchoolClassesManagePage /></Guard>} />
          <Route path="school/classes/new" element={<Guard instructorOnly><SchoolClassesCreatePage /></Guard>} />
          <Route path="school/students" element={<Guard instructorOnly><SchoolStudentsManagePage /></Guard>} />
          <Route path="school/students/new" element={<Guard instructorOnly><SchoolStudentsCreatePage /></Guard>} />
        </Route>

        {/* Group invite accept (needs auth but no layout) */}
        <Route path="groups/invite/:token" element={<Guard><GroupInviteAcceptPage /></Guard>} />

        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
