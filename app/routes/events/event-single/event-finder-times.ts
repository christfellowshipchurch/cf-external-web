import { parseServiceTimeToMinutes } from '~/routes/navbar/live-service-window';

/**
 * Chronological compare for event-finder time strings ("8:15 AM").
 * Algolia returns times in index order, which is not service order — Palm Beach
 * Gardens baptism currently comes back 1:00 PM, 11:30 AM, 9:45 AM, 8:15 AM.
 */
export const compareEventFinderTimes = (a: string, b: string): number => {
  const aMinutes = parseServiceTimeToMinutes(a);
  const bMinutes = parseServiceTimeToMinutes(b);

  if (aMinutes == null && bMinutes == null) return a.localeCompare(b);
  if (aMinutes == null) return 1;
  if (bMinutes == null) return -1;
  return aMinutes - bMinutes;
};
