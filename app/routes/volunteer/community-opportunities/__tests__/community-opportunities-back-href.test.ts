import { beforeEach, describe, expect, it } from 'vitest';

import {
  COMMUNITY_OPPORTUNITIES_BACK_FALLBACK,
  communityOpportunitiesBackHrefFromReferrer,
  resolveCommunityOpportunitiesBackHref,
} from '../community-opportunities-back-href';

const ORIGIN = 'https://christfellowship.church';

describe('communityOpportunitiesBackHrefFromReferrer', () => {
  it('returns the missions ministry page so a visitor from missions is not sent to /volunteer', () => {
    expect(
      communityOpportunitiesBackHrefFromReferrer(
        `${ORIGIN}/ministries/missions`,
        ORIGIN,
      ),
    ).toBe('/ministries/missions');
  });

  it('keeps query and hash so the entry point is restored exactly', () => {
    expect(
      communityOpportunitiesBackHrefFromReferrer(
        `${ORIGIN}/ministries/missions?campus=palm-beach#serve`,
        ORIGIN,
      ),
    ).toBe('/ministries/missions?campus=palm-beach#serve');
  });

  it('sends a visitor from the volunteer page to the community section, not the page top', () => {
    expect(
      communityOpportunitiesBackHrefFromReferrer(`${ORIGIN}/volunteer`, ORIGIN),
    ).toBe(COMMUNITY_OPPORTUNITIES_BACK_FALLBACK);
  });

  it('rejects volunteer sub-routes, which would bounce between the grid and a detail page', () => {
    expect(
      communityOpportunitiesBackHrefFromReferrer(
        `${ORIGIN}/volunteer/outreach/abc-123`,
        ORIGIN,
      ),
    ).toBeNull();
    expect(
      communityOpportunitiesBackHrefFromReferrer(
        `${ORIGIN}/volunteer/community-opportunities?category=Outreach`,
        ORIGIN,
      ),
    ).toBeNull();
  });

  it('rejects other origins so the header link never leaves the site', () => {
    expect(
      communityOpportunitiesBackHrefFromReferrer(
        'https://www.google.com/search?q=volunteer',
        ORIGIN,
      ),
    ).toBeNull();
  });

  it('rejects a missing or unparseable referrer', () => {
    expect(communityOpportunitiesBackHrefFromReferrer('', ORIGIN)).toBeNull();
    expect(
      communityOpportunitiesBackHrefFromReferrer('not a url', ORIGIN),
    ).toBeNull();
  });
});

describe('resolveCommunityOpportunitiesBackHref', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: '',
    });
  });

  function setReferrer(value: string) {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value,
    });
  }

  it('prefers the in-app link state, because a Link click leaves document.referrer stale', () => {
    // The tab was opened at the home page, then navigated client-side.
    setReferrer(`${window.location.origin}/`);
    expect(
      resolveCommunityOpportunitiesBackHref(
        { backHref: COMMUNITY_OPPORTUNITIES_BACK_FALLBACK },
        'PUSH',
      ),
    ).toBe(COMMUNITY_OPPORTUNITIES_BACK_FALLBACK);
  });

  it('ignores the referrer on a client-side navigation with no state', () => {
    setReferrer(`${window.location.origin}/`);
    expect(resolveCommunityOpportunitiesBackHref(null, 'PUSH')).toBe(
      COMMUNITY_OPPORTUNITIES_BACK_FALLBACK,
    );
  });

  it('uses the referrer on a document load, which is the missions ministry entry', () => {
    setReferrer(`${window.location.origin}/ministries/missions`);
    expect(resolveCommunityOpportunitiesBackHref(null, 'POP')).toBe(
      '/ministries/missions',
    );
  });

  it('remembers the entry point across a detail-page round trip', () => {
    setReferrer(`${window.location.origin}/ministries/missions`);
    resolveCommunityOpportunitiesBackHref(null, 'POP');

    // Returning from an opportunity detail page: a PUSH carrying no state.
    setReferrer('');
    expect(resolveCommunityOpportunitiesBackHref(null, 'PUSH')).toBe(
      '/ministries/missions',
    );
  });

  it('drops a remembered entry point when the page is opened directly', () => {
    setReferrer(`${window.location.origin}/ministries/missions`);
    resolveCommunityOpportunitiesBackHref(null, 'POP');

    setReferrer('');
    expect(resolveCommunityOpportunitiesBackHref(null, 'POP')).toBe(
      COMMUNITY_OPPORTUNITIES_BACK_FALLBACK,
    );
  });
});
