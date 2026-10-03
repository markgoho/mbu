package main

import (
	"database/sql"
	"net/http"
	"testing"

	"mbu/api/internal/apierr"
	"mbu/api/internal/authn"
	"mbu/api/internal/authz"
)

// authzTable is the real route table plus one test-only route for each
// authz assertion. No route of #249 calls the assertions; #250 to #255
// do. Each test route answers 204 when the assertion passes, and writes
// the refusal with authz.Write when it does not.
func authzTable(db *sql.DB) http.Handler {
	d := testDeps()
	d.DB = db
	rt := buildRoutes(d)
	check := func(assert func(r *http.Request, c authn.Caller) error) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, _ := authn.CallerFrom(r.Context())
			if err := assert(r, c); err != nil {
				authz.Write(w, r, err)
				return
			}
			w.WriteHeader(http.StatusNoContent)
		})
	}
	rt.authed("GET /api/test/chancellor/{universityId}", check(func(r *http.Request, c authn.Caller) error {
		return authz.AssertChancellorOf(r.Context(), db, c, r.PathValue("universityId"))
	}))
	rt.authed("GET /api/test/counselor/{universityId}/{classId}", check(func(r *http.Request, c authn.Caller) error {
		return authz.AssertCounselorOf(r.Context(), db, c, r.PathValue("universityId"), r.PathValue("classId"))
	}))
	rt.authed("GET /api/test/scout/{scoutId}", check(func(r *http.Request, c authn.Caller) error {
		return authz.AssertOwnsScout(r.Context(), db, c, r.PathValue("scoutId"))
	}))
	rt.authed("GET /api/test/super-admin", check(func(_ *http.Request, c authn.Caller) error {
		return authz.RequireSuperAdmin(c)
	}))
	return rt.handler(d.Now)
}

func TestAuthz_Assertions(t *testing.T) {
	f := newUsersFixture(t)
	f.user(uidParent, emailParent)
	f.user(uidOther, "other@example.com")
	f.university(uniOne, "published")
	f.university(uniTwo, "published")
	f.class(classOne, 10)
	f.class(classTwo, 10)
	f.scout(scoutAmy, uidParent)
	f.scout(scoutOther, uidOther)
	// The Parent is the Chancellor of University two and the Counselor
	// of Class one. A revoked Chancellor grant on University one does
	// not count.
	f.grant(uniTwo, "")
	f.grant(uniOne, classOne)
	f.exec(`INSERT INTO role_grants (role, university_id, uid, status)
		VALUES ('chancellor', $1, $2, 'revoked')`, uniOne, uidParent)
	f.h = authzTable(f.db.App)

	tests := []struct {
		name  string
		path  string
		token string
		want  int
	}{
		{"an active Chancellor", "/api/test/chancellor/" + uniTwo, tokenParent, http.StatusNoContent},
		{"a revoked Chancellor", "/api/test/chancellor/" + uniOne, tokenParent, http.StatusForbidden},
		{"a Super-admin as Chancellor", "/api/test/chancellor/" + uniOne, tokenSuperAdmin, http.StatusNoContent},
		{"the Counselor of the Class", "/api/test/counselor/" + uniOne + "/" + classOne, tokenParent, http.StatusNoContent},
		{"not the Counselor of the Class", "/api/test/counselor/" + uniOne + "/" + classTwo, tokenParent, http.StatusForbidden},
		{"the Chancellor of the Class's University", "/api/test/counselor/" + uniTwo + "/" + classTwo, tokenParent, http.StatusNoContent},
		{"a class id that is not a uuid", "/api/test/counselor/" + uniOne + "/not-a-uuid", tokenParent, http.StatusForbidden},
		{"a Super-admin as Counselor", "/api/test/counselor/" + uniOne + "/" + classTwo, tokenSuperAdmin, http.StatusNoContent},
		{"the Parent of the Scout", "/api/test/scout/" + scoutAmy, tokenParent, http.StatusNoContent},
		{"another Parent's Scout", "/api/test/scout/" + scoutOther, tokenParent, http.StatusForbidden},
		{"a scout id that is not a uuid", "/api/test/scout/not-a-uuid", tokenParent, http.StatusForbidden},
		{"a Super-admin has no Scout bypass", "/api/test/scout/" + scoutAmy, tokenSuperAdmin, http.StatusForbidden},
		{"a Super-admin", "/api/test/super-admin", tokenSuperAdmin, http.StatusNoContent},
		{"not a Super-admin", "/api/test/super-admin", tokenParent, http.StatusForbidden},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := f.send(http.MethodGet, tt.path, tt.token, "")
			defer resp.Body.Close()
			if tt.want == http.StatusForbidden {
				wantRefusal(t, resp, http.StatusForbidden, apierr.CodeForbidden)
				return
			}
			wantStatus(t, resp, tt.want)
		})
	}
}

func TestAuthz_ADatabaseFailureIsInternal(t *testing.T) {
	f := &usersFixture{t: t, h: authzTable(closedDB(t))}
	for _, path := range []string{
		"/api/test/chancellor/" + uniOne,
		"/api/test/counselor/" + uniOne + "/" + classOne,
		"/api/test/scout/" + scoutAmy,
	} {
		t.Run(path, func(t *testing.T) {
			resp := f.send(http.MethodGet, path, tokenParent, "")
			defer resp.Body.Close()
			wantRefusal(t, resp, http.StatusInternalServerError, apierr.CodeInternal)
		})
	}
}
