import { describe, expect, it } from 'vitest';
import {
  findJourneyCampusBySlug,
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
  // Mirrors Palm Beach Gardens: October's group has Sessions 1–2 behind it,
  // so the earliest class someone can attend start to finish is November's.
  const group = (
    groupGuid: string,
    dates: [string, string, string],
    extra: Partial<JourneySessionOption>[] = [],
  ) =>
    dates.map((startsAt, i) =>
      option({
        groupGuid,
        sessionNumber: (i + 1) as 1 | 2 | 3,
        startsAt,
        ...extra[i],
      }),
    );
  const options = [
    ...group(
      'other-campus',
      ['2026-10-25T09:00', '2026-10-26T09:00', '2026-10-27T09:00'],
      [{ campusId: 3 }, { campusId: 3 }, { campusId: 3 }],
    ),
    ...group(
      'oct',
      ['2026-10-04T09:45', '2026-10-11T09:45', '2026-10-18T09:45'],
      [{ isPast: true }, { isPast: true }],
    ),
    ...group('nov', [
      '2026-11-01T09:45',
      '2026-11-08T09:45',
      '2026-11-15T09:45',
    ]),
    ...group('dec', [
      '2026-12-06T09:45',
      '2026-12-13T09:45',
      '2026-12-13T10:45',
    ]),
  ];

  it('selects all three sessions from the earliest group that is fully open', () => {
    const selection = pickEarliestAvailable(options, 2);

    expect(
      [selection[1], selection[2], selection[3]].map((o) => o?.groupGuid),
    ).toEqual(['nov', 'nov', 'nov']);
  });

  // One full session means the class can't be attended together, so skip the group.
  it('skips a group with any full session', () => {
    const withFull = options.map((o) =>
      o.groupGuid === 'nov' && o.sessionNumber === 2
        ? { ...o, isFull: true }
        : o,
    );

    expect(pickEarliestAvailable(withFull, 2)[1]?.groupGuid).toBe('dec');
  });

  // Already-registered sessions don't need to be open, so October's open
  // Session 3 qualifies once 1 and 2 are booked.
  it('only requires the sessions still to be scheduled', () => {
    const selection = pickEarliestAvailable(options, 2, [1, 2]);

    expect(selection[1]).toBeUndefined();
    expect(selection[2]).toBeUndefined();
    expect(selection[3]?.groupGuid).toBe('oct');
  });

  it('selects nothing when no group at the campus is fully open', () => {
    expect(pickEarliestAvailable(options, 99)).toEqual({});
  });
});

describe('findJourneyCampusBySlug', () => {
  // Staff send campus links built from the location-page slugs, so a slug must
  // land on the campus Rock returns by name.
  const campuses = [
    { id: 3, name: 'Port St. Lucie', street1: '', city: '', mapLink: '' },
    { id: 2, name: 'Palm Beach Gardens', street1: '', city: '', mapLink: '' },
  ];

  it('maps a location-page slug to that campus', () => {
    expect(findJourneyCampusBySlug(campuses, 'port-st-lucie')?.id).toBe(3);
    expect(findJourneyCampusBySlug(campuses, ' Port-St-Lucie ')?.id).toBe(3);
  });

  it('returns nothing for a missing, unknown, or session-less campus', () => {
    expect(findJourneyCampusBySlug(campuses, null)).toBeUndefined();
    expect(findJourneyCampusBySlug(campuses, 'psl')).toBeUndefined();
    expect(findJourneyCampusBySlug(campuses, 'jupiter')).toBeUndefined();
  });
});
