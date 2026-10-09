import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import BaptismSignUpConfirmation from '../confirmation.component';

vi.mock('~/lib/utils', async () => {
  const actual =
    await vi.importActual<typeof import('~/lib/utils')>('~/lib/utils');
  return {
    ...actual,
    icsLinkEvents: () => [
      {
        label: '10:00 AM',
        event: {
          title: 'Baptism at Christ Fellowship Church',
          description: '',
          address: 'Palm Beach Gardens',
          startTime: new Date('2026-08-02T10:00:00'),
          endTime: new Date('2026-08-02T11:00:00'),
          url: 'https://christfellowship.church',
        },
      },
    ],
    googleCalendarLink: () => 'https://calendar.google.com/baptism',
    icsLink: () => '/baptism.ics',
  };
});

const details = {
  title: 'Baptism Details',
  campus: 'Palm Beach Gardens',
  date: 'Sunday, August 2',
  time: '10:00 AM ET',
  name: 'Ada Lovelace',
};

function renderConfirmation(
  props: Partial<React.ComponentProps<typeof BaptismSignUpConfirmation>> = {},
) {
  return render(
    <MemoryRouter>
      <BaptismSignUpConfirmation {...props} />
    </MemoryRouter>,
  );
}

describe('BaptismSignUpConfirmation', () => {
  it('shows clickthrough event details and calendar options', () => {
    renderConfirmation({ details, buttonText: 'Register someone else' });

    expect(screen.getByText('Baptism Details')).toBeInTheDocument();
    expect(screen.getByText('Palm Beach Gardens')).toBeInTheDocument();
    expect(screen.getByText('Sunday, August 2')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM ET')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add to Calendar' }));
    expect(
      screen.getByRole('link', { name: 'Google Calendar' }),
    ).toHaveAttribute('href', 'https://calendar.google.com/baptism');
    expect(
      screen.getByRole('button', { name: 'Apple Calendar (.ics)' }),
    ).toBeInTheDocument();
  });

  it('calls onContinue when registering someone else', () => {
    const onContinue = vi.fn();
    renderConfirmation({
      details,
      buttonText: 'Register someone else',
      onContinue,
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Register someone else' }),
    );

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('keeps the standalone confirmation free of event and calendar details', () => {
    const onSuccess = vi.fn();
    renderConfirmation({ onSuccess });

    expect(
      screen.getByRole('button', { name: 'Continue' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add to Calendar' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Baptism Details')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
