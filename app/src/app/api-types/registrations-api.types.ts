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

export interface RosterRow {
  scoutId: string;
  scoutFirstName: string;
  scoutLastName: string;
  scoutUnit: string | null;
  accommodations: string | null;
  parentName: string;
  parentEmail: string;
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
