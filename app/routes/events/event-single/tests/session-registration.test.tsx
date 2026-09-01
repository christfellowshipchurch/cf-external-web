import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SessionRegistrationCardType } from '../types';

const mockLoaderData = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return { ...actual, useLoaderData: () => mockLoaderData() };
});

const { MemoryRouter } = await import('react-router-dom');
const { SessionRegistration } =
  await import('../components/session-registration');

const baseCard: SessionRegistrationCardType = {
  icon: 'map',
  title: 'Palm Beach Gardens',
  description: '5343 Northlake Blvd Palm Beach Gardens FL 33418',
  date: 'Thursday, September 24th',
  programTime: '7pm',
  partyTime: '',
  startDateTime: '2026-09-24T19:00:00',
};

const renderWith = (card: Partial<SessionRegistrationCardType>) => {
  mockLoaderData.mockReturnValue({
    title: 'Diesel',
    sessionScheduleCards: [{ ...baseCard, ...card }],
  });
  return render(
    <MemoryRouter>
      <SessionRegistration />
    </MemoryRouter>,
  );
};

const cta = () =>
  screen.queryByRole('button', { name: /Reserve|Get Tickets/i });
const calendarButton = () =>
  screen.queryByRole('button', { name: /Add to Calendar/i });

describe('SessionRegistrationCard — Rock Call / Action / ShowAddToCalendar', () => {
  it('labels the button from Call and points it at Action', () => {
    renderWith({
      ctaTitle: 'Reserve Your Seat',
      ctaUrl: 'https://brushfire.com/christfellowship/diesel2026/633283',
    });
    expect(cta()).toBeTruthy();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://brushfire.com/christfellowship/diesel2026/633283',
    );
  });

  // AC: the label falls back gracefully, but only the label — Action has no
  // fallback now that TicketsUrl is no longer read.
  it('falls back to the default label when Call is blank', () => {
    renderWith({ ctaTitle: '', ctaUrl: 'https://example.com/tickets' });
    expect(screen.getByRole('button', { name: 'Get Tickets' })).toBeTruthy();
  });

  // A Button with no href renders an inert <button>, so an unset Action must
  // omit the CTA entirely rather than ship a button that silently does nothing.
  it('renders no button at all when Action is unset', () => {
    renderWith({ ctaTitle: 'Reserve Your Seat', ctaUrl: '' });
    expect(cta()).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  // The footer wrapper carries `gap-2 pt-4`, so rendering it empty left a
  // visible band of dead space at the bottom of the card.
  it('omits the footer wrapper entirely when neither button renders', () => {
    const { container } = renderWith({ ctaUrl: '', showAddToCalendar: false });
    expect(container.querySelector('.mt-auto')).toBeNull();
  });

  it('keeps the footer wrapper when only Add to Calendar renders', () => {
    const { container } = renderWith({ ctaUrl: '', showAddToCalendar: true });
    expect(calendarButton()).toBeTruthy();
    expect(container.querySelector('.mt-auto')).not.toBeNull();
  });

  it('shows Add to Calendar only when ShowAddToCalendar is true', () => {
    renderWith({ ctaUrl: 'https://example.com', showAddToCalendar: true });
    expect(calendarButton()).toBeTruthy();
  });

  it('hides Add to Calendar when ShowAddToCalendar is false or unset', () => {
    renderWith({ ctaUrl: 'https://example.com', showAddToCalendar: false });
    expect(calendarButton()).toBeNull();
  });

  // The boolean alone is not enough: without a parseable session date there is
  // no valid .ics to offer.
  it('hides Add to Calendar when the session has no usable date', () => {
    renderWith({
      ctaUrl: 'https://example.com',
      showAddToCalendar: true,
      startDateTime: '',
    });
    expect(calendarButton()).toBeNull();
  });
});
