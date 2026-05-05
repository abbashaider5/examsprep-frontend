/** Normalize result answers to an array (handles API shapes that are plain objects). */
export function normalizeAnswers(ans) {
  if (!ans) return [];
  if (Array.isArray(ans)) return ans;
  if (typeof ans === 'object') {
    const keys = Object.keys(ans);
    const numeric = keys.filter(k => /^\d+$/.test(k));
    if (numeric.length) {
      return numeric
        .sort((a, b) => Number(a) - Number(b))
        .map(k => ans[k])
        .filter(Boolean);
    }
    return Object.values(ans).filter(v => v != null && typeof v === 'object');
  }
  return [];
}
