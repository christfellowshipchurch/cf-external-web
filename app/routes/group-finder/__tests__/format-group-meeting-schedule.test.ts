import { describe, expect, it } from 'vitest';
import {
  extractWeekOfMonthScheduleLabel,
  formatGroupMeetingScheduleTitle,
  formatMeetingFrequencyLabel,
} from '../format-group-meeting-schedule';

describe('formatMeetingFrequencyLabel', () => {
  it('clarifies Monthly so it is not read as once-per-month only', () => {
    expect(formatMeetingFrequencyLabel('Monthly')).toBe('Select weeks monthly');
  });

  it('leaves other frequencies unchanged', () => {
    expect(formatMeetingFrequencyLabel('Weekly')).toBe('Weekly');
    expect(formatMeetingFrequencyLabel('Bi-Weekly')).toBe('Bi-Weekly');
  });
});

describe('extractWeekOfMonthScheduleLabel', () => {
  it('parses 1st & 3rd Saturdays from summary copy', () => {
    expect(
      extractWeekOfMonthScheduleLabel(
        'Meet 1st & 3rd Saturdays at the Googan coffee shop in Downtown Stuart.',
        'Saturday',
      ),
    ).toBe('1st & 3rd Saturdays');
  });

  it('parses 2nd and 4th Thursday of the month', () => {
    expect(
      extractWeekOfMonthScheduleLabel(
        'They meet on the 2nd and 4th Thursday of the month.',
        'Thursday',
      ),
    ).toBe('2nd & 4th Thursdays');
  });

  it('parses a single week-of-month day', () => {
    expect(
      extractWeekOfMonthScheduleLabel(
        'We meet the 2nd Friday of each month at various homes.',
        'Friday',
      ),
    ).toBe('2nd Friday of each month');
  });

  it('returns null when no week-of-month phrasing is present', () => {
    expect(
      extractWeekOfMonthScheduleLabel(
        'A fun cooking class where each week we will learn a recipe.',
        'Thursday',
      ),
    ).toBeNull();
  });
});

describe('formatGroupMeetingScheduleTitle', () => {
  it('uses week-of-month phrasing from summary when frequency is Monthly', () => {
    expect(
      formatGroupMeetingScheduleTitle({
        meetingFrequency: 'Monthly',
        meetingDay: 'Saturday',
        summary: 'Meet 1st & 3rd Saturdays at the Googan coffee shop.',
      }),
    ).toBe('1st & 3rd Saturdays');
  });

  it('falls back to clarified Monthly label when summary has no weeks', () => {
    expect(
      formatGroupMeetingScheduleTitle({
        meetingFrequency: 'Monthly',
        meetingDay: 'Friday',
        summary: 'Women of all ages looking to grow community.',
      }),
    ).toBe('Select weeks monthly, Friday');
  });

  it('keeps Weekly formatting', () => {
    expect(
      formatGroupMeetingScheduleTitle({
        meetingFrequency: 'Weekly',
        meetingDay: 'Monday',
        summary: '',
      }),
    ).toBe('Weekly, Monday');
  });
});
