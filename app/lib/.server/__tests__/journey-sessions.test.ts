import { describe, expect, it } from 'vitest';
import {
  buildJourneySessionOptions,
  type RockJourneyGroup,
} from '../journey-sessions';

const value = (v: string) => ({ value: v });

const makeGroup = (
  overrides: Partial<RockJourneyGroup> & {
    classOne?: string;
    classTwo?: string;
    classThree?: string;
    displayStartDate?: string;
    displayEndDate?: string;
  } = {},
): RockJourneyGroup => {
  const {
    classOne = '2026-11-01T09:45:00.0000000',
    classTwo = '2026-11-08T09:45:00.0000000',
    classThree = '2026-11-15T09:45:00.0000000',
    displayStartDate = '',
    displayEndDate = '',
    ...rest
  } = overrides;
  return {
    id: 1,
    guid: 'group-a',
    campusId: 2,
    groupCapacity: null,
    attributeValues: {
      classOne: value(classOne),
      classTwo: value(classTwo),
      classThree: value(classThree),
      displayStartDate: value(displayStartDate),
      displayEndDate: value(displayEndDate),
    },
    ...rest,
  };
};

const noCounts = new Map();

describe('buildJourneySessionOptions', () => {
  it('turns each group into one option per session, keyed by its own ET start', () => {
    const options = buildJourneySessionOptions({
      groups: [makeGroup()],
      sessionCounts: noCounts,
      now: new Date('2026-10-12T12:00:00Z'),
    });

    expect(options).toEqual([
      expect.objectContaining({
        sessionNumber: 1,
        startsAt: '2026-11-01T09:45',
      }),
      expect.objectContaining({
        sessionNumber: 2,
        startsAt: '2026-11-08T09:45',
      }),
      expect.objectContaining({
        sessionNumber: 3,
        startsAt: '2026-11-15T09:45',
      }),
    ]);
  });

  // Production runs in UTC. At 11:30 PM ET it is already the next day in UTC;
  // reading Rock's offset-less values as UTC would hide a session that is
  // still 15 minutes away, or keep one that started 15 minutes ago.
  it('judges past sessions in Eastern time across the midnight-UTC rollover', () => {
    const now = new Date('2026-10-13T03:30:00Z'); // Oct 12, 11:30 PM EDT
    const options = buildJourneySessionOptions({
      groups: [
        makeGroup({
          classOne: '2026-10-12T23:15:00', // started 15 min ago (ET)
          classTwo: '2026-10-12T23:45:00', // 15 min from now (ET)
          classThree: '2026-10-19T09:00:00',
        }),
      ],
      sessionCounts: noCounts,
      now,
    });

    expect(options.map((o) => o.sessionNumber)).toEqual([2, 3]);
  });

  it('uses the standard-time offset after the November DST change', () => {
    // Nov 1 2026 is the fall-back date; 9:45 AM EST = 14:45 UTC.
    const groups = [makeGroup({ classOne: '2026-11-01T09:45:00' })];
    const justBefore = buildJourneySessionOptions({
      groups,
      sessionCounts: noCounts,
      now: new Date('2026-11-01T14:44:00Z'),
    });
    const justAfter = buildJourneySessionOptions({
      groups,
      sessionCounts: noCounts,
      now: new Date('2026-11-01T14:46:00Z'),
    });

    expect(justBefore.some((o) => o.sessionNumber === 1)).toBe(true);
    expect(justAfter.some((o) => o.sessionNumber === 1)).toBe(false);
  });

  it('respects the finder display window', () => {
    const now = new Date('2026-10-12T12:00:00Z');
    const notYet = makeGroup({ displayStartDate: '2026-10-20T00:00:00' });
    const ended = makeGroup({ displayEndDate: '2026-10-01T00:00:00' });

    expect(
      buildJourneySessionOptions({
        groups: [notYet, ended],
        sessionCounts: noCounts,
        now,
      }),
    ).toEqual([]);
  });

  it('never marks a session full when the group has no capacity (the default today)', () => {
    const options = buildJourneySessionOptions({
      groups: [makeGroup()],
      sessionCounts: new Map([[1, { 1: 500, 2: 500, 3: 500 }]]),
      now: new Date('2026-10-12T12:00:00Z'),
    });

    expect(options.every((o) => !o.isFull)).toBe(true);
  });

  it('marks only the sessions whose flagged member count has reached capacity', () => {
    const options = buildJourneySessionOptions({
      groups: [makeGroup({ groupCapacity: 20 })],
      sessionCounts: new Map([[1, { 1: 19, 2: 20, 3: 21 }]]),
      now: new Date('2026-10-12T12:00:00Z'),
    });

    expect(options.map((o) => [o.sessionNumber, o.isFull])).toEqual([
      [1, false],
      [2, true],
      [3, true],
    ]);
  });

  it('skips sessions with no date and groups with no campus', () => {
    const options = buildJourneySessionOptions({
      groups: [
        makeGroup({ classThree: '' }),
        makeGroup({ id: 2, guid: 'no-campus', campusId: null }),
      ],
      sessionCounts: noCounts,
      now: new Date('2026-10-12T12:00:00Z'),
    });

    expect(options.map((o) => o.sessionNumber)).toEqual([1, 2]);
  });
});
