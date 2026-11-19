import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { launchRockWorkflow } from '~/lib/.server/rock-workflow';
import { action } from './action';

vi.mock('~/lib/.server/rock-workflow', () => ({
  launchRockWorkflow: vi.fn(),
}));

const createRequest = (includeFollowUp = false) => {
  const formData = new FormData();
  formData.set('FirstName', 'Test');
  formData.set('LastName', 'Person');
  formData.set('Email', 'test@example.com');
  formData.set('MobilePhone', '5555555555');
  formData.set('Campus', 'campus-guid-123');
  formData.set('Request', 'Please pray for us');
  if (includeFollowUp) {
    formData.set('FollowUp', '1');
  }

  return new Request('http://localhost/prayer-request', {
    method: 'POST',
    body: formData,
  });
};

describe('prayer request action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(launchRockWorkflow).mockResolvedValue(undefined);
  });

  it('launches the prayer request workflow', async () => {
    await action({ request: createRequest() } as ActionFunctionArgs);

    expect(launchRockWorkflow).toHaveBeenCalledWith({
      workflowTypeId: '348',
      workflowName: 'CFDP App Prayer Request',
      body: {
        FirstName: 'Test',
        LastName: 'Person',
        Email: 'test@example.com',
        MobilePhone: '5555555555',
        Campus: 'campus-guid-123',
        Request: 'Please pray for us',
        LaunchSource: 'app',
        SendingFormName: 'CFDP App Prayer Request',
      },
    });
  });

  it('includes FollowUp when provided', async () => {
    await action({
      request: createRequest(true),
    } as ActionFunctionArgs);

    expect(launchRockWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ FollowUp: '1' }),
      }),
    );
  });

  it('omits FollowUp when not provided', async () => {
    await action({ request: createRequest() } as ActionFunctionArgs);

    expect(
      vi.mocked(launchRockWorkflow).mock.calls[0][0].body,
    ).not.toHaveProperty('FollowUp');
  });

  it('returns 400 when the workflow launch fails', async () => {
    vi.mocked(launchRockWorkflow).mockRejectedValue(
      new Error('Rock v2 failed'),
    );

    const response = await action({
      request: createRequest(),
    } as ActionFunctionArgs);

    expect(response).toMatchObject({
      data: { error: 'Rock v2 failed' },
      init: { status: 400 },
    });
  });
});
