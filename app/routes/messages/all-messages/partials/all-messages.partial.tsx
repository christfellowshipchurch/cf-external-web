import { useLoaderData, useSearchParams } from 'react-router-dom';
import { useMemo, useRef } from 'react';
import { liteClient as algoliasearch } from 'algoliasearch/lite';
import {
  Configure,
  InstantSearch,
  InstantSearchSSRProvider,
  useHits,
  useInstantSearch,
  usePagination,
  useRefinementList,
} from 'react-instantsearch';

import { SectionTitle } from '~/components';
import { RefinementPills } from '~/components/finders/refinement-pills/refinement-pills.component';
import { createInstantSearchUrlSync } from '~/components/finders/instant-search-url-sync/create-instant-search-url-sync';
import { ResourceCard } from '~/primitives/cards/resource-card';
import type { ContentItemHit } from '~/routes/search/types';
import { Icon } from '~/primitives/icon/icon';
import { cn, getFirstParagraph } from '~/lib/utils';
import { useScrollToSearchResultsOnLoad } from '~/hooks/use-scroll-to-search-results-on-load';
import { HubsTagsRefinementLoadingSkeleton } from '~/components/hubs-tags-refinement';
import { useAlgoliaUrlSync } from '~/hooks/use-algolia-url-sync';

import type { AllMessagesLoaderReturnType } from '../loader';
import {
  ALL_MESSAGES_GRID_HITS_PER_PAGE,
  MESSAGES_SERMON_FILTER,
  SERMON_PRIMARY_CATEGORY_FACET,
} from '../all-messages.constants';
import {
  type AllMessagesUrlState,
  parseAllMessagesUrlState,
  allMessagesUrlStateToParams,
} from '../all-messages-url-state';

/**
 * SSR-hydrated hub flow:
 *
 * - The loader gets InstantSearch server state for SSR/first paint.
 * - Current-series content remains loader-backed and independent of grid filters.
 * - Once hydrated, InstantSearch owns the message grid refinements and pagination.
 * - `onStateChange` mirrors InstantSearch state into the existing `/messages`
 *   URL schema so deep links and browser navigation continue to work.
 */
export function AllMessages() {
  const {
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY,
    serverState,
    algoliaIndexes,
  } = useLoaderData<AllMessagesLoaderReturnType>();
  const messagesIndexName = algoliaIndexes.contentItems;
  const [searchParams, setSearchParams] = useSearchParams();

  const { InstantSearchUrlSync, buildUiState } =
    createInstantSearchUrlSync<AllMessagesUrlState>({
      indexName: messagesIndexName,
      parseUrlState: parseAllMessagesUrlState,
    });

  const AllMessagesInstantSearchSync = InstantSearchUrlSync;
  const buildAllMessagesInstantSearchUiState = buildUiState;

  const searchClient = useMemo(
    () => algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, {}),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );
  const initialUrlStateRef = useRef<AllMessagesUrlState>(
    parseAllMessagesUrlState(searchParams),
  );

  // `initialUiState` is consumed only on the first InstantSearch mount. Keeping
  // this URL snapshot stable avoids resetting Algolia state on every query
  // string update; later URL changes are reconciled by AllMessagesInstantSearchSync.
  const initialUiState = useMemo(() => {
    const state = buildAllMessagesInstantSearchUiState(
      initialUrlStateRef.current,
    );
    return Object.keys(state).length > 0
      ? (state as Record<string, Record<string, unknown>>)
      : undefined;
  }, [buildAllMessagesInstantSearchUiState]);
  const { updateUrlIfChanged } = useAlgoliaUrlSync({
    searchParams,
    setSearchParams,
    toParams: allMessagesUrlStateToParams,
  });

  useScrollToSearchResultsOnLoad(searchParams, (params) => {
    const s = parseAllMessagesUrlState(params);
    return !!(
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      (s.refinementList && Object.keys(s.refinementList).length > 0)
    );
  });

  return (
    <section className='relative py-32 min-h-screen bg-white content-padding pagination-scroll-to'>
      <div className='relative max-w-screen-content mx-auto'>
        <SectionTitle
          className='mb8'
          sectionTitle='all messages'
          title='Christ Fellowship Church Messages'
        />

        <InstantSearchSSRProvider {...serverState}>
          <InstantSearch
            indexName={messagesIndexName}
            searchClient={searchClient}
            initialUiState={initialUiState}
            onStateChange={({ uiState, setUiState }) => {
              setUiState(uiState);
              const indexState = uiState[messagesIndexName];
              if (!indexState) return;
              const index = indexState as Record<string, unknown>;

              // Translate InstantSearch's index slice back into our route URL
              // shape instead of adopting InstantSearch's default routing format.
              const nextUrlState: AllMessagesUrlState = {
                query:
                  typeof index.query === 'string' &&
                  index.query.trim().length > 0
                    ? index.query
                    : undefined,
                refinementList:
                  (index.refinementList as Record<string, string[]>) ??
                  undefined,
                page:
                  typeof index.page === 'number' && index.page > 0
                    ? index.page
                    : undefined,
              };
              updateUrlIfChanged(nextUrlState);
            }}
            future={{ preserveSharedStateOnUnmount: true }}
          >
            <AllMessagesInstantSearchSync />
            <Configure
              filters={MESSAGES_SERMON_FILTER}
              hitsPerPage={ALL_MESSAGES_GRID_HITS_PER_PAGE}
            />
            <AllMessagesFilters />
            <AllMessagesInstantResults />
          </InstantSearch>
        </InstantSearchSSRProvider>
      </div>
    </section>
  );
}

function AllMessagesFilters() {
  const { items, refine } = useRefinementList({
    attribute: SERMON_PRIMARY_CATEGORY_FACET,
    limit: 50,
  });
  const selectedCategories = items
    .filter((item) => item.isRefined)
    .map((item) => item.value);

  const setSingleCategory = (value: string | null) => {
    // Algolia's refinement list is naturally multi-select. The hub UI is
    // intentionally single-select, so clear any existing category before
    // selecting the next one.
    const currentlyRefined = items.filter((item) => item.isRefined);
    currentlyRefined.forEach((item) => {
      if (value == null || item.value !== value) {
        refine(item.value);
      }
    });
    if (value == null) return;
    const next = items.find((item) => item.value === value);
    if (next && !next.isRefined) {
      refine(value);
    }
  };

  return (
    <div className='mt-10 mb-12'>
      <RefinementPills
        items={items.map((item) => ({ value: item.value, label: item.label }))}
        selectedValues={selectedCategories}
        onSelect={(value) => setSingleCategory(value)}
        onRemove={() => setSingleCategory(null)}
      />
    </div>
  );
}

function AllMessagesInstantResults() {
  const { items: messageHits } = useHits<ContentItemHit>();
  const { status } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';
  const { currentRefinement, nbPages, isFirstPage, isLastPage, refine } =
    usePagination();

  return (
    <AllMessagesResultsLayout
      messageHits={messageHits}
      messagesNbPages={nbPages}
      messagesPage={currentRefinement}
      isFirstPage={isFirstPage}
      isLastPage={isLastPage}
      isLoading={isLoading}
      goToPage={(nextPage) => {
        // Pagination is a client-side Algolia refinement. The route URL updates
        // through `onStateChange`, keeping loader revalidation disabled.
        refine(Math.max(0, nextPage));
        window.requestAnimationFrame(() => {
          const scrollTarget = document.querySelector('.pagination-scroll-to');
          scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }}
    />
  );
}

function AllMessagesResultsLayout({
  messageHits,
  messagesNbPages,
  messagesPage,
  isFirstPage,
  isLastPage,
  isLoading,
  goToPage,
}: {
  messageHits: ContentItemHit[];
  messagesNbPages: number;
  messagesPage: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  isLoading: boolean;
  goToPage: (nextPage: number) => void;
}) {
  return (
    <>
      {isLoading && messageHits.length === 0 && <AllMessagesLoadingSkeleton />}

      <div className='min-h-[320px]'>
        {messageHits.length === 0 && !isLoading ? (
          <p className='text-text-secondary text-center py-8'>
            No messages found. Try adjusting your filters or search.
          </p>
        ) : messageHits.length === 0 && isLoading ? null : (
          <div
            className={cn(
              'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-4 xl:gap-8! justify-center items-center',
              isLoading && 'opacity-60 pointer-events-none',
            )}
          >
            {messageHits.map((hit) => (
              <MessageHit hit={hit} key={hit.objectID} />
            ))}
          </div>
        )}
      </div>

      {messagesNbPages > 1 && (
        <div className='flex items-center justify-start gap-4 mt-16'>
          <PaginationButton
            isDisabled={isFirstPage}
            onClick={() => goToPage(messagesPage - 1)}
            href='#'
            className='w-12 h-12'
          >
            <Icon name='chevronLeft' size={24} />
          </PaginationButton>

          <PaginationButton
            isActive
            onClick={() => {}}
            href='#'
            className='w-12 h-12 bg-navy text-white'
          >
            {messagesPage + 1}
          </PaginationButton>

          <PaginationButton
            isDisabled={isLastPage}
            onClick={() => goToPage(messagesPage + 1)}
            href='#'
            className='w-12 h-12'
          >
            <Icon name='chevronRight' size={24} />
          </PaginationButton>
        </div>
      )}
    </>
  );
}

const MessageHit = ({ hit }: { hit: ContentItemHit }) => {
  const formattedDate = hit.startDateTime
    ? new Date(hit.startDateTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const imageUri = hit.coverImage?.sources?.[0]?.uri ?? '';

  return (
    <ResourceCard
      resource={{
        id: hit.objectID,
        contentChannelId: '63',
        contentType: 'MESSAGES',
        author:
          hit?.author?.firstName && hit?.author?.lastName
            ? `${hit.author.firstName} ${hit.author.lastName}`
            : 'Christ Fellowship Team',
        image: imageUri,
        name: hit.title,
        summary: hit.summary ?? getFirstParagraph(hit.htmlContent || ''),
        pathname: `/messages/${hit.url}`,
        startDate: formattedDate,
      }}
    />
  );
};

interface PaginationButtonProps {
  children: React.ReactNode;
  isDisabled?: boolean;
  isActive?: boolean;
  href: string;
  onClick: () => void;
  className?: string;
}

const PaginationButton = ({
  children,
  isDisabled = false,
  isActive = false,
  href,
  onClick,
  className = '',
}: PaginationButtonProps) => {
  if (isDisabled) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-200 cursor-not-allowed`}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`${className} inline-flex items-center justify-center border-2 ${
        isActive
          ? 'border-navy bg-navy text-white'
          : 'border-navy text-navy hover:bg-navy hover:text-white'
      } transition-colors duration-200 cursor-pointer`}
    >
      {children}
    </a>
  );
};

const AllMessagesLoadingSkeleton = () => {
  return (
    <div className='flex flex-col gap-8 pt-8'>
      <HubsTagsRefinementLoadingSkeleton />
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-4 xl:gap-8! justify-center items-center'>
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className='w-[460px] h-[360px] bg-gray-100 animate-pulse rounded-lg'
          />
        ))}
      </div>
    </div>
  );
};
