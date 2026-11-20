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

  it('makes the whole card one link to the episode', () => {
    renderWithRouter(<MoreEpisodesSearch {...defaultProps} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      'href',
      '/podcasts/test-show/test-episode',
    );
    expect(links[0]).toHaveTextContent('Test Episode');
    expect(links[0]).toHaveTextContent('Season 1 | Episode 2');
  });

  it('builds the episode link the same way site search does', () => {
    renderWithRouter(
      <MoreEpisodesSearch
        hits={[
          {
            ...defaultProps.hits[0],
            podcastShow: 'Faith + Work',
            url: '/test-episode',
          },
        ]}
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/podcasts/faith-and-work/test-episode',
    );
  });

  it('does not render when there are no loader hits', () => {
    const { container } = renderWithRouter(<MoreEpisodesSearch hits={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
