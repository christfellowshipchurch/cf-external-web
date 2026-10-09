import { Link } from 'react-router';
import { CardAuthor, ArticleCardProps } from './card-author.component';

export function RelatedArticleCard({
  author,
  href,
  title,
  description,
  image,
  date,
  readTime,
  ...props
}: ArticleCardProps) {
  if (href) {
    return (
      <Link
        to={`/articles/${href}`}
        prefetch='intent'
        className='flex flex-1 h-full cursor-pointer flex-col overflow-hidden bg-transparent transition-transform duration-300 hover:-translate-y-3 rounded-[1rem] md:rounded-lg border border-neutral-lighter'
      >
        <img
          className='relative h-60 w-full sm:h-80 md:h-96 lg:h-64 lg:w-full xl:h-72 object-cover'
          src={image}
          alt={title}
        />
        <div className='flex grow flex-col justify-between bg-white p-6'>
          <div>
            <div className='mb-2 text-lg font-extrabold'>{title}</div>
            <div className='mb-6'>{description}</div>
          </div>
          {author && (
            <CardAuthor
              name={author?.fullName}
              image={author?.photo?.uri || ''}
              date={date}
              timeRead={readTime}
            />
          )}
        </div>
      </Link>
    );
  }

  return <div>{props.children}</div>;
}
