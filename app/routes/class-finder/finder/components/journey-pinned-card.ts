import type { ClassHitType } from '../../types';

/** Sentinel objectID so the class-finder grid can route this card to /events/journey. */
export const JOURNEY_CARD_OBJECT_ID = 'pinned-journey';

export const JOURNEY_CARD_URL = '/events/journey';

export const JOURNEY_CARD_TOPIC = 'Spiritual Growth';

/**
 * Journey lives as an event, not a classes-index record. This hard-coded card is
 * prepended to the Class Finder feed so new people still see the first-step class.
 * Remaining fields match the inert fillers in `syntheticHitsFromGrouped`.
 */
export const journeyCard: ClassHitType = {
  objectID: JOURNEY_CARD_OBJECT_ID,
  title: 'The Journey',
  classType: 'The Journey',
  // No /class-finder/:path detail page; ClassHitComponent links out via `to`.
  pathName: '',
  campus: '',
  groupId: 0,
  subtitle: '',
  summary:
    'Your first step to getting connected — a three-part conversation about who we are and how you can know God and grow.',
  coverImage: {
    sources: [
      {
        uri: 'https://cloudfront.christfellowship.church/GetImage.ashx?guid=5cbd4b27-2ff1-4e5c-ae77-45b51399be94&quality=20',
      },
    ],
  },
  _geoloc: { lat: 0, lng: 0 },
  startDate: '',
  endDate: '',
  schedule: '',
  topic: JOURNEY_CARD_TOPIC,
  language: 'English',
  format: 'In-Person',
};

function hasAnyRefinement(refinementList?: Record<string, string[]>): boolean {
  if (!refinementList) return false;
  return Object.values(refinementList).some((values) => values.length > 0);
}

/**
 * Pin Journey on the unfiltered feed, or when the Spiritual Growth topic is
 * selected. Hide it for every other refinement so it does not sit on unrelated
 * filtered results.
 */
export function shouldShowJourneyCard(
  refinementList?: Record<string, string[]>,
): boolean {
  const topics = refinementList?.topic ?? [];
  if (topics.includes(JOURNEY_CARD_TOPIC)) {
    return true;
  }
  return !hasAnyRefinement(refinementList);
}

/** Pins the hard-coded Journey card first. Does not mutate `hits`. */
export function withJourneyCardFirst(hits: ClassHitType[]): ClassHitType[] {
  return [journeyCard, ...hits];
}
