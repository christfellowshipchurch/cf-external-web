/** See .github/ALGOLIA-URL-STATE-REUSABILITY.md § Pattern B (routing). */

import type { RefObject } from 'react';
import type { VolunteerAlgoliaUrlState } from './volunteer-algolia-url-state';
import {
  parseVolunteerAlgoliaUrlState,
  volunteerAlgoliaUrlStateToParams,
} from './volunteer-algolia-url-state';

export type VolunteerAlgoliaRouterRefs = {
  searchParamsRef: RefObject<URLSearchParams>;
  setSearchParamsRef: RefObject<
    (
      params: URLSearchParams,
      options?: { replace?: boolean; preventScrollReset?: boolean },
    ) => void
  >;
  pathnameRef: RefObject<string>;
  onUpdateCallbackRef: RefObject<
    ((route: VolunteerAlgoliaUrlState) => void) | null
  >;
};

export function createVolunteerAlgoliaInstantSearchRouter(
  refs: VolunteerAlgoliaRouterRefs,
) {
  const {
    searchParamsRef,
    setSearchParamsRef,
    pathnameRef,
    onUpdateCallbackRef,
  } = refs;

  /**
   * InstantSearch often emits an empty uiState once before widgets hydrate from
   * `router.read()`. Writing that clears landing URL params; our searchParams →
   * onUpdate effect then wipes InstantSearch. Skip that first divergent write.
   *
   * Also ignore writes after dispose / after navigating away — the previous
   * page's InstantSearch can call `setSearchParams({})` against the new route.
   */
  let hasCompletedInitialWrite = false;
  let isDisposed = false;

  return {
    createURL(routeState: VolunteerAlgoliaUrlState): string {
      const params = volunteerAlgoliaUrlStateToParams(routeState);
      const qs = params.toString();
      const pathname = pathnameRef.current;
      return qs ? `${pathname}?${qs}` : pathname;
    },
    read(): VolunteerAlgoliaUrlState {
      return parseVolunteerAlgoliaUrlState(searchParamsRef.current);
    },
    write(routeState: VolunteerAlgoliaUrlState): void {
      if (isDisposed) return;

      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== pathnameRef.current
      ) {
        return;
      }

      const params = volunteerAlgoliaUrlStateToParams(routeState);
      const current = searchParamsRef.current?.toString() ?? '';
      if (params.toString() === current) {
        hasCompletedInitialWrite = true;
        return;
      }

      if (!hasCompletedInitialWrite) {
        hasCompletedInitialWrite = true;
        return;
      }

      setSearchParamsRef.current(params, {
        replace: true,
        preventScrollReset: true,
      });
    },
    onUpdate(callback: (route: VolunteerAlgoliaUrlState) => void): void {
      onUpdateCallbackRef.current = callback;
    },
    dispose(): void {
      isDisposed = true;
      onUpdateCallbackRef.current = null;
    },
  };
}

export function createVolunteerAlgoliaStateMapping(indexName: string) {
  return {
    stateToRoute(uiState: { [indexId: string]: Record<string, unknown> }) {
      const idx = uiState[indexName] || {};
      return {
        query: (idx.query as string) ?? undefined,
        refinementList:
          (idx.refinementList as Record<string, string[]>) ?? undefined,
      } as VolunteerAlgoliaUrlState;
    },
    routeToState(routeState: VolunteerAlgoliaUrlState) {
      return {
        [indexName]: {
          query: routeState.query,
          refinementList: routeState.refinementList ?? {},
        },
      };
    },
  };
}
