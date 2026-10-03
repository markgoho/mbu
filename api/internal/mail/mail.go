// Package mail is the seam over transactional mail delivery (#257, ADR
// 0004). The outbox drain sends through a Sender: MailgunSender in a
// deployed service, FakeSender in tests and on the local stack, so no
// test and no local run can reach Mailgun. Copied from doula-cloud's
// internal/mail, with an HTML part, the Mailgun message id, and the
// error ids of functions/src/shared-api/services/email/errors.ts.
package mail

import (
	"context"
	"errors"
)

// Message is one mail to a Parent. It always has an HTML and a text
// part, as the TypeScript templates did.
type Message struct {
	To      string
	Subject string
	Text    string
	HTML    string
}

// Sender delivers msg and returns the provider's message id. An error
// means the outbox row is tried again later (unless the error is
// Permanent), not that the mail is known to be undelivered.
type Sender interface {
	Send(ctx context.Context, msg Message) (messageID string, err error)
}

// SendError is a failed send, classified as errors.ts classified it.
// ErrorID goes into the outbox row's error_id. Permanent is true when a
// retry cannot succeed: the outbox row goes to the dead-letter state at
// once.
type SendError struct {
	ErrorID   string
	Permanent bool
	Detail    string
}

func (e *SendError) Error() string {
	return "mail: " + e.ErrorID + ": " + e.Detail
}

// The error ids of errors.ts, which the outbox stores in error_id.
const (
	ErrorAuthFailed          = "mailgun_auth_failed"
	ErrorInvalidRecipient    = "mailgun_invalid_recipient"
	ErrorDomainNotConfigured = "mailgun_domain_not_configured"
	ErrorRateLimited         = "mailgun_rate_limited"
	ErrorNetwork             = "mailgun_network_error"
	ErrorUnknown             = "mailgun_unknown"
)

// Classify is the error id of err and whether a retry cannot help. An
// error that is not a *SendError is mailgun_unknown and is tried again.
func Classify(err error) (errorID string, permanent bool) {
	if se, ok := errors.AsType[*SendError](err); ok {
		return se.ErrorID, se.Permanent
	}
	return ErrorUnknown, false
}
