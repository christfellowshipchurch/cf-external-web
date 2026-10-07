import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import { MoreEpisodesSearch } from '../more-episodes-search';
import type { ContentItemHit } from '~/routes/search/types';

describe('MoreEpisodesSearch', () => {
  const defaultProps = {
    hits: [
      {
        objectID: 'episode-2',
        title: 'Test Episode',
        coverImage: { sources: [{ uri: '/test-image.jpg' }] },
        podcastShow: 'Test Show',
        podcastSeason: 'Season 1',
        podcastSeasonNumber: 1,
        podcastEpisodeNumber: 2,
        url: 'test-episode',
      } as ContentItemHit,
    ],
  };

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<MemoryRouter>{component}</MemoryRouter>);
  };

  it('renders without crashing', () => {
    renderWithRouter(<MoreEpisodesSearch {...defaultProps} />);

    expect(screen.getByText('More in this season')).toBeInTheDocument();
  });

  it('renders episode title correctly', () => {
    renderWithRouter(<MoreEpisodesSearch {...defaultProps} />);

    expect(screen.getByText('Test Episode')).toBeInTheDocument();
  });

  it('renders season and episode information', () => {
    renderWithRouter(<MoreEpisodesSearch {...defaultProps} />);

    expect(screen.getByText('Season 1 | Episode 2')).toBeInTheDocument();
  });

  it('does not render when there are no loader hits', () => {
    const { container } = renderWithRouter(<MoreEpisodesSearch hits={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
