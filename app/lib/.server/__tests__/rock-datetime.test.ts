import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { parseRockDateTime, toRockDateTimeLiteral } from '../rock-datetime';

// Production (Netlify) runs in UTC. A dev machine on Eastern time parses
// offset-less strings "correctly" by accident, which is how CFDP-4377 shipped.
beforeAll(() => {
  vi.stubEnv('TZ', 'UTC');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('test host timezone', () => {
  it('runs these tests in UTC so a naive new Date() parse would be caught', () => {
    expect(new Date('2026-09-25T18:00:00').toISOString()).toBe(
      '2026-09-25T18:00:00.000Z',
    );
  });
});

describe('parseRockDateTime', () => {
  it('reads an offset-less summer (EDT) value as UTC-4', () => {
    expect(parseRockDateTime('2026-09-25T18:00:00').toISOString()).toBe(
      '2026-09-25T22:00:00.000Z',
    );
  });

  it('reads an offset-less winter (EST) value as UTC-5', () => {
    expect(parseRockDateTime('2026-12-04T18:00:00').toISOString()).toBe(
      '2026-12-04T23:00:00.000Z',
    );
  });

  it('keeps fractional seconds Rock sometimes returns', () => {
    expect(parseRockDateTime('2026-09-25T18:00:00.5').toISOString()).toBe(
      '2026-09-25T22:00:00.500Z',
    );
  });

  it('treats a date-only value as Eastern midnight', () => {
    expect(parseRockDateTime('2026-09-25').toISOString()).toBe(
      '2026-09-25T04:00:00.000Z',
    );
  });

  it('uses the post-transition offset on the DST start and end days', () => {
    // 2026-03-08: clocks spring forward at 2 AM ET.
    expect(parseRockDateTime('2026-03-08T12:00:00').toISOString()).toBe(
      '2026-03-08T16:00:00.000Z',
    );
    // 2026-11-01: clocks fall back at 2 AM ET.
    expect(parseRockDateTime('2026-11-01T12:00:00').toISOString()).toBe(
      '2026-11-01T17:00:00.000Z',
    );
  });

  it('respects an explicit offset instead of reinterpreting it', () => {
    expect(parseRockDateTime('2026-09-25T18:00:00Z').toISOString()).toBe(
      '2026-09-25T18:00:00.000Z',
    );
    expect(parseRockDateTime('2026-09-25T18:00:00-04:00').toISOString()).toBe(
      '2026-09-25T22:00:00.000Z',
    );
  });
});

describe('toRockDateTimeLiteral', () => {
  it('formats an instant as Eastern wall-clock time without an offset', () => {
    expect(toRockDateTimeLiteral(new Date('2026-09-25T22:00:00Z'))).toBe(
      '2026-09-25T18:00:00',
    );
    expect(toRockDateTimeLiteral(new Date('2026-12-04T23:00:00Z'))).toBe(
      '2026-12-04T18:00:00',
    );
  });

  it('rolls back to the previous Eastern day late in the UTC evening', () => {
    expect(toRockDateTimeLiteral(new Date('2026-09-26T02:30:00Z'))).toBe(
      '2026-09-25T22:30:00',
    );
  });

  it('round-trips with parseRockDateTime', () => {
    const instant = new Date('2026-07-04T15:45:30Z');
    expect(parseRockDateTime(toRockDateTimeLiteral(instant))).toEqual(instant);
  });
});
