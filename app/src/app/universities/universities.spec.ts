import { describe, expect, it } from 'vitest';
import { DISCLAIMER_TEXT, DISCLAIMER_VERSION } from '../constants/disclaimer';
import { findOverlaps } from './period-board/period-board';

describe('disclaimer constants', () => {
  it('has a stable version string', () => {
    expect(DISCLAIMER_VERSION).toBe('2026-07-03');
  });

  it('includes not-verified wording', () => {
    expect(DISCLAIMER_TEXT).toContain('not been verified by Scouting America');
  });
});

describe('period overlap detection', () => {
  it('detects overlapping intervals', () => {
    const periods = [
      {
        label: 'A',
        startsAt: '2026-06-01T08:00:00.000Z',
        endsAt: '2026-06-01T10:00:00.000Z',
      },
      {
        label: 'B',
        startsAt: '2026-06-01T09:00:00.000Z',
        endsAt: '2026-06-01T11:00:00.000Z',
      },
    ];
    expect(findOverlaps(periods)).not.toBeNull();
  });

  it('allows adjacent non-overlapping intervals', () => {
    const periods = [
      {
        label: 'A',
        startsAt: '2026-06-01T08:00:00.000Z',
        endsAt: '2026-06-01T10:00:00.000Z',
      },
      {
        label: 'B',
        startsAt: '2026-06-01T10:00:00.000Z',
        endsAt: '2026-06-01T12:00:00.000Z',
      },
    ];
    expect(findOverlaps(periods)).toBeNull();
  });
});
