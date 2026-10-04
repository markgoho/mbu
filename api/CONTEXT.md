# MBU Event Platform

A self-serve SaaS that lets any adult Scouter run a Merit Badge University: create the event, build its class schedule, share a private link, and take Registrations from Parents. The SvelteKit SPA is in `app/`; the API is in `api/` (Go on Cloud Run, with Postgres). This glossary covers both, because the language is the same on both sides. The decisions are in `api/docs/adr/`. Terms come from #94 and from the doc comments of the Firestore collection types that the Go API replaced (#240).

## Language

### Events

**University**:
One dated Merit Badge University event: a title, a location, an IANA timezone, a start date (and an end date for a multi-day event), a Registration Window, and a set of Periods. It is private: a Parent reaches it only through its link (`noindex`, not listed). It is the tenancy scope of the platform: Role Grants, Classes and Registrations all belong to one University.
_Avoid_: Event (unqualified), MBU (for one event), session

**University Status**:
Where a University is in its moderation state machine. The legal moves are: `draft` → `submitted`; `submitted` → `published` or `rejected`; `rejected` → `submitted`; `published` → `closed`. A Super-admin approves or rejects a submitted University from the review queue. `needs_review` is reserved for later automated triage (#92) and has no moves yet. Only a `published` University takes Registrations.
_Avoid_: State, phase

**Period**:
A block of time inside a University with an explicit, absolute start and end and a label. Periods are a bounded set, edited with the University. A Period's times are absolute; the University timezone is only for display.
_Avoid_: Slot, session, time block, hour

**Class**:
One Merit Badge taught at a University in one or more Periods, with a Capacity, an optional room and notes, and one or more Counselors. A Class that covers more than one Period is a multi-period Class. A Class links to the Badge Catalog by badge slug.
_Avoid_: Course, section, session

**Badge Catalog**:
The list of Merit Badges a Class can teach. It is a derived copy of the Hugo site's canonical list (`scripts/merit-badges.ts`) without the discontinued badges. Each entry is a slug, a title, and whether the badge is Eagle-required.
_Avoid_: Badge list, badges table

### Registration

**Registration**:
One Scout's hold on a seat in one Class. Its status is `enrolled`, `waitlisted` or `cancelled`. A Scout has at most one Registration per Class. A cancelled Registration is kept (soft delete), not removed. A Registration keeps a snapshot of the Scout and Parent details for the Roster.
_Avoid_: Enrollment (for the record), signup, booking, ticket

**Capacity**:
The hard maximum number of `enrolled` Registrations in a Class. Seats go first come, first served.
_Avoid_: Size, limit, seats (for the number)

**Waitlist**:
The ordered `waitlisted` Registrations of a full Class. Order is by the time the Registration was waitlisted; the position is derived, not stored. When a seat opens, the first waitlisted Registration is promoted to `enrolled` automatically (auto-promotion).
_Avoid_: Queue, backlog

**Period Conflict**:
Two `enrolled` or `waitlisted` Registrations for the same Scout in Classes that share a Period. The API refuses a Registration that makes one. A Scout's schedule is one Class per Period.
_Avoid_: Clash, overlap, double-booking

**Registration Window**:
The time in which Parents can register and change Registrations: from the optional open time to the close deadline the Chancellor sets.
_Avoid_: Signup period, enrollment period

**Schedule**:
A Parent's view of a Scout's Registrations across the Periods of one University.
_Avoid_: Timetable, agenda

**Roster**:
The list of Registrations for a Class or a University, for its Counselors and Chancellors, with CSV export. It can show accommodations. The first export needs a click-through warning, recorded on the user.
_Avoid_: Attendance list, class list

### People and roles

Adults have accounts. A role is a contextual Role Grant, not a fixed user type: one adult can be a Parent, a Counselor of one Class and a Chancellor of another University.

**Chancellor**:
An adult who creates and runs a University, through a `chancellor` Role Grant on it. A University has one or more. The Chancellor is legally accountable for the event and its staff (by the Terms of Service).
_Avoid_: Organizer, host, admin, owner

**Counselor**:
An adult who teaches a Class, through a `counselor` Role Grant on it. A Counselor self-attests a BSA member ID and the badges they counsel, accepts the Disclaimer, and is vouched for by the Chancellor. The platform shows that Scouting America did not verify this.
_Avoid_: Teacher, instructor, MBC (in UI copy)

**Parent**:
The adult account holder who owns Scouts, registers them and receives all mail. "Parent" is ownership of a Scout or Registration, not a stored role. The word includes a guardian.
_Avoid_: Guardian (as a separate term), user (when the role matters), family

**Scout**:
A youth profile under one Parent's account. A Scout has no login. It holds minimal personal data: name, unit, council, district, Age Band, an optional BSA member ID and optional free-text accommodations. There is no structured medical data and no date of birth.
_Avoid_: Child, kid, student, youth (as a type name), participant

**Age Band**:
A coarse age range for a Scout: `10-11`, `12-13`, `14-15` or `16-17`. It replaces a date of birth or an exact age.
_Avoid_: Age, DOB, grade

**Super-admin**:
The platform operator. The `superAdmin` custom claim on the Firebase ID token marks the Super-admin. The Super-admin is not scoped to a University and works the moderation review queue.
_Avoid_: Admin (unqualified), moderator, staff

**Role Grant**:
The record that gives an adult the `chancellor` or `counselor` role on one scope: a University or a Class. It is the only source of truth for authorization; display caches (such as the Counselors on a Class) are never used to authorize. A grant is `invited` (by email, before the adult has an account), `active` or `revoked`.
_Avoid_: Membership, permission, ACL, role (alone, for the record)

### Privacy and policy

**Policy Version**:
The version of the Terms and Privacy Policy that an adult accepted at onboarding, or that a Parent accepted when giving consent for a Registration. It is stored with each acceptance.
_Avoid_: Terms version, consent version

**Disclaimer**:
The statement a Counselor accepts when added to a Class: Scouting America has not verified their credentials. Its version is stored with the acceptance.
_Avoid_: Waiver, attestation (for the statement)

**Retention Purge**:
The scheduled job that nulls the personal fields of Registrations 90 days after a University ends. It keeps the Registration row, for later proof of advancement, and marks it purged. It runs on the internal boundary.
_Avoid_: Cleanup, deletion, GDPR job

**Email Log**:
The Youth-Protection audit trail of each transactional mail attempt for a University. It stores the Scout id, not the Scout's name or the mail body. In `api/` it is the mail outbox row (`registration_mail_outbox`): the row that a seat change writes and the drain sends is also the record of the attempt.
_Avoid_: Mail history, sent mail
