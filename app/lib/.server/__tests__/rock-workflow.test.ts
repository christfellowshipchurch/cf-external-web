import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { launchRockWorkflow } from '../rock-workflow';
import { RockAPIError } from '../error-types';

vi.mock('../redis-config', () => ({ default: null }));
vi.mock('../fetch-rock-data', () => ({
  buildRockUrl: (endpoint: string) =>
    `https://rock.example.com/api/${endpoint}`,
  isPreviewMode: () => false,
  TTL: { NONE: 0, DEFAULT: 3600, SHORT: 300, LONG: 86400 },
}));

const SET_A_REMINDER_GUID = '498aeaba-a934-4e50-b8a6-77723d1ab4b5';
const LAUNCH_URL = (guid: string) =>
  `https://rock.example.com/api/v2/models/workflows/actions/launch/${guid}`;

const stubV2Launch = (response: Partial<Response> | Error) => {
  const fetchMock =
    response instanceof Error
      ? vi.fn().mockRejectedValue(response)
      : vi.fn().mockResolvedValue({ text: async () => '', ...response });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const launchReminder = (body: Record<string, unknown> = {}) =>
  launchRockWorkflow({
    workflowTypeId: '936',
    workflowName: 'Set a Reminder',
    body,
  });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('launchRockWorkflow', () => {
  it('posts the type Guid with values as text: booleans True/False, null as "", undefined left out', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });

    await launchReminder({
      FirstName: 'Test',
      BeenToCF: false,
      IsMember: true,
      CampusLocation: undefined,
      ServiceTime: null,
      GroupId: 42,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(LAUNCH_URL(SET_A_REMINDER_GUID));
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      name: 'Set a Reminder',
      attributeValues: {
        FirstName: 'Test',
        BeenToCF: 'False',
        IsMember: 'True',
        ServiceTime: '',
        GroupId: '42',
      },
    });
  });

  // Each form launches its own type; a wrong Guid would start the wrong workflow.
  it.each([
    ['654', '4df7b9ea-10a4-4987-bf47-dfe9d3adb5c1'],
    ['1840', '17f2ddea-bb94-4a28-8e86-f2358bc41524'],
    ['1941', '29543c34-293b-4725-92d5-e0a7d1254315'],
  ])('launches type %s by Guid %s', async (workflowTypeId, guid) => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });

    await launchRockWorkflow({ workflowTypeId, workflowName: 'W', body: {} });

    expect(fetchMock.mock.calls[0][0]).toBe(LAUNCH_URL(guid));
  });

  // Any failure may come after Rock saved the workflow, so it is never retried.
  it.each([
    ['a 400', { ok: false, status: 400 }],
    ['a 401', { ok: false, status: 401 }],
    ['a 403', { ok: false, status: 403 }],
    ['a 404', { ok: false, status: 404 }],
    ['a 500', { ok: false, status: 500 }],
  ])(
    'throws a RockAPIError on %s and launches only once',
    async (_, response) => {
      const fetchMock = stubV2Launch(response);

      const error = await launchReminder({ FirstName: 'Test' }).catch(
        (e: unknown) => e,
      );

      expect(error).toBeInstanceOf(RockAPIError);
      expect((error as RockAPIError).statusCode).toBe(response.status);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['a network error', new TypeError('fetch failed')],
    [
      'a timeout',
      Object.assign(new Error('timed out'), { name: 'TimeoutError' }),
    ],
  ])('throws on %s and launches only once', async (_, error) => {
    const fetchMock = stubV2Launch(error);

    await expect(launchReminder()).rejects.toBe(error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives the launch a timeout', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });

    await launchReminder();

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(
      globalThis.AbortSignal,
    );
  });

  it('throws before calling Rock when the type has no Guid', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });

    await expect(
      launchRockWorkflow({
        workflowTypeId: '99999',
        workflowName: 'Unmapped',
        body: {},
      }),
    ).rejects.toThrow('99999');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws before calling Rock when a value isn’t text', async () => {
    const fetchMock = stubV2Launch({ ok: true, status: 204 });

    await expect(
      launchReminder({ FirstName: 'Test', Interests: ['a', 'b'] }),
    ).rejects.toThrow('Interests');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a launch Rock accepted as done, whatever the response body', async () => {
    stubV2Launch({ ok: true, status: 200, text: async () => '<html>' });

    await expect(launchReminder()).resolves.toBeUndefined();
  });
});
