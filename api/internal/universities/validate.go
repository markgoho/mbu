package universities

import (
	"bytes"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	// Embeds the IANA zone database in the binary, so time.LoadLocation
	// does not depend on the zoneinfo files of the distroless runtime
	// image.
	_ "time/tzdata"

	"mbu/api/internal/apierr"
)

// universityRequest is the body of a create or a patch. Each field is
// raw JSON, so a check can tell a field left out (nil) from a null
// ("null") and give a field of the wrong JSON type its own entry in
// details.
type universityRequest struct {
	ID                   json.RawMessage `json:"id"`
	Title                json.RawMessage `json:"title"`
	Timezone             json.RawMessage `json:"timezone"`
	StartDate            json.RawMessage `json:"startDate"`
	EndDate              json.RawMessage `json:"endDate"`
	RegistrationOpensAt  json.RawMessage `json:"registrationOpensAt"`
	RegistrationClosesAt json.RawMessage `json:"registrationClosesAt"`
	Location             json.RawMessage `json:"location"`
}

// optionalTime is a nullable time field of a request: set when the
// request names the field, and t nil when it is null.
type optionalTime struct {
	set bool
	t   *time.Time
}

// universityFields is a universityRequest that passed its field checks.
// A nil pointer, or an optionalTime that is not set, is a field the
// request left out.
type universityFields struct {
	id, title, timezone             *string
	startDate, registrationClosesAt *time.Time
	endDate, registrationOpensAt    optionalTime
	location                        *Location
}

// The JSON field names a details map names.
const (
	fieldID                   = "id"
	fieldTitle                = "title"
	fieldTimezone             = "timezone"
	fieldStartDate            = "startDate"
	fieldEndDate              = "endDate"
	fieldRegistrationOpensAt  = "registrationOpensAt"
	fieldRegistrationClosesAt = "registrationClosesAt"
	fieldLocation             = "location"
)

// The details entries of a field check.
const (
	msgID          = "Send the University id as a UUID."
	msgTitle       = "Enter a title of 1 to 120 characters."
	msgTimezone    = "Enter a timezone from the IANA database, such as America/New_York."
	msgStartDate   = "Enter the start date as a date and time."
	msgEndDate     = "Enter the end date as a date and time, or leave it empty."
	msgOpensAt     = "Enter the registration open time as a date and time, or leave it empty."
	msgClosesAt    = "Enter the registration close time as a date and time."
	msgLocation    = "Enter the location: name, address, city, state and zip."
	msgEndOrder    = "Enter an end date on or after the start date."
	msgWindowOrder = "Enter a registration open time before the registration close time."
)

// msgCheckForm is the message of a 400 with details.
const msgCheckForm = "Check the University form."

// maxTitleLength is the longest title, in characters.
const maxTitleLength = 120

// uuidPattern is the shape of a University id: the pattern of
// UniversityCreateRequestSchema and of universities_id_check.
var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// locationFields is each field of a location, with its details entry.
var locationFields = []struct{ name, message string }{
	{"name", "Enter the location name."},
	{"address", "Enter the location address."},
	{"city", "Enter the location city."},
	{"state", "Enter the location state."},
	{"zip", "Enter the location zip."},
}

// checker collects the problem of each field at fault, keyed by the JSON
// field name.
type checker struct {
	details map[string]string
}

// text reads a JSON string field. A field left out is nil; a field that
// is not a string, null included, is at fault.
func (c *checker) text(raw json.RawMessage, field, message string) *string {
	if raw == nil {
		return nil
	}
	var s string
	if isNull(raw) || json.Unmarshal(raw, &s) != nil {
		c.details[field] = message
		return nil
	}
	return &s
}

// instant reads a JSON string field that holds an RFC 3339 date-time.
func (c *checker) instant(raw json.RawMessage, field, message string) *time.Time {
	s := c.text(raw, field, message)
	if s == nil {
		return nil
	}
	t, err := time.Parse(time.RFC3339Nano, *s)
	if err != nil {
		c.details[field] = message
		return nil
	}
	return &t
}

// nullableInstant is instant for a field that may also be null.
func (c *checker) nullableInstant(raw json.RawMessage, field, message string) optionalTime {
	if raw == nil {
		return optionalTime{}
	}
	if isNull(raw) {
		return optionalTime{set: true}
	}
	return optionalTime{set: true, t: c.instant(raw, field, message)}
}

// isNull reports whether raw is the JSON null.
func isNull(raw json.RawMessage) bool {
	return bytes.Equal(bytes.TrimSpace(raw), []byte("null"))
}

// check holds the field rules of UniversityCreateRequestSchema and
// UniversityPatchRequestSchema, and the checks of services/validation.ts
// that need only the field: an id in UUID shape; a title of 1 to 120
// characters once trimmed; a timezone the IANA database names; RFC 3339
// date-times; a location whose five fields are each text that is not
// blank. Strings are stored trimmed, as the TypeScript stored them.
// required names the fields a create must send.
func (req universityRequest) check(required bool) (universityFields, map[string]string) {
	c := &checker{details: map[string]string{}}
	f := universityFields{
		startDate:            c.instant(req.StartDate, fieldStartDate, msgStartDate),
		endDate:              c.nullableInstant(req.EndDate, fieldEndDate, msgEndDate),
		registrationOpensAt:  c.nullableInstant(req.RegistrationOpensAt, fieldRegistrationOpensAt, msgOpensAt),
		registrationClosesAt: c.instant(req.RegistrationClosesAt, fieldRegistrationClosesAt, msgClosesAt),
	}
	if required {
		if f.id = c.text(req.ID, fieldID, msgID); f.id != nil && !uuidPattern.MatchString(*f.id) {
			c.details[fieldID] = msgID
		}
	}
	if f.title = c.text(req.Title, fieldTitle, msgTitle); f.title != nil {
		t := strings.TrimSpace(*f.title)
		if t == "" || utf8.RuneCountInString(t) > maxTitleLength {
			c.details[fieldTitle] = msgTitle
		}
		f.title = &t
	}
	if f.timezone = c.text(req.Timezone, fieldTimezone, msgTimezone); f.timezone != nil && !isTimezone(*f.timezone) {
		c.details[fieldTimezone] = msgTimezone
	}
	f.location = c.location(req.Location)
	if required {
		for field, missing := range map[string]bool{
			fieldID: req.ID == nil, fieldTitle: req.Title == nil, fieldTimezone: req.Timezone == nil,
			fieldStartDate: req.StartDate == nil, fieldRegistrationClosesAt: req.RegistrationClosesAt == nil,
			fieldLocation: req.Location == nil,
		} {
			if missing {
				c.details[field] = requiredMessage[field]
			}
		}
	}
	return f, c.details
}

// requiredMessage is the details entry for each field a create must send.
var requiredMessage = map[string]string{
	fieldID: msgID, fieldTitle: msgTitle, fieldTimezone: msgTimezone, fieldStartDate: msgStartDate,
	fieldRegistrationClosesAt: msgClosesAt, fieldLocation: msgLocation,
}

// location reads the location object. A location that is not an object
// is at fault as a whole; a field of it that is not text, or is blank,
// is at fault as location.<field>.
func (c *checker) location(raw json.RawMessage) *Location {
	if raw == nil {
		return nil
	}
	var fields map[string]json.RawMessage
	if isNull(raw) || json.Unmarshal(raw, &fields) != nil {
		c.details[fieldLocation] = msgLocation
		return nil
	}
	values := make([]string, len(locationFields))
	for i, lf := range locationFields {
		key := fieldLocation + "." + lf.name
		v := c.text(fields[lf.name], key, lf.message)
		if v == nil || strings.TrimSpace(*v) == "" {
			c.details[key] = lf.message
			continue
		}
		values[i] = strings.TrimSpace(*v)
	}
	return &Location{Name: values[0], Address: values[1], City: values[2], State: values[3], Zip: values[4]}
}

// isTimezone reports whether name is a zone of the IANA database.
// time.LoadLocation answers "" (UTC) and "Local" (the server's zone)
// without the database, so both are refused.
func isTimezone(name string) bool {
	if name == "" || name == "Local" {
		return false
	}
	_, err := time.LoadLocation(name)
	return err == nil
}

// checkOrder holds the two rules between the dates of a University: an
// end date on or after the start date, and a registration open time
// before the close time. It returns the problem of each field at fault.
func checkOrder(start time.Time, end *time.Time, opens *time.Time, closes time.Time) map[string]string {
	details := map[string]string{}
	if end != nil && end.Before(start) {
		details[fieldEndDate] = msgEndOrder
	}
	if opens != nil && !opens.Before(closes) {
		details[fieldRegistrationOpensAt] = msgWindowOrder
	}
	return details
}

// decodeUniversity decodes and checks the body of a create or a patch.
// On a refusal it writes the answer and returns false.
func decodeUniversity(w http.ResponseWriter, r *http.Request, required bool) (universityFields, bool) {
	var req universityRequest
	if !apierr.DecodeJSON(w, r, &req) {
		return universityFields{}, false
	}
	f, details := req.check(required)
	if len(details) > 0 {
		apierr.Write(w, http.StatusBadRequest, apierr.CodeInvalidArgument, msgCheckForm, details)
		return universityFields{}, false
	}
	return f, true
}
