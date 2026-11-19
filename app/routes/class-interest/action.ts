import { fetchGroupMembers } from '~/lib/.server/rock-people-groups';
import type { ActionFunction } from 'react-router';
import { TTL } from '~/lib/.server/fetch-rock-data';
import { requireV2Guid, sendRockV2 } from '~/lib/.server/fetch-rock-v2';
import {
  addRockGroupMember,
  findOrCreateRockPersonForSignup,
} from '~/lib/.server/rock-signup';
import { fetchCampuses } from '~/lib/.server/rock-campuses';

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
 * Sets the member's `ClassPreference`. v2's `attributevalues` PATCH resolves
 * the key against this member (the group type also has a Group attribute
 * with the same key). Rock matches the key case-sensitively.
 */
const setGroupMemberClassPreference = async (
  memberGuid: string | undefined,
  classValueGuid: string,
): Promise<void> => {
  await sendRockV2(
    'PATCH',
    `groupmembers/${requireV2Guid(memberGuid, 'group member')}/attributevalues`,
    { ClassPreference: classValueGuid },
  );
};

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

    const [campus] = await fetchCampuses<CampusLookupResult>(
      { guid: Campus },
      ['Id'],
      TTL.NONE,
    );

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

    const existingMembership = await fetchGroupMembers({
      endpoint: 'GroupMembers',
      queryParams: {
        $filter: `GroupId eq ${groupId} and PersonId eq ${personId}`,
        $select: 'Id,Guid',
      },
      ttl: TTL.NONE,
    });

    const member =
      getFirstRecord<{ id: number; guid?: string }>(existingMembership) ??
      (await addRockGroupMember({
        groupId,
        personId,
        groupRoleId: GROUP_ROLE_ID,
        groupMemberStatus: PENDING_GROUP_MEMBER_STATUS,
      }));

    if (classValueGuid) {
      await setGroupMemberClassPreference(member.guid, classValueGuid);
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
