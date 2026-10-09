import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRockData, postRockData } from '~/lib/.server/fetch-rock-data';
import { findOrCreateRockPersonForSignup } from '~/lib/.server/rock-signup';
import { action } from './action';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0 },
}));

vi.mock('~/lib/.server/rock-signup', () => ({
  findOrCreateRockPersonForSignup: vi.fn(),
}));

vi.mock('~/lib/.server/rock-utils', () => ({
  escapeOData: vi.fn((value: string) => value),
}));

const mockFetchRockData = vi.mocked(fetchRockData);
const mockPostRockData = vi.mocked(postRockData);
const mockFindOrCreateRockPersonForSignup = vi.mocked(
  findOrCreateRockPersonForSignup,
);

const createRequest = ({
  firstName = 'Test',
  lastName = 'Person',
  email = 'test@example.com',
  phone = '5555555555',
  campus = 'campus-guid-10',
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
    mockFetchRockData.mockReset();
    mockPostRockData.mockReset();
    mockFindOrCreateRockPersonForSignup.mockReset();
    mockFetchRockData
      .mockResolvedValueOnce({ id: 10 })
      .mockResolvedValueOnce([]);
    mockFindOrCreateRockPersonForSignup.mockResolvedValue('123');
    mockPostRockData.mockResolvedValue({});
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
    expect(mockPostRockData).not.toHaveBeenCalled();
  });

  it('rejects invalid campus guids', async () => {
    mockFetchRockData.mockReset();
    mockFetchRockData.mockResolvedValueOnce([]);

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Please select a valid campus.',
    });
    expect(mockPostRockData).not.toHaveBeenCalled();
  });

  it('rejects unmapped campus ids', async () => {
    mockFetchRockData.mockReset();
    mockFetchRockData.mockResolvedValueOnce({ id: 999 });

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'This campus is not available for group notifications.',
    });
    expect(mockPostRockData).not.toHaveBeenCalled();
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
    mockFetchRockData.mockReset();
    mockFetchRockData
      .mockResolvedValueOnce({ id: 10 })
      .mockResolvedValueOnce({ id: 222 });

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockPostRockData).not.toHaveBeenCalled();
  });

  it('creates a group member for the selected campus group', async () => {
    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(mockFetchRockData).toHaveBeenNthCalledWith(1, {
      endpoint: 'Campuses',
      queryParams: {
        $filter: "Guid eq guid'campus-guid-10'",
        $select: 'Id',
      },
      ttl: 0,
    });
    expect(mockFetchRockData).toHaveBeenNthCalledWith(2, {
      endpoint: 'GroupMembers',
      queryParams: {
        $filter: 'GroupId eq 1098441 and PersonId eq 123',
        $select: 'Id',
      },
      ttl: 0,
    });
    expect(mockPostRockData).toHaveBeenCalledWith({
      endpoint: 'GroupMembers',
      body: {
        GroupId: 1098441,
        PersonId: '123',
        GroupRoleId: 359,
        GroupMemberStatus: 1,
        IsArchived: false,
      },
    });
    expect(await response.json()).toEqual({ success: true });
  });
});
