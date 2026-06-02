/** User-safe copy — never expose provider names or technical details. */
export const AI_SERVICE_UNAVAILABLE = {
  title: 'Unable to create your exam right now',
  message:
    'Our AI services are currently experiencing high demand.\n\nOur team has already been notified and is working to restore normal service.\n\nPlease try again in a few minutes.',
  helperText: 'If the issue continues, please contact support through Help & Tickets.',
  code: 'AI_SERVICE_UNAVAILABLE',
};

const PROVIDER_LEAK_RE = /\b(groq|openai|gemini|claude|anthropic|rate limit|token limit|organization|llama-|gpt-|api key)\b/i;

export function responseLooksLikeAiOutage(err) {
  const data = err?.response?.data || {};
  if (data.userFacingAi === true) return true;
  if (data.code === 'AI_SERVICE_UNAVAILABLE') return true;
  const status = err?.response?.status;
  if (status === 503 && data.userFacingAi !== false) return true;
  const code = String(data.code || '');
  if (code.startsWith('AI_')) return true;
  const msg = String(data.message || err?.message || '');
  return PROVIDER_LEAK_RE.test(msg);
}

export function buildAdminAiDiagnosticsView(data) {
  const d = data?.aiDiagnostics || {};
  return {
    title: 'AI service failure — technical details',
    provider: d.providerDisplayName || d.provider || '—',
    errorType: d.errorType || '—',
    errorCode: d.errorCode || '—',
    model: d.model || '—',
    tokensUsed: d.tokensUsed,
    tokensLimit: d.tokensLimit,
    environment: d.environment || '—',
    timestamp: d.timestamp || '—',
    rawResponse: d.rawResponse || '',
    message: d.message || data?.message || '',
  };
}

/**
 * @param {import('axios').AxiosError} err
 * @param {{ isAdmin?: boolean }} opts
 */
export function getAiErrorPresentation(err, { isAdmin = false } = {}) {
  const data = err?.response?.data || {};

  if (isAdmin && data.adminOnly && data.aiDiagnostics) {
    return { kind: 'admin', admin: buildAdminAiDiagnosticsView(data) };
  }

  if (responseLooksLikeAiOutage(err)) {
    return {
      kind: 'user',
      title: data.title || AI_SERVICE_UNAVAILABLE.title,
      message: data.message || AI_SERVICE_UNAVAILABLE.message,
      helperText: data.helperText || AI_SERVICE_UNAVAILABLE.helperText,
      code: AI_SERVICE_UNAVAILABLE.code,
    };
  }

  return null;
}
