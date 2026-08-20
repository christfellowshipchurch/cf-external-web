/** Group Finder URL state. See .github/ALGOLIA-URL-STATE-REUSABILITY.md § Pattern A step 1. */

import { hasRefinementListValues } from '~/lib/algolia-active-filters';
import type { AlgoliaUrlStateBase } from '~/lib/algolia-url-state';
import { createAlgoliaUrlStateConfig } from '~/lib/algolia-url-state';

export const GROUP_FINDER_PARAMS = {
  QUERY: 'q',
  CAMPUS: 'campus',
  AGE: 'age',
  MEETING_TYPE: 'meetingType',
  GROUP_FOR: 'groupFor',
  PEOPLE_WHO_ARE: 'peopleWhoAre',
  TOPICS: 'topics',
  MEETING_DAYS: 'meetingDays',
  MEETING_FREQUENCY: 'meetingFrequency',
  ADULT_ONLY: 'adultOnly',
  LANGUAGE: 'language',
  PAGE: 'page',
  LAT: 'lat',
  LNG: 'lng',
} as const;

export type GroupFinderUrlState = AlgoliaUrlStateBase & {
  age?: string;
  /** 0-based Algolia page; omitted from URL on first page */
  page?: number;
  lat?: number;
  lng?: number;
};

const REFINEMENT_LIST_ATTRIBUTES = [
  'meetingType',
  'campusName',
  'groupFor',
  'peopleWhoAre',
  'minMaxAge',
  'topics',
  'meetingDay',
  'meetingFrequency',
  'adultsOnly',
  'language',
] as const;

const {
  parse: parseGroupFinderUrlState,
  toParams: groupFinderUrlStateToParams,
  emptyState: groupFinderEmptyState,
} = createAlgoliaUrlStateConfig<GroupFinderUrlState>({
  queryParamKey: GROUP_FINDER_PARAMS.QUERY,
  refinementAttributes: REFINEMENT_LIST_ATTRIBUTES,
  custom: {
    parse(params) {
      const state: Partial<GroupFinderUrlState> = {};
      const age = params.get(GROUP_FINDER_PARAMS.AGE);
      if (age) state.age = age;

      const rawPage = params.get(GROUP_FINDER_PARAMS.PAGE);
      if (rawPage) {
        const n = parseInt(rawPage, 10);
        if (Number.isFinite(n) && n >= 2) {
          state.page = n - 1;
        }
      }

      const latRaw = params.get(GROUP_FINDER_PARAMS.LAT);
      const lngRaw = params.get(GROUP_FINDER_PARAMS.LNG);
      if (latRaw != null && lngRaw != null) {
        const lat = Number.parseFloat(latRaw);
        const lng = Number.parseFloat(lngRaw);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          state.lat = lat;
          state.lng = lng;
        }
      }

      return state;
    },
    toParams(state, params) {
      if (state.age?.trim()) {
        params.set(GROUP_FINDER_PARAMS.AGE, state.age.trim());
      }
      const p = state.page;
      if (p != null && p > 0) {
        params.set(GROUP_FINDER_PARAMS.PAGE, String(p + 1));
      }
      if (
        state.lat != null &&
        state.lng != null &&
        Number.isFinite(state.lat) &&
        Number.isFinite(state.lng)
      ) {
        params.set(GROUP_FINDER_PARAMS.LAT, String(state.lat));
        params.set(GROUP_FINDER_PARAMS.LNG, String(state.lng));
      }
    },
  },
});

export {
  parseGroupFinderUrlState,
  groupFinderUrlStateToParams,
  groupFinderEmptyState,
};

/**
 * Whether the user has actually applied a filter — what the “Active Filters” bar
 * announces. `page` is deliberately excluded: pagination is navigation, not
 * filtering, and counting it made the bar claim filters were applied on page 2+.
 */
export function hasGroupFinderAppliedFilters(
  state: GroupFinderUrlState,
  coordinates?: { lat: number | null; lng: number | null } | null,
): boolean {
  if ((state.query?.trim()?.length ?? 0) > 0) return true;
  if (hasRefinementListValues(state.refinementList)) return true;
  if ((state.age?.trim().length ?? 0) > 0) return true;
  if (
    state.lat != null &&
    state.lng != null &&
    Number.isFinite(state.lat) &&
    Number.isFinite(state.lng)
  ) {
    return true;
  }
  if (coordinates?.lat != null && coordinates?.lng != null) return true;
  return false;
}

/**
 * Whether URL has anything “Clear All” should reset (group finder, URL-only mode).
 * Includes `page`, since clearing returns the user to the first page.
 */
export function hasGroupFinderUrlActiveFilters(
  state: GroupFinderUrlState,
): boolean {
  if (hasGroupFinderAppliedFilters(state)) return true;
  return state.page != null && state.page > 0;
}

/** @deprecated Use {@link hasGroupFinderUrlActiveFilters} — coordinates now live in URL. */
export function hasGroupFinderNonInstantSearchFilters(
  urlState: GroupFinderUrlState,
  coordinates: { lat: number | null; lng: number | null } | null,
): boolean {
  if (hasGroupFinderUrlActiveFilters(urlState)) return true;
  if (coordinates?.lat != null && coordinates?.lng != null) return true;
  return false;
}
