import {
  fetchGroupMembers,
  fetchGroups,
  fetchPeople,
  fetchPhoneNumbers,
} from './rock-people-groups';
import { patchRockData, postRockData, TTL } from './fetch-rock-data';
import { RockAPIError } from './error-types';
import { requireV2Guid, sendRockV2, writeRockV2 } from './fetch-rock-v2';
import {
  createUserProfile,
  fetchUserLogin,
} from './authentication/rock-authentication';
import {
  createPhoneNumberInRock,
  parsePhoneNumberUtil,
} from './authentication/sms-authentication';
import { updatePerson } from './rock-person';
import { fetchCampuses } from './rock-campuses';
import { escapeOData } from './rock-utils';
import { launchRockWorkflow } from './rock-workflow';

export interface SignupPersonInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export type GroupClassSignupTarget = 'group' | 'class';

const ADULT_GROUP_TYPE_ID = 31;
const CLASS_GROUP_TYPE_IDS = new Set([101, 135, 136]);
const ROCK_GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SignupGroup = {
  id?: number;
  groupTypeId?: number;
  isActive?: boolean;
  isArchived?: boolean;
  isSecurityRole?: boolean;
};

const normalizeName = (name: string | undefined) =>
  name?.trim().toLowerCase() ?? '';

const personNameMatches = async (
  personId: string | number,
  firstName: string,
  lastName: string,
): Promise<boolean> => {
  const personDetails = await fetchPeople({
    endpoint: 'People',
    queryParams: {
      $filter: `Id eq ${personId}`,
      $select: 'FirstName, LastName',
    },
    ttl: TTL.NONE,
  });

  const person = Array.isArray(personDetails)
    ? personDetails[0]
    : personDetails;

  return (
    normalizeName(person?.firstName) === normalizeName(firstName) &&
    normalizeName(person?.lastName) === normalizeName(lastName)
  );
};

const getCreatedPersonId = (createdPerson: unknown): string => {
  if (typeof createdPerson === 'string' || typeof createdPerson === 'number') {
    return createdPerson.toString();
  }

  if (
    createdPerson &&
    typeof createdPerson === 'object' &&
    'id' in createdPerson &&
    (typeof createdPerson.id === 'string' ||
      typeof createdPerson.id === 'number')
  ) {
    return createdPerson.id.toString();
  }

  throw new Error('Unable to create profile!');
};

export const findOrCreateRockPersonForSignup = async (
  input: SignupPersonInput,
): Promise<string> => {
  const { firstName, lastName, email, phoneNumber } = input;
  const { significantNumber, countryCode } = parsePhoneNumberUtil(phoneNumber);

  // Step 1: Check by email login
  const emailLogin = await fetchUserLogin(email);
  if (
    emailLogin &&
    (await personNameMatches(emailLogin.personId, firstName, lastName))
  ) {
    await updatePerson(emailLogin.personId.toString(), { email, phoneNumber });
    return emailLogin.personId.toString();
  }

  // Step 2: Check by phone login
  const phoneLogin = await fetchUserLogin(significantNumber);
  if (
    phoneLogin &&
    (await personNameMatches(phoneLogin.personId, firstName, lastName))
  ) {
    await updatePerson(phoneLogin.personId.toString(), { email, phoneNumber });
    return phoneLogin.personId.toString();
  }

  // Step 3: Query People by first name, last name, and email
  const peopleByEmail = await fetchPeople({
    endpoint: 'People',
    queryParams: {
      $filter: `FirstName eq '${escapeOData(firstName)}' and LastName eq '${escapeOData(lastName)}' and Email eq '${escapeOData(email)}'`,
      $select: 'Id',
    },
    ttl: TTL.NONE,
  });

  const personByEmail = Array.isArray(peopleByEmail)
    ? peopleByEmail[0]
    : peopleByEmail;

  if (personByEmail?.id) {
    await updatePerson(personByEmail.id.toString(), { email, phoneNumber });
    return personByEmail.id.toString();
  }

  // Step 4: Query PhoneNumbers by significant number, then verify name match
  const phoneEntries = await fetchPhoneNumbers({
    endpoint: 'PhoneNumbers',
    queryParams: {
      $select: 'PersonId',
      $filter: `Number eq '${escapeOData(significantNumber)}'`,
    },
    ttl: TTL.NONE,
  });

  const phoneEntriesArr = Array.isArray(phoneEntries)
    ? phoneEntries
    : phoneEntries != null
      ? [phoneEntries]
      : [];

  for (const entry of phoneEntriesArr) {
    if (!entry.personId) continue;

    if (await personNameMatches(entry.personId, firstName, lastName)) {
      await updatePerson(entry.personId.toString(), { email, phoneNumber });
      return entry.personId.toString();
    }
  }

  // Step 5: No match found — create a new person directly
  const newPersonId = await createUserProfile({
    email,
    FirstName: firstName,
    LastName: lastName,
  });
  const newPersonIdString = getCreatedPersonId(newPersonId);
  if (countryCode) {
    await createPhoneNumberInRock({
      personId: newPersonIdString,
      phoneNumber,
      countryCode,
    });
  }
  return newPersonIdString;
};

export const updateRockPersonCampusForSignup = async (
  personId: string,
  campusIdentifier: string,
): Promise<void> => {
  const [campusResult, personResult] = await Promise.all([
    fetchCampuses<{ id?: number }>(
      ROCK_GUID_RE.test(campusIdentifier)
        ? { guid: campusIdentifier }
        : { name: campusIdentifier },
      ['Id'],
      TTL.NONE,
    ),
    fetchPeople({
      endpoint: 'People',
      queryParams: {
        $filter: `Id eq ${personId}`,
        $select: 'PrimaryFamilyId',
      },
      ttl: TTL.NONE,
    }),
  ]);
  const [campus] = campusResult;
  const person = Array.isArray(personResult) ? personResult[0] : personResult;

  if (!campus?.id) {
    throw new Error('Campus not found in Rock');
  }
  if (!person?.primaryFamilyId) {
    throw new Error('Primary family not found in Rock');
  }

  const familyId = person.primaryFamilyId;
  const body = { CampusId: campus.id };
  await writeRockV2({
    label: 'family campus',
    v2: async () => {
      const family = await fetchGroups({
        endpoint: 'Groups',
        queryParams: { $filter: `Id eq ${familyId}`, $select: 'Guid' },
        ttl: TTL.NONE,
      });
      const guid = (Array.isArray(family) ? family[0] : family)?.guid;
      await sendRockV2(
        'PATCH',
        `groups/${requireV2Guid(guid, 'family')}`,
        body,
      );
    },
    fallback: async () => {
      await patchRockData({ endpoint: `Groups/${familyId}`, body });
    },
  });
};

interface NewGroupMember {
  groupId: number;
  personId: string | number;
  groupRoleId: number;
  groupMemberStatus: number;
}

/**
 * Adds a person to a group. Returns the new member's Id, and its Guid when it
 * was created on v2 (v1 returns only the Id).
 */
export const addRockGroupMember = async ({
  groupId,
  personId,
  groupRoleId,
  groupMemberStatus,
}: NewGroupMember): Promise<{ id: number | null; guid?: string }> =>
  writeRockV2({
    label: 'group member',
    v2: async () => {
      // v2 requires the group's type, which v1 fills in itself.
      const group = await fetchGroups({
        endpoint: 'Groups',
        queryParams: { $filter: `Id eq ${groupId}`, $select: 'GroupTypeId' },
      });
      const groupTypeId = (Array.isArray(group) ? group[0] : group)
        ?.groupTypeId;
      if (!groupTypeId) {
        throw new RockAPIError('No group type for the group member', 404);
      }
      const created = (await sendRockV2('POST', 'groupmembers', {
        GroupId: groupId,
        GroupTypeId: groupTypeId,
        PersonId: Number(personId),
        GroupRoleId: groupRoleId,
        GroupMemberStatus: groupMemberStatus,
        IsArchived: false,
        IsSystem: false,
      })) as { id?: number; guid?: string } | null;
      return { id: created?.id ?? null, guid: created?.guid };
    },
    fallback: async () => {
      const created = await postRockData({
        endpoint: 'GroupMembers',
        body: {
          GroupId: groupId,
          PersonId: personId,
          GroupRoleId: groupRoleId,
          GroupMemberStatus: groupMemberStatus,
          IsArchived: false,
        },
      });
      // v1 returns the new entity's Id as a plain number.
      return {
        id: typeof created === 'number' ? created : (created?.id ?? null),
      };
    },
  });

export const resolveGroupClassSignupTarget = async (
  groupId: string,
): Promise<GroupClassSignupTarget> => {
  if (!/^\d+$/.test(groupId) || Number(groupId) <= 0) {
    throw new Error('Invalid signup group');
  }

  const result = await fetchGroups({
    endpoint: 'Groups',
    queryParams: {
      $filter: `Id eq ${groupId}`,
      $select: 'Id,GroupTypeId,IsActive,IsArchived,IsSecurityRole',
    },
    ttl: TTL.NONE,
  });
  const group: SignupGroup | undefined = Array.isArray(result)
    ? result[0]
    : result;

  if (
    group?.id !== Number(groupId) ||
    group.isActive !== true ||
    group.isArchived !== false ||
    group.isSecurityRole !== false
  ) {
    throw new Error('Invalid signup group');
  }

  if (group.groupTypeId === ADULT_GROUP_TYPE_ID) return 'group';
  if (
    group.groupTypeId != null &&
    CLASS_GROUP_TYPE_IDS.has(group.groupTypeId)
  ) {
    return 'class';
  }

  throw new Error('Invalid signup group');
};

export const launchClassSignupWorkflow = async (
  groupId: string,
  personId: string,
): Promise<void> => {
  await launchRockWorkflow({
    workflowTypeId: '654',
    workflowName: 'Add To Group/Class',
    body: { GroupId: groupId, PersonId: personId },
  });
};

export const launchGroupSignupWorkflow = async (
  groupId: string,
  personId: string,
): Promise<void> => {
  const existingMembership = await fetchGroupMembers({
    endpoint: 'GroupMembers',
    queryParams: {
      $filter: `GroupId eq ${groupId} and PersonId eq ${personId} and IsArchived eq false`,
      $select: 'Id,GroupMemberStatus',
    },
    ttl: TTL.NONE,
  });

  const memberships = Array.isArray(existingMembership)
    ? existingMembership
    : existingMembership
      ? [existingMembership]
      : [];
  const statuses = memberships.map(
    (membership) => membership.groupMemberStatus,
  );

  if (
    statuses.some(
      (status) =>
        status === 1 ||
        status === 2 ||
        status === 'Active' ||
        status === 'Pending',
    )
  ) {
    return;
  }

  if (statuses.some((status) => status !== 0 && status !== 'Inactive')) {
    throw new Error('Unknown existing group membership status');
  }

  const workflowTypeId = process.env.ROCK_GROUP_SIGNUP_WORKFLOW_ID?.trim();
  if (!workflowTypeId || !/^\d+$/.test(workflowTypeId)) {
    throw new Error('ROCK_GROUP_SIGNUP_WORKFLOW_ID is not configured');
  }

  await launchRockWorkflow({
    workflowTypeId,
    workflowName: 'Website Adult Group Signup',
    body: { GroupId: groupId, PersonId: personId },
  });
};

const resolveRockCampusGuidByName = async (
  campusName: string,
): Promise<string> => {
  const [record] = await fetchCampuses<{ guid?: unknown }>(
    { name: campusName },
    ['Guid'],
    TTL.NONE,
  );
  if (!record?.guid || typeof record.guid !== 'string') {
    throw new Error(`Campus not found in Rock: "${campusName}"`);
  }
  return record.guid;
};

export interface CommunityServingSignupInput {
  groupGuid: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  /** ISO yyyy-mm-dd from <input type="date">. */
  birthdate: string;
  /** Rock canonical campus name (matches RockCampuses[].name in rock-config.ts). Resolved to a Guid before posting. */
  campus: string;
  waiverAccepted: boolean;
}

export const launchCommunityServingSignupWorkflow = async (
  input: CommunityServingSignupInput,
): Promise<void> => {
  const campusGuid = await resolveRockCampusGuidByName(input.campus);

  await launchRockWorkflow({
    workflowTypeId: '1840',
    workflowName: 'Community Serving Opportunity Sign Up',
    body: {
      Group: input.groupGuid,
      FirstName: input.firstName,
      LastName: input.lastName,
      Email: input.email,
      CellPhone: input.phoneNumber,
      Birthdate: input.birthdate,
      Campus: campusGuid,
      'IacceptthetermsoftheChristFellowshipwaiver.': input.waiverAccepted
        ? 'Yes'
        : '',
    },
  });
};
