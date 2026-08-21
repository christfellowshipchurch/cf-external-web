import type { MetaFunction } from 'react-router-dom';
import { createMeta } from '~/lib/meta-utils';
import { loader } from './loader';
import type { LoaderReturnType } from './loader';

function isOnlineCampus(locationData: LoaderReturnType): boolean {
  return (
    locationData.campusUrl === 'cf-everywhere' ||
    locationData.campusName?.toLowerCase().includes('online') ||
    locationData.campusName?.toLowerCase().includes('everywhere')
  );
}

function isSpanishCampus(campusName: string): boolean {
  const normalized = campusName.toLowerCase();
  return normalized.includes('iglesia') || normalized.includes('español');
}

function spanishCampusLocation(campusName: string): string {
  return campusName
    .replace(/Christ Fellowship Español/i, '')
    .replace(/Iglesia/i, '')
    .trim();
}

function getLocationTitle(locationData: LoaderReturnType): string {
  const espanolCampusName = spanishCampusLocation(locationData.campusName);

  // Match by URL slug — campusName from the loader is "Trinity" (no trailing space).
  if (locationData.campusUrl === 'trinity') {
    return 'Trinity at Christ Fellowship Church in Palm Beach Gardens, FL | Christ Fellowship Church';
  }
  if (isOnlineCampus(locationData)) {
    return 'Christ Fellowship Church Online | Get the Most Out of Life';
  }
  if (isSpanishCampus(locationData.campusName)) {
    return `Christ Fellowship Español en ${espanolCampusName}, FL | Christ Fellowship Church`;
  }
  return `Christ Fellowship Church | ${locationData.campusName?.trim()}, FL`;
}

function getLocationDescription(locationData: LoaderReturnType): string {
  const espanolCampusName = spanishCampusLocation(locationData.campusName);

  if (locationData.campusUrl === 'trinity') {
    return 'Join us at Trinity at Christ Fellowship Church in Palm Beach Gardens, FL for uplifting worship and community.';
  }
  if (isOnlineCampus(locationData)) {
    return 'Experience Christ Fellowship Church online with worship, community, and resources to help you get the most out of life.';
  }
  if (isSpanishCampus(locationData.campusName)) {
    return `Únete a Christ Fellowship Español en ${espanolCampusName}, FL.`;
  }
  return `Looking for a church in ${locationData.campusName?.trim()}, FL? Visit Christ Fellowship this Sunday! Enjoy live worship music, biblical teachings, and programs for all ages.`;
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const locationData = data as LoaderReturnType | undefined;
  if (!locationData) {
    return [];
  }

  const keywords = isOnlineCampus(locationData)
    ? 'christ fellowship church online, online church service, church online, online worship service, watch church online, christian church online, non denominational church online, church service online'
    : `church in ${locationData.campusName} fl,  churches in ${locationData.campusName} fl, church in palm beach county, churches in palm beach county, christ fellowship church in ${locationData.campusName} fl, church near me, churches near me, church in my area, churches in my area, christian church near me, christian churches near me, non denominational church near me, non denominational churches near me, church service near me`;

  const campusImage = locationData.campusImage?.trim();

  return createMeta({
    title: getLocationTitle(locationData),
    description: getLocationDescription(locationData),
    keywords,
    path: `/locations/${locationData.campusUrl}`,
    image: campusImage || undefined,
  });
};
