import { Link } from 'react-router';
import Icon from '~/primitives/icon';
import { getDisplayContentType } from '../../search-utils';
import { resolveSearchHitLinkFromHit } from '../../search-hit-links';

export type MobileContentHitType = {
  routing: {
    pathname: string;
  };
  coverImage?: {
    sources?: {
      uri: string;
    }[];
  } | null;
  title: string;
  contentType: string;
  summary: string;
  url?: string;
};

export function MobileContentHit({ hit }: { hit: MobileContentHitType }) {
  const imageUrl = hit.coverImage?.sources?.[0]?.uri || '';
  const { to, isExternal } = resolveSearchHitLinkFromHit(hit);

  const sharedClassName = 'flex gap-2 pb-2 w-full';
  const content = (
    <>
      <img
        src={imageUrl}
        alt={hit.title}
        className='size-16 rounded-lg object-cover'
      />
      <div className='flex justify-between items-center gap-2 size-full border-b border-[#E0E0E0] pb-2'>
        <div className='flex flex-col justify-center h-full text-sm text-black w-full'>
          <h3 className='line-clamp-1'>{hit.title}</h3>
          <p className='font-normal line-clamp-1'>{hit.summary}</p>
          <p className='text-xs text-[#7B7380]'>
            {getDisplayContentType(hit.contentType)}
          </p>
        </div>

        <Icon name='chevronRight' size={32} color='black' />
      </div>
    </>
  );

  if (isExternal) {
    return (
      <a
        href={to}
        target='_blank'
        rel='noopener noreferrer'
        className={sharedClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={to} className={sharedClassName}>
      {content}
    </Link>
  );
}
