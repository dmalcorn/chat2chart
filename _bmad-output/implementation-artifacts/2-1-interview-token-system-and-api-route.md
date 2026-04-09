# Story 2.1: Interview Token System & API Route

Status: done

## Story

As an interviewee,
I want to click a token-based link and have the system resolve my identity and interview context,
So that I can access my interview without creating an account.

## Acceptance Criteria

1. **Given** a URL `{base_url}/interview/{token}` **When** the token is valid **Then** `GET /api/interview/[token]` returns the project, process node, interview skill, and interviewee slot (FR71)
2. **Given** the token system, **When** validating a token, **Then** `src/lib/interview/token.ts` validates tokens as UUID v4 format (NFR10b)
3. **Given** a valid token, **When** the API responds, **Then** the response includes the current interview state: `pending`, `active`, `completed`, `validating`, or `captured` (FR74)
4. **Given** the interview system, **When** any token is used, **Then** no login or account creation is required — the token IS the credential (FR70)
5. **Given** an invalid or nonexistent token **When** the API is called **Then** it returns `{ error: { message: "This link isn't valid. Contact the person who sent it to you.", code: "INVALID_TOKEN" } }` with HTTP 404 (FR76)

## Tasks / Subtasks

- [x] Task 1: Create token validation utility `src/lib/interview/token.ts` (AC: #2)
  - [x] 1.1 Create a `validateTokenFormat(token: string): boolean` function that checks UUID v4 format using a regex pattern (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`)
  - [x] 1.2 Export the validation function for use by the API route and tests

- [x] Task 2: Create database query functions in `src/lib/db/queries.ts` (AC: #1, #3)
  - [x] 2.1 Create the `queries.ts` file — this file does NOT exist yet
  - [x] 2.2 Import `db` from `@/lib/db/connection` and schema tables from `@/lib/db/schema`
  - [x] 2.3 Implement `getInterviewTokenByToken(token: string)` — queries `interviewTokens` table by `token` column, returns token row with project, process node, interviewee name/role, or null
  - [x] 2.4 Implement `getInterviewByTokenId(tokenId: string)` — queries `interviews` table by `tokenId`, returns interview row with status, or null
  - [x] 2.5 Implement `getProjectById(projectId: string)` — queries `projects` table by id, returns project row or null
  - [x] 2.6 Implement `getProcessNodeById(nodeId: string)` — queries `processNodes` table by id, returns node row or null
  - [x] 2.7 All query functions return typed results inferred from the Drizzle schema — do NOT define separate TypeScript types

- [x] Task 3: Create `GET /api/interview/[token]` route handler (AC: #1, #3, #4, #5)
  - [x] 3.1 Create `src/app/api/interview/[token]/route.ts`
  - [x] 3.2 Extract `token` from route params: `{ params }: { params: Promise<{ token: string }> }` (Next.js 16 async params)
  - [x] 3.3 Validate token format using `validateTokenFormat()` from `@/lib/interview/token` — if invalid, return 404 error immediately
  - [x] 3.4 Look up token in DB via `getInterviewTokenByToken(token)` — if not found, return 404 with exact error message: `"This link isn't valid. Contact the person who sent it to you."` and code `"INVALID_TOKEN"`
  - [x] 3.5 Look up interview via `getInterviewByTokenId(tokenRow.id)` — if no interview row exists, the status is implicitly `pending` (token exists but interview not yet created)
  - [x] 3.6 Look up project via `getProjectById(tokenRow.projectId)` and process node via `getProcessNodeById(tokenRow.processNodeId)`
  - [x] 3.7 Return success response wrapped per API standard:
    ```typescript
    {
      data: {
        token: tokenValue,
        intervieweeName: tokenRow.intervieweeName,
        intervieweeRole: tokenRow.intervieweeRole,
        interviewState: interview?.status ?? 'pending',
        project: {
          id: project.id,
          name: project.name,
          skillName: project.skillName,
        },
        processNode: {
          id: processNode.id,
          name: processNode.name,
        },
      }
    }
    ```
  - [x] 3.8 Wrap in try/catch — on unexpected errors, return `{ error: { message: "An unexpected error occurred", code: "INTERNAL_ERROR" } }` with HTTP 500

- [x] Task 4: Create tests (AC: #1-#5)
  - [x] 4.1 Create `src/lib/interview/token.test.ts`:
    - Test valid UUID v4 tokens return true
    - Test invalid formats return false (not a UUID, UUID v1, empty string, SQL injection attempts)
  - [x] 4.2 Create `src/app/api/interview/[token]/route.test.ts`:
    - Test valid token returns 200 with project, process node, interviewee info, and interview state
    - Test valid token with no interview row returns `interviewState: 'pending'`
    - Test valid token with active interview returns `interviewState: 'active'`
    - Test invalid UUID format returns 404 with `INVALID_TOKEN` error
    - Test nonexistent token returns 404 with exact error message
    - Test unexpected DB error returns 500 with `INTERNAL_ERROR`
    - Mock query functions from `@/lib/db/queries` — NOT the Drizzle ORM directly

## Dev Notes

### What Already Exists (from Epic 1)

- `src/lib/db/schema.ts` — All 12 tables defined including `interviewTokens` and `interviews` with correct columns, enums, indexes, and foreign keys
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/interview/` — Directory exists with `.gitkeep` only
- `src/app/api/interview/[token]/` — Directory exists with `messages/` and `schema/correct/` subdirs (`.gitkeep` files only)
- `src/app/interview/[token]/page.tsx` — Placeholder page exists (will be replaced in Story 2.2)
- `src/lib/db/queries.ts` — DOES NOT EXIST — must be created by this story
- `src/lib/env.ts` — Empty stub (`export {}`) — env validation not yet implemented (was Story 1.3 scope, may be incomplete)

### Database Schema Details (already in schema.ts)

**`interviewTokens` table columns:**
`id` (UUID PK), `projectId` (FK → projects), `processNodeId` (FK → processNodes), `token` (text, unique, indexed), `intervieweeName` (text), `intervieweeRole` (text, nullable), `createdAt`, `updatedAt`

**`interviews` table columns:**
`id` (UUID PK), `tokenId` (FK → interviewTokens, unique), `projectId` (FK → projects), `processNodeId` (FK → processNodes), `status` (enum: pending/active/completed/validating/captured), `llmProvider` (text, nullable), `sttProvider` (text, nullable), `startedAt`, `completedAt`, `createdAt`, `updatedAt`

### Interview State Logic

A token can exist in `interview_tokens` without a corresponding row in `interviews`. This means the interviewee hasn't started yet — treat this as `pending` state. Once "Begin Interview" is clicked (Story 2.3), an `interviews` row is created with status `active`. The API route must handle both cases:
- Token found, no interview row → `interviewState: 'pending'`
- Token found, interview row exists → `interviewState: interview.status`

### API Response Format (enforced)

```typescript
// Success
{ data: { token, intervieweeName, intervieweeRole, interviewState, project, processNode } }

// Error
{ error: { message: string, code: string } }
```

All responses must use `NextResponse.json()`. Dates as ISO 8601 strings. No unwrapped data.

### Service Boundaries — Enforced

- Drizzle imported ONLY in `src/lib/db/queries.ts` and `src/lib/db/connection.ts` — the route handler calls query functions, never raw SQL
- The route handler imports from `@/lib/db/queries` and `@/lib/interview/token` — it does NOT import from `drizzle-orm` or `@/lib/db/schema`

### Next.js 16 Route Handler Pattern

```typescript
// src/app/api/interview/[token]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params; // Next.js 16: params is a Promise
  // ...
}
```

### Mock Strategy for Tests

- Route handler tests: mock `@/lib/db/queries` functions (getInterviewTokenByToken, getInterviewByTokenId, etc.)
- Token validation tests: pure function, no mocks needed
- Do NOT mock Drizzle ORM, SDK imports, or the DB connection directly

### What NOT to Do

- Do NOT create the consent screen UI (Story 2.3)
- Do NOT create state-based page routing logic (Story 2.2)
- Do NOT create SSE streaming endpoints (Epic 3)
- Do NOT create interview exchange persistence (Epic 3)
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT add authentication middleware to interview routes — the token IS the auth
- Do NOT add token expiration logic — not in demo scope
- Do NOT create Zod request/response schemas for this route — it's a GET with a path param, validation is the UUID format check

### Project Structure Notes

Files **created** by this story:
- `src/lib/interview/token.ts` — UUID v4 validation utility
- `src/lib/db/queries.ts` — Reusable database query functions (foundation for all future stories)
- `src/app/api/interview/[token]/route.ts` — GET route handler

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete
- `src/lib/db/connection.ts` — already complete
- `package.json` — no new dependencies needed (Zod already installed for later use)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1 — Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — GET /api/interview/[token] route]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Interview Token Identity]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — interviewTokens and interviews tables]
- [Source: _bmad-output/coding-standards.md#Section 8 — API Route Patterns, response wrapping]
- [Source: _bmad-output/planning-artifacts/prd.md#FR70-FR76 — Interview access requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR10b — UUID v4 token requirement]
- [Source: _bmad-output/project-context.md#Service Boundaries — Drizzle only in src/lib/db/]

### Review Findings

- [x] [Review][Decision] Redundant DB queries — resolved: removed eager-load from `getInterviewTokenByToken`, kept spec-prescribed separate lookups via `getProjectById`/`getProcessNodeById`
- [x] [Review][Patch] Non-null assertions `project!`/`processNode!` — replaced with null guard returning 500 INTERNAL_ERROR + added 2 tests for null project/processNode
- [x] [Review][Patch] No error logging in catch block — added `console.error` before returning 500
- [x] [Review][Patch] Missing test for `intervieweeRole: null` — added test confirming null is returned in response
- [x] [Review][Patch] Missing tests for `completed`/`validating`/`captured` states — added 3 tests covering all remaining interview states

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — clean implementation, no blockers.

### Completion Notes List

- Task 1: Created `src/lib/interview/token.ts` with `validateTokenFormat()` using UUID v4 regex. 9 unit tests (valid, invalid, v1, empty, SQL injection, no-hyphens, wrong variant bits).
- Task 2: `src/lib/db/queries.ts` already existed from Epic 1 with `getInterviewTokenByToken`, `getInterviewByTokenId`, `getProjectById`. Added missing `getProcessNodeById` function.
- Task 3: Created `src/app/api/interview/[token]/route.ts` — GET handler with format validation, DB lookups (parallelized via Promise.all), pending state for missing interview rows, standard error responses.
- Task 4: Created `src/app/api/interview/[token]/route.test.ts` — 6 tests covering all ACs. Mocks query functions per story spec, never Drizzle directly. Used `// @vitest-environment node` for route handler context.
- Full suite: 168 tests, 15 files, all passing. Zero regressions. TypeScript clean (no errors in story files; pre-existing bootstrap.ts errors unrelated).

### Change Log

- 2026-04-09: Story 2.1 implemented — token validation, getProcessNodeById query, GET route handler, tests

### File List

- `src/lib/interview/token.ts` (new) — UUID v4 validation utility
- `src/lib/interview/token.test.ts` (new) — 9 unit tests for token validation
- `src/lib/db/queries.ts` (modified) — Added `getProcessNodeById` function
- `src/app/api/interview/[token]/route.ts` (new) — GET route handler
- `src/app/api/interview/[token]/route.test.ts` (new) — 6 integration tests for route handler
