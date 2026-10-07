import { Link } from 'react-router';
import { getSummarySnippet } from '~/lib/utils';

export function MinistryCard({
  title,
  description,
  image,
  url,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  const isExternalLink = url.startsWith('http');
  const cardClassName =
    'rounded-lg border border-neutral-lighter overflow-hidden shadow-md cursor-pointer hover:translate-y-[-4px] transition-all duration-300 flex flex-col h-full';
  const cardContent = (
    <>
      <img
        src={`${image}&quality=20`}
        alt={title}
        className='w-full aspect-video object-cover'
      />
      <div className='flex flex-col p-6 gap-4 bg-white flex-1'>
        <h3 className='text-[24px] font-bold leading-none'>{title}</h3>
        <p className='text-text-secondary flex-1 line-clamp-2'>
          {getSummarySnippet(description)}
        </p>
      </div>
    </>
  );

  return (
    <div className='h-full pt-1'>
      {isExternalLink ? (
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
      )}
    </div>
  );
}
