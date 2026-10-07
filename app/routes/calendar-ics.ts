import { LoaderFunctionArgs } from 'react-router';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { escapeOData } from '~/lib/.server/rock-utils';
import {
  format,
  addMinutes,
  nextSunday,
  setHours,
  setMinutes,
  setSeconds,
} from 'date-fns';

/**
 * Returns an ICS file for the given campus + service time.
 *
 * Using Content-Type: text/calendar with Content-Disposition: inline causes
 * iOS Safari to show the native "Add to Calendar" sheet immediately, and
 * Android to open the file with the user's default calendar app — no manual
 * download step required on either platform.
 *
 * Usage: /calendar-ics?campus=palm-beach-gardens&time=9:00+AM
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const reqUrl = new URL(request.url);
  const campus = reqUrl.searchParams.get('campus') ?? '';
  const time = reqUrl.searchParams.get('time') ?? '';

  const data = await fetchRockData({
    endpoint: 'Campuses',
    queryParams: {
      $filter: `Url eq '${escapeOData(campus)}'`,
      $expand: 'Location',
      loadAttributes: 'simple',
    },
  });

  if (!data || data.length === 0) {
    throw new Response('Campus not found', { status: 404 });
  }

  const { name, location } = data;
  const address = [
    location.street1,
    location.city,
    location.state,
    location.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  const campusPageUrl = `https://christfellowship.church/locations/${campus}`;

  // Parse "9:00 AM" / "10:30 AM" style strings
  const parseServiceTime = (t: string): [number, number] => {
    const upper = t.toUpperCase().trim();
    const isPM = upper.includes('PM');
    const [h, m] = upper
      .replace(/(AM|PM)/g, '')
      .trim()
      .split(':')
      .map(Number);
    const hour24 = isPM && h !== 12 ? h + 12 : !isPM && h === 12 ? 0 : h;
    return [hour24, m ?? 0];
  };

  const [hour, minute] = parseServiceTime(time);
  const now = new Date();
  let sunday = nextSunday(now);
  sunday = setHours(sunday, hour);
  sunday = setMinutes(sunday, minute);
  sunday = setSeconds(sunday, 0);
  const end = addMinutes(sunday, 90);

  const title =
    name !== 'Trinity'
      ? `Sunday service at Christ Fellowship Church in ${name}`
      : 'Sunday service at Trinity Church by Christ Fellowship';

  const fmt = (d: Date) => format(d, "yyyyMMdd'T'HHmmss");

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//www.cf.church//Christ Fellowship Church',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTAMP:${format(now, "yyyyMMdd'T'HHmmss'Z'")}`,
    `UID:${now.getTime()}-${campus}@christfellowship.church`,
    `DTSTART;TZID=America/New_York:${fmt(sunday)}`,
    `DTEND;TZID=America/New_York:${fmt(end)}`,
    `SUMMARY:${title}`,
    `URL:${campusPageUrl}`,
    `DESCRIPTION:Join us this Sunday!`,
    `LOCATION:${address}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      // "inline" tells iOS Safari to handle it in-app (Add to Calendar sheet)
      // rather than saving as a file download
      'Content-Disposition': 'inline; filename="christfellowship.ics"',
      'Cache-Control': 'no-store',
    },
  });
};
