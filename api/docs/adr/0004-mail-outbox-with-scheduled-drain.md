# ADR 0004 — Mail delivery is an outbox with a scheduled drain

- **Status:** Accepted
- **Date:** 2026-10-02
- **Applies to:** `api/**` (mail)
- **Related:** #240 (decision 8), #257 (mail outbox), #261 (Cloud Scheduler jobs), #106 (Mailgun and DNS), #107 and #108 (scheduled mail). Source: doula-cloud ADR-0010, notification email is an outbox (`~/github/doula-cloud/docs/adr/0010-notification-email-delivery-is-an-outbox-not-in-request.md`), with its #481 amendment; and ADR-0013, the Cloud Tasks nudge (`~/github/doula-cloud/docs/adr/0013-outbox-delivery-gets-a-cloud-tasks-nudge.md`).

## Context

`functions/` sends Mailgun mail inside the request (registered, promoted) and writes each attempt to `emailLog`. A Mailgun failure loses the mail, and a crash between the state change and the send loses it too. For a Parent, the registration and promotion mail is the record of a seat. doula-cloud had the same problem and solved it with an outbox.

## Decision

1. **A request writes an outbox row in the same transaction as the state change.** The handler does not call Mailgun. Its response depends only on whether the transaction committed.
2. **A drain sends the mail.** One internal endpoint drains the outbox: it reads due rows and calls Mailgun outside any user request. A Cloud Scheduler job calls it each minute. The endpoint is on the internal boundary ([ADR 0005](0005-internal-boundary-is-a-caller-identity.md)).
3. **One drain endpoint, not one per outbox.** If MBU gets more than one outbox, the drain runs each registered outbox in turn, and one Scheduler job calls it (doula-cloud's #481 amendment to ADR-0010).
4. **Retry is bounded.** A failed row is tried again with backoff a small number of times, then it is marked dead-lettered. It is not retried forever.
5. **No Cloud Tasks nudge in v1.** ADR-0013 adds a nudge after each commit to cut the delay to seconds. It is the upgrade path if one minute is too slow.
6. **Test seam.** A `mail.Sender` interface with a Mailgun implementation and a fake. The drain's worker function can be called directly from a test, with no scheduler.

## Consequences

- A Mailgun outage delays mail; it does not lose it.
- Mail can arrive up to about one minute after the request.
- An `Idempotency-Key` replay never sends the mail twice, because the response does not depend on the send.
- This ADR does not decide whether the outbox row replaces the `emailLog` audit trail. #243 and #257 decide that. (#257: it does. See `data-model.md`, "`emailLog` and the mail outbox".)
