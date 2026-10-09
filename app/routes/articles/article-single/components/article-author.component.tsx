import { Link } from 'react-router';
import type { ReactNode } from 'react';
import * as Avatar from '@radix-ui/react-avatar';

import { CircleLoader } from '~/primitives/loading-states/circle-loader.primitive';
import { cn } from '~/lib/utils';

import type { AuthorProps } from '../partials/hero.partial';

const TODD_AND_JULIE_AUTHOR_PATHNAME = 'todd-julie-mullins';
const TODD_AUTHOR_PATHNAME = 'todd-mullins';
const JULIE_AUTHOR_PATHNAME = 'julie-mullins';

/**
 * The author's page slug, or null when they have no author page.
 *
 * `/author/:slug` resolves by Rock Pathname alone, so a bare authorId GUID has
 * no page — authors missing a Pathname are shown as plain text rather than
 * linked somewhere that 404s.
 */
function getAuthorPathname(author: AuthorProps): string | null {
  const pathname = author?.authorAttributes?.pathname;

  if (pathname && pathname !== 'undefined') {
    return pathname;
  }

  return null;
}

function isToddAndJulieAuthor(
  author: AuthorProps,
  authorPathname: string | null,
) {
  const normalizedFullName = author.fullName.trim().toLowerCase();

  return (
    authorPathname === TODD_AND_JULIE_AUTHOR_PATHNAME ||
    normalizedFullName === 'todd and julie mullins'
  );
}

function AuthorNameLink({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string | null;
}) {
  // No author page to link to — show the name as plain text, without the
  // underline that would otherwise signal a link.
  if (!pathname) {
    return <>{children}</>;
  }

  return (
    <Link
      to={`/author/${pathname}`}
      prefetch='intent'
      className='underline hover:text-text-secondary'
    >
      {children}
    </Link>
  );
}

function AuthorAvatarLink({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string | null;
}) {
  if (!pathname) {
    return <>{children}</>;
  }

  return (
    <Link prefetch='intent' to={`/author/${pathname}`}>
      {children}
    </Link>
  );
}

export default function ArticleAuthor({
  author,
  publishDate,
  readTime,
}: {
  author: AuthorProps;
  publishDate: string;
  readTime: number;
}) {
  const authorPathname = getAuthorPathname(author);
  const isToddAndJulie = isToddAndJulieAuthor(author, authorPathname);
  const avatarAuthorPathname = isToddAndJulie
    ? TODD_AUTHOR_PATHNAME
    : authorPathname;

  return (
    <div className='flex'>
      <AuthorAvatarLink pathname={avatarAuthorPathname}>
        <Avatar.Root
          className={cn(
            'flex',
            avatarAuthorPathname &&
              'cursor-pointer duration-300 hover:scale-105',
          )}
        >
          <Avatar.Image
            className='size-16 rounded-full'
            src={
              author?.photo?.uri ||
              'http://cloudfront.christfellowship.church/GetImage.ashx?guid=A62B2B1C-FDFF-44B6-A26E-F1E213285153'
            }
            alt={author?.fullName || 'Christ Fellowship Church'}
          />
          <Avatar.Fallback className='flex size-full'>
            <CircleLoader size={20} />
          </Avatar.Fallback>
        </Avatar.Root>
      </AuthorAvatarLink>

      <div className='ml-4 flex flex-col justify-center'>
        <h2 className='semibold mb-2'>
          Authored by{' '}
          {isToddAndJulie ? (
            <>
              <AuthorNameLink pathname={TODD_AUTHOR_PATHNAME}>
                Todd
              </AuthorNameLink>{' '}
              and{' '}
              <AuthorNameLink pathname={JULIE_AUTHOR_PATHNAME}>
                Julie
              </AuthorNameLink>{' '}
              Mullins
            </>
          ) : (
            <AuthorNameLink pathname={authorPathname}>
              {author?.fullName || 'Christ Fellowship Church'}
            </AuthorNameLink>
          )}
        </h2>
        <div className='flex text-neutral-500 font-normal'>
          {publishDate && (
            <p>
              {publishDate}
              <span className='mx-2'>•</span>
            </p>
          )}
          {readTime && <p>{readTime} min read</p>}
        </div>
      </div>
    </div>
  );
}
