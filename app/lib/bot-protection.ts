// Honeypot bot check shared by public forms: the form renders <HoneypotFields />,
// and the route action calls getBotBlockReason() before sending anything to Rock.

export const HONEYPOT_FIELD = 'website';
export const FORM_STARTED_AT_FIELD = 'formStartedAt';

// A person can't fill out a whole form faster than this; simple bots post instantly.
export const MIN_FILL_TIME_MS = 3000;

export type BotBlockReason = 'honeypot' | 'missing-start-time' | 'too-fast';

export function getBotBlockReason(
  formData: Record<string, unknown>,
  now = Date.now(),
): BotBlockReason | null {
  const honeypot = formData[HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return 'honeypot';
  }

  // The start time comes from the server (loader), so client clock skew can't trip it.
  const startedAt = Number(formData[FORM_STARTED_AT_FIELD]);
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return 'missing-start-time';
  }

  if (now - startedAt < MIN_FILL_TIME_MS) {
    return 'too-fast';
  }

  return null;
}

// Count-only log line so blocked volume can be measured; never log form values.
export function logBlockedSubmission(formName: string, reason: BotBlockReason) {
  console.warn(`[bot-protection] blocked ${formName} submission: ${reason}`);
}
