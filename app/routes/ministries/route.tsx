import type { ShouldRevalidateFunction } from 'react-router';
import { useLoaderData } from 'react-router-dom';

import { AllMinistriesPartial } from './all-ministries/partials/all-ministries.partial';
import type { Ministry } from './loader';

export { loader } from './loader';
export { meta } from './meta';

/**
 * Category pills only change the query string, and filtering happens client-side
 * over the ministries the loader already returned. Skipping revalidation keeps a
 * pill click from re-running the Rock fetch, matching the articles/events hubs.
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  if (
    currentUrl.pathname === nextUrl.pathname &&
    currentUrl.search !== nextUrl.search
  ) {
    return false;
  }

  return defaultShouldRevalidate;
};

export default function AllMinistriesPage() {
  const { ministries } = useLoaderData<{ ministries: Ministry[] }>();

  return <AllMinistriesPartial ministries={ministries} />;
}
