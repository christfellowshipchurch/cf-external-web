import { describe, it, expect } from 'vitest';
import {
  composeIsoBirthdate,
  splitIsoBirthdate,
  validateBirthdateParts,
} from '../birthdate.utils';

const TODAY = new Date(2026, 7, 24); // 24 Aug 2026

describe('composeIsoBirthdate', () => {
  // Rock reads this string directly (workflow `Birthdate` attribute) and
  // `mapInputFieldsToRock` parses it into BirthMonth/BirthDay/BirthYear, so the
  // zero-padded ISO shape is a contract, not a formatting preference.
  it('zero-pads single-digit entry into yyyy-mm-dd', () => {
    expect(composeIsoBirthdate({ month: '7', day: '4', year: '1995' })).toBe(
      '1995-07-04',
    );
  });

  it('accepts 29 February in a leap year', () => {
    expect(composeIsoBirthdate({ month: '02', day: '29', year: '2024' })).toBe(
      '2024-02-29',
    );
  });

  // A date that does not exist must not reach Rock, where it would silently
  // roll over to the next month.
  it('rejects 29 February outside a leap year', () => {
    expect(composeIsoBirthdate({ month: '02', day: '29', year: '2023' })).toBe(
      '',
    );
  });

  it('rejects 30 February', () => {
    expect(composeIsoBirthdate({ month: '02', day: '30', year: '2024' })).toBe(
      '',
    );
  });

  it('returns empty while the year is still being typed', () => {
    expect(composeIsoBirthdate({ month: '07', day: '14', year: '199' })).toBe(
      '',
    );
  });
});

describe('splitIsoBirthdate', () => {
  it('round-trips an ISO date back into parts', () => {
    expect(splitIsoBirthdate('1995-07-14')).toEqual({
      month: '07',
      day: '14',
      year: '1995',
    });
  });

  it('yields empty parts for anything that is not yyyy-mm-dd', () => {
    expect(splitIsoBirthdate('')).toEqual({ month: '', day: '', year: '' });
    expect(splitIsoBirthdate('07/14/1995')).toEqual({
      month: '',
      day: '',
      year: '',
    });
  });
});

describe('validateBirthdateParts', () => {
  it('flags an empty required field, matching the old `required` attribute', () => {
    expect(
      validateBirthdateParts(
        { month: '', day: '', year: '' },
        { isRequired: true, today: TODAY },
      ),
    ).toBe('Please enter your birthdate');
  });

  it('stays silent on an empty optional field', () => {
    expect(
      validateBirthdateParts(
        { month: '', day: '', year: '' },
        { isRequired: false, today: TODAY },
      ),
    ).toBeNull();
  });

  it('flags a partially filled date', () => {
    expect(
      validateBirthdateParts(
        { month: '07', day: '', year: '1995' },
        { isRequired: true, today: TODAY },
      ),
    ).toBe('Please enter your full birthdate as MM / DD / YYYY');
  });

  it('flags an out-of-range month', () => {
    expect(
      validateBirthdateParts(
        { month: '13', day: '01', year: '1995' },
        { isRequired: true, today: TODAY },
      ),
    ).toBe('Please enter a month between 1 and 12');
  });

  it('explains a day that does not exist in the chosen month', () => {
    expect(
      validateBirthdateParts(
        { month: '02', day: '30', year: '2024' },
        { isRequired: true, today: TODAY },
      ),
    ).toBe('That day does not exist in the month you picked');
  });

  // Replaces `max={today}` on the old `<input type="date">`.
  it('rejects a future birthdate', () => {
    expect(
      validateBirthdateParts(
        { month: '08', day: '25', year: '2026' },
        { isRequired: true, today: TODAY },
      ),
    ).toBe('Your birthdate cannot be in the future');
  });

  it('accepts a birthdate of today', () => {
    expect(
      validateBirthdateParts(
        { month: '08', day: '24', year: '2026' },
        { isRequired: true, today: TODAY },
      ),
    ).toBeNull();
  });

  // Catches a mistyped year (e.g. 1066) before it becomes a Rock person record.
  it('rejects a year more than 120 years ago', () => {
    expect(
      validateBirthdateParts(
        { month: '07', day: '14', year: '1066' },
        { isRequired: true, today: TODAY },
      ),
    ).toBe('Please enter a year between 1906 and 2026');
  });

  it('accepts an ordinary birthdate', () => {
    expect(
      validateBirthdateParts(
        { month: '07', day: '14', year: '1995' },
        { isRequired: true, today: TODAY },
      ),
    ).toBeNull();
  });
});
