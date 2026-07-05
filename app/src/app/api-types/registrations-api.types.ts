export interface RegisterRequest {
  scoutId: string;
  acceptWaitlist?: boolean;
  acceptConsent: boolean;
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

export interface RosterRow {
  scoutId: string;
  /** Null once the retention purge scrubs this registration's PII snapshot. */
  scoutFirstName: string | null;
  scoutLastName: string | null;
  scoutUnit: string | null;
  accommodations: string | null;
  parentName: string | null;
  parentEmail: string | null;
  consentReceived: boolean;
  status: RegistrationStatus;
}

export interface ClassRoster {
  class: {
    classId: string;
    badgeTitle: string;
    periodLabels: string[];
    room: string | null;
    capacity: number;
    enrolledCount: number;
    waitlistCount: number;
    counselorNames: string[];
  };
  enrolled: RosterRow[];
  waitlisted: RosterRow[];
}

export interface RosterResponse {
  university: {
    title: string;
    startDate: string;
    endDate: string | null;
    location: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
    };
    timezone: string;
  };
  classRosters: ClassRoster[];
}
