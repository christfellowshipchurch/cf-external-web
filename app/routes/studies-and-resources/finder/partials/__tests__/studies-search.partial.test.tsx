import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { StudiesSearch } from '../studies-search.partial';

const mocks = vi.hoisted(() => ({
  responsiveConfigure: vi.fn(),
}));

vi.mock('algoliasearch/lite', () => ({
  liteClient: vi.fn(() => ({})),
}));

vi.mock('react-instantsearch', () => ({
  InstantSearch: ({ children }: { children: ReactNode }) => (
    <div data-testid='instant-search'>{children}</div>
  ),
  SearchBox: () => <input aria-label='Keyword' />,
  useHits: () => ({ items: [] }),
}));

vi.mock('~/components/finders/finder-algolia.utils', () => ({
  buildIndexInitialUiState: () => ({}),
}));

vi.mock('~/components/finders/finder-results-stats.component', () => ({
  FinderResultsStats: ({ hitCount }: { hitCount?: number }) => (
    <div data-testid='finder-results-stats'>{hitCount ?? 0}</div>
  ),
}));

vi.mock('~/components/finders/finder-sticky-bar.component', () => ({
  FinderStickyBar: ({ children }: { children: ReactNode }) => (
    <div data-testid='finder-sticky-bar'>{children}</div>
  ),
}));

vi.mock('~/components/finders/search-filters', () => ({
  SearchFilters: () => <div data-testid='search-filters' />,
}));

vi.mock('~/components/finders/search-filters/active-filter.component', () => ({
  ActiveFilters: () => <div data-testid='active-filters' />,
}));

vi.mock('~/hooks/use-algolia-url-sync', () => ({
  useAlgoliaUrlSync: () => ({
    debouncedUpdateUrl: vi.fn(),
    cancelDebounce: vi.fn(),
  }),
}));

vi.mock('~/hooks/use-scroll-to-search-results-on-load', () => ({
  useScrollToSearchResultsOnLoad: vi.fn(),
}));

vi.mock('~/primitives/icon', () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} aria-hidden />
  ),
}));

vi.mock('~/routes/group-finder/partials/group-search.partial', () => ({
  ResponsiveConfigure: (props: {
    coordinates: { lat: number | null; lng: number | null } | null;
    hitsPerPageOverride?: number;
  }) => {
    mocks.responsiveConfigure(props);

    return (
      <div
        data-testid='responsive-configure'
        data-hits-per-page-override={props.hitsPerPageOverride ?? ''}
      />
    );
  },
}));

vi.mock('../../components/popups/all-filters.component', () => ({
  AllStudiesFiltersPopup: () => <div data-testid='all-studies-filters-popup' />,
}));

vi.mock('../../components/studies-hit-component.component', () => ({
  StudyHitComponent: () => <div data-testid='study-hit' />,
}));

describe('StudiesSearch', () => {
  beforeEach(() => {
    mocks.responsiveConfigure.mockClear();
  });

  it('requests enough Algolia hits for local study grouping and pagination', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/studies-and-resources',
          element: <StudiesSearch />,
          loader: () => ({
            ALGOLIA_APP_ID: 'test-app-id',
            ALGOLIA_SEARCH_API_KEY: 'test-api-key',
          }),
        },
      ],
      {
        initialEntries: ['/studies-and-resources'],
      },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByTestId('responsive-configure')).toHaveAttribute(
      'data-hits-per-page-override',
      '1000',
    );
    expect(mocks.responsiveConfigure).toHaveBeenCalledWith(
      expect.objectContaining({
        hitsPerPageOverride: 1000,
      }),
    );
  });
});
