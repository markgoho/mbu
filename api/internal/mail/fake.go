package mail

import (
	"context"
	"fmt"
	"sync"
)

// FakeSender is the Sender of the tests and of the local stack (main()
// uses it when MAILGUN_API_KEY is unset). It records each Message and
// never reaches the network.
type FakeSender struct {
	mu   sync.Mutex
	sent []Message
	// Err, when set, is what every Send returns instead of recording the
	// message: how a test plays a Mailgun failure.
	Err error
	// Logf, when set, logs each recorded send. main() passes log.Printf,
	// so a local drain shows each mail in the API's log.
	Logf func(format string, args ...any)
}

// Send records msg and returns the id "fake-<n>", or returns Err.
func (f *FakeSender) Send(_ context.Context, msg Message) (string, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.Err != nil {
		return "", f.Err
	}
	f.sent = append(f.sent, msg)
	id := fmt.Sprintf("fake-%d", len(f.sent))
	if f.Logf != nil {
		f.Logf("mail: fake send %s to=%s subject=%q", id, msg.To, msg.Subject)
	}
	return id, nil
}

// Sent is each Message recorded so far, in send order.
func (f *FakeSender) Sent() []Message {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]Message(nil), f.sent...)
}
