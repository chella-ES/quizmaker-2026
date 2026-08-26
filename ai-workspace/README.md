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

The first implementation phase is the Vitest harness and failing password tests, not the UI.

## Documents

| File | Purpose |
|------|---------|
| [register-login-logout_prd.md](./register-login-logout_prd.md) | **Live PRD** for this sprint: teacher register, login, logout, empty MCQ stub. |
| [TEMPLATE_TECHNICAL_PRD.md](./TEMPLATE_TECHNICAL_PRD.md) | Blank PRD template. Do not fill this in; copy the structure into a new feature file. |

## Current sprint

**Register / login / logout** — see the live PRD. Phases 1–2 are **COMPLETED** (awaiting review of Phase 2). Phases 3–7 are **PLANNED**. Do not start the next phase until the user confirms.
