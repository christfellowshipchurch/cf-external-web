import {
  fetchRockData,
  patchRockData,
  postRockData,
  TTL,
} from './fetch-rock-data';
import {
  createUserProfile,
  fetchUserLogin,
} from './authentication/rock-authentication';
import {
  createPhoneNumberInRock,
  parsePhoneNumberUtil,
} from './authentication/sms-authentication';
import { updatePerson } from './rock-person';
import { escapeOData } from './rock-utils';

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
  const personDetails = await fetchRockData({
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
  const peopleByEmail = await fetchRockData({
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
  const phoneEntries = await fetchRockData({
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
  const campusFilter = ROCK_GUID_RE.test(campusIdentifier)
    ? `Guid eq guid'${escapeOData(campusIdentifier)}'`
    : `Name eq '${escapeOData(campusIdentifier)}'`;

  const [campusResult, personResult] = await Promise.all([
    fetchRockData({
      endpoint: 'Campuses',
      queryParams: {
        $filter: campusFilter,
        $select: 'Id',
      },
      ttl: TTL.NONE,
    }),
    fetchRockData({
      endpoint: 'People',
      queryParams: {
        $filter: `Id eq ${personId}`,
        $select: 'PrimaryFamilyId',
      },
      ttl: TTL.NONE,
    }),
  ]);
  const campus = Array.isArray(campusResult) ? campusResult[0] : campusResult;
  const person = Array.isArray(personResult) ? personResult[0] : personResult;

  if (!campus?.id) {
    throw new Error('Campus not found in Rock');
  }
  if (!person?.primaryFamilyId) {
    throw new Error('Primary family not found in Rock');
  }

  await patchRockData({
    endpoint: `Groups/${person.primaryFamilyId}`,
    body: { CampusId: campus.id },
  });
};

export const resolveGroupClassSignupTarget = async (
  groupId: string,
): Promise<GroupClassSignupTarget> => {
  if (!/^\d+$/.test(groupId) || Number(groupId) <= 0) {
    throw new Error('Invalid signup group');
  }

  const result = await fetchRockData({
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
  await postRockData({
    endpoint: `Workflows/LaunchWorkflow/0?workflowTypeId=654&workflowName=Add%20To%20Group/Class`,
    body: { GroupId: groupId, PersonId: personId },
  });
};

export const launchGroupSignupWorkflow = async (
  groupId: string,
  personId: string,
): Promise<void> => {
  const existingMembership = await fetchRockData({
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

  await postRockData({
    endpoint: `Workflows/LaunchWorkflow/0?workflowTypeId=${workflowTypeId}&workflowName=Website%20Adult%20Group%20Signup`,
    body: { GroupId: groupId, PersonId: personId },
  });
};

const resolveRockCampusGuidByName = async (
  campusName: string,
): Promise<string> => {
  const result = await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: `Name eq '${escapeOData(campusName)}'`,
      $select: 'Guid',
    },
    ttl: TTL.NONE,
  });

  const record = Array.isArray(result) ? result[0] : result;
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

  await postRockData({
    endpoint:
      'Workflows/LaunchWorkflow/0?workflowTypeId=1840&workflowName=Community%20Serving%20Opportunity%20Sign%20Up',
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
