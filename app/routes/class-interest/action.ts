import type { ActionFunction } from 'react-router';
import {
  fetchRockData,
  postRockData,
  TTL,
} from '~/lib/.server/fetch-rock-data';
import { findOrCreateRockPersonForSignup } from '~/lib/.server/rock-signup';
import { escapeOData } from '~/lib/.server/rock-utils';

const GROUP_ROLE_ID = 379;
const PENDING_GROUP_MEMBER_STATUS = 2;

/** Campus `Id` → Rock group `Id` for the "I'm Interested" class sign-up. */
const INTERESTED_GROUP_IDS: Record<number, number> = {
  10: 1839701, // Belle Glade
  17: 1839702, // Boca Raton
  6: 1839703, // Boynton Beach
  9: 1839704, // Online (CF Everywhere)
  7: 1839705, // CF Español Palm Beach Gardens
  8: 1839706, // CF Español Royal Palm Beach
  14: 1839707, // Jupiter
  12: 1839708, // Okeechobee
  2: 1839709, // Palm Beach Gardens
  13: 1839710, // Port St. Lucie
  3: 1839711, // Royal Palm Beach
  5: 1839712, // Stuart
  21: 1839715, // Trinity
  1: 1839716, // Vero Beach
  19: 1839717, // Westlake
};

type CampusLookupResult = {
  id?: number;
};

const getFirstRecord = <T>(result: T | T[] | null | undefined): T | null => {
  if (Array.isArray(result)) {
    return result[0] ?? null;
  }

  return result ?? null;
};

/**
 * Sets the `classPreference` member attribute on a GroupMember via Rock's
 * dedicated `SetAttributeValue` endpoint.
 *
 * We use this rather than writing the AttributeValues table directly because
 * the endpoint resolves the attribute relative to this specific GroupMember
 * (entity type + group type qualifier), so the correct attribute is matched
 * even though attribute keys are not globally unique, and the write goes
 * through Rock's normal save hooks (cache invalidation, history, etc.).
 *
 * Create vs. update is handled by Rock — no need to look up an existing value.
 */
async function setGroupMemberClassPreference(
  memberId: number,
  classValueGuid: string,
): Promise<void> {
  // Rock matches the attribute key case-sensitively; the member attribute's
  // key is `ClassPreference` (PascalCase), not `classPreference`.
  const url = `${process.env.ROCK_API}GroupMembers/AttributeValue/${memberId}?attributeKey=ClassPreference&attributeValue=${encodeURIComponent(classValueGuid)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization-Token': `${process.env.ROCK_TOKEN}` },
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Failed to set classPreference: ${response.status}, details: ${details}`,
    );
  }
}

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();

    const FirstName = formData.get('FirstName')?.toString().trim();
    const LastName = formData.get('LastName')?.toString().trim();
    const EmailAddress = formData.get('EmailAddress')?.toString().trim();
    const PhoneNumber = formData.get('PhoneNumber')?.toString().trim();
    const Campus = formData.get('Campus')?.toString().trim();
    const classValueGuid =
      formData.get('ClassValueGuid')?.toString().trim() || null;

    if (!FirstName || !LastName || !EmailAddress || !PhoneNumber || !Campus) {
      return Response.json(
        { error: 'Please fill in all required fields.' },
        { status: 400 },
      );
    }

    const campusResult = await fetchRockData({
      endpoint: 'Campuses',
      queryParams: {
        $filter: `Guid eq guid'${escapeOData(Campus)}'`,
        $select: 'Id',
      },
      ttl: TTL.NONE,
    });
    const campus = getFirstRecord<CampusLookupResult>(campusResult);

    if (!campus?.id) {
      return Response.json(
        { error: 'Please select a valid campus.' },
        { status: 400 },
      );
    }

    const groupId = INTERESTED_GROUP_IDS[campus.id];

    if (!groupId) {
      return Response.json(
        { error: 'This campus is not available for class interest sign-ups.' },
        { status: 400 },
      );
    }

    const personId = await findOrCreateRockPersonForSignup({
      firstName: FirstName,
      lastName: LastName,
      email: EmailAddress,
      phoneNumber: PhoneNumber,
    });

    const existingMembership = await fetchRockData({
      endpoint: 'GroupMembers',
      queryParams: {
        $filter: `GroupId eq ${groupId} and PersonId eq ${personId}`,
        $select: 'Id',
      },
      ttl: TTL.NONE,
    });

    const existing = getFirstRecord<{ id: number }>(existingMembership);
    let memberId = existing?.id ?? null;

    if (!memberId) {
      const created = await postRockData({
        endpoint: 'GroupMembers',
        body: {
          GroupId: groupId,
          PersonId: personId,
          GroupRoleId: GROUP_ROLE_ID,
          GroupMemberStatus: PENDING_GROUP_MEMBER_STATUS,
          IsArchived: false,
        },
      });
      // Rock returns the new entity ID as a plain integer, not an object.
      memberId = typeof created === 'number' ? created : (created?.id ?? null);
    }

    if (memberId && classValueGuid) {
      await setGroupMemberClassPreference(memberId, classValueGuid);
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: 'Network error please try again' },
      { status: 400 },
    );
  }
};
