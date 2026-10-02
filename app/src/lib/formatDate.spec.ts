import { describe, expect, it } from 'vitest';
import { formatMediumDate, formatMediumDateTime, formatShortTime } from '#lib/formatDate.js';

describe('formatMediumDate', () => {
  it('gives the month, the day and the year', () => {
    expect(formatMediumDate('2026-06-01T12:00:00.000Z')).toBe('Jun 1, 2026');
  });

  it('uses the date in the timezone of the runtime, not the UTC date', () => {
    // 02:30 UTC on June 2 is 22:30 on June 1 in America/New_York (the timezone of the specs).
    expect(formatMediumDate('2026-06-02T02:30:00.000Z')).toBe('Jun 1, 2026');
  });

  it('uses the date in the given timezone, not the date of the runtime', () => {
    // 02:30 UTC on June 2 is 11:30 on June 2 in Asia/Tokyo.
    expect(formatMediumDate('2026-06-02T02:30:00.000Z', 'Asia/Tokyo')).toBe('Jun 2, 2026');
  });
});

describe('formatShortTime', () => {
  it('gives the hour, the minutes and the day period', () => {
    // 13:00 UTC is 09:00 in America/New_York (the timezone of the specs).
    expect(formatShortTime('2026-06-01T13:00:00.000Z')).toBe('9:00 AM');
  });

  it('uses the time in the given timezone, not the time of the runtime', () => {
    expect(formatShortTime('2026-06-01T13:00:00.000Z', 'America/Chicago')).toBe('8:00 AM');
  });
});

describe('formatMediumDateTime', () => {
  it('gives the date and the time with seconds', () => {
    // 13:05:09 UTC is 09:05:09 in America/New_York (the timezone of the specs).
    expect(formatMediumDateTime('2026-06-01T13:05:09.000Z')).toBe('Jun 1, 2026, 9:05:09 AM');
  });

  it('uses the date and the time in the given timezone, not those of the runtime', () => {
    expect(formatMediumDateTime('2026-07-01T00:00:00.000Z', 'Asia/Tokyo')).toBe(
      'Jul 1, 2026, 9:00:00 AM',
    );
  });
});
