import { describe, expect, it } from 'vitest';

import {
  hasGroupFinderAppliedFilters,
  hasGroupFinderUrlActiveFilters,
  parseGroupFinderUrlState,
} from '../group-finder-url-state';

const stateFrom = (search: string) =>
  parseGroupFinderUrlState(new URLSearchParams(search));

describe('hasGroupFinderAppliedFilters', () => {
  it('is false when the user has only paged through unfiltered results', () => {
    // Drives the “Active Filters” bar: paging is navigation, so the bar must not
    // claim a filter is narrowing results (CFDP-4257).
    expect(hasGroupFinderAppliedFilters(stateFrom('page=3'))).toBe(false);
  });

  it('is true for each thing the user can actually filter by', () => {
    expect(hasGroupFinderAppliedFilters(stateFrom('q=prayer'))).toBe(true);
    expect(hasGroupFinderAppliedFilters(stateFrom('topics=Prayer'))).toBe(true);
    expect(hasGroupFinderAppliedFilters(stateFrom('age=25'))).toBe(true);
    expect(
      hasGroupFinderAppliedFilters(stateFrom('lat=26.68&lng=-80.24')),
    ).toBe(true);
  });

  it('stays true for a real filter applied on a later page', () => {
    expect(hasGroupFinderAppliedFilters(stateFrom('q=prayer&page=2'))).toBe(
      true,
    );
  });

  it('counts map coordinates not yet reflected in the URL', () => {
    expect(
      hasGroupFinderAppliedFilters(stateFrom(''), {
        lat: 26.68,
        lng: -80.24,
      }),
    ).toBe(true);
    expect(
      hasGroupFinderAppliedFilters(stateFrom(''), { lat: null, lng: null }),
    ).toBe(false);
  });
});

describe('hasGroupFinderUrlActiveFilters', () => {
  it('still counts the page, so Clear All returns the user to page 1', () => {
    expect(hasGroupFinderUrlActiveFilters(stateFrom('page=3'))).toBe(true);
  });

  it('is false for a pristine URL', () => {
    expect(hasGroupFinderUrlActiveFilters(stateFrom(''))).toBe(false);
    expect(hasGroupFinderUrlActiveFilters(stateFrom('page=1'))).toBe(false);
  });
});
