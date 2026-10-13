import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getJourneySessionOptions } from '~/lib/.server/journey-sessions';
import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';
import type { JourneySessionsData } from '~/lib/journey-sessions';
import { action } from '../api.journey-sign-up';

vi.mock('~/lib/.server/rock-workflow', () => ({
  postRockWorkflowLaunchWithApiInitiator: vi.fn(),
}));
vi.mock('~/lib/.server/journey-sessions', () => ({
  getJourneySessionOptions: vi.fn(),
}));

const liveData: JourneySessionsData = {
  campuses: [
    { id: 2, name: 'Palm Beach Gardens', street1: '', city: '' },
    {
      id: 7,
      name: 'Christ Fellowship Español Palm Beach Gardens',
      street1: '',
      city: '',
    },
  ],
  options: [
    {
      sessionNumber: 1,
      groupGuid: 'oct',
      campusId: 2,
      startsAt: '2026-10-04T09:45',
      isFull: false,
      offersChildcare: false,
    },
    {
      sessionNumber: 2,
      groupGuid: 'nov',
      campusId: 2,
      startsAt: '2026-11-08T09:45',
      isFull: false,
      offersChildcare: false,
    },
    {
      sessionNumber: 3,
      groupGuid: 'nov',
      campusId: 2,
      startsAt: '2026-11-15T09:45',
      isFull: false,
      offersChildcare: false,
    },
    {
      sessionNumber: 2,
      groupGuid: 'kids',
      campusId: 2,
      startsAt: '2026-11-08T18:30',
      isFull: false,
      offersChildcare: true,
    },
    {
      sessionNumber: 2,
      groupGuid: 'esp',
      campusId: 7,
      startsAt: '2026-11-09T19:00',
      isFull: false,
      offersChildcare: false,
    },
    {
      sessionNumber: 3,
      groupGuid: 'esp',
      campusId: 7,
      startsAt: '2026-11-16T19:00',
      isFull: false,
      offersChildcare: false,
    },
    {
      sessionNumber: 3,
      groupGuid: 'dec',
      campusId: 2,
      startsAt: '2026-12-13T10:45',
      isFull: true,
      offersChildcare: false,
    },
  ],
};

const submit = (sessions: Record<string, string>) => {
  const formData = new FormData();
  formData.set('firstName', 'Test');
  formData.set('lastName', 'Person');
  formData.set('phone', '5555555555');
  formData.set('email', 'test@example.com');
  formData.set('atCF', '1');
  formData.set('reason', '3');
  Object.entries(sessions).forEach(([key, val]) => formData.set(key, val));
  const request = new Request('http://localhost/api/journey-sign-up', {
    method: 'POST',
    body: formData,
  });
  return action({ request } as ActionFunctionArgs);
};

const sentBody = () =>
  vi.mocked(postRockWorkflowLaunchWithApiInitiator).mock.calls[0]?.[0].body as
    | Record<string, string>
    | undefined;

const statusOf = (result: unknown) =>
  (result as { init?: { status?: number } }).init?.status;

describe('journey sign up action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getJourneySessionOptions).mockResolvedValue(liveData);
    vi.mocked(postRockWorkflowLaunchWithApiInitiator).mockResolvedValue(
      undefined,
    );
  });

  it.each([
    [{ session1Group: 'oct' }, ['Session1Group']],
    [{ session2Group: 'nov' }, ['Session2Group']],
    [
      { session1Group: 'oct', session3Group: 'nov' },
      ['Session1Group', 'Session3Group'],
    ],
  ])(
    'sends only the selected sessions to Rock (%o)',
    async (sessions, expectedKeys) => {
      await submit(sessions);

      const sessionKeys = Object.keys(sentBody() ?? {}).filter((key) =>
        key.startsWith('Session'),
      );
      expect(sessionKeys.sort()).toEqual([...expectedKeys].sort());
    },
  );

  it('sends all three sessions, mixing groups, validated against fresh Rock data', async () => {
    await submit({
      session1Group: 'oct',
      session2Group: 'nov',
      session3Group: 'nov',
    });

    // Session times live on the group in Rock, so only the group is sent.
    expect(sentBody()).toMatchObject({
      Session1Group: 'oct',
      Session2Group: 'nov',
      Session3Group: 'nov',
    });
    expect(getJourneySessionOptions).toHaveBeenCalledWith({ fresh: true });
  });

  it('rejects a submission with no sessions', async () => {
    const result = await submit({});

    expect(statusOf(result)).toBe(400);
    expect(postRockWorkflowLaunchWithApiInitiator).not.toHaveBeenCalled();
  });

  it('rejects a session that is no longer offered (past, or wrong group for that session)', async () => {
    // "oct" runs Session 1, not Session 2 — or it has already started and was filtered out.
    const result = await submit({ session2Group: 'oct' });

    expect(statusOf(result)).toBe(400);
    expect(postRockWorkflowLaunchWithApiInitiator).not.toHaveBeenCalled();
  });

  it('rejects a full session even if the page showed it as open', async () => {
    const result = await submit({ session3Group: 'dec' });

    expect(statusOf(result)).toBe(400);
    expect(postRockWorkflowLaunchWithApiInitiator).not.toHaveBeenCalled();
  });

  // Rock infers childcare need from which counts arrive, so anything sent
  // lands on the group membership as-is.
  describe('childcare', () => {
    const childcareKeys = () =>
      Object.keys(sentBody() ?? {}).filter((key) =>
        /Months|Years|Grades/.test(key),
      );

    it('sends only the age ranges with children, as Rock option values', async () => {
      await submit({
        session1Group: 'oct',
        session2Group: 'kids',
        'childcare-0-23Months': '0',
        'childcare-2Years': '2',
        'childcare-Grades1-5': '8',
      });

      expect(sentBody()).toMatchObject({ '2Years': '2', 'Grades1-5': '8' });
      expect(childcareKeys().sort()).toEqual(['2Years', 'Grades1-5']);
    });

    it('sends no childcare when none of the selected groups offers it', async () => {
      await submit({ session1Group: 'oct', 'childcare-2Years': '2' });

      expect(postRockWorkflowLaunchWithApiInitiator).toHaveBeenCalled();
      expect(childcareKeys()).toEqual([]);
    });

    it('sends no childcare when the person needs none', async () => {
      await submit({ session2Group: 'kids' });

      expect(childcareKeys()).toEqual([]);
    });

    // Rock's single-select only accepts 1–8 and silently drops anything else.
    it.each(['9', '-1', '1.5', 'two'])(
      'rejects a count Rock would drop (%s)',
      async (count) => {
        const result = await submit({
          session2Group: 'kids',
          'childcare-2Years': count,
        });

        expect(statusOf(result)).toBe(400);
        expect(postRockWorkflowLaunchWithApiInitiator).not.toHaveBeenCalled();
      },
    );
  });

  // One workflow handles both languages; it reads the campus from `Group`.
  it.each([[{ session1Group: 'oct' }], [{ session2Group: 'esp' }]])(
    'launches the Journey Session Sign Up workflow for every campus (%o)',
    async (sessions) => {
      await submit(sessions);

      expect(
        vi.mocked(postRockWorkflowLaunchWithApiInitiator).mock.calls[0][0]
          .workflowTypeId,
      ).toBe('1968');
    },
  );

  // `Group` picks the confirmation email's language, contact and campus, so it
  // must follow where most of the person's sessions are.
  it.each([
    [
      'all at one campus: the earliest session',
      { session1Group: 'oct', session3Group: 'nov' },
      'oct',
    ],
    [
      'the campus with the most sessions, even if not the earliest',
      { session1Group: 'oct', session2Group: 'esp', session3Group: 'esp' },
      'esp',
    ],
    [
      'a tie goes to the earliest session',
      { session2Group: 'esp', session3Group: 'nov' },
      'esp',
    ],
    ['a single session: that group', { session3Group: 'nov' }, 'nov'],
  ])('sends the primary Group: %s', async (_case, sessions, expected) => {
    await submit(sessions);

    expect(sentBody()?.Group).toBe(expected);
  });
});
