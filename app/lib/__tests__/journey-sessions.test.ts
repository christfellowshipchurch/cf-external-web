import { describe, expect, it } from 'vitest';
import {
  formatSessionDateHeading,
  formatSessionShortDate,
  formatSessionTime,
  pickEarliestAvailable,
  type JourneySessionOption,
} from '../journey-sessions';

const option = (
  overrides: Partial<JourneySessionOption>,
): JourneySessionOption => ({
  sessionNumber: 1,
  groupGuid: 'g',
  campusId: 2,
  startsAt: '2026-11-01T09:45',
  isFull: false,
  isPast: false,
  offersChildcare: false,
  ...overrides,
});

describe('Journey session labels', () => {
  // Labels come from Rock's Eastern wall-clock digits, so they must not move
  // when the browser or server is in another zone (vitest runs with the host
  // TZ; CI and production servers are UTC).
  it('keeps a late-evening ET session on its own day', () => {
    expect(formatSessionDateHeading('2026-10-04T21:30')).toBe(
      'Sunday, October 4',
    );
    expect(formatSessionShortDate('2026-10-04T21:30')).toBe('Sun, Oct 4');
    expect(formatSessionTime('2026-10-04T21:30')).toBe('9:30 PM');
  });

  it('formats noon and midnight correctly', () => {
    expect(formatSessionTime('2026-10-04T12:05')).toBe('12:05 PM');
    expect(formatSessionTime('2026-10-04T00:00')).toBe('12:00 AM');
  });
});

describe('pickEarliestAvailable', () => {
  const options = [
    option({ sessionNumber: 1, startsAt: '2026-09-27T09:00', isPast: true }),
    option({ sessionNumber: 1, startsAt: '2026-10-04T09:00', isFull: true }),
    option({ sessionNumber: 1, startsAt: '2026-10-04T11:00', groupGuid: 'b' }),
    option({ sessionNumber: 1, startsAt: '2026-09-06T09:00', campusId: 3 }),
    option({ sessionNumber: 2, startsAt: '2026-10-11T09:00' }),
    option({ sessionNumber: 3, startsAt: '2026-10-18T09:00' }),
  ];

  it('picks the earliest open time per session at the preferred campus', () => {
    const selection = pickEarliestAvailable(options, 2);

    expect(selection[1]?.groupGuid).toBe('b'); // past and full skipped, other campus ignored
    expect(selection[2]?.startsAt).toBe('2026-10-11T09:00');
    expect(selection[3]?.startsAt).toBe('2026-10-18T09:00');
  });

  it('leaves already-registered sessions alone', () => {
    const selection = pickEarliestAvailable(options, 2, [2]);

    expect(selection[2]).toBeUndefined();
    expect(selection[1]).toBeDefined();
  });
});
