import { describe, expect, it, vi } from 'vitest';

import { createVolunteerAlgoliaInstantSearchRouter } from '../volunteer-algolia-instantsearch-router';

function createRefs(pathname: string, search: string) {
  const searchParamsRef = {
    current: new URLSearchParams(search),
  };
  const setSearchParams = vi.fn((params: URLSearchParams) => {
    searchParamsRef.current = params;
  });
  const setSearchParamsRef = { current: setSearchParams };
  const pathnameRef = { current: pathname };
  const onUpdateCallbackRef = { current: null };

  return {
    searchParamsRef,
    setSearchParamsRef,
    pathnameRef,
    onUpdateCallbackRef,
    setSearchParams,
  };
}

describe('createVolunteerAlgoliaInstantSearchRouter', () => {
  it('skips the first write that would clear landing filter params', () => {
    const refs = createRefs(
      '/volunteer/community-opportunities',
      'category=Support+Teams&campusList=Boynton+Beach',
    );
    window.history.pushState(
      {},
      '',
      '/volunteer/community-opportunities?category=Support+Teams&campusList=Boynton+Beach',
    );

    const router = createVolunteerAlgoliaInstantSearchRouter(refs);

    router.write({});
    expect(refs.setSearchParams).not.toHaveBeenCalled();
    expect(refs.searchParamsRef.current.toString()).toBe(
      'category=Support+Teams&campusList=Boynton+Beach',
    );

    router.write({
      refinementList: { category: ['Outreach'] },
    });
    expect(refs.setSearchParams).toHaveBeenCalledTimes(1);
    expect(refs.setSearchParams.mock.calls[0]?.[0].toString()).toBe(
      'category=Outreach',
    );
  });

  it('ignores writes after navigating away from the router pathname', () => {
    const refs = createRefs('/volunteer', 'category=Outreach');
    window.history.pushState(
      {},
      '',
      '/volunteer/community-opportunities?category=Outreach',
    );

    const router = createVolunteerAlgoliaInstantSearchRouter(refs);
    // Consume the initial-write skip with a no-op equal write first.
    router.write({
      refinementList: { category: ['Outreach'] },
    });
    expect(refs.setSearchParams).not.toHaveBeenCalled();

    router.write({});
    expect(refs.setSearchParams).not.toHaveBeenCalled();
  });

  it('ignores writes after dispose', () => {
    const refs = createRefs('/volunteer', '');
    window.history.pushState({}, '', '/volunteer');

    const router = createVolunteerAlgoliaInstantSearchRouter(refs);
    router.write({});
    router.dispose();
    router.write({
      refinementList: { category: ['Outreach'] },
    });

    expect(refs.setSearchParams).not.toHaveBeenCalled();
  });
});
