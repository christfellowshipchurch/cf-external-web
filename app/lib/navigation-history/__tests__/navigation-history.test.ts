import { beforeEach, describe, expect, it } from 'vitest';

import {
  getPreviousNavigationHref,
  recordNavigation,
  resetNavigationHistory,
} from '../navigation-history';

describe('navigation-history', () => {
  beforeEach(resetNavigationHistory);

  it('has no answer before the document has navigated, so callers can fall back', () => {
    expect(getPreviousNavigationHref('/volunteer')).toBeNull();
  });

  it('reports the page navigated from, with its search and hash', () => {
    recordNavigation('/ministries/missions', '/ministries/missions?tab=serve');
    recordNavigation(
      '/volunteer/community-opportunities',
      '/volunteer/community-opportunities',
    );

    expect(
      getPreviousNavigationHref('/volunteer/community-opportunities'),
    ).toBe('/ministries/missions?tab=serve');
  });

  it('answers correctly before the root tracker has recorded the new page', () => {
    // The tracker's effect runs after the page's, so during that first render
    // the recorded "current" entry is still the page being left.
    recordNavigation('/ministries/missions', '/ministries/missions');

    expect(
      getPreviousNavigationHref('/volunteer/community-opportunities'),
    ).toBe('/ministries/missions');
  });

  it('treats a search-only change as the same page, so filtering is not navigation', () => {
    recordNavigation('/ministries/missions', '/ministries/missions');
    recordNavigation('/volunteer', '/volunteer');
    recordNavigation('/volunteer', '/volunteer?category=Outreach');
    recordNavigation('/volunteer', '/volunteer?category=Hospitality');

    expect(
      getPreviousNavigationHref('/volunteer/community-opportunities'),
    ).toBe('/volunteer?category=Hospitality');
  });

  it('keeps only the page before the current one', () => {
    recordNavigation('/', '/');
    recordNavigation('/ministries/missions', '/ministries/missions');
    recordNavigation('/volunteer', '/volunteer');

    expect(getPreviousNavigationHref('/volunteer')).toBe(
      '/ministries/missions',
    );
  });
});
