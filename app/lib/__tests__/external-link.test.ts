import { describe, expect, it } from 'vitest';

import { isExternalHref, linkTargetForHref } from '../external-link';

describe('isExternalHref', () => {
  it('treats an off-site URL as external, so it can open in a new tab', () => {
    expect(isExternalHref('https://cfmissiontrips.org/trips')).toBe(true);
    expect(isExternalHref('http://example.com')).toBe(true);
  });

  it('treats our own absolute URLs as internal — CMS authors write them for internal pages', () => {
    expect(
      isExternalHref(
        'https://www.christfellowship.church/volunteer/community-opportunities',
      ),
    ).toBe(false);
    expect(isExternalHref('https://christfellowship.church/give')).toBe(false);
  });

  it('treats relative paths as internal', () => {
    expect(isExternalHref('/ministries/missions')).toBe(false);
    expect(isExternalHref('#community')).toBe(false);
  });

  it('leaves mailto and tel to the OS rather than opening a tab', () => {
    expect(isExternalHref('mailto:hello@christfellowship.church')).toBe(false);
    expect(isExternalHref('tel:+15615551234')).toBe(false);
  });

  it('is safe on empty and unparseable values', () => {
    expect(isExternalHref('')).toBe(false);
    expect(isExternalHref(null)).toBe(false);
    expect(isExternalHref(undefined)).toBe(false);
    expect(isExternalHref('https://')).toBe(false);
  });
});

describe('linkTargetForHref', () => {
  it('opens external destinations in a new tab', () => {
    expect(linkTargetForHref('https://cfmissiontrips.org')).toBe('_blank');
  });

  it('returns _self for internal links, overriding Button’s "contains http" fallback', () => {
    expect(
      linkTargetForHref('https://www.christfellowship.church/volunteer'),
    ).toBe('_self');
    expect(linkTargetForHref('/volunteer')).toBe('_self');
  });
});
