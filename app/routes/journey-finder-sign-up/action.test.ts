import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postRockWorkflowLaunchWithApiInitiator } from '~/lib/.server/rock-workflow';
import { action } from './action';

vi.mock('~/lib/.server/rock-workflow', () => ({
  postRockWorkflowLaunchWithApiInitiator: vi.fn(),
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
    vi.mocked(postRockWorkflowLaunchWithApiInitiator).mockResolvedValue(
      undefined,
    );
  });

  it('posts English submissions to workflow ID 1833 by default', async () => {
    await action({ request: createRequest() } as ActionFunctionArgs);

    expect(postRockWorkflowLaunchWithApiInitiator).toHaveBeenCalledWith({
      workflowTypeId: '1833',
      workflowName: 'Journey Finder Sign Up',
      body: expect.objectContaining({
        Group: 'group-guid-123',
        LaunchSource: 'app',
        Reason: '3',
      }),
      instanceName: 'Test Person',
    });
  });

  it('posts Spanish submissions to workflow ID 1835', async () => {
    await action({
      request: createRequest('Spanish'),
    } as ActionFunctionArgs);

    expect(postRockWorkflowLaunchWithApiInitiator).toHaveBeenCalledWith({
      workflowTypeId: '1835',
      workflowName: 'Journey Finder Sign Up',
      body: expect.objectContaining({
        Group: 'group-guid-123',
        LaunchSource: 'app',
        Reason: '3',
      }),
      instanceName: 'Test Person',
    });
  });
});
