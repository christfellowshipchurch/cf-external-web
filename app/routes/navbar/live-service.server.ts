import { fetchRockData, TTL } from '~/lib/.server/fetch-rock-data';
import { ensureArray, formattedServiceTimes } from '~/lib/utils';
import {
  FALLBACK_SUNDAY_SERVICE_TIMES,
  isOnlineServiceLive,
  isSundayInEastern,
} from './live-service-window';

/** Rock campus slug for the online congregation. */
const ONLINE_CAMPUS_URL = 'cf-everywhere';

/**
 * Sunday start times for the online service, read from Rock's campus record.
 *
 * Cached for a day because the root loader runs on every request: campus
 * service times are reference data that changes a few times a year, so a
 * per-request round trip would tax every response for nothing. The live/not-live
 * decision itself is never cached — it is computed from `now` on each request.
 */
const fetchSundayServiceTimes = async (): Promise<string[]> => {
  try {
    const data = await fetchRockData({
      endpoint: 'Campuses',
      queryParams: {
        $filter: `Url eq '${ONLINE_CAMPUS_URL}'`,
        loadAttributes: 'simple',
      },
      ttl: TTL.LONG,
    });

    // Rock unwraps a single match to an object but returns an array when the
    // filter matches more than one row.
    const campus = ensureArray(data)[0];
    const serviceTimes = campus?.serviceTimes;

    if (typeof serviceTimes !== 'string' || !serviceTimes.trim()) {
      console.error(
        `No serviceTimes on Rock campus '${ONLINE_CAMPUS_URL}'; using published fallback schedule.`,
      );
      return FALLBACK_SUNDAY_SERVICE_TIMES;
    }

    const sunday = formattedServiceTimes(serviceTimes).find(
      ({ day }) => day.toLowerCase() === 'sunday',
    );

    if (!sunday?.hour.length) {
      console.error(
        `Rock campus '${ONLINE_CAMPUS_URL}' has no Sunday service times; using published fallback schedule.`,
      );
      return FALLBACK_SUNDAY_SERVICE_TIMES;
    }

    return sunday.hour;
  } catch (error) {
    console.error('Error fetching online campus service times:', error);
    return FALLBACK_SUNDAY_SERVICE_TIMES;
  }
};

/**
 * Whether the online Sunday broadcast is live right now, for the navbar's
 * Watch Live indicator (CFDP-4225).
 */
export const fetchIsOnlineServiceLive = async (): Promise<boolean> => {
  // One `now` for both checks, so the day cannot flip between them.
  const now = new Date();

  // Six days a week the answer is no whatever the schedule says. The root
  // loader runs on every request, so short-circuiting here avoids a cache (or,
  // when Redis is down, a Rock) round trip per request to reach a foregone
  // conclusion. On Sundays the times are still needed to place the window.
  if (!isSundayInEastern(now)) return false;

  const sundayServiceTimes = await fetchSundayServiceTimes();
  return isOnlineServiceLive(sundayServiceTimes, now);
};
