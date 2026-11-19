import type { ActionFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { launchRockWorkflow } from '~/lib/.server/rock-workflow';
import { action } from '~/routes/api.help-me-find-a-group';

vi.mock('~/lib/.server/rock-workflow', () => ({
  launchRockWorkflow: vi.fn(),
}));

const createValidRequest = (overrides?: {
  includeComments?: boolean;
  hubs?: string[];
  omitField?: string;
}) => {
  const formData = new FormData();
  const fields: Record<string, string> = {
    FirstName: 'Test',
    LastName: 'Person',
    EmailAddress: 'test@example.com',
    PhoneNumber: '5555555555',
    Campus: 'campus-guid-123',
    Type: 'In Person',
  };

  for (const [key, value] of Object.entries(fields)) {
    if (overrides?.omitField !== key) {
      formData.set(key, value);
    }
  }

  const hubs = overrides?.hubs ?? ['hub-guid-1', 'hub-guid-2'];
  for (const hub of hubs) {
    formData.append('Hub', hub);
  }

  if (overrides?.includeComments) {
    formData.set('Comments', 'Looking for a small group');
  }

  return new Request('http://localhost/api/help-me-find-a-group', {
    method: 'POST',
    body: formData,
  });
};

async function parseActionResult(result: unknown) {
  if (result instanceof Response) {
    return { status: result.status, data: await result.json() };
  }

  if (
    result &&
    typeof result === 'object' &&
    'type' in result &&
    result.type === 'DataWithResponseInit'
  ) {
    const typedResult = result as unknown as {
      data: { error?: string; success?: boolean };
      init?: { status?: number };
    };

    return {
      status: typedResult.init?.status,
      data: typedResult.data,
    };
  }

  throw new Error('Unexpected action result');
}

describe('help me find a group action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(launchRockWorkflow).mockResolvedValue(undefined);
  });

  it('rejects missing required fields', async () => {
    const result = await action({
      request: createValidRequest({ omitField: 'FirstName' }),
    } as ActionFunctionArgs);

    const { status, data: body } = await parseActionResult(result);

    expect(status).toBe(400);
    expect(body.error).toBe('Please fill in all required fields.');
    expect(launchRockWorkflow).not.toHaveBeenCalled();
  });

  it('rejects empty Hub selection', async () => {
    const result = await action({
      request: createValidRequest({ hubs: [] }),
    } as ActionFunctionArgs);

    const { status, data: body } = await parseActionResult(result);

    expect(status).toBe(400);
    expect(body.error).toBe('Please select at least one area.');
    expect(launchRockWorkflow).not.toHaveBeenCalled();
  });

  it('launches workflow type 419 with comma-separated Hub GUIDs', async () => {
    await action({
      request: createValidRequest(),
    } as ActionFunctionArgs);

    expect(launchRockWorkflow).toHaveBeenCalledWith({
      workflowTypeId: '419',
      workflowName: 'Help Me Find a Group',
      body: expect.objectContaining({
        Hub: 'hub-guid-1,hub-guid-2',
      }),
    });
  });

  it('includes LaunchSource and SendingFormName', async () => {
    await action({
      request: createValidRequest(),
    } as ActionFunctionArgs);

    expect(launchRockWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          LaunchSource: 'app',
          SendingFormName: 'CFDP App Help Me Find a Group',
        }),
      }),
    );
  });

  it('includes Comments when provided', async () => {
    await action({
      request: createValidRequest({ includeComments: true }),
    } as ActionFunctionArgs);

    expect(launchRockWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          Comments: 'Looking for a small group',
        }),
      }),
    );
  });

  it('omits Comments when empty', async () => {
    await action({
      request: createValidRequest(),
    } as ActionFunctionArgs);

    const call = vi.mocked(launchRockWorkflow).mock.calls[0][0];
    expect(call.body).not.toHaveProperty('Comments');
  });

  it('returns success on Rock success', async () => {
    const result = await action({
      request: createValidRequest(),
    } as ActionFunctionArgs);

    const { status, data: body } = await parseActionResult(result);

    expect(status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it('returns 400 when the workflow launch fails', async () => {
    vi.mocked(launchRockWorkflow).mockRejectedValue(
      new Error('Rock v2 failed'),
    );

    const result = await action({
      request: createValidRequest(),
    } as ActionFunctionArgs);

    const { status, data: body } = await parseActionResult(result);

    expect(status).toBe(400);
    expect(body.error).toBe('Rock v2 failed');
  });
});
