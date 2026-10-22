import { useMemo, useState } from 'react';
import Icon from '~/primitives/icon';
import { RockCampuses } from '~/lib/rock-config';
import type { JourneyCampus } from '~/lib/journey-sessions';

interface JourneyCampusStepProps {
  campuses: JourneyCampus[];
  onSelect: (campusId: number) => void;
}

const campusOrder = new Map<string, number>(
  RockCampuses.map((campus, index) => [campus.name, index]),
);

/** Same shape as the campus cards, so the grid doesn't jump in when sessions arrive. */
export const JourneyCampusStepSkeleton = () => (
  <div
    className='flex w-full flex-col items-center gap-6'
    data-testid='journey-campus-skeleton'
    aria-busy='true'
  >
    <div className='flex flex-col items-center gap-2'>
      <div className='h-7 w-64 animate-pulse rounded bg-neutral-lighter' />
      <div className='h-4 w-80 max-w-full animate-pulse rounded bg-neutral-lighter' />
    </div>
    <div className='h-10 w-full max-w-[320px] animate-pulse rounded-lg bg-neutral-lighter' />
    <div className='grid w-full max-w-[820px] grid-cols-1 gap-3 md:grid-cols-3'>
      {Array.from({ length: 15 }, (_, index) => (
        <div
          key={index}
          className='flex flex-row items-center gap-3 rounded-lg border border-neutral-lighter bg-white px-6 py-4 md:flex-col md:gap-2 md:py-5'
        >
          <div className='size-9 shrink-0 animate-pulse rounded-lg bg-neutral-lighter' />
          <div className='flex w-full flex-col items-start gap-1 md:items-center'>
            <div className='h-4 w-32 animate-pulse rounded bg-neutral-lighter' />
            <div className='h-3 w-40 animate-pulse rounded bg-neutral-lighter' />
            <div className='h-3 w-24 animate-pulse rounded bg-neutral-lighter' />
          </div>
        </div>
      ))}
    </div>
    <div className='h-3 w-48 animate-pulse rounded bg-neutral-lighter' />
  </div>
);

export const JourneyCampusStep = ({
  campuses,
  onSelect,
}: JourneyCampusStepProps) => {
  const [query, setQuery] = useState('');

  const sortedCampuses = useMemo(
    () =>
      [...campuses].sort(
        (a, b) =>
          (campusOrder.get(a.name) ?? Infinity) -
          (campusOrder.get(b.name) ?? Infinity),
      ),
    [campuses],
  );

  const filteredCampuses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sortedCampuses;
    return sortedCampuses.filter((campus) =>
      [campus.name, campus.city, campus.street1].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [sortedCampuses, query]);

  return (
    <div className='flex flex-col items-center gap-6'>
      <div className='flex flex-col items-center gap-2 text-center'>
        <h3 className='text-xl font-bold text-black'>
          Choose Your Preferred Campus
        </h3>
        <p className='max-w-[360px] text-sm text-neutral-default'>
          You&apos;ll choose all of your sessions at this campus.
        </p>
      </div>

      <div className='relative w-full max-w-[320px]'>
        <Icon
          name='search'
          size={16}
          className='absolute left-3 top-1/2 -translate-y-1/2 text-black'
        />
        <input
          type='text'
          aria-label='Search campuses'
          placeholder='Search by name or city...'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className='w-full rounded-lg border border-neutral-lighter bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ocean'
        />
      </div>

      {filteredCampuses.length === 0 ? (
        <p className='p-8 text-center text-neutral-default'>
          No campuses match your search. Try a different name or city.
        </p>
      ) : (
        <div className='grid w-full max-w-[820px] grid-cols-1 gap-3 md:grid-cols-3'>
          {filteredCampuses.map((campus) => (
            <button
              key={campus.id}
              type='button'
              onClick={() => onSelect(campus.id)}
              className='flex flex-row items-center gap-3 rounded-lg border border-neutral-lighter bg-white px-6 py-4 text-left transition-colors hover:border-ocean md:flex-col md:gap-2 md:py-5 md:text-center'
            >
              <span className='rounded-lg bg-navy-subdued p-2'>
                <Icon name='map' size={20} />
              </span>
              <span className='flex flex-col gap-0.5'>
                <span className='font-semibold leading-tight text-black'>
                  {campus.name}
                </span>
                <span className='text-xs text-neutral-default'>
                  {campus.street1 || 'Virtual'}
                </span>
                <span className='text-xs text-neutral-default'>
                  {campus.city ? `${campus.city}, FL` : 'Online'}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className='text-xs text-neutral-default'>
        Select a campus above to continue.
      </p>
    </div>
  );
};
