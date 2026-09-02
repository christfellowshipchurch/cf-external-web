import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AddToCalendar } from '../add-to-calendar.component';

const baseProps = {
  googleHref: 'https://calendar.google.com/calendar/render',
  getIcsUrl: () => 'blob:ics',
  eventDate: new Date('2026-09-24T19:00:00'),
};

const trigger = () => screen.getByRole('button', { name: /Add to Calendar/i });

describe('AddToCalendar trigger styling', () => {
  // Three other callers (the journey-finder and set-a-reminder confirmations,
  // and the outreach sidebar) were built against the lg/rounded-xl trigger.
  // buttonSize and buttonClassName were added for CFDP-4275, so the defaults
  // must stay exactly what those callers already render.
  it('defaults to the large, rounded-xl trigger the modal callers rely on', () => {
    render(<AddToCalendar {...baseProps} />);
    expect(trigger().className).toContain('rounded-xl');
    expect(trigger().className).toContain('text-lg');
  });

  // The event session card pairs this with a `size='md'` Get Tickets CTA; a
  // mismatched font size and radius made the calendar button loom over it.
  it('adopts the caller size so it can match an adjacent CTA', () => {
    render(<AddToCalendar {...baseProps} buttonSize='md' />);
    expect(trigger().className).not.toContain('text-lg');
    expect(trigger().className).toContain('min-h-11');
  });

  it('lets the caller override the default radius', () => {
    render(
      <AddToCalendar
        {...baseProps}
        buttonSize='md'
        buttonClassName='rounded-md'
      />,
    );
    expect(trigger().className).toContain('rounded-md');
    expect(trigger().className).not.toContain('rounded-xl');
  });
});
