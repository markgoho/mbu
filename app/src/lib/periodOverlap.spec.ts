import { describe, expect, it } from 'vitest';
import { findOverlaps } from '#lib/periodOverlap.js';

describe('period overlap detection', () => {
  it('detects overlapping intervals', () => {
    const periods = [
      { label: 'A', startsAt: '2026-06-01T08:00:00.000Z', endsAt: '2026-06-01T10:00:00.000Z' },
      { label: 'B', startsAt: '2026-06-01T09:00:00.000Z', endsAt: '2026-06-01T11:00:00.000Z' },
    ];

    expect(findOverlaps(periods)).toEqual({ a: 'A', b: 'B' });
  });

  it('allows adjacent non-overlapping intervals', () => {
    const periods = [
      { label: 'A', startsAt: '2026-06-01T08:00:00.000Z', endsAt: '2026-06-01T10:00:00.000Z' },
      { label: 'B', startsAt: '2026-06-01T10:00:00.000Z', endsAt: '2026-06-01T12:00:00.000Z' },
    ];

    expect(findOverlaps(periods)).toBeNull();
  });
});
