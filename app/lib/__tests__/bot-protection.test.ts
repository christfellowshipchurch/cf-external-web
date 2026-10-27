import { describe, expect, it } from 'vitest';
import {
  FORM_STARTED_AT_FIELD,
  getBotBlockReason,
  HONEYPOT_FIELD,
  MIN_FILL_TIME_MS,
} from '../bot-protection';

const NOW = 1_800_000_000_000;

function submission(overrides: Record<string, string> = {}) {
  return {
    firstName: 'Jane',
    [HONEYPOT_FIELD]: '',
    [FORM_STARTED_AT_FIELD]: String(NOW - 30_000),
    ...overrides,
  };
}

describe('getBotBlockReason', () => {
  it('lets a real person through: empty honeypot and a normal fill time', () => {
    expect(getBotBlockReason(submission(), NOW)).toBeNull();
  });

  it('lets a person through at exactly the minimum fill time', () => {
    const startedAt = String(NOW - MIN_FILL_TIME_MS);
    expect(
      getBotBlockReason(
        submission({ [FORM_STARTED_AT_FIELD]: startedAt }),
        NOW,
      ),
    ).toBeNull();
  });

  it('blocks when a bot fills the hidden honeypot field', () => {
    expect(
      getBotBlockReason(
        submission({ [HONEYPOT_FIELD]: 'https://spam.example' }),
        NOW,
      ),
    ).toBe('honeypot');
  });

  it('treats a whitespace-only honeypot as empty, so autofill quirks do not block people', () => {
    expect(
      getBotBlockReason(submission({ [HONEYPOT_FIELD]: '   ' }), NOW),
    ).toBeNull();
  });

  it('blocks a submission faster than any person could fill the form', () => {
    const startedAt = String(NOW - (MIN_FILL_TIME_MS - 1));
    expect(
      getBotBlockReason(
        submission({ [FORM_STARTED_AT_FIELD]: startedAt }),
        NOW,
      ),
    ).toBe('too-fast');
  });

  it('blocks a post that skipped the form entirely (no start time)', () => {
    const { [FORM_STARTED_AT_FIELD]: _startedAt, ...data } = submission();
    expect(getBotBlockReason(data, NOW)).toBe('missing-start-time');
  });

  it('blocks a garbage start time instead of letting it through', () => {
    expect(
      getBotBlockReason(submission({ [FORM_STARTED_AT_FIELD]: 'abc' }), NOW),
    ).toBe('missing-start-time');
  });
});
