import { icons } from '~/lib/icons';

/** Defined values for the event `groupType` attribute (Rock defined value list). */
export const EVENT_REGISTRATION_GROUP_TYPES = [
  'Baptism',
  'Journey',
  'Kids Starting Line',
  'Kids Dedication',
  'Kids Worship',
  'Dream Team Kickoff',
] as const;

export type EventRegistrationGroupType =
  (typeof EVENT_REGISTRATION_GROUP_TYPES)[number];

export function isEventRegistrationGroupType(
  value: string | undefined | null,
): value is EventRegistrationGroupType {
  if (value == null || value === '') {
    return false;
  }
  return (EVENT_REGISTRATION_GROUP_TYPES as readonly string[]).includes(value);
}

export type EventSinglePageType = {
  title: string;
  titleOverride?: string;
  subtitle: string;
  heroCtas: { title: string; url: string }[];
  quickPoints?: string[];
  coverImage: string;
  aboutTitle?: string;
  aboutContent?: string;
  groupType?: EventRegistrationGroupType;
  keyInfoCards?: { title: string; description: string; icon: string }[];
  whatToExpect?: { title: string; description: string }[];
  moreInfoTitle?: string;
  moreInfoText?: string;
  optionalBlurb?: { title: string; description: string }[];
  faqItems?: { question: string; answer: string }[];
  faqEmail?: string;
  sessionScheduleCards?: SessionRegistrationCardType[];
};

/**
 * Whether the registration section has anything to render — session cards, or a
 * `groupType` for click-through registration.
 *
 * The section wrapper and the "Locations" tab must both hinge on this one
 * check. Deriving them separately is what left an empty `<section id='register'>`
 * on events with neither, and would let the tab and the section disagree.
 */
export const hasRegistrationContent = (
  data: Pick<EventSinglePageType, 'sessionScheduleCards' | 'groupType'>,
): boolean =>
  Boolean(data.sessionScheduleCards?.length) || Boolean(data.groupType);

export type SessionRegistrationCardType = {
  icon: keyof typeof icons;
  title: string;
  description: string;
  date: string;
  programTime: string;
  partyTime: string;
  additionalInfo?: string;
  /**
   * Button label, from Rock's `Call` attribute.
   * Empty when unset — the card falls back to a default label.
   */
  ctaTitle?: string;
  /**
   * Button destination, from Rock's `Action` attribute. Empty when unset, in
   * which case the card renders no button at all: Rock's `TicketsUrl` is no
   * longer read here, so there is nothing left to fall back to and a button
   * without an href would be inert.
   */
  ctaUrl?: string;
  /** Rock's `ShowAddToCalendar` boolean — gates the Add to Calendar button. */
  showAddToCalendar?: boolean;
  /**
   * Session start as a naive local ISO string (`yyyy-MM-dd'T'HH:mm:ss`), for Add to Calendar.
   * Deliberately timezone-less: the .ics tags it `TZID=America/New_York`, so the wall-clock
   * digits must survive the trip to the browser unshifted. Empty when Rock has no date.
   */
  startDateTime?: string;
};

export interface EventFinderHit {
  objectID: string;
  campus: { name: string; street1: string; city: string; state: string };
  groupType: string;
  rockItemId: number;
  groupGuid: string;
  summary: string;
  location: string;
  day: string;
  time: string;
  date: string[];
  subGroupType: string;
}
