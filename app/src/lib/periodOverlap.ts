import type { PeriodInput } from '#lib/api-types/universities-api.types.js';

/**
The labels of two periods that overlap in time.
*/
export interface PeriodOverlap {
  a: string;
  b: string;
}

/**
 * Finds the first two periods that overlap in time. A period that starts at the
 * moment a different one ends does not overlap it. The API accepts periods that
 * overlap: the period board only warns the chancellor.
 */
export function findOverlaps(periods: PeriodInput[]): PeriodOverlap | null {
  for (const [index, first] of periods.entries()) {
    const firstStart = new Date(first.startsAt).getTime();
    const firstEnd = new Date(first.endsAt).getTime();
    const laterPeriods = periods.slice(index + 1);
    for (const second of laterPeriods) {
      const secondStart = new Date(second.startsAt).getTime();
      const secondEnd = new Date(second.endsAt).getTime();
      if (firstStart < secondEnd && secondStart < firstEnd) {
        return { a: first.label, b: second.label };
      }
    }
  }
  return null;
}
