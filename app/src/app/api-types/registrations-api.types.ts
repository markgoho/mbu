export interface RegisterRequest {
  scoutId: string;
  acceptWaitlist?: boolean;
}

export type RegistrationStatus = 'enrolled' | 'waitlisted';

export interface RegistrationResponse {
  scoutId: string;
  classId: string;
  universityId: string;
  status: RegistrationStatus;
  periodIds: string[];
  badgeSlug: string;
  badgeTitle: string;
  waitlistedAt: string | null;
  enrolledAt: string | null;
}

export interface ScheduleResponse {
  registrations: RegistrationResponse[];
}
