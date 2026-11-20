import { describe, it, expect, vi } from 'vitest';
import { renderWithRouter, screen } from '~/test-utils/render';
import { CampusInfo } from '../partials/campus-info.partial';

// The CTA modals read the campus from loader data.
vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return { ...actual, useLoaderData: () => ({ campusUrl: 'boca-raton' }) };
});

const baseProps = {
  digitalTourVideo: '',
  campusLocation: {
    street1: '1 Main St',
    street2: '',
    city: 'Boca Raton',
    state: 'FL',
    postalCode: '33431',
  },
  serviceTimes: '',
  phoneNumber: '(561) 555-0100',
  additionalInfo: [],
};

describe('CampusInfo moving notice', () => {
  it('shows the new address on the Boca Raton page', () => {
    renderWithRouter(<CampusInfo {...baseProps} campusName='Boca Raton' />);
    expect(screen.getByText('Moving December 20')).toBeInTheDocument();
    expect(
      screen.getByText('9339 Glades Rd Boca Raton, FL 33434'),
    ).toBeInTheDocument();
  });

  it('does not show on other campuses', () => {
    renderWithRouter(
      <CampusInfo {...baseProps} campusName='Palm Beach Gardens' />,
    );
    expect(screen.queryByText('Moving December 20')).not.toBeInTheDocument();
  });
});
