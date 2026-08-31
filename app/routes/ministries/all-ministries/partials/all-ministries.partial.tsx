import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { RefinementPills } from '~/components/finders/refinement-pills/refinement-pills.component';
import { MinistryFinderCard } from '../components/ministry-finder-card.component';
import {
  MINISTRY_CATEGORY_ORDER,
  MINISTRY_CATEGORY_PARAM,
} from '../all-ministries.constants';
import type { Ministry } from '../../loader';

/**
 * Orders the categories actually present in the data by the designed pill order,
 * then appends anything Rock has that the design didn't anticipate.
 */
function getCategoryPills(ministries: Ministry[]): string[] {
  const present = new Set(
    ministries.flatMap((ministry) => ministry.categories),
  );
  const designed = new Set<string>(MINISTRY_CATEGORY_ORDER);
  const ordered = MINISTRY_CATEGORY_ORDER.filter((category) =>
    present.has(category),
  );
  const extras = [...present]
    .filter((category) => !designed.has(category))
    .sort();

  return [...ordered, ...extras];
}

export const AllMinistriesPartial = ({
  ministries,
}: {
  ministries: Ministry[];
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get(MINISTRY_CATEGORY_PARAM) ?? '';

  const categoryPills = useMemo(
    () => getCategoryPills(ministries),
    [ministries],
  );

  const visibleMinistries = useMemo(
    () =>
      activeCategory
        ? ministries.filter((ministry) =>
            ministry.categories.includes(activeCategory),
          )
        : ministries,
    [ministries, activeCategory],
  );

  // Category lives in the URL so a filtered view stays shareable, matching the
  // deep-link behaviour of the Algolia-backed hubs.
  const setCategory = (category: string | null) => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (category) {
          next.set(MINISTRY_CATEGORY_PARAM, category);
        } else {
          next.delete(MINISTRY_CATEGORY_PARAM);
        }
        return next;
      },
      { preventScrollReset: true },
    );
  };

  return (
    <div className='content-padding bg-background-secondary py-16 md:py-24'>
      <div className='mx-auto max-w-screen-content'>
        <div className='flex flex-col gap-4'>
          <div className='flex flex-col-reverse items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
            <h1 className='text-[32px] font-extrabold leading-[1.2] md:text-[48px]'>
              Programs and Ministries
            </h1>
            <span className='shrink-0 rounded-full bg-ocean/12 px-3 py-1.5 text-xs font-bold text-ocean'>
              {visibleMinistries.length}{' '}
              {visibleMinistries.length === 1 ? 'ministry' : 'ministries'}
            </span>
          </div>
          <p className='text-lg leading-[1.5] text-text-secondary'>
            Explore the ways we serve, grow, and care for one another across
            every stage of life.
          </p>
        </div>

        {categoryPills.length > 0 && (
          <RefinementPills
            className='mt-8 md:mt-10'
            items={categoryPills.map((category) => ({
              value: category,
              label: category,
            }))}
            selectedValues={activeCategory ? [activeCategory] : []}
            onSelect={(value) => setCategory(value)}
            onRemove={() => setCategory(null)}
          />
        )}

        {visibleMinistries.length === 0 ? (
          <p className='py-8 text-center text-text-secondary'>
            No ministries found. Try a different category.
          </p>
        ) : (
          <div className='mt-6 grid grid-cols-1 gap-3 md:mt-8 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4'>
            {visibleMinistries.map((ministry, i) => (
              <MinistryFinderCard key={i} {...ministry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
