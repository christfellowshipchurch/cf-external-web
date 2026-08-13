import { describe, expect, it } from 'vitest';
import type { ClassHitType } from '../../../types';
import {
  JOURNEY_CARD_OBJECT_ID,
  JOURNEY_CARD_URL,
  journeyCard,
  withJourneyCardFirst,
} from '../journey-pinned-card';

function makeHit(
  overrides: Partial<ClassHitType> & Pick<ClassHitType, 'objectID'>,
): ClassHitType {
  return {
    title: 'Class Title',
    classType: 'Class Type',
    pathName: 'class-type',
    campus: 'Palm Beach Gardens',
    groupId: 1,
    subtitle: 'Subtitle',
    summary: 'Summary',
    coverImage: { sources: [{ uri: 'https://algolia.example/cover.jpg' }] },
    _geoloc: { lat: 0, lng: 0 },
    startDate: '',
    endDate: '',
    schedule: '',
    topic: 'Spiritual Growth',
    language: 'English',
    format: 'In-Person',
    ...overrides,
  };
}

describe('journeyCard', () => {
  // Grouped synthetic cards use `grouped-N`. A colliding id would make React
  // reuse the wrong card and break the /events/journey Link override.
  it('uses a sentinel objectID that cannot collide with grouped synthetic hits', () => {
    expect(JOURNEY_CARD_OBJECT_ID).toBe('pinned-journey');
    expect(JOURNEY_CARD_OBJECT_ID).not.toMatch(/^grouped-\d+$/);
    expect(journeyCard.objectID).toBe(JOURNEY_CARD_OBJECT_ID);
  });

  it('links to the Journey event page, not a class-finder detail slug', () => {
    expect(JOURNEY_CARD_URL).toBe('/events/journey');
    expect(journeyCard.pathName).toBe('');
  });

  it('uses the single-segment CloudFront image URL for the Journey artwork guid', () => {
    expect(journeyCard.coverImage.sources[0].uri).toBe(
      'https://cloudfront.christfellowship.church/GetImage.ashx?guid=5cbd4b27-2ff1-4e5c-ae77-45b51399be94&quality=20',
    );
    expect(journeyCard.coverImage.sources[0].uri).not.toContain(
      'GetImage.ashx/GetImage.ashx',
    );
  });
});

describe('withJourneyCardFirst', () => {
  // Journey is not in the Algolia classes index, so the finder must prepend a
  // hard-coded card or new people never see the first-step class.
  it('prepends the Journey card without mutating the original hits array', () => {
    const hits = [
      makeHit({ objectID: 'grouped-0', title: 'Marriage Matters' }),
      makeHit({ objectID: 'grouped-1', title: 'Financial Peace' }),
    ];
    const original = [...hits];

    const result = withJourneyCardFirst(hits);

    expect(result[0]).toBe(journeyCard);
    expect(result.slice(1)).toEqual(hits);
    expect(hits).toEqual(original);
  });

  it('still returns the Journey card when the finder has no class hits', () => {
    expect(withJourneyCardFirst([])).toEqual([journeyCard]);
  });
});
