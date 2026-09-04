import type { LoaderFunctionArgs } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/.server/error-types', () => ({
  AuthenticationError: class AuthenticationError extends Error {},
}));

vi.mock('~/lib/.server/algolia-indexes.server', () => ({
  getServerAlgoliaIndexes: () => ({
    groups: 'dev_webv3_groups',
    contentItems: 'dev_webv3_contentItems',
    classes: 'dev_webv3_classes',
    locations: 'dev_webv3_locations',
    missions: 'dev_webv3_missions',
    missionsPrivate: 'dev_webv3_missionsPrivate',
    studiesAndResources: 'dev_webv3_studiesAndResources',
    eventFinderItems: 'dev_webv3_eventFinderItems',
  }),
}));

vi.mock('../group-detail-rock.server', () => ({
  fetchGroupDetailFromRock: vi.fn(),
  isRockGroupGuid: (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value.trim(),
    ),
  normalizeGroupGuid: (value: string) => value.trim().toUpperCase(),
}));

import { fetchGroupDetailFromRock } from '../group-detail-rock.server';
import { loader } from '../loader';

const mockFetchGroup = fetchGroupDetailFromRock as ReturnType<typeof vi.fn>;

const GROUP_GUID = '3c69d26a-b472-4bdc-b7ee-400001ae2c97';

function makeArgs(path: string) {
  return {
    params: { path },
    request: new Request(`http://localhost/group-finder/${path}`),
    context: {},
  } as unknown as LoaderFunctionArgs;
}

async function loadJson(path: string) {
  const result = await loader(makeArgs(path));
  if (result instanceof Response) {
    return result.json();
  }
  return result;
}

describe('group-single loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALGOLIA_APP_ID = 'test-app-id';
    process.env.ALGOLIA_SEARCH_API_KEY = 'test-search-key';
  });

  it('loads a Private group by guid without going through Algolia', async () => {
    mockFetchGroup.mockResolvedValue({
      isPublic: false,
      group: { title: 'Private Group', groupGuid: GROUP_GUID.toUpperCase() },
    });

    const data = await loadJson(GROUP_GUID);

    expect(mockFetchGroup).toHaveBeenCalledWith(GROUP_GUID.toUpperCase());
    expect(data.group.title).toBe('Private Group');
    expect(data.isPublic).toBe(false);
    expect(data.groupGuid).toBe(GROUP_GUID.toUpperCase());
  });

  it('returns Group Not Found data for a non-guid path instead of querying Rock', async () => {
    const data = await loadJson('not-a-group');

    expect(mockFetchGroup).not.toHaveBeenCalled();
    expect(data.group).toBeNull();
  });
});
