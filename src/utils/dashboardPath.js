/** Default app home after login / “dashboard” navigation by role. */
export function getDashboardPath(role) {
  if (role === 'admin') return '/admin-dashboard';
  if (role === 'principal') return '/enterprise-dashboard';
  if (role === 'instructor') return '/instructor-dashboard';
  return '/dashboard';
}
