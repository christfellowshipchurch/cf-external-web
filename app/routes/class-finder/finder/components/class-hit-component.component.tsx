/**
 * This component is used to display a hit (cards) in the class finder.
 */

import { ClassHitType } from '../../types';
import { Link } from 'react-router-dom';

export function ClassHitComponent({
  hit,
  fromClassFinderUrl,
  to,
}: {
  hit: ClassHitType;
  fromClassFinderUrl?: string;
  to?: string;
}) {
  const coverImage = hit.coverImage?.sources?.[0]?.uri || '';
  const slug = hit.pathName;
  const pathSegment = slug
    ? encodeURIComponent(slug)
    : encodeURIComponent(hit.classType || hit.title);

  return (
    <Link
      to={to ?? `/class-finder/${pathSegment}`}
      state={
        fromClassFinderUrl ? { fromClassFinder: fromClassFinderUrl } : undefined
      }
      className='flex h-full min-h-0 w-full max-w-full flex-col'
    >
      <div
        className='mx-auto flex h-full min-h-0 w-full max-w-[360px] flex-1 cursor-pointer flex-col overflow-hidden rounded-lg bg-white transition-transform duration-300 hover:-translate-y-[2px] md:max-w-[300px] lg:max-w-[333px] xl:max-w-[300px]'
        style={{
          boxShadow:
            '0 10px 15px -3px rgba(0, 0, 0, 0.1),0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div className='flex min-h-0 flex-1 flex-col'>
          <img
            src={coverImage}
            alt={hit.title}
            className='h-[250px] w-full shrink-0 object-cover lg:h-[180px]'
          />

          <div className='flex min-h-0 flex-1 flex-col gap-5 px-6 pb-4 pt-5'>
            {/* Attributes */}
            <div className='flex flex-wrap gap-[6px]'>
              <p className='bg-[#EBEBEB] w-fit flex rounded-sm text-xs font-semibold px-2 py-1'>
                {hit.topic}
              </p>
            </div>

            {/* Description Info */}
            <div className='flex flex-col gap-[10px]'>
              <div className='flex flex-col gap-2'>
                {/* Title */}
                <h3 className='text-lg font-bold leading-tight line-clamp-2'>
                  {hit.title}
                </h3>

                {/* Description */}
                <p className='text-sm text-black line-clamp-3'>
                  {hit.summary?.trim() || hit.subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
