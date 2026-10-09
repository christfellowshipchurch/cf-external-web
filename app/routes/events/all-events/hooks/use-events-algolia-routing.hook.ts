import { useCallback, useMemo, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router';

import {
  eventsFinderEmptyState,
  eventsFinderUrlStateToParams,
  parseEventsFinderUrlState,
} from '../../events-url-state';
import type { EventsFinderUrlState } from '../../events-url-state';

export function useEventsAlgoliaRouting() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const eventsMobilePinEndRef = useRef<HTMLDivElement>(null);

  const urlState = useMemo(
    () => parseEventsFinderUrlState(searchParams),
    [searchParams],
  );

  const applyUrlState = useCallback(
    (next: EventsFinderUrlState) => {
      const nextParams = eventsFinderUrlStateToParams(next);
      if (nextParams.toString() === searchParams.toString()) {
        return;
      }
      setSearchParams(nextParams, {
        replace: true,
        preventScrollReset: true,
      });
    },
    [searchParams, setSearchParams],
  );

  const clearAllFiltersFromUrl = () => {
    setSearchParams(eventsFinderUrlStateToParams(eventsFinderEmptyState), {
      replace: true,
      preventScrollReset: true,
    });
  };

  const fromEventsUrl =
    location.pathname +
    (searchParams.toString() ? `?${searchParams.toString()}` : '');

  return {
    urlState,
    applyUrlState,
    searchParams,
    clearAllFiltersFromUrl,
    fromEventsUrl,
    eventsMobilePinEndRef,
  };
}
