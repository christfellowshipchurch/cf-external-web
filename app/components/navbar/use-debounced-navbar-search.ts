import { useCallback, useEffect, useRef } from 'react';

export const NAVBAR_SEARCH_DEBOUNCE_MS = 250;

export function useDebouncedNavbarSearch() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return useCallback((query: string, search: (value: string) => void) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(
      () => search(query),
      NAVBAR_SEARCH_DEBOUNCE_MS,
    );
  }, []);
}
