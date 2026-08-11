import { cn } from '~/lib/utils';

/**
 * Placeholder UI for the volunteer opportunities block (filters + horizontal cards) while
 * Algolia is connecting and the first search is in flight.
 */
export function VolunteerAlgoliaSkeleton({
  className,
  resultsLayout = 'carousel',
}: {
  className?: string;
  resultsLayout?: 'carousel' | 'list' | 'grid';
}) {
  return (
    <div className={cn('animate-pulse', className)} aria-hidden>
      <div className='content-padding'>
        {resultsLayout === 'grid' ? (
          <div className='mx-auto hidden max-w-screen-content items-center gap-4 pb-6 md:flex md:pb-8'>
            <div className='h-11 w-48 shrink-0 rounded-xl bg-neutral-light' />
            <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
              <div className='h-10 w-28 rounded-full bg-neutral-light' />
              <div className='h-10 w-32 rounded-full bg-neutral-light' />
              <div className='h-10 w-36 rounded-full bg-neutral-light' />
              <div className='h-10 w-40 rounded-full bg-neutral-light' />
            </div>
            <div className='h-5 w-16 shrink-0 rounded bg-neutral-light' />
          </div>
        ) : (
          <div className='max-w-screen-content mx-auto hidden flex-col gap-4 md:flex md:flex-row md:flex-wrap md:items-center md:justify-between'>
            <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
              <div className='h-11 w-36 rounded-full bg-neutral-light' />
              <div className='h-11 w-28 rounded-full bg-neutral-light' />
              <div className='h-11 w-28 rounded-full bg-neutral-light' />
              <div className='h-11 w-32 rounded-full bg-neutral-light' />
            </div>
            <div className='h-12 w-full rounded-lg bg-neutral-light md:w-80' />
          </div>
        )}
      </div>

      {resultsLayout === 'list' ? (
        <VolunteerListSkeleton />
      ) : resultsLayout === 'grid' ? (
        <VolunteerGridSkeleton />
      ) : (
        <VolunteerCarouselSkeleton />
      )}
    </div>
  );
}

function VolunteerCarouselSkeleton() {
  return (
    <>
      <div className='pl-5 md:pl-12 lg:pl-18 2xl:pl-0!'>
        <div className='mt-8 flex py-2 items-stretch gap-6 overflow-hidden max-w-screen-content mx-auto'>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className='flex h-full w-full min-w-0 shrink-0 basis-[85vw] flex-col overflow-hidden rounded-2xl bg-white shadow-sm sm:basis-[45%] md:basis-[40%] lg:basis-[31.8%]'
            >
              <div className='aspect-16/10 w-full max-h-[156px] shrink-0 bg-neutral-light' />
              <div className='flex min-h-[140px] flex-1 flex-col gap-3 p-5'>
                <div className='h-6 w-full max-w-[280px] rounded-md bg-neutral-light' />
                <div className='flex gap-2'>
                  <div className='h-7 w-24 rounded-full bg-neutral-light' />
                  <div className='h-7 w-28 rounded-md bg-neutral-light' />
                </div>
                <div className='flex flex-wrap gap-2'>
                  <div className='h-7 w-32 rounded-full bg-neutral-light' />
                  <div className='h-7 w-28 rounded-full bg-neutral-light' />
                </div>
                <div className='mt-1 flex flex-col gap-2'>
                  <div className='h-4 w-full max-w-[200px] rounded bg-neutral-light' />
                  <div className='h-4 w-full max-w-[160px] rounded bg-neutral-light' />
                  <div className='h-4 w-full max-w-[180px] rounded bg-neutral-light' />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='pl-5 md:pl-12 lg:pl-18 2xl:pl-0!'>
        <div className='mx-auto mt-4 flex max-w-screen-content items-center justify-between gap-4 pr-5 md:mt-8 md:pr-0'>
          <div className='flex gap-2'>
            <div className='size-12 rounded-full border border-neutral-light' />
            <div className='size-12 rounded-full border border-neutral-light' />
          </div>
          <div className='h-11 w-28 rounded-full border border-neutral-light md:w-52' />
        </div>
      </div>
    </>
  );
}

function VolunteerGridSkeleton() {
  return (
    <div className='border-t border-neutral-lighter bg-gray content-padding py-6'>
      <div className='mx-auto grid max-w-screen-content grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8'>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className='flex min-h-0 flex-col overflow-hidden rounded-[36px] bg-white shadow-sm'
          >
            <div className='aspect-16/10 w-full max-h-[156px] shrink-0 bg-neutral-light' />
            <div className='flex flex-1 flex-col gap-3 p-5'>
              <div className='h-6 w-4/5 rounded-md bg-neutral-light' />
              <div className='flex gap-2'>
                <div className='h-7 w-24 rounded-full bg-neutral-light' />
                <div className='h-7 w-28 rounded-md bg-neutral-light' />
              </div>
              <div className='h-4 w-3/5 rounded bg-neutral-light' />
              <div className='h-4 w-2/5 rounded bg-neutral-light' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VolunteerListSkeleton() {
  return (
    <div className='content-padding py-6'>
      <div className='mx-auto flex max-w-screen-content flex-col gap-4'>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className='flex min-h-36 overflow-hidden rounded-lg border border-neutral-lighter bg-white shadow-sm'
          >
            <div className='w-32 shrink-0 bg-neutral-light sm:w-48' />
            <div className='flex flex-1 flex-col gap-3 p-4 md:p-6'>
              <div className='h-6 w-2/5 rounded bg-neutral-light' />
              <div className='flex gap-2'>
                <div className='h-7 w-24 rounded-full bg-neutral-light' />
                <div className='h-7 w-28 rounded bg-neutral-light' />
              </div>
              <div className='h-4 w-4/5 rounded bg-neutral-light' />
              <div className='h-4 w-3/5 rounded bg-neutral-light' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
