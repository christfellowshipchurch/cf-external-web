import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { GroupType } from '../../types';
import { GroupHit } from '../group-hit.component';

function createGroupHit(overrides: Partial<GroupType> = {}): GroupType {
  return {
    objectID: 'group-1',
    groupGuid: 'group-guid-1',
    groupId: 1,
    title: 'Test Group',
    summary: 'A test group',
    campusName: 'Palm Beach Gardens',
    coverImage: { sources: [{ uri: '/test-group-image.jpg' }] },
    meetingLocationType: 'Home',
    meetingLocation: 'A home',
    meetingDay: 'Monday',
    meetingTime: '7:00 PM',
    meetingType: 'In Person',
    meetingFrequency: 'Weekly',
    adultsOnly: 'True',
    leaders: null,
    groupFor: 'Anyone',
    language: '',
    topics: ['Bible Study'],
    minMaxAge: '18 to 99',
    _geoloc: { lat: 26.839, lng: -80.101 },
    _rankingInfo: { geoDistance: 1609.344 },
    ...overrides,
  };
}

function renderGroupHit(hit: GroupType) {
  return render(
    <MemoryRouter>
      <GroupHit hit={hit} isGeoSearch />
    </MemoryRouter>,
  );
}

describe('GroupHit', () => {
  it('falls back to the group/campus city (not "Location Varies") when Algolia returns blank geolocation values', () => {
    renderGroupHit(
      createGroupHit({
        meetingLocation: 'Jupiter, FL 33458',
        _geoloc: { lat: '', lng: '' },
        _rankingInfo: { geoDistance: 5000 * 1609.344 },
      }),
    );

    expect(screen.getByText('Jupiter')).toBeInTheDocument();
    expect(screen.queryByText('Location Varies')).not.toBeInTheDocument();
    expect(screen.queryByText(/miles away/i)).not.toBeInTheDocument();
  });

  it('shows "Online" for a virtual group with blank geolocation during a geo search', () => {
    renderGroupHit(
      createGroupHit({
        meetingType: 'Virtual',
        _geoloc: { lat: '', lng: '' },
      }),
    );

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.queryByText('Location Varies')).not.toBeInTheDocument();
    expect(screen.queryByText(/miles away/i)).not.toBeInTheDocument();
  });

  it('shows distance for numeric geolocation values', () => {
    renderGroupHit(createGroupHit());

    expect(screen.getByText('1.0 miles away')).toBeInTheDocument();
  });

  it('shows "Online" in the footer when the Virtual filter is active, overriding location/distance', () => {
    render(
      <MemoryRouter>
        <GroupHit
          hit={createGroupHit({
            meetingType: 'Virtual',
            meetingLocation: 'Jupiter, FL 33458',
          })}
          isGeoSearch
          isVirtualFilterActive
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.queryByText(/miles away/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Jupiter')).not.toBeInTheDocument();
  });
  // Four leaders would otherwise crowd the cover image, so the card caps the
  // avatars at two and summarizes the rest.
  it('shows at most two leader avatars and a "+N" badge for the rest', () => {
    renderGroupHit(
      createGroupHit({
        leaders: ['Ana', 'Ben', 'Cara', 'Dan'].map((firstName, i) => ({
          id: i + 1,
          firstName,
          lastName: 'Leader',
        })),
      }),
    );

    expect(screen.getByAltText('Ana')).toBeInTheDocument();
    expect(screen.getByAltText('Ben')).toBeInTheDocument();
    expect(screen.queryByAltText('Cara')).not.toBeInTheDocument();
    expect(screen.queryByAltText('Dan')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows no "+N" badge when a group has two or fewer leaders', () => {
    renderGroupHit(
      createGroupHit({
        leaders: [{ id: 1, firstName: 'Ana', lastName: 'Leader' }],
      }),
    );

    expect(screen.getByAltText('Ana')).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
  });
});
