package regmail

import (
	htmltemplate "html/template"
	"io"
	"strings"
	texttemplate "text/template"

	"mbu/api/internal/mail"
)

// mailCopy is the subject, text and HTML of each Kind, ported from
// functions/src/shared-api/services/email/templates. Each mail goes to
// the Parent and names the Badge, never the Scout.
var mailCopy = map[Kind]struct{ subject, text, html string }{
	KindRegistered: {
		subject: `You're enrolled: {{.BadgeTitle}}`,
		text:    `Your scout is enrolled in the {{.BadgeTitle}} merit badge class. See you there!`,
		html:    `<p>Your scout is enrolled in the <strong>{{.BadgeTitle}}</strong> merit badge class. See you there!</p>`,
	},
	KindWaitlisted: {
		subject: `You're on the waitlist: {{.BadgeTitle}}`,
		text:    `Your scout is on the waitlist for the {{.BadgeTitle}} merit badge class. We'll email you if a seat opens up.`,
		html:    `<p>Your scout is on the waitlist for the <strong>{{.BadgeTitle}}</strong> merit badge class. We'll email you if a seat opens up.</p>`,
	},
	KindPromoted: {
		subject: `A seat opened up: {{.BadgeTitle}}`,
		text:    `Good news — a seat opened up and your scout is now enrolled in the {{.BadgeTitle}} merit badge class.`,
		html:    `<p>Good news — a seat opened up and your scout is now enrolled in the <strong>{{.BadgeTitle}}</strong> merit badge class.</p>`,
	},
}

// parsed holds the parsed templates of each Kind. A template that does
// not parse stops startup.
type parsed struct {
	subject, text *texttemplate.Template
	html          *htmltemplate.Template
}

var templates = func() map[Kind]parsed {
	out := make(map[Kind]parsed, len(mailCopy))
	for kind, c := range mailCopy {
		out[kind] = parsed{
			subject: texttemplate.Must(texttemplate.New(string(kind) + "-subject").Parse(c.subject)),
			text:    texttemplate.Must(texttemplate.New(string(kind) + "-text").Parse(c.text)),
			html:    htmltemplate.Must(htmltemplate.New(string(kind) + "-html").Parse(c.html)),
		}
	}
	return out
}()

// render is the mail of kind about the Class badgeTitle, to address to.
// The HTML part escapes the title; the subject and text are plain text.
func render(kind Kind, badgeTitle, to string) mail.Message {
	t := templates[kind]
	data := struct{ BadgeTitle string }{badgeTitle}
	return mail.Message{
		To:      to,
		Subject: execute(t.subject.Execute, data),
		Text:    execute(t.text.Execute, data),
		HTML:    execute(t.html.Execute, data),
	}
}

// execute runs one template into a string. The data is one string field
// that each template names, so Execute cannot fail.
func execute(run func(io.Writer, any) error, data any) string {
	var b strings.Builder
	_ = run(&b, data)
	return b.String()
}
