import type { ActionFunction } from 'react-router';
import {
  fetchRockData,
  postRockData,
  TTL,
} from '~/lib/.server/fetch-rock-data';
import { findOrCreateRockPersonForSignup } from '~/lib/.server/rock-signup';
import { escapeOData } from '~/lib/.server/rock-utils';

const GROUP_ROLE_ID = 359;
const ACTIVE_GROUP_MEMBER_STATUS = 1;

const CAMPUS_UPDATES_GROUPS: Record<number, number> = {
  10: 1098441,
  17: 1098646,
  6: 1098647,
  9: 1098648,
  4: 1098649,
  7: 1098650,
  8: 1098651,
  14: 1098652,
  12: 1098653,
  2: 1098654,
  13: 1098655,
  20: 1098656,
  3: 1098657,
  5: 1098658,
  1: 1098659,
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

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();

    const FirstName = formData.get('FirstName')?.toString().trim();
    const LastName = formData.get('LastName')?.toString().trim();
    const EmailAddress = formData.get('EmailAddress')?.toString().trim();
    const PhoneNumber = formData.get('PhoneNumber')?.toString().trim();
    const Campus = formData.get('Campus')?.toString().trim();

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

    const groupId = CAMPUS_UPDATES_GROUPS[campus.id];

    if (!groupId) {
      return Response.json(
        { error: 'This campus is not available for group notifications.' },
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

    if (!getFirstRecord(existingMembership)) {
      await postRockData({
        endpoint: 'GroupMembers',
        body: {
          GroupId: groupId,
          PersonId: personId,
          GroupRoleId: GROUP_ROLE_ID,
          GroupMemberStatus: ACTIVE_GROUP_MEMBER_STATUS,
          IsArchived: false,
        },
      });
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
