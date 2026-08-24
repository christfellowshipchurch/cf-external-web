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

import { ContentItemHit } from '~/routes/search/types';
import { Icon } from '~/primitives/icon/icon';
import { cn } from '~/lib/utils';
import { createInstantSearchUrlSync } from '~/components/finders/instant-search-url-sync/create-instant-search-url-sync';
import { RefinementPills } from '~/components/finders/refinement-pills/refinement-pills.component';
import { ArticleCard } from '../components/article-card.component';
import { useScrollToSearchResultsOnLoad } from '~/hooks/use-scroll-to-search-results-on-load';
import { useAlgoliaUrlSync } from '~/hooks/use-algolia-url-sync';

import type { AllArticlesReturnType } from '../loader';
import {
  ALL_ARTICLES_CATEGORY_FACET,
  ALL_ARTICLES_HITS_PER_PAGE,
  ALL_ARTICLES_TYPE_FILTER,
} from '../all-articles.constants';
import {
  type AllArticlesUrlState,
  parseAllArticlesUrlState,
  allArticlesUrlStateToParams,
} from '../all-articles-url-state';

/**
 * SSR-hydrated hub flow:
 *
 * - The route loader gets InstantSearch server state for SSR/first paint.
 * - InstantSearch hydrates that state without repeating the initial search.
 * - Filter and pagination changes update InstantSearch first, then `onStateChange`
 *   mirrors those changes into the existing route URL format.
 * - `shouldRevalidate` on the route prevents same-page query-string changes from
 *   re-running this loader, so subsequent searches stay client-side.
 */
export function AllArticles() {
  const {
    ALGOLIA_APP_ID,
    ALGOLIA_SEARCH_API_KEY,
    serverState,
    algoliaIndexes,
  } = useLoaderData<AllArticlesReturnType>();
  const articlesIndexName = algoliaIndexes.contentItems;
  const [searchParams, setSearchParams] = useSearchParams();

  const { InstantSearchUrlSync, buildUiState } =
    createInstantSearchUrlSync<AllArticlesUrlState>({
      indexName: articlesIndexName,
      parseUrlState: parseAllArticlesUrlState,
    });

  const AllArticlesInstantSearchSync = InstantSearchUrlSync;
  const buildAllArticlesInstantSearchUiState = buildUiState;

  const searchClient = useMemo(
    () => algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, {}),
    [ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY],
  );
  const initialUrlStateRef = useRef<AllArticlesUrlState>(
    parseAllArticlesUrlState(searchParams),
  );

  // Capture the first URL state once. `initialUiState` is only meant for the
  // first InstantSearch mount; later URL changes are handled by
  // `AllArticlesInstantSearchSync` instead of remounting the entire search tree.
  const initialUiState = useMemo(() => {
    const state = buildAllArticlesInstantSearchUiState(
      initialUrlStateRef.current,
    );
    return Object.keys(state).length > 0
      ? (state as Record<string, Record<string, unknown>>)
      : undefined;
  }, [buildAllArticlesInstantSearchUiState]);
  const { updateUrlIfChanged } = useAlgoliaUrlSync({
    searchParams,
    setSearchParams,
    toParams: allArticlesUrlStateToParams,
  });

  useScrollToSearchResultsOnLoad(searchParams, (params) => {
    const s = parseAllArticlesUrlState(params);
    return !!(
      (s.query?.trim?.()?.length ?? 0) > 0 ||
      (s.refinementList && Object.keys(s.refinementList).length > 0)
    );
  });

  return (
    <section className='relative pb-28 pt-8 md:pt-16 min-h-screen bg-white content-padding pagination-scroll-to'>
      <div className='relative max-w-screen-content mx-auto'>
        <InstantSearchSSRProvider {...serverState}>
          <InstantSearch
            indexName={articlesIndexName}
            searchClient={searchClient}
            initialUiState={initialUiState}
            onStateChange={({ uiState, setUiState }) => {
              setUiState(uiState);
              const indexState = uiState[articlesIndexName];
              if (!indexState) return;
              const index = indexState as Record<string, unknown>;

              // InstantSearch owns interactive state after hydration. This
              // adapter keeps the public URL contract stable for deep links,
              // browser navigation, and server loader parsing on full refresh.
              const nextUrlState: AllArticlesUrlState = {
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
            <AllArticlesInstantSearchSync />
            <Configure
              filters={ALL_ARTICLES_TYPE_FILTER}
              hitsPerPage={ALL_ARTICLES_HITS_PER_PAGE}
              distinct
            />
            <AllArticlesFilters />
            <AllArticlesInstantResults />
          </InstantSearch>
        </InstantSearchSSRProvider>
      </div>
    </section>
  );
}

function AllArticlesFilters() {
  const { items } = useRefinementList({
    attribute: ALL_ARTICLES_CATEGORY_FACET,
    limit: 50,
  });
  const { indexUiState, setIndexUiState } = useInstantSearch();
  const refinementList =
    (indexUiState.refinementList as Record<string, string[]>) ?? {};
  const selectedCategories = refinementList[ALL_ARTICLES_CATEGORY_FACET] ?? [];

  const setSingleCategory = (value: string | null) => {
    setIndexUiState((prev) => {
      const prevRefinementList =
        (prev.refinementList as Record<string, string[]>) ?? {};
      const nextRefinementList = { ...prevRefinementList };
      if (value == null) {
        delete nextRefinementList[ALL_ARTICLES_CATEGORY_FACET];
      } else {
        // The UI behaves like a menu/radio group, even though Algolia stores
        // facet refinements as arrays. Replacing the array keeps one active
        // category while preserving the standard `refinementList` state shape.
        nextRefinementList[ALL_ARTICLES_CATEGORY_FACET] = [value];
      }

      return {
        ...prev,
        // Any filter change should return to the first result page.
        page: 0,
        refinementList:
          Object.keys(nextRefinementList).length > 0
            ? nextRefinementList
            : undefined,
      };
    });
  };

  return (
    <div className='mb-4'>
      <RefinementPills
        items={items.map((item) => ({ value: item.value, label: item.label }))}
        selectedValues={selectedCategories}
        onSelect={(value) => setSingleCategory(value)}
        onRemove={() => setSingleCategory(null)}
      />
    </div>
  );
}

function AllArticlesInstantResults() {
  const { items: articleHits } = useHits<ContentItemHit>();
  const { status } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';
  const { currentRefinement, nbPages, isFirstPage, isLastPage, refine } =
    usePagination();

  return (
    <AllArticlesResultsLayout
      articleHits={articleHits}
      articlesNbPages={nbPages}
      articlesPage={currentRefinement}
      isFirstPage={isFirstPage}
      isLastPage={isLastPage}
      isLoading={isLoading}
      goToPage={(nextPage) => {
        // Pagination refines InstantSearch state; `onStateChange` above handles
        // writing the resulting 0-based page back into the route URL.
        refine(Math.max(0, nextPage));
        window.requestAnimationFrame(() => {
          const scrollTarget = document.querySelector('.pagination-scroll-to');
          scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }}
    />
  );
}

function AllArticlesResultsLayout({
  articleHits,
  articlesNbPages,
  articlesPage,
  isFirstPage,
  isLastPage,
  isLoading,
  goToPage,
}: {
  articleHits: ContentItemHit[];
  articlesNbPages: number;
  articlesPage: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  isLoading: boolean;
  goToPage: (nextPage: number) => void;
}) {
  return (
    <>
      {isLoading && articleHits.length === 0 && <AllArticlesLoadingSkeleton />}

      <div className='min-h-[320px]'>
        {articleHits.length === 0 && !isLoading ? (
          <p className='text-text-secondary text-center py-8'>
            No articles found. Try adjusting your filters or search.
          </p>
        ) : articleHits.length === 0 && isLoading ? null : (
          <div
            className={cn(
              'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-4 xl:gap-8! justify-center items-center',
              isLoading && 'opacity-60 pointer-events-none',
            )}
          >
            {articleHits.map((hit) => (
              <ArticleHit hit={hit} key={hit.objectID} />
            ))}
          </div>
        )}
      </div>

      {articlesNbPages > 1 && (
        <div className='flex items-center justify-start gap-4 mt-16'>
          <PaginationButton
            isDisabled={isFirstPage}
            onClick={() => goToPage(articlesPage - 1)}
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
            {articlesPage + 1}
          </PaginationButton>

          <PaginationButton
            isDisabled={isLastPage}
            onClick={() => goToPage(articlesPage + 1)}
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

const ArticleHit = ({ hit }: { hit: ContentItemHit }) => {
  return <ArticleCard article={hit} />;
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

const AllArticlesLoadingSkeleton = () => {
  return (
    <div className='flex flex-col gap-8 pt-8'>
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
