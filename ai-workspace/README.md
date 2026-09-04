# ai-workspace

Planning documents for **The Greenfield Quizmaker**. This folder is the source of truth for what to build. Application code lives under `src/`; do not treat this folder as implemented software.

## How work proceeds

1. Write or update a technical PRD (from `TEMPLATE_TECHNICAL_PRD.md`).
2. **Review the PRD** (or a single phase) before any code.
3. Implement **one small phase** only when explicitly asked, as **test-driven development**:
   - Write that phase’s Vitest Test Plan first (`npm test` must go **RED**).
   - Then write production code until those tests go **GREEN**.
   - Record both runs in the PRD. Do not implement before RED.
4. Update PRD status and stop for the next review.

Preferred framework: **Vitest** (Testing Library + jsdom for UI), as in `.cursor/skills/testing/SKILL.md`.

## Documents

| File | Purpose |
|------|---------|
| [MCQ-crud-ops-ais2_prd.md](./MCQ-crud-ops-ais2_prd.md) | **Live PRD** for this sprint: MCQ list, create, edit, preview, delete, and attempt. |
| [register-login-logout_prd.md](./register-login-logout_prd.md) | Prior sprint: teacher register, login, logout, empty MCQ stub. Complete; keep its tests green. |
| [TEMPLATE_TECHNICAL_PRD.md](./TEMPLATE_TECHNICAL_PRD.md) | Blank PRD template. Do not fill this in; copy the structure into a new feature file. |

## Current sprint

**MCQ create / update / delete / attempt** — live PRD: [MCQ-crud-ops-ais2_prd.md](./MCQ-crud-ops-ais2_prd.md). Phases 1–7 are **COMPLETED**. On 2026-09-04 (user request) `0002_create_mcq_tables.sql` was applied on the existing remote `quizmaker-db` and the app was deployed to https://quizmaker-2026-bat6.chellaganesh.workers.dev. Do not deploy or apply remote D1 migrations again unless asked.
