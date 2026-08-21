import type { ComponentProps } from 'react';
import { renderToString } from 'react-dom/server';
import type { SearchClient } from 'algoliasearch';
import {
  Configure,
  getServerState,
  InstantSearch,
  useHits,
  usePagination,
  useRefinementList,
  useSearchBox,
} from 'react-instantsearch';

type RefinementListOptions = Parameters<typeof useRefinementList>[0];

function RefinementListCollector({
  options,
}: {
  options: RefinementListOptions;
}) {
  useRefinementList(options);
  return null;
}

function FinderServerWidgets({
  refinementLists,
  collectPagination,
}: {
  refinementLists: RefinementListOptions[];
  collectPagination: boolean;
}) {
  useHits();
  return (
    <>
      <SearchBoxCollector />
      {collectPagination ? <PaginationCollector /> : null}
      {refinementLists.map((options) => (
        <RefinementListCollector key={options.attribute} options={options} />
      ))}
    </>
  );
}

function SearchBoxCollector() {
  useSearchBox();
  return null;
}

function PaginationCollector() {
  usePagination();
  return null;
}

export function getFinderServerState({
  searchClient,
  indexName,
  initialUiState,
  configure,
  refinementLists = [],
  collectPagination = true,
}: {
  searchClient: SearchClient;
  indexName: string;
  initialUiState?: Record<string, Record<string, unknown>>;
  configure: ComponentProps<typeof Configure>;
  refinementLists?: RefinementListOptions[];
  collectPagination?: boolean;
}) {
  return getServerState(
    <InstantSearch
      indexName={indexName}
      searchClient={searchClient}
      initialUiState={initialUiState}
    >
      <Configure {...configure} />
      <FinderServerWidgets
        refinementLists={refinementLists}
        collectPagination={collectPagination}
      />
    </InstantSearch>,
    { renderToString },
  );
}

export type FinderServerState = Awaited<
  ReturnType<typeof getFinderServerState>
>;
