import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-instantsearch', () => {
  const items: unknown[] = [];
  const indexUiState = {};

  return {
    useHits: () => ({ items }),
    useInstantSearch: () => ({ indexUiState }),
    useSearchBox: () => ({ query: '' }),
  };
});

vi.mock('react-router-dom', () => ({
  useRouteLoaderData: () => ({
    defaultSearchHits: [],
    locationSearchHits: [],
  }),
}));

vi.mock('../custom-refinements.component', () => ({
  SearchCustomRefinementList: () => null,
}));

vi.mock('../../../global-search-location-context', () => {
  const setHasMatchingLocations = vi.fn();

  return {
    useGlobalSearchLocationMatches: () => ({ setHasMatchingLocations }),
  };
});

import { SearchPopup } from '../search-popup.component';

describe('desktop navbar search popup', () => {
  it('renders expanded when lazy-mounted after search opens', () => {
    const { container } = render(<SearchPopup setIsSearchOpen={vi.fn()} />);
    const popup = container.querySelector('.popup-search-container');

    expect(popup).toHaveClass('max-h-[700px]', 'pt-4');
    expect(popup).not.toHaveClass('max-h-0');
  });
});
