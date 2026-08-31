import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MemoryRouter as MemoryRouterDom } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { NavbarVisibilityProvider } from '~/providers/navbar-visibility-context';
import type { ImageSource } from '~/routes/group-finder/types';
import { GroupSingleBanner } from '../group-single-banner.component';

function leaderImages(count: number): ImageSource[] {
  return Array.from({ length: count }, (_, i) => ({
    sources: [{ uri: `/leader-${i + 1}.jpg` }],
  }));
}

function renderBanner(images: ImageSource[]) {
  return render(
    <MemoryRouterDom>
      <MemoryRouter>
        <NavbarVisibilityProvider>
          <GroupSingleBanner
            language=''
            topics={['Bible Study']}
            leaderImages={images}
            groupName='Test Group'
            groupId='1'
          />
        </NavbarVisibilityProvider>
      </MemoryRouter>
    </MemoryRouterDom>,
  );
}

describe('GroupSingleBanner leader images', () => {
  // Four leaders would crowd the sticky banner, so it caps the photos at two
  // and summarizes the rest — matching the Group Finder cards.
  it('shows at most two leader photos and a "+N" badge for the rest', () => {
    renderBanner(leaderImages(4));

    expect(screen.getAllByAltText('Test Group')).toHaveLength(2);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows no "+N" badge when a group has two or fewer leader photos', () => {
    renderBanner(leaderImages(2));

    expect(screen.getAllByAltText('Test Group')).toHaveLength(2);
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });

  // Algolia returns `{ sources: [{ uri: '' }] }` for leaders without a photo;
  // those must not render an empty image or inflate the "+N" count.
  it('ignores leaders with no photo', () => {
    renderBanner([...leaderImages(1), { sources: [{ uri: '' }] }]);

    expect(screen.getAllByAltText('Test Group')).toHaveLength(1);
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });
});
