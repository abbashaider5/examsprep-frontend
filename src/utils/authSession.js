import { setAccessToken } from './authToken.js';
import { getDashboardPath } from './dashboardPath.js';

export function isLogin2FAResponse(data) {
  return !!(data?.requiresOTP || data?.requiresTOTP || data?.requires2FA);
}

/** Complete session after a successful login / OTP / TOTP response. */
export function completeAuthSession(data, { setUser, navigate, toast }) {
  if (!data?.user) {
    toast?.error?.('Sign-in succeeded but account data was missing. Please try again.');
    return false;
  }
  setUser(data.user);
  if (data.accessToken) setAccessToken(data.accessToken);
  if (data.redirectPath) navigate(data.redirectPath);
  else navigate(getDashboardPath(data.user.role));
  return true;
}
