/**
 * Shared (client + server) Journey session types and display helpers.
 *
 * `startsAt` is Rock's Eastern wall-clock time (`YYYY-MM-DDTHH:mm`). Labels are
 * built from those digits directly — never via `new Date()` in the viewer's
 * zone — so a browser or server in UTC can't roll a 9 PM session to the next day.
 */

export type JourneySessionNumber = 1 | 2 | 3;

export const JOURNEY_SESSION_NUMBERS: JourneySessionNumber[] = [1, 2, 3];

export type JourneyCampus = {
  id: number;
  name: string;
  street1: string;
  city: string;
};

export type JourneySessionOption = {
  sessionNumber: JourneySessionNumber;
  groupGuid: string;
  campusId: number;
  /** Eastern wall-clock start, `YYYY-MM-DDTHH:mm`. */
  startsAt: string;
  isFull: boolean;
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
 * "Select Earliest Available for All Three": the first open option per session
 * at the given campus. Sessions in `skip` (already registered) are left alone.
 */
export const pickEarliestAvailable = (
  options: JourneySessionOption[],
  campusId: number,
  skip: JourneySessionNumber[] = [],
): JourneySessionSelection => {
  const selection: JourneySessionSelection = {};
  for (const sessionNumber of JOURNEY_SESSION_NUMBERS) {
    if (skip.includes(sessionNumber)) continue;
    const earliest = options
      .filter(
        (option) =>
          option.sessionNumber === sessionNumber &&
          option.campusId === campusId &&
          !option.isFull,
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
    if (earliest) selection[sessionNumber] = earliest;
  }
  return selection;
};
