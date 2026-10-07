import { useRef, useEffect } from 'react';
import type { SetURLSearchParams } from 'react-router';

/** See .github/ALGOLIA-URL-STATE-REUSABILITY.md § Pattern A steps 2, 5. */
export type UseAlgoliaUrlSyncOptions<T> = {
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  toParams: (state: T) => URLSearchParams;
  debounceMs?: number;
  replace?: boolean;
  preventScrollReset?: boolean;
};

export type UseAlgoliaUrlSyncReturn<T> = {
  debouncedUpdateUrl: (urlState: T) => void;
  cancelDebounce: () => void;
  updateUrlIfChanged: (urlState: T) => void;
};

/** See .github/ALGOLIA-URL-STATE-REUSABILITY.md § Pattern A steps 2, 5, 6. */
export function useAlgoliaUrlSync<T>({
  searchParams,
  setSearchParams,
  toParams,
  debounceMs = 400,
  replace = true,
  preventScrollReset = true,
}: UseAlgoliaUrlSyncOptions<T>): UseAlgoliaUrlSyncReturn<T> {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const updateUrlIfChanged = useRef((urlState: T) => {
    const nextParams = toParams(urlState);
    const nextString = nextParams.toString();
    const currentString = searchParamsRef.current.toString();
    if (nextString !== currentString) {
      setSearchParams(nextParams, { replace, preventScrollReset });
    }
  }).current;

  const debouncedUpdateUrl = useRef((urlState: T) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      updateUrlIfChanged(urlState);
    }, debounceMs);
  }).current;

  const cancelDebounce = useRef(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }).current;

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return {
    debouncedUpdateUrl,
    cancelDebounce,
    updateUrlIfChanged,
  };
}
