import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { ClassHitType } from '../../../types';
import { UpcomingSessionCard } from '../upcoming-session-card.component';

const REGISTRATION_URL =
  'https://rock.christfellowship.church/page/414?EventOccurrenceId=1547';

const baseHit = {
  objectID: '89472701000',
  title: 'Financial Peace University - CFEverywhere',
  classType: 'Financial Peace University',
  pathName: 'financial-peace-university',
  campus: 'CFEverywhere',
  groupId: 1834253,
  subtitle: '',
  summary: '',
  coverImage: { sources: [] },
  _geoloc: { lat: 0, lng: 0 },
  startDate: 'January 1',
  endDate: 'February 5',
  schedule: 'Sunday at 9:45 AM',
  topic: 'Finances',
  language: 'English',
  format: 'In-Person',
} as unknown as ClassHitType;

function renderCard(overrides: Partial<ClassHitType> = {}) {
  return render(
    <MemoryRouter>
      <UpcomingSessionCard hit={{ ...baseHit, ...overrides }} />
    </MemoryRouter>,
  );
}

describe('UpcomingSessionCard', () => {
  it('registers through the signup modal when no registration URL is set', () => {
    renderCard();

    // Sessions without an override must keep using the in-app group signup flow.
    expect(
      screen.getByRole('button', { name: /Sign up — Financial Peace/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links to the Rock registration URL instead of the signup modal when set', () => {
    renderCard({ registrationURL: REGISTRATION_URL });

    // The external Rock page owns registration for this session, so opening the
    // in-app form would create a duplicate/incorrect registration.
    const link = screen.getByRole('link', {
      name: /Sign up — Financial Peace/,
    });
    expect(link).toHaveAttribute('href', REGISTRATION_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('rewrites an internal Rock registration URL to the public host', () => {
    // Algolia records carry rock.gocf.org links, which only resolve on the
    // church network; external visitors would hit a dead link.
    renderCard({
      registrationURL: 'https://rock.gocf.org/page/414?EventOccurrenceId=1547',
    });

    expect(
      screen.getByRole('link', { name: /Sign up — Financial Peace/ }),
    ).toHaveAttribute('href', REGISTRATION_URL);
  });

  it('ignores a whitespace-only registration URL', () => {
    // Rock ships the attribute on every record; blank values must not swallow
    // the signup modal.
    renderCard({ registrationURL: '   ' });

    expect(
      screen.getByRole('button', { name: /Sign up — Financial Peace/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
