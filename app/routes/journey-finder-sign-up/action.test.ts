import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { launchRockWorkflow } from '~/lib/.server/rock-workflow';
import { action } from './action';

vi.mock('~/lib/.server/rock-workflow', () => ({
  launchRockWorkflow: vi.fn(),
}));

const createRequest = (language?: 'English' | 'Spanish') => {
  const formData = new FormData();
  formData.set('firstName', 'Test');
  formData.set('lastName', 'Person');
  formData.set('phone', '5555555555');
  formData.set('email', 'test@example.com');
  formData.set('atCF', '1');
  formData.set('reason', '3');

  const searchParams = new URLSearchParams({ Group: 'group-guid-123' });
  if (language) {
    searchParams.set('Language', language);
  }

  return new Request(
    `http://localhost/journey-finder-sign-up?${searchParams.toString()}`,
    {
      method: 'POST',
      body: formData,
    },
  );
};

describe('journey finder sign up action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(launchRockWorkflow).mockResolvedValue(undefined);
  });

  it('launches English submissions as workflow type 1833 by default', async () => {
    await action({ request: createRequest() } as ActionFunctionArgs);

    expect(launchRockWorkflow).toHaveBeenCalledWith({
      workflowTypeId: '1833',
      workflowName: 'Journey Finder Sign Up',
      body: expect.objectContaining({
        Group: 'group-guid-123',
        LaunchSource: 'app',
        Reason: '3',
      }),
    });
  });

  it('launches Spanish submissions as workflow type 1835', async () => {
    await action({
      request: createRequest('Spanish'),
    } as ActionFunctionArgs);

    expect(launchRockWorkflow).toHaveBeenCalledWith({
      workflowTypeId: '1835',
      workflowName: 'Journey Finder Sign Up',
      body: expect.objectContaining({
        Group: 'group-guid-123',
        LaunchSource: 'app',
        Reason: '3',
      }),
    });
  });

  it('does not launch the workflow without a Group', async () => {
    const request = new Request('http://localhost/journey-finder-sign-up', {
      method: 'POST',
      body: await createRequest().formData(),
    });

    const response = await action({ request } as ActionFunctionArgs);

    expect(response).toMatchObject({ init: { status: 400 } });
    expect(launchRockWorkflow).not.toHaveBeenCalled();
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
