/**
 * Display helpers for group meeting frequency / schedule copy.
 *
 * Algolia only stores `meetingFrequency` as Weekly | Monthly | Bi-Weekly | Once | Daily.
 * Week-of-month details (1st & 3rd, etc.) are not indexed — they often appear in
 * the group summary. "Monthly" alone reads as "once a month", which is misleading
 * for multi-week schedules, so we clarify the label and enrich from summary when possible.
 */

const ORDINAL_RE = '(?:1st|2nd|3rd|4th|first|second|third|fourth)';
const DAY_RE =
  '(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues|Tue|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)';

const ORDINAL_NORMALIZE: Record<string, string> = {
  first: '1st',
  second: '2nd',
  third: '3rd',
  fourth: '4th',
  '1st': '1st',
  '2nd': '2nd',
  '3rd': '3rd',
  '4th': '4th',
};

const DAY_NORMALIZE: Record<string, string> = {
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
  sat: 'Saturday',
  saturday: 'Saturday',
  sun: 'Sunday',
  sunday: 'Sunday',
};

function normalizeOrdinal(value: string): string {
  return ORDINAL_NORMALIZE[value.toLowerCase()] ?? value;
}

function normalizeDayName(value: string): string {
  return DAY_NORMALIZE[value.toLowerCase()] ?? value;
}

function pluralizeDay(day: string): string {
  const full = normalizeDayName(day);
  return full.endsWith('s') ? full : `${full}s`;
}

/**
 * Human label for a raw Algolia `meetingFrequency` facet/value.
 * Keeps refine values unchanged — only affects display.
 */
export function formatMeetingFrequencyLabel(
  frequency: string | null | undefined,
): string {
  const value = (frequency ?? '').trim();
  if (!value) return '';
  if (/^monthly$/i.test(value)) {
    return 'Select weeks monthly';
  }
  return value;
}

/**
 * Try to pull "1st & 3rd Saturdays" / "2nd Friday of each month" style phrasing
 * from free text (usually the group summary).
 */
export function extractWeekOfMonthScheduleLabel(
  text: string | null | undefined,
  meetingDay?: string | null,
): string | null {
  const source = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!source) return null;

  const fallbackDay = (meetingDay ?? '').trim();

  const dual = source.match(
    new RegExp(
      `\\b(${ORDINAL_RE})\\s*(?:&|and|,)\\s*(?:the\\s+)?(${ORDINAL_RE})\\s+(${DAY_RE})s?\\b`,
      'i',
    ),
  );
  if (dual) {
    const a = normalizeOrdinal(dual[1]);
    const b = normalizeOrdinal(dual[2]);
    const day = normalizeDayName(dual[3]);
    return `${a} & ${b} ${pluralizeDay(day)}`;
  }

  const dualWeeks = source.match(
    new RegExp(
      `\\b(${ORDINAL_RE})\\s*(?:&|and|,)\\s*(?:the\\s+)?(${ORDINAL_RE})\\s+weeks?(?:\\s+of\\s+the\\s+month)?\\b`,
      'i',
    ),
  );
  if (dualWeeks && fallbackDay) {
    const a = normalizeOrdinal(dualWeeks[1]);
    const b = normalizeOrdinal(dualWeeks[2]);
    return `${a} & ${b} ${pluralizeDay(fallbackDay)}`;
  }

  const single = source.match(
    new RegExp(
      `\\b(?:the\\s+)?(${ORDINAL_RE})\\s+(${DAY_RE})s?(?:\\s+of\\s+(?:each|the|every)\\s+month)?\\b`,
      'i',
    ),
  );
  if (single) {
    const ordinal = normalizeOrdinal(single[1]);
    const day = normalizeDayName(single[2]);
    if (/\bof\s+(?:each|the|every)\s+month\b/i.test(source)) {
      return `${ordinal} ${day} of each month`;
    }
    // Prefer explicit month phrasing when frequency is monthly-style week-of-month.
    return `${ordinal} ${day} of each month`;
  }

  const singleWeek = source.match(
    new RegExp(
      `\\b(?:the\\s+)?(${ORDINAL_RE})\\s+week(?:s)?(?:\\s+of\\s+(?:each|the|every)\\s+month)?\\b`,
      'i',
    ),
  );
  if (singleWeek && fallbackDay) {
    const ordinal = normalizeOrdinal(singleWeek[1]);
    return `${ordinal} ${normalizeDayName(fallbackDay)} of each month`;
  }

  return null;
}

/**
 * Title line for the group-single schedule InfoItem
 * (e.g. "1st & 3rd Saturdays" or "Select weeks monthly, Saturday").
 */
export function formatGroupMeetingScheduleTitle({
  meetingFrequency,
  meetingDay,
  summary,
  title,
}: {
  meetingFrequency?: string | null;
  meetingDay?: string | null;
  summary?: string | null;
  title?: string | null;
}): string {
  const day = (meetingDay ?? '').trim() || 'TBD';
  const frequency = (meetingFrequency ?? '').trim();
  const source = `${summary ?? ''} ${title ?? ''}`;

  if (/^monthly$/i.test(frequency)) {
    const fromCopy = extractWeekOfMonthScheduleLabel(source, day);
    if (fromCopy) return fromCopy;
    return `${formatMeetingFrequencyLabel(frequency)}, ${day}`;
  }

  if (!frequency) return day;
  return `${formatMeetingFrequencyLabel(frequency)}, ${day}`;
}
