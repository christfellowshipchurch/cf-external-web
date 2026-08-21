import type { LoaderFunctionArgs } from 'react-router';

import { AuthenticationError } from '~/lib/.server/error-types';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';
import { ContentItemIds } from '~/lib/rock-config';

import { parseGroupFinderUrlState } from './group-finder-url-state';
import {
  getGroupFinderServerState,
  type GroupFinderServerState,
} from './group-finder-server-state.server';

export type LoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  serverState: GroupFinderServerState;
  minMaxAgeValues: string[];
  /** Campus name -> campus city, for group cards whose groups have no meeting location. */
  campusCityByName: Record<string, string>;
  /** True when Rock ContentChannelItem 21402 is within its active date window and approved. */
  showGroupsLaunchNotify: boolean;
};

type CampusCityHit = {
  campusName?: string;
  campusLocation?: { city?: string };
};

/**
 * Initial Algolia fetch for group finder.
 * This seeds first paint from the loader; after hydration, InstantSearch uses
 * the client search key for interactive filtering/searching on this page.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  let serverState: GroupFinderServerState = { initialResults: {} };
  let minMaxAgeValues: string[] = [];
  const campusCityByName: Record<string, string> = {};
  let showGroupsLaunchNotify = false;
  const url = new URL(request.url);

  // The loader owns first paint and deep links. Once hydrated, same-page filter
  // changes are handled by InstantSearch, but a full request must still reflect
  // the URL so shared links and refreshes render correctly.
  const urlState = parseGroupFinderUrlState(url.searchParams);

  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'group-finder.loader',
  );

  try {
    // Campus cities are a card-display nicety; don't let a failure here drop
    // the group results, just fall back to campus names on the cards.
    const [facetRes, campusRes] = await Promise.all([
      client.searchSingleIndex({
        indexName: algoliaIndexes.groups,
        searchParams: {
          facets: ['minMaxAge'],
          hitsPerPage: 0,
          maxValuesPerFacet: 1000,
        },
      }),
      client
        .searchSingleIndex({
          indexName: algoliaIndexes.locations,
          searchParams: {
            query: '',
            hitsPerPage: 100,
            attributesToRetrieve: ['campusName', 'campusLocation.city'],
            attributesToHighlight: [],
          },
        })
        .catch((error) => {
          console.error('[group-finder] campus city fetch failed', error);
          return null;
        }),
    ]);
    minMaxAgeValues = Object.keys(facetRes.facets?.minMaxAge ?? {});

    for (const h of campusRes?.hits ?? []) {
      const campus = h as unknown as CampusCityHit;
      const name = campus.campusName?.trim();
      const city = campus.campusLocation?.city?.trim();
      if (name && city) campusCityByName[name] = city;
    }

    serverState = await getGroupFinderServerState({
      searchClient: client,
      indexName: algoliaIndexes.groups,
      urlState,
      minMaxAgeValues,
    });
  } catch (error) {
    console.error('[group-finder] Algolia loader fetch failed', error);
  }

  try {
    const notifyItem = await fetchRockData({
      endpoint: 'ContentChannelItems',
      queryParams: {
        $filter: `Id eq ${ContentItemIds.groupsLaunchNotify}`,
      },
      filterByDateRange: true,
      filterByStatusApproved: true,
    });
    showGroupsLaunchNotify = Boolean(notifyItem && !Array.isArray(notifyItem));
  } catch (error) {
    console.error('[group-finder] groups launch notify fetch failed', error);
  }

  return Response.json({
    // Expose only the search key needed by Algolia's browser client; interactive
    // filtering then continues client-side without re-running this loader.
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    serverState,
    minMaxAgeValues,
    campusCityByName,
    showGroupsLaunchNotify,
  } satisfies LoaderReturnType);
};
