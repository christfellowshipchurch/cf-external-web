import { Configure, InstantSearch } from 'react-instantsearch';
import { useMemo, useState } from 'react';
import { GroupHit } from '../../group-finder/components/group-hit.component';
import { useLoaderData } from 'react-router';
import { LoaderReturnType } from '../loader';
import { CardCarousel } from '~/components/resource-carousel';
import {
  GroupLanguage,
  GroupType,
  splitGroupTopics,
} from '~/routes/group-finder/types';
import { createSearchClient } from '~/lib/create-search-client';
import { escapeAlgoliaFilterString } from '~/components/finders/finder-algolia.utils';
import { CollectionItem } from '~/routes/page-builder/types';
import { GetHits } from '~/components/get-hits';

// Custom component to use hits data with ResourceCarousel
function RelatedGroupsHits({
  hits,
  currentGroupName,
}: {
  hits: GroupType[];
  currentGroupName?: string;
}) {
  // Filter out the current group from the results
  const filteredItems = hits.filter(
    (item) => !currentGroupName || item.title !== currentGroupName,
  );

  // Wrapper component to adapt resource prop to hit prop
  const HitComponentWrapper = ({ resource }: { resource: CollectionItem }) => {
    return <GroupHit hit={resource as unknown as GroupType} />;
  };

  return (
    <CardCarousel
      CardComponent={HitComponentWrapper}
      resources={filteredItems as unknown as CollectionItem[]}
      mode='light'
      layout='arrowsRight'
      /* Avoid clipping carousel chrome; viewport already clips slides via Embla. */
      carouselClassName='w-full min-w-0 max-w-full'
      carouselItemClassName='w-full max-w-[360px] md:max-w-[300px] lg:max-w-[333px] xl:max-w-[300px]'
    />
  );
}

export function RelatedGroupsPartial({
  topics,
  language,
  currentGroupName,
}: {
  /** `topics` field from the group Algolia record. */
  topics: GroupType['topics'];
  /** Current group's language; used to keep related groups in the same language. */
  language?: GroupLanguage | '';
  currentGroupName?: string;
}) {
  const [hits, setHits] = useState<GroupType[]>([]);
  const topicTags = splitGroupTopics(topics);

  // Filter related groups by topic and (when set) language. Groups without a
  // language attribute fall back to topic-only matching.
  const filters =
    [
      topicTags[0] && `topics:"${escapeAlgoliaFilterString(topicTags[0])}"`,
      language && `language:"${escapeAlgoliaFilterString(language)}"`,
    ]
      .filter(Boolean)
      .join(' AND ') || undefined;

  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, algoliaIndexes } =
    useLoaderData<LoaderReturnType>();
  const groupIndexName = algoliaIndexes.groups;

  const searchClient = useMemo(
    () => createSearchClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );

  return (
    <InstantSearch
      indexName={groupIndexName}
      searchClient={searchClient}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      <Configure filters={filters} hitsPerPage={6} />
      <GetHits setHits={setHits} />
      {hits.length > 1 ? (
        <div className='mt-20 w-full flex flex-col items-center bg-linear-to-b from-white to-[#EEE] pb-24'>
          <div className='w-full flex flex-col gap-6 md:gap-12'>
            <div className='content-padding w-full'>
              <div className='w-full flex justify-between items-center max-w-screen-content mx-auto'>
                <h2 className='text-lg md:text-[28px] lg:text-[32px] font-extrabold'>
                  Related Groups
                </h2>
              </div>
            </div>

            <div className='pl-5 md:pl-12 lg:pl-18 lg:pr-18 w-full'>
              <div className='flex w-full min-w-0 gap-4 overflow-x-hidden mx-auto max-w-screen-content'>
                {/* Results using ResourceCarousel */}
                <RelatedGroupsHits
                  hits={hits}
                  currentGroupName={currentGroupName}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='bg-white w-full h-full py-10' />
      )}
    </InstantSearch>
  );
}
