import { useMemo, useState, useEffect } from 'react';
import {
  InstantSearch,
  Hits,
  Configure,
  useInstantSearch,
  useRefinementList,
} from 'react-instantsearch';
import { Icon } from '~/primitives/icon/icon';
import { Link, useLoaderData } from 'react-router';
import { ContentItemHit } from '~/routes/search/types';
import { createSearchClient } from '~/lib/create-search-client';
import { LoaderReturnType } from '../loader';

interface PodcastEpisodeListProps {
  ALGOLIA_APP_ID: string;
  ALGOLIA_SEARCH_API_KEY: string;
  indexName: string;
  podcastTitle: string;
}

const SeasonRefinementList = () => {
  const { items } = useRefinementList({ attribute: 'podcastSeasonNumber' });
  const { setIndexUiState } = useInstantSearch();
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);

  const sortedItems = useMemo(
    () =>
      items
        .map((item) => ({ ...item, label: `Season ${item.label}` }))
        .sort((a, b) => Number(b.value) - Number(a.value)),
    [items],
  );

  // Auto-select latest season when items first become available
  useEffect(() => {
    if (sortedItems.length > 0 && selectedSeason === null) {
      const latestSeason = sortedItems[0].value;
      setSelectedSeason(latestSeason);
      setIndexUiState((prevState) => ({
        ...prevState,
        refinementList: {
          ...prevState.refinementList,
          podcastSeasonNumber: [latestSeason],
        },
        page: 0,
      }));
    }
  }, [sortedItems, selectedSeason, setIndexUiState]);

  const handleSeasonClick = (season: string) => {
    setSelectedSeason(season);

    // Specific season
    setIndexUiState((prevState) => ({
      ...prevState,
      refinementList: {
        ...prevState.refinementList,
        podcastSeasonNumber: [season],
      },
      page: 0, // Reset to first page
    }));
  };

  return (
    <div className='flex gap-6 flex-nowrap px-1 pb-4 overflow-x-auto'>
      {/* Dynamic Season Tags */}
      {sortedItems.map((item) => (
        <button
          key={item.value}
          onClick={() => handleSeasonClick(item.value)}
          className={`px-6 py-3 rounded-full justify-center items-center flex whitespace-nowrap text-neutral-500 hover:bg-neutral-200 transition-colors duration-300 bg-white ${
            selectedSeason === item.value
              ? '!bg-ocean text-white rounded-full'
              : ''
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

const PodcastEpisodeHitComponent = ({ hit }: { hit: ContentItemHit }) => {
  const { podcast } = useLoaderData<LoaderReturnType>();
  const cardUrl = `/podcasts/${podcast.url}/${hit.url}`;

  return (
    <div className='flex flex-col pb-4 md:pb-0 gap-4 w-full min-w-3/4 md:min-w-0 md:w-[340px] lg:w-full'>
      <Link
        to={cardUrl || '/podcasts'}
        aria-label={`Play Episode: ${hit.title}`}
        className='group relative block overflow-hidden rounded-[0.5rem] md:w-[340px] lg:w-full'
      >
        <img
          src={
            hit.coverImage?.sources?.[0]?.uri ||
            '/assets/images/podcasts/hero.jpg'
          }
          alt={hit.title}
          className='w-full relative aspect-square md:w-[340px] lg:w-full object-cover rounded-[0.5rem] transition-transform duration-300 group-hover:scale-105'
        />
        <div
          className='absolute bottom-4 left-4 bg-white p-1 rounded-full hover:bg-gray-300 hover:scale-110 transition-all duration-300'
          style={{
            boxShadow:
              '0px 4px 8px -2px rgba(0, 0, 0, 0.20), 0px 2px 4px -2px rgba(0, 0, 0, 0.09)',
          }}
        >
          <Icon name='play' color='black' size={32} className='pl-1' />
        </div>
      </Link>
      <div className='flex flex-col gap-2'>
        <p className='text-sm text-text-secondary'>
          {hit.podcastSeasonNumber && `Season ${hit.podcastSeasonNumber}`} |
          Episode {hit.podcastEpisodeNumber || '1'}
        </p>
        <h3 className='text-lg font-bold'>{hit.title}</h3>
      </div>
    </div>
  );
};

export const PodcastEpisodeList = ({
  ALGOLIA_APP_ID,
  ALGOLIA_SEARCH_API_KEY,
  indexName,
  podcastTitle,
}: PodcastEpisodeListProps) => {
  const searchClient = useMemo(
    () => createSearchClient(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );

  const filter = `contentType:"Podcast" AND podcastShow:"${podcastTitle}"`;

  return (
    <InstantSearch
      indexName={indexName}
      searchClient={searchClient}
      future={{
        preserveSharedStateOnUnmount: true,
      }}
    >
      <Configure filters={filter} hitsPerPage={12} />

      {/* Season Filter */}
      <SeasonRefinementList />

      {/* Episodes Grid - newest first via client-side sort */}
      <Hits
        hitComponent={PodcastEpisodeHitComponent}
        transformItems={(hits) => {
          const now = new Date();
          // Filter out items with startDateTime > now, then sort newest-first
          return [...hits]
            .filter(
              (hit) =>
                new Date((hit as ContentItemHit).startDateTime).getTime() <=
                now.getTime(),
            )
            .sort(
              (a, b) =>
                new Date((b as ContentItemHit).startDateTime).getTime() -
                new Date((a as ContentItemHit).startDateTime).getTime(),
            );
        }}
        classNames={{
          list: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8',
        }}
      />
    </InstantSearch>
  );
};
