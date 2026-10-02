import { describe, expect, it } from 'vitest';
import { formatMediumDate } from '#lib/formatDate.js';

describe('formatMediumDate', () => {
  it('gives the month, the day and the year', () => {
    expect(formatMediumDate('2026-06-01T12:00:00.000Z')).toBe('Jun 1, 2026');
  });

  it('uses the date in the timezone of the runtime, not the UTC date', () => {
    // 02:30 UTC on June 2 is 22:30 on June 1 in America/New_York (the timezone of the specs).
    expect(formatMediumDate('2026-06-02T02:30:00.000Z')).toBe('Jun 1, 2026');
  });
});
