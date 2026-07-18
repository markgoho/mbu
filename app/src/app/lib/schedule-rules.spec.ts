import { describe, expect, it } from 'vitest';
import type { RegistrationResponse, RegistrationStatus } from '../api-types/registrations-api.types';
import { findScheduleConflict, scoutProgress } from './schedule-rules';

function registration(overrides: Partial<RegistrationResponse> = {}): RegistrationResponse {
  const status: RegistrationStatus = overrides.status ?? 'enrolled';
  return {
    scoutId: 'scout1',
    classId: 'archery',
    universityId: 'uni1',
    status,
    periodIds: ['p1'],
    badgeSlug: 'archery',
    badgeTitle: 'Archery',
    waitlistedAt: status === 'waitlisted' ? '2026-01-01T00:00:00.000Z' : null,
    enrolledAt: status === 'enrolled' ? '2026-01-01T00:00:00.000Z' : null,
    ...overrides,
  };
}

describe('findScheduleConflict', () => {
  it('returns null when no registration shares a period', () => {
    const conflict = findScheduleConflict('camping', ['p2'], [registration({ periodIds: ['p1'] })]);
    expect(conflict).toBeNull();
  });

  it('reports a conflict against an enrolled class sharing a period', () => {
    const conflict = findScheduleConflict(
      'camping',
      ['p1'],
      [registration({ classId: 'archery', badgeTitle: 'Archery', status: 'enrolled', periodIds: ['p1'] })],
    );
    expect(conflict).toEqual({ classId: 'archery', badgeTitle: 'Archery' });
  });

  it('reports a conflict against a waitlisted class sharing a period (the waitlist holds the slot)', () => {
    const conflict = findScheduleConflict(
      'camping',
      ['p1'],
      [
        registration({
          classId: 'archery',
          badgeTitle: 'Archery',
          status: 'waitlisted',
          periodIds: ['p1'],
        }),
      ],
    );
    expect(conflict).toEqual({ classId: 'archery', badgeTitle: 'Archery' });
  });

  it('excludes the candidate class itself, even if it holds the same period', () => {
    const conflict = findScheduleConflict(
      'archery',
      ['p1'],
      [registration({ classId: 'archery', periodIds: ['p1'] })],
    );
    expect(conflict).toBeNull();
  });

  it('detects a conflict when only one of several candidate periods overlaps', () => {
    const conflict = findScheduleConflict(
      'camping',
      ['p2', 'p3'],
      [registration({ classId: 'hiking', badgeTitle: 'Hiking', periodIds: ['p1', 'p3'] })],
    );
    expect(conflict).toEqual({ classId: 'hiking', badgeTitle: 'Hiking' });
  });

  it('returns the first conflicting registration in scout-registration order', () => {
    const conflict = findScheduleConflict(
      'camping',
      ['p1'],
      [
        registration({ classId: 'archery', badgeTitle: 'Archery', periodIds: ['p1'] }),
        registration({ classId: 'hiking', badgeTitle: 'Hiking', periodIds: ['p1'] }),
      ],
    );
    expect(conflict).toEqual({ classId: 'archery', badgeTitle: 'Archery' });
  });
});

describe('scoutProgress', () => {
  it('counts zero scheduled periods with no registrations', () => {
    expect(scoutProgress([], 3)).toEqual({ scheduled: 0, total: 3 });
  });

  it('counts distinct periods across registrations, not registration count', () => {
    const registrations = [
      registration({ classId: 'archery', periodIds: ['p1'] }),
      registration({ classId: 'hiking', periodIds: ['p1', 'p2'] }),
    ];
    expect(scoutProgress(registrations, 3)).toEqual({ scheduled: 2, total: 3 });
  });

  it('counts a waitlisted registration toward scheduled periods', () => {
    const registrations = [registration({ status: 'waitlisted', periodIds: ['p1'] })];
    expect(scoutProgress(registrations, 2)).toEqual({ scheduled: 1, total: 2 });
  });
});
