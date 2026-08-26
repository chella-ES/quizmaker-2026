Date created: 2026-08-26
Date last modified: 2026-08-26

# Register, Login, and Logout - Technical PRD

**Product:** The Greenfield Quizmaker
**Sprint focus:** Teacher registration, username/password login, logout, and an empty MCQ landing stub
**Implementation rule:** Documentation only until the user reviews a phase and explicitly asks to implement it. Do not start coding from this PRD unprompted.
**Delivery rule:** Every phase is **test-driven**. Write the phase test plan in Vitest first (RED), then the minimum production code until that plan is GREEN. A phase is not complete while its tests are red, skipped, or missing.

---

## Overview/Problem

Teachers who will collaborate on a multiple-choice question (MCQ) test bank currently have no way to become known users of The Greenfield Quizmaker. The starter app is an unmodified Next.js landing page: there is no account, no credentials, and no place a teacher can enter after signing in. Without registration and login, later sprints cannot attach questions, collaboration, or ownership to a person.

This sprint gives each teacher a first-time registration path, a username-and-password login path, a logout path, and a stub MCQ page to land on after a successful login. Persistence is a D1 `users` table with a hashed password. The product will grow across later AI sprints; this document covers only the identity baseline.

---

## Hypothesis

We believe that a simple email-and-password register/login/logout flow, landing on an empty MCQ stub, will give teachers a durable identity so later sprints can attach question-bank work to the right person.

---

## Scope

### In Scope

- First-time teacher registration with basic details: unique username (email), first name, last name, and password.
- Login with username and password via HTTP POST.
- Logout via HTTP POST plus client navigation back to the login (or home) page.
- Client-side hashing of the password **before** it is sent on the wire (registration and login).
- Server-side hashing of the received password material before it is stored or compared (D1 never stores plaintext or the raw client hash alone).
- A `users` table migration covering the minimum identity fields, plus the salt required to hash safely.
- A user service with create, read, update, and delete operations. Registration uses create; login uses read and credential verification. Update and delete are implemented and tested on the service even though this sprint has no UI for them.
- HTTP endpoints for register, login, and logout that read and write the `users` table through the user service.
- After successful login, navigate the teacher to an **empty MCQ stub page** (no question editor in this sprint).
- **Test-driven development with Vitest for every phase:** failing tests first, then implementation until green. The phase test plan is what proves that phase’s slice of the acceptance criteria. Previous phases must stay green.
- Replace the current starter home page with a Greenfield Quizmaker entry that links to register and login.

### Out of Scope

- Creating, editing, listing, or collaborating on MCQs (stub page only).
- Social login, OAuth, SSO, or magic links.
- Token-based auth, JWTs, signed cookies, server-side sessions, CSRF tokens, and route middleware that blocks unauthenticated requests.
- Email verification, password reset, change-password UI, “remember me,” account lockout, and MFA.
- Role models (every user in this sprint is a teacher). Student-facing quiz taking is later.
- Remote D1 migrations or production deploy (`npm run deploy` is never run unless the user asks).
- Strengthening the client hash beyond SHA-256 (called out as future work).
- `@cloudflare/vitest-pool-workers` (real Workers pool). Unit tests mock D1 via `src/lib/db.ts`. Raise it only if review asks to change the whole suite.
- Tests whose assertions cannot fail, tests that only check `toBe(true)`, or “implementation after the fact” tests written once the code is already green.

### Cut

- **HTTP-only session cookies / JWT** — Explicitly excluded from this phase. Login proves credentials and navigates; it does not establish a server-trusted session. The MCQ stub is therefore **not** a protected resource yet. A later sprint should add real session or token management and then gate `/mcq`.
- **Social logins** — Extra identity providers are not needed to prove the teacher-account baseline.
- **Next.js Server Actions as the only mutation path** — Project convention prefers Server Actions, but this sprint specifies HTTP POST endpoints so register/login/logout are explicit, testable API routes. Server Actions may wrap or replace them in a later sprint if desired.
- **bcrypt / argon2 npm packages** — Useful on Node, but they are native or CPU-heavy on Cloudflare Workers. This sprint uses the Web Crypto API (SHA-256 on the client, PBKDF2 on the server) so no extra hashing library is required.
- **Dedicated `password_hash` rename vs `password`** — The column is named `password` as specified. It stores the **server-derived hash**, never plaintext.
- **User-supplied `userid`** — The server generates a UUID. Clients do not send an id on register.
- **Writing production code before the phase’s Vitest tests exist** — Forbidden. The only exception is Phase 1’s Vitest install and config, without which RED tests cannot be executed.

---

## TDD Process (mandatory)

This sprint uses **Vitest** as the preferred (and only) automated test framework, matching `.cursor/skills/testing/SKILL.md`. React UI tests use **Testing Library** (`@testing-library/react` + `@testing-library/user-event`) on **jsdom**. Server and library tests are still run by Vitest; they mock Cloudflare/D1 and never open a real network or remote database.

### Cycle for every phase

```
1. RED     Write the tests listed in that phase’s Test Plan.
           Run `npm test`. New tests MUST fail for the right reason
           (missing module, `not implemented`, or a failed assertion).
           Record the RED result in this PRD before writing production code.

2. GREEN   Write the minimum production code (and only the stubs/helpers
           the tests require) until those tests pass.
           Re-run the **full** suite. Prior phases must remain green.

3. REFACTOR  Only if needed, and only while the suite stays green.
           Do not expand scope.

4. STOP    Update this PRD (phase status, RED/GREEN notes, AC checkboxes
           that this phase actually proved). Wait for review.
```

A phase is **not COMPLETED** if any of the following is true:

- The Test Plan tests were written after the production code.
- `npm test` was not run, or RED was skipped.
- Any Test Plan case is missing, skipped (`.skip` / `.todo` left in the suite), or vacuously true.
- Mapped acceptance criteria for that phase are still unchecked.
- Tests from an earlier completed phase are now red.

### RED quality bar

- Name tests so the failure message states the broken behavior (for example `hashes the plaintext password to 64-char lowercase hex for the wire`).
- Assert observable output: return values, HTTP status and JSON, what the user can see, `fetch` bodies, `sessionStorage`. Do not assert private internals.
- Include failure paths in the Test Plan, not only the happy path.
- Each test must pass in isolation. `beforeEach(() => { vi.clearAllMocks(); })` where mocks are used.
- Never hit a real D1, Wrangler remote, or HTTP server from a unit test. Mock at `src/lib/db.ts` or the user-service module boundary.

### Phase 1 bootstrap (only exception)

Vitest is not installed today. Phase 1 may install the harness **first** so `npm test` can run. Immediately after that, write the password Test Plan tests so they go RED, then implement until GREEN. Do not implement `password.ts` before those tests exist.

### UI structure required by TDD

Server Components cannot be rendered by Testing Library. Interactive pages (`/`, `/register`, `/login`, `/mcq`) must keep a thin `page.tsx` and put behavior in client components under `src/components/` so the Test Plan can render them.

### Commands

| When | Command | Expected |
|------|---------|----------|
| After writing tests | `npm test` | RED for the new cases |
| After production code | `npm test` | GREEN for the full suite |
| Phase 7 | `npm test` && `npm run lint` && `npm run build` | All green; then local `npm run preview` if D1 is in play |

---

## Technical Requirements

### Database Schema

Cloudflare D1 is bound as `DB` in `wrangler.jsonc` (`quizmaker-db`, id `b5346f05-82dc-4fc3-9c46-382efdc665e4`). The `users` table migration is applied **locally** only. Never apply migrations with `--remote`.

**Proposed database name:** `quizmaker-db`
**Binding:** `DB`

```sql
CREATE TABLE users (
  userid TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  password TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_username ON users (username);
```

| Column | Type | Notes |
|--------|------|--------|
| `userid` | TEXT PK | UUID generated in the user service (`crypto.randomUUID()`). |
| `username` | TEXT UNIQUE NOT NULL | Login name; must be a unique email address. |
| `first_name` | TEXT NOT NULL | Teacher given name. |
| `last_name` | TEXT NOT NULL | Teacher family name. |
| `password` | TEXT NOT NULL | Server-side PBKDF2 hash (hex) of the **client-hashed** password. Never plaintext. Never returned by APIs. |
| `password_salt` | TEXT NOT NULL | Per-user random salt (hex), required for PBKDF2. Not in the original field list; added so hashing is not a single global salt. |
| `created_at` | TEXT | ISO-like SQLite `datetime('now')`. |
| `updated_at` | TEXT | Updated on `updateUser`. |

`UNIQUE` on `username` already creates an index; `idx_users_username` is listed so the intent is obvious in reviews. If the generated migration already indexes the unique column, do not duplicate it.

The SQL lives in `src/lib/users-schema.ts` as `USERS_TABLE_SQL` so Phase 2 tests can assert the contract. The Wrangler migration file must contain that same `CREATE TABLE` body (test 2.7).

No other tables in this sprint.

### Password hashing (client + server)

Plaintext passwords must not travel on the HTTP POST body and must not be stored in D1.

1. **Client (browser), on register and login submit**
   - Validate the plaintext password in the form (length, required).
   - Hash with Web Crypto `SHA-256`.
   - Encode as lowercase hex.
   - POST that hex string as `password`. The wire payload never includes the original password.

2. **Server, on register**
   - Validate the incoming hex hash (format and length).
   - Generate a 16-byte random salt (`crypto.getRandomValues`).
   - Derive a key with Web Crypto **PBKDF2** (hash: SHA-256, iterations: `100000`, length: 32 bytes).
   - Store hex(derived key) in `password` and hex(salt) in `password_salt`.

3. **Server, on login**
   - Look up the user by `username`.
   - Run the same PBKDF2 derivation on the incoming client hash using the stored salt.
   - Compare derived key to `users.password` with a timing-safe equality check.
   - Use one generic failure message whether the user is missing or the password is wrong.

Shared hashing helpers must live in `src/lib/` so both the browser (SHA-256) and the Worker (PBKDF2) can be unit-tested without D1.

**Known limitation:** A SHA-256 client hash can be replayed if the POST is intercepted. HTTPS in production reduces that risk; this sprint still does not add sessions. A later sprint can replace client SHA-256 with a password-based KDF and add transport-level session auth.

### API Endpoints

All routes are Next.js App Router handlers under `src/app/api/`. They call the user service; they do not run SQL inline. Validate every body with Zod before use. Never echo `password` or `password_salt` in a response.

#### POST /api/users/register

Creates a teacher account.

**Request body:**

```json
{
  "username": "teacher@school.edu",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "password": "<sha256-hex of plaintext password>"
}
```

**Success (201):**

```json
{
  "userid": "550e8400-e29b-41d4-a716-446655440000",
  "username": "teacher@school.edu",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

**Errors:**

- **400** `{ "error": "Validation failed", "details": [ { "path": "username", "message": "..." } ] }` — missing fields, invalid email, password hash not 64-char hex, empty names.
- **409** `{ "error": "An account with this username already exists." }` — unique username collision.
- **500** `{ "error": "Unable to register user." }` — unexpected failure. Do not leak SQL.

#### POST /api/users/login

Verifies credentials. Does **not** issue a token or set a cookie.

**Request body:**

```json
{
  "username": "teacher@school.edu",
  "password": "<sha256-hex of plaintext password>"
}
```

**Success (200):**

```json
{
  "userid": "550e8400-e29b-41d4-a716-446655440000",
  "username": "teacher@school.edu",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

The client may store `userid` / `username` / names in `sessionStorage` for display on the stub page. That is display state only, not an auth token.

**Errors:**

- **400** validation error (same shape as register).
- **401** `{ "error": "Invalid username or password." }` — unknown user or hash mismatch. Same message in both cases.
- **500** `{ "error": "Unable to log in." }`

#### POST /api/users/logout

Ends the client’s display of a logged-in teacher. With no server session, the handler is a successful no-op after optional body parse.

**Request body:** empty object `{}` or omitted.

**Success (200):**

```json
{
  "ok": true
}
```

The client **must** clear `sessionStorage` keys for the current teacher and navigate to `/login`.

**Errors:**

- **500** `{ "error": "Unable to log out." }` — only if the handler itself throws. Do not fail logout because no session exists.

No other public HTTP user endpoints in this sprint. `updateUser` and `deleteUser` stay on the service for tests and later UI.

### User Interface Requirements

Use existing shadcn/ui pieces: `button`, `card`, `field` (`Field`, `FieldLabel`, `FieldError`, `FieldGroup`), `input`, `label`. Client components only where forms need state. Shared copy should say **The Greenfield Quizmaker**.

#### Home (`/`)

- Product name and one-sentence purpose: teachers create and collaborate on an MCQ test bank.
- Primary actions: **Register** → `/register`, **Log in** → `/login`.
- Replaces the current Next.js starter content on this route.

#### Register (`/register`)

- Fields:
  - **Username (email)** — required, valid email, trimmed, lowercased before submit.
  - **First name** — required, trimmed, 1–100 characters.
  - **Last name** — required, trimmed, 1–100 characters.
  - **Password** — required, input `type="password"`, minimum 8 characters of **plaintext** before hashing.
  - **Confirm password** — must match plaintext password (client-only; not sent).
- On submit: client-validate → SHA-256 hash password → `POST /api/users/register` with the hash (not confirm password).
- Success: show a short confirmation and navigate to `/login` (user signs in explicitly).
- Failure: show field errors from 400 `details`, or a form-level message for 409/500.
- Link: “Already have an account? Log in”.

#### Login (`/login`)

- Fields: **Username (email)**, **Password** (`type="password"`).
- On submit: client-validate → SHA-256 hash → `POST /api/users/login`.
- Success: write display fields to `sessionStorage`, navigate to `/mcq`.
- Failure: form-level “Invalid username or password.” for 401; field errors for 400; generic message for 500.
- Link: “Need an account? Register”.

#### MCQ stub (`/mcq`)

- Empty teacher landing page after login. Heading such as “Create multiple-choice questions” and short placeholder copy that question authoring comes in a later sprint. **No** question form, list, or save.
- Show the logged-in teacher’s first name from `sessionStorage` when present.
- **Log out** control: `POST /api/users/logout`, clear `sessionStorage`, navigate to `/login`.
- If `sessionStorage` has no user, still render the stub (no server session to enforce). Optional helper text: “You are not signed in” with a link to `/login`. Do not build redirect middleware in this sprint.

#### Validation (client, before hash)

| Field | Rule |
|-------|------|
| username | Required, valid email |
| firstName / lastName | Required on register, non-empty after trim |
| password | Required, min 8 characters (plaintext) |
| confirmPassword | Register only; must equal password |

Server re-validates username, names, and that `password` is a 64-character lowercase hex string.

---

## Implementation Phases

**Review gate:** An agent must not start a phase until the user has reviewed this PRD (or that phase) and explicitly asked to implement it. Follow the TDD cycle in **TDD Process (mandatory)**. After GREEN, update this file and stop.

**Phase log (fill during implementation):**

| Field | When to record |
|-------|----------------|
| RED result | Paste the failing `npm test` summary (test names + failure reason) before production code |
| GREEN result | Paste the passing `npm test` summary after production code |
| AC proved | IDs from the Acceptance Criteria table that this phase turned green |

### Phase 1: Test harness and password hashing - COMPLETED

**Objective:** Install Vitest, then lock the hash pipeline with failing tests before any hash implementation exists.

**Framework:** Vitest (jsdom, `globals: true`, `vite-tsconfig-paths` for `@/`).

**Acceptance criteria this phase must turn green:** AC-04 (wire SHA-256), AC-05 (storage is not plaintext / not the wire hash; salt + PBKDF2 helpers exist).

**RED result (2026-08-26):** `npm test` failed as intended. Suite `src/lib/password.test.ts` did not load: `Failed to resolve import "@/lib/password" from "src/lib/password.test.ts". Does the file exist?` — Test Files 1 failed, Tests no tests.

**GREEN result (2026-08-26):** After `src/lib/password.ts` was added: `Test Files 1 passed (1)`, `Tests 11 passed (11)`, Vitest v4.1.11, duration ~2.8s. No `.skip` / `.todo`. `npm run lint` exited 0.

**AC proved:** Hashing slice of AC-04 and AC-05 via tests 1.1–1.11. HTTP/UI cases for those ACs remain for later phases; checkboxes stay unchecked until then.

**Implementation notes:** `@vitejs/plugin-react` was pinned to `^4.7.0` because v6 pulled a Babel 8 peer that conflicted with the repo’s Babel 7 tree.

#### Test Plan (write first → RED)

**File:** `src/lib/password.test.ts`  
**Subject (create only after RED):** `src/lib/password.ts`

| # | Test name (use as `it(...)` title) | Assertion (must be able to fail) |
|---|------------------------------------|----------------------------------|
| 1.1 | hashes the plaintext password to 64-char lowercase hex for the wire | `hashPasswordForWire("correct-horse")` matches `/^[0-9a-f]{64}$/` |
| 1.2 | produces the same wire hash for the same plaintext | two calls with `"correct-horse"` are equal |
| 1.3 | produces a different wire hash for a different plaintext | `"correct-horse"` ≠ `"correct-horse-1"` |
| 1.4 | rejects an empty plaintext for the wire hash | `hashPasswordForWire("")` throws |
| 1.5 | creates a 16-byte salt encoded as 32-char lowercase hex | `createPasswordSalt()` matches `/^[0-9a-f]{32}$/` |
| 1.6 | creates a different salt on each call | two `createPasswordSalt()` results are not equal |
| 1.7 | storage hash is 64-char hex and is not the wire hash | `hashPasswordForStorage(wire, salt)` is `/^[0-9a-f]{64}$/` and ≠ `wire` |
| 1.8 | same wire hash and same salt produce the same storage hash | two storage hashes with identical inputs are equal |
| 1.9 | passwordsMatch returns true for the matching wire hash and salt | `passwordsMatch(wire, salt, stored)` is `true` |
| 1.10 | passwordsMatch returns false for the wrong wire hash | wrong plaintext’s wire hash does not match |
| 1.11 | passwordsMatch returns false when the salt differs | same wire hash, different salt → `false` |

**RED expected:** `npm test` fails because `src/lib/password.ts` is missing, or exports throw `Error("not implemented")`. Do not implement real hashing until this RED run is recorded.

#### GREEN tasks (only after RED)

1. Propose and (only after the user agrees) add: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `vite-tsconfig-paths`.
2. Add `vitest.config.ts` and scripts `test` (`vitest run`), `test:watch` (`vitest`). This bootstrap happens **before** the first RED run so the Test Plan can execute.
3. Write `src/lib/password.test.ts` with the cases above. Run `npm test` → RED. Record it.
4. Implement `hashPasswordForWire`, `createPasswordSalt`, `hashPasswordForStorage`, `passwordsMatch` (Web Crypto SHA-256 + PBKDF2, timing-safe compare).
5. Run `npm test` → GREEN. Record it.

**Deliverables:** Vitest harness; password module; RED then GREEN log in this PRD.

**Phase done when:** All 1.1–1.11 pass; no `.skip`; AC-04 and the hashing half of AC-05 can be checked.

---

### Phase 2: D1 database and users migration - COMPLETED

**Objective:** Make the `users` schema and D1 access module fail tests first, then satisfy the contract. Wrangler create/apply is the local follow-through after GREEN — it is not a substitute for the tests.

**Framework:** Vitest. No real D1 in unit tests. Mock `@opennextjs/cloudflare`.

**Acceptance criteria this phase must turn green:** AC-02 column contract (`userid` PK), AC-05 column contract (`password` + `password_salt` present, not a plaintext column purpose). AC-16 (no remote migrate) is a process check, not a unit test.

**RED result (2026-08-26):** `npm test` failed as intended. `src/lib/db.test.ts` and `src/lib/users-schema.test.ts` did not load: `Failed to resolve import "@/lib/db"` and `Failed to resolve import "@/lib/users-schema"`. Phase 1 stayed green (11 passed). Test Files 2 failed | 1 passed.

**GREEN result (2026-08-26):** After schema, `getDb`, and `migrations/0001_create_users.sql`: `Test Files 3 passed (3)`, `Tests 20 passed (20)`. Local apply: `npx wrangler d1 migrations apply quizmaker-db --local` applied `0001_create_users.sql` (not `--remote`). `npm run cf-typegen` added `DB: D1Database`. `npm run lint` exited 0.

**AC proved:** Column contract for AC-02 (`userid` PK) and AC-05 (`password` + `password_salt`) via tests 2.1–2.7. `getDb` contract via 2.8–2.9. AC-16: no remote migration was run.

**Implementation notes:** Remote D1 `quizmaker-db` was created (region APAC, id `b5346f05-82dc-4fc3-9c46-382efdc665e4`) and bound as `DB`. Binding name stays `DB` (not Wrangler’s suggested `quizmaker_db`). Migrations were applied **locally only**. Never `migrations apply --remote`.

#### Test Plan (write first → RED)

**Files:** `src/lib/users-schema.test.ts`, `src/lib/db.test.ts`  
**Subjects:** `src/lib/users-schema.ts` (SQL string used by the migration), `src/lib/db.ts`

| # | Test name | Assertion |
|---|-----------|-----------|
| 2.1 | users schema defines table users | `USERS_TABLE_SQL` includes `CREATE TABLE users` |
| 2.2 | users schema requires userid as primary key | SQL includes `userid TEXT PRIMARY KEY` |
| 2.3 | users schema requires unique username | SQL includes `username TEXT NOT NULL UNIQUE` (or equivalent UNIQUE on username) |
| 2.4 | users schema requires first_name and last_name | both columns `TEXT NOT NULL` |
| 2.5 | users schema stores password and password_salt as NOT NULL | both columns present and `NOT NULL` |
| 2.6 | users schema includes created_at and updated_at | both columns present |
| 2.7 | migration SQL matches the tested schema contract | the file under `migrations/` contains the same `CREATE TABLE users` body as `USERS_TABLE_SQL` (read the migration in the test) |
| 2.8 | getDb returns the D1 binding from Cloudflare context | with mocked `getCloudflareContext` → `{ env: { DB: mockDb } }`, `getDb()` resolves to `mockDb` |
| 2.9 | getDb fails when the DB binding is missing | mocked context without `DB` → `getDb()` throws a typed error (not an empty object) |

**RED expected:** schema/db modules missing or throwing `not implemented`; migration file missing so 2.7 fails.

#### GREEN tasks (only after RED)

1. Export `USERS_TABLE_SQL` from `src/lib/users-schema.ts` matching Database Schema.
2. Implement `getDb()` in `src/lib/db.ts` via `getCloudflareContext()`. Never import this module from `'use client'` files.
3. Create D1 (`quizmaker-db`), bind `DB` in `wrangler.jsonc`, `npm run cf-typegen`.
4. Create the migration from `USERS_TABLE_SQL` so 2.7 can pass. Apply **locally only**.
5. Update `.dev.vars.example` if any new vars appear.

**Deliverables:** Tested schema contract; `src/lib/db.ts`; local migration; RED/GREEN log.

**Phase done when:** 2.1–2.9 green; migration applied locally; no `--remote`.

---

### Phase 3: User service (create, read, update, delete) - PLANNED

**Objective:** Drive the user service from failing tests with a mocked D1 module. No UI and no HTTP yet.

**Framework:** Vitest. Mock `src/lib/db.ts` (preferred) so tests do not rebuild the D1 prepared-statement chain. `vi.mock("server-only", () => ({}))` if needed.

**Acceptance criteria this phase must turn green:** AC-01 (create persists a public user), AC-02 (`userid` generated, unique), AC-03 (duplicate username → typed conflict), AC-05 (stored password ≠ wire hash; salt stored), AC-06 (`verifyCredentials` success returns public fields), AC-07 (`verifyCredentials` failure is indistinguishable), AC-10 (create/update/delete covered), AC-11 (public type has no password fields).

#### Test Plan (write first → RED)

**File:** `src/lib/services/user-service.test.ts`  
**Subject:** `src/lib/services/user-service.ts`

Use an in-memory fake store behind the mocked `db` so create → get is observable.

| # | Test name | Assertion |
|---|-----------|-----------|
| 3.1 | createUser returns a public user with a generated userid | `userid` is a non-empty UUID string; input did not supply it |
| 3.2 | createUser persists username, first name, and last name | `getUserByUsername` returns the same names; username stored lowercase |
| 3.3 | createUser does not return password or password_salt | returned object keys exclude both |
| 3.4 | createUser stores a hash different from the wire password | fake DB row `password` ≠ the wire hash passed in; `password_salt` is non-empty hex |
| 3.5 | createUser rejects a duplicate username | second create with same email throws a typed conflict (not a raw D1 string) |
| 3.6 | getUserById returns null when missing | `getUserById("no-such-id")` is `null` |
| 3.7 | getUserByUsername returns null when missing | unknown email → `null` |
| 3.8 | updateUser changes first and last name | subsequent get shows new names |
| 3.9 | updateUser re-hashes when a new wire password is provided | stored password changes; still not equal to the new wire hash |
| 3.10 | updateUser returns null or a typed not-found when id is missing | no throw of an unstructured error |
| 3.11 | deleteUser removes the row | get-by-id after delete is `null` |
| 3.12 | deleteUser is safe when id is missing | does not throw (or throws a typed not-found — pick one and test it) |
| 3.13 | verifyCredentials returns the public user for the correct wire hash | matches createUser identity; no password fields |
| 3.14 | verifyCredentials returns null for the wrong wire hash | `null`, not a different error than unknown user |
| 3.15 | verifyCredentials returns null for an unknown username | `null`, same as 3.14 |
| 3.16 | queries use numbered placeholders | inspect `prepare` SQL passed to the mock: statements contain `?1` and do not concatenate username/password into SQL |

**RED expected:** service missing or methods throw `not implemented`.

#### GREEN tasks (only after RED)

1. Propose and (only after the user agrees) add `zod` for service input schemas.
2. Implement the service methods with prepared statements (`?1`, `?2`).
3. Hash with Phase 1 helpers before INSERT/UPDATE of `password`.
4. Map unique-constraint failures to a typed conflict.

**Deliverables:** User service; 3.1–3.16 green; prior phases still green.

**Phase done when:** AC-01, AC-02, AC-03, AC-10, AC-11 (service-level) checkable; AC-05/06/07 proven at the service layer.

---

### Phase 4: Register, login, and logout HTTP endpoints - PLANNED

**Objective:** Drive route handlers from failing HTTP-contract tests. Mock the **user service**, not D1.

**Framework:** Vitest. Import `POST` from each `route.ts` and call it with `new Request(...)`.

**Acceptance criteria this phase must turn green:** AC-01 (201 + body), AC-03 (409), AC-06 (200 login public fields), AC-07 (401 generic), AC-09 (logout 200), AC-11 (no password in JSON), AC-12 (400 validation).

#### Test Plan (write first → RED)

**Files:**  
`src/app/api/users/register/route.test.ts`  
`src/app/api/users/login/route.test.ts`  
`src/app/api/users/logout/route.test.ts`

| # | Test name | Assertion |
|---|-----------|-----------|
| 4.1 | register returns 201 and the public profile | status 201; JSON has `userid`, `username`, `firstName`, `lastName` |
| 4.2 | register does not include password fields in the body | JSON keys exclude `password` and `password_salt` |
| 4.3 | register returns 400 when username is not an email | status 400; `error` + `details` with path `username` |
| 4.4 | register returns 400 when password is not 64-char hex | plaintext `"secret12"` in JSON → 400 |
| 4.5 | register returns 400 when first or last name is empty | 400 with details |
| 4.6 | register returns 409 when the service reports a username conflict | mock `createUser` throws conflict → 409 and the specified error string |
| 4.7 | register returns 500 when the service throws unexpectedly | generic `"Unable to register user."`; no SQL in body |
| 4.8 | login returns 200 and the public profile | mock `verifyCredentials` returns a user |
| 4.9 | login does not include password fields | same as 4.2 |
| 4.10 | login returns 401 with a generic message when credentials are wrong | mock returns `null` → 401 `"Invalid username or password."` |
| 4.11 | login returns 401 with the same message when the user is unknown | indistinguishable from 4.10 |
| 4.12 | login returns 400 for invalid username or password hash shape | 400 + details |
| 4.13 | login returns 500 with a generic message on unexpected throw | `"Unable to log in."` |
| 4.14 | logout returns 200 `{ ok: true }` | even with empty body |
| 4.15 | logout does not require a session token | no 401; no `Set-Cookie` for an auth cookie |

**RED expected:** route files missing (`POST` import fails) or handlers throw `not implemented`.

#### GREEN tasks (only after RED)

1. Implement the three `POST` handlers: Zod parse → user service → JSON status mapping.
2. Never set JWT or session cookies (4.15 must stay true).

**Deliverables:** Three routes; 4.1–4.15 green.

**Phase done when:** HTTP contracts for register/login/logout match this document.

---

### Phase 5: Registration UI - PLANNED

**Objective:** Drive home and register UI from failing Testing Library tests. Production pages stay thin; behavior lives in client components.

**Framework:** Vitest + jsdom + `@testing-library/react` + `@testing-library/user-event`. Mock `global.fetch`. Query by role and accessible name. Prefer `userEvent` over `fireEvent`.

**Acceptance criteria this phase must turn green:** AC-04 (POST body is 64-char hex, not plaintext), AC-12 (client validation before fetch).

#### Test Plan (write first → RED)

**Files:**  
`src/components/home/home-links.test.tsx`  
`src/components/register/register-form.test.tsx`

**Subjects:**  
`src/components/home/home-links.tsx`  
`src/components/register/register-form.tsx`  
Thin pages: `src/app/page.tsx`, `src/app/register/page.tsx`

| # | Test name | Assertion |
|---|-----------|-----------|
| 5.1 | home shows the product name The Greenfield Quizmaker | `getByRole` / text the user can read |
| 5.2 | home has a Register link to /register | `getByRole("link", { name: /register/i })` has `href="/register"` |
| 5.3 | home has a Log in link to /login | `href="/login"` |
| 5.4 | register form shows username, first name, last name, password, and confirm password fields | each label is associated with an input |
| 5.5 | register form does not submit when required fields are empty | after click Submit, `fetch` not called; accessible errors present |
| 5.6 | register form does not submit when password is shorter than 8 characters | `fetch` not called |
| 5.7 | register form does not submit when confirm password does not match | `fetch` not called |
| 5.8 | register form does not submit when username is not an email | `fetch` not called |
| 5.9 | successful submit POSTs to /api/users/register | `fetch` called with that URL and method POST |
| 5.10 | successful submit sends a 64-char hex password, not the typed plaintext | JSON body `password` matches `/^[0-9a-f]{64}$/` and ≠ `"password1"` |
| 5.11 | successful submit does not send confirmPassword | body has no `confirmPassword` |
| 5.12 | successful submit lowercases and trims the username | `"  Ada@School.EDU "` → `"ada@school.edu"` |
| 5.13 | 409 response shows that the username already exists | form-level message the user can read |
| 5.14 | 400 details are shown on the matching fields | `FieldError` / accessible error for the path |
| 5.15 | has a link to log in | link to `/login` |

**RED expected:** components missing; tests fail to find roles or `fetch` never hashed.

#### GREEN tasks (only after RED)

1. Build client components with shadcn `card`, `field`, `input`, `button`.
2. On valid submit: `hashPasswordForWire` then `fetch`.
3. Replace starter home content. Wire thin `page.tsx` files to the components.

**Manual check after GREEN (does not replace tests):** in the browser, confirm the Network panel shows a hex password.

**Deliverables:** Home + register UI; 5.1–5.15 green.

**Phase done when:** AC-04 and client half of AC-12 are proven by tests 5.5–5.10.

---

### Phase 6: Login UI, logout, and MCQ stub - PLANNED

**Objective:** Drive login, stub, and logout from failing UI tests, including `sessionStorage` side effects.

**Framework:** Same as Phase 5. Mock `fetch` and `next/navigation` (`useRouter().push`). Reset `sessionStorage` in `beforeEach`.

**Acceptance criteria this phase must turn green:** AC-04 (login wire hash), AC-08 (navigate to empty `/mcq`), AC-09 (logout POST, clear storage, go to `/login`), AC-12 (login client validation).

#### Test Plan (write first → RED)

**Files:**  
`src/components/login/login-form.test.tsx`  
`src/components/mcq/mcq-stub.test.tsx`

**Subjects:**  
`src/components/login/login-form.tsx`  
`src/components/mcq/mcq-stub.tsx`  
Thin pages: `src/app/login/page.tsx`, `src/app/mcq/page.tsx`

| # | Test name | Assertion |
|---|-----------|-----------|
| 6.1 | login form shows username and password fields | labelled inputs |
| 6.2 | login form does not submit when fields are empty | `fetch` not called |
| 6.3 | login form does not submit when username is not an email | `fetch` not called |
| 6.4 | successful login POSTs to /api/users/login with a 64-char hex password | body `password` is hex and ≠ typed plaintext |
| 6.5 | successful login stores display fields in sessionStorage | keys `gq.userid`, `gq.username`, `gq.firstName`, `gq.lastName` match the 200 JSON |
| 6.6 | successful login navigates to /mcq | `router.push("/mcq")` |
| 6.7 | 401 shows Invalid username or password | that exact user-visible string; no “user not found” variant |
| 6.8 | has a link to register | `/register` |
| 6.9 | mcq stub heading describes multiple-choice question creation | user-visible heading; no question text field / save button |
| 6.10 | mcq stub greets the teacher first name from sessionStorage | set `gq.firstName` before render; name is on screen |
| 6.11 | mcq stub shows a signed-out hint when sessionStorage is empty | “not signed in” (or equivalent) and link to `/login` |
| 6.12 | log out POSTs to /api/users/logout | `fetch` URL and method |
| 6.13 | log out clears sessionStorage display keys | keys absent after click |
| 6.14 | log out navigates to /login | `router.push("/login")` |

**RED expected:** components missing; navigation or storage assertions fail.

#### GREEN tasks (only after RED)

1. Implement login form (hash-on-submit) and MCQ stub (no editor).
2. Use the `gq.*` keys only (no cookies, no JWT).

**Manual check after GREEN:** register → login → stub → logout in the browser. Does not replace 6.1–6.14.

**Deliverables:** Login + stub + logout; 6.1–6.14 green; full suite still green.

**Phase done when:** AC-08 and AC-09 checkable from tests.

---

### Phase 7: Acceptance-criteria confirmation and Workers-aware check - PLANNED

**Objective:** Confirm every in-scope AC is proven by a green test (or an explicit process check), then lint/build/preview. No new product features.

**Framework:** Vitest full suite. Add a **traceability test** that fails if a required test file is missing — so this phase also starts RED if earlier phases were skipped.

#### Test Plan (write first → RED)

**File:** `src/lib/acceptance-traceability.test.ts`

| # | Test name | Assertion |
|---|-----------|-----------|
| 7.1 | Phase 1 password tests exist | `src/lib/password.test.ts` is readable (e.g. `fs.readFileSync` / `existsSync`) |
| 7.2 | Phase 2 schema and db tests exist | `users-schema.test.ts` and `db.test.ts` exist |
| 7.3 | Phase 3 user service tests exist | `user-service.test.ts` exists |
| 7.4 | Phase 4 route tests exist | register, login, and logout `route.test.ts` files exist |
| 7.5 | Phase 5 UI tests exist | home-links and register-form test files exist |
| 7.6 | Phase 6 UI tests exist | login-form and mcq-stub test files exist |

These tests prove the TDD artifacts were not deleted. They do **not** replace 1.x–6.x behavioral tests.

**RED expected:** if any phase was skipped, 7.x fails until those files exist.

#### GREEN tasks (only after RED)

1. Run `npm test` — **full suite green**. Record counts in Current Status.
2. Run `npm run lint` and `npm run build`. Record actual results (do not claim pass from inspection).
3. Locally (not Cursor Cloud): `npm run preview` and walk register → login → `/mcq` → logout against D1.
4. Tick only AC items that tests or recorded commands actually proved. Leave gaps unchecked (in particular: `/mcq` is not session-gated).
5. Refresh Key Files, Troubleshooting, phase RED/GREEN logs, and Current Status.

**Deliverables:** Traceability tests green; command log; honest AC checkboxes.

**Phase done when:** AC-13 and AC-14 are true from recorded commands; AC-15 (no JWT/cookie) still holds via 4.15; AC-16 holds because remote migrate/deploy were not run.

**Verify:** Never deploy. Never `migrations apply --remote`.

---

## Technical Implementation Details

### Documentation in `ai-workspace/`

| File | Role |
|------|------|
| `ai-workspace/register-login-logout_prd.md` | Source of truth for this sprint. Update on every phase. |
| `ai-workspace/TEMPLATE_TECHNICAL_PRD.md` | Template only. Do not treat it as the live PRD. |
| `ai-workspace/README.md` | Index of workspace docs and the review-before-implement rule. |

When a phase finishes, update **Implementation Phases** (RED/GREEN log), **Key Files**, **Acceptance Criteria**, **Troubleshooting Guide**, and **Current Status**. Do not let the PRD drift from the code.

### Key Files (planned — none of this is implemented yet)

Tests are listed before production files because TDD writes them first.

- `vitest.config.ts` — Vitest + React plugin + `@/` path mapping
- `src/lib/password.test.ts` / `src/lib/password.ts` — Phase 1
- `src/lib/users-schema.test.ts` / `src/lib/users-schema.ts` — Phase 2 schema contract
- `src/lib/db.test.ts` / `src/lib/db.ts` — Phase 2 D1 access
- `src/lib/services/user-service.test.ts` / `src/lib/services/user-service.ts` — Phase 3
- `src/app/api/users/register/route.test.ts` / `route.ts` — Phase 4
- `src/app/api/users/login/route.test.ts` / `route.ts` — Phase 4
- `src/app/api/users/logout/route.test.ts` / `route.ts` — Phase 4
- `src/components/home/home-links.test.tsx` / `home-links.tsx` — Phase 5
- `src/components/register/register-form.test.tsx` / `register-form.tsx` — Phase 5
- `src/components/login/login-form.test.tsx` / `login-form.tsx` — Phase 6
- `src/components/mcq/mcq-stub.test.tsx` / `mcq-stub.tsx` — Phase 6
- `src/lib/acceptance-traceability.test.ts` — Phase 7
- `src/app/page.tsx`, `register/page.tsx`, `login/page.tsx`, `mcq/page.tsx` — thin route files
- `migrations/` — `users` table, body must match `USERS_TABLE_SQL`
- `wrangler.jsonc` — D1 `DB` binding
- `.dev.vars.example` — Placeholders for any new env vars

### Implementation Patterns

```typescript
// Planned: client and tests — SHA-256 hex for the wire
export async function hashPasswordForWire(plaintext: string): Promise<string> {
  const bytes = new TextEncoder().encode(plaintext);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bufferToHex(digest);
}

// Planned: server only — PBKDF2 of the wire hash
export async function hashPasswordForStorage(
  wireHash: string,
  saltHex: string,
): Promise<string> {
  // importKey + deriveBits, SHA-256, 100_000 iterations, 32-byte output, hex encode
}

// Planned: user service create (sketch)
await db
  .prepare(
    `INSERT INTO users (userid, username, first_name, last_name, password, password_salt)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  )
  .bind(userid, username, firstName, lastName, passwordHash, salt)
  .run();
```

Route handlers parse JSON, run Zod, call the service, and return JSON. They do not import `'use client'` modules that touch `sessionStorage`.

### Testing strategy (TDD with Vitest)

The binding process is **TDD Process (mandatory)** plus each phase’s numbered Test Plan. Summary:

- Preferred framework: **Vitest**. UI: Testing Library + `userEvent` + jsdom. Not Jest, Playwright, or a Workers pool unless review changes that.
- Order inside a phase: Test Plan file(s) → `npm test` RED → production code → `npm test` GREEN → stop.
- Colocate tests: `foo.ts` ↔ `foo.test.ts` (or `.tsx`).
- Assert observable behavior. No `expect(true).toBe(true)`. No leftover `.skip` / `.todo` in a completed phase.
- Failure paths are in the Test Plan (validation, duplicate username, bad login, missing ids).
- Mock `src/lib/db.ts` or the user service. Never real D1 or network in unit tests.
- Mock `server-only` with `vi.mock("server-only", () => ({}));` when needed.
- `beforeEach(() => { vi.clearAllMocks(); })`. For Phase 6 also clear `sessionStorage`.
- Browser walks in Phases 5–6 confirm the tests; they do not replace RED/GREEN.
- `npm run preview` is the D1/Workers check in Phase 7; `npm run dev` can hide binding issues.

### Important Notes

- **Ask before adding a dependency.** Planned asks: Vitest stack (Phase 1), `zod` (Phase 3). Hashing uses Web Crypto — no extra package unless review changes that.
- **TDD:** production code for a phase comes after that phase’s RED `npm test` run is recorded in this PRD.
- **Do not deploy. Do not migrate remote D1.**
- **Do not edit** `cloudflare-env.d.ts`, `next-env.d.ts`, or `package-lock.json` by hand.
- `npm run dev` will not prove D1. Register/login that touch `env.DB` need preview or a mocked unit test.
- Logout cannot invalidate a server session in this sprint because none exists.
- Username is stored lowercase to make uniqueness predictable.
- If install scripts for `workerd` / `esbuild` were blocked by npm, `npm run preview` may fail until those scripts are approved locally.

### Configuration details

- D1 binding name: `DB`
- PBKDF2 iterations: `100000` (named constant in `src/lib/password.ts`)
- Wire hash: SHA-256, 64 hex chars
- `sessionStorage` keys (client display only): `gq.userid`, `gq.username`, `gq.firstName`, `gq.lastName`

---

## Acceptance Criteria

Tick an item only when the mapped tests are GREEN (or the process check is recorded). IDs are used in phase Test Plans.

| ID | Criterion | Proved by (must be GREEN) |
|----|-----------|---------------------------|
| AC-01 | A new teacher can register with email, first name, last name, and password, and a user is persisted. | 3.1–3.4, 4.1 |
| AC-02 | `userid` is a unique primary key generated by the server. | 2.2, 3.1 |
| AC-03 | `username` is a unique email; a second registration collides. | 3.5, 4.6 |
| AC-04 | Register and login HTTP bodies send SHA-256 hex, not plaintext. | 1.1–1.4, 5.9–5.10, 6.4 |
| AC-05 | Storage is PBKDF2 + per-user salt, not plaintext and not the wire hash alone. | 1.7–1.11, 2.5, 3.4 |
| AC-06 | Correct password login succeeds with public profile fields only. | 3.13, 4.8–4.9 |
| AC-07 | Wrong password or unknown user → 401 `"Invalid username or password."` with no distinction. | 3.14–3.15, 4.10–4.11, 6.7 |
| AC-08 | Successful login navigates to empty `/mcq` (no MCQ editor). | 6.6, 6.9 |
| AC-09 | Logout POSTs `/api/users/logout`, clears display state, goes to `/login`. | 4.14, 6.12–6.14 |
| AC-10 | User service create, update, and delete are covered without UI. | 3.1, 3.8–3.12 |
| AC-11 | APIs and public user objects never return `password` or `password_salt`. | 3.3, 4.2, 4.9 |
| AC-12 | Invalid input is rejected client-side and again on the server (400). | 4.3–4.5, 4.12, 5.5–5.8, 6.2–6.3 |
| AC-13 | The phase Test Plans exist and `npm test` is fully GREEN. | 7.1–7.6 + full suite |
| AC-14 | `npm run lint` and `npm run build` pass (recorded output). | Phase 7 commands |
| AC-15 | No session cookie or JWT is introduced. | 4.15 |
| AC-16 | No remote D1 migration and no deploy. | Phase 2/7 process log |

- [ ] AC-01
- [ ] AC-02
- [ ] AC-03
- [ ] AC-04
- [ ] AC-05
- [ ] AC-06
- [ ] AC-07
- [ ] AC-08
- [ ] AC-09
- [ ] AC-10
- [ ] AC-11
- [ ] AC-12
- [ ] AC-13
- [ ] AC-14
- [ ] AC-15
- [ ] AC-16

---

## Success Metrics

These are directional for a first sprint without analytics instrumentation. Measure manually during review.

| Metric | Target | How Measured |
|--------|--------|--------------|
| Register happy path | Completes in one submit with 201 and a `users` row | Manual register + local D1 `SELECT` |
| Login happy path | Completes in one submit; teacher sees `/mcq` | Manual browser flow |
| Password on the wire | Zero plaintext passwords in register/login POST bodies | Browser Network tab during review |
| Automated confidence | Every phase Test Plan is GREEN; full `npm test` passes | Vitest output recorded in this PRD |
| TDD discipline | Each phase has a recorded RED run before GREEN | Phase log in Implementation Phases |
| Duplicate account | Second email is blocked, first row unchanged | 409 response + D1 count |
| Time to first landing | New teacher reaches `/mcq` in under 2 minutes | Stopwatch on a clean local app |

---

## Dependencies

### External Dependencies

- **Cloudflare D1** — Store `users`. Must be created and bound; local migrations only.
- **Web Crypto API** — SHA-256 (client + tests) and PBKDF2 (server). Available in browsers, Workers, and modern Node (used by Vitest).
- **Cloudflare Workers / OpenNext** — Hosting runtime. `getCloudflareContext()` for `env.DB`.

### Internal Dependencies (to be added when a phase is approved)

- **Vitest stack** — Installed in Phase 1: `vitest`, `@vitejs/plugin-react@^4.7.0`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `vite-tsconfig-paths`. Scripts: `test`, `test:watch`.
- **zod** — Phase 3/4 request validation. Not installed today. Ask before `npm install`.
- **shadcn/ui** (already in repo) — `button`, `card`, `field`, `input`, `label`.
- **`src/lib/utils.ts` `cn()`** — Class merging for UI.

### Environment and bindings

| Name | Where | Purpose |
|------|--------|---------|
| `DB` | `wrangler.jsonc` D1 binding | User table access |
| `NEXTJS_ENV` | `.dev.vars` / `.dev.vars.example` | Already present for Wrangler/Next |

No AI provider keys and no session secrets in this sprint.

### Proposed commands (run only during the matching approved phase)

```bash
npx wrangler d1 create quizmaker-db
npx wrangler d1 migrations create quizmaker-db create-users
npx wrangler d1 migrations apply quizmaker-db --local
npm run cf-typegen
npm test
npm run lint
npm run build
npm run preview
```

---

## Risks and Mitigation

### Technical Risks

- **Risk:** Tests are written after the code, so they cannot fail and do not prove the acceptance criteria.
  **Mitigation:** Each phase lists named tests. Agents must record a RED `npm test` before GREEN. A phase without a RED log is not complete.

- **Risk:** `npm run dev` hides D1/Workers failures; register works in Node mocks and fails on Workers.
  **Mitigation:** Unit-test with mocked D1; verify register/login with `npm run preview` in Phase 7 on a machine with Wrangler credentials.

- **Risk:** Client SHA-256 is replayable and is not a password KDF.
  **Mitigation:** Accept as a documented limitation; still PBKDF2 on the server so a leaked D1 table is not plaintext. Later sprint: real sessions + stronger client KDF.

- **Risk:** No server session means `/mcq` is not actually private.
  **Mitigation:** State this in the UI copy and in Cut. Do not pretend middleware exists. Next auth sprint should gate the route.

- **Risk:** Extra hashing package breaks Workers or install scripts.
  **Mitigation:** Stay on Web Crypto unless review decides otherwise.

- **Risk:** Unique username races produce an uncaught D1 error.
  **Mitigation:** Catch unique-constraint failures in the service and return 409.

- **Risk:** Cursor Cloud cannot create D1 or run authenticated Wrangler.
  **Mitigation:** Phase 2 D1 create/apply must be done locally. Cloud agents stop and say so rather than inventing a database id.

- **Risk:** npm blocked `workerd` / `esbuild` install scripts; preview fails.
  **Mitigation:** Document in Troubleshooting; approve scripts locally if preview is required.

### User Experience Risks

- **Risk:** Teachers expect to stay logged in after refresh; `sessionStorage` display state is easy to confuse with real auth.
  **Mitigation:** Logout is explicit; do not show a lock icon or “secure session” copy. Refresh may keep names in the tab until logout; it is still not a server session.

- **Risk:** Hashing on submit feels like a hang on slow devices.
  **Mitigation:** Disable the submit button and show a short pending state.

- **Risk:** 409 vs 401 messages leak whether an email is registered.
  **Mitigation:** Duplicate email on **register** is a clear 409 (needed for a teacher tool). Login always uses one 401 string.

- **Risk:** Confirm-password mismatches frustrate users.
  **Mitigation:** Client-only confirm field with an immediate FieldError; never sent to the API.

---

## Troubleshooting Guide

Populate with real incidents during implementation. Anticipated issues:

### D1 binding missing in local Node dev

**Problem:** Register/login throw because `env.DB` is undefined under `npm run dev`.
**Cause:** D1 is a Workers binding; the Node dev server does not provide it the same way.
**Solution:** Keep DB access in `src/lib/db.ts`. Prove behavior with mocked tests and `npm run preview`. Do not read `process.env.DB`.
**Code Reference:** `src/lib/db.ts` (planned)

### Unique username error surfaces as 500

**Problem:** Second registration returns 500 instead of 409.
**Cause:** D1 unique constraint not mapped in the service.
**Solution:** Detect the constraint failure in `createUser` and throw a typed conflict the route maps to 409.
**Code Reference:** `src/lib/services/user-service.ts` (planned)

### Login succeeds in tests but fails in the browser

**Problem:** 401 after a successful registration.
**Cause:** Client sent plaintext, or hex casing differs, or salt/hash encoding differs between register and login.
**Solution:** One shared `hashPasswordForWire` and `hashPasswordForStorage`. Tests must use the same helpers as the UI. Compare hex in lowercase.
**Code Reference:** `src/lib/password.ts` (planned)

### `getCloudflareContext` crashes Vitest

**Problem:** Tests fail importing OpenNext.
**Cause:** jsdom has no Workers context.
**Solution:** Mock `@opennextjs/cloudflare` or mock `src/lib/db.ts` as in the testing skill.
**Code Reference:** `.cursor/skills/testing/SKILL.md`

### Tests written after production code

**Problem:** A phase is “green” but never went red; tests cannot fail.
**Cause:** Implementation-first, tests as an afterthought.
**Solution:** Delete or invert the production behavior long enough to see RED, or restore TDD order: tests first. Record both runs in the PRD. Do not mark the phase COMPLETED without a RED log.
**Code Reference:** phase Test Plan in this PRD

### Wrangler migration applied remotely

**Problem:** Schema changed in production by accident.
**Cause:** `migrations apply` without `--local` or with `--remote`.
**Solution:** Never run remote apply. If it happens, stop and tell the user; do not try to “fix” remote schema unprompted.

---

## Notes for AI Agents

1. Read Overview, Hypothesis, and **TDD Process (mandatory)** first.
2. Obey Scope (In / Out / Cut). Do not add sessions, social login, or a question editor.
3. **Do not start a phase until the user names it and asks to implement it.**
4. **TDD is not optional.** For the named phase: write the Test Plan tests → run `npm test` (RED) → record the failure in this PRD → write production code → `npm test` (GREEN) → record it → stop. Do not implement production code before RED.
5. Use **Vitest** only, as in `.cursor/skills/testing/SKILL.md`. Ask before adding Vitest (Phase 1) or Zod (Phase 3).
6. Implement only the tests listed for that phase (plus refactors needed to keep older tests green). Do not skip failure-path cases.
7. Centralize D1 in `src/lib/`. Prepared statements with `?1`, `?2`. Never concatenate user input into SQL.
8. Hash on the client for the wire and again on the server for storage. Never log passwords or hashes.
9. Tick Acceptance Criteria only when mapped tests are green. Update Key Files, Troubleshooting, and Current Status. Delete stale claims.
10. Cite code as `filepath:line-number`.
11. Phase 7: record actual `npm test`, `lint`, and `build` output. Use `npm run preview` for D1/Workers. Never `npm run deploy`. Never remote D1.
12. If D1 or Wrangler auth is required in Cursor Cloud, stop and say it must be run locally.
13. Keep `AGENTS.md` aligned with this PRD when the product description changes.

---

## Current Status

**Last Updated:** 2026-08-26
**Current Phase:** Phase 2 - D1 database and users migration
**Status:** COMPLETED (waiting for review before Phase 3)
**Next Steps:** Human review of Phase 2. After confirmation, implement **Phase 3 only** when explicitly asked (user service tests RED, then CRUD GREEN).

**TDD log:**
- Phase 1 RED/GREEN: password helpers (11 tests).
- Phase 2 RED: missing `@/lib/db` and `@/lib/users-schema` (2 failed suites; 11 password tests still passed).
- Phase 2 GREEN: 20/20 tests passed. Local migration `0001_create_users.sql` applied. No `--remote`.

**Already true in the repo today:**

- Vitest harness and password helpers (Phase 1).
- `USERS_TABLE_SQL`, `getDb()`, D1 binding `DB`, local `users` migration (Phase 2).
- Real D1 database `quizmaker-db` (`b5346f05-82dc-4fc3-9c46-382efdc665e4`); local migration applied. Remote schema not migrated.
- No auth UI, no Zod, no user service.
- Home page is still the default Next.js starter.

**Not started:** user service, API routes, register/login/MCQ UI, Phases 3–7 Test Plan files.
