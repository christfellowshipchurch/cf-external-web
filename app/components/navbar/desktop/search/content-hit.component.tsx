import { Link } from 'react-router';
import Icon from '~/primitives/icon';
import { ContentItemHit } from '~/routes/search/types';
import { getDisplayContentType } from '../../search-utils';
import {
  getSearchHitPathname,
  resolveSearchHitLinkFromHit,
  type SearchHitContentType,
} from '../../search-hit-links';

export type ContentHitType = {
  url: string;
  title: string;
  contentType: string;
};

export type HitContentType = SearchHitContentType;

/** @deprecated Use {@link getSearchHitPathname} from `search-hit-links`. */
export const getPathname = (
  contentType: HitContentType,
  pathname: string,
  hit?: ContentItemHit,
): string => getSearchHitPathname(contentType, pathname, hit);

export function ContentHit({
  hit,
  query,
}: {
  hit: ContentItemHit;
  query: string | null;
}) {
  const iconName = getIconName(hit);
  const { to: hitPath, isExternal } = resolveSearchHitLinkFromHit(hit);

  const highlightQuery = (title: string, query: string | null) => {
    if (!query) return title;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = title.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className='bg-[#DAEAF1]'>
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const contentTypeLower = hit.contentType?.toLowerCase() || '';
  const shouldPrefetch =
    contentTypeLower !== 'page builder' &&
    contentTypeLower !== 'redirect card' &&
    hitPath !== '';

  const sharedClassName =
    'pr-8 py-2 flex gap-2 hover:translate-x-1 transition-transform duration-300';
  const content = (
    <>
      <Icon name={iconName} color='#666666' size={28} />
      <div className='flex flex-col'>
        <h3 className='text-sm font-semibold'>
          {highlightQuery(hit.title, query)}
        </h3>
        <p className='text-[10px] text-text-secondary font-medium'>
          {getDisplayContentType(hit.contentType)}
        </p>
      </div>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={hitPath}
        target='_blank'
        rel='noopener noreferrer'
        className={sharedClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      to={hitPath}
      prefetch={shouldPrefetch ? 'intent' : undefined}
      className={sharedClassName}
    >
      {content}
    </Link>
  );
}

const getIconName = (hit: ContentHitType) => {
  switch (hit.contentType) {
    case 'Article':
      return 'file';
    case 'Event':
      return 'calendarAlt';
    case 'Page Builder':
    case 'Ministry Page':
    case 'Redirect Card':
    case 'Location Page':
    case 'Location':
      return 'windowAlt';
    case 'Sermon':
      return 'moviePlay';
    case 'Person':
      return 'user';
    case 'Podcast':
      return 'microphone';
    default:
      return 'file';
  }
};
