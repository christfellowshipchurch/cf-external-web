import type { LoaderFunctionArgs } from 'react-router';

import { AuthenticationError } from '~/lib/.server/error-types';
import { createAuditedServerAlgoliaClient } from '~/lib/.server/algolia-request-audit.server';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import type { RockContentChannelItem } from '~/lib/types/rock-types';
import { createImageUrlFromGuid } from '~/lib/utils';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

import type { ClassHitType } from '../types';
import { buildClassFinderAlgoliaSearchParams } from './components/build-class-finder-algolia-search';
import { parseClassFinderUrlState } from './components/class-finder-url-state';

export type LoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  classHits: ClassHitType[];
  /** Cover images keyed by class URL slug (`pathName` / Rock `url` attribute). */
  rockCoverImagesByPath: Record<string, string>;
};

/** Rock Classes Defined Type (387) id used to source "I'm Interested" classes. */
const CLASSES_DEFINED_TYPE_ID = 387;

type RockClassDefinedValue = RockContentChannelItem & {
  value?: string;
  description?: string;
};

function rockAttr(item: RockClassDefinedValue, key: string): string {
  const v = item.attributeValues?.[key]?.value;
  return typeof v === 'string' ? v.trim() : '';
}

async function fetchRockClassDefinedValues(): Promise<RockClassDefinedValue[]> {
  try {
    const result = (await fetchRockData({
      endpoint: 'DefinedValues',
      queryParams: {
        $filter: `DefinedTypeId eq ${CLASSES_DEFINED_TYPE_ID} and IsActive eq true`,
        $orderby: 'Order',
        loadAttributes: 'expanded',
      },
      ttl: 300, // 5 min — admin toggles should propagate quickly
    })) as RockClassDefinedValue[] | RockClassDefinedValue | undefined;

    return Array.isArray(result) ? result : result ? [result] : [];
  } catch (error) {
    console.error('[class-finder] Rock defined values fetch failed', error);
    return [];
  }
}

/** Rock 387 is the source of truth for class card cover art (keyed by `url`). */
function buildRockCoverImagesByPath(
  items: RockClassDefinedValue[],
): Record<string, string> {
  const coverImagesByPath: Record<string, string> = {};

  for (const item of items) {
    const pathName = rockAttr(item, 'url');
    const imageGuid = rockAttr(item, 'image');
    if (!pathName || !imageGuid) continue;

    coverImagesByPath[pathName] = createImageUrlFromGuid(imageGuid);
  }

  return coverImagesByPath;
}

/**
 * Initial Algolia fetch for `/class-finder`.
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

  let classHits: ClassHitType[] = [];

  const url = new URL(request.url);

  // Direct links with ?q=/refinement params should render the matching class
  // cards on first paint. Same-route param changes after hydration are handled
  // by InstantSearch, but a full request still needs to honor the URL.
  const urlState = parseClassFinderUrlState(url.searchParams);

  const client = createAuditedServerAlgoliaClient(
    appId,
    searchApiKey,
    'class-finder.loader',
  );

  try {
    const built = buildClassFinderAlgoliaSearchParams(
      urlState,
      algoliaIndexes.classes,
    );
    const { indexName, ...indexSearchParams } = built;

    const res = await client.searchSingleIndex({
      indexName,
      searchParams: indexSearchParams,
    });

    classHits = (res.hits ?? []).map((h) => h as unknown as ClassHitType);
  } catch (error) {
    console.error('[class-finder] Algolia loader fetch failed', error);
  }

  const rockClassDefinedValues = await fetchRockClassDefinedValues();
  const rockCoverImagesByPath = buildRockCoverImagesByPath(
    rockClassDefinedValues,
  );

  return Response.json({
    // The browser receives the search-only key so the hydrated InstantSearch
    // tree can own subsequent filtering without posting back to this loader.
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    classHits,
    rockCoverImagesByPath,
  } satisfies LoaderReturnType);
};
