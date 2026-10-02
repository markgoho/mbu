import type { RegistrationResponse } from '#lib/api-types/registrations-api.types.js';

export interface ScheduleConflict {
  classId: string;
  badgeTitle: string;
}

export interface ScheduleProgress {
  scheduled: number;
  total: number;
}

/**
 * Conflict check: does registering the scout into `candidateClassId` (covering
 * `candidatePeriodIds`) collide with a period the scout already holds an active
 * seat in for a *different* class? Mirrors the server's period exclusivity rule,
 * which treats both `enrolled` and `waitlisted` registrations as occupying the
 * period (a waitlist placement holds the slot). Keeping this in sync avoids
 * firing a register we know the API will reject with period_conflict.
 */
export function findScheduleConflict(
  candidateClassId: string,
  candidatePeriodIds: string[],
  scoutRegistrations: RegistrationResponse[],
): ScheduleConflict | null {
  for (const registration of scoutRegistrations) {
    if (registration.classId === candidateClassId) continue;
    if (registration.periodIds.some((periodId) => candidatePeriodIds.includes(periodId))) {
      return { classId: registration.classId, badgeTitle: registration.badgeTitle };
    }
  }
  return null;
}

/**
 * Distinct periods the scout has committed to — enrolled *or* waitlisted, since
 * a waitlisted period is occupied and blocks other classes (matches the
 * server's exclusivity rule and findScheduleConflict above).
 */
export function scoutProgress(
  scoutRegistrations: RegistrationResponse[],
  totalPeriods: number,
): ScheduleProgress {
  const scheduledPeriods = new Set<string>();
  for (const registration of scoutRegistrations) {
    for (const periodId of registration.periodIds) scheduledPeriods.add(periodId);
  }
  return { scheduled: scheduledPeriods.size, total: totalPeriods };
}
