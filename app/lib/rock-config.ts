/**
 * Public Rock RMS web origin for browser links and iframe embeds.
 * Prefer this over `rock.gocf.org`, which may resolve to RFC1918 addresses and trigger Chrome PNA for embedded content.
 */
export const ROCK_PUBLIC_SITE_ORIGIN = 'https://rock.christfellowship.church';

const ROCK_INTERNAL_HOST = 'rock.gocf.org';

/**
 * Rock content (e.g. Algolia `registrationURL`) is sometimes authored against the
 * internal host, which external visitors cannot open.
 */
export function toPublicRockUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname.toLowerCase() !== ROCK_INTERNAL_HOST) return url;

  const publicOrigin = new URL(ROCK_PUBLIC_SITE_ORIGIN);
  parsed.protocol = publicOrigin.protocol;
  parsed.host = publicOrigin.host;
  return parsed.toString();
}

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

/**
 * Guid of each workflow type the forms launch, by its Id. Rock v2 paths take
 * a Guid; a type missing here launches on v1.
 */
/** v1's `Workflows/LaunchWorkflow/0` path. Pass the workflow name unencoded. */
export const rockV1LaunchWorkflowPath = (
  workflowTypeId: string,
  workflowName: string,
): string =>
  `Workflows/LaunchWorkflow/0?workflowTypeId=${workflowTypeId}&workflowName=${encodeURIComponent(workflowName)}`;

export const WorkflowTypeGuids: Record<string, string> = {
  '348': '2410c21e-37cc-4597-8f01-50a56736e98e', // Prayer Request Form
  '403': 'adbbd8e2-43a8-4f8b-8590-81ab03b27058', // Connect Card (Spanish)
  '419': '0cb578f8-1afe-40a3-a73b-9bc99bec6aea', // Need Help Finding a Group
  '654': '4df7b9ea-10a4-4987-bf47-dfe9d3adb5c1', // Add to Group/Classes
  '878': '8d5477da-a592-481f-b212-73f3b5dbf120', // Contact Us Form
  '902': 'e2d53231-0e45-4f7d-beb2-85a0f5c0a3c9', // Connect Card
  '936': '498aeaba-a934-4e50-b8a6-77723d1ab4b5', // Set a Reminder
  '1202': '97aa2a89-917c-4d73-8014-797e4459e673', // Newsletter Subscription
  '1465': '3fd2cf95-7b4c-415e-bc9f-6966331f5fcb', // Baptism Finder Sign Up
  '1568': '98615e2e-d75a-4a44-91fc-dcf4f468e654', // Dream Team Kickoff Sign Up
  '1644': 'e2a3b7c0-812d-40e7-85c9-3e59a46340b2', // Baptism Finder Sign Up (Spanish)
  '1833': '944de697-f14b-4b97-9eef-0662d29aca56', // Journey Finder Sign Up
  '1835': 'daeda7dc-dab5-48c8-b316-06ea11af35ae', // Journey Finder Sign Up (Spanish)
  '1840': '17f2ddea-bb94-4a28-8e86-f2358bc41524', // Community Serving Sign Up
  '1874': '0935cdb9-e1c5-4d39-a15b-4be787b66a22', // Help Me Find My Place (Share My Skills)
  '1941': '29543c34-293b-4725-92d5-e0a7d1254315', // Website Adult Group Signup (ROCK_GROUP_SIGNUP_WORKFLOW_ID)
  '1968': 'b9ab54a7-2898-4b98-9e41-75370b415270', // Journey Session Sign Up
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
