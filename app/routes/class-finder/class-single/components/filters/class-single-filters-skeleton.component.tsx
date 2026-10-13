/** Skeleton while Filter Sessions InstantSearch mounts after first paint. */
export function ClassSingleFiltersSkeleton() {
  return (
    <div className='flex min-w-0 flex-1 items-center gap-2' aria-hidden>
      <div className='h-[42px] flex-1 animate-pulse rounded-lg bg-neutral-200 lg:w-32 lg:flex-none' />
      <div className='h-[42px] flex-1 animate-pulse rounded-lg bg-neutral-200 lg:w-32 lg:flex-none' />
    </div>
  );
}
