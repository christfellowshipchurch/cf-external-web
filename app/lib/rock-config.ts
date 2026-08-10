/**
 * Public Rock RMS web origin for browser links and iframe embeds.
 * Prefer this over `rock.gocf.org`, which may resolve to RFC1918 addresses and trigger Chrome PNA for embedded content.
 */
export const ROCK_PUBLIC_SITE_ORIGIN = 'https://rock.christfellowship.church';

export const ContentItemIds = {
  groupsLaunchNotify: 21402,
};

export const ContentChannelIds = {
  articles: 43,
  default: 85,
  devotionals: 83,
  events: 78,
  locations: 88,
  messages: 63,
  siteBanner: 100,
  studies: [79, 80],
  soGoodSisterhood: 95,
  keepTalking: 96,
  missionTrips: 195,
};

export const getContentChannelUrl = (key: number): string => {
  const channelMap = Object.entries(ContentChannelIds).reduce(
    (acc, [path, id]) => {
      if (Array.isArray(id)) {
        id.forEach((num) => (acc[num] = `/${path.toLowerCase()}`));
      } else {
        acc[id] = `/${path.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`;
      }
      return acc;
    },
    {} as Record<number, string>,
  );

  return channelMap[key] || '/';
};

/**
 * Default Rock Campuses and types for campus related UI elements
 */
export const RockCampuses = [
  {
    name: 'Palm Beach Gardens',
    pathname: 'palm-beach-gardens',
  },
  {
    name: 'Port St. Lucie',
    pathname: 'port-st-lucie',
  },
  {
    name: 'Royal Palm Beach',
    pathname: 'royal-palm-beach',
  },
  {
    name: 'Boynton Beach',
    pathname: 'boynton-beach',
  },
  {
    name: 'Jupiter',
    pathname: 'jupiter',
  },
  {
    name: 'Stuart',
    pathname: 'stuart',
  },
  {
    name: 'Okeechobee',
    pathname: 'okeechobee',
  },
  {
    name: 'Belle Glade',
    pathname: 'belle-glade',
  },
  {
    name: 'Vero Beach',
    pathname: 'vero-beach',
  },
  {
    name: 'Boca Raton',
    pathname: 'boca-raton',
  },
  {
    name: 'Trinity',
    pathname: 'trinity',
  },
  {
    name: 'Westlake',
    pathname: 'westlake',
  },
  {
    name: 'Christ Fellowship Español Palm Beach Gardens',
    pathname: 'iglesia-palm-beach-gardens',
  },
  {
    name: 'Christ Fellowship Español Royal Palm Beach',
    pathname: 'iglesia-royal-palm-beach',
  },
  {
    name: 'Online',
    pathname: 'cf-everywhere',
  },
] as const;

export type RockCampus = (typeof RockCampuses)[number];
export type RockCampusName = RockCampus['name'];
export type RockCampusPathname = RockCampus['pathname'];
