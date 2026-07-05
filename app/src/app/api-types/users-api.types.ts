export type AgeBand = '10-11' | '12-13' | '14-15' | '16-17';

/** Adult account, serialized for the client (Timestamps -> ISO strings). */
export interface UserResponse {
  uid: string;
  displayName: string;
  email: string;
  phone: string | null;
  acceptedTermsAt: string | null;
  acceptedPrivacyAt: string | null;
  acceptedPolicyVersion: string | null;
  rosterExportAckAt: string | null;
}

/** Bootstrap result: the user doc plus whether onboarding/consent is still required. */
export interface BootstrapResponse {
  user: UserResponse;
  needsConsent: boolean;
}

/** Onboarding submission: name + the combined Terms/Privacy acceptance. */
export interface OnboardingRequest {
  displayName: string;
  acceptedTerms: true;
}

/** Scout profile serialized for the client. */
export interface ScoutResponse {
  scoutId: string;
  firstName: string;
  lastName: string;
  unit: string | null;
  council: string | null;
  district: string | null;
  ageBand: AgeBand | null;
  bsaId: string | null;
  accommodations: string | null;
}

export interface ScoutListResponse {
  scouts: ScoutResponse[];
}

/** Create/update payload for a dependent scout profile. */
export interface ScoutRequest {
  firstName: string;
  lastName: string;
  unit?: string | null;
  council?: string | null;
  district?: string | null;
  ageBand?: AgeBand | null;
  bsaId?: string | null;
  accommodations?: string | null;
}
