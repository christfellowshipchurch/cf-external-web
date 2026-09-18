import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { ResourceCard } from '../resource-card';
import { MinistryCard } from '../ministry-card';
import type { CollectionItem } from '~/routes/page-builder/types';

const mockResource: CollectionItem = {
  id: '1',
  contentChannelId: '63',
  contentType: 'ARTICLES',
  name: 'Test Resource',
  summary: 'A test summary',
  image: '/test-image.jpg',
  pathname: '/resources/test',
};

describe('ResourceCard', () => {
  function renderCard(overrides: Partial<CollectionItem> = {}) {
    return render(
      <MemoryRouter>
        <ResourceCard resource={{ ...mockResource, ...overrides }} />
      </MemoryRouter>,
    );
  }

  it('renders resource name', () => {
    renderCard();
    expect(screen.getByText('Test Resource')).toBeInTheDocument();
  });

  it('renders image with alt text', () => {
    renderCard();
    const img = screen.getByAltText('Test Resource');
    expect(img).toHaveAttribute('src', '/test-image.jpg');
  });

  it('links to the resource pathname', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/resources/test');
  });

  it('renders startDate when provided', () => {
    renderCard({ startDate: 'Jan 15, 2025' });
    expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
  });

  it('renders location when provided', () => {
    renderCard({ location: 'Palm Beach Gardens' });
    expect(screen.getByText('Palm Beach Gardens')).toBeInTheDocument();
  });

  it('renders author when provided', () => {
    renderCard({ author: 'Todd Mullins' });
    expect(screen.getByText('Todd Mullins')).toBeInTheDocument();
  });

  it('does not render metadata section when no metadata fields are present', () => {
    renderCard({
      startDate: undefined,
      location: undefined,
      author: undefined,
    });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  describe('REDIRECT_CARD disableCard', () => {
    it('renders a link when REDIRECT_CARD has disableCard false', () => {
      renderCard({
        contentType: 'REDIRECT_CARD',
        pathname: 'https://example.com',
        disableCard: false,
      });
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders a link when REDIRECT_CARD has disableCard undefined', () => {
      renderCard({
        contentType: 'REDIRECT_CARD',
        pathname: 'https://example.com',
      });
      expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('renders static content with no link when REDIRECT_CARD has disableCard true', () => {
      renderCard({
        contentType: 'REDIRECT_CARD',
        pathname: 'https://example.com',
        disableCard: true,
      });
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Test Resource')).toBeInTheDocument();
      expect(screen.getByAltText('Test Resource')).toBeInTheDocument();
    });

    it('does not disable the link for non-redirect content types even when disableCard is true', () => {
      renderCard({ contentType: 'ARTICLES', disableCard: true });
      expect(screen.getByRole('link')).toBeInTheDocument();
    });
  });

  describe('PODCASTS season/episode description', () => {
    it('replaces the summary with "Season # | Episode #" so podcast cards advertise their place in the show', () => {
      renderCard({
        contentType: 'PODCASTS',
        summary: 'A test summary',
        season: '2',
        episodeNumber: '7',
      });
      expect(screen.getByText('Season 2 | Episode 7')).toBeInTheDocument();
      expect(screen.queryByText('A test summary')).not.toBeInTheDocument();
    });

    it.each([
      ['season', { season: '', episodeNumber: '7' }],
      ['episode number', { season: '2', episodeNumber: '' }],
      ['both', { season: '', episodeNumber: '' }],
    ])(
      'keeps the summary when %s is missing, so legacy shows that store "Season 1 | Episode 2" in the summary still read correctly',
      (_label, overrides) => {
        renderCard({
          contentType: 'PODCASTS',
          summary: 'Season 1 | Episode 2',
          ...overrides,
        });
        expect(screen.getByText('Season 1 | Episode 2')).toBeInTheDocument();
      },
    );

    it('leaves non-podcast cards on their summary even when season/episode are set', () => {
      renderCard({
        contentType: 'ARTICLES',
        summary: 'A test summary',
        season: '2',
        episodeNumber: '7',
      });
      expect(screen.getByText('A test summary')).toBeInTheDocument();
      expect(
        screen.queryByText('Season 2 | Episode 7'),
      ).not.toBeInTheDocument();
    });
  });
});

describe('MinistryCard', () => {
  const defaultProps = {
    title: 'Youth Ministry',
    description: 'A place for teens',
    image: 'https://example.com/youth.jpg',
    url: '/youth',
  };

  function renderCard(props = defaultProps) {
    return render(
      <MemoryRouter>
        <MinistryCard {...props} />
      </MemoryRouter>,
    );
  }

  it('renders title', () => {
    renderCard();
    expect(screen.getByText('Youth Ministry')).toBeInTheDocument();
  });

  it('renders description', () => {
    renderCard();
    expect(screen.getByText('A place for teens')).toBeInTheDocument();
  });

  it('renders image with alt text matching title', () => {
    renderCard();
    expect(screen.getByAltText('Youth Ministry')).toBeInTheDocument();
  });

  it('links to the correct URL', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/youth');
  });
});
