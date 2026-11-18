import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { launchRockWorkflow } from '~/lib/.server/rock-workflow';
import { action } from '../action';

vi.mock('~/lib/.server/rock-workflow', () => ({
  launchRockWorkflow: vi.fn(),
}));

const mockLaunchRockWorkflow = vi.mocked(launchRockWorkflow);

const createRequest = (group?: string) => {
  const formData = new FormData();
  formData.set('FirstName', 'Test');
  formData.set('LastName', 'Person');
  formData.set('PhoneNumber', '5555555555');
  formData.set('EmailAddress', 'test@example.com');
  formData.set('Campus', 'campus-guid-123');
  formData.set('Birthdate', '1990-01-01');
  formData.set('CompletedJourney', '1');
  formData.set('FilledOutApplication', '2');
  formData.set('ActiveOnDreamTeam', '1');

  const searchParams = group ? `?Group=${encodeURIComponent(group)}` : '';

  return new Request(`http://localhost/dream-team-kickoff${searchParams}`, {
    method: 'POST',
    body: formData,
  });
};

describe('dream team kickoff action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLaunchRockWorkflow.mockResolvedValue(undefined);
  });

  it('includes Group in the Rock workflow payload when provided', async () => {
    const response = (await action({
      request: createRequest('group-guid-123'),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(mockLaunchRockWorkflow).toHaveBeenCalledWith({
      workflowTypeId: '1568',
      workflowName: 'Dream Team Kickoff Sign Up',
      body: expect.objectContaining({
        Group: 'group-guid-123',
        LaunchSource: 'app',
        CompletedJourney: '1',
        FilledOutApplication: '2',
        ActiveOnDreamTeam: '1',
      }),
    });
  });

  it('keeps standalone submissions valid without Group', async () => {
    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(mockLaunchRockWorkflow).toHaveBeenCalledWith({
      workflowTypeId: '1568',
      workflowName: 'Dream Team Kickoff Sign Up',
      body: expect.not.objectContaining({
        Group: expect.any(String),
      }),
    });
  });

  it('returns 400 when the workflow launch fails', async () => {
    mockLaunchRockWorkflow.mockRejectedValue(new Error('Rock v2 failed'));

    const response = await action({
      request: createRequest(),
    } as ActionFunctionArgs);

    expect(response).toMatchObject({
      data: { error: 'Rock v2 failed' },
      init: { status: 400 },
    });
  });
});
