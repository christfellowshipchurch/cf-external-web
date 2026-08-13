import type { ClassHitType } from '../../types';

/** Sentinel objectID so the class-finder grid can route this card to /events/journey. */
export const JOURNEY_CARD_OBJECT_ID = 'pinned-journey';

export const JOURNEY_CARD_URL = '/events/journey';

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
    'Your first step to getting connected — a two-part conversation about who we are and how you can know God and grow.',
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
  topic: 'Spiritual Growth',
  language: 'English',
  format: 'In-Person',
};

/** Pins the hard-coded Journey card first. Does not mutate `hits`. */
export function withJourneyCardFirst(hits: ClassHitType[]): ClassHitType[] {
  return [journeyCard, ...hits];
}
