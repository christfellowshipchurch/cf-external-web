import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { suppressBlankNavbarSearches } from '../navbar-search-client';
import {
  NAVBAR_SEARCH_DEBOUNCE_MS,
  useDebouncedNavbarSearch,
} from '../use-debounced-navbar-search';

describe('navbar Algolia request count', () => {
  it('does not send blank initial searches to Algolia', async () => {
    const search = vi.fn();
    const client = suppressBlankNavbarSearches({ search } as never);

    await (
      client as unknown as { search: (request: unknown) => Promise<unknown> }
    ).search([
      { indexName: 'content', params: { query: '', hitsPerPage: 10 } },
    ]);

    expect(search).not.toHaveBeenCalled();
  });

  it('forwards one nonblank search', async () => {
    const search = vi.fn().mockResolvedValue({ results: [] });
    const client = suppressBlankNavbarSearches({ search } as never);
    const request = [{ indexName: 'content', params: { query: 'leadership' } }];

    await (
      client as unknown as { search: (request: unknown) => Promise<unknown> }
    ).search(request);

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(request);
  });

  it('collapses a typing burst into one search', () => {
    vi.useFakeTimers();
    const search = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedNavbarSearch());

    act(() => {
      result.current('l', search);
      result.current('le', search);
      result.current('leadership', search);
      vi.advanceTimersByTime(NAVBAR_SEARCH_DEBOUNCE_MS);
    });

    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('leadership');
    unmount();
    vi.useRealTimers();
  });
});
