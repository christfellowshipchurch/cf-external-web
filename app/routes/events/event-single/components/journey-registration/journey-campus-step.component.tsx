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
          We&apos;ll show this campus first for every session. You can change it
          for any individual session.
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
