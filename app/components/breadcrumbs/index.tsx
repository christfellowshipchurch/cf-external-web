import { Link, useLocation } from 'react-router';
import Icon from '~/primitives/icon';

interface BreadcrumbsProps {
  mode?: 'light' | 'dark';
}

/**
 * Explicit ASCII slug → breadcrumb display label.
 *
 * Breadcrumb text is URL-derived (capitalize the path segment). That cannot
 * invent accents: `/ministries/espanol` would otherwise show "Espanol". Putting
 * `ñ` in the Rock Pathname also breaks the ministry loader (exact Pathname
 * match), so keep the ASCII URL and override display here only.
 *
 * Add entries sparingly when a slug needs characters capitalization cannot restore.
 */
const BREADCRUMB_SLUG_LABELS: Record<string, string> = {
  espanol: 'Español',
};

/** Prefer a slug map label; otherwise decode + title-case hyphenated segments. */
function breadcrumbLabelFromSegment(segment: string): string {
  const decoded = decodeURIComponent(segment);
  const mapped = BREADCRUMB_SLUG_LABELS[decoded.toLowerCase()];
  if (mapped) return mapped;

  return decoded
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function Breadcrumbs({ mode = 'dark' }: BreadcrumbsProps) {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  const textColor = mode === 'dark' ? 'text-neutral-700' : 'text-neutral-300';

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
    const isCurrentPage = index === pathSegments.length - 1;
    const label = breadcrumbLabelFromSegment(segment);

    return (
      <div
        key={path}
        className={`flex items-center gap-1 md:gap-4 ${textColor}`}
      >
        <Icon
          id='breadcrumbs-caret'
          className='text-ocean min-w-[20px] block'
          size={20}
          name='caretRight'
        />
        {isCurrentPage ? (
          <span className='text-sm line-clamp-2' aria-current='page'>
            {label}
          </span>
        ) : (
          <Link to={path}>
            <span className='hover:underline text-sm line-clamp-2'>
              {label}
            </span>
          </Link>
        )}
      </div>
    );
  });

  return (
    <div className={`flex items-center gap-4 ${textColor}`}>
      <Link to='/'>
        <span
          className={`hover:underline text-sm ${
            mode == 'dark' ? 'text-neutral-500' : 'text-neutral-400'
          }`}
        >
          Home
        </span>
      </Link>
      {breadcrumbs}
    </div>
  );
}
