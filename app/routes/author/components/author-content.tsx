import { Link } from 'react-router';
import { AuthorArticleProps } from '../types';

/**
 * Renders an author article component.
 *
 * @param {AuthorArticleProps} props - The props for the author article component.
 * @returns {JSX.Element} The rendered author article component.
 */
export function AuthorArticle({
  title,
  publishDate,
  readTime,
  summary,
  url,
  coverImage,
}: AuthorArticleProps) {
  return (
    <Link
      to={`/articles/${url}`}
      prefetch='intent'
      className='flex flex-row-reverse gap-4 md:border-b-2 md:gap-x-2 xl:gap-x-0 border-neutral-300 py-4 hover:bg-neutral-100 md:grid md:grid-cols-3 w-full'
    >
      <div className='w-full flex flex-col md:gap-2 md:col-span-2 md:pr-14 border-b-1 border-neutral-300 pb-3 md:pb-0 md:border-b-0'>
        <h2 className='text-lg md:text-2xl font-semibold text-pretty leading-tight'>
          {title}
        </h2>
        <div className='gap-2 text-sm font-light text-neutral-600 flex'>
          <p>{publishDate}</p> <p className='hidden md:block'>•</p>
          {`${readTime} min read`}
          <br className='md:hidden' />
        </div>
        <p className='font-light lg:max-w-[380px] hidden md:block'>{summary}</p>
      </div>

      {coverImage && coverImage?.length > 0 && (
        <div className='relative size-16 md:w-full overflow-hidden rounded-lg md:col-span-1 md:h-32 flex-shrink-0'>
          <img
            src={`${coverImage}&width=500`}
            style={{ objectFit: 'cover' }}
            alt={`Author Article - ${title}`}
            className='size-full'
          />
        </div>
      )}
    </Link>
  );
}

// Build out the AuthorBook and AuthorPodcast components here...
