package main

import (
	"fmt"
	"time"
)

// The fixed ids of the fixtures, so a second run replaces the same rows.
// The "5eed" prefix makes a seeded id easy to see in a log or a URL.
const (
	uniSpring = "5eed0001-0000-4000-8000-000000000001"
	uniFall   = "5eed0001-0000-4000-8000-000000000002"
	uniReview = "5eed0001-0000-4000-8000-000000000003"

	periodSpring1 = "5eed0002-0000-4000-8000-000000000001"
	periodSpring2 = "5eed0002-0000-4000-8000-000000000002"
	periodSpring3 = "5eed0002-0000-4000-8000-000000000003"
	periodFall1   = "5eed0002-0000-4000-8000-000000000004"
	periodReview1 = "5eed0002-0000-4000-8000-000000000005"

	classCamping     = "5eed0003-0000-4000-8000-000000000001"
	classFirstAid    = "5eed0003-0000-4000-8000-000000000002"
	classCitizenship = "5eed0003-0000-4000-8000-000000000003"
	classFallCooking = "5eed0003-0000-4000-8000-000000000004"

	scoutAmy = "5eed0004-0000-4000-8000-000000000001"
	scoutBen = "5eed0004-0000-4000-8000-000000000002"

	uidAlice = "alice"
	uidSam   = "sam"
	uidKim   = "kim"
	uidJane  = "jane"
	uidBob   = "bob"
)

// The versions the TypeScript API stamps today
// (functions/src/constants/privacy.ts and disclaimer.ts).
const (
	policyVersion     = "2026-07-04"
	disclaimerVersion = "2026-07-03"
)

// seedAccounts are the adults: Alice is a Parent with two Scouts, Sam
// and Kim are Counselors (Sam on two Universities), Jane and Bob are the
// Chancellors of the published University. The uid of each is the same
// in the Auth emulator and in users.uid.
var seedAccounts = []account{
	{UID: uidAlice, Email: "alice@example.com", DisplayName: "Alice P"},
	{UID: uidSam, Email: "sam@example.com", DisplayName: "Sam C"},
	{UID: uidKim, Email: "kim@example.com", DisplayName: "Kim C"},
	{UID: uidJane, Email: "jane@example.com", DisplayName: "Jane X"},
	{UID: uidBob, Email: "bob@example.com", DisplayName: "Bob X"},
}

// statement is one SQL statement of the seed transaction.
type statement struct {
	sql  string
	args []any
}

// fixtures is the seed as SQL, in foreign-key order. It is the same
// dataset as firestore/seed.ts, moved to dates after now: the event day
// is 60 days after now, and the Registration Window is open until 10
// days before it, so the published University takes Registrations.
func fixtures(now time.Time) []statement {
	day := now.UTC().Truncate(24*time.Hour).AddDate(0, 0, 60)
	at := func(hour, minute int) time.Time {
		return day.Add(time.Duration(hour)*time.Hour + time.Duration(minute)*time.Minute)
	}
	closes := day.AddDate(0, 0, -10)

	uids := make([]string, len(seedAccounts))
	for i, a := range seedAccounts {
		uids[i] = a.UID
	}

	// Deleting the seeded Universities and accounts cascades to every
	// other fixture row (docs/data-model.md, "Delete behavior").
	s := []statement{
		{`DELETE FROM universities WHERE id = ANY($1)`, []any{[]string{uniSpring, uniFall, uniReview}}},
		{`DELETE FROM users WHERE uid = ANY($1)`, []any{uids}},
	}

	for _, a := range seedAccounts {
		s = append(s, statement{`INSERT INTO users (uid, display_name, email, accepted_terms_at,
			accepted_privacy_at, accepted_policy_version) VALUES ($1, $2, $3, $4, $4, $5)`,
			[]any{a.UID, a.DisplayName, a.Email, now, policyVersion}})
	}

	scout := func(id, firstName, ageBand string) statement {
		return statement{`INSERT INTO scouts (id, parent_uid, first_name, last_name, unit, age_band)
			VALUES ($1, 'alice', $2, 'P', 'Troop 123', $3)`, []any{id, firstName, ageBand}}
	}
	s = append(s, scout(scoutAmy, "Amy", "12-13"), scout(scoutBen, "Ben", "14-15"))

	// All three are created by Jane. Each status carries the timestamps
	// its CHECK constraints need.
	uni := func(id, title, status string, submittedAt, publishedAt any) statement {
		return statement{`INSERT INTO universities (id, title, status, timezone, start_date,
			registration_closes_at, location_name, location_address, location_city, location_state,
			location_zip, created_by_uid, submitted_at, submitted_by_uid, published_at)
			VALUES ($1, $2, $3, 'America/New_York', $4, $5, 'HS', '1 Main', 'Town', 'VA', '22000',
			'jane', $6, CASE WHEN $6::timestamptz IS NULL THEN NULL ELSE 'jane' END, $7)`,
			[]any{id, title, status, at(13, 0), closes, submittedAt, publishedAt}}
	}
	s = append(s,
		uni(uniSpring, "Spring MBU", "published", nil, now),
		uni(uniFall, "Fall MBU", "draft", nil, nil),
		uni(uniReview, "Pending Review MBU", "submitted", now, nil),
	)

	period := func(id, universityID string, position, hour int) statement {
		return statement{`INSERT INTO periods (id, university_id, label, starts_at, ends_at, position)
			VALUES ($1, $2, $3, $4, $5, $6)`,
			[]any{id, universityID, fmt.Sprintf("Period %d", position+1), at(hour, 0), at(hour, 50), position}}
	}
	s = append(s,
		period(periodSpring1, uniSpring, 0, 13),
		period(periodSpring2, uniSpring, 1, 14),
		period(periodSpring3, uniSpring, 2, 15),
		period(periodFall1, uniFall, 0, 13),
		period(periodReview1, uniReview, 0, 13),
	)

	class := func(id, universityID, slug, title string, capacity int, periodIDs, counselors []string) []statement {
		out := []statement{{`INSERT INTO classes (id, university_id, badge_slug, badge_title,
			eagle_required, capacity) VALUES ($1, $2, $3, $4, false, $5)`,
			[]any{id, universityID, slug, title, capacity}}}
		for _, p := range periodIDs {
			out = append(out, statement{`INSERT INTO class_periods (class_id, period_id, university_id)
				VALUES ($1, $2, $3)`, []any{id, p, universityID}})
		}
		for _, uid := range counselors {
			out = append(out,
				statement{`INSERT INTO class_counselors (class_id, uid, bsa_id, disclaimer_accepted_at,
					disclaimer_version) VALUES ($1, $2, $3, $4, $5)`,
					[]any{id, uid, "BSA-" + uid, now, disclaimerVersion}},
				statement{`INSERT INTO role_grants (role, university_id, class_id, uid, status)
					VALUES ('counselor', $1, $2, $3, 'active')`, []any{universityID, id, uid}})
		}
		return out
	}
	s = append(s, class(classCamping, uniSpring, "camping", "Camping", 1,
		[]string{periodSpring1}, []string{uidSam, uidKim})...)
	s = append(s, class(classFirstAid, uniSpring, "first-aid", "First Aid", 10,
		[]string{periodSpring2}, []string{uidSam})...)
	s = append(s, class(classCitizenship, uniSpring, "citizenship-in-the-community", "Citizenship", 10,
		[]string{periodSpring2, periodSpring3}, []string{uidKim})...)
	s = append(s, class(classFallCooking, uniFall, "cooking", "Cooking", 10,
		[]string{periodFall1}, []string{uidSam})...)

	s = append(s,
		statement{`INSERT INTO role_grants (role, university_id, uid, status)
			VALUES ('chancellor', $1, 'jane', 'active'), ('chancellor', $1, 'bob', 'active')`,
			[]any{uniSpring}},
		statement{`INSERT INTO role_grants (role, university_id, class_id, invited_email, status)
			VALUES ('counselor', $1, $2, 'newcoach@example.com', 'invited')`,
			[]any{uniSpring, classCitizenship}},
	)

	// Camping (Capacity 1) is full: Amy holds the seat and Ben waits.
	// Ben's First Aid Registration is cancelled.
	reg := func(classID, scoutID, firstName, status string, enrolledAt, waitlistedAt any) statement {
		return statement{`INSERT INTO registrations (class_id, scout_id, status, enrolled_at,
			waitlisted_at, parent_consent_at, accepted_policy_version, scout_first_name,
			scout_last_name, scout_unit, parent_name, parent_email)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'P', 'Troop 123', 'Alice P', 'alice@example.com')`,
			[]any{classID, scoutID, status, enrolledAt, waitlistedAt, now, policyVersion, firstName}}
	}
	s = append(s,
		reg(classCamping, scoutAmy, "Amy", "enrolled", now, nil),
		reg(classCamping, scoutBen, "Ben", "waitlisted", nil, now.Add(5*time.Minute)),
		reg(classFirstAid, scoutAmy, "Amy", "enrolled", now.Add(time.Minute), nil),
		reg(classFirstAid, scoutBen, "Ben", "cancelled", nil, nil),
	)
	return s
}
