/**
 * Shared (client + server) Journey session types and display helpers.
 *
 * `startsAt` is Rock's Eastern wall-clock time (`YYYY-MM-DDTHH:mm`). Labels are
 * built from those digits directly — never via `new Date()` in the viewer's
 * zone — so a browser or server in UTC can't roll a 9 PM session to the next day.
 */

import { RockCampuses } from '~/lib/rock-config';

export type JourneySessionNumber = 1 | 2 | 3;

export const JOURNEY_SESSION_NUMBERS: JourneySessionNumber[] = [1, 2, 3];

export type JourneyCampus = {
  id: number;
  name: string;
  street1: string;
  city: string;
  /** Campus `mapLink` attribute — the same directions link the location pages use. */
  mapLink: string;
};

export type JourneySessionOption = {
  sessionNumber: JourneySessionNumber;
  groupGuid: string;
  campusId: number;
  /** Eastern wall-clock start, `YYYY-MM-DDTHH:mm`. */
  startsAt: string;
  isFull: boolean;
  /** Already started — shown so dates line up by month, but not selectable. */
  isPast: boolean;
  /** Group attribute `Childcare` ("Does this Journey need Childcare?"). */
  offersChildcare: boolean;
};

export type JourneySessionsData = {
  campuses: JourneyCampus[];
  options: JourneySessionOption[];
};

export type JourneySessionSelection = Partial<
  Record<JourneySessionNumber, JourneySessionOption>
>;

/**
 * Childcare age ranges. `key` is both the workflow attribute and the group
 * member attribute in Rock, which only accepts counts 1–8.
 */
export const JOURNEY_CHILDCARE_AGE_RANGES = [
  { key: '0-23Months', label: '0–23 months', spanishLabel: '0–23 meses' },
  { key: '2Years', label: '2 years', spanishLabel: '2 años' },
  { key: '3Years-4Years', label: '3–4 years', spanishLabel: '3–4 años' },
  {
    key: '5Years-Kindergarten',
    label: '5 years–Kindergarten',
    spanishLabel: '5 años–Kínder',
  },
  { key: 'Grades1-5', label: 'Grades 1–5', spanishLabel: 'Grados 1–5' },
] as const;

export const JOURNEY_CHILDCARE_MAX_COUNT = 8;

/** Form field name for one age range's count. */
export const childcareFieldName = (key: string) => `childcare-${key}`;

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const parseWallClock = (startsAt: string) => {
  const [date, time = '00:00'] = startsAt.split('T');
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  // UTC here is only a calendar calculator for the weekday — no zone conversion.
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour, minute, weekday };
};

/** "Sunday, October 4" */
export const formatSessionDateHeading = (startsAt: string) => {
  const { month, day, weekday } = parseWallClock(startsAt);
  return `${WEEKDAYS[weekday]}, ${MONTHS[month - 1]} ${day}`;
};

/** "Sun, Oct 4" */
export const formatSessionShortDate = (startsAt: string) => {
  const { month, day, weekday } = parseWallClock(startsAt);
  return `${WEEKDAYS[weekday].slice(0, 3)}, ${MONTHS[month - 1].slice(0, 3)} ${day}`;
};

/** "9:45 AM" */
export const formatSessionTime = (startsAt: string) => {
  const { hour, minute } = parseWallClock(startsAt);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
};

/** The date part of `startsAt`, used to group options under a date heading. */
export const getSessionDateKey = (startsAt: string) => startsAt.slice(0, 10);

/** Two selections are the same slot when they share session, group and start. */
export const isSameSessionOption = (
  a: JourneySessionOption | undefined,
  b: JourneySessionOption | undefined,
) =>
  !!a &&
  !!b &&
  a.sessionNumber === b.sessionNumber &&
  a.groupGuid === b.groupGuid &&
  a.startsAt === b.startsAt;

/**
 * "Select earliest available class": every session from the earliest group at
 * the given campus whose sessions are all still open, so the person attends one
 * class together. Sessions in `skip` (already registered) are left alone and
 * don't need to be open. Returns an empty selection when no group qualifies.
 */
export const pickEarliestAvailable = (
  options: JourneySessionOption[],
  campusId: number,
  skip: JourneySessionNumber[] = [],
): JourneySessionSelection => {
  const needed = JOURNEY_SESSION_NUMBERS.filter((n) => !skip.includes(n));
  const groups = new Map<string, JourneySessionOption[]>();
  options
    .filter((option) => option.campusId === campusId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .forEach((option) =>
      groups.set(option.groupGuid, [
        ...(groups.get(option.groupGuid) ?? []),
        option,
      ]),
    );

  for (const groupOptions of groups.values()) {
    const open = needed.map((n) =>
      groupOptions.find(
        (option) =>
          option.sessionNumber === n && !option.isFull && !option.isPast,
      ),
    );
    if (open.every(Boolean)) {
      return Object.fromEntries(
        needed.map((n, i) => [n, open[i]]),
      ) as JourneySessionSelection;
    }
  }
  return {};
};

/** Location-page slug for a campus name (`RockCampuses[].pathname`, e.g. `port-st-lucie`). */
export const getJourneyCampusSlug = (campusName: string) =>
  RockCampuses.find((campus) => campus.name === campusName)?.pathname;

/**
 * Campus for a `?campus=<slug>` link. Undefined when the slug is unknown or
 * that campus has no Journey sessions.
 */
export const findJourneyCampusBySlug = (
  campuses: JourneyCampus[],
  slug: string | null,
): JourneyCampus | undefined => {
  const normalized = slug?.trim().toLowerCase();
  if (!normalized) return undefined;
  return campuses.find(
    (campus) => getJourneyCampusSlug(campus.name) === normalized,
  );
};
