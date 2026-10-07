import { Link, useRouteLoaderData } from 'react-router';
import type { RootLoaderData } from '~/routes/navbar/loader';

/** Fallback when Algolia Analytics top hits are not yet available (e.g. before Premium plan). */
const FALLBACK_POPULAR_RESULTS: { title: string; pathname: string }[] = [
  { title: 'Events', pathname: '/events' },
  { title: 'Messages', pathname: '/messages' },
  { title: 'Group Finder', pathname: '/group-finder' },
  { title: 'Locations', pathname: '/locations' },
  { title: 'Give', pathname: '/give' },
  { title: 'Kids Ministry', pathname: '/ministries/kids' },
  { title: 'Students Ministry', pathname: '/ministries/students' },
  { title: 'Podcasts', pathname: '/podcasts' },
];

export const PopularSearches = ({
  onNavigate,
}: {
  /** Call when user clicks a result (e.g. close search overlay). */
  onNavigate?: () => void;
}) => {
  const rootData = useRouteLoaderData('root') as RootLoaderData | undefined;
  const fromApi = rootData?.popularResults ?? [];
  const popularResults =
    fromApi.length > 0 ? fromApi : FALLBACK_POPULAR_RESULTS;

  return (
    <div className='flex flex-col'>
      <h2 className='text-xl text-dark-navy font-extrabold leading-none'>
        Popular Searches
      </h2>
      <ul className='mt-2'>
        {popularResults.map((item) => (
          <li key={`${item.pathname}-${item.title}`}>
            <Link
              to={`/${item.pathname.replace(/^\//, '')}`}
              onClick={onNavigate}
              className='block w-full text-left py-4 border-b border-[#E0E0E0] text-black font-medium hover:text-navy transition-colors'
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
