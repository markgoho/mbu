import { t, type Static } from "elysia";

/** Adult account, serialized for the client (Timestamps → ISO strings). */
export const UserResponseSchema = t.Object({
  uid: t.String(),
  displayName: t.String(),
  email: t.String(),
  phone: t.Union([t.String(), t.Null()]),
  acceptedTermsAt: t.Union([t.String(), t.Null()]),
  acceptedPrivacyAt: t.Union([t.String(), t.Null()]),
  acceptedPolicyVersion: t.Union([t.String(), t.Null()]),
  rosterExportAckAt: t.Union([t.String(), t.Null()]),
});
export type UserResponse = Static<typeof UserResponseSchema>;

/** Bootstrap result: the user doc plus whether onboarding/consent is still required. */
export const BootstrapResponseSchema = t.Object({
  user: UserResponseSchema,
  needsConsent: t.Boolean(),
});
export type BootstrapResponse = Static<typeof BootstrapResponseSchema>;

/** Onboarding submission: name + the combined Terms/Privacy acceptance. */
export const OnboardingRequestSchema = t.Object({
  displayName: t.String({ minLength: 1 }),
  acceptedTerms: t.Literal(true),
});
export type OnboardingRequest = Static<typeof OnboardingRequestSchema>;
