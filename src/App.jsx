import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore, useThemeStore } from './store/index.js';

import AuthLayout from './layouts/AuthLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import MainLayout from './layouts/MainLayout.jsx';

import AboutPage from './pages/AboutPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import CertificatesPage from './pages/CertificatesPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import CreateExamPage from './pages/CreateExamPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ExamPage from './pages/ExamPage.jsx';
import HomePage from './pages/HomePage.jsx';
import InstructorPage from './pages/InstructorPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PricingPage from './pages/PricingPage.jsx';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import StudyModePage from './pages/StudyModePage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import VerifyCertPage from './pages/VerifyCertPage.jsx';

const Guard = ({ children, adminOnly, instructorOnly }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  if (instructorOnly && !['instructor', 'admin'].includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const { init } = useThemeStore();
  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
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
          <Route path="verify/:certId" element={<VerifyCertPage />} />
        </Route>

        {/* Auth pages */}
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>

        {/* Fullscreen exam (no layout) */}
        <Route path="exam/:id" element={<Guard><ExamPage /></Guard>} />
        <Route path="results/:id" element={<Guard><ResultPage /></Guard>} />

        {/* Dashboard (sidebar layout) */}
        <Route element={<Guard><DashboardLayout /></Guard>}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="create-exam" element={<CreateExamPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="study" element={<StudyModePage />} />
          <Route path="admin" element={<Guard adminOnly><AdminPage /></Guard>} />
          <Route path="instructor" element={<Guard instructorOnly><InstructorPage /></Guard>} />
        </Route>

        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
