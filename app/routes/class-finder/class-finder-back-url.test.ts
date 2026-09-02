import { describe, expect, it } from 'vitest';

import { getClassFinderBackUrl } from './class-finder-back-url';

describe('class finder back URL', () => {
  it('restores search and filters passed by finder card', () => {
    expect(
      getClassFinderBackUrl({
        fromClassFinder:
          '/class-finder?q=marriage&campus=Palm+Beach+Gardens&format=In-Person',
      }),
    ).toBe(
      '/class-finder?q=marriage&campus=Palm+Beach+Gardens&format=In-Person',
    );
  });

  it('falls back to finder for direct detail visits', () => {
    expect(getClassFinderBackUrl(undefined)).toBe('/class-finder');
  });

  it('rejects unrelated return paths', () => {
    expect(
      getClassFinderBackUrl({ fromClassFinder: '/account?tab=billing' }),
    ).toBe('/class-finder');
  });
});
