import { Link } from 'react-router-dom';

import { getSummarySnippet } from '~/lib/utils';
import type { Ministry } from '../../loader';

/**
 * Finder card for the `/ministries` grid.
 *
 * One DOM tree covers both designed layouts: a horizontal row with an 80px
 * thumbnail on mobile, flipping to the stacked media-on-top card from `md` up.
 * Kept local to the route because the shared `MinistryCard` primitive is still
 * used by the series-resources carousel and must stay stacked at every width.
 */
export function MinistryFinderCard({
  title,
  description,
  image,
  url,
}: Ministry) {
  const isExternalLink = url.startsWith('http');

  const cardClassName =
    'flex h-full flex-row items-center gap-3 overflow-hidden rounded-xl border-[1.25px] border-neutral-lighter bg-white p-3 transition-transform duration-300 hover:-translate-y-1 md:flex-col md:items-stretch md:gap-0 md:p-0';

  const mediaClassName =
    'size-20 shrink-0 rounded-lg bg-ocean/8 object-cover md:aspect-video md:size-auto md:w-full md:rounded-none';

  const cardContent = (
    <>
      {image ? (
        <img
          src={`${image}&quality=20`}
          alt={title}
          className={mediaClassName}
        />
      ) : (
        <div className={mediaClassName} aria-hidden />
      )}
      <div className='flex min-w-0 flex-1 flex-col gap-1 md:gap-2 md:p-5'>
        <h3 className='truncate text-base font-bold leading-tight md:text-lg'>
          {title}
        </h3>
        <p className='line-clamp-2 text-[13px] leading-[1.4] text-text-secondary md:line-clamp-1 md:text-[15px]'>
          {getSummarySnippet(description)}
        </p>
      </div>
    </>
  );

  return isExternalLink ? (
    <a
      href={url}
      target='_blank'
      rel='noopener noreferrer'
      className={cardClassName}
    >
      {cardContent}
    </a>
  ) : (
    <Link to={url} prefetch='intent' className={cardClassName}>
      {cardContent}
    </Link>
  );
}
