import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockV2 } from '~/lib/.server/fetch-rock-v2';
import { fetchGroupMembers } from '~/lib/.server/rock-people-groups';
import {
  addRockGroupMember,
  findOrCreateRockPersonForSignup,
} from '~/lib/.server/rock-signup';
import { action } from './action';

// Only the Rock call is mocked, so fetchCampuses still guards the campus guid.
vi.mock('~/lib/.server/fetch-rock-v2', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/.server/fetch-rock-v2')>()),
  fetchRockV2: vi.fn(),
}));

vi.mock('~/lib/.server/rock-people-groups', () => ({
  fetchGroupMembers: vi.fn(),
}));

vi.mock('~/lib/.server/rock-signup', () => ({
  addRockGroupMember: vi.fn(),
  findOrCreateRockPersonForSignup: vi.fn(),
}));

const mockFetchRockV2 = vi.mocked(fetchRockV2);
const mockFetchGroupMembers = vi.mocked(fetchGroupMembers);
const mockAddRockGroupMember = vi.mocked(addRockGroupMember);
const mockFindOrCreateRockPersonForSignup = vi.mocked(
  findOrCreateRockPersonForSignup,
);

const createRequest = ({
  firstName = 'Test',
  lastName = 'Person',
  email = 'test@example.com',
  phone = '5555555555',
  campus = '0f3a9c2e-1b4d-4e5f-8a6b-7c8d9e0f1a2b',
}: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  campus?: string;
} = {}) => {
  const formData = new FormData();
  if (firstName) formData.set('FirstName', firstName);
  if (lastName) formData.set('LastName', lastName);
  if (email) formData.set('EmailAddress', email);
  if (phone) formData.set('PhoneNumber', phone);
  if (campus) formData.set('Campus', campus);

  return new Request('http://localhost/group-finder-notify', {
    method: 'POST',
    body: formData,
  });
};

describe('group finder notify action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRockV2.mockResolvedValue([{ id: 10 }]);
    mockFetchGroupMembers.mockResolvedValue([]);
    mockFindOrCreateRockPersonForSignup.mockResolvedValue('123');
    mockAddRockGroupMember.mockResolvedValue({ id: 1 });
  });

  it('rejects missing required fields', async () => {
    const response = (await action({
      request: createRequest({ firstName: '' }),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Please fill in all required fields.',
    });
    expect(mockFindOrCreateRockPersonForSignup).not.toHaveBeenCalled();
    expect(mockAddRockGroupMember).not.toHaveBeenCalled();
  });

  it('rejects invalid campus guids', async () => {
    mockFetchRockV2.mockResolvedValue([]);

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Please select a valid campus.',
    });
    expect(mockAddRockGroupMember).not.toHaveBeenCalled();
  });

  it('never sends a malformed campus guid to Rock', async () => {
    const response = (await action({
      request: createRequest({ campus: "x' or 1 eq 1" }),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(mockFetchRockV2).not.toHaveBeenCalled();
  });

  it('rejects unmapped campus ids', async () => {
    mockFetchRockV2.mockResolvedValue([{ id: 999 }]);

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'This campus is not available for group notifications.',
    });
    expect(mockAddRockGroupMember).not.toHaveBeenCalled();
  });

  it('finds or creates the submitted person', async () => {
    await action({ request: createRequest() } as ActionFunctionArgs);

    expect(mockFindOrCreateRockPersonForSignup).toHaveBeenCalledWith({
      firstName: 'Test',
      lastName: 'Person',
      email: 'test@example.com',
      phoneNumber: '5555555555',
    });
  });

  it('does not create a duplicate group member', async () => {
    mockFetchGroupMembers.mockResolvedValue({ id: 222 });

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockAddRockGroupMember).not.toHaveBeenCalled();
  });

  it('creates a group member for the selected campus group', async () => {
    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(mockFetchGroupMembers).toHaveBeenCalledWith({
      endpoint: 'GroupMembers',
      queryParams: {
        $filter: 'GroupId eq 1098441 and PersonId eq 123',
        $select: 'Id',
      },
      ttl: 0,
    });
    expect(mockAddRockGroupMember).toHaveBeenCalledWith({
      groupId: 1098441,
      personId: '123',
      groupRoleId: 359,
      groupMemberStatus: 1,
    });
    expect(await response.json()).toEqual({ success: true });
  });

  it('returns 400 when adding the group member fails', async () => {
    mockAddRockGroupMember.mockRejectedValue(new Error('Rock v2 failed'));

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Rock v2 failed' });
  });
});
