import type { ShouldRevalidateFunction } from 'react-router';

import { GroupFinderPage } from './group-finder';

export { action } from './action';
export { loader } from './loader';
export { meta } from './meta';

export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  formAction,
  defaultShouldRevalidate,
}) => {
  // Resource geocode action must not remount finder InstantSearch / loader data.
  if (formAction?.includes('/google-geocode')) {
    return false;
  }
  // Group finder is hybrid for now: loader seeds first paint, then same-page
  // filter/query/page URL changes are handled by client-side InstantSearch.
  if (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  ) {
    return false;
  }

  return defaultShouldRevalidate;
};

export default GroupFinderPage;
