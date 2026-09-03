import camelCase from 'lodash/camelCase';

import { fetchRockData, TTL } from '~/lib/.server/fetch-rock-data';
import { escapeOData } from '~/lib/.server/rock-utils';
import { createImageUrlFromGuid } from '~/lib/utils';
import type {
  GroupLeaderHit,
  GroupMeetingDay,
  GroupMeetingFrequency,
  GroupMeetingLocationType,
  GroupMeetingType,
  GroupType,
} from '~/routes/group-finder/types';

/**
 * Rock "Groups - Adult" (the Group Finder type). Other group types — families,
 * serving teams, security roles — must not load on this public page even when
 * someone has a GUID.
 */
export const GROUP_FINDER_GROUP_TYPE_ID = 31;

const ROCK_GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AttrEntry = {
  value?: string;
  valueFormatted?: string;
};

type AttrBag = Record<string, AttrEntry | undefined>;

type RockCampus = { name?: string };

type RockGroup = {
  id?: number;
  guid?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
  isPublic?: boolean;
  isArchived?: boolean;
  isSecurityRole?: boolean;
  groupTypeId?: number;
  scheduleId?: number | null;
  campus?: RockCampus;
  attributeValues?: AttrBag;
};

type RockLocation = {
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number | string;
  longitude?: number | string;
};

type RockSchedule = {
  iCalendarContent?: string;
};

type RockGroupRole = {
  isLeader?: boolean;
  order?: number;
  name?: string;
};

type RockPerson = {
  id?: number;
  nickName?: string;
  firstName?: string;
  lastName?: string;
  photoId?: number | null;
};

type RockGroupMember = {
  groupMemberStatus?: number | string;
  isArchived?: boolean;
  groupRole?: RockGroupRole;
  person?: RockPerson;
};

export type GroupDetailFromRock = {
  group: GroupType;
  /** Rock `IsPublic`. False means the group is unlisted (direct link only). */
  isPublic: boolean;
};

export function isRockGroupGuid(value: string): boolean {
  return ROCK_GUID_RE.test(value.trim());
}

export function normalizeGroupGuid(value: string): string {
  return value.trim().toUpperCase();
}

function attrKeysRock(keys: string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    out.push(key, camelCase(key), key.charAt(0).toLowerCase() + key.slice(1));
  }
  return [...new Set(out)];
}

function readAttrEntry(
  attrs: AttrBag | undefined,
  keys: string[],
): AttrEntry | undefined {
  if (!attrs) return undefined;
  for (const k of attrKeysRock(keys)) {
    const e = attrs[k];
    if (!e) continue;
    const hasValue = e.value != null && String(e.value).trim() !== '';
    const hasFormatted =
      e.valueFormatted != null && String(e.valueFormatted).trim() !== '';
    if (hasValue || hasFormatted) return e;
  }
  return undefined;
}

function readAttr(
  attrs: AttrBag | undefined,
  keys: string[],
): string | undefined {
  const e = readAttrEntry(attrs, keys);
  const v = e?.value;
  if (v != null && String(v).trim() !== '') return String(v).trim();
  return undefined;
}

function readAttrFormatted(
  attrs: AttrBag | undefined,
  keys: string[],
): string | undefined {
  const e = readAttrEntry(attrs, keys);
  const f = e?.valueFormatted;
  if (f != null && String(f).trim() !== '') return String(f).trim();
  const v = e?.value;
  if (v != null && String(v).trim() !== '') return String(v).trim();
  return undefined;
}

function unwrapOne<T>(raw: unknown): T | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    return first && typeof first === 'object' ? (first as T) : null;
  }
  return typeof raw === 'object' ? (raw as T) : null;
}

function asList<T>(raw: unknown): T[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as T[];
  return [raw as T];
}

function splitFormattedList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function isActiveMemberStatus(status: number | string | undefined): boolean {
  return status === 1 || status === 'Active';
}

function formatCityStateZip(location: RockLocation): string {
  const city = (location.city ?? '').trim();
  const state = (location.state ?? '').trim();
  const zip = (location.postalCode ?? '').trim();
  if (!city) return '';
  if (!state) return city;
  return zip ? `${city}, ${state} ${zip}` : `${city}, ${state}`;
}

function toFiniteNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Algolia stores `10:00AM EST`; the detail UI strips the zone and appends ET. */
function formatMeetingTimeFromIcal(iCal: string): string {
  const match = iCal.match(/DTSTART[^:]*:(\d{8})T(\d{6})/i);
  if (!match) return '';
  const hours = Number(match[2].slice(0, 2));
  const minutes = match[2].slice(2, 4);
  if (!Number.isFinite(hours)) return '';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}${ampm} EST`;
}

function meetingFrequencyFromIcal(iCal: string): GroupMeetingFrequency | '' {
  const rrule = iCal.match(/RRULE:([^\r\n]+)/i)?.[1] ?? '';
  if (!rrule) return 'Once';

  const freq = rrule.match(/FREQ=([A-Z]+)/i)?.[1]?.toUpperCase() ?? '';
  const interval = Number(rrule.match(/INTERVAL=(\d+)/i)?.[1] ?? '1');

  if (freq === 'DAILY') return 'Daily';
  if (freq === 'MONTHLY') return 'Monthly';
  if (freq === 'WEEKLY' && interval === 2) return 'Bi-Weekly';
  if (freq === 'WEEKLY') return 'Weekly';
  return 'Once';
}

function parseSchedule(schedule: RockSchedule | null): {
  meetingFrequency: GroupMeetingFrequency | '';
  meetingTime: string;
} {
  const iCal = schedule?.iCalendarContent ?? '';
  if (!iCal.trim()) {
    return { meetingFrequency: '', meetingTime: '' };
  }
  return {
    meetingFrequency: meetingFrequencyFromIcal(iCal),
    meetingTime: formatMeetingTimeFromIcal(iCal),
  };
}

function isApprovedForPublicDetail(attrs: AttrBag | undefined): boolean {
  const formatted = readAttrFormatted(attrs, ['ApprovalStatus']);
  if (!formatted) return true;
  return formatted.toLowerCase() === 'approved';
}

function coverImageFromGuid(guid: string | undefined): GroupType['coverImage'] {
  const uri = guid ? createImageUrlFromGuid(guid) : '';
  return { sources: [{ uri: uri || '' }] };
}

function leaderPhoto(
  photoId: number | null | undefined,
): GroupLeaderHit['photo'] {
  if (photoId == null || !Number.isFinite(photoId) || photoId <= 0) {
    return undefined;
  }
  const origin = process.env.CLOUDFRONT?.trim() ?? '';
  if (!origin) return undefined;
  return {
    sources: [
      { uri: `${origin.replace(/\/$/, '')}/GetImage.ashx?id=${photoId}` },
    ],
  };
}

async function fetchSchedule(
  scheduleId: number | null | undefined,
): Promise<RockSchedule | null> {
  if (scheduleId == null || !Number.isFinite(scheduleId) || scheduleId <= 0) {
    return null;
  }
  try {
    const raw = await fetchRockData({
      endpoint: 'Schedules',
      queryParams: {
        $filter: `Id eq ${scheduleId}`,
        $top: '1',
      },
      ttl: TTL.NONE,
    });
    return unwrapOne<RockSchedule>(raw);
  } catch {
    return null;
  }
}

async function fetchMeetingLocation(locationGuid: string | undefined): Promise<{
  meetingLocation: string;
  geoloc: GroupType['_geoloc'];
}> {
  if (!locationGuid || !ROCK_GUID_RE.test(locationGuid)) {
    return { meetingLocation: '', geoloc: null };
  }
  try {
    const raw = await fetchRockData({
      endpoint: 'Locations',
      queryParams: {
        $filter: `Guid eq guid'${escapeOData(locationGuid)}'`,
        $top: '1',
      },
      ttl: TTL.NONE,
    });
    const location = unwrapOne<RockLocation>(raw);
    if (!location) return { meetingLocation: '', geoloc: null };

    const lat = toFiniteNumber(location.latitude);
    const lng = toFiniteNumber(location.longitude);
    return {
      meetingLocation: formatCityStateZip(location),
      geoloc: lat != null && lng != null ? { lat, lng } : null,
    };
  } catch {
    return { meetingLocation: '', geoloc: null };
  }
}

async function fetchLeaders(groupId: number): Promise<GroupLeaderHit[]> {
  try {
    const raw = await fetchRockData({
      endpoint: 'GroupMembers',
      queryParams: {
        $filter: `GroupId eq ${groupId} and GroupMemberStatus eq 1`,
        $expand: 'Person,GroupRole',
      },
      ttl: TTL.NONE,
    });
    const members = asList<RockGroupMember>(raw)
      .filter(
        (member) =>
          member.groupRole?.isLeader === true &&
          member.isArchived !== true &&
          isActiveMemberStatus(member.groupMemberStatus),
      )
      .sort((a, b) => (a.groupRole?.order ?? 99) - (b.groupRole?.order ?? 99));

    const leaders: GroupLeaderHit[] = [];
    for (const member of members) {
      const person = member.person;
      if (!person) continue;
      const firstName = (person.nickName || person.firstName || '').trim();
      const lastName = (person.lastName || '').trim();
      if (!firstName && !lastName) continue;
      leaders.push({
        id: person.id ?? firstName,
        firstName,
        lastName,
        photo: leaderPhoto(person.photoId),
      });
    }
    return leaders;
  } catch {
    return [];
  }
}

function mapGroup(
  row: RockGroup,
  extras: {
    meetingFrequency: GroupMeetingFrequency | '';
    meetingTime: string;
    meetingLocation: string;
    geoloc: GroupType['_geoloc'];
    leaders: GroupLeaderHit[];
  },
): GroupType {
  const attrs = row.attributeValues;
  const groupGuid = normalizeGroupGuid(String(row.guid ?? ''));
  const groupId = row.id;
  const meetingLocationType = (readAttrFormatted(attrs, [
    'MeetingLocationType',
  ]) ?? '') as GroupMeetingLocationType | '';
  const meetingDay = (readAttrFormatted(attrs, [
    'DayoftheWeek',
    'DayOfTheWeek',
  ]) ?? '') as GroupMeetingDay | '';
  const meetingType = (readAttr(attrs, ['MeetingType']) ||
    readAttrFormatted(attrs, ['MeetingType']) ||
    '') as GroupMeetingType;
  const adultsOnlyRaw = (
    readAttr(attrs, ['AdultsOnly']) ?? 'False'
  ).toLowerCase();
  const adultsOnly: GroupType['adultsOnly'] =
    adultsOnlyRaw === 'true' || adultsOnlyRaw === '1' ? 'True' : 'False';

  const peopleWhoAre = splitFormattedList(
    readAttrFormatted(attrs, ['NewPeopleWho']),
  );
  const topics = splitFormattedList(readAttrFormatted(attrs, ['GroupTopic']));

  return {
    objectID: groupId != null ? String(groupId) : groupGuid,
    groupGuid,
    groupId,
    title: (typeof row.name === 'string' ? row.name.trim() : '') || 'Group',
    summary:
      (typeof row.description === 'string' ? row.description.trim() : '') || '',
    campusName:
      (typeof row.campus?.name === 'string' ? row.campus.name.trim() : '') ||
      '',
    classType: readAttrFormatted(attrs, ['ClassType']) ?? '',
    coverImage: coverImageFromGuid(readAttr(attrs, ['Image'])),
    meetingLocationType,
    meetingLocation: extras.meetingLocation,
    meetingDay,
    meetingTime: extras.meetingTime,
    meetingType,
    meetingFrequency: extras.meetingFrequency as GroupMeetingFrequency,
    adultsOnly,
    childCareDescription:
      readAttrFormatted(attrs, ['ChildcareDescription']) ?? '',
    leaders: extras.leaders.length > 0 ? extras.leaders : null,
    groupFor: (readAttrFormatted(attrs, ['PeopleGroupType']) ??
      '') as GroupType['groupFor'],
    peopleWhoAre:
      peopleWhoAre.length > 0
        ? (peopleWhoAre as GroupType['peopleWhoAre'])
        : undefined,
    language: (readAttr(attrs, ['Language']) ||
      readAttrFormatted(attrs, ['Language']) ||
      '') as GroupType['language'],
    topics,
    minMaxAge: readAttrFormatted(attrs, ['AgeRange']) ?? '',
    _geoloc: extras.geoloc,
  };
}

/**
 * Live Group Finder detail from Rock by GUID. Public and Private groups both
 * load when the GUID is known; Private groups stay out of Algolia / search.
 */
export async function fetchGroupDetailFromRock(
  groupGuid: string,
): Promise<GroupDetailFromRock | null> {
  const trimmed = groupGuid.trim();
  if (!trimmed || !isRockGroupGuid(trimmed)) return null;

  const guid = escapeOData(trimmed);
  let raw: unknown;
  try {
    raw = await fetchRockData({
      endpoint: 'Groups',
      queryParams: {
        $filter: `Guid eq guid'${guid}' and GroupTypeId eq ${GROUP_FINDER_GROUP_TYPE_ID} and IsActive eq true and IsArchived eq false and IsSecurityRole eq false`,
        $top: '1',
        $expand: 'Campus,GroupType',
        loadAttributes: 'expanded',
      },
      ttl: TTL.NONE,
    });
  } catch {
    return null;
  }

  const row = unwrapOne<RockGroup>(raw);
  if (!row || typeof row !== 'object') return null;
  if (row.isActive === false || row.isArchived === true) return null;
  if (!isApprovedForPublicDetail(row.attributeValues)) return null;

  const locationGuid = readAttr(row.attributeValues, ['GroupMeetingLocation']);
  const [schedule, location, leaders] = await Promise.all([
    fetchSchedule(row.scheduleId),
    fetchMeetingLocation(locationGuid),
    row.id != null ? fetchLeaders(row.id) : Promise.resolve([]),
  ]);
  const { meetingFrequency, meetingTime } = parseSchedule(schedule);

  return {
    group: mapGroup(row, {
      meetingFrequency,
      meetingTime,
      meetingLocation: location.meetingLocation,
      geoloc: location.geoloc,
      leaders,
    }),
    isPublic: row.isPublic !== false,
  };
}
