import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { recordNavigation } from './navigation-history';

/**
 * Feeds `navigation-history` from React Router. Renders nothing and holds no
 * state of its own, so it is safe to mount once at the root and safe to delete.
 *
 * Troubleshooting: log inside the effect below to see every recorded location,
 * or call `getPreviousNavigationHref(location.pathname)` from a consumer to see
 * what it resolves to.
 */
export function NavigationHistoryTracker() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    recordNavigation(pathname, `${pathname}${search}${hash}`);
  }, [pathname, search, hash]);

  return null;
}
