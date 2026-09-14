import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findOrCreateRockPersonForSignup,
  launchClassSignupWorkflow,
  launchGroupSignupWorkflow,
  resolveGroupClassSignupTarget,
  updateRockPersonCampusForSignup,
} from '~/lib/.server/rock-signup';
import { action } from './action';

vi.mock('~/lib/.server/rock-signup', () => ({
  findOrCreateRockPersonForSignup: vi.fn(),
  launchClassSignupWorkflow: vi.fn(),
  launchGroupSignupWorkflow: vi.fn(),
  resolveGroupClassSignupTarget: vi.fn(),
  updateRockPersonCampusForSignup: vi.fn(),
}));

const mockFindOrCreateRockPersonForSignup = vi.mocked(
  findOrCreateRockPersonForSignup,
);
const mockLaunchClassSignupWorkflow = vi.mocked(launchClassSignupWorkflow);
const mockLaunchGroupSignupWorkflow = vi.mocked(launchGroupSignupWorkflow);
const mockResolveGroupClassSignupTarget = vi.mocked(
  resolveGroupClassSignupTarget,
);
const mockUpdateRockPersonCampusForSignup = vi.mocked(
  updateRockPersonCampusForSignup,
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
    mockResolveGroupClassSignupTarget.mockResolvedValue('group');
    mockFindOrCreateRockPersonForSignup.mockResolvedValue('person-1');
    mockUpdateRockPersonCampusForSignup.mockResolvedValue(undefined);
    mockLaunchClassSignupWorkflow.mockResolvedValue(undefined);
    mockLaunchGroupSignupWorkflow.mockResolvedValue(undefined);
  });

  it('rejects signup without campus because group follow-up needs campus context', async () => {
    const response = (await action({
      request: createRequest(''),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing required fields' });
    expect(mockFindOrCreateRockPersonForSignup).not.toHaveBeenCalled();
    expect(mockLaunchGroupSignupWorkflow).not.toHaveBeenCalled();
  });

  it('continues signup when required campus is present', async () => {
    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(mockFindOrCreateRockPersonForSignup).toHaveBeenCalledOnce();
    expect(mockUpdateRockPersonCampusForSignup).toHaveBeenCalledWith(
      'person-1',
      'campus-guid-1',
    );
    expect(mockResolveGroupClassSignupTarget).toHaveBeenCalledWith('group-1');
    expect(mockLaunchGroupSignupWorkflow).toHaveBeenCalledWith(
      'group-1',
      'person-1',
    );
    expect(mockLaunchClassSignupWorkflow).not.toHaveBeenCalled();
  });

  it('keeps class signups on workflow 654', async () => {
    mockResolveGroupClassSignupTarget.mockResolvedValue('class');

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(mockLaunchClassSignupWorkflow).toHaveBeenCalledWith(
      'group-1',
      'person-1',
    );
    expect(mockLaunchGroupSignupWorkflow).not.toHaveBeenCalled();
  });

  it('rejects an invalid target before changing the person or campus', async () => {
    mockResolveGroupClassSignupTarget.mockRejectedValue(
      new Error('Invalid signup group'),
    );

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid signup group' });
    expect(mockFindOrCreateRockPersonForSignup).not.toHaveBeenCalled();
    expect(mockUpdateRockPersonCampusForSignup).not.toHaveBeenCalled();
    expect(mockLaunchGroupSignupWorkflow).not.toHaveBeenCalled();
    expect(mockLaunchClassSignupWorkflow).not.toHaveBeenCalled();
  });

  it('does not launch the workflow when the campus update fails', async () => {
    mockUpdateRockPersonCampusForSignup.mockRejectedValue(
      new Error('Campus not found in Rock'),
    );

    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Campus not found in Rock',
    });
    expect(mockLaunchGroupSignupWorkflow).not.toHaveBeenCalled();
    expect(mockLaunchClassSignupWorkflow).not.toHaveBeenCalled();
  });
});
