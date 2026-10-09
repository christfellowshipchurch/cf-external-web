import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postRockData } from '~/lib/.server/fetch-rock-data';
import { action } from '../action';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  postRockData: vi.fn(),
}));

const mockPostRockData = vi.mocked(postRockData);

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
    mockPostRockData.mockReset();
    mockPostRockData.mockResolvedValue({});
  });

  it('includes Group in the Rock workflow payload when provided', async () => {
    const response = (await action({
      request: createRequest('group-guid-123'),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(mockPostRockData).toHaveBeenCalledWith({
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=1568&workflowName=Dream%20Team%20Kickoff%20Sign%20Up',
      body: expect.objectContaining({
        Group: 'group-guid-123',
        LaunchSource: 'app',
      }),
    });
  });

  it('keeps standalone submissions valid without Group', async () => {
    const response = (await action({
      request: createRequest(),
    } as ActionFunctionArgs)) as Response;

    expect(response.status).toBe(200);
    expect(mockPostRockData).toHaveBeenCalledWith({
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=1568&workflowName=Dream%20Team%20Kickoff%20Sign%20Up',
      body: expect.not.objectContaining({
        Group: expect.any(String),
      }),
    });
  });
});
