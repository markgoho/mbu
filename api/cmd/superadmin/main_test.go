package main

import (
	"context"
	"errors"
	"maps"
	"testing"

	"firebase.google.com/go/v4/auth"
)

// fakeUsers is a Firebase Auth user store held in memory.
type fakeUsers struct {
	users    map[string]*auth.UserRecord
	setErr   error
	setCalls int
}

const (
	uidJane   = "jane"
	uidBob    = "bob"
	janeEmail = "jane@example.com"
	flagEmail = "-email"
	flagUID   = "-uid"
)

var errNotFound = errors.New("fake: no user")

func (f *fakeUsers) GetUser(_ context.Context, uid string) (*auth.UserRecord, error) {
	if u, ok := f.users[uid]; ok {
		return u, nil
	}
	return nil, errNotFound
}

func (f *fakeUsers) GetUserByEmail(_ context.Context, email string) (*auth.UserRecord, error) {
	for _, u := range f.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, errNotFound
}

func (f *fakeUsers) SetCustomUserClaims(_ context.Context, uid string, claims map[string]any) error {
	f.setCalls++
	if f.setErr != nil {
		return f.setErr
	}
	f.users[uid].CustomClaims = claims
	return nil
}

func newFakeUsers() *fakeUsers {
	return &fakeUsers{users: map[string]*auth.UserRecord{
		uidJane: {UserInfo: &auth.UserInfo{UID: uidJane, Email: janeEmail},
			CustomClaims: map[string]any{"beta": true}},
		uidBob: {UserInfo: &auth.UserInfo{UID: uidBob, Email: "bob@example.com"}},
	}}
}

func TestGrantSuperAdmin_ByEmailKeepsOtherClaims(t *testing.T) {
	users := newFakeUsers()
	got, err := grantSuperAdmin(t.Context(), users, config{Email: janeEmail})
	if err != nil {
		t.Fatalf("grantSuperAdmin: %v", err)
	}
	want := map[string]any{"beta": true, "superAdmin": true}
	if got.UID != uidJane || !maps.Equal(users.users[uidJane].CustomClaims, want) {
		t.Errorf("got %s with claims %v, want jane with %v", got.UID, users.users[uidJane].CustomClaims, want)
	}
}

func TestGrantSuperAdmin_ByUIDWithNoClaims(t *testing.T) {
	users := newFakeUsers()
	if _, err := grantSuperAdmin(t.Context(), users, config{UID: uidBob}); err != nil {
		t.Fatalf("grantSuperAdmin: %v", err)
	}
	if want := map[string]any{"superAdmin": true}; !maps.Equal(users.users[uidBob].CustomClaims, want) {
		t.Errorf("claims = %v, want %v", users.users[uidBob].CustomClaims, want)
	}
}

func TestGrantSuperAdmin_UnknownAccount(t *testing.T) {
	users := newFakeUsers()
	if _, err := grantSuperAdmin(t.Context(), users, config{Email: "nobody@example.com"}); !errors.Is(err, errNotFound) {
		t.Fatalf("got %v, want errNotFound", err)
	}
	if users.setCalls != 0 {
		t.Errorf("SetCustomUserClaims called %d times, want 0", users.setCalls)
	}
}

func TestGrantSuperAdmin_SetFails(t *testing.T) {
	users := newFakeUsers()
	users.setErr = errors.New("denied")
	if _, err := grantSuperAdmin(t.Context(), users, config{UID: uidBob}); !errors.Is(err, users.setErr) {
		t.Fatalf("got %v, want %v", err, users.setErr)
	}
}

func TestParseConfig(t *testing.T) {
	env := func(m map[string]string) func(string) string {
		return func(k string) string { return m[k] }
	}

	tests := []struct {
		name    string
		args    []string
		env     map[string]string
		want    config
		wantErr bool
	}{
		{name: "emulator by default", args: []string{flagEmail, janeEmail},
			want: config{Email: janeEmail, ProjectID: "merit-badge-university", EmulatorHost: "127.0.0.1:9099"}},
		{name: "emulator host from the environment", args: []string{flagUID, uidJane},
			env:  map[string]string{"FIREBASE_AUTH_EMULATOR_HOST": "localhost:9199", "GCP_PROJECT_ID": "p"},
			want: config{UID: uidJane, ProjectID: "p", EmulatorHost: "localhost:9199"}},
		{name: "production", args: []string{"-production", flagEmail, "me@example.com"},
			want: config{Email: "me@example.com", ProjectID: "merit-badge-university", Production: true}},
		{name: "production refuses an emulator host", args: []string{"-production", flagUID, "x"},
			env: map[string]string{"FIREBASE_AUTH_EMULATOR_HOST": "localhost:9099"}, wantErr: true},
		{name: "no account", args: nil, wantErr: true},
		{name: "both email and uid", args: []string{flagEmail, "a@b.c", flagUID, "x"}, wantErr: true},
		{name: "unknown flag", args: []string{"-nope"}, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseConfig(tt.args, env(tt.env))
			if tt.wantErr {
				if err == nil {
					t.Fatalf("parseConfig: want an error, got %+v", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("parseConfig: %v", err)
			}
			if got != tt.want {
				t.Errorf("parseConfig = %+v, want %+v", got, tt.want)
			}
		})
	}
}
