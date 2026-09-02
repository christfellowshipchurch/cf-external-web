import { algoliasearch, SearchClient } from 'algoliasearch';
import { useEffect, useMemo, useRef } from 'react';
import { Configure, InstantSearch, SearchBox } from 'react-instantsearch';
import { useRouteLoaderData } from 'react-router-dom';
import Icon from '~/primitives/icon';
import { SearchPopup } from './search-popup.component';
import { RootLoaderData } from '~/routes/navbar/loader';
import { GlobalSearchLocationProvider } from '../../global-search-location-context';
import { suppressBlankNavbarSearches } from '../../navbar-search-client';
import { useDebouncedNavbarSearch } from '../../use-debounced-navbar-search';

// Create a stable search instance ID that persists between unmounts
const SEARCH_INSTANCE_ID = 'navbar-search';

// Global reference to maintain Algolia search client instance
let globalSearchClient: SearchClient | null = null;

const emptySearchClient = {
  search: () =>
    Promise.resolve({
      results: [
        {
          hits: [],
          nbHits: 0,
          page: 0,
          nbPages: 0,
          hitsPerPage: 0,
          exhaustiveNbHits: true,
          query: '',
          params: '',
          processingTimeMS: 0,
          index: 'empty',
        },
      ],
    }),
};

export const SearchBar = ({
  mode,
  isSearchOpen,
  setIsSearchOpen,
}: {
  mode: 'light' | 'dark';
  isSearchOpen: boolean;
  setIsSearchOpen: (isSearchOpen: boolean) => void;
}) => {
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const algolia = rootData?.algolia ?? {
    ALGOLIA_APP_ID: '',
    ALGOLIA_SEARCH_API_KEY: '',
    indexes: undefined,
  };
  const { ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY } = algolia;
  const contentItemsIndexName = algolia.indexes?.contentItems ?? '';
  const searchClient = useMemo(() => {
    if (ALGOLIA_APP_ID && ALGOLIA_SEARCH_API_KEY && !globalSearchClient) {
      globalSearchClient = algoliasearch(
        ALGOLIA_APP_ID,
        ALGOLIA_SEARCH_API_KEY,
        {},
      );
    }
    return globalSearchClient
      ? suppressBlankNavbarSearches(globalSearchClient, {
          contentType: rootData?.contentTypeFacets ?? {},
        })
      : (emptySearchClient as unknown as SearchClient);
  }, [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, rootData?.contentTypeFacets]);
  const queryHook = useDebouncedNavbarSearch();

  const searchBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isSearchOpen) return;

      const target = event.target as HTMLElement;

      // Don't close if clicking inside search bar
      if (searchBarRef.current?.contains(target as Node)) return;

      // Don't close if clicking inside search popup
      const searchPopup = document.querySelector('.popup-search-container');
      if (searchPopup?.contains(target as Node)) return;

      // Don't close if clicking on search button (to toggle)
      const isSearchButton = target
        .closest('button')
        ?.querySelector('svg[name="search"]');
      if (isSearchButton) return;

      // Don't close if clicking on Algolia search elements
      const isAlgoliaElement = [
        'ais-Hits',
        'ais-RefinementList',
        'ais-SearchBox',
      ].some((className) => target.closest(`.${className}`));
      if (isAlgoliaElement) return;

      // Close search for all other clicks (including navbar but outside search)
      setIsSearchOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsSearchOpen, isSearchOpen]);

  return (
    <div className='relative size-full' ref={searchBarRef}>
      <InstantSearch
        indexName={contentItemsIndexName}
        searchClient={searchClient}
        future={{
          preserveSharedStateOnUnmount: true,
        }}
        initialUiState={{
          [contentItemsIndexName]: {
            query: '',
          },
        }}
        insights={false}
        key={SEARCH_INSTANCE_ID}
      >
        <GlobalSearchLocationProvider>
          <Configure hitsPerPage={10} />

          <div className='flex w-full items-center pb-2 border-b border-neutral-lighter gap-4'>
            <button
              onClick={() => {
                setIsSearchOpen(false);
              }}
              className='flex items-center'
            >
              <Icon
                name='search'
                size={20}
                className={`text-ocean hover:text-neutral-default transition-colors cursor-pointer`}
              />
            </button>
            <SearchBox
              autoFocus
              queryHook={queryHook}
              classNames={{
                root: 'flex-grow',
                form: 'flex',
                input: `w-full justify-center ${
                  mode === 'light'
                    ? 'text-[#2F2F2F]'
                    : 'text-white group-hover:text-[#2F2F2F]'
                } px-3 outline-none appearance-none`,
                reset: 'hidden',
                resetIcon: 'hidden',
                submit: 'hidden',
              }}
            />
          </div>
          <SearchPopup setIsSearchOpen={setIsSearchOpen} />
        </GlobalSearchLocationProvider>
      </InstantSearch>
    </div>
  );
};
