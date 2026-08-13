import type { ShouldRevalidateFunction } from 'react-router';

import { ClassFinderPage } from './finder/class-finder';

export { loader } from './finder/loader';
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
  // Class finder is intentionally hybrid for now: loader seeds first paint, then
  // same-page query-string changes are handled by client-side InstantSearch.
  if (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  ) {
    return false;
  }

  return defaultShouldRevalidate;
};

export default ClassFinderPage;
