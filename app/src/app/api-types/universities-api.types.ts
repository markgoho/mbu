export interface UniversityLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export type UniversityStatus =
  | 'draft'
  | 'submitted'
  | 'needs_review'
  | 'published'
  | 'closed'
  | 'rejected';

export interface UniversityResponse {
  id: string;
  title: string;
  status: UniversityStatus;
  timezone: string;
  startDate: string;
  endDate: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string;
  location: UniversityLocation;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface UniversitySummary {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string | null;
  classCount: number;
}

export interface UniversityListResponse {
  universities: UniversitySummary[];
}

export interface UniversityCreateRequest {
  id: string;
  title: string;
  timezone: string;
  startDate: string;
  endDate?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt: string;
  location: UniversityLocation;
}

export interface UniversityPatchRequest {
  title?: string;
  timezone?: string;
  startDate?: string;
  endDate?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string;
  location?: UniversityLocation;
}

export interface Period {
  periodId: string;
  label: string;
  startsAt: string;
  endsAt: string;
}

export interface PeriodInput {
  periodId?: string;
  label: string;
  startsAt: string;
  endsAt: string;
}

export interface PeriodsPutRequest {
  periods: PeriodInput[];
}

export interface PeriodsResponse {
  periods: Period[];
}

export interface ClassCounselor {
  uid: string;
  displayName: string;
  bsaId: string;
  disclaimerAcceptedAt: string;
  disclaimerVersion: string;
}

export interface ClassResponse {
  classId: string;
  badgeSlug: string;
  badgeTitle: string;
  eagleRequired: boolean;
  periodIds: string[];
  capacity: number;
  enrolledCount: number;
  waitlistCount: number;
  room: string | null;
  notes: string | null;
  counselors: ClassCounselor[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassCreateRequest {
  badgeSlug: string;
  periodIds: string[];
  capacity: number;
  room?: string | null;
  notes?: string | null;
  counselor: {
    bsaId: string;
    acceptDisclaimer: true;
  };
}

export interface ClassPatchRequest {
  badgeSlug?: string;
  periodIds?: string[];
  capacity?: number;
  room?: string | null;
  notes?: string | null;
}

export interface BadgeCatalogEntry {
  slug: string;
  title: string;
  eagleRequired: boolean;
}

export interface BadgeCatalogResponse {
  badges: BadgeCatalogEntry[];
}

export interface UniversityDetailResponse {
  university: UniversityResponse & { periods: Period[] };
  classes: ClassResponse[];
}

export interface PublicClassCounselor {
  displayName: string;
}

export interface PublicClass {
  classId: string;
  badgeSlug: string;
  badgeTitle: string;
  eagleRequired: boolean;
  periodIds: string[];
  room: string | null;
  notes: string | null;
  capacity: number;
  enrolledCount: number;
  seatsRemaining: number;
  waitlistCount: number;
  counselors: PublicClassCounselor[];
}

export interface PublicUniversity {
  id: string;
  title: string;
  timezone: string;
  startDate: string;
  endDate: string | null;
  registrationOpensAt: string | null;
  registrationClosesAt: string;
  location: UniversityLocation;
  periods: Period[];
  classes: PublicClass[];
}

export interface ApiErrorBody {
  error?: string;
  code?: string;
  details?: {
    classes?: { classId: string; title: string }[];
  };
}
