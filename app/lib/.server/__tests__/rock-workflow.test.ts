import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assignInitiatorWhenWorkflowAppears,
  assignRockWorkflowInitiator,
  buildRockWorkflowLaunchEndpoint,
  findLaunchedWorkflowId,
  getRockApiPersonAliasId,
  launchRockWorkflow,
  postRockWorkflowLaunchWithApiInitiator,
} from '../rock-workflow';
import { fetchRockData, patchRockData, postRockData } from '../fetch-rock-data';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-data', () => ({
  buildRockUrl: (endpoint: string) =>
    `https://rock.example.com/api/${endpoint}`,
  isPreviewMode: () => false,
  fetchRockData: vi.fn(),
  patchRockData: vi.fn(),
  postRockData: vi.fn(),
  TTL: { NONE: 0, DEFAULT: 3600, SHORT: 300, LONG: 86400 },
}));

describe('getRockApiPersonAliasId', () => {
  afterEach(() => {
    delete process.env.API_ALIAS_PERSON_ID;
  });

  it('returns 0 when env is unset', () => {
    expect(getRockApiPersonAliasId()).toBe('0');
  });

  it('returns trimmed numeric alias id when set', () => {
    process.env.API_ALIAS_PERSON_ID = '  99  ';
    expect(getRockApiPersonAliasId()).toBe('99');
  });

  it('falls back to 0 for invalid values', () => {
    process.env.API_ALIAS_PERSON_ID = 'not-a-number';
    expect(getRockApiPersonAliasId()).toBe('0');
  });
});

describe('buildRockWorkflowLaunchEndpoint', () => {
  afterEach(() => {
    delete process.env.API_ALIAS_PERSON_ID;
  });

  it('uses PersonAlias launch when API alias is configured', () => {
    process.env.API_ALIAS_PERSON_ID = '648297';

    expect(
      buildRockWorkflowLaunchEndpoint('1833', 'Journey Finder Sign Up'),
    ).toBe(
      'PersonAlias/LaunchWorkflow/648297?workflowTypeId=1833&workflowName=Journey%20Finder%20Sign%20Up',
    );
  });

  it('uses Workflows/LaunchWorkflow/0 when API alias is not configured', () => {
    expect(
      buildRockWorkflowLaunchEndpoint('1833', 'Journey Finder Sign Up'),
    ).toBe(
      'Workflows/LaunchWorkflow/0?workflowTypeId=1833&workflowName=Journey%20Finder%20Sign%20Up',
    );
  });
});

describe('assignRockWorkflowInitiator', () => {
  beforeEach(() => {
    vi.mocked(patchRockData).mockResolvedValue(204);
  });

  it('patches InitiatorPersonAliasId on the workflow', async () => {
    await assignRockWorkflowInitiator(42, '99');

    expect(patchRockData).toHaveBeenCalledWith({
      endpoint: 'Workflows/42',
      body: { InitiatorPersonAliasId: 99 },
    });
  });
});

describe('postRockWorkflowLaunchWithApiInitiator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.API_ALIAS_PERSON_ID;
    vi.mocked(postRockData).mockResolvedValue({});
    vi.mocked(patchRockData).mockResolvedValue(204);
  });

  it('launches without patching when API alias env is unset', async () => {
    vi.mocked(fetchRockData).mockResolvedValueOnce([{ Id: 1 }]);

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId: '1',
      workflowName: 'Test Workflow',
      body: { FirstName: 'A' },
    });

    expect(postRockData).toHaveBeenCalled();
    expect(patchRockData).not.toHaveBeenCalled();
  });

  it('returns after launch and patches initiator in the background', async () => {
    process.env.API_ALIAS_PERSON_ID = '648297';
    vi.mocked(fetchRockData)
      .mockResolvedValueOnce([{ Id: 5645000 }])
      .mockResolvedValue([{ Id: 5645999 }]);

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId: '1833',
      workflowName: 'Journey Finder Sign Up',
      body: { FirstName: 'Test' },
      instanceName: 'Test Person',
    });

    expect(postRockData).toHaveBeenCalledWith({
      endpoint:
        'PersonAlias/LaunchWorkflow/648297?workflowTypeId=1833&workflowName=Journey%20Finder%20Sign%20Up',
      body: { FirstName: 'Test' },
    });

    await vi.waitFor(() => {
      expect(patchRockData).toHaveBeenCalledWith({
        endpoint: 'Workflows/5645999',
        body: { InitiatorPersonAliasId: 648297 },
      });
    });
  });
});

describe('findLaunchedWorkflowId', () => {
  beforeEach(() => {
    vi.mocked(fetchRockData).mockReset();
  });

  it('returns null when no workflow is found', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);

    const id = await findLaunchedWorkflowId({
      workflowTypeId: '1833',
      workflowIdAfter: 5645000,
      maxAttempts: 1,
      delayMs: 0,
    });

    expect(id).toBeNull();
  });

  it('reads id from a single-object fetchRockData response', async () => {
    vi.mocked(fetchRockData).mockResolvedValue({ Id: 5645999 });

    const id = await findLaunchedWorkflowId({
      workflowTypeId: '1833',
      workflowIdAfter: 5645000,
      maxAttempts: 1,
      delayMs: 0,
    });

    expect(id).toBe(5645999);
  });
});

describe('assignInitiatorWhenWorkflowAppears', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patchRockData).mockResolvedValue(204);
    vi.mocked(fetchRockData).mockReset();
  });

  it('returns false when workflow is never found', async () => {
    vi.mocked(fetchRockData).mockResolvedValue([]);

    const ok = await assignInitiatorWhenWorkflowAppears({
      workflowTypeId: '1833',
      workflowIdAfter: 1,
      initiatorPersonAliasId: '99',
      maxAttempts: 1,
      delayMs: 0,
    });

    expect(ok).toBe(false);
    expect(patchRockData).not.toHaveBeenCalled();
  });
});

describe('launchRockWorkflow on Rock v2', () => {
  const SET_A_REMINDER_GUID = '498aeaba-a934-4e50-b8a6-77723d1ab4b5';

  const stubV2Launch = (response: Partial<Response> | Error) => {
    const fetchMock =
      response instanceof Error
        ? vi.fn().mockRejectedValue(response)
        : vi.fn().mockResolvedValue({ text: async () => '', ...response });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ROCK_V2_ENABLED', 'true');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(postRockData).mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('launches on v2 by the type Guid, with attribute values as v1 sends them', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });

    await launchRockWorkflow({
      workflowTypeId: '936',
      workflowName: 'Set a Reminder',
      body: {
        FirstName: 'Test',
        BeenToCF: false,
        CampusLocation: undefined,
        ServiceTime: null,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://rock.example.com/api/v2/models/workflows/actions/launch/${SET_A_REMINDER_GUID}`,
    );
    expect(JSON.parse(init.body)).toEqual({
      name: 'Set a Reminder',
      attributeValues: {
        FirstName: 'Test',
        BeenToCF: 'False',
        ServiceTime: '',
      },
    });
    expect(postRockData).not.toHaveBeenCalled();
  });

  it('launches on v1 when Rock refuses the v2 launch before running it', async () => {
    stubV2Launch({ ok: false, status: 401 });

    await launchRockWorkflow({
      workflowTypeId: '936',
      workflowName: 'Set a Reminder',
      body: { FirstName: 'Test' },
    });

    expect(postRockData).toHaveBeenCalledWith({
      endpoint:
        'Workflows/LaunchWorkflow/0?workflowTypeId=936&workflowName=Set%20a%20Reminder',
      body: { FirstName: 'Test' },
    });
  });

  // A 400, a 500 or a dropped connection may come after Rock saved the workflow.
  it.each([
    ['a bad request', { ok: false, status: 400 }],
    ['a server error', { ok: false, status: 500 }],
    ['a network error', new TypeError('fetch failed')],
  ])('throws on %s without launching on v1', async (_, response) => {
    stubV2Launch(response as Partial<Response> | Error);

    await expect(
      launchRockWorkflow({
        workflowTypeId: '936',
        workflowName: 'Set a Reminder',
        body: { FirstName: 'Test' },
      }),
    ).rejects.toThrow();
    expect(postRockData).not.toHaveBeenCalled();
  });

  it('launches on v1, with a warning, when the type has no Guid', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await launchRockWorkflow({
      workflowTypeId: '99999',
      workflowName: 'Unmapped',
      body: {},
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(postRockData).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('99999'));
  });

  it('launches on v1, with a warning, when a value isn’t text', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const body = { FirstName: 'Test', Interests: ['a', 'b'] };

    await launchRockWorkflow({
      workflowTypeId: '936',
      workflowName: 'Set a Reminder',
      body,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(postRockData).toHaveBeenCalledWith(
      expect.objectContaining({ body }),
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Interests'));
  });

  it('gives the v2 launch a timeout', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });

    await launchRockWorkflow({
      workflowTypeId: '936',
      workflowName: 'Set a Reminder',
      body: {},
    });

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(
      globalThis.AbortSignal,
    );
  });

  it('treats a launch Rock accepted as done, whatever the response body', async () => {
    stubV2Launch({ ok: true, status: 200, text: async () => '<html>' });

    await expect(
      launchRockWorkflow({
        workflowTypeId: '936',
        workflowName: 'Set a Reminder',
        body: {},
      }),
    ).resolves.toBeUndefined();
    expect(postRockData).not.toHaveBeenCalled();
  });

  it('skips the v1 initiator lookup and patch after a v2 launch', async () => {
    vi.stubEnv('API_ALIAS_PERSON_ID', '648297');
    stubV2Launch({ ok: true, status: 204 });

    await postRockWorkflowLaunchWithApiInitiator({
      workflowTypeId: '1833',
      workflowName: 'Journey Finder Sign Up',
      body: { FirstName: 'Test' },
      instanceName: 'Test Person',
    });

    expect(fetchRockData).not.toHaveBeenCalled();
    expect(postRockData).not.toHaveBeenCalled();
    expect(patchRockData).not.toHaveBeenCalled();
  });
});
