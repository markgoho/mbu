# Go API Design Guidelines

Standards and architectural rules for designing and implementing HTTP APIs in Go for the MBU event platform (`api/`). These guidelines come from the doula-cloud Go API (`~/github/doula-cloud/docs/api-design.md`), which distilled them from proven production API practices (see [Sean Goedecke on Good API Design](https://www.seangoedecke.com/good-api-design/)) and adapted them to modern Go 1.22+ idioms.

The rules apply per endpoint, not everywhere (#240, decision 12): `Idempotency-Key` on POSTs that create a record, rate limits on unauthenticated routes, cursor pagination only on lists that can grow without a bound.

---

## 1. Core Philosophy: "Good APIs Are Boring"

- **Familiarity Over Novelty**: An API consumer should understand how an endpoint behaves before reading documentation. Default to standard HTTP semantics, status codes, and clear JSON payloads over complex or idiosyncratic abstractions.
- **Domain-Driven, Not Database-Driven**: Endpoints must model business entities and relationships defined in [`CONTEXT.md`](../CONTEXT.md) (e.g., `University`, `Period`, `Class`, `Registration`, `Scout`). Never leak low-level database schemas, internal job queues, or storage mechanics into the public API contract.
- **Simple Integration**: Integrations frequently begin life as simple scripts or frontend fetch calls. Avoid forcing unnecessary complexity (e.g., GraphQL or multi-step handshakes) when a clean REST endpoint with query parameters suffices.

---

## 2. Contract Stability ("We Do Not Break Userspace")

Once an API contract is live, downstream consumers (the Svelte app and its API types in `app/src/lib`) rely on its exact structure. The port from `functions/` keeps the same paths, methods and JSON success bodies; only the error body changes (section 7, [ADR 0001](adr/0001-go-on-cloud-run.md)).

### Rules

1. **Decouple HTTP DTOs from Database Schemas**: Never marshal raw SQL/database models directly to HTTP responses. Always define dedicated request/response Data Transfer Object (DTO) structs in handler/transport packages.
2. **Explicit JSON Tagging**: Every field in an API DTO must have an explicit `json:"fieldName"` tag. Use camelCase for API JSON fields matching frontend conventions.
3. **Additive Changes Only**:
   - Adding new fields to response structs is non-breaking (consumers must tolerate unknown fields).
   - Renaming, removing, or changing the data type of an existing field is a breaking change and is strictly prohibited.
4. **Avoid Proliferation of Versions (`/v1/`, `/v2/`)**:
   - Versioning introduces duplicate routing, fragmented test suites, and branching in core business logic.
   - Design endpoints defensively upfront so version bumps remain a rare last resort.

```go
// Good: Clear DTO isolated from DB row structures
type ClassResponse struct {
    ID        string    `json:"id"`
    BadgeSlug string    `json:"badgeSlug"`
    Capacity  int       `json:"capacity"`
    CreatedAt time.Time `json:"createdAt"`
    // Additive field added later safely
    Room      string    `json:"room,omitempty"`
}
```

---

## 3. Idempotency & Safe Retries for Mutating Operations

Network calls can time out, drop connections, or return 500s mid-flight. Callers need to retry without risking duplicate side-effects (e.g., a second Registration for the same Scout, or a second University).

### Rules

1. **`Idempotency-Key` Header**: Support an optional `Idempotency-Key` header on all non-idempotent mutating requests (`POST` endpoints that create records, dispatch mail, or trigger billing actions).
2. **Replay Stored Responses**: When a request with an existing idempotency key is received:
   - Do not re-execute the business logic.
   - Return the cached HTTP status code and response body from the initial execution.
3. **Storage & Scope**: Store idempotency keys scoped by the caller's user uid with a TTL of 48 hours (`idempotency.TTL`). The request hash holds the path, so a University in the path needs no scope of its own.
4. **Naturally Idempotent Methods**: `GET`, `PUT` (full replacement), and `DELETE /{id}` are inherently idempotent by convention and do not require idempotency keys.
5. **Every POST declares its stance** (#247). The route table mounts a POST with `replayable` (behind `idempotency.Wrap`) or with `exempt("reason")`; `routes_guardrail_test.go` fails a POST with neither. `replayable` needs a Caller, so it is for `rt.authed` routes only; an internal or public POST is `exempt`. A reuse of a key for a different request (method, path or body) is `409 IDEMPOTENCY_KEY_REUSED`. A key longer than 255 characters is `400 INVALID_ARGUMENT`. A 2xx or 4xx is stored and replays for 48 hours (a 4xx such as `CLASS_FULL` replays even after the state changes: a new action gets a new key); a 5xx is not stored, so the caller can retry. `idempotency.PurgeExpired` deletes the expired keys; the retention purge (#256) calls it.

```go
// Handler pattern for idempotent operations
func CreateClassHandler(deps Deps) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        idempotencyKey := r.Header.Get("Idempotency-Key")
        // Check cache / transactionally insert idempotency record
        // ...
    }
}
```

---

## 4. Cursor-Based Pagination for Scalable Collections

`OFFSET / LIMIT` pagination suffers from quadratic performance degradation on large tables and skips/duplicates records when items are concurrently inserted or deleted.

### Rules

1. **Cursor Pagination for Unbounded Lists**: For any unbounded or growing dataset (e.g., the Super-admin review queue, or a list of Universities), use cursor-based pagination using indexed columns (e.g. `(created_at, id)` or sequential IDs). A list with a natural bound (the Periods of one University, the Classes of one University, a Parent's Scouts) does not need it.
2. **Consistent Response Envelope**: Wrap paginated list responses in a standard envelope providing `items`, `nextCursor`, and `hasMore`.

```go
type PaginatedResponse[T any] struct {
    Items      []T     `json:"items"`
    NextCursor *string `json:"nextCursor,omitempty"`
    HasMore    bool    `json:"hasMore"`
}
```

3. **Efficient Database Querying**:

```sql
-- Query by cursor comparison rather than OFFSET
SELECT id, title, status, submitted_at, created_at
FROM universities
WHERE status = $1 AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT $4;
```

---

## 5. Keep Default Payloads Lean (Use `?include=`)

Default endpoints should be fast, minimal, and avoid heavy joins or expensive sub-queries.

### Rules

1. **Lightweight Defaults**: Return the core resource without unconditionally fetching nested collections or heavy external calculations.
2. **Selective Inclusion via `?include=`**: Allow callers to opt-in to related resources using query parameters rather than forcing a GraphQL layer or returning bloated payloads:
   - Example: `GET /api/universities/{id}?include=classes,periods`
   - The routes ported from `functions/` keep their current bodies (section 2). This rule is for new endpoints and new fields.
3. **Parse and Fetch Selectively**: In handlers/services, inspect requested includes and execute additional queries only when explicitly requested.

---

## 6. Defensive Rate Limiting & Safety Controls

APIs run at code speed, not human click speed. Protect the backend against unthrottled polling loops and runaway scripts.

### Rules

1. **Standard Rate Limit Headers**: When rate limiting is enforced, always supply informational headers:
   - `RateLimit-Limit`: Total allowed requests in the time window.
   - `RateLimit-Remaining`: Remaining quota in the current window.
   - `Retry-After`: Seconds to wait before retrying when `429 Too Many Requests` is returned.
2. **Stricter Limits on Heavy Endpoints**: Apply tighter rate limits on operations that trigger expensive database queries or third-party API calls (e.g. Mailgun).
3. **Tenant-Level Isolation & Killswitches**: Provide the ability to rate limit or disable access at the `University` or user level to isolate noisy neighbors.

Counters live in Postgres (`rate_limit_buckets`), not in process memory: Cloud Run runs more than one instance, so an in-process counter does not limit anything. The seam is `ratelimit.Wrap(db, endpoint, rules)`, a decorator around the handler, the same shape as `idempotency.Wrap`. The one rule kind is `ratelimit.IPRule`; add another kind when a route needs it. A refusal is a log line (`ratelimit: refused ...`), not a table row.

Each rate-limited MBU route, and why. A ticket that adds or limits a route adds its row here. An unauthenticated route that is deliberately not limited (for example, a health probe) gets a row with `none` in Rules and the reason.

| Route | Rules | Reason |
| :---- | :---- | :----- |
| `GET /api/health` | none | The health probe for Cloud Run and the image smoke test. It reads no database and calls no vendor, so a flood of it costs no more than any request the load balancer refuses. |
| `GET /api/universities/{id}/public` | `ratelimit.IPRule(d.ClientIP, 600, time.Hour)` | Anybody can read a published University. The limit bounds the cost of a script, not a person: the real peak is a troop meeting where thirty families on one Wi-Fi address open the same link and reload it, about 20 reads each in an hour, so 600. The ids are uuids, so a script cannot walk them, and the read is a few indexed queries. #251 mounted it, with `Cache-Control: no-store` outside the limit, so a 404 or a 429 is not cached either. The key is the `X-Forwarded-For` entry that `CLIENT_IP_PROXY_HOPS` names (#293). #296 checks the deployed header and the `run.app` bypass. |

---

## 7. Predictable Error Responses

Avoid ad-hoc error formats. Maintain a consistent JSON error schema across all endpoints. This is the one change to the `functions/` contract ([ADR 0001](adr/0001-go-on-cloud-run.md)); the app side is #263.

### Rules

1. **Uniform Error Structure**:

```go
type APIError struct {
    Code    Code              `json:"code"`              // Machine-readable code, from apierr's enumeration: "NOT_FOUND", "INVALID_ARGUMENT", "UNAUTHORIZED"
    Message string            `json:"message"`           // Human-readable summary
    Details map[string]string `json:"details,omitempty"` // Field-level validation errors
}
```

2. **Standard Status Code Usage**:
   - `400 Bad Request` / `422 Unprocessable Entity`: Request body or parameter validation failure.
   - `401 Unauthorized`: Missing or invalid authentication token.
   - `403 Forbidden`: Authenticated user lacks permission for the University/resource.
   - `404 Not Found`: Target resource does not exist (or caller lacks permission to know it exists).
   - `409 Conflict`: Resource state conflict (e.g., a Period Conflict, or a University in the wrong status) or duplicate idempotency key conflict.
   - `429 Too Many Requests`: Rate limit reached.
   - `500 Internal Server Error`: Unhandled server or database error (log details internally, do not leak raw stack traces to caller).
3. **A client tells refusals apart by `code`, never by `message`.** Two refusals with the same status that the app must handle differently get two codes.
4. **`details` is keyed by the request DTO's own JSON field name**, so a client maps a key onto a form control with no translation table. A field of a nested object is keyed by its dotted path (`location.city` in a University body). A 4xx a person can cause by filling in a form names the field at fault, and its `details` value is worded for that person: say what to do, and start with the field's own noun; where a refusal belongs to no field (a closed Registration Window, a rule about server state), `details` is absent and `message` carries it. One exception: the 409 of `PUT /api/universities/{id}/periods` that removes a Period a Class uses keys `details` by the id of each such Class, with its badge title as the value, so the app can name the Classes to move first (#252, #263).

```jsonc
// POST /api/universities/{id}/classes, 400
{
  "code": "INVALID_ARGUMENT",
  "message": "capacity must be at least 1",
  "details": { "capacity": "Enter a capacity of 1 or more" },
}
```

5. **One Writer** (#242 copies `apierr` from doula-cloud): `api/internal/apierr` is the only place this shape is written from. Every handler calls `apierr.Write` (or `apierr.WriteError` for the common status+message case) rather than `http.Error` or a package-local helper; a new endpoint that needs a `Code` not yet in `apierr.Code`'s enumerated set adds one there. Code below a handler that decides a refusal (an `authz` assertion, a missing row) returns an `*apierr.RefusalError`, and the handler answers any error with `apierr.WriteErr`, which writes a refusal with its own status and code and anything else as a 500. The success body has the same rule: every handler calls `apierr.WriteJSON(w, status, v)` rather than setting `Content-Type` and calling `json.NewEncoder(w).Encode` itself, and every request-body decode calls `apierr.DecodeJSON(w, r, &v)`, which wraps the body in `http.MaxBytesReader` at `apierr.MaxRequestBodyBytes` (1 MiB) before decoding.
6. **A 403 says which kind of refusal it is.** A 403 carries a code from a closed set in `apierr`, one code for each kind of action the reader can take: `FORBIDDEN` for a role refusal (also the default), and a specific code for a condition the reader can fix (e.g., `EMAIL_NOT_VERIFIED`). A new kind of 403 adds a code to that set; it does not reuse `FORBIDDEN` with new wording.

---

## 8. Summary Checklist for Code Reviews & Agents

When adding or modifying an HTTP endpoint in `api/`:

| Check                  | Requirement                                                                                                                                                                                                                                                  |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain Terms**       | Uses exact vocabulary from [`CONTEXT.md`](../CONTEXT.md) (e.g., `University`, `Class`, `Period`, `Registration`).                                                                                                                                            |
| **DTO Decoupling**     | Handler accepts and returns dedicated DTO structs, not database models.                                                                                                                                                                                      |
| **JSON Tags**          | All DTO struct fields have explicit `json:"camelCase"` tags.                                                                                                                                                                                                 |
| **Contract Stability** | Edits to existing responses are purely additive (no deletions/renames).                                                                                                                                                                                      |
| **Idempotency**        | Non-idempotent mutating `POST` actions accept `Idempotency-Key`.                                                                                                                                                                                             |
| **Pagination**         | Unbounded lists use cursor pagination with a standard `PaginatedResponse[T]` envelope.                                                                                                                                                                       |
| **Lean Payloads**      | Expensive relations are opt-in via `?include=`.                                                                                                                                                                                                              |
| **Rate Limits**        | An unauthenticated route is limited, or section 6 says why it is not.                                                                                                                                                                                        |
| **Errors**             | Refusals go through `apierr.Write`/`apierr.WriteError`, never `http.Error` or a package-local helper. A 4xx a form can cause carries `details` keyed by the DTO's `json:` tag, worded for a person. A 403 carries a code from the `apierr` set of 403 codes. |
