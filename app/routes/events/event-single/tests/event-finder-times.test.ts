import { describe, expect, it } from 'vitest';
import { compareEventFinderTimes } from '../event-finder-times';

describe('compareEventFinderTimes', () => {
  it('orders Algolia baptism times by clock, not index order', () => {
    // Prod currently returns PBG Sunday times as 1:00 PM, 11:30 AM, 9:45 AM,
    // 8:15 AM. Showing that order makes the last service look like the first.
    const times = ['1:00 PM', '11:30 AM', '9:45 AM', '8:15 AM'];

    expect([...times].sort(compareEventFinderTimes)).toEqual([
      '8:15 AM',
      '9:45 AM',
      '11:30 AM',
      '1:00 PM',
    ]);
  });

  it('keeps noon after morning services instead of treating 12 as midnight', () => {
    expect(compareEventFinderTimes('12:00 PM', '11:30 AM')).toBeGreaterThan(0);
    expect(compareEventFinderTimes('12:00 AM', '8:15 AM')).toBeLessThan(0);
  });
});
