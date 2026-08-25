/**
 * Birthdate helpers for the MM / DD / YYYY input. Kept separate from the
 * component so the date rules can be unit tested on their own.
 */

export interface BirthdateParts {
  month: string;
  day: string;
  year: string;
}

export const EMPTY_BIRTHDATE_PARTS: BirthdateParts = {
  month: '',
  day: '',
  year: '',
};

/** Oldest birthdate we accept. Anything earlier is a typo, not a person. */
const MAX_AGE_YEARS = 120;

/** Splits an ISO `yyyy-mm-dd` into parts. Anything else yields empty parts. */
export const splitIsoBirthdate = (iso: string): BirthdateParts => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');

  if (!match) return EMPTY_BIRTHDATE_PARTS;

  const [, year, month, day] = match;

  return { month, day, year };
};

/**
 * Builds `yyyy-mm-dd` from the three parts. Returns `''` unless all three are
 * present and describe a real calendar date, so callers can treat a non-empty
 * return as submittable.
 */
export const composeIsoBirthdate = ({
  month,
  day,
  year,
}: BirthdateParts): string => {
  if (year.length !== 4 || month === '' || day === '') return '';

  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const yearNumber = Number(year);

  // Round-tripping through Date catches Feb 30 and leap years without a table:
  // the components only survive construction if the date actually exists.
  const date = new Date(yearNumber, monthNumber - 1, dayNumber);

  if (
    date.getFullYear() !== yearNumber ||
    date.getMonth() !== monthNumber - 1 ||
    date.getDate() !== dayNumber
  ) {
    return '';
  }

  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(
    dayNumber,
  ).padStart(2, '0')}`;
};

/**
 * Returns a user-facing message for the first problem found, or `null` when the
 * parts are a valid birthdate (or are empty and the field is optional).
 */
export const validateBirthdateParts = (
  { month, day, year }: BirthdateParts,
  { isRequired, today = new Date() }: { isRequired: boolean; today?: Date },
): string | null => {
  const isEmpty = month === '' && day === '' && year === '';

  if (isEmpty) {
    return isRequired ? 'Please enter your birthdate' : null;
  }

  if (month === '' || day === '' || year.length !== 4) {
    return 'Please enter your full birthdate as MM / DD / YYYY';
  }

  const monthNumber = Number(month);

  if (monthNumber < 1 || monthNumber > 12) {
    return 'Please enter a month between 1 and 12';
  }

  const dayNumber = Number(day);

  if (dayNumber < 1 || dayNumber > 31) {
    return 'Please enter a day between 1 and 31';
  }

  const yearNumber = Number(year);
  const currentYear = today.getFullYear();

  if (yearNumber > currentYear || yearNumber < currentYear - MAX_AGE_YEARS) {
    return `Please enter a year between ${currentYear - MAX_AGE_YEARS} and ${currentYear}`;
  }

  const iso = composeIsoBirthdate({ month, day, year });

  if (!iso) {
    return 'That day does not exist in the month you picked';
  }

  const endOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999,
  );

  if (new Date(yearNumber, monthNumber - 1, dayNumber) > endOfToday) {
    return 'Your birthdate cannot be in the future';
  }

  return null;
};
