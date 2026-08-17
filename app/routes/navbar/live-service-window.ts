/**
 * Decides whether the online (cf-everywhere) Sunday broadcast is currently
 * live, which is what gates the navbar's Watch Live indicator (CFDP-4225).
 *
 * Service times are published in Eastern Time, but the server runs UTC and
 * visitors sit in arbitrary zones, so the comparison is made against
 * Eastern-Time calendar parts rather than the ambient zone.
 */

const SERVICE_TIME_ZONE = 'America/New_York';

/** The indicator appears this many minutes before the first service starts. */
const MINUTES_BEFORE_FIRST_SERVICE = 30;

/** ...and stays up this many minutes after the *last* service starts. */
const MINUTES_AFTER_LAST_SERVICE = 90;

/**
 * Used when Rock is unreachable or its campus record carries no Sunday times.
 * These are the same times the site already publishes in the cf-everywhere FAQ,
 * so falling back to them keeps the indicator on the advertised schedule
 * instead of hiding it for everyone whenever Rock has a bad minute.
 */
export const FALLBACK_SUNDAY_SERVICE_TIMES = ['8:15 AM', '9:45 AM', '11:30 AM'];

/**
 * Rock stores service times as display strings ("8:15 AM"). Returns minutes
 * since midnight, or null when the string isn't a time we can trust.
 *
 * Deliberately not reusing `parseTimeAsInt`/`parseServiceTime` from
 * app/lib/utils.ts and calendar-ics.ts: both add 12 to every PM hour, which
 * turns 12:00 PM into hour 24, and neither rejects unparseable input.
 */
export const parseServiceTimeToMinutes = (time: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return null;

  const [, rawHour, rawMinute, meridiem] = match;
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (hour < 1 || hour > 12 || minute > 59) return null;

  // 12 AM is midnight and 12 PM is noon; every other PM hour shifts by 12.
  const isPm = meridiem.toUpperCase() === 'PM';
  const hour24 = isPm ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;

  return hour24 * 60 + minute;
};

/** Weekday and minutes-since-midnight for `now`, both read in Eastern Time. */
const easternTimeParts = (now: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SERVICE_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    // h23 rather than hour12:false — the latter reports midnight as hour 24.
    hourCycle: 'h23',
  }).formatToParts(now);

  const partValue = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return {
    weekday: partValue('weekday'),
    minutesOfDay: Number(partValue('hour')) * 60 + Number(partValue('minute')),
  };
};

/**
 * True when `now` falls on a Sunday in Eastern Time.
 *
 * Split out so callers can rule out the other six days before paying for a
 * service-times lookup they cannot act on.
 */
export const isSundayInEastern = (now: Date): boolean =>
  easternTimeParts(now).weekday === 'Sun';

/**
 * True while `now` (in Eastern Time) falls inside the Sunday broadcast window:
 * from 30 minutes before the earliest service until 90 minutes after the
 * latest one starts.
 *
 * @param sundayServiceTimes Display-format start times, e.g. ['8:15 AM'].
 */
export const isOnlineServiceLive = (
  sundayServiceTimes: string[],
  now: Date,
): boolean => {
  const { weekday, minutesOfDay } = easternTimeParts(now);
  if (weekday !== 'Sun') return false;

  const serviceStarts = sundayServiceTimes
    .map(parseServiceTimeToMinutes)
    .filter((minutes): minutes is number => minutes !== null);

  if (serviceStarts.length === 0) return false;

  const opensAt = Math.min(...serviceStarts) - MINUTES_BEFORE_FIRST_SERVICE;
  const closesAt = Math.max(...serviceStarts) + MINUTES_AFTER_LAST_SERVICE;

  return minutesOfDay >= opensAt && minutesOfDay <= closesAt;
};
