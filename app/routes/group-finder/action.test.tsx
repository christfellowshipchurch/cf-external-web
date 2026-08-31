import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findOrCreateRockPersonForSignup,
  launchGroupClassSignupWorkflow,
} from '~/lib/.server/rock-signup';
import { action } from './action';

vi.mock('~/lib/.server/rock-signup', () => ({
  findOrCreateRockPersonForSignup: vi.fn(),
  launchGroupClassSignupWorkflow: vi.fn(),
}));

const mockFindOrCreateRockPersonForSignup = vi.mocked(
  findOrCreateRockPersonForSignup,
);
const mockLaunchGroupClassSignupWorkflow = vi.mocked(
  launchGroupClassSignupWorkflow,
);

const createRequest = (campus = 'campus-guid-1') => {
  const formData = new FormData();
  formData.set('firstName', 'Jane');
  formData.set('lastName', 'Doe');
  formData.set('phoneNumber', '5615550123');
  formData.set('email', 'jane@example.com');
  formData.set('groupId', 'group-1');
  if (campus) formData.set('campus', campus);

  return new Request('http://localhost/group-finder', {
    method: 'POST',
    body: formData,
  });
};

describe('group finder action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOrCreateRockPersonForSignup.mockResolvedValue('person-1');
    mockLaunchGroupClassSignupWorkflow.mockResolvedValue(undefined);
  });

  it('rejects signup without campus because group follow-up needs campus context', async () => {
    const response = (await action({
      request: createRequest(''),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing required fields' });
    expect(mockFindOrCreateRockPersonForSignup).not.toHaveBeenCalled();
    expect(mockLaunchGroupClassSignupWorkflow).not.toHaveBeenCalled();
  });

  it('continues signup when required campus is present', async () => {
    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockFindOrCreateRockPersonForSignup).toHaveBeenCalledOnce();
    expect(mockLaunchGroupClassSignupWorkflow).toHaveBeenCalledWith(
      'group-1',
      'person-1',
    );
  });
});
