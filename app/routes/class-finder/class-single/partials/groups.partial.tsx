import { useMemo } from 'react';
import { useLoaderData } from 'react-router';
import {
  Configure,
  InstantSearch,
  useHits,
  useInstantSearch,
} from 'react-instantsearch';

import { escapeAlgoliaFilterString } from '~/components/finders/finder-algolia.utils';
import { createSearchClient } from '~/lib/create-search-client';
import { type GroupType } from '~/routes/group-finder/types';

import { ClassSingleGroupsCarousel } from '../components/class-single-groups-carousel.component';
import type { LoaderReturnType } from '../loader';
import { CLASS_SINGLE_UPCOMING_MAX_HITS } from '../components/build-class-single-algolia-search';

type ClassSingleInitialGroupsSectionProps = {
  groupHits: GroupType[];
  classUrl: string;
};

function classFormatToGroupMeetingType(format: string): string | null {
  if (format === 'Virtual') return 'Virtual';
  if (format === 'In-Person') return 'In Person';
  return null;
}

function classLanguageToGroupLanguage(lang: string): string | null {
  if (lang === 'English') return 'English';
  if (lang === 'Español' || lang === 'Spanish') return 'Spanish';
  return null;
}

function mirrorGroupsFacets(
  refinementList: Record<string, string[]>,
): string | undefined {
  const parts: string[] = [];

  // The visible filters operate on class-session attributes, while this section
  // queries the groups index. Translate the overlapping class refinements into
  // equivalent group filters so "Join a Group" follows the same user intent.
  const campuses = (refinementList.campus ?? []).filter(
    (v) => v != null && String(v).trim() !== '',
  );
  if (campuses.length === 1) {
    parts.push(`campusName:"${escapeAlgoliaFilterString(campuses[0])}"`);
  } else if (campuses.length > 1) {
    parts.push(
      `(${campuses.map((c) => `campusName:"${escapeAlgoliaFilterString(c)}"`).join(' OR ')})`,
    );
  }

  const formats = (refinementList.format ?? []).filter(
    (v) => v != null && String(v).trim() !== '',
  );
  const meetingTypes = [
    ...new Set(
      formats
        .map((f) => classFormatToGroupMeetingType(f))
        .filter((m): m is string => m != null),
    ),
  ];
  if (meetingTypes.length === 1) {
    parts.push(`meetingType:"${escapeAlgoliaFilterString(meetingTypes[0])}"`);
  } else if (meetingTypes.length > 1) {
    parts.push(
      `(${meetingTypes.map((m) => `meetingType:"${escapeAlgoliaFilterString(m)}"`).join(' OR ')})`,
    );
  }

  const languages = (refinementList.language ?? []).filter(
    (v) => v != null && String(v).trim() !== '',
  );
  const groupLanguages = [
    ...new Set(
      languages
        .map((l) => classLanguageToGroupLanguage(l))
        .filter((l): l is string => l != null),
    ),
  ];
  if (groupLanguages.length === 1) {
    parts.push(`language:"${escapeAlgoliaFilterString(groupLanguages[0])}"`);
  } else if (groupLanguages.length > 1) {
    parts.push(
      `(${groupLanguages.map((l) => `language:"${escapeAlgoliaFilterString(l)}"`).join(' OR ')})`,
    );
  }

  if (parts.length === 0) return undefined;
  return parts.join(' AND ');
}

function composeGroupsFilters(
  classesIndexClassType: string,
  mirroredFacetFilters: string | undefined,
): string | undefined {
  const trimmed = classesIndexClassType?.trim() ?? '';

  // Related groups should stay scoped to the class type first, then optionally
  // mirror format/campus/language filters from the sessions search.
  const classTypeFilter = trimmed
    ? `classType:"${escapeAlgoliaFilterString(trimmed)}"`
    : null;
  if (classTypeFilter && mirroredFacetFilters) {
    return `${classTypeFilter} AND ${mirroredFacetFilters}`;
  }
  if (classTypeFilter) return classTypeFilter;
  return mirroredFacetFilters;
}

/**
 * First-paint related groups from the loader. Hydrated filtering uses `ClassSingleGroupsSection`.
 */
export function ClassSingleInitialGroupsSection({
  groupHits,
  classUrl,
}: ClassSingleInitialGroupsSectionProps) {
  return (
    <ClassSingleGroupsCarouselSection
      groupHits={groupHits}
      classUrl={classUrl}
    />
  );
}

function ClassSingleGroupsCarouselSection({
  groupHits,
  classUrl,
}: ClassSingleInitialGroupsSectionProps) {
  if (groupHits.length === 0) {
    return null;
  }

  const backUrl = `/class-finder/${classUrl}`;
  const resetKey = groupHits.map((h) => h.objectID).join('|');

  return (
    <div className='w-full max-w-[1296px] mr-auto py-16 border-t border-neutral-lighter'>
      <div className='flex w-full flex-col items-center gap-4'>
        <h2 className='w-full text-2xl font-extrabold leading-[1.4]'>
          Join a Group
        </h2>
        <div className='flex w-full justify-center md:justify-start'>
          <ClassSingleGroupsCarousel
            hits={groupHits}
            resetKey={resetKey}
            backUrl={backUrl}
          />
        </div>
      </div>
    </div>
  );
}

function ClassSingleGroupsHits({
  initialGroupHits,
  classUrl,
}: {
  initialGroupHits: GroupType[];
  classUrl: string;
}) {
  const { items } = useHits<GroupType>();
  const { status } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';

  // This nested groups search starts after the parent sessions search has
  // mounted. Show the loader-provided groups until the client-side groups query
  // returns, matching the first paint while filters hydrate.
  const hits = isLoading && items.length === 0 ? initialGroupHits : items;

  return (
    <ClassSingleGroupsCarouselSection groupHits={hits} classUrl={classUrl} />
  );
}

export function ClassSingleGroupsSection({
  initialGroupHits,
  classUrl,
  classesIndexClassType,
  coordinates,
}: {
  initialGroupHits: GroupType[];
  classUrl: string;
  classesIndexClassType: string;
  coordinates: { lat: number | null; lng: number | null } | null;
}) {
  const { indexUiState } = useInstantSearch();
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<LoaderReturnType>();
  const groupIndexName = algoliaIndexes.groups;

  const searchClient = useMemo(
    () => createSearchClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );

  const refinementList = useMemo(
    () => (indexUiState.refinementList ?? {}) as Record<string, string[]>,
    [indexUiState.refinementList],
  );

  // Read the parent sessions InstantSearch state and use it to configure a
  // separate groups InstantSearch instance. The two indexes do not share schema,
  // so the mapping happens via `mirrorGroupsFacets` instead of reusing uiState.
  const configureFilters = useMemo(
    () =>
      composeGroupsFilters(
        classesIndexClassType,
        mirrorGroupsFacets(refinementList),
      ),
    [classesIndexClassType, refinementList],
  );

  const aroundLatLng =
    coordinates != null &&
    coordinates.lat != null &&
    coordinates.lng != null &&
    !Number.isNaN(coordinates.lat) &&
    !Number.isNaN(coordinates.lng)
      ? `${coordinates.lat}, ${coordinates.lng}`
      : undefined;

  return (
    <InstantSearch
      // This is an intentionally separate InstantSearch instance for the groups
      // index. It does not sync to URL; it mirrors the parent session filters
      // through Configure so group results remain contextual to the class page.
      key={`${classUrl}|${classesIndexClassType}`}
      indexName={groupIndexName}
      searchClient={searchClient}
      initialUiState={{
        [groupIndexName]: {
          query: '',
        },
      }}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      <Configure
        key={`${classesIndexClassType}|${configureFilters ?? ''}|${aroundLatLng ?? ''}`}
        hitsPerPage={CLASS_SINGLE_UPCOMING_MAX_HITS}
        query=''
        filters={configureFilters}
        aroundLatLng={aroundLatLng}
        aroundRadius='all'
        aroundLatLngViaIP={false}
        getRankingInfo={aroundLatLng != null}
      />
      <ClassSingleGroupsHits
        initialGroupHits={initialGroupHits}
        classUrl={classUrl}
      />
    </InstantSearch>
  );
}
