import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../fetch-rock-data', () => ({ TTL: { NONE: 0 } }));
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
});

describe('addRockGroupMember', () => {
  beforeEach(() => {
    vi.mocked(fetchGroups).mockResolvedValue({ groupTypeId: 152 });
  });

  it('reads the group’s type, sends it (v2 requires it) and returns the Guid', async () => {
    vi.mocked(sendRockV2).mockResolvedValue({ id: 55, guid: MEMBER_GUID });

    await expect(addRockGroupMember(newMember)).resolves.toEqual({
      id: 55,
      guid: MEMBER_GUID,
    });
    expect(fetchGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'Groups',
        queryParams: { $filter: 'Id eq 1839709', $select: 'GroupTypeId' },
      }),
    );
    expect(sendRockV2).toHaveBeenCalledTimes(1);
    expect(sendRockV2).toHaveBeenCalledWith('POST', 'groupmembers', {
      GroupId: 1839709,
      GroupTypeId: 152,
      PersonId: 740,
      GroupRoleId: 379,
      GroupMemberStatus: 2,
      IsArchived: false,
      IsSystem: false,
    });
  });

  // A write is never retried: Rock may already have saved it.
  it.each([400, 401, 403, 404, 500])(
    'throws on a %i and writes only once',
    async (status) => {
      const error = new RockAPIError('failed', status);
      vi.mocked(sendRockV2).mockRejectedValue(error);

      await expect(addRockGroupMember(newMember)).rejects.toBe(error);
      expect(sendRockV2).toHaveBeenCalledTimes(1);
    },
  );

  it('throws a 404 without writing when the group’s type is unknown', async () => {
    vi.mocked(fetchGroups).mockResolvedValue([]);

    const error = await addRockGroupMember(newMember).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RockAPIError);
    expect((error as RockAPIError).statusCode).toBe(404);
    expect(sendRockV2).not.toHaveBeenCalled();
  });
});

describe('updateRockPersonCampusForSignup', () => {
  beforeEach(() => {
    vi.mocked(fetchCampuses).mockResolvedValue([{ id: 14 }]);
    vi.mocked(fetchPeople).mockResolvedValue({ primaryFamilyId: 900 });
  });

  it('reads the family’s Guid and patches the family’s campus by it', async () => {
    vi.mocked(fetchGroups).mockResolvedValue({ guid: FAMILY_GUID });

    await updateRockPersonCampusForSignup('740', 'Jupiter');

    expect(fetchGroups).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'Groups',
        queryParams: { $filter: 'Id eq 900', $select: 'Guid' },
      }),
    );
    expect(sendRockV2).toHaveBeenCalledTimes(1);
    expect(sendRockV2).toHaveBeenCalledWith('PATCH', `groups/${FAMILY_GUID}`, {
      CampusId: 14,
    });
  });

  it('throws a 404 without writing when the family has no Guid', async () => {
    vi.mocked(fetchGroups).mockResolvedValue([]);

    const error = await updateRockPersonCampusForSignup('740', 'Jupiter').catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(RockAPIError);
    expect((error as RockAPIError).statusCode).toBe(404);
    expect(sendRockV2).not.toHaveBeenCalled();
  });

  it('throws when the PATCH fails, and does not retry it', async () => {
    vi.mocked(fetchGroups).mockResolvedValue({ guid: FAMILY_GUID });
    const error = new RockAPIError('refused', 401);
    vi.mocked(sendRockV2).mockRejectedValue(error);

    await expect(
      updateRockPersonCampusForSignup('740', 'Jupiter'),
    ).rejects.toBe(error);
    expect(sendRockV2).toHaveBeenCalledTimes(1);
  });
});
