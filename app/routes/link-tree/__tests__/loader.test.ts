import { describe, expect, it, vi } from 'vitest';
import type { LoaderFunctionArgs } from 'react-router';

vi.mock('~/lib/.server/fetch-rock-data', () => ({
  fetchRockData: vi.fn(),
}));

vi.mock('../../page-builder/loader', () => ({
  fetchChildItems: vi.fn(),
  mapPageBuilderChildItems: vi.fn(),
}));

import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import {
  fetchChildItems,
  mapPageBuilderChildItems,
} from '../../page-builder/loader';
import { loader } from '../loader';

const section = (id: string, type: string, items: number) => ({
  id,
  type,
  name: `Section ${id}`,
  titleOverride: '',
  content: '',
  collection: Array.from({ length: items }, (_, i) => ({ id: `${id}-${i}` })),
});

describe('link tree loader', () => {
  it('leaves out resource collections with no items left', async () => {
    vi.mocked(fetchRockData).mockResolvedValueOnce({
      id: '1',
      title: 'Link Tree',
      content: '',
      attributeValues: {},
    });
    vi.mocked(fetchChildItems).mockResolvedValueOnce([]);
    vi.mocked(mapPageBuilderChildItems).mockResolvedValueOnce([
      section('live', 'RESOURCE_COLLECTION', 2),
      section('emptied', 'RESOURCE_COLLECTION', 0),
      section('events', 'EVENT_COLLECTION', 1),
    ] as never);

    const data = await loader({
      url: new URL('https://example.test/link-tree/test'),
    } as unknown as LoaderFunctionArgs);

    expect(
      (
        data as { resourceCollections: { id: string }[] }
      ).resourceCollections.map((c) => c.id),
    ).toEqual(['live']);
  });
});
