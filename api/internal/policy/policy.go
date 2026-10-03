// Package policy holds the versions and texts the API stamps on a consent,
// and the Retention Purge window. They moved here from
// functions/src/constants (privacy.ts, disclaimer.ts, retention.ts).
// app/src/lib/disclaimer.ts holds a copy of the Disclaimer; keep the two
// the same.
package policy

// Version is the Policy Version (CONTEXT.md): stamped on a Parent's
// consent to a Registration and on an adult's onboarding acceptance of
// the Terms and the Privacy Policy. It was POLICY_VERSION.
const Version = "2026-07-04"

// DisclaimerVersion is stamped on a Counselor's attestation when a Class
// is created. It was DISCLAIMER_VERSION.
const DisclaimerVersion = "2026-07-03"

// DisclaimerText is shown beside the acceptance box in the Class
// Counselor form. It was DISCLAIMER_TEXT.
const DisclaimerText = "I understand that my merit badge counselor credentials have not been verified by Scouting America. " +
	"Merit Badge University does not confirm BSA registration or counselor authorization."

// RetentionWindowDays is the number of days after a University's
// effective end before the Retention Purge clears the personal data of
// its Registrations. It was RETENTION_WINDOW_DAYS.
const RetentionWindowDays = 90
