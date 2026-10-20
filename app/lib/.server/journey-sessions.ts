import { fetchRockData, TTL } from './fetch-rock-data';
import { parseRockDateTime, toRockDateTimeLiteral } from './rock-datetime';
import type {
  JourneyCampus,
  JourneySessionNumber,
  JourneySessionOption,
  JourneySessionsData,
} from '~/lib/journey-sessions';

/** Rock group type "Journey Sign Up Group". */
export const JOURNEY_GROUP_TYPE_ID = 137;

/** Group attribute `ClassThree` — the last session, used to pre-filter to upcoming groups. */
const CLASS_THREE_ATTRIBUTE_ID = 225431;

/** Group attributes holding each session's Eastern wall-clock start. */
const SESSION_ATTRIBUTE_KEYS: Record<JourneySessionNumber, string> = {
  1: 'classOne',
  2: 'classTwo',
  3: 'classThree',
};

/** Rock's OData node limit (100) caps how many `Id eq N` clauses fit in one filter. */
const GROUP_ID_CHUNK_SIZE = 12;

type RockAttributeValue = { value?: string | null };

export type RockJourneyGroup = {
  id: number;
  guid: string;
  campusId: number | null;
  groupCapacity: number | null;
  attributeValues?: Record<string, RockAttributeValue | undefined>;
};

type RockCampus = {
  id: number;
  name: string;
  url?: string | null;
  location?: { street1?: string | null; city?: string | null } | null;
  attributeValues?: Record<string, RockAttributeValue | undefined>;
};

type RockGroupMember = {
  groupId: number;
  attributeValues?: Record<string, RockAttributeValue | undefined>;
};

const toArray = <T>(data: unknown): T[] => {
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]) as T[];
};

const attr = (
  group: { attributeValues?: RockJourneyGroup['attributeValues'] },
  key: string,
) => group.attributeValues?.[key]?.value?.trim() ?? '';

/** Rock date-time values come back as `2026-10-04T09:45:00.0000000`; keep `YYYY-MM-DDTHH:mm`. */
const toWallClockMinutes = (value: string) => value.slice(0, 16);

/**
 * Pure transform from Rock groups to session options. Flags sessions that have
 * already started as `isPast` and drops groups outside their finder display
 * window, both judged in Eastern time so a UTC server can't shift the boundary
 * (CFDP-4377).
 */
export function buildJourneySessionOptions({
  groups,
  sessionCounts,
  now,
}: {
  groups: RockJourneyGroup[];
  /** Members per group flagged for each session. Only needed for groups with a capacity. */
  sessionCounts: Map<number, Record<JourneySessionNumber, number>>;
  now: Date;
}): JourneySessionOption[] {
  const options: JourneySessionOption[] = [];

  for (const group of groups) {
    if (group.campusId == null) continue;

    const displayStart = attr(group, 'displayStartDate');
    const displayEnd = attr(group, 'displayEndDate');
    if (displayStart && parseRockDateTime(displayStart) > now) continue;
    if (displayEnd && parseRockDateTime(displayEnd) <= now) continue;

    for (const sessionNumber of [1, 2, 3] as const) {
      const raw = attr(group, SESSION_ATTRIBUTE_KEYS[sessionNumber]);
      if (!raw) continue;

      const capacity = group.groupCapacity;
      const taken = sessionCounts.get(group.id)?.[sessionNumber] ?? 0;

      options.push({
        sessionNumber,
        groupGuid: group.guid,
        campusId: group.campusId,
        startsAt: toWallClockMinutes(raw),
        // Full stays off until Rock admins set a capacity on the group.
        isFull: capacity != null && capacity > 0 && taken >= capacity,
        isPast: parseRockDateTime(raw) <= now,
        offersChildcare: attr(group, 'childcare').toLowerCase() === 'true',
      });
    }
  }

  return options.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

const chunk = <T>(items: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );

async function fetchUpcomingJourneyGroups(
  now: Date,
  ttl: number,
): Promise<RockJourneyGroup[]> {
  const today = toRockDateTimeLiteral(now).slice(0, 10);
  const upcoming = await fetchRockData({
    endpoint: 'AttributeValues',
    queryParams: {
      $filter: `AttributeId eq ${CLASS_THREE_ATTRIBUTE_ID} and Value ge '${today}'`,
      $select: 'EntityId',
    },
    ttl,
  });
  const groupIds = toArray<{ entityId: number }>(upcoming).map(
    (row) => row.entityId,
  );

  const batches = await Promise.all(
    chunk(groupIds, GROUP_ID_CHUNK_SIZE).map((ids) =>
      fetchRockData({
        endpoint: 'Groups',
        queryParams: {
          $filter: `GroupTypeId eq ${JOURNEY_GROUP_TYPE_ID} and IsActive eq true and IsArchived eq false and (${ids.map((id) => `Id eq ${id}`).join(' or ')})`,
          loadAttributes: 'simple',
          attributeKeys:
            'ClassOne,ClassTwo,ClassThree,DisplayStartDate,DisplayEndDate,Childcare',
        },
        ttl,
      }),
    ),
  );

  return batches.flatMap((batch) => toArray<RockJourneyGroup>(batch));
}

/** Counts active members flagged for each session, only for groups that have a capacity set. */
async function fetchSessionCounts(
  groups: RockJourneyGroup[],
  ttl: number,
): Promise<Map<number, Record<JourneySessionNumber, number>>> {
  const counts = new Map<number, Record<JourneySessionNumber, number>>();
  const withCapacity = groups.filter(
    (group) => group.groupCapacity != null && group.groupCapacity > 0,
  );

  await Promise.all(
    withCapacity.map(async (group) => {
      const members = toArray<RockGroupMember>(
        await fetchRockData({
          endpoint: 'GroupMembers',
          queryParams: {
            $filter: `GroupId eq ${group.id} and GroupMemberStatus eq 'Active'`,
            loadAttributes: 'simple',
            attributeKeys: 'Session1,Session2,Session3',
          },
          ttl,
        }),
      );
      const isFlagged = (member: RockGroupMember, n: JourneySessionNumber) =>
        attr(member, `session${n}`).toLowerCase() === 'true';
      counts.set(group.id, {
        1: members.filter((m) => isFlagged(m, 1)).length,
        2: members.filter((m) => isFlagged(m, 2)).length,
        3: members.filter((m) => isFlagged(m, 3)).length,
      });
    }),
  );

  return counts;
}

async function fetchCampuses(campusIds: number[]): Promise<JourneyCampus[]> {
  if (campusIds.length === 0) return [];
  const campuses = toArray<RockCampus>(
    await fetchRockData({
      endpoint: 'Campuses',
      queryParams: {
        $filter: 'IsActive eq true',
        $expand: 'Location',
        loadAttributes: 'simple',
      },
      ttl: TTL.LONG,
    }),
  );
  const ids = new Set(campusIds);
  return campuses
    .filter((campus) => ids.has(campus.id))
    .map((campus) => ({
      id: campus.id,
      name: campus.name,
      street1: campus.location?.street1 ?? '',
      city: campus.location?.city ?? '',
      mapLink: campus.attributeValues?.mapLink?.value?.trim() ?? '',
      url: campus.url?.trim().toLowerCase() ?? '',
    }));
}

/**
 * Journey session options straight from Rock. `fresh` skips the cache — the
 * sign-up action uses it to re-validate past/full right before submitting.
 */
export async function getJourneySessionOptions({
  now = new Date(),
  fresh = false,
}: { now?: Date; fresh?: boolean } = {}): Promise<JourneySessionsData> {
  // Short TTL: capacity counts change as people register.
  const ttl = fresh ? TTL.NONE : 60;
  const groups = await fetchUpcomingJourneyGroups(now, ttl);
  const sessionCounts = await fetchSessionCounts(groups, ttl);
  const options = buildJourneySessionOptions({ groups, sessionCounts, now });
  const campuses = await fetchCampuses([
    ...new Set(options.map((option) => option.campusId)),
  ]);

  return { campuses, options };
}
