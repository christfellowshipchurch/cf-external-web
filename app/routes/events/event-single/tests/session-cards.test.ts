import { describe, it, expect } from 'vitest';
import { parseSessionCta, parseSessionStartDateTime } from '../utils';
import { htmlToPlainText } from '~/lib/text-content';

describe('parseSessionStartDateTime (CFDP-4275)', () => {
  // The .ics tags the value TZID=America/New_York, so the wall-clock digits Rock
  // gives us must survive untouched. If this ever converts to UTC, every
  // attendee outside Eastern gets a calendar entry at the wrong hour.
  it('preserves the wall-clock time rather than shifting it into a timezone', () => {
    expect(parseSessionStartDateTime('2026-12-13T18:30:00')).toBe(
      '2026-12-13T18:30:00',
    );
  });

  it('normalizes Rock US-style date strings to the same wall clock', () => {
    expect(parseSessionStartDateTime('12/13/2026 6:30:00 PM')).toBe(
      '2026-12-13T18:30:00',
    );
  });

  // A blank or broken date must suppress Add to Calendar entirely — offering a
  // calendar file with a bogus date is worse than offering none.
  it('returns an empty string when Rock has no session date', () => {
    expect(parseSessionStartDateTime('')).toBe('');
    expect(parseSessionStartDateTime('   ')).toBe('');
  });

  it('returns an empty string when the date cannot be parsed', () => {
    expect(parseSessionStartDateTime('not a date')).toBe('');
  });
});

describe('htmlToPlainText (CFDP-4275)', () => {
  // The session's additionalInfo becomes the .ics DESCRIPTION. Its sibling
  // collapseHtmlToVisibleText strips whitespace outright because it only tests
  // for emptiness — using that here turned the ticket price into an unreadable
  // "TicketPrice:$199|GroupTicketRate(10+tickets):$149" in real calendar apps.
  it('keeps words separated when flattening Rock rich text', () => {
    expect(
      htmlToPlainText(
        '<p>Ticket Price: $199 | Group Ticket Rate (10+ tickets): $149</p>',
      ),
    ).toBe('Ticket Price: $199 | Group Ticket Rate (10+ tickets): $149');
  });

  it('joins block elements with a space instead of running them together', () => {
    expect(htmlToPlainText('<p>Doors at 8</p><p>Program at 8:30</p>')).toBe(
      'Doors at 8 Program at 8:30',
    );
  });

  it('decodes entities Rock emits so they do not leak into the calendar', () => {
    expect(htmlToPlainText('<p>Coffee &amp; snacks&nbsp;provided</p>')).toBe(
      'Coffee & snacks provided',
    );
  });

  it('returns an empty string for rich text that is visually empty', () => {
    expect(htmlToPlainText('<p>&nbsp;</p>')).toBe('');
  });
});

describe('parseSessionCta (CFDP-4275)', () => {
  // Rock stores this attribute as a `label^url` pair, not plain text. Rendering
  // the raw value shipped a button reading "Testing CTA^#add-link-here" to the
  // Diesel event page — the label and destination must be split apart.
  it('splits the Rock label^url pair into its two halves', () => {
    expect(parseSessionCta('Testing CTA^#add-link-here')).toEqual({
      ctaTitle: 'Testing CTA',
      ctaUrl: '#add-link-here',
    });
  });

  it('decodes escaped characters in the label, as hero CTAs do', () => {
    expect(
      parseSessionCta('Reserve%20Your%20Seat^https://ex.com').ctaTitle,
    ).toBe('Reserve Your Seat');
  });

  // Both halves are optional: an empty result is what lets the card fall back
  // to "Get Tickets" and the session's own ticketsUrl.
  it('returns empty halves when the Rock field is unset', () => {
    expect(parseSessionCta('')).toEqual({ ctaTitle: '', ctaUrl: '' });
  });

  it('treats a value with no caret as a label so it still reaches the button', () => {
    expect(parseSessionCta('Register Now')).toEqual({
      ctaTitle: 'Register Now',
      ctaUrl: '',
    });
  });

  it('keeps the label when the url half is blank', () => {
    expect(parseSessionCta('Register Now^')).toEqual({
      ctaTitle: 'Register Now',
      ctaUrl: '',
    });
  });
});
