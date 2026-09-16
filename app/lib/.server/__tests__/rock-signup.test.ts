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
  fetchRockData: vi.fn(),
  patchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
}));
vi.mock('../rock-utils', () => ({
  escapeOData: vi.fn((v: string) => v),
}));
vi.mock('../rock-person', () => ({
  updatePerson: vi.fn(),
}));
vi.mock('../authentication/rock-authentication', () => ({
  fetchUserLogin: vi.fn(),
  createUserProfile: vi.fn(),
}));
vi.mock('../authentication/sms-authentication', () => ({
  parsePhoneNumberUtil: vi.fn(() => ({
    significantNumber: '5551234567',
    countryCode: 1,
  })),
  createPhoneNumberInRock: vi.fn(),
}));
vi.mock('../redis-config', () => ({ default: null }));

import { fetchRockData, patchRockData, postRockData } from '../fetch-rock-data';
import { updatePerson } from '../rock-person';
import {
  fetchUserLogin,
  createUserProfile,
} from '../authentication/rock-authentication';
import { createPhoneNumberInRock } from '../authentication/sms-authentication';

const mockFetchRockData = fetchRockData as ReturnType<typeof vi.fn>;
const mockPatchRockData = patchRockData as ReturnType<typeof vi.fn>;
const mockPostRockData = postRockData as ReturnType<typeof vi.fn>;
const mockUpdatePerson = updatePerson as ReturnType<typeof vi.fn>;
const mockFetchUserLogin = fetchUserLogin as ReturnType<typeof vi.fn>;
const mockCreateUserProfile = createUserProfile as ReturnType<typeof vi.fn>;
const mockCreatePhoneNumberInRock = createPhoneNumberInRock as ReturnType<
  typeof vi.fn
>;

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
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('findOrCreateRockPersonForSignup', () => {
  // updatePerson only patches email when the Rock person has none, and only creates
  // a phone entry when none exists for the number — see rock-person.ts for implementation.
  // These tests verify that updatePerson is invoked after each successful lookup step.

  it('Step 1 — returns personId when email login matches the submitted name', async () => {
    mockFetchUserLogin.mockResolvedValueOnce({ personId: 42 });
    mockFetchRockData.mockResolvedValueOnce({
      firstName: 'Jane',
      lastName: 'Doe',
    });

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('42');
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
    mockFetchRockData
      .mockResolvedValueOnce({ firstName: 'John', lastName: 'Smith' })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
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
    mockFetchRockData.mockResolvedValueOnce({
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
    mockFetchRockData
      .mockResolvedValueOnce({ firstName: 'John', lastName: 'Smith' })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
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

  it('Step 3 — returns personId when People OData name+email matches', async () => {
    mockFetchUserLogin.mockResolvedValue(null);
    mockFetchRockData.mockResolvedValueOnce([{ id: 77 }]);

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('77');
    expect(mockUpdatePerson).toHaveBeenCalledOnce();
    expect(mockUpdatePerson).toHaveBeenCalledWith('77', {
      email: defaultInput.email,
      phoneNumber: defaultInput.phoneNumber,
    });
  });

  it('Step 4 — returns personId when PhoneNumbers name matches', async () => {
    mockFetchUserLogin.mockResolvedValue(null);
    mockFetchRockData
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ personId: 55 }])
      .mockResolvedValueOnce({ firstName: 'Jane', lastName: 'Doe' });

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('55');
    expect(mockUpdatePerson).toHaveBeenCalledOnce();
    expect(mockUpdatePerson).toHaveBeenCalledWith('55', {
      email: defaultInput.email,
      phoneNumber: defaultInput.phoneNumber,
    });
  });

  it('Step 4 — returns personId when People lookup returns array response', async () => {
    mockFetchUserLogin.mockResolvedValue(null);
    mockFetchRockData
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ personId: 55 }])
      .mockResolvedValueOnce([{ firstName: 'Jane', lastName: 'Doe' }]);

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('55');
    expect(mockUpdatePerson).toHaveBeenCalledOnce();
    expect(mockUpdatePerson).toHaveBeenCalledWith('55', {
      email: defaultInput.email,
      phoneNumber: defaultInput.phoneNumber,
    });
  });

  it('Step 5 — creates new person when no match found', async () => {
    mockFetchUserLogin.mockResolvedValue(null);
    mockFetchRockData.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockCreateUserProfile.mockResolvedValue({ id: 123 });

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

  it('Step 5 — supports legacy numeric create profile responses', async () => {
    mockFetchUserLogin.mockResolvedValue(null);
    mockFetchRockData.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockCreateUserProfile.mockResolvedValue(456);

    const result = await findOrCreateRockPersonForSignup(defaultInput);

    expect(result).toBe('456');
    expect(mockCreatePhoneNumberInRock).toHaveBeenCalledWith({
      personId: '456',
      phoneNumber: defaultInput.phoneNumber,
      countryCode: 1,
    });
  });
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
      mockFetchRockData.mockResolvedValueOnce({
        id: 123,
        groupTypeId,
        isActive: true,
        isArchived: false,
        isSecurityRole: false,
      });

      await expect(resolveGroupClassSignupTarget('123')).resolves.toBe(target);
      expect(mockFetchRockData).toHaveBeenCalledWith({
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
    mockFetchRockData.mockResolvedValueOnce(result);

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
      expect(mockFetchRockData).not.toHaveBeenCalled();
    },
  );
});

describe('launchClassSignupWorkflow', () => {
  it('calls postRockData with endpoint containing workflowTypeId=654 and correct body casing', async () => {
    mockPostRockData.mockResolvedValue({});

    await launchClassSignupWorkflow('group-1', 'person-2');

    expect(mockPostRockData).toHaveBeenCalledOnce();
    const [call] = mockPostRockData.mock.calls[0] as [
      { endpoint: string; body: Record<string, string> },
    ];
    expect(call.endpoint).toContain('workflowTypeId=654');
    expect(call.body).toEqual({ GroupId: 'group-1', PersonId: 'person-2' });
  });
});

describe('launchGroupSignupWorkflow', () => {
  it.each([1, 2, 'Active', 'Pending'])(
    'preserves an existing %s membership without launching the workflow',
    async (groupMemberStatus) => {
      mockFetchRockData.mockResolvedValueOnce({
        id: 456,
        groupMemberStatus,
      });

      await launchGroupSignupWorkflow('10', '20');

      expect(mockFetchRockData).toHaveBeenCalledWith({
        endpoint: 'GroupMembers',
        queryParams: {
          $filter: 'GroupId eq 10 and PersonId eq 20 and IsArchived eq false',
          $select: 'Id,GroupMemberStatus',
        },
        ttl: 0,
      });
      expect(mockPostRockData).not.toHaveBeenCalled();
    },
  );

  it.each([0, 'Inactive'])(
    'launches the workflow to move an existing %s membership to Pending',
    async (groupMemberStatus) => {
      vi.stubEnv('ROCK_GROUP_SIGNUP_WORKFLOW_ID', '987');
      mockFetchRockData.mockResolvedValueOnce({
        id: 456,
        groupMemberStatus,
      });
      mockPostRockData.mockResolvedValue({});

      await launchGroupSignupWorkflow('10', '20');

      expect(mockPostRockData).toHaveBeenCalledWith({
        endpoint:
          'Workflows/LaunchWorkflow/0?workflowTypeId=987&workflowName=Website%20Adult%20Group%20Signup',
        body: { GroupId: '10', PersonId: '20' },
      });
    },
  );

  it('uses Active/Pending precedence when multiple memberships exist', async () => {
    mockFetchRockData.mockResolvedValueOnce([
      { id: 456, groupMemberStatus: 'Inactive' },
      { id: 789, groupMemberStatus: 'Active' },
    ]);

    await launchGroupSignupWorkflow('10', '20');

    expect(mockPostRockData).not.toHaveBeenCalled();
  });

  it('fails closed when Rock returns an unknown membership status', async () => {
    mockFetchRockData.mockResolvedValueOnce({
      id: 456,
      groupMemberStatus: 'Unknown',
    });

    await expect(launchGroupSignupWorkflow('10', '20')).rejects.toThrow(
      'Unknown existing group membership status',
    );
    expect(mockPostRockData).not.toHaveBeenCalled();
  });

  it('launches the configured Adult Group workflow', async () => {
    vi.stubEnv('ROCK_GROUP_SIGNUP_WORKFLOW_ID', '987');
    mockFetchRockData.mockResolvedValueOnce([]);
    mockPostRockData.mockResolvedValue({});

    await launchGroupSignupWorkflow('group-1', 'person-2');

    expect(mockPostRockData).toHaveBeenCalledWith({
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=987&workflowName=Website%20Adult%20Group%20Signup',
      body: { GroupId: 'group-1', PersonId: 'person-2' },
    });
  });

  it('fails loud while the new workflow id is not configured', async () => {
    vi.stubEnv('ROCK_GROUP_SIGNUP_WORKFLOW_ID', '');
    mockFetchRockData.mockResolvedValueOnce([]);

    await expect(
      launchGroupSignupWorkflow('group-1', 'person-2'),
    ).rejects.toThrow('ROCK_GROUP_SIGNUP_WORKFLOW_ID is not configured');
    expect(mockPostRockData).not.toHaveBeenCalled();
  });
});

describe('updateRockPersonCampusForSignup', () => {
  it('sets campus on the primary family that defines the person campus', async () => {
    mockFetchRockData
      .mockResolvedValueOnce([{ id: 12 }])
      .mockResolvedValueOnce({ primaryFamilyId: 34 });
    mockPatchRockData.mockResolvedValue({});

    await updateRockPersonCampusForSignup('person-2', 'campus-guid');

    expect(mockFetchRockData).toHaveBeenNthCalledWith(1, {
      endpoint: 'Campuses',
      queryParams: {
        $filter: "Guid eq guid'campus-guid'",
        $select: 'Id',
      },
      ttl: 0,
    });
    expect(mockFetchRockData).toHaveBeenNthCalledWith(2, {
      endpoint: 'People',
      queryParams: {
        $filter: 'Id eq person-2',
        $select: 'PrimaryFamilyId',
      },
      ttl: 0,
    });
    expect(mockPatchRockData).toHaveBeenCalledWith({
      endpoint: 'Groups/34',
      body: { CampusId: 12 },
    });
  });

  it('fails before launching a workflow when the campus Guid is unknown', async () => {
    mockFetchRockData
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ primaryFamilyId: 34 });

    await expect(
      updateRockPersonCampusForSignup('person-2', 'missing-campus-guid'),
    ).rejects.toThrow('Campus not found in Rock');
    expect(mockPatchRockData).not.toHaveBeenCalled();
  });

  it('fails when the person has no primary family to update', async () => {
    mockFetchRockData
      .mockResolvedValueOnce({ id: 12 })
      .mockResolvedValueOnce([]);

    await expect(
      updateRockPersonCampusForSignup('person-2', 'campus-guid'),
    ).rejects.toThrow('Primary family not found in Rock');
    expect(mockPatchRockData).not.toHaveBeenCalled();
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

  // Verifies the body shape required by the Community Serving Opportunity
  // Sign Up workflow (id 1840): PascalCase attribute keys, campus Guid
  // (resolved from name), and the waiver attribute key (note trailing period).
  it('posts to workflowTypeId=1840 with the campus Guid (not name) when waiver is accepted', async () => {
    mockFetchRockData.mockResolvedValueOnce({ guid: CAMPUS_GUID });
    mockPostRockData.mockResolvedValue({});

    await launchCommunityServingSignupWorkflow(defaultWorkflowInput);

    expect(mockFetchRockData).toHaveBeenCalledOnce();
    const [fetchCall] = mockFetchRockData.mock.calls[0] as [
      { endpoint: string; queryParams: Record<string, string> },
    ];
    expect(fetchCall.endpoint).toBe('Campuses');
    expect(fetchCall.queryParams.$filter).toContain('Palm Beach Gardens');

    expect(mockPostRockData).toHaveBeenCalledOnce();
    const [postCall] = mockPostRockData.mock.calls[0] as [
      { endpoint: string; body: Record<string, string> },
    ];
    expect(postCall.endpoint).toContain('workflowTypeId=1840');
    expect(postCall.body).toEqual({
      Group: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      FirstName: 'Jane',
      LastName: 'Doe',
      Email: 'jane.doe@example.com',
      CellPhone: '5615550123',
      Birthdate: '1990-05-15',
      Campus: CAMPUS_GUID,
      'IacceptthetermsoftheChristFellowshipwaiver.': 'Yes',
    });
  });

  it('sends an empty waiver value when waiver is not accepted', async () => {
    mockFetchRockData.mockResolvedValueOnce({ guid: CAMPUS_GUID });
    mockPostRockData.mockResolvedValue({});

    await launchCommunityServingSignupWorkflow({
      ...defaultWorkflowInput,
      waiverAccepted: false,
    });

    const [postCall] = mockPostRockData.mock.calls[0] as [
      { endpoint: string; body: Record<string, string> },
    ];
    expect(postCall.body['IacceptthetermsoftheChristFellowshipwaiver.']).toBe(
      '',
    );
  });

  it('throws when Rock returns no campus for the given name', async () => {
    mockFetchRockData.mockResolvedValueOnce(null);

    await expect(
      launchCommunityServingSignupWorkflow({
        ...defaultWorkflowInput,
        campus: 'Unknown Campus',
      }),
    ).rejects.toThrow('Campus not found in Rock: "Unknown Campus"');
  });
});
