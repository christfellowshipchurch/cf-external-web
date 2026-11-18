import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetch-rock-data', () => ({
  patchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
}));
vi.mock('../fetch-rock-v2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../fetch-rock-v2')>()),
  sendRockV2: vi.fn(),
}));
vi.mock('../rock-people-groups', () => ({
  fetchGroupMembers: vi.fn(),
  fetchGroups: vi.fn(),
  fetchPeople: vi.fn(),
  fetchPhoneNumbers: vi.fn(),
}));
vi.mock('../rock-campuses', () => ({ fetchCampuses: vi.fn() }));
vi.mock('../rock-person', () => ({
  createUserProfile: vi.fn(),
  fetchUserLogin: vi.fn(),
  updatePerson: vi.fn(),
}));
vi.mock('../rock-workflow', () => ({ launchRockWorkflow: vi.fn() }));
vi.mock('../rock-phone-numbers', () => ({
  createPhoneNumberInRock: vi.fn(),
  parsePhoneNumberUtil: vi.fn(),
}));
vi.mock('../redis-config', () => ({ default: null }));

import { patchRockData, postRockData } from '../fetch-rock-data';
import { sendRockV2 } from '../fetch-rock-v2';
import { RockAPIError } from '../error-types';
import { fetchGroups, fetchPeople } from '../rock-people-groups';
import { fetchCampuses } from '../rock-campuses';
import {
  addRockGroupMember,
  updateRockPersonCampusForSignup,
} from '../rock-signup';

const MEMBER_GUID = '9d1e2f3a-4b5c-6d7e-8f9a-0b1c2d3e4f5a';
const FAMILY_GUID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';

const newMember = {
  groupId: 1839709,
  personId: '740',
  groupRoleId: 379,
  groupMemberStatus: 2,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('ROCK_V2_ENABLED', 'true');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('addRockGroupMember on Rock v2', () => {
  beforeEach(() => {
    vi.mocked(fetchGroups).mockResolvedValue({ groupTypeId: 152 });
  });

  it('sends the group’s type, which v2 requires, and returns the Guid', async () => {
    vi.mocked(sendRockV2).mockResolvedValue({ id: 55, guid: MEMBER_GUID });

    await expect(addRockGroupMember(newMember)).resolves.toEqual({
      id: 55,
      guid: MEMBER_GUID,
    });
    expect(sendRockV2).toHaveBeenCalledWith('POST', 'groupmembers', {
      GroupId: 1839709,
      GroupTypeId: 152,
      PersonId: 740,
      GroupRoleId: 379,
      GroupMemberStatus: 2,
      IsArchived: false,
      IsSystem: false,
    });
    expect(postRockData).not.toHaveBeenCalled();
  });

  it('creates on v1 when Rock refused, with no Guid', async () => {
    vi.mocked(sendRockV2).mockRejectedValue(new RockAPIError('refused', 400));
    vi.mocked(postRockData).mockResolvedValue(56);

    await expect(addRockGroupMember(newMember)).resolves.toEqual({ id: 56 });
    expect(postRockData).toHaveBeenCalledTimes(1);
  });

  it('throws on a 500 and does not create on v1', async () => {
    const error = new RockAPIError('failed', 500);
    vi.mocked(sendRockV2).mockRejectedValue(error);

    await expect(addRockGroupMember(newMember)).rejects.toBe(error);
    expect(postRockData).not.toHaveBeenCalled();
  });

  it('creates on v1 when the group’s type is unknown', async () => {
    vi.mocked(fetchGroups).mockResolvedValue([]);
    vi.mocked(postRockData).mockResolvedValue(57);

    await expect(addRockGroupMember(newMember)).resolves.toEqual({ id: 57 });
    expect(sendRockV2).not.toHaveBeenCalled();
  });
});

describe('updateRockPersonCampusForSignup on Rock v2', () => {
  beforeEach(() => {
    vi.mocked(fetchCampuses).mockResolvedValue([{ id: 14 }]);
    vi.mocked(fetchPeople).mockResolvedValue({ primaryFamilyId: 900 });
  });

  it('patches the family by its Guid', async () => {
    vi.mocked(fetchGroups).mockResolvedValue({ guid: FAMILY_GUID });

    await updateRockPersonCampusForSignup('740', 'Jupiter');

    expect(sendRockV2).toHaveBeenCalledWith('PATCH', `groups/${FAMILY_GUID}`, {
      CampusId: 14,
    });
    expect(patchRockData).not.toHaveBeenCalled();
  });

  it('patches on v1 when the family has no Guid', async () => {
    vi.mocked(fetchGroups).mockResolvedValue([]);

    await updateRockPersonCampusForSignup('740', 'Jupiter');

    expect(sendRockV2).not.toHaveBeenCalled();
    expect(patchRockData).toHaveBeenCalledWith({
      endpoint: 'Groups/900',
      body: { CampusId: 14 },
    });
  });
});
