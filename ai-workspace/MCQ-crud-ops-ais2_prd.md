Date created: 2026-09-03
Date last modified: 2026-09-03

# MCQ Create, Update, Delete, and Attempt - Technical PRD

**Product:** The Greenfield Quizmaker
**Sprint focus:** Expand the empty `/mcq` stub into a teacher MCQ bank: list, create, edit, preview, delete, and record an attempt
**Implementation rule:** Documentation only until the user reviews a phase and explicitly asks to implement it. Do not start coding from this PRD unprompted.
**Delivery rule:** Every phase is **test-driven**. Write the phase test plan in Vitest first (RED), then the minimum production code until that plan is GREEN. A phase is not complete while its tests are red, skipped, or missing.

---

## Overview/Problem

Teachers who sign in to The Greenfield Quizmaker currently land on an empty Multiple Choice Question (MCQ) stub. They can register, log in, and log out, but they cannot add a question, list existing questions, change wording or choices, preview how a question will look, or remove a question from the shared bank.

Without persistable questions and choices, later sprints have nothing to collaborate on, generate from, or assign. This sprint replaces the stub with a table of questions, a dedicated create/edit page, preview and delete actions, and a third table that records which choice a taker selected and whether it was correct.

---

## Hypothesis

We believe that letting teachers create, edit, preview, delete, and attempt multiple-choice questions on the existing `/mcq` landing path will turn the stub into a usable shared MCQ bank they can maintain without leaving the app.

---

## Scope

### In Scope

- Replace the empty `/mcq` stub with a shadcn **table** that lists all persisted MCQs.
- Table columns: **Name**, **Description** (the question stem, truncated in the list), **Actions**.
- A **Create** button on `/mcq` that navigates to a new page (`/mcq/new`) where the teacher authors the question name, stem, and choices.
- Create/edit page **Save** persists the question and its choices; **Cancel** returns to `/mcq` without writing.
- Edit uses the same form on `/mcq/[qid]/edit`. Save updates the existing question and replaces its choices.
- Actions are behind a **three-dot vertical ellipsis** dropdown per row: **Edit**, **Preview**, **Delete**.
- **Preview** (`/mcq/[qid]/preview`) shows the question stem and its choices as a taker would see them. The teacher may select a choice and submit an **attempt**.
- **Delete** permanently removes the question, its choices, and its attempts after a confirmation dialog.
- D1 tables: `questions`, `choices`, `attempts`, applied **locally** only.
- An MCQ **service** above D1 that owns all SQL. HTTP route handlers call the service; they do not run SQL inline.
- HTTP endpoints for list, create, read, update, delete, and attempt.
- Default **2** choice fields on the form, with controls to add up to **6** and to remove down to **2**. Exactly one choice is marked correct.
- Keep existing register, login, logout, greeting, and signed-out hint behavior on `/mcq`.
- **Test-driven development with Vitest for every phase:** failing tests first, then implementation until green. Previous phases must stay green.

### Out of Scope

- Server sessions, JWT, cookies, CSRF, or middleware that blocks unauthenticated `/mcq` or `/api/mcq` requests (same gap as the identity sprint).
- Ownership, sharing rules, or filtering the list by teacher. The bank is a single shared list.
- Quiz assembly (sets of questions), scoring dashboards, attempt history pages, or analytics.
- Rich text, images, audio, LaTeX, or media in stems or choices.
- Question types other than single-correct multiple choice.
- Collaboration, comments, version history, publish/draft workflow, or TEKS alignment.
- AI generation of questions or choices.
- Remote D1 migrations or `npm run deploy` unless the user explicitly asks.
- `@cloudflare/vitest-pool-workers`. Unit tests mock D1 via `src/lib/db.ts`.
- Tests whose assertions cannot fail, leftover `.skip` / `.todo`, or tests written only after the production code is already green.

### Cut

- **SQL Server `CLUSTERED` primary key** — D1 is SQLite. There is no `CLUSTERED` keyword. `qid` is a `TEXT` primary key generated as a UUID in the service, matching `userid`. SQLite’s rowid/clustered analog is `INTEGER PRIMARY KEY`; that was cut so public ids stay opaque and consistent with `users`.
- **Hyphenated column names (`q-id`, `created-at`)** — Mapped to snake_case (`qid`, `created_at`) to match `users`.
- **Separate `description` column** — The list **Description** column displays `questions.question` (the stem). The schema does not add a third text field.
- **Foreign key from `attempts.choiceid` to `choices`** — Attempts store a **snapshot** (`choiceid`, `choice_text`, `is_correct`) so editing and replacing choices does not break history. `attempts.qid` still references `questions(qid)` with `ON DELETE CASCADE`.
- **HTTP-only session on attempt** — The client sends `userid` from `sessionStorage` (`gq.userid`). The API does not prove that identity. Same limitation as login.
- **Next.js Server Actions as the only mutation path** — This sprint uses HTTP endpoints so contracts are unit-testable the same way as register/login. Server Actions may wrap them later.
- **Pagination, search, and sort controls** — The table lists all questions in `created_at DESC` order. Add paging only if review asks.
- **Writing production code before the phase’s Vitest tests exist** — Forbidden.

---

## TDD Process (mandatory)

This sprint uses **Vitest** as the only automated test framework, matching `.cursor/skills/testing/SKILL.md`. React UI tests use Testing Library on jsdom. Server and library tests mock Cloudflare/D1 and never open a real network or remote database.

### Cycle for every phase

```
1. RED     Write the tests listed in that phase’s Test Plan.
           Run `npm test`. New tests MUST fail for the right reason.
           Record the RED result in this PRD before writing production code.

2. GREEN   Write the minimum production code until those tests pass.
           Re-run the full suite. Prior phases must remain green.

3. REFACTOR  Only if needed, and only while the suite stays green.

4. STOP    Update this PRD (phase status, RED/GREEN notes, AC checkboxes
           that this phase actually proved). Wait for review.
```

A phase is **not COMPLETED** if any of the following is true:

- The Test Plan tests were written after the production code.
- `npm test` was not run, or RED was skipped.
- Any Test Plan case is missing, skipped, or vacuously true.
- Mapped acceptance criteria for that phase are still unchecked.
- Tests from an earlier completed phase are now red.

### RED quality bar

- Name tests so the failure states the broken behavior.
- Assert observable output: return values, HTTP status and JSON, what the user can see, `fetch` bodies. Do not assert private internals.
- Include failure paths in the Test Plan, not only the happy path.
- Each test must pass in isolation. `beforeEach(() => { vi.clearAllMocks(); })` where mocks are used.
- Never hit a real D1, Wrangler remote, or HTTP server from a unit test. Mock at `src/lib/db.ts` or the MCQ service boundary.

### UI structure required by TDD

Interactive pages stay thin `page.tsx` files. Behavior lives in client components under `src/components/mcq/` so Testing Library can render them.

### Existing tests that must stay green

The identity sprint’s suite (including `mcq-stub.test.tsx`) remains required. Expanding `/mcq` must still:

- Show a heading about multiple-choice questions.
- Greet the teacher first name from `sessionStorage`.
- Show the signed-out hint and `/login` link when `sessionStorage` is empty.
- Log out via `POST /api/users/logout`, clear `gq.*` keys, and navigate to `/login`.
- Keep the **list** page free of the question editor: no stem textbox and no **Save** button on `/mcq` itself (those belong on `/mcq/new` and `/mcq/[qid]/edit`).

### Commands

| When | Command | Expected |
|------|---------|----------|
| After writing tests | `npm test` | RED for the new cases |
| After production code | `npm test` | GREEN for the full suite |
| Phase 7 | `npm test` && `npm run lint` && `npm run build` | All green; then local `npm run preview` if D1 is in play |

---

## Technical Requirements

### Database Schema

Cloudflare D1 remains bound as `DB` (`quizmaker-db`). The `users` table is unchanged. This sprint adds three tables in a new local migration.

**Proposed database name:** `quizmaker-db`
**Binding:** `DB`

Column names use snake_case. Ids are UUID strings generated in the MCQ service (`crypto.randomUUID()`), not by SQLite `randomblob` in the table default, so tests can assert the service owns id creation.

```sql
CREATE TABLE questions (
  qid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE choices (
  choiceid TEXT PRIMARY KEY,
  qid TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  FOREIGN KEY (qid) REFERENCES questions(qid) ON DELETE CASCADE
);

CREATE INDEX idx_choices_qid ON choices (qid);
CREATE UNIQUE INDEX idx_choices_qid_position ON choices (qid, position);

CREATE TABLE attempts (
  attemptid TEXT PRIMARY KEY,
  qid TEXT NOT NULL,
  userid TEXT NOT NULL,
  choiceid TEXT NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (qid) REFERENCES questions(qid) ON DELETE CASCADE
);

CREATE INDEX idx_attempts_qid ON attempts (qid);
CREATE INDEX idx_attempts_userid ON attempts (userid);
```

#### `questions`

| Column | Type | Notes |
|--------|------|--------|
| `qid` | TEXT PK | UUID generated in the MCQ service. |
| `name` | TEXT NOT NULL | Short title shown in the list **Name** column. |
| `question` | TEXT NOT NULL | Stem shown in the list **Description** column and on preview/edit. |
| `created_at` | TEXT | SQLite `datetime('now')` on insert. |
| `updated_at` | TEXT | Same default on insert; service sets `datetime('now')` on update. |

#### `choices`

| Column | Type | Notes |
|--------|------|--------|
| `choiceid` | TEXT PK | UUID generated in the MCQ service. |
| `qid` | TEXT NOT NULL | FK to `questions.qid`. |
| `choice_text` | TEXT NOT NULL | Wording of this choice. |
| `is_correct` | INTEGER NOT NULL | `1` or `0`. Service requires exactly one `1` per question. |
| `position` | INTEGER NOT NULL | Display order `1`–`6`. Unique per `qid`. |

A question must have **2 to 6** choices. Enforced in the service, not by a SQLite CHECK on row count.

#### `attempts`

| Column | Type | Notes |
|--------|------|--------|
| `attemptid` | TEXT PK | UUID generated in the MCQ service. |
| `qid` | TEXT NOT NULL | FK to `questions.qid`. |
| `userid` | TEXT NOT NULL | Taker id from the client (`gq.userid`). Not a proven session. |
| `choiceid` | TEXT NOT NULL | Snapshot of the selected choice’s id (no FK to `choices`). |
| `choice_text` | TEXT NOT NULL | Snapshot of the selected wording at attempt time. |
| `is_correct` | INTEGER NOT NULL | `1` if that choice was correct when submitted; else `0`. |
| `created_at` | TEXT | SQLite `datetime('now')`. |

The SQL lives in `src/lib/mcq-schema.ts` as exported strings so Phase 1 tests can assert the contract. The Wrangler migration file must contain the same `CREATE TABLE` bodies.

On delete, the service also issues explicit `DELETE` for attempts and choices before the question so mocked D1 tests do not depend on engine-level CASCADE.

No other tables in this sprint. Do not alter `users`.

### API Endpoints

All routes are Next.js App Router handlers under `src/app/api/mcq/`. They call the MCQ service. Validate every body with Zod. JSON field names are camelCase.

Public question objects never need a password field; do not invent one. List responses omit choice correctness only if we later hide answers; this sprint’s GET-by-id **does** include `isCorrect` because edit needs it. The **preview UI** does not display which choice is correct until after an attempt is submitted.

#### GET /api/mcq

Lists all questions for the table, newest first.

**Success (200):**

```json
{
  "questions": [
    {
      "qid": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Photosynthesis",
      "question": "What gas do plants release during photosynthesis?",
      "createdAt": "2026-09-03 12:00:00",
      "updatedAt": "2026-09-03 12:00:00"
    }
  ]
}
```

**Errors:**

- **500** `{ "error": "Unable to list questions." }`

#### POST /api/mcq

Creates a question and its choices.

**Request body:**

```json
{
  "name": "Photosynthesis",
  "question": "What gas do plants release during photosynthesis?",
  "choices": [
    { "choiceText": "Oxygen", "isCorrect": true },
    { "choiceText": "Nitrogen", "isCorrect": false }
  ]
}
```

**Success (201):** Question object including `qid`, timestamps, and choices with generated `choiceid` and `position` (order of the array, starting at 1).

**Errors:**

- **400** `{ "error": "Validation failed", "details": [ { "path": "name", "message": "..." } ] }` — missing name/stem, fewer than 2 or more than 6 choices, empty choice text, zero or more than one correct choice.
- **500** `{ "error": "Unable to create question." }`

#### GET /api/mcq/[qid]

Returns one question with choices for edit and preview.

**Success (200):**

```json
{
  "qid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Photosynthesis",
  "question": "What gas do plants release during photosynthesis?",
  "createdAt": "2026-09-03 12:00:00",
  "updatedAt": "2026-09-03 12:00:00",
  "choices": [
    {
      "choiceid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "choiceText": "Oxygen",
      "isCorrect": true,
      "position": 1
    },
    {
      "choiceid": "88cd39e2-8a0a-4c3e-9c1a-0c0d5e6f7a8b",
      "choiceText": "Nitrogen",
      "isCorrect": false,
      "position": 2
    }
  ]
}
```

**Errors:**

- **404** `{ "error": "Question not found." }`
- **500** `{ "error": "Unable to load question." }`

#### PUT /api/mcq/[qid]

Replaces name, stem, and the full choice set.

**Request body:** Same shape as POST (no `qid` in the body).

**Success (200):** Updated question with choices (new `choiceid` values are allowed when choices are replaced).

**Errors:**

- **400** validation (same rules as POST).
- **404** `{ "error": "Question not found." }`
- **500** `{ "error": "Unable to update question." }`

#### DELETE /api/mcq/[qid]

Permanently deletes the question, its choices, and its attempts.

**Success (200):**

```json
{ "ok": true }
```

**Errors:**

- **404** `{ "error": "Question not found." }`
- **500** `{ "error": "Unable to delete question." }`

#### POST /api/mcq/[qid]/attempts

Records a taker’s selected choice.

**Request body:**

```json
{
  "userid": "550e8400-e29b-41d4-a716-446655440000",
  "choiceid": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

The service loads the question’s current choices, finds `choiceid`, copies `choice_text` and `is_correct` into the attempt row.

**Success (201):**

```json
{
  "attemptid": "aa0e8400-e29b-41d4-a716-446655440099",
  "qid": "550e8400-e29b-41d4-a716-446655440000",
  "userid": "550e8400-e29b-41d4-a716-446655440000",
  "choiceid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "choiceText": "Oxygen",
  "isCorrect": true,
  "createdAt": "2026-09-03 12:05:00"
}
```

**Errors:**

- **400** missing `userid` / `choiceid`, or `choiceid` not on this question.
- **404** question missing.
- **500** `{ "error": "Unable to record attempt." }`

No other public MCQ HTTP endpoints in this sprint. `listAttempts` may exist on the service for tests without a UI.

### User Interface Requirements

Use shadcn/ui. Already in the repo: `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `table`, `badge`.

**Ask before adding** (Phase 4/5/6, only if still missing): `@shadcn/dropdown-menu`, `@shadcn/textarea`, `@shadcn/radio-group`. Always `npx shadcn@latest add @shadcn/<name>`. Do not hand-edit generated files under `src/components/ui/` except to compose from them.

Shared chrome on `/mcq`, `/mcq/new`, `/mcq/[qid]/edit`, and `/mcq/[qid]/preview`: product context, teacher greeting or signed-out hint, **Log out** (same `sessionStorage` + `POST /api/users/logout` behavior as today).

#### MCQ list (`/mcq`)

- Heading such as “Create multiple-choice questions” (keep the existing accessible heading so prior tests stay valid).
- **Create** button → `/mcq/new`.
- shadcn `Table` with headers **Name**, **Description**, **Actions**.
- Each row: `name`; truncated `question` as Description; Actions cell with an icon button (`EllipsisVertical` from Lucide) that opens a dropdown: **Edit**, **Preview**, **Delete**.
- Empty state: readable copy such as “No questions yet” and the Create button still available. No placeholder rows.
- **Edit** → `/mcq/[qid]/edit`.
- **Preview** → `/mcq/[qid]/preview`.
- **Delete** → shadcn `Dialog` confirming permanent deletion; confirm calls `DELETE /api/mcq/[qid]`, then refresh the list; cancel closes the dialog.
- Load list with `GET /api/mcq`. Show a form-level error if the request fails.
- No stem editor and no Save on this page.

#### Create (`/mcq/new`) and Edit (`/mcq/[qid]/edit`)

Shared client form component; create starts empty, edit loads `GET /api/mcq/[qid]`.

- **Name** — required, trim, 1–200 characters, `input`.
- **Question** — required, trim, 1–5000 characters, textarea (or `input` if textarea is not approved).
- **Choices** — default **2** rows on create. Each row: choice text (required, 1–500 characters) and a control to mark **exactly one** as the correct answer (radio group).
- **Add choice** — enabled while count &lt; 6.
- **Remove choice** — enabled while count &gt; 2. Removing the currently correct row requires the teacher to pick another correct choice before Save (client validation).
- **Save** — client-validate → `POST /api/mcq` (create) or `PUT /api/mcq/[qid]` (edit) → on success `router.push("/mcq")`. Disable while pending.
- **Cancel** — `router.push("/mcq")` with no write. No unsaved-changes prompt in this sprint.
- 400 `details` shown on matching fields; 404 on edit shown as a page-level message with a link back to `/mcq`; 500 generic message.
- Edit: if GET fails with 404, do not show an empty saveable form.

#### Preview (`/mcq/[qid]/preview`)

- Load `GET /api/mcq/[qid]`.
- Show **name** as a heading or label, then the stem, then choices as a radio group **without** revealing `isCorrect` before submit.
- **Submit attempt** — requires a selected choice and `gq.userid` in `sessionStorage`. POST `/api/mcq/[qid]/attempts` with `{ userid, choiceid }`.
- After success, show whether the selected choice was **correct** or **incorrect** using the response `isCorrect`.
- If `sessionStorage` has no `gq.userid`, show the signed-out hint and do not call the attempts API.
- **Back** (or equivalent) returns to `/mcq`.
- Do not offer Save on this page.

#### Validation (client, before fetch)

| Field | Rule |
|-------|------|
| name | Required, 1–200 after trim |
| question | Required, 1–5000 after trim |
| choices | Length 2–6; each text 1–500 after trim |
| correct choice | Exactly one `isCorrect: true` |
| attempt choiceid | Required before submit |
| attempt userid | Must exist in `sessionStorage` |

Server re-validates the same rules with Zod.

---

## Implementation Phases

**Review gate:** An agent must not start a phase until the user has reviewed this PRD (or that phase) and explicitly asked to implement it. Follow the TDD cycle in **TDD Process (mandatory)**. After GREEN, update this file and stop.

**Phase log (fill during implementation):**

| Field | When to record |
|-------|----------------|
| RED result | Paste the failing `npm test` summary before production code |
| GREEN result | Paste the passing `npm test` summary after production code |
| AC proved | IDs from the Acceptance Criteria table that this phase turned green |

### Phase 1: D1 schema for questions, choices, and attempts - COMPLETED

**Objective:** Lock the three-table SQL contract with failing tests, then add the schema module and a local-only migration. No service methods and no UI.

**Framework:** Vitest. No real D1 in unit tests.

**Acceptance criteria this phase must turn green:** AC-02 (`qid` TEXT PK), AC-03 (choices FK + position), AC-04 (attempts snapshot columns + `qid` FK). AC-16 is a process check (local migrate only).

**RED result (2026-09-03):** `npm test` failed as intended. `src/lib/mcq-schema.test.ts` did not load: `Failed to resolve import "@/lib/mcq-schema" from "src/lib/mcq-schema.test.ts". Does the file exist?` — Test Files 1 failed | 12 passed (13). Tests 86 passed (86). Vitest v4.1.11.

**GREEN result (2026-09-03):** After `src/lib/mcq-schema.ts` and `migrations/0002_create_mcq_tables.sql`: `Test Files 13 passed (13)`, `Tests 98 passed (98)` (12 Phase 1 cases + 86 prior). Local apply: `npx wrangler d1 migrations apply quizmaker-db --local` applied `0002_create_mcq_tables.sql` (not `--remote`). `npm run lint` exited 0.

**AC proved:** Schema contract for AC-02 (`qid TEXT PRIMARY KEY`), AC-03 (choices FK, `choice_text` / `is_correct` / `position`), and AC-04 (attempts snapshot columns + `qid` FK CASCADE) via tests 1.1–1.12. Service/HTTP cases for those ACs remain; checkboxes stay unchecked until then. AC-16 process check: local migrate only; no deploy.

#### Test Plan (write first → RED)

**Files:** `src/lib/mcq-schema.test.ts`  
**Subject (create only after RED):** `src/lib/mcq-schema.ts`

| # | Test name | Assertion |
|---|-----------|-----------|
| 1.1 | questions schema defines table questions | SQL includes `CREATE TABLE questions` |
| 1.2 | questions schema requires qid as text primary key | `qid TEXT PRIMARY KEY` |
| 1.3 | questions schema requires name and question | both `TEXT NOT NULL` |
| 1.4 | questions schema includes created_at and updated_at with datetime default | both columns present with `datetime('now')` |
| 1.5 | choices schema defines table choices | `CREATE TABLE choices` |
| 1.6 | choices schema requires choiceid primary key and qid foreign key | `choiceid TEXT PRIMARY KEY`; `FOREIGN KEY (qid) REFERENCES questions(qid)` |
| 1.7 | choices schema stores choice_text, is_correct, and position | those columns present and NOT NULL |
| 1.8 | choices schema cascades delete with the question | `ON DELETE CASCADE` on the choices FK |
| 1.9 | attempts schema defines table attempts | `CREATE TABLE attempts` |
| 1.10 | attempts schema records qid, userid, choiceid, choice_text, and is_correct | all present and NOT NULL |
| 1.11 | attempts schema cascades delete with the question | `ON DELETE CASCADE` on the attempts `qid` FK |
| 1.12 | migration SQL matches the tested schema contract | a file under `migrations/` contains the same `CREATE TABLE` bodies as the exported SQL strings |

**RED expected:** `src/lib/mcq-schema.ts` missing or throwing `not implemented`; migration missing so 1.12 fails.

#### GREEN tasks (only after RED)

1. Export `QUESTIONS_TABLE_SQL`, `CHOICES_TABLE_SQL`, `ATTEMPTS_TABLE_SQL` (and any index SQL the tests require) from `src/lib/mcq-schema.ts`.
2. Create `migrations/0002_create_mcq_tables.sql` with the same bodies. Apply **locally only**: `npx wrangler d1 migrations apply quizmaker-db --local`.
3. Do not run `--remote`. Do not change `users`.

**Deliverables:** Tested schema contract; local migration; RED/GREEN log.

**Phase done when:** 1.1–1.12 green; migration applied locally; no `--remote`.

---

### Phase 2: MCQ service (questions, choices, attempts) - COMPLETED

**Objective:** Drive create, read, update, delete, and attempt from failing tests with a mocked D1 module. No HTTP and no UI.

**Framework:** Vitest. Mock `src/lib/db.ts`. Use an in-memory fake store so create → get is observable. `vi.mock("server-only", () => ({}))` if needed.

**Acceptance criteria this phase must turn green:** AC-01 (create persists name, stem, 2–6 choices, one correct), AC-05 (update replaces fields and choices), AC-06 (delete removes question, choices, attempts), AC-07 (attempt snapshots correctness), AC-08 (validation errors are typed), AC-11 (list returns all questions).

**RED result (2026-09-03):** `npm test` failed as intended. `src/lib/services/mcq-service.test.ts` did not load: `Failed to resolve import "@/lib/services/mcq-service" from "src/lib/services/mcq-service.test.ts". Does the file exist?` — Test Files 1 failed | 13 passed (14). Tests 98 passed (98).

**GREEN result (2026-09-03):** After `src/lib/services/mcq-service.ts`: `Test Files 14 passed (14)`, `Tests 117 passed (117)` (19 Phase 2 cases + 98 prior). `npm run lint` exited 0.

**AC proved (service layer):** AC-01, AC-05, AC-06, AC-07, AC-08, AC-11 via tests 2.1–2.19. HTTP/UI cases remain; checkboxes stay unchecked until then.

#### Test Plan (write first → RED)

**File:** `src/lib/services/mcq-service.test.ts`  
**Subject:** `src/lib/services/mcq-service.ts`

| # | Test name | Assertion |
|---|-----------|-----------|
| 2.1 | createQuestion returns a question with a generated qid | `qid` is a non-empty UUID; input did not supply it |
| 2.2 | createQuestion persists name, question, and two choices | get-by-id returns the same name, stem, and choice texts |
| 2.3 | createQuestion assigns position from array order starting at 1 | first choice `position === 1`, second `=== 2` |
| 2.4 | createQuestion stores exactly one correct choice | one choice `isCorrect === true` |
| 2.5 | createQuestion rejects fewer than two choices | typed validation error |
| 2.6 | createQuestion rejects more than six choices | typed validation error |
| 2.7 | createQuestion rejects zero or multiple correct choices | typed validation error |
| 2.8 | createQuestion rejects empty name or question | typed validation error |
| 2.9 | getQuestionById returns null when missing | `null`, not an unstructured throw |
| 2.10 | listQuestions returns newest first and omits choices | array ordered by `createdAt` descending; items have no `choices` key |
| 2.11 | updateQuestion changes name, question, and replaces choices | subsequent get shows new stem and new choice texts; old choice ids need not remain |
| 2.12 | updateQuestion returns null when qid is missing | `null` or typed not-found |
| 2.13 | deleteQuestion removes the question | get-by-id after delete is `null` |
| 2.14 | deleteQuestion removes choices and attempts | fake store has no choices/attempts for that `qid` |
| 2.15 | deleteQuestion is safe when qid is missing | no unstructured throw |
| 2.16 | recordAttempt stores the selected choice snapshot and isCorrect | returned `isCorrect` matches the choice’s current `isCorrect`; `choiceText` copied |
| 2.17 | recordAttempt rejects a choiceid that is not on the question | typed validation error |
| 2.18 | recordAttempt returns not-found when the question is missing | `null` or typed not-found |
| 2.19 | queries use numbered placeholders | prepared SQL contains `?1` and does not concatenate name/stem into SQL |

**RED expected:** service missing or methods throw `not implemented`.

#### GREEN tasks (only after RED)

1. Implement the service with Zod input schemas and prepared statements (`?1`, `?2`).
2. Use `db.batch` (or equivalent sequential statements in the fake) for create/update/delete that touch multiple tables.
3. Generate `qid`, `choiceid`, and `attemptid` with `crypto.randomUUID()`.
4. On update, delete existing choices for `qid` then insert the new set; set `updated_at`.

**Deliverables:** MCQ service; 2.1–2.19 green; prior tests still green.

**Phase done when:** AC-01, AC-05, AC-06, AC-07, AC-08, AC-11 are checkable at the service layer.

---

### Phase 3: MCQ HTTP endpoints - PLANNED

**Objective:** Drive route handlers from failing HTTP-contract tests. Mock the **MCQ service**, not D1.

**Framework:** Vitest. Import handlers from each `route.ts` and call them with `new Request(...)`.

**Acceptance criteria this phase must turn green:** AC-01 (201 create), AC-05 (200 update), AC-06 (200 delete), AC-07 (201 attempt), AC-08 (400), AC-09 (404), AC-11 (200 list).

**RED result:** _(record when implementing)_

**GREEN result:** _(record when implementing)_

#### Test Plan (write first → RED)

**Files:**  
`src/app/api/mcq/route.test.ts`  
`src/app/api/mcq/[qid]/route.test.ts`  
`src/app/api/mcq/[qid]/attempts/route.test.ts`

| # | Test name | Assertion |
|---|-----------|-----------|
| 3.1 | GET /api/mcq returns 200 and the questions array | mock `listQuestions` |
| 3.2 | GET /api/mcq returns 500 with a generic message on throw | `"Unable to list questions."` |
| 3.3 | POST /api/mcq returns 201 and the created question | includes `qid` and `choices` |
| 3.4 | POST /api/mcq returns 400 when validation fails | status 400; `error` + `details` |
| 3.5 | POST /api/mcq returns 500 with a generic message on throw | `"Unable to create question."` |
| 3.6 | GET /api/mcq/[qid] returns 200 with choices | mock `getQuestionById` |
| 3.7 | GET /api/mcq/[qid] returns 404 when missing | `"Question not found."` |
| 3.8 | PUT /api/mcq/[qid] returns 200 with the updated question | mock `updateQuestion` |
| 3.9 | PUT /api/mcq/[qid] returns 400 on validation failure | 400 + details |
| 3.10 | PUT /api/mcq/[qid] returns 404 when missing | `"Question not found."` |
| 3.11 | DELETE /api/mcq/[qid] returns 200 `{ ok: true }` | mock `deleteQuestion` success |
| 3.12 | DELETE /api/mcq/[qid] returns 404 when missing | `"Question not found."` |
| 3.13 | POST /api/mcq/[qid]/attempts returns 201 with isCorrect | mock `recordAttempt` |
| 3.14 | POST /api/mcq/[qid]/attempts returns 400 for unknown choiceid | 400 |
| 3.15 | POST /api/mcq/[qid]/attempts returns 404 when the question is missing | 404 |
| 3.16 | handlers do not set a session cookie | no `Set-Cookie` on create or attempt |

**RED expected:** route files missing (`GET`/`POST`/`PUT`/`DELETE` import fails) or handlers throw `not implemented`.

#### GREEN tasks (only after RED)

1. Implement the handlers: parse JSON → Zod → service → status mapping.
2. Never set JWT or session cookies (3.16 must stay true).

**Deliverables:** MCQ routes; 3.1–3.16 green.

**Phase done when:** HTTP contracts match this document.

---

### Phase 4: MCQ list UI (table, create, actions menu, delete) - PLANNED

**Objective:** Drive the `/mcq` list from failing Testing Library tests. Keep logout and greeting. No create form on this page.

**Framework:** Vitest + jsdom + Testing Library + `userEvent`. Mock `global.fetch` and `next/navigation`. Reset `sessionStorage` in `beforeEach`.

**Acceptance criteria this phase must turn green:** AC-10 (table columns + empty state), AC-12 (Create navigates to `/mcq/new`), AC-13 (ellipsis actions), AC-06 (delete confirm + DELETE + list refresh). Prior stub ACs for greeting/logout remain green.

**RED result:** _(record when implementing)_

**GREEN result:** _(record when implementing)_

#### Test Plan (write first → RED)

**Files:** extend `src/components/mcq/mcq-stub.test.tsx` and/or add `src/components/mcq/mcq-list.test.tsx`  
**Subject:** evolve `src/components/mcq/mcq-stub.tsx` into the list (keep the module so existing tests import the same component, or re-export). Thin page stays `src/app/mcq/page.tsx`.

| # | Test name | Assertion |
|---|-----------|-----------|
| 4.1 | list page still has the multiple-choice heading | existing heading assertion remains true |
| 4.2 | list page has no stem textbox and no Save button | `queryByRole("textbox")` null; no Save button (editor is not on `/mcq`) |
| 4.3 | list page has a Create control that goes to /mcq/new | link or button navigating to `/mcq/new` |
| 4.4 | empty list shows a no-questions message | `GET` returns `{ questions: [] }`; user-visible empty copy |
| 4.5 | list table shows Name, Description, and Actions headers | column headers the user can read |
| 4.6 | list table renders a row’s name and question | mock GET with one question; both strings on screen |
| 4.7 | row actions menu includes Edit, Preview, and Delete | open the ellipsis; three items present |
| 4.8 | choosing Edit navigates to /mcq/[qid]/edit | `router.push` with that path |
| 4.9 | choosing Preview navigates to /mcq/[qid]/preview | `router.push` with that path |
| 4.10 | choosing Delete opens a confirmation dialog | dialog / accessible confirm text visible |
| 4.11 | confirming delete calls DELETE /api/mcq/[qid] | `fetch` method DELETE and URL containing the qid |
| 4.12 | confirming delete refreshes the list so the row is gone | after DELETE, GET reruns or row removed |
| 4.13 | canceling delete does not call DELETE | `fetch` not called with DELETE |
| 4.14 | greeting, signed-out hint, and logout still work | existing 6.10–6.14 behavior remains green |

**RED expected:** Create, table, or menu missing; 4.2 must stay true after GREEN (no editor on the list).

#### GREEN tasks (only after RED)

1. Propose and (only after the user agrees) add `@shadcn/dropdown-menu` if it is not already in `src/components/ui/`.
2. Build the table with shadcn `Table` and the ellipsis menu. Use existing `Dialog` for delete confirm.
3. Fetch the list on mount. Keep logout as today.

**Deliverables:** List UI; 4.1–4.14 green; identity tests still green.

**Phase done when:** AC-06 (UI delete), AC-10, AC-12, AC-13 checkable.

---

### Phase 5: Create and edit UI - PLANNED

**Objective:** Drive the authoring page from failing UI tests: two default choices, add/remove up to six, Save and Cancel.

**Framework:** Same as Phase 4.

**Acceptance criteria this phase must turn green:** AC-01 (create Save POSTs valid body), AC-05 (edit Save PUTs), AC-08 (client validation), AC-14 (Cancel returns to `/mcq` without fetch).

**RED result:** _(record when implementing)_

**GREEN result:** _(record when implementing)_

#### Test Plan (write first → RED)

**Files:**  
`src/components/mcq/mcq-form.test.tsx`  
**Subjects:** `src/components/mcq/mcq-form.tsx`  
Thin pages: `src/app/mcq/new/page.tsx`, `src/app/mcq/[qid]/edit/page.tsx`

| # | Test name | Assertion |
|---|-----------|-----------|
| 5.1 | create form shows name, question, and two choice fields | labelled inputs; two choice textboxes |
| 5.2 | create form has Save and Cancel | both controls present |
| 5.3 | Cancel navigates to /mcq without posting | `router.push("/mcq")`; `fetch` not called with POST `/api/mcq` |
| 5.4 | Save does not submit when name or question is empty | `fetch` not called; accessible errors |
| 5.5 | Save does not submit when a choice is empty | `fetch` not called |
| 5.6 | Save does not submit when no correct choice is selected | `fetch` not called |
| 5.7 | Add choice adds a third field and is disabled at six | after four adds, six fields; Add disabled |
| 5.8 | Remove choice is disabled at two choices | cannot go below two |
| 5.9 | successful create POSTs /api/mcq with name, question, and choices | URL, method POST; body has two+ choices and one `isCorrect: true` |
| 5.10 | successful create navigates to /mcq | `router.push("/mcq")` |
| 5.11 | edit form loads GET /api/mcq/[qid] into the fields | mock GET; name and stem values shown |
| 5.12 | successful edit PUTs /api/mcq/[qid] | method PUT |
| 5.13 | edit shows a not-found message when GET is 404 | no successful Save path; link or copy pointing back to list |
| 5.14 | 400 details are shown on matching fields | accessible field errors |

**RED expected:** form module missing; Save posts without validation.

#### GREEN tasks (only after RED)

1. Propose `@shadcn/textarea` and `@shadcn/radio-group` if needed; wait for agreement.
2. Implement the shared form. Create page does not GET. Edit page GETs then PUTs.
3. Wire thin `page.tsx` files.

**Deliverables:** Create/edit UI; 5.1–5.14 green.

**Phase done when:** AC-01, AC-05, AC-08, AC-14 (UI) checkable.

---

### Phase 6: Preview and attempt UI - PLANNED

**Objective:** Drive preview from failing tests: show stem and choices, hide correctness until submit, record an attempt.

**Framework:** Same as Phase 4. Mock `fetch` and `useRouter`. Reset `sessionStorage`.

**Acceptance criteria this phase must turn green:** AC-07 (attempt POST + correct/incorrect feedback), AC-15 (preview does not reveal the correct choice before submit).

**RED result:** _(record when implementing)_

**GREEN result:** _(record when implementing)_

#### Test Plan (write first → RED)

**Files:** `src/components/mcq/mcq-preview.test.tsx`  
**Subject:** `src/components/mcq/mcq-preview.tsx`  
Thin page: `src/app/mcq/[qid]/preview/page.tsx`

| # | Test name | Assertion |
|---|-----------|-----------|
| 6.1 | preview loads the question name, stem, and choice texts | mock GET; those strings visible |
| 6.2 | preview does not show which choice is correct before submit | no “correct” badge/text on a choice before submit even if GET includes `isCorrect` |
| 6.3 | preview has no Save button | `queryByRole("button", { name: /save/i })` is null |
| 6.4 | submit is not sent when no choice is selected | `fetch` not called with attempts URL |
| 6.5 | signed-out preview does not POST an attempt | empty `sessionStorage`; attempts `fetch` not called |
| 6.6 | successful submit POSTs /api/mcq/[qid]/attempts with userid and choiceid | body matches `gq.userid` and the selected choice |
| 6.7 | successful correct attempt shows that the choice was correct | mock 201 `{ isCorrect: true }`; user-visible correct feedback |
| 6.8 | successful incorrect attempt shows that the choice was incorrect | mock 201 `{ isCorrect: false }` |
| 6.9 | a control returns to /mcq | link or button to `/mcq` |

**RED expected:** preview module missing; correctness leaked in 6.2.

#### GREEN tasks (only after RED)

1. Render choices as radios without using `isCorrect` in the pre-submit UI.
2. POST attempt with `gq.userid`. Show feedback from the response only.

**Deliverables:** Preview + attempt UI; 6.1–6.9 green.

**Phase done when:** AC-07 (UI) and AC-15 checkable.

---

### Phase 7: Acceptance-criteria confirmation and Workers-aware check - PLANNED

**Objective:** Confirm every in-scope AC is proven by a green test (or an explicit process check), then lint/build/preview. No new product features.

**Framework:** Vitest full suite. Add traceability assertions for this sprint’s test files.

**RED result:** _(record when implementing)_

**GREEN result:** _(record when implementing)_

#### Test Plan (write first → RED)

**File:** extend `src/lib/acceptance-traceability.test.ts` (keep 7.1–7.6 from the identity sprint).

| # | Test name | Assertion |
|---|-----------|-----------|
| 7.7 | Phase 1 MCQ schema tests exist | `src/lib/mcq-schema.test.ts` is readable |
| 7.8 | Phase 2 MCQ service tests exist | `src/lib/services/mcq-service.test.ts` exists |
| 7.9 | Phase 3 MCQ route tests exist | list/create, `[qid]`, and attempts `route.test.ts` files exist |
| 7.10 | Phase 4 list UI tests exist | list/stub test file exists and is non-empty |
| 7.11 | Phase 5 form tests exist | `mcq-form.test.tsx` exists |
| 7.12 | Phase 6 preview tests exist | `mcq-preview.test.tsx` exists |

These tests prove TDD artifacts were not deleted. They do not replace 1.x–6.x behavioral tests.

#### GREEN tasks (only after RED)

1. Run `npm test` — full suite green. Record counts in Current Status.
2. Run `npm run lint` and `npm run build`. Record actual results.
3. Locally (not Cursor Cloud): `npm run preview` and walk list → create → edit → preview attempt → delete against local D1.
4. Tick only AC items that tests or recorded commands actually proved.
5. Refresh Key Files, Troubleshooting, phase RED/GREEN logs, and Current Status.

**Deliverables:** Traceability tests green; command log; honest AC checkboxes.

**Phase done when:** AC-13 and AC-14 from this sprint’s table are true from recorded commands. Never deploy. Never `migrations apply --remote` unless the user asks.

---

## Technical Implementation Details

### Documentation in `ai-workspace/`

| File | Role |
|------|------|
| `ai-workspace/MCQ-crud-ops-ais2_prd.md` | Source of truth for this sprint. Update on every phase. |
| `ai-workspace/TEMPLATE_TECHNICAL_PRD.md` | Template only. Do not treat it as the live PRD. |
| `ai-workspace/register-login-logout_prd.md` | Prior sprint. Do not reopen identity scope here. |
| `ai-workspace/README.md` | Index of workspace docs and the review-before-implement rule. |

When a phase finishes, update **Implementation Phases** (RED/GREEN log), **Key Files**, **Acceptance Criteria**, **Troubleshooting Guide**, and **Current Status**. Do not let the PRD drift from the code.

### Key Files

Tests are listed before production files because TDD writes them first.

- `src/lib/mcq-schema.test.ts` / `src/lib/mcq-schema.ts` — Phase 1
- `migrations/0002_create_mcq_tables.sql` — Phase 1 (body must match exported SQL)
- `src/lib/services/mcq-service.test.ts` / `src/lib/services/mcq-service.ts` — Phase 2
- `src/app/api/mcq/route.test.ts` / `route.ts` — Phase 3 list + create
- `src/app/api/mcq/[qid]/route.test.ts` / `route.ts` — Phase 3 get + update + delete
- `src/app/api/mcq/[qid]/attempts/route.test.ts` / `route.ts` — Phase 3 attempt
- `src/components/mcq/mcq-stub.test.tsx` / `mcq-stub.tsx` — Phase 4 list (evolved stub)
- `src/components/mcq/mcq-form.test.tsx` / `mcq-form.tsx` — Phase 5
- `src/components/mcq/mcq-preview.test.tsx` / `mcq-preview.tsx` — Phase 6
- `src/app/mcq/page.tsx`, `src/app/mcq/new/page.tsx`, `src/app/mcq/[qid]/edit/page.tsx`, `src/app/mcq/[qid]/preview/page.tsx` — thin routes
- `src/lib/acceptance-traceability.test.ts` — extended in Phase 7
- `src/lib/db.ts` — existing D1 access; do not import from `'use client'` files
- `wrangler.jsonc` — existing `DB` binding; no new binding expected

### Implementation Patterns

```typescript
// Service create sketch — ids minted here, not by the client
const qid = crypto.randomUUID();
const choiceRows = input.choices.map((choice, index) => ({
  choiceid: crypto.randomUUID(),
  qid,
  choice_text: choice.choiceText,
  is_correct: choice.isCorrect ? 1 : 0,
  position: index + 1,
}));

await db.batch([
  db.prepare(
    `INSERT INTO questions (qid, name, question) VALUES (?1, ?2, ?3)`,
  ).bind(qid, input.name, input.question),
  ...choiceRows.map((row) =>
    db.prepare(
      `INSERT INTO choices (choiceid, qid, choice_text, is_correct, position)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(row.choiceid, row.qid, row.choice_text, row.is_correct, row.position),
  ),
]);
```

Route handlers parse JSON, run Zod, call the service, and return JSON. Client components call `fetch`; they never import `getDb`.

### Testing strategy (TDD with Vitest)

- Preferred framework: **Vitest**. UI: Testing Library + `userEvent` + jsdom.
- Order inside a phase: Test Plan file(s) → `npm test` RED → production code → `npm test` GREEN → stop.
- Colocate tests: `foo.ts` ↔ `foo.test.ts`.
- Mock `src/lib/db.ts` or the MCQ service. Never real D1 or network in unit tests.
- `beforeEach(() => { vi.clearAllMocks(); })`. UI phases also `sessionStorage.clear()`.
- `npm run preview` is the D1/Workers check in Phase 7; `npm run dev` can hide binding issues.

### Important Notes

- **Ask before adding a dependency.** Likely shadcn copies only (`dropdown-menu`, `textarea`, `radio-group`). No new npm package unless review agrees.
- **TDD:** production code for a phase comes after that phase’s RED `npm test` run is recorded in this PRD.
- **Do not deploy. Do not migrate remote D1** unless the user asks.
- **Do not edit** `cloudflare-env.d.ts`, `next-env.d.ts`, or `package-lock.json` by hand.
- D1 foreign keys may not run in mocked tests; the service still deletes children explicitly.
- `/mcq` is still not session-gated. Preview attempt requires `gq.userid` only on the client.
- List Description is the stem (`question`), not a separate column.
- Updating a question replaces choices; old `choiceid` values are not guaranteed. Attempts keep snapshots.
- Keep `McqStub` greeting/logout behavior so identity tests stay green.

### Configuration details

- D1 binding name: `DB`
- `sessionStorage` keys (unchanged): `gq.userid`, `gq.username`, `gq.firstName`, `gq.lastName`
- Choice count: min 2, max 6
- List order: `created_at DESC`

---

## Acceptance Criteria

Tick an item only when the mapped tests are GREEN (or the process check is recorded). IDs are used in phase Test Plans.

| ID | Criterion | Proved by (must be GREEN) |
|----|-----------|---------------------------|
| AC-01 | A teacher can save a new MCQ with name, stem, 2–6 choices, and exactly one correct choice. | 2.1–2.4, 3.3, 5.9–5.10 |
| AC-02 | `qid` is a unique TEXT primary key generated by the server. | 1.2, 2.1 |
| AC-03 | Choices persist against `qid` with text, correctness, and position 1–6. | 1.5–1.7, 2.2–2.3 |
| AC-04 | Attempts persist `userid`, selected choice snapshot, and correct/incorrect. | 1.9–1.11, 2.16 |
| AC-05 | Edit Save updates the question and replaces its choices. | 2.11, 3.8, 5.11–5.12 |
| AC-06 | Delete permanently removes the question, choices, and attempts (after confirm in the UI). | 2.13–2.14, 3.11, 4.10–4.13 |
| AC-07 | Preview attempt records the selected choice and shows correct vs incorrect. | 2.16, 3.13, 6.6–6.8 |
| AC-08 | Invalid create/update input is rejected client-side and again on the server (400). | 2.5–2.8, 3.4, 5.4–5.6 |
| AC-09 | Missing `qid` on get/update/delete/attempt returns 404. | 2.9, 3.7, 3.10, 3.12, 3.15 |
| AC-10 | `/mcq` lists Name, Description, and Actions; empty state is readable. | 4.4–4.6 |
| AC-11 | GET `/api/mcq` returns all questions without requiring a session cookie. | 2.10, 3.1, 3.16 |
| AC-12 | Create navigates to `/mcq/new`; Cancel returns to `/mcq` without saving. | 4.3, 5.3 |
| AC-13 | Row actions use a three-dot menu with Edit, Preview, and Delete. | 4.7–4.9 |
| AC-14 | `npm test` is fully GREEN; `npm run lint` and `npm run build` pass (recorded). | Phase 7 commands + 7.7–7.12 |
| AC-15 | Preview does not reveal the correct choice until after attempt submit. | 6.2 |
| AC-16 | No remote D1 migration and no deploy unless the user asks. | Phase 1/7 process log |

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

These are directional for a sprint without analytics instrumentation. Measure manually during review.

| Metric | Target | How Measured |
|--------|--------|--------------|
| Create happy path | One Save produces a list row with the chosen name | Manual create + list + local D1 `SELECT` |
| Edit happy path | Changed stem and choices appear on preview | Manual edit then preview |
| Delete happy path | Row gone from the table; no leftover choices | Manual delete + D1 `SELECT` on all three tables |
| Attempt feedback | Correct and incorrect paths both visible after submit | Manual preview against a known key |
| Automated confidence | Every phase Test Plan is GREEN; full `npm test` passes | Vitest output recorded in this PRD |
| TDD discipline | Each phase has a recorded RED run before GREEN | Phase log in Implementation Phases |
| Time to first saved question | Under 3 minutes after login on a clean local app | Stopwatch during review |

---

## Dependencies

### External Dependencies

- **Cloudflare D1** — Store `questions`, `choices`, `attempts`. Local migrations only.
- **Cloudflare Workers / OpenNext** — Hosting runtime. `getCloudflareContext()` for `env.DB`.

### Internal Dependencies

- **Existing identity sprint** — `/login` → `/mcq`, `sessionStorage` `gq.*` keys, `POST /api/users/logout`, `src/lib/db.ts`, Zod, Vitest.
- **shadcn/ui (already in repo)** — `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `table`, `badge`.
- **Lucide** — `EllipsisVertical` (or equivalent) for the row menu trigger.
- **Proposed shadcn adds (ask first, Phase 4–6):** `dropdown-menu`, `textarea`, `radio-group`.

### Environment and bindings

| Name | Where | Purpose |
|------|--------|---------|
| `DB` | `wrangler.jsonc` D1 binding | Questions, choices, attempts |
| `NEXTJS_ENV` | `.dev.vars` / `.dev.vars.example` | Already present |

No new secrets in this sprint.

### Proposed commands (run only during the matching approved phase)

```bash
npx wrangler d1 migrations create quizmaker-db create-mcq-tables
npx wrangler d1 migrations apply quizmaker-db --local
npm test
npm run lint
npm run build
npm run preview
```

---

## Risks and Mitigation

### Technical Risks

- **Risk:** Tests are written after the code, so they cannot fail and do not prove the acceptance criteria.
  **Mitigation:** Each phase lists named tests. Record a RED `npm test` before GREEN. A phase without a RED log is not complete.

- **Risk:** `npm run dev` hides D1/Workers failures.
  **Mitigation:** Unit-test with mocked D1; verify CRUD and attempt with `npm run preview` in Phase 7 locally.

- **Risk:** Replacing choices on edit breaks attempt foreign keys.
  **Mitigation:** Attempts store a snapshot (`choiceid`, `choice_text`, `is_correct`) without an FK to `choices`.

- **Risk:** SQLite foreign keys are not enforced in mocks or some D1 configurations.
  **Mitigation:** Service deletes attempts and choices explicitly before deleting the question.

- **Risk:** Adding shadcn components without the `@shadcn/` namespace silently no-ops.
  **Mitigation:** Use `npx shadcn@latest add @shadcn/dropdown-menu` (and the same pattern for others). Confirm files appear under `src/components/ui/`.

- **Risk:** Expanding `/mcq` breaks identity-sprint stub tests (no textbox/Save on the stub).
  **Mitigation:** Keep the editor off the list page. Treat those assertions as regression tests in Phase 4.

- **Risk:** No server session means anyone who can hit `/api/mcq` can mutate the shared bank.
  **Mitigation:** Same documented gap as login. Do not pretend middleware exists. A later auth sprint should gate these routes.

- **Risk:** Cursor Cloud cannot apply D1 migrations.
  **Mitigation:** Phase 1 apply `--local` must be done on a machine with Wrangler. Cloud agents stop and say so.

### User Experience Risks

- **Risk:** Teachers confuse list Description with a separate summary field and leave the stem empty.
  **Mitigation:** Label the form field **Question** (the stem). List column **Description** shows that same stem.

- **Risk:** Accidental delete of a question and its history.
  **Mitigation:** Confirmation dialog; Cancel in the dialog does not call DELETE.

- **Risk:** Preview that shows the correct answer immediately makes “attempt” pointless.
  **Mitigation:** AC-15 — do not display correctness until the attempt response returns.

- **Risk:** Signed-out teachers can still open `/mcq` and APIs (no session).
  **Mitigation:** Keep the signed-out hint. Disable attempt submit without `gq.userid`. Do not add fake lock copy.

- **Risk:** More than one radio marked correct if the control is checkboxes.
  **Mitigation:** Use a single radio group for the correct choice on the form.

---

## Troubleshooting Guide

Populate with real incidents during implementation. Anticipated issues:

### D1 binding missing in local Node dev

**Problem:** List/create throw because `env.DB` is undefined under `npm run dev`.
**Cause:** D1 is a Workers binding; the Node dev server does not provide it the same way.
**Solution:** Keep DB access in `src/lib/db.ts`. Prove behavior with mocked tests and `npm run preview`.
**Code Reference:** `src/lib/db.ts`

### Unique position error on update

**Problem:** Edit Save returns 500 when rewriting choices.
**Cause:** Inserting new positions before deleting old rows, or duplicate `position` for the same `qid`.
**Solution:** Delete existing choices for `qid` first, then insert 1..n. Use `db.batch`.
**Code Reference:** `src/lib/services/mcq-service.ts`

### Preview shows the answer before submit

**Problem:** A “Correct” badge appears next to a choice on first paint.
**Cause:** UI bound `isCorrect` from GET.
**Solution:** Ignore `isCorrect` in the pre-submit preview render. Use only the attempt response for feedback.
**Code Reference:** `src/components/mcq/mcq-preview.tsx`

### Identity stub tests fail after the list ships

**Problem:** `mcq-stub.test.tsx` fails looking for no textbox / no Save.
**Cause:** The list page embedded the editor.
**Solution:** Keep authoring on `/mcq/new` and `/mcq/[qid]/edit` only.
**Code Reference:** `src/components/mcq/mcq-stub.tsx`

### `getCloudflareContext` crashes Vitest

**Problem:** Tests fail importing OpenNext.
**Cause:** jsdom has no Workers context.
**Solution:** Mock `src/lib/db.ts` or `@opennextjs/cloudflare` as in the testing skill.
**Code Reference:** `.cursor/skills/testing/SKILL.md`

### Tests written after production code

**Problem:** A phase is “green” but never went red.
**Cause:** Implementation-first.
**Solution:** Restore TDD order; record both runs. Do not mark COMPLETED without a RED log.
**Code Reference:** phase Test Plan in this PRD

### Wrangler migration applied remotely

**Problem:** Schema changed in production by accident.
**Cause:** `migrations apply` without `--local` or with `--remote`.
**Solution:** Never run remote apply unless the user asks. If it happens, stop and tell the user.

---

## Notes for AI Agents

1. Read Overview, Hypothesis, and **TDD Process (mandatory)** first.
2. Obey Scope (In / Out / Cut). Do not add sessions, AI generation, or extra question types.
3. **Do not start a phase until the user names it and asks to implement it.** After this PRD is written, stop and wait for review. Do not begin Phase 1 unprompted.
4. **TDD is not optional.** For the named phase: write the Test Plan tests → run `npm test` (RED) → record the failure in this PRD → write production code → `npm test` (GREEN) → record it → stop.
5. Use **Vitest** only. Ask before adding shadcn components or any npm package.
6. Implement only the tests listed for that phase. Do not skip failure-path cases.
7. Centralize D1 in `src/lib/`. Prepared statements with `?1`, `?2`. Never concatenate user input into SQL.
8. Tick Acceptance Criteria only when mapped tests are green. Update Key Files, Troubleshooting, and Current Status.
9. Cite code as `filepath:line-number`.
10. Phase 7: record actual `npm test`, `lint`, and `build` output. Use `npm run preview` for D1/Workers. Never `npm run deploy`. Never remote D1 unless asked.
11. If D1 or Wrangler auth is required in Cursor Cloud, stop and say it must be run locally.
12. Keep `AGENTS.md` and `ai-workspace/README.md` aligned with this PRD when the current sprint description changes.
13. Do not reopen `register-login-logout_prd.md` implementation except to keep its tests green.

---

## Current Status

**Last Updated:** 2026-09-03
**Current Phase:** Phase 2 - MCQ service (questions, choices, attempts)
**Status:** COMPLETED (waiting for review)
**Next Steps:** Human review of Phase 2. Do not start Phase 3 until the user explicitly asks.

**TDD log:**
- Phase 1 RED: missing `@/lib/mcq-schema` (1 failed suite; 86 prior tests still passed).
- Phase 1 GREEN: 98/98 tests passed (`npm test`). `npm run lint` exited 0. Local `0002_create_mcq_tables.sql` applied. No `--remote`. No deploy.
- Phase 2 RED: missing `@/lib/services/mcq-service` (1 failed suite; 98 prior tests still passed).
- Phase 2 GREEN: 117/117 tests passed (`npm test`). `npm run lint` exited 0.

**Already true in the repo today:**

- Teacher register, login, logout.
- Empty `/mcq` stub with greeting, signed-out hint, and logout.
- D1 `users` table and user service.
- Vitest harness with a green identity-sprint suite.
- shadcn `table`, `button`, `dialog`, `field`, `input` available.
- D1 `questions`, `choices`, and `attempts` schema contract + local migration (Phase 1).
- MCQ service create, get, list, update, delete, and recordAttempt (Phase 2).

**Gaps this sprint will close (after approved phases):**

- No `/api/mcq` routes.
- `/mcq` has no list, create, edit, preview, or delete.
