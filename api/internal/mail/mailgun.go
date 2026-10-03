package mail

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// DefaultAPIBase is Mailgun's API host. MAILGUN_API_BASE overrides it
// (Mailgun's EU host, or a test server).
const DefaultAPIBase = "https://api.mailgun.net"

// DefaultDomain is the verified sending domain of
// functions/src/shared-api/services/email/constants.ts. MAILGUN_DOMAIN
// overrides it.
const DefaultDomain = "mg.merit-badge.university"

// sendTimeout bounds one send, so a hung Mailgun cannot hold an outbox
// row lock for the whole drain.
const sendTimeout = 10 * time.Second

// MailgunSender is the real Sender. It posts a form to Mailgun's HTTP
// API (no SDK) as "Merit Badge University <notifications@Domain>", the
// from-address of constants.ts.
type MailgunSender struct {
	APIKey     string
	Domain     string
	BaseURL    string
	HTTPClient *http.Client
}

// NewMailgunSender builds a MailgunSender. An empty domain or base is
// the default.
func NewMailgunSender(apiKey, domain, base string) *MailgunSender {
	if domain == "" {
		domain = DefaultDomain
	}
	if base == "" {
		base = DefaultAPIBase
	}
	return &MailgunSender{
		APIKey:     apiKey,
		Domain:     domain,
		BaseURL:    base,
		HTTPClient: &http.Client{Timeout: sendTimeout},
	}
}

// From is the From header of each mail.
func (m *MailgunSender) From() string {
	return "Merit Badge University <notifications@" + m.Domain + ">"
}

// Send posts msg to /v3/{domain}/messages. Open and click tracking are
// off: a mail to a Parent about a Scout carries no tracking pixel and no
// rewritten link.
func (m *MailgunSender) Send(ctx context.Context, msg Message) (string, error) {
	form := url.Values{}
	form.Set("from", m.From())
	form.Set("to", msg.To)
	form.Set("subject", msg.Subject)
	form.Set("text", msg.Text)
	form.Set("html", msg.HTML)
	form.Set("o:tracking", "no")
	form.Set("o:tracking-clicks", "no")
	form.Set("o:tracking-opens", "no")

	endpoint := strings.TrimSuffix(m.BaseURL, "/") + "/v3/" + url.PathEscape(m.Domain) + "/messages"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		// coverage:ignore reason: fails only on a malformed MAILGUN_API_BASE, which main() reads once
		return "", &SendError{ErrorID: ErrorUnknown, Detail: err.Error()}
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth("api", m.APIKey)

	resp, err := m.HTTPClient.Do(req)
	if err != nil {
		return "", &SendError{ErrorID: ErrorNetwork, Detail: err.Error()}
	}
	defer func() { _ = resp.Body.Close() }()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))

	if resp.StatusCode >= http.StatusMultipleChoices {
		return "", statusError(resp.StatusCode, strings.TrimSpace(string(body)))
	}
	var accepted struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &accepted); err != nil || accepted.ID == "" {
		// Mailgun took the mail but the answer has no id: a retry could
		// send it twice, so the id is recorded as unknown, as the
		// TypeScript did.
		return "unknown", nil
	}
	return accepted.ID, nil
}

// statusError classifies a Mailgun refusal by its status, as
// parseMailgunError did. Only 400 is permanent: a 401, 403 or 404 is a
// configuration fault, and once the secret or the domain is fixed the
// waiting rows go out.
func statusError(status int, body string) *SendError {
	detail := fmt.Sprintf("status %d: %s", status, body)
	switch status {
	case http.StatusBadRequest:
		return &SendError{ErrorID: ErrorInvalidRecipient, Permanent: true, Detail: detail}
	case http.StatusUnauthorized, http.StatusForbidden:
		return &SendError{ErrorID: ErrorAuthFailed, Detail: detail}
	case http.StatusNotFound:
		return &SendError{ErrorID: ErrorDomainNotConfigured, Detail: detail}
	case http.StatusTooManyRequests:
		return &SendError{ErrorID: ErrorRateLimited, Detail: detail}
	case http.StatusServiceUnavailable, http.StatusGatewayTimeout:
		return &SendError{ErrorID: ErrorNetwork, Detail: detail}
	default:
		return &SendError{ErrorID: ErrorUnknown, Detail: detail}
	}
}
