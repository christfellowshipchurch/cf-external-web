/**
 * Rock stores and returns content dates (StartDateTime, ExpireDateTime) as
 * organization wall-clock time with no offset. Production runs in UTC, so
 * reading those strings with `new Date()` or comparing them against
 * `toISOString()` shifts every boundary by 4–5 hours (CFDP-4377).
 */
export const ROCK_TIME_ZONE = 'America/New_York';

const HAS_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/i;

const wallClockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ROCK_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

type WallClockParts = Record<
  'year' | 'month' | 'day' | 'hour' | 'minute' | 'second',
  number
>;

const getWallClockParts = (date: Date): WallClockParts =>
  Object.fromEntries(
    wallClockFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, Number(value)]),
  ) as WallClockParts;

const getOffsetMs = (date: Date): number => {
  const { year, month, day, hour, minute, second } = getWallClockParts(date);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return wallClockAsUtc - Math.floor(date.getTime() / 1000) * 1000;
};

/** Reads a Rock date string as Eastern wall-clock time. Values that already carry an offset are respected. */
export const parseRockDateTime = (value: string): Date => {
  if (HAS_OFFSET.test(value)) return new Date(value);

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/,
  );
  if (!match) return new Date(value);

  const [, year, month, day, hour = '0', minute = '0', second = '0', frac] =
    match;
  const wallClockAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    frac ? Number(frac.slice(0, 3).padEnd(3, '0')) : 0,
  );

  // Second pass picks up the right offset when the first guess lands on the
  // other side of a DST transition.
  const firstGuess = wallClockAsUtc - getOffsetMs(new Date(wallClockAsUtc));
  return new Date(wallClockAsUtc - getOffsetMs(new Date(firstGuess)));
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats an instant as the offset-less Eastern wall-clock string Rock's `datetime'…'` filters compare against. */
export const toRockDateTimeLiteral = (date: Date = new Date()): string => {
  const { year, month, day, hour, minute, second } = getWallClockParts(date);
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
};
