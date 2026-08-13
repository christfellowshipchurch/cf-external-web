import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VolunteerAlgolia } from '../volunteer-algolia.component';
import type { Volunteer } from '../../types';

const mocks = vi.hoisted(() => ({
  hits: [] as Volunteer[],
  indexUiState: {} as {
    query?: string;
    refinementList?: Record<string, string[]>;
  },
}));

vi.mock('react-instantsearch', () => ({
  Configure: () => null,
  InstantSearch: ({ children }: { children: ReactNode }) => <>{children}</>,
  useHits: () => ({ items: mocks.hits }),
  useInstantSearch: () => ({
    status: 'idle',
    indexUiState: mocks.indexUiState,
  }),
  useRefinementList: () => ({ items: [], refine: vi.fn() }),
  useStats: () => ({ nbHits: mocks.hits.length }),
}));

vi.mock('~/lib/create-search-client', () => ({
  createSearchClient: () => ({}),
}));

vi.mock('~/components/finders/finder-sticky-bar.component', () => ({
  FinderStickyBar: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('~/components/finders/search-filters', () => ({
  SearchFilters: () => null,
}));

vi.mock('~/components/finders/search-filters/active-filter.component', () => ({
  ActiveFilters: () => null,
}));

vi.mock('~/components/hubs-tags-refinement', () => ({
  HubsTagsRefinementList: () => null,
}));

vi.mock('~/routes/group-finder/components/clear-all-button.component', () => ({
  AlgoliaFinderClearAllButton: () => null,
}));

vi.mock('~/primitives/shadcn-primitives/carousel', () => ({
  Carousel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselItem: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselArrows: () => null,
  CarouselDots: () => null,
}));

const volunteer: Volunteer = {
  objectID: 'mission-event-1',
  groupId: 1,
  groupGuid: 'mission-guid-1',
  title: 'Serve Our Neighbors',
  coverImage: { sources: [] },
  summary: '',
  campusList: ['Boynton Beach'],
  eventDateStr: 'July 20',
  eventEndDateStr: '',
  eventTimeStr: '9:00 AM',
  eventEndTimeStr: '',
  category: 'Outreach',
  checkInLocation: '',
  location: { street: '', city: '', state: '', zip: '' },
  opportunityType: [],
  spotsLeft: 8,
  missionsUrl: '',
  contactName: '',
  contactEmail: '',
};

describe('VolunteerAlgolia', () => {
  it('renders private mission results as list rows when requested', () => {
    mocks.hits = [volunteer];
    mocks.indexUiState = {};

    render(
      <MemoryRouter
        initialEntries={['/missions-private-events?category=Outreach']}
      >
        <VolunteerAlgolia
          appId='test-app-id'
          apiKey='test-api-key'
          indexName='dev_webv3_missionsPrivate'
          resultsLayout='list'
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /Serve Our Neighbors/ });
    expect(link).toHaveAttribute('href', '/volunteer/outreach/mission-guid-1');
    expect(link.closest('li')).toBeInTheDocument();
  });

  it('preserves active InstantSearch filters on the View All opportunities CTA', () => {
    mocks.hits = [volunteer];
    mocks.indexUiState = {
      refinementList: {
        category: ['Support Teams'],
        campusList: ['Boynton Beach'],
      },
    };

    render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <VolunteerAlgolia
          appId='test-app-id'
          apiKey='test-api-key'
          indexName='dev_webv3_missions'
        />
      </MemoryRouter>,
    );

    const viewAllLink = screen.getByRole('link', {
      name: /View all opportunities/i,
    });
    expect(viewAllLink).toHaveAttribute(
      'href',
      '/volunteer/community-opportunities?category=Support+Teams&campusList=Boynton+Beach',
    );
  });
});
