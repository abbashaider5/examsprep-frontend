/** Keep in sync with server/services/proctoringScreenshotRetention.js */
export const SCREENSHOT_RETENTION_DAYS = 14;

export function screenshotDaysRemaining(capturedAt, retentionDays = SCREENSHOT_RETENTION_DAYS) {
  const ts = new Date(capturedAt).getTime();
  if (Number.isNaN(ts)) return null;
  const ageDays = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  return Math.max(0, retentionDays - ageDays);
}
