import type { RefObject } from 'react';
import { useHits, useInstantSearch, usePagination } from 'react-instantsearch';

import { cn } from '~/lib/utils';
import { Icon } from '~/primitives/icon/icon';
import type { ContentItemHit } from '~/routes/search/types';

import { EventHit } from './event-hit-card.component';

interface PaginationButtonProps {
  children: React.ReactNode;
  isDisabled?: boolean;
  isActive?: boolean;
  href: string;
  onClick: () => void;
  className?: string;
}

const PaginationButton = ({
  children,
  isDisabled = false,
  isActive = false,
  href,
  onClick,
  className = '',
}: PaginationButtonProps) => {
  if (isDisabled) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-200 cursor-not-allowed`}
      >
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`${className} inline-flex items-center justify-center border-2 ${
        isActive
          ? 'border-navy bg-navy text-white'
          : 'border-navy text-navy hover:bg-navy hover:text-white'
      } transition-colors duration-200 cursor-pointer`}
    >
      {children}
    </a>
  );
};

export function AllEventsInstantResults({
  fromEventsUrl,
}: {
  fromEventsUrl: string;
}) {
  const { items: hits } = useHits<ContentItemHit>();
  const { status } = useInstantSearch();
  const isLoading = status === 'loading' || status === 'stalled';
  const { currentRefinement, nbPages, isFirstPage, isLastPage, refine } =
    usePagination();

  // The index response is already ordered by Algolia's custom ranking
  // (eventStartDate), so hits render in index order.
  const eventHits = hits;

  return (
    <AllEventsResultsLayout
      eventHits={eventHits}
      eventsNbPages={nbPages}
      eventsPage={currentRefinement}
      isFirstPage={isFirstPage}
      isLastPage={isLastPage}
      isLoading={isLoading}
      fromEventsUrl={fromEventsUrl}
      goToPage={(nextPage) => {
        // Let InstantSearch own pagination after hydration; the route URL is
        // synchronized by `onStateChange` above.
        refine(Math.max(0, nextPage));
        window.requestAnimationFrame(() => {
          const scrollTarget = document.querySelector('.pagination-scroll-to');
          scrollTarget?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }}
    />
  );
}

export function AllEventsResultsLayout({
  eventHits,
  eventsNbPages,
  eventsPage,
  isFirstPage,
  isLastPage,
  isLoading,
  fromEventsUrl,
  goToPage,
  eventsMobilePinEndRef,
}: {
  eventHits: ContentItemHit[];
  eventsNbPages: number;
  eventsPage: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  isLoading: boolean;
  fromEventsUrl: string;
  goToPage: (nextPage: number) => void;
  eventsMobilePinEndRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className='content-padding pt-16 md:pt-0'>
      <div className='mx-auto min-h-88 w-full max-w-screen-content md:min-h-112'>
        {eventHits.length === 0 && !isLoading ? null : (
          <ul
            className={cn(
              'grid w-full list-none grid-cols-1 justify-items-center gap-4 p-0 md:grid-cols-2 md:gap-10 lg:grid-cols-3',
              isLoading && 'opacity-60 pointer-events-none',
            )}
            role='list'
          >
            {eventHits.map((hit) => (
              <li key={hit.objectID} className='w-full'>
                <EventHit hit={hit} fromEventsUrl={fromEventsUrl} />
              </li>
            ))}
          </ul>
        )}

        {eventsNbPages > 1 ? (
          <div className='flex items-center justify-start gap-4 mt-16'>
            <PaginationButton
              isDisabled={isFirstPage}
              onClick={() => goToPage(eventsPage - 1)}
              href='#'
              className='w-12 h-12'
            >
              <Icon name='chevronLeft' size={24} />
            </PaginationButton>

            <PaginationButton
              isActive
              onClick={() => {}}
              href='#'
              className='w-12 h-12 bg-navy text-white'
            >
              {eventsPage + 1}
            </PaginationButton>

            <PaginationButton
              isDisabled={isLastPage}
              onClick={() => goToPage(eventsPage + 1)}
              href='#'
              className='w-12 h-12'
            >
              <Icon name='chevronRight' size={24} />
            </PaginationButton>
          </div>
        ) : null}

        <div
          ref={eventsMobilePinEndRef}
          className='pointer-events-none h-0 w-full shrink-0'
          aria-hidden
        />
      </div>
    </div>
  );
}
