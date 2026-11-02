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
  // reading Rock's offset-less values as UTC would close the walk-in window
  // on a session that is still 15 minutes away. Past sessions stay in the
  // list so a group's dates still line up by month.
  it('judges past sessions in Eastern time across the midnight-UTC rollover', () => {
    const now = new Date('2026-10-13T03:30:00Z'); // Oct 12, 11:30 PM EDT
    const options = buildJourneySessionOptions({
      groups: [
        makeGroup({
          classOne: '2026-10-12T20:00:00', // 3.5 hours ago (ET) — window closed
          classTwo: '2026-10-12T23:15:00', // 15 min ago (ET) — still open
          classThree: '2026-10-12T23:45:00', // 15 min from now (ET)
        }),
      ],
      sessionCounts: noCounts,
      now,
    });

    expect(options.map((o) => [o.sessionNumber, o.isPast])).toEqual([
      [1, true],
      [2, false],
      [3, false],
    ]);
  });

  // A walk-in who shows up after the session starts still needs to register.
  // The option stays selectable until 3 hours after the Eastern start, then
  // closes. The sign-up action uses the same flag, so the form and the
  // submit check agree (CFDP-4514).
  it('keeps a session selectable until 3 hours after it starts', () => {
    const groups = [makeGroup({ classOne: '2026-10-12T09:45:00' })];
    const isPast = (iso: string) =>
      buildJourneySessionOptions({
        groups,
        sessionCounts: noCounts,
        now: new Date(iso),
      }).find((option) => option.sessionNumber === 1)?.isPast;

    // 9:45 AM EDT = 13:45 UTC. Still open one minute before the window closes.
    expect(isPast('2026-10-12T16:44:00Z')).toBe(false);
    // Closed once 3 hours have passed (12:45 PM EDT).
    expect(isPast('2026-10-12T16:45:00Z')).toBe(true);
  });

  it('uses the standard-time offset after the November DST change', () => {
    // Nov 1 2026 is the fall-back date; 9:45 AM EST = 14:45 UTC.
    // The walk-in window ends at 12:45 PM EST = 17:45 UTC. Reading that
    // wall-clock as EDT would close it an hour early, at 16:45 UTC.
    const groups = [makeGroup({ classOne: '2026-11-01T09:45:00' })];
    const isPast = (iso: string) =>
      buildJourneySessionOptions({
        groups,
        sessionCounts: noCounts,
        now: new Date(iso),
      }).find((option) => option.sessionNumber === 1)?.isPast;

    expect(isPast('2026-11-01T14:44:00Z')).toBe(false);
    expect(isPast('2026-11-01T16:50:00Z')).toBe(false);
    expect(isPast('2026-11-01T17:46:00Z')).toBe(true);
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

  // Drives whether the form asks about childcare for the chosen session.
  it('reads whether the group offers childcare from its Childcare attribute', () => {
    const withChildcare = makeGroup({ id: 2, guid: 'kids' });
    withChildcare.attributeValues!.childcare = value('True');
    const options = buildJourneySessionOptions({
      groups: [makeGroup(), withChildcare],
      sessionCounts: noCounts,
      now: new Date('2026-10-12T12:00:00Z'),
    });

    expect(
      options
        .filter((o) => o.sessionNumber === 1)
        .map((o) => [o.groupGuid, o.offersChildcare]),
    ).toEqual([
      ['group-a', false],
      ['kids', true],
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
