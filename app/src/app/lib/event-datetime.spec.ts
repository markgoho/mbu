import { describe, expect, it } from 'vitest';
import { datetimeInputToIso, isoToDatetimeInput } from './event-datetime';

describe('event datetime conversion', () => {
  it('converts browser-local datetime input to UTC', () => {
    expect(datetimeInputToIso('2026-06-01T08:30')).toBe('2026-06-01T12:30:00.000Z');
  });

  it('renders UTC values in browser-local time with minute precision', () => {
    expect(isoToDatetimeInput('2026-01-05T14:05:59.999Z')).toBe('2026-01-05T09:05');
  });

  it('round-trips ordinary local datetimes', () => {
    const local = '2026-06-01T08:30';
    expect(isoToDatetimeInput(datetimeInputToIso(local))).toBe(local);
  });

  it('uses native Date DST normalization for nonexistent local times', () => {
    expect(datetimeInputToIso('2026-03-08T02:30')).toBe('2026-03-08T07:30:00.000Z');
    expect(isoToDatetimeInput('2026-03-08T07:30:00.000Z')).toBe('2026-03-08T03:30');
  });
});
