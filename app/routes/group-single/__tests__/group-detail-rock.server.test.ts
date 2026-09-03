import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  TTL: { NONE: 0, SHORT: 300 },
}));

vi.mock('~/lib/utils', () => ({
  createImageUrlFromGuid: (guid: string) =>
    guid ? `https://cdn.example.com/GetImage.ashx?guid=${guid}` : '',
}));

import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import {
  fetchGroupDetailFromRock,
  GROUP_FINDER_GROUP_TYPE_ID,
} from '../group-detail-rock.server';

const mockFetchRockData = fetchRockData as ReturnType<typeof vi.fn>;

const GROUP_GUID = '3c69d26a-b472-4bdc-b7ee-400001ae2c97';
const LOCATION_GUID = 'e124a730-9a81-458f-b9cb-d2b6f1860c4d';

const weeklyIcal = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260830T100000
RRULE:FREQ=WEEKLY;BYDAY=SU
END:VEVENT
END:VCALENDAR`;

const biWeeklyIcal = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260902T190000
RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=WE
END:VEVENT
END:VCALENDAR`;

const monthlyIcal = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260512T180000
RRULE:FREQ=MONTHLY;BYDAY=2TU
END:VEVENT
END:VCALENDAR`;

function groupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1796279,
    guid: GROUP_GUID,
    name: '20s & 30s Sit Together for Service',
    description: 'A welcoming way to find community.',
    isActive: true,
    isPublic: true,
    isArchived: false,
    isSecurityRole: false,
    groupTypeId: GROUP_FINDER_GROUP_TYPE_ID,
    scheduleId: 53242,
    campus: { name: 'Westlake' },
    attributeValues: {
      adultsOnly: { value: 'True', valueFormatted: 'Yes' },
      ageRange: { value: '18,39', valueFormatted: '18 to 39' },
      approvalStatus: {
        value: 'a884a960-4d2e-4882-afed-292c8430a14c',
        valueFormatted: 'Approved',
      },
      dayoftheWeek: { value: '0', valueFormatted: 'Sunday' },
      groupMeetingLocation: {
        value: LOCATION_GUID,
        valueFormatted: 'Westlake',
      },
      groupTopic: {
        value: 'topic-guid',
        valueFormatted: 'Activity/Hobby',
      },
      image: { value: 'da38bb01-d7c6-4cce-b47e-2514ed3a4e8c' },
      language: { value: 'English', valueFormatted: 'English' },
      meetingLocationType: {
        value: 'church-guid',
        valueFormatted: 'Church',
      },
      meetingType: { value: 'In Person', valueFormatted: 'In Person' },
      newPeopleWho: {
        value: 'young-adults-guid',
        valueFormatted: 'Young Adults',
      },
      peopleGroupType: {
        value: 'anyone-guid',
        valueFormatted: 'Anyone',
      },
      childcareDescription: { value: '', valueFormatted: '' },
      classType: { value: '', valueFormatted: '' },
    },
    ...overrides,
  };
}

function mockRock(options?: {
  group?: unknown;
  schedule?: unknown;
  location?: unknown;
  members?: unknown;
}) {
  mockFetchRockData.mockImplementation(async ({ endpoint }) => {
    if (endpoint === 'Groups') return options?.group ?? groupRow();
    if (endpoint === 'Schedules') {
      return options?.schedule ?? { iCalendarContent: weeklyIcal };
    }
    if (endpoint === 'Locations') {
      return (
        options?.location ?? {
          city: 'Westlake',
          state: 'FL',
          postalCode: '33470-3299',
          latitude: 26.7714,
          longitude: -80.32743,
        }
      );
    }
    if (endpoint === 'GroupMembers') {
      return (
        options?.members ?? [
          {
            groupMemberStatus: 1,
            groupRoleId: 50,
            groupRole: { isLeader: true, order: 0, name: 'Group Leader' },
            person: {
              id: 32071,
              nickName: 'Merian',
              firstName: 'Merian',
              lastName: 'Toribio',
              photoId: 2654178,
              photo: { guid: '44d71393-718d-44d7-bb93-ca78080952f1' },
            },
          },
          {
            groupMemberStatus: 1,
            groupRoleId: 44,
            groupRole: { isLeader: false, order: 3, name: 'Group Member' },
            person: {
              id: 1,
              nickName: 'Member',
              lastName: 'Only',
              photoId: 9,
            },
          },
        ]
      );
    }
    return [];
  });
}

describe('fetchGroupDetailFromRock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLOUDFRONT = 'https://cdn.example.com';
  });

  it('loads live Rock fields for a public group, including schedule and city', async () => {
    mockRock();

    const detail = await fetchGroupDetailFromRock(GROUP_GUID);

    expect(detail?.isPublic).toBe(true);
    expect(detail?.group).toMatchObject({
      groupGuid: GROUP_GUID.toUpperCase(),
      groupId: 1796279,
      title: '20s & 30s Sit Together for Service',
      summary: 'A welcoming way to find community.',
      campusName: 'Westlake',
      meetingDay: 'Sunday',
      meetingTime: '10:00AM EST',
      meetingFrequency: 'Weekly',
      meetingType: 'In Person',
      meetingLocationType: 'Church',
      meetingLocation: 'Westlake, FL 33470-3299',
      groupFor: 'Anyone',
      peopleWhoAre: ['Young Adults'],
      topics: ['Activity/Hobby'],
      minMaxAge: '18 to 39',
      adultsOnly: 'True',
      language: 'English',
    });
    expect(detail?.group.coverImage.sources[0].uri).toContain(
      'da38bb01-d7c6-4cce-b47e-2514ed3a4e8c',
    );
    expect(detail?.group._geoloc).toEqual({ lat: 26.7714, lng: -80.32743 });
    expect(detail?.group.leaders).toEqual([
      expect.objectContaining({
        firstName: 'Merian',
        lastName: 'Toribio',
        photo: {
          sources: [
            {
              uri: 'https://cdn.example.com/GetImage.ashx?guid=44d71393-718d-44d7-bb93-ca78080952f1&format=jpg',
            },
          ],
        },
      }),
    ]);
    const membersCall = mockFetchRockData.mock.calls.find(
      ([args]) => args.endpoint === 'GroupMembers',
    )?.[0];
    expect(membersCall?.queryParams?.$expand).toBe('Person/Photo,GroupRole');
    expect(membersCall?.queryParams?.$filter).toContain(
      "GroupMemberStatus eq 'Active'",
    );
    expect(membersCall?.queryParams?.$filter).toContain('GroupRoleId eq 50');
    expect(membersCall?.queryParams?.$filter).toContain('GroupRoleId eq 47');
    expect(membersCall?.queryParams?.$filter).not.toMatch(
      /GroupMemberStatus eq 1\b/,
    );
  });

  it('does not require IsPublic, so a Private group still loads by guid', async () => {
    mockRock({
      group: groupRow({ isPublic: false, name: "*Larry Ganns' Group" }),
    });

    const detail = await fetchGroupDetailFromRock(GROUP_GUID);

    expect(detail).not.toBeNull();
    expect(detail?.isPublic).toBe(false);
    expect(detail?.group.title).toBe("*Larry Ganns' Group");

    const groupCall = mockFetchRockData.mock.calls.find(
      ([args]) => args.endpoint === 'Groups',
    )?.[0];
    expect(groupCall?.queryParams?.$filter).toContain(
      `GroupTypeId eq ${GROUP_FINDER_GROUP_TYPE_ID}`,
    );
    expect(groupCall?.queryParams?.$filter).not.toMatch(/IsPublic/);
    expect(groupCall?.ttl).toBe(0);
  });

  it('returns null for an unapproved group so drafts are not shareable', async () => {
    mockRock({
      group: groupRow({
        attributeValues: {
          ...groupRow().attributeValues,
          approvalStatus: { value: 'pending-guid', valueFormatted: 'Pending' },
        },
      }),
    });

    await expect(fetchGroupDetailFromRock(GROUP_GUID)).resolves.toBeNull();
  });

  it('returns null when Rock is unreachable or the guid is not a group guid', async () => {
    mockFetchRockData.mockRejectedValue(new Error('network'));
    await expect(fetchGroupDetailFromRock(GROUP_GUID)).resolves.toBeNull();

    mockFetchRockData.mockClear();
    await expect(fetchGroupDetailFromRock('not-a-guid')).resolves.toBeNull();
    expect(mockFetchRockData).not.toHaveBeenCalled();
  });

  it('splits multi-value topic and people attributes the way the detail page displays them', async () => {
    const attrs = groupRow().attributeValues;
    mockRock({
      group: groupRow({
        attributeValues: {
          ...attrs,
          groupTopic: {
            value: 'a,b,c',
            valueFormatted: 'Parenting, Friendship, Activity/Hobby',
          },
          newPeopleWho: {
            value: 'x',
            valueFormatted: 'Single, Married, Parents',
          },
        },
      }),
    });

    const detail = await fetchGroupDetailFromRock(GROUP_GUID);

    expect(detail?.group.topics).toEqual([
      'Parenting',
      'Friendship',
      'Activity/Hobby',
    ]);
    expect(detail?.group.peopleWhoAre).toEqual([
      'Single',
      'Married',
      'Parents',
    ]);
  });

  it('maps bi-weekly and monthly Rock schedules onto the Algolia frequency labels', async () => {
    mockRock({ schedule: { iCalendarContent: biWeeklyIcal } });
    const biWeekly = await fetchGroupDetailFromRock(GROUP_GUID);
    expect(biWeekly?.group.meetingFrequency).toBe('Bi-Weekly');
    expect(biWeekly?.group.meetingTime).toBe('7:00PM EST');

    mockRock({ schedule: { iCalendarContent: monthlyIcal } });
    const monthly = await fetchGroupDetailFromRock(GROUP_GUID);
    expect(monthly?.group.meetingFrequency).toBe('Monthly');
    expect(monthly?.group.meetingTime).toBe('6:00PM EST');
  });

  it('keeps only active leader-role members, ordered by role', async () => {
    mockRock({
      members: [
        {
          groupMemberStatus: 1,
          groupRoleId: 47,
          groupRole: { isLeader: true, order: 1, name: 'Group Co-Leader' },
          person: { id: 2, nickName: 'Yaidelisse', lastName: 'Mesa' },
        },
        {
          groupMemberStatus: 1,
          groupRoleId: 50,
          groupRole: { isLeader: true, order: 0, name: 'Group Leader' },
          person: { id: 1, nickName: 'Merian', lastName: 'Toribio' },
        },
        {
          groupMemberStatus: 0,
          groupRoleId: 50,
          groupRole: { isLeader: true, order: 0, name: 'Group Leader' },
          person: { id: 3, nickName: 'Inactive', lastName: 'Leader' },
        },
      ],
    });

    const detail = await fetchGroupDetailFromRock(GROUP_GUID);

    expect(detail?.group.leaders?.map((leader) => leader.firstName)).toEqual([
      'Merian',
      'Yaidelisse',
    ]);
  });

  it('still emits leader photo URLs when CLOUDFRONT is unset, so the desktop bar can render avatars', async () => {
    delete process.env.CLOUDFRONT;
    mockRock({
      members: [
        {
          groupMemberStatus: 1,
          groupRoleId: 50,
          groupRole: { isLeader: true, order: 0, name: 'Group Leader' },
          person: {
            id: 1,
            nickName: 'Merian',
            lastName: 'Toribio',
            photoId: 2654178,
          },
        },
      ],
    });

    const detail = await fetchGroupDetailFromRock(GROUP_GUID);

    expect(detail?.group.leaders?.[0]?.photo?.sources?.[0]?.uri).toBe(
      'https://cloudfront.christfellowship.church/GetImage.ashx?id=2654178',
    );
  });

  it('does not double GetImage.ashx when CLOUDFRONT already includes the handler', async () => {
    process.env.CLOUDFRONT =
      'https://cloudfront.christfellowship.church/GetImage.ashx';
    mockRock();

    const detail = await fetchGroupDetailFromRock(GROUP_GUID);
    const leaderUri =
      detail?.group.leaders?.[0]?.photo?.sources?.[0]?.uri ?? '';
    const coverUri = detail?.group.coverImage.sources[0].uri ?? '';

    expect(leaderUri).toBe(
      'https://cloudfront.christfellowship.church/GetImage.ashx?guid=44d71393-718d-44d7-bb93-ca78080952f1&format=jpg',
    );
    expect(coverUri).toBe(
      'https://cloudfront.christfellowship.church/GetImage.ashx?guid=da38bb01-d7c6-4cce-b47e-2514ed3a4e8c',
    );
    expect(leaderUri).not.toContain('/GetImage.ashx/GetImage.ashx');
    expect(coverUri).not.toContain('/GetImage.ashx/GetImage.ashx');
  });

  it('hides Campus Hub Leader and Group Coach, even if Rock marks them as leaders', async () => {
    mockRock({
      members: [
        {
          groupMemberStatus: 1,
          groupRoleId: 48,
          groupRole: {
            isLeader: true,
            order: 4,
            name: 'Campus Hub Leader',
          },
          person: { id: 10, nickName: 'Staff', lastName: 'Manager' },
        },
        {
          groupMemberStatus: 1,
          groupRoleId: 49,
          groupRole: { isLeader: true, order: 3, name: 'Group Coach' },
          person: { id: 11, nickName: 'Campus', lastName: 'Coach' },
        },
        {
          groupMemberStatus: 1,
          groupRoleId: 50,
          groupRole: { isLeader: true, order: 0, name: 'Group Leader' },
          person: { id: 1, nickName: 'Merian', lastName: 'Toribio' },
        },
      ],
    });

    const detail = await fetchGroupDetailFromRock(GROUP_GUID);

    expect(detail?.group.leaders?.map((leader) => leader.firstName)).toEqual([
      'Merian',
    ]);
  });
});
