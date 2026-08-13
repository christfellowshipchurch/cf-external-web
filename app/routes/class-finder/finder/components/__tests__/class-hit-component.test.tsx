import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ClassHitType } from '../../../types';
import { ClassHitComponent } from '../class-hit-component.component';
import { JOURNEY_CARD_URL, journeyCard } from '../journey-pinned-card';

function makeHit(
  overrides: Partial<ClassHitType> & Pick<ClassHitType, 'objectID'>,
): ClassHitType {
  return {
    title: 'Marriage Matters',
    classType: 'Marriage Matters',
    pathName: 'marriage-matters',
    campus: 'Palm Beach Gardens',
    groupId: 1,
    subtitle: 'Subtitle',
    summary: 'A class for couples.',
    coverImage: { sources: [{ uri: 'https://algolia.example/cover.jpg' }] },
    _geoloc: { lat: 0, lng: 0 },
    startDate: '',
    endDate: '',
    schedule: '',
    topic: 'Relationships',
    language: 'English',
    format: 'In-Person',
    ...overrides,
  };
}

function renderHit(hit: ClassHitType, to?: string) {
  return render(
    <MemoryRouter>
      <ClassHitComponent hit={hit} to={to} />
    </MemoryRouter>,
  );
}

describe('ClassHitComponent', () => {
  it('links a normal class card to its class-finder detail page', () => {
    renderHit(makeHit({ objectID: 'grouped-0' }));

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/class-finder/marriage-matters',
    );
  });

  // Journey has no /class-finder/:path page; without `to` the empty pathName
  // would encode the title and 404.
  it('uses the `to` override so the pinned Journey card can leave class-finder', () => {
    renderHit(journeyCard, JOURNEY_CARD_URL);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/journey');
    expect(
      screen.getByRole('heading', { name: 'The Journey' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Spiritual Growth')).toBeInTheDocument();
  });
});
