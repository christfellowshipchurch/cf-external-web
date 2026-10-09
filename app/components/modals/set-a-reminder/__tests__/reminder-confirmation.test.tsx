import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import ReminderConfirmation from '../confirmation.component';

vi.mock('~/lib/gtm', () => ({ pushFormEvent: vi.fn() }));

const mockCalendarEvent = {
  title: 'Sunday service at Christ Fellowship Church in Palm Beach Gardens',
  description: 'Join us this Sunday!',
  address: '123 Main St',
  startTime: new Date('2025-06-08T09:00:00'),
  endTime: new Date('2025-06-08T10:30:00'),
  url: 'https://christfellowship.church/locations/pbg',
};

vi.mock('~/lib/utils', async () => {
  const actual =
    await vi.importActual<typeof import('~/lib/utils')>('~/lib/utils');
  return {
    ...actual,
    icsLinkEvents: () => [{ label: '9:00 AM', event: mockCalendarEvent }],
    googleCalendarLink: () =>
      'https://calendar.google.com/calendar/render?action=TEMPLATE',
  };
});
vi.mock('~/primitives/icon', () => ({
  default: () => <svg data-testid='icon' />,
}));

let mockFetcherData: unknown = undefined;
let mockFetcherState = 'idle';

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useFetcher: () => ({
      state: mockFetcherState,
      data: mockFetcherData,
      load: vi.fn(),
    }),
  };
});

const defaultProps = {
  serviceTime: '9:00 AM',
  onSuccess: vi.fn(),
  campusUrl: 'palm-beach-gardens',
  location: 'Palm Beach Gardens',
};

function renderConfirmation(props = defaultProps) {
  return render(
    <MemoryRouter>
      <ReminderConfirmation {...props} />
    </MemoryRouter>,
  );
}

describe('ReminderConfirmation', () => {
  beforeEach(() => {
    mockFetcherData = undefined;
    mockFetcherState = 'idle';
    vi.clearAllMocks();
  });

  it('shows Loading... when data not yet available', () => {
    renderConfirmation();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders confirmation content after data loads', () => {
    mockFetcherData = {
      address: '5343 Northlake Blvd',
      url: 'palm-beach-gardens',
      serviceTimes: [],
      campusName: 'Palm Beach Gardens',
    };
    renderConfirmation();
    expect(screen.getByText(/check out your email/i)).toBeInTheDocument();
  });

  it('renders English text by default', () => {
    mockFetcherData = {
      address: '123 Main St',
      url: 'pbg',
      serviceTimes: [],
      campusName: 'Palm Beach Gardens',
    };
    renderConfirmation();
    expect(screen.getByText(/Add to Calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue/i)).toBeInTheDocument();
  });

  it("renders Español text when location contains 'Español'", () => {
    mockFetcherData = {
      address: '123 Main St',
      url: 'espanol',
      serviceTimes: [],
      campusName: 'Español',
    };
    renderConfirmation({ ...defaultProps, location: 'Español' });
    expect(screen.getByText(/Añadir al Calendario/i)).toBeInTheDocument();
    expect(screen.getByText(/Continuar/i)).toBeInTheDocument();
  });

  it('calls onSuccess when Continue button is clicked', () => {
    const onSuccess = vi.fn();
    mockFetcherData = {
      address: '123 Main St',
      url: 'pbg',
      serviceTimes: [],
      campusName: 'Palm Beach Gardens',
    };
    renderConfirmation({ ...defaultProps, onSuccess });
    fireEvent.click(screen.getByText('Continue'));
    expect(onSuccess).toHaveBeenCalledOnce();
  });

  it('renders Add to Calendar button with calendar options in dropdown', () => {
    const location = { href: '' };
    vi.stubGlobal('location', location);

    mockFetcherData = {
      address: '123 Main St',
      url: 'pbg',
      serviceTimes: [],
      campusName: 'Palm Beach Gardens',
    };
    renderConfirmation();
    fireEvent.click(screen.getByRole('button', { name: /Add to Calendar/i }));
    expect(
      screen.getByRole('link', { name: /Google Calendar/i }),
    ).toHaveAttribute(
      'href',
      'https://calendar.google.com/calendar/render?action=TEMPLATE',
    );

    const appleCalendarButton = screen.getByRole('button', {
      name: /Apple Calendar/i,
    });
    fireEvent.click(appleCalendarButton);
    expect(location.href).toBe(
      '/calendar-ics?campus=palm-beach-gardens&time=9%3A00%20AM',
    );

    vi.unstubAllGlobals();
  });
});
