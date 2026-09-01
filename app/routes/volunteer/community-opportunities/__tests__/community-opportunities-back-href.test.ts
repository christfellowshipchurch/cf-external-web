import { describe, expect, it } from 'vitest';

import {
  COMMUNITY_OPPORTUNITIES_BACK_FALLBACK,
  communityOpportunitiesBackHrefFromReferrer,
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
