import { fetchDefinedValuesByAttribute } from '~/lib/.server/rock-defined-values';
import type { LoaderFunctionArgs } from 'react-router';

import { algoliasearch } from 'algoliasearch';

import { AuthenticationError } from '~/lib/.server/error-types';
import { getServerAlgoliaIndexes } from '~/lib/.server/algolia-indexes.server';
import type { RockContentChannelItem } from '~/lib/types/rock-types';
import { createImageUrlFromGuid } from '~/lib/utils';
import type { GroupType } from '~/routes/group-finder/types';
import type { AlgoliaIndexMap } from '~/lib/algolia-indexes';

import type { ClassHitType } from '../types';
import { CLASS_INTEREST_TOGGLE_ATTRIBUTE_KEY } from '../constants';
import { filterScheduledClassSessions } from '../class-session.utils';
import {
  buildClassSingleGroupsSearchParams,
  buildClassSingleHeroSearchParams,
  buildClassSingleUpcomingSearchParams,
} from './components/build-class-single-algolia-search';
import { parseClassSingleUrlState } from './class-single-url-state';

export type LoaderReturnType = {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  algoliaIndexes: AlgoliaIndexMap;
  classUrl: string;
  classHit: ClassHitType | null;
  upcomingHits: ClassHitType[];
  groupHits: GroupType[];
  discussionGuideUrl: string;
  classTrailer: string;
  onDemandUrl: string;
  /**
   * Hero display fields resolved Rock-first (Defined Type 387), falling back to
   * the Algolia hero hit when the Rock attribute is empty. This lets content
   * editors drive the class page from Rock without a deploy, while preserving
   * existing content for classes not yet populated in the Defined Type.
   */
  heroTitle: string;
  heroSummary: string;
  heroCoverImageUri: string;
  /** Rock 387 "I'm Interested" toggle; gates the interest banner when no sessions. */
  isInterestEnabled: boolean;
  /** Rock Defined Value GUID for this class — passed as `classPreference` member attribute on sign-up. */
  classDefinedValueGuid: string;
};

/**
 * Defined Value from Rock Classes Defined Type (387). Adds the top-level
 * `value` (class name) and `description` (the native Defined Value description,
 * shown as the "Description" column in Rock admin) that the generic
 * content-item type omits; custom attribute values arrive under
 * `attributeValues` post-normalize.
 */
type RockClassDefinedValue = RockContentChannelItem & {
  value?: string;
  description?: string;
  guid?: string;
};

function rockStringAttr(
  item: RockContentChannelItem | null | undefined,
  key: string,
): string {
  const v = item?.attributeValues?.[key]?.value;
  return typeof v === 'string' ? v.trim() : '';
}

/** Rock boolean attributes come back as strings ("True"/"False"/"1"/""). */
function rockBoolAttr(
  item: RockContentChannelItem | null | undefined,
  key: string,
): boolean {
  const v = rockStringAttr(item, key).toLowerCase();
  return v === 'true' || v === '1';
}

/**
 * Initial Algolia fetch for class-single:
 * 1. Hero class by URL path (`pathName`)
 * 2. Upcoming sessions for that class type + filter URL (incl. lat/lng)
 * 3. Related groups mirroring the same refinements/geo
 *
 * This seeds first paint. After hydration, Filter Sessions and related groups
 * use client-side InstantSearch for interaction on this route.
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  const classUrl = params.path || '';

  if (!classUrl) {
    throw new Error('Class not found');
  }

  const appId = process.env.ALGOLIA_APP_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndexes = getServerAlgoliaIndexes();

  if (!appId || !searchApiKey) {
    throw new AuthenticationError('Algolia credentials not found');
  }

  let discussionGuideUrl = '';
  let classTrailer = '';
  let onDemandUrl = '';
  let rockTitle = '';
  let rockSummary = '';
  let rockCoverImageUri = '';
  let isInterestEnabled = false;
  let classDefinedValueGuid = '';

  try {
    const classData = (await fetchDefinedValuesByAttribute({
      endpoint: 'DefinedValues/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Url',
        value: classUrl,
        loadAttributes: 'expanded',
        $top: '1',
      },
      ttl: 300,
    })) as RockClassDefinedValue | undefined;

    if (classData) {
      discussionGuideUrl = rockStringAttr(classData, 'discussionGuide');
      classTrailer = rockStringAttr(classData, 'classTrailer');
      onDemandUrl = rockStringAttr(classData, 'onDemandSignUpLink');
      rockTitle = classData.value?.trim() ?? '';
      rockSummary = classData.description?.trim() ?? '';
      const imageGuid = rockStringAttr(classData, 'image');
      rockCoverImageUri = imageGuid ? createImageUrlFromGuid(imageGuid) : '';
      isInterestEnabled = rockBoolAttr(
        classData,
        CLASS_INTEREST_TOGGLE_ATTRIBUTE_KEY,
      );
      classDefinedValueGuid = classData.guid ?? '';
    }
  } catch (error) {
    console.warn('Failed to load class data from Rock:', error);
  }

  let classHit: ClassHitType | null = null;
  let upcomingHits: ClassHitType[] = [];
  let groupHits: GroupType[] = [];

  const url = new URL(request.url);

  // Deep-linked filters should affect the initial server-rendered session and
  // related-group carousels. After hydration, the same URL shape is maintained
  // by client-side InstantSearch for interactions.
  const urlState = parseClassSingleUrlState(url.searchParams);
  const client = algoliasearch(appId, searchApiKey, {});

  try {
    const heroBuilt = buildClassSingleHeroSearchParams(
      classUrl,
      algoliaIndexes.classes,
    );
    const { indexName: heroIndex, ...heroParams } = heroBuilt;
    const heroRes = await client.searchSingleIndex({
      indexName: heroIndex,
      searchParams: heroParams,
    });

    const firstHit = heroRes.hits?.[0];
    if (firstHit) {
      classHit = firstHit as unknown as ClassHitType;
      const classType = classHit.classType?.trim() ?? '';

      if (classType) {
        // The class type from the hero hit is the canonical value used to scope
        // upcoming sessions and related groups; the route slug can differ from
        // the Algolia classType label shown to users.
        const upcomingBuilt = buildClassSingleUpcomingSearchParams(
          urlState,
          classType,
          algoliaIndexes.classes,
        );
        const groupsBuilt = buildClassSingleGroupsSearchParams(
          urlState,
          classType,
          algoliaIndexes.groups,
        );

        const { indexName: upcomingIndex, ...upcomingParams } = upcomingBuilt;
        const { indexName: groupsIndex, ...groupsParams } = groupsBuilt;

        const [upcomingRes, groupsRes] = await Promise.all([
          client.searchSingleIndex({
            indexName: upcomingIndex,
            searchParams: upcomingParams,
          }),
          client.searchSingleIndex({
            indexName: groupsIndex,
            searchParams: groupsParams,
          }),
        ]);

        upcomingHits = filterScheduledClassSessions(
          (upcomingRes.hits ?? []).map((h) => h as unknown as ClassHitType),
        );
        groupHits = (groupsRes.hits ?? []).map(
          (h) => h as unknown as GroupType,
        );
      }
    }
  } catch (error) {
    console.error('[class-single] Algolia loader fetch failed', error);
  }

  // For interest-only classes (in Rock but not yet in Algolia), build a minimal
  // synthetic hit so the page renders. classType drives the upcoming/groups
  // Algolia searches — using rockTitle is fine because those will return empty
  // (the class has no sessions), which is the correct state for these pages.
  if (!classHit && rockTitle) {
    classHit = {
      objectID: `rock-${classUrl}`,
      title: rockTitle,
      classType: rockTitle,
      pathName: classUrl,
      summary: rockSummary,
      coverImage: rockCoverImageUri
        ? { sources: [{ uri: rockCoverImageUri }] }
        : { sources: [] },
      campus: '',
      groupId: 0,
      subtitle: '',
      topic: '' as ClassHitType['topic'],
      language: 'English',
      format: 'In-Person',
      schedule: '',
      startDate: '',
      endDate: '',
      _geoloc: { lat: 0, lng: 0 },
      isInterestOnly: true,
    } as unknown as ClassHitType;
  }

  // Rock Defined Type 387 is the authoritative source for hero content.
  // Summary and cover image come from Rock only (no Algolia fallback): when the
  // Defined Value lacks them, the page shows no "What to Expect" copy and hides
  // the hero image. Title still falls back to the Algolia hit. `classType` stays
  // Algolia-driven since it scopes the session/group searches above.
  const heroTitle = rockTitle || classHit?.classType || '';
  const heroSummary = rockSummary;
  const heroCoverImageUri = rockCoverImageUri;

  return {
    // Include the browser search credentials so hydrated filter changes can go
    // straight to Algolia without revalidating this route loader.
    ALGOLIA_APP_ID: appId,
    ALGOLIA_SEARCH_API_KEY: searchApiKey,
    algoliaIndexes,
    classUrl,
    classHit,
    upcomingHits,
    groupHits,
    discussionGuideUrl,
    classTrailer,
    onDemandUrl,
    heroTitle,
    heroSummary,
    heroCoverImageUri,
    isInterestEnabled,
    classDefinedValueGuid,
  };
}
