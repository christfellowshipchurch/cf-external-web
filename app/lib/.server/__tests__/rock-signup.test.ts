import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findOrCreateRockPersonForSignup,
  launchClassSignupWorkflow,
  launchCommunityServingSignupWorkflow,
  launchGroupSignupWorkflow,
  resolveGroupClassSignupTarget,
  updateRockPersonCampusForSignup,
} from '../rock-signup';

vi.mock('../fetch-rock-data', () => ({
  buildRockUrl: (endpoint: string) =>
    `https://rock.example.com/api/${endpoint}`,
  isPreviewMode: () => false,
  TTL: { NONE: 0, DEFAULT: 3600 },
}));
vi.mock('../rock-people-groups', () => ({
  fetchGroupMembers: vi.fn(),
  fetchGroups: vi.fn(),
  fetchPeople: vi.fn(),
  fetchPhoneNumbers: vi.fn(),
}));
vi.mock('../rock-campuses', () => ({ fetchCampuses: vi.fn() }));
vi.mock('../rock-utils', () => ({
  escapeOData: vi.fn((v: string) => v),
}));
vi.mock('../rock-person', () => ({
  updatePerson: vi.fn(),
  fetchUserLogin: vi.fn(),
  createUserProfile: vi.fn(),
}));
vi.mock('../rock-phone-numbers', () => ({
  parsePhoneNumberUtil: vi.fn(() => ({
    significantNumber: '5551234567',
    countryCode: 1,
  })),
  createPhoneNumberInRock: vi.fn(),
}));
vi.mock('../redis-config', () => ({ default: null }));

import {
  fetchGroupMembers,
  fetchGroups,
  fetchPeople,
  fetchPhoneNumbers,
} from '../rock-people-groups';
import { fetchCampuses } from '../rock-campuses';
import {
  updatePerson,
  fetchUserLogin,
  createUserProfile,
} from '../rock-person';
import { createPhoneNumberInRock } from '../rock-phone-numbers';

const mockFetchPeople = vi.mocked(fetchPeople);
const mockFetchPhoneNumbers = vi.mocked(fetchPhoneNumbers);
const mockFetchGroups = vi.mocked(fetchGroups);
const mockFetchGroupMembers = vi.mocked(fetchGroupMembers);
const mockFetchCampuses = vi.mocked(fetchCampuses);
const mockUpdatePerson = updatePerson as ReturnType<typeof vi.fn>;
const mockFetchUserLogin = fetchUserLogin as ReturnType<typeof vi.fn>;
const mockCreateUserProfile = createUserProfile as ReturnType<typeof vi.fn>;
const mockCreatePhoneNumberInRock = createPhoneNumberInRock as ReturnType<
  typeof vi.fn
>;

// Launches and writes go through the real sendRockV2 to this fetch.
const ROCK_V2 = 'https://rock.example.com/api/v2/models';
let mockFetch: ReturnType<typeof vi.fn>;
const sentToRock = (call = 0) => {
  const [url, init] = mockFetch.mock.calls[call];
  return { url, method: init.method, body: JSON.parse(init.body) };
};

const defaultInput = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '5551234567',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdatePerson.mockResolvedValue(undefined);
  mockCreatePhoneNumberInRock.mockResolvedValue(undefined);
  mockFetch = vi
    .fn()
    .mockResolvedValue({ ok: true, status: 204, text: async () => '' });
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('findOrCreateRockPersonForSignup', () => {
  // updatePerson only patches email when the Rock person has none, and only creates
  // a phone entry when none exists for the number (see rock-person.ts).

  it('Step 1 — returns personId when email login matches the submitted name', async () => {
    mockFetchUserLogin.mockResolvedValueOnce({ personId: 42 });
    mockFetchPeople.mockResolvedValueOnce({
      firstName: 'Jane',
      lastName: 'Doe',
    });

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('42');
    expect(mockFetchPeople).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'People',
        queryParams: { $filter: 'Id eq 42', $select: 'FirstName, LastName' },
      }),
    );
    expect(mockUpdatePerson).toHaveBeenCalledOnce();
    expect(mockUpdatePerson).toHaveBeenCalledWith('42', {
      email: defaultInput.email,
      phoneNumber: defaultInput.phoneNumber,
    });
  });

  it('Step 1 — ignores email login when the Rock person name does not match', async () => {
    mockFetchUserLogin
      .mockResolvedValueOnce({ personId: 42 })
      .mockResolvedValueOnce(null);
    mockFetchPeople
      .mockResolvedValueOnce({ firstName: 'John', lastName: 'Smith' })
      .mockResolvedValueOnce([]);
    mockFetchPhoneNumbers.mockResolvedValueOnce([]);
    mockCreateUserProfile.mockResolvedValue(123);

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('123');
    expect(mockUpdatePerson).not.toHaveBeenCalled();
    expect(mockCreatePhoneNumberInRock).toHaveBeenCalledOnce();
    expect(mockCreatePhoneNumberInRock).toHaveBeenCalledWith({
      personId: '123',
      phoneNumber: defaultInput.phoneNumber,
      countryCode: 1,
    });
  });

  it('Step 2 — returns personId when phone login matches the submitted name', async () => {
    mockFetchUserLogin
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ personId: 99 });
    mockFetchPeople.mockResolvedValueOnce({
      firstName: 'Jane',
      lastName: 'Doe',
    });

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('99');
    expect(mockUpdatePerson).toHaveBeenCalledOnce();
    expect(mockUpdatePerson).toHaveBeenCalledWith('99', {
      email: defaultInput.email,
      phoneNumber: defaultInput.phoneNumber,
    });
  });

  it('Step 2 — ignores phone login when the Rock person name does not match', async () => {
    mockFetchUserLogin
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ personId: 99 });
    mockFetchPeople
      .mockResolvedValueOnce({ firstName: 'John', lastName: 'Smith' })
      .mockResolvedValueOnce([]);
    mockFetchPhoneNumbers.mockResolvedValueOnce([]);
    mockCreateUserProfile.mockResolvedValue(123);

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('123');
    expect(mockUpdatePerson).not.toHaveBeenCalled();
    expect(mockCreatePhoneNumberInRock).toHaveBeenCalledOnce();
  });

  it('Step 3 — returns personId when People name+email matches', async () => {
    mockFetchUserLogin.mockResolvedValue(null);
    mockFetchPeople.mockResolvedValueOnce([{ id: 77 }]);

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('77');
    expect(mockFetchPeople).toHaveBeenCalledWith(
      expect.objectContaining({
        queryParams: {
          $filter:
            "FirstName eq 'Jane' and LastName eq 'Doe' and Email eq 'jane@example.com'",
          $select: 'Id',
        },
      }),
    );
    expect(mockUpdatePerson).toHaveBeenCalledOnce();
    expect(mockUpdatePerson).toHaveBeenCalledWith('77', {
      email: defaultInput.email,
      phoneNumber: defaultInput.phoneNumber,
    });
  });

  it.each([
    ['an object', { firstName: 'Jane', lastName: 'Doe' }],
    ['an array', [{ firstName: 'Jane', lastName: 'Doe' }]],
  ])(
    'Step 4 — returns personId when the phone number’s person name matches (%s)',
    async (_, person) => {
      mockFetchUserLogin.mockResolvedValue(null);
      mockFetchPeople.mockResolvedValueOnce([]).mockResolvedValueOnce(person);
      mockFetchPhoneNumbers.mockResolvedValueOnce([{ personId: 55 }]);

      const result = await findOrCreateRockPersonForSignup(defaultInput);

      expect(result).toBe('55');
      expect(mockFetchPhoneNumbers).toHaveBeenCalledWith(
        expect.objectContaining({
          queryParams: {
            $select: 'PersonId',
            $filter: "Number eq '5551234567'",
          },
        }),
      );
      expect(mockUpdatePerson).toHaveBeenCalledOnce();
      expect(mockUpdatePerson).toHaveBeenCalledWith('55', {
        email: defaultInput.email,
        phoneNumber: defaultInput.phoneNumber,
      });
    },
  );

  it.each([
    ['an object', { id: 123 }, '123'],
    ['a legacy number', 456, '456'],
  ])(
    'Step 5 — creates a new person when no match is found (%s)',
    async (_, created, personId) => {
      mockFetchUserLogin.mockResolvedValue(null);
      mockFetchPeople.mockResolvedValueOnce([]);
      mockFetchPhoneNumbers.mockResolvedValueOnce([]);
      mockCreateUserProfile.mockResolvedValue(created);

      const result = await findOrCreateRockPersonForSignup(defaultInput);

      expect(result).toBe(personId);
      expect(mockUpdatePerson).not.toHaveBeenCalled();
      expect(mockCreatePhoneNumberInRock).toHaveBeenCalledOnce();
      expect(mockCreatePhoneNumberInRock).toHaveBeenCalledWith({
        personId,
        phoneNumber: defaultInput.phoneNumber,
        countryCode: 1,
      });
    },
  );
});

describe('resolveGroupClassSignupTarget', () => {
  it.each([
    [31, 'group'],
    [101, 'class'],
    [135, 'class'],
    [136, 'class'],
  ] as const)(
    'routes active group type %i to %s signup',
    async (groupTypeId, target) => {
      mockFetchGroups.mockResolvedValueOnce({
        id: 123,
        groupTypeId,
        isActive: true,
        isArchived: false,
        isSecurityRole: false,
      });

      await expect(resolveGroupClassSignupTarget('123')).resolves.toBe(target);
      expect(mockFetchGroups).toHaveBeenCalledWith({
        endpoint: 'Groups',
        queryParams: {
          $filter: 'Id eq 123',
          $select: 'Id,GroupTypeId,IsActive,IsArchived,IsSecurityRole',
        },
        ttl: 0,
      });
    },
  );

  it.each([
    ['missing group', []],
    ['inactive group', { id: 123, groupTypeId: 31, isActive: false }],
    [
      'archived group',
      { id: 123, groupTypeId: 31, isActive: true, isArchived: true },
    ],
    [
      'security group',
      { id: 123, groupTypeId: 31, isActive: true, isSecurityRole: true },
    ],
    [
      'unsupported group type',
      {
        id: 123,
        groupTypeId: 999,
        isActive: true,
        isArchived: false,
        isSecurityRole: false,
      },
    ],
    ['incomplete group metadata', { id: 123, groupTypeId: 31, isActive: true }],
  ])('rejects %s', async (_label, result) => {
    mockFetchGroups.mockResolvedValueOnce(result);

    await expect(resolveGroupClassSignupTarget('123')).rejects.toThrow(
      'Invalid signup group',
    );
  });

  it.each(['', 'abc', '12.5', '-1', '0'])(
    'rejects malformed group id %j without querying Rock',
    async (groupId) => {
      await expect(resolveGroupClassSignupTarget(groupId)).rejects.toThrow(
        'Invalid signup group',
      );
      expect(mockFetchGroups).not.toHaveBeenCalled();
    },
  );
});

describe('launchClassSignupWorkflow', () => {
  it('launches Add To Group/Class (654) by its Guid with GroupId and PersonId', async () => {
    await launchClassSignupWorkflow('group-1', 'person-2');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(sentToRock()).toEqual({
      url: `${ROCK_V2}/workflows/actions/launch/4df7b9ea-10a4-4987-bf47-dfe9d3adb5c1`,
      method: 'POST',
      body: {
        name: 'Add To Group/Class',
        attributeValues: { GroupId: 'group-1', PersonId: 'person-2' },
      },
    });
  });

  it('throws when Rock refuses the launch, and launches only once', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    await expect(
      launchClassSignupWorkflow('group-1', 'person-2'),
    ).rejects.toThrow('401');
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});

describe('launchGroupSignupWorkflow', () => {
  const ADULT_GROUP_SIGNUP_LAUNCH = {
    url: `${ROCK_V2}/workflows/actions/launch/29543c34-293b-4725-92d5-e0a7d1254315`,
    method: 'POST',
    body: {
      name: 'Website Adult Group Signup',
      attributeValues: { GroupId: '10', PersonId: '20' },
    },
  };

  it.each([1, 2, 'Active', 'Pending'])(
    'preserves an existing %s membership without launching the workflow',
    async (groupMemberStatus) => {
      mockFetchGroupMembers.mockResolvedValueOnce({
        id: 456,
        groupMemberStatus,
      });

      await launchGroupSignupWorkflow('10', '20');

      expect(mockFetchGroupMembers).toHaveBeenCalledWith({
        endpoint: 'GroupMembers',
        queryParams: {
          $filter: 'GroupId eq 10 and PersonId eq 20 and IsArchived eq false',
          $select: 'Id,GroupMemberStatus',
        },
        ttl: 0,
      });
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it.each([0, 'Inactive'])(
    'launches the workflow to move an existing %s membership to Pending',
    async (groupMemberStatus) => {
      vi.stubEnv('ROCK_GROUP_SIGNUP_WORKFLOW_ID', '1941');
      mockFetchGroupMembers.mockResolvedValueOnce({
        id: 456,
        groupMemberStatus,
      });

      await launchGroupSignupWorkflow('10', '20');

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(sentToRock()).toEqual(ADULT_GROUP_SIGNUP_LAUNCH);
    },
  );

  it('uses Active/Pending precedence when multiple memberships exist', async () => {
    mockFetchGroupMembers.mockResolvedValueOnce([
      { id: 456, groupMemberStatus: 'Inactive' },
      { id: 789, groupMemberStatus: 'Active' },
    ]);

    await launchGroupSignupWorkflow('10', '20');

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fails closed when Rock returns an unknown membership status', async () => {
    mockFetchGroupMembers.mockResolvedValueOnce({
      id: 456,
      groupMemberStatus: 'Unknown',
    });

    await expect(launchGroupSignupWorkflow('10', '20')).rejects.toThrow(
      'Unknown existing group membership status',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('launches the configured Adult Group workflow (1941) by its Guid', async () => {
    vi.stubEnv('ROCK_GROUP_SIGNUP_WORKFLOW_ID', '1941');
    mockFetchGroupMembers.mockResolvedValueOnce([]);

    await launchGroupSignupWorkflow('10', '20');

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(sentToRock()).toEqual(ADULT_GROUP_SIGNUP_LAUNCH);
  });

  it('fails loud while the workflow id is not configured', async () => {
    vi.stubEnv('ROCK_GROUP_SIGNUP_WORKFLOW_ID', '');
    mockFetchGroupMembers.mockResolvedValueOnce([]);

    await expect(launchGroupSignupWorkflow('10', '20')).rejects.toThrow(
      'ROCK_GROUP_SIGNUP_WORKFLOW_ID is not configured',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('throws before calling Rock when the configured id has no Guid', async () => {
    vi.stubEnv('ROCK_GROUP_SIGNUP_WORKFLOW_ID', '987');
    mockFetchGroupMembers.mockResolvedValueOnce([]);

    await expect(launchGroupSignupWorkflow('10', '20')).rejects.toThrow('987');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('updateRockPersonCampusForSignup', () => {
  const CAMPUS_GUID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
  const FAMILY_GUID = '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';

  beforeEach(() => {
    mockFetchPeople.mockResolvedValue({ primaryFamilyId: 34 });
    mockFetchGroups.mockResolvedValue({ guid: FAMILY_GUID });
  });

  it('sets campus on the primary family that defines the person campus', async () => {
    mockFetchCampuses.mockResolvedValueOnce([{ id: 12 }]);

    await updateRockPersonCampusForSignup('person-2', CAMPUS_GUID);

    expect(mockFetchCampuses).toHaveBeenCalledWith(
      { guid: CAMPUS_GUID },
      ['Id'],
      0,
    );
    expect(mockFetchPeople).toHaveBeenCalledWith({
      endpoint: 'People',
      queryParams: {
        $filter: 'Id eq person-2',
        $select: 'PrimaryFamilyId',
      },
      ttl: 0,
    });
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(sentToRock()).toEqual({
      url: `${ROCK_V2}/groups/${FAMILY_GUID}`,
      method: 'PATCH',
      body: { CampusId: 12 },
    });
  });

  it('looks up a prefilled class campus by name, not as a Guid', async () => {
    mockFetchCampuses.mockResolvedValueOnce([{ id: 12 }]);

    await updateRockPersonCampusForSignup('person-2', 'Palm Beach Gardens');

    expect(mockFetchCampuses).toHaveBeenCalledWith(
      { name: 'Palm Beach Gardens' },
      ['Id'],
      0,
    );
    expect(sentToRock().body).toEqual({ CampusId: 12 });
  });

  it('fails without writing when the campus is unknown', async () => {
    mockFetchCampuses.mockResolvedValueOnce([]);

    await expect(
      updateRockPersonCampusForSignup('person-2', 'missing-campus-guid'),
    ).rejects.toThrow('Campus not found in Rock');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fails without writing when the person has no primary family', async () => {
    mockFetchCampuses.mockResolvedValueOnce([{ id: 12 }]);
    mockFetchPeople.mockResolvedValueOnce([]);

    await expect(
      updateRockPersonCampusForSignup('person-2', CAMPUS_GUID),
    ).rejects.toThrow('Primary family not found in Rock');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('launchCommunityServingSignupWorkflow', () => {
  const CAMPUS_GUID = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';

  const defaultWorkflowInput = {
    groupGuid: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    phoneNumber: '5615550123',
    birthdate: '1990-05-15',
    campus: 'Palm Beach Gardens',
    waiverAccepted: true,
  };

  // The Community Serving Sign Up workflow (1840) needs PascalCase keys, the
  // campus Guid (resolved from the name) and the waiver key with its trailing period.
  it('launches 1840 by its Guid with the campus Guid (not name) when the waiver is accepted', async () => {
    mockFetchCampuses.mockResolvedValueOnce([{ guid: CAMPUS_GUID }]);

    await launchCommunityServingSignupWorkflow(defaultWorkflowInput);

    expect(mockFetchCampuses).toHaveBeenCalledWith(
      { name: 'Palm Beach Gardens' },
      ['Guid'],
      0,
    );
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(sentToRock()).toEqual({
      url: `${ROCK_V2}/workflows/actions/launch/17f2ddea-bb94-4a28-8e86-f2358bc41524`,
      method: 'POST',
      body: {
        name: 'Community Serving Opportunity Sign Up',
        attributeValues: {
          Group: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
          FirstName: 'Jane',
          LastName: 'Doe',
          Email: 'jane.doe@example.com',
          CellPhone: '5615550123',
          Birthdate: '1990-05-15',
          Campus: CAMPUS_GUID,
          'IacceptthetermsoftheChristFellowshipwaiver.': 'Yes',
        },
      },
    });
  });

  it('sends an empty waiver value when the waiver is not accepted', async () => {
    mockFetchCampuses.mockResolvedValueOnce([{ guid: CAMPUS_GUID }]);

    await launchCommunityServingSignupWorkflow({
      ...defaultWorkflowInput,
      waiverAccepted: false,
    });

    expect(
      sentToRock().body.attributeValues[
        'IacceptthetermsoftheChristFellowshipwaiver.'
      ],
    ).toBe('');
  });

  it('throws without launching when Rock returns no campus for the name', async () => {
    mockFetchCampuses.mockResolvedValueOnce([]);

    await expect(
      launchCommunityServingSignupWorkflow({
        ...defaultWorkflowInput,
        campus: 'Unknown Campus',
      }),
    ).rejects.toThrow('Campus not found in Rock: "Unknown Campus"');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
