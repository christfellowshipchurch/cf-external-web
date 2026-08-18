import { describe, expect, it } from 'vitest';
import {
  FALLBACK_SUNDAY_SERVICE_TIMES,
  isOnlineServiceLive,
  isSundayInEastern,
  parseServiceTimeToMinutes,
} from '../live-service-window';

/**
 * Eastern Time is what the schedule is published in, so these fixtures are
 * written as UTC instants with the offset applied by hand: EDT is UTC-4
 * (Mar–Nov) and EST is UTC-5. Building them from a local Date would make the
 * suite pass or fail depending on the machine's zone.
 */
const easternDaylight = (isoWithoutZone: string) =>
  new Date(`${isoWithoutZone}-04:00`);
const easternStandard = (isoWithoutZone: string) =>
  new Date(`${isoWithoutZone}-05:00`);

/** 2026-08-16 is a Sunday; 2026-08-17 is the Monday after it. */
const SUNDAY = '2026-08-16T';
const MONDAY = '2026-08-17T';

describe('parseServiceTimeToMinutes', () => {
  it('converts Rock display times to minutes since midnight', () => {
    expect(parseServiceTimeToMinutes('8:15 AM')).toBe(8 * 60 + 15);
    expect(parseServiceTimeToMinutes('11:30 AM')).toBe(11 * 60 + 30);
    expect(parseServiceTimeToMinutes('6:00 PM')).toBe(18 * 60);
  });

  it('keeps noon at 12 and midnight at 0 rather than adding 12 to both', () => {
    // The parsers in app/lib/utils.ts and calendar-ics.ts return hour 24 here,
    // which would push the close of the window past the end of the day.
    expect(parseServiceTimeToMinutes('12:00 PM')).toBe(12 * 60);
    expect(parseServiceTimeToMinutes('12:30 AM')).toBe(30);
  });

  it('tolerates surrounding and internal whitespace from Rock', () => {
    expect(parseServiceTimeToMinutes('  9:45AM ')).toBe(9 * 60 + 45);
  });

  it('rejects input it cannot trust instead of guessing a time', () => {
    // A silently-wrong number here would silently shift the live window, so
    // unparseable entries have to be droppable by the caller.
    expect(parseServiceTimeToMinutes('OnDemand')).toBeNull();
    expect(parseServiceTimeToMinutes('9:45')).toBeNull();
    expect(parseServiceTimeToMinutes('25:00 AM')).toBeNull();
    expect(parseServiceTimeToMinutes('9:75 AM')).toBeNull();
    expect(parseServiceTimeToMinutes('')).toBeNull();
  });
});

describe('isSundayInEastern', () => {
  // This gate decides whether the loader fetches service times at all, so a
  // wrong answer either costs a needless round trip on every request or hides
  // the indicator for the whole of Sunday.
  it('recognises Sunday in Eastern Time', () => {
    expect(isSundayInEastern(easternDaylight(`${SUNDAY}09:00:00`))).toBe(true);
    expect(isSundayInEastern(easternDaylight(`${MONDAY}09:00:00`))).toBe(false);
  });

  it('uses the Eastern day, not the UTC day, at the boundary', () => {
    // Sunday 21:00 ET is already Monday 01:00 UTC — reading the UTC day here
    // would switch the indicator off an hour before the Eastern day ends.
    expect(isSundayInEastern(easternDaylight(`${SUNDAY}21:00:00`))).toBe(true);
    // And Sunday 00:30 UTC is still Saturday evening in Eastern Time.
    expect(isSundayInEastern(new Date(`${SUNDAY}00:30:00Z`))).toBe(false);
  });
});

describe('isOnlineServiceLive', () => {
  const times = FALLBACK_SUNDAY_SERVICE_TIMES; // 8:15, 9:45, 11:30 AM ET

  it('opens the window exactly 30 minutes before the first service', () => {
    // The indicator exists to catch people arriving early, so the boundary
    // itself must be inside the window, not one tick outside it.
    expect(
      isOnlineServiceLive(times, easternDaylight(`${SUNDAY}07:45:00`)),
    ).toBe(true);
    expect(
      isOnlineServiceLive(times, easternDaylight(`${SUNDAY}07:44:00`)),
    ).toBe(false);
  });

  it('closes the window 90 minutes after the last service starts', () => {
    // 11:30 AM + 1.5h = 1:00 PM ET.
    expect(
      isOnlineServiceLive(times, easternDaylight(`${SUNDAY}13:00:00`)),
    ).toBe(true);
    expect(
      isOnlineServiceLive(times, easternDaylight(`${SUNDAY}13:01:00`)),
    ).toBe(false);
  });

  it('stays live through the gaps between services', () => {
    // The window is one continuous span, not one per service: someone landing
    // at 9:00 should still be sent to the stream.
    expect(
      isOnlineServiceLive(times, easternDaylight(`${SUNDAY}09:00:00`)),
    ).toBe(true);
  });

  it('is never live on other days, even at the same clock time', () => {
    expect(
      isOnlineServiceLive(times, easternDaylight(`${MONDAY}09:00:00`)),
    ).toBe(false);
  });

  it('judges the window in Eastern Time, not the ambient zone', () => {
    // 11:30 UTC on Sunday is 07:30 ET — before the window opens. A visitor in
    // London must not see the indicator just because their own clock reads
    // midday, and the UTC server must not miss it either.
    expect(new Date(`${SUNDAY}11:30:00Z`).getUTCHours()).toBe(11);
    expect(isOnlineServiceLive(times, new Date(`${SUNDAY}11:30:00Z`))).toBe(
      false,
    );
    // 13:00 UTC is 09:00 ET — mid-window.
    expect(isOnlineServiceLive(times, new Date(`${SUNDAY}13:00:00Z`))).toBe(
      true,
    );
  });

  it('tracks the Eastern daylight-saving offset across the year', () => {
    // 2026-01-11 is a Sunday in EST (UTC-5). 09:00 EST is mid-window, and the
    // same wall-clock time must behave the same as it does in EDT — a fixed
    // -4 offset would place this an hour off.
    const winterSunday = easternStandard('2026-01-11T09:00:00');
    expect(isOnlineServiceLive(times, winterSunday)).toBe(true);
    expect(
      isOnlineServiceLive(times, easternStandard('2026-01-11T07:30:00')),
    ).toBe(false);
  });

  it('is not live when no service time survives parsing', () => {
    // Rock returning only OnDemand (or junk) must hide the indicator rather
    // than default it on for the whole of Sunday.
    expect(
      isOnlineServiceLive(['OnDemand'], easternDaylight(`${SUNDAY}09:00:00`)),
    ).toBe(false);
    expect(isOnlineServiceLive([], easternDaylight(`${SUNDAY}09:00:00`))).toBe(
      false,
    );
  });

  it('derives the window from the real extremes when times are out of order', () => {
    // Rock does not guarantee ordering, so min/max must drive the window
    // rather than the first and last array entries.
    const shuffled = ['11:30 AM', '8:15 AM', '9:45 AM'];
    expect(
      isOnlineServiceLive(shuffled, easternDaylight(`${SUNDAY}07:45:00`)),
    ).toBe(true);
    expect(
      isOnlineServiceLive(shuffled, easternDaylight(`${SUNDAY}13:00:00`)),
    ).toBe(true);
  });
});
