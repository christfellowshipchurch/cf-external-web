import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { VOLUNTEER_FINDER_BACK_STORAGE_KEY } from '../../outreach-opportunity/components/outreach-finder-return-href';
import { VolunteerListCard } from '../volunteer-list-card.component';
import type { Volunteer } from '../../types';

const volunteer: Volunteer = {
  objectID: 'mission-event-1',
  groupId: 1,
  groupGuid: 'mission-guid-1',
  title: 'Serve Our Neighbors',
  coverImage: { sources: [{ uri: 'https://images.example/mission.jpg' }] },
  summary: '',
  campusList: ['Boynton Beach'],
  eventDateStr: 'July 20',
  eventEndDateStr: 'July 21',
  eventTimeStr: '9:00 AM',
  eventEndTimeStr: '12:00 PM',
  category: 'Outreach',
  checkInLocation: '',
  location: { street: '', city: '', state: '', zip: '' },
  opportunityType: ['Family Friendly', 'Outdoor'],
  spotsLeft: 8,
  missionsUrl: '',
  contactName: '',
  contactEmail: '',
};

describe('VolunteerListCard', () => {
  it('keeps mission details visible and saves finder filters before navigating', () => {
    render(
      <MemoryRouter>
        <VolunteerListCard
          volunteer={volunteer}
          listingSearch='?category=Outreach'
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Serve Our Neighbors')).toBeVisible();
    expect(screen.getByText('8 spots left')).toBeVisible();
    expect(screen.getByText('Family Friendly')).toBeVisible();
    expect(screen.getByText('July 20 – July 21')).toBeVisible();
    expect(screen.getByText('9:00 AM – 12:00 PM')).toBeVisible();

    const link = screen.getByRole('link', { name: /Serve Our Neighbors/ });
    expect(link).toHaveAttribute('href', '/volunteer/outreach/mission-guid-1');

    fireEvent.click(link);

    expect(
      window.sessionStorage.getItem(VOLUNTEER_FINDER_BACK_STORAGE_KEY),
    ).toBe(
      JSON.stringify({
        missionGroupGuid: 'mission-guid-1',
        volunteerListSearch: '?category=Outreach',
        origin: 'missions-private-events',
      }),
    );
  });
});
