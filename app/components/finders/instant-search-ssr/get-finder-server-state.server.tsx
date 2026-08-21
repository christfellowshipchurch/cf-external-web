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
}: {
  refinementLists: RefinementListOptions[];
}) {
  useHits();
  usePagination();

  return refinementLists.map((options) => (
    <RefinementListCollector key={options.attribute} options={options} />
  ));
}

export function getFinderServerState({
  searchClient,
  indexName,
  initialUiState,
  configure,
  refinementLists = [],
}: {
  searchClient: SearchClient;
  indexName: string;
  initialUiState?: Record<string, Record<string, unknown>>;
  configure: ComponentProps<typeof Configure>;
  refinementLists?: RefinementListOptions[];
}) {
  return getServerState(
    <InstantSearch
      indexName={indexName}
      searchClient={searchClient}
      initialUiState={initialUiState}
    >
      <Configure {...configure} />
      <FinderServerWidgets refinementLists={refinementLists} />
    </InstantSearch>,
    { renderToString },
  );
}

export type FinderServerState = Awaited<
  ReturnType<typeof getFinderServerState>
>;
