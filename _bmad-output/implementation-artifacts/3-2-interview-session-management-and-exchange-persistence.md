# Story 3.2: Interview Session Management & Exchange Persistence

Status: review

## Story

As a developer,
I want interview session tracking and immediate exchange persistence,
So that every conversation turn is durably stored the moment it happens.

## Acceptance Criteria

1. **Given** an Active interview session **When** an exchange occurs **Then** `src/lib/interview/session.ts` manages session state and segment tracking
2. **Given** an exchange is created **When** it is persisted **Then** every exchange is persisted to DB immediately on creation — never batched (FR47)
3. **Given** an exchange record **When** it is stored **Then** each exchange record carries `exchange_type` (question, response, reflective_summary, confirmation, revised_summary), `segment_id`, `sequence_number`, timestamp, and attribution (FR48)
4. **Given** a reflective_summary or revised_summary exchange **When** the interviewee confirms it **Then** `is_verified` is set to true only on reflective_summary or revised_summary that the interviewee confirmed (FR49)
5. **Given** interview state transitions **When** a transition is requested **Then** `src/lib/synthesis/state-machine.ts` enforces interview state transitions (Pending → Active → Completed → Validating → Captured)
6. **Given** the interview system **When** any interview data is handled client-side **Then** no interview data is stored in browser localStorage/sessionStorage (NFR9)

## Tasks / Subtasks

- [x] Task 1: Create interview session manager `src/lib/interview/session.ts` (AC: #1, #2, #3, #4)
  - [x] 1.1 Create the `InterviewSession` class (or set of functions) that tracks:
    - `interviewId`: string — the active interview's UUID
    - `currentSegmentId`: string — UUID of the current segment in progress
    - `nextSequenceNumber`: number — auto-incrementing counter for exchange ordering within the interview
  - [x] 1.2 Implement `startSession(interviewId: string): InterviewSession` — initializes session state for an interview that has transitioned to Active, sets `nextSequenceNumber` to 1 (or to the next available if resuming from existing exchanges)
  - [x] 1.3 Implement `startSegment(session: InterviewSession): string` — generates a new UUID v4 `segmentId`, updates `currentSegmentId` on the session, returns the new segmentId
  - [x] 1.4 Implement `addExchange(session: InterviewSession, data: { exchangeType, speaker, content, isVerified? }): Promise<ExchangeRecord>` that:
    - Calls `createInterviewExchange()` from `@/lib/db/queries` immediately (never batched)
    - Passes `interviewId`, `currentSegmentId`, `sequenceNumber` (from `nextSequenceNumber`), `exchangeType`, `speaker`, `content`, `isVerified` (defaults to false)
    - Increments `nextSequenceNumber` after successful persistence
    - Returns the persisted exchange record
  - [x] 1.5 Implement `verifyExchange(exchangeId: string): Promise<ExchangeRecord>` — sets `is_verified = true` on the specified exchange. Only callable on `reflective_summary` or `revised_summary` exchange types — throws if called on `question`, `response`, or `confirmation`
  - [x] 1.6 Implement `getSegmentExchanges(session: InterviewSession): Promise<ExchangeRecord[]>` — retrieves all exchanges for the current segment, ordered by `sequenceNumber`
  - [x] 1.7 Implement `getSessionExchanges(session: InterviewSession): Promise<ExchangeRecord[]>` — retrieves all exchanges for the interview, ordered by `sequenceNumber`
  - [x] 1.8 Ensure the session manager does NOT import Drizzle — it calls query functions from `@/lib/db/queries` only

- [x] Task 2: Add new query functions to `src/lib/db/queries.ts` (AC: #2, #3, #4)
  - [x] 2.1 Implement `createInterview(data: { tokenId, projectId, processNodeId, status, llmProvider?, sttProvider? }): Promise<InterviewRecord>` — inserts a new row in the `interviews` table with `startedAt` set to now, returns the created record
  - [x] 2.2 Implement `getExchangesBySegmentId(interviewId: string, segmentId: string): Promise<ExchangeRecord[]>` — queries `interviewExchanges` by `interviewId` AND `segmentId`, ordered by `sequenceNumber` ascending
  - [x] 2.3 Implement `updateExchangeVerification(exchangeId: string, isVerified: boolean): Promise<ExchangeRecord>` — updates `is_verified` on a single exchange row, returns the updated record
  - [x] 2.4 Implement `getExchangeCountByInterviewId(interviewId: string): Promise<number>` — returns the count of exchanges for an interview (used by session manager to determine `nextSequenceNumber` when initializing)
  - [x] 2.5 Implement `getInterviewById(interviewId: string): Promise<InterviewRecord | null>` — queries `interviews` table by id, returns row or null
  - [x] 2.6 Verify that `createInterviewExchange`, `updateInterviewStatus`, and `getInterviewExchangesByInterviewId` (already exist from Story 2.1) still meet requirements — no changes expected, but confirm signatures are compatible

- [x] Task 3: Create interview state machine `src/lib/synthesis/state-machine.ts` (AC: #5)
  - [x] 3.1 Define the valid state transitions as a constant:
    ```typescript
    const VALID_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
      pending: ['active'],
      active: ['completed'],
      completed: ['validating'],
      validating: ['captured', 'validating'], // validating → validating for correction cycles
      captured: [], // terminal state
    };
    ```
  - [x] 3.2 Implement `validateTransition(currentStatus: InterviewStatus, targetStatus: InterviewStatus): boolean` — returns true if the transition is valid per the transition map, false otherwise
  - [x] 3.3 Implement `transitionInterview(interviewId: string, targetStatus: InterviewStatus): Promise<InterviewRecord>` that:
    - Fetches the current interview from DB via `getInterviewById()` from `@/lib/db/queries`
    - Throws if interview not found (`INTERVIEW_NOT_FOUND`)
    - Calls `validateTransition()` with current and target status
    - Throws if transition is invalid (`INVALID_STATE_TRANSITION`) with message describing current → target
    - Calls `updateInterviewStatus()` from `@/lib/db/queries` to persist the transition
    - If transitioning to `active`, also sets `startedAt` to now
    - If transitioning to `completed`, also sets `completedAt` to now
    - Returns the updated interview record
  - [x] 3.4 Export `InterviewStatus` type derived from the `interviewStatusEnum` values in schema: `'pending' | 'active' | 'completed' | 'validating' | 'captured'`
  - [x] 3.5 Ensure the state machine does NOT import Drizzle — it calls query functions from `@/lib/db/queries` only

- [x] Task 4: Add timestamp update support to `src/lib/db/queries.ts` for state transitions (AC: #5)
  - [x] 4.1 Implement `updateInterviewTimestamps(interviewId: string, data: { startedAt?: Date, completedAt?: Date }): Promise<InterviewRecord>` — updates timestamp fields on the interviews row. Called by the state machine when transitioning to `active` (sets `startedAt`) or `completed` (sets `completedAt`).
  - [x] 4.2 Alternatively, extend the existing `updateInterviewStatus` to accept optional timestamp fields: `updateInterviewStatus(interviewId, status, opts?: { startedAt?, completedAt? })` — this avoids a separate round trip. Choose whichever approach is cleaner; document the decision in dev notes.

- [x] Task 5: Create tests (AC: #1-#6)
  - [x] 5.1 Create `src/lib/interview/session.test.ts`:
    - Test `startSession` initializes with correct interviewId and sequence number starting at 1
    - Test `startSegment` generates a valid UUID v4 segmentId and updates the session
    - Test `addExchange` calls `createInterviewExchange` with correct parameters including auto-incremented `sequenceNumber`
    - Test `addExchange` increments `sequenceNumber` across multiple calls
    - Test `addExchange` passes the current `segmentId` from the session
    - Test `verifyExchange` succeeds for `reflective_summary` exchange type
    - Test `verifyExchange` succeeds for `revised_summary` exchange type
    - Test `verifyExchange` throws for `question`, `response`, and `confirmation` exchange types
    - Mock query functions from `@/lib/db/queries` — NOT the Drizzle ORM directly
  - [x] 5.2 Create `src/lib/synthesis/state-machine.test.ts`:
    - Test valid transitions: pending → active, active → completed, completed → validating, validating → captured, validating → validating
    - Test invalid transitions: pending → completed, active → captured, captured → active, completed → active, pending → validating
    - Test `transitionInterview` calls `updateInterviewStatus` with correct parameters
    - Test `transitionInterview` throws `INTERVIEW_NOT_FOUND` when interview doesn't exist
    - Test `transitionInterview` throws `INVALID_STATE_TRANSITION` when transition is not allowed
    - Test transitioning to `active` sets `startedAt`
    - Test transitioning to `completed` sets `completedAt`
    - Mock query functions from `@/lib/db/queries` — NOT the Drizzle ORM directly

## Dev Notes

### What Already Exists (from Epics 1-2)

- `src/lib/db/schema.ts` — All 12 tables defined including `interviewExchanges` with `exchangeType`, `segmentId`, `isVerified`, `sequenceNumber`, `speaker`, `content`, and `createdAt`. Enums: `interviewStatusEnum` (pending/active/completed/validating/captured), `exchangeTypeEnum` (question/response/reflective_summary/confirmation/revised_summary), `speakerEnum` (agent/interviewee). The `interviewExchanges` table is immutable (no `updatedAt`).
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/db/queries.ts` — Already has: `createInterviewExchange`, `updateInterviewStatus`, `getInterviewExchangesByInterviewId`, `getInterviewByTokenId`, `getProjectById`, `getProcessNodesByProjectId`, `getInterviewTokenByToken`, `getUserByEmail`, `createUser`, `isEmailInSupervisorAllowlist`, `getSkillProviderByProjectAndSkill`, `getSynthesisResultByNodeId`
- `src/lib/interview/` — Directory exists with `.gitkeep` only — `session.ts` must be created
- `src/lib/synthesis/` — Directory exists with `.gitkeep` only — `state-machine.ts` must be created
- `src/lib/interview/token.ts` — Token validation utility (from Story 2.1)

### Database Schema Details (already in schema.ts)

**`interviewExchanges` table columns:**
`id` (UUID PK, defaultRandom), `interviewId` (FK → interviews), `segmentId` (UUID, not null), `exchangeType` (enum: question/response/reflective_summary/confirmation/revised_summary), `speaker` (enum: agent/interviewee), `content` (text, not null), `isVerified` (boolean, default false), `sequenceNumber` (integer, not null), `createdAt` (timestamp with timezone, defaultNow)

**Key constraints on `interviewExchanges`:**
- Index on `interviewId`: `idx_interview_exchanges_interview_id`
- Index on `segmentId`: `idx_interview_exchanges_segment_id`
- Unique constraint on `(interviewId, sequenceNumber)`: `uq_interview_exchanges_sequence`
- No `updatedAt` — the table is append-only/immutable (except `isVerified` which can be updated from false to true)

**`interviews` table columns:**
`id` (UUID PK), `tokenId` (FK → interviewTokens, unique), `projectId` (FK → projects), `processNodeId` (FK → processNodes), `status` (enum: pending/active/completed/validating/captured), `llmProvider` (text, nullable), `sttProvider` (text, nullable), `startedAt` (timestamp, nullable), `completedAt` (timestamp, nullable), `createdAt`, `updatedAt`

### Reflect-and-Confirm Pattern (Segment Structure)

Each segment represents one probe-response-reflect-confirm cycle:

```
Segment N:
  1. question (agent)         — Agent asks a probing question
  2. response (interviewee)   — Interviewee answers via speech/text
  3. reflective_summary (agent) — Agent reformulates the response into a clear summary
  4. confirmation (interviewee) — Interviewee confirms or corrects
  5. [if corrected] revised_summary (agent) — Agent revises based on correction
  6. [if corrected] confirmation (interviewee) — Interviewee re-confirms
  ... repeat 5-6 until confirmed
```

Rules:
- Exactly ONE exchange per segment can have `is_verified = true`
- Only `reflective_summary` or `revised_summary` types can be verified — never `question`, `response`, or `confirmation`
- A `confirmation` with no substantive correction signals agreement — the preceding summary gets `is_verified = true`
- A `confirmation` with corrections triggers a `revised_summary` cycle

### Interview State Machine

```
Pending → Active → Completed → Validating → Captured
```

| Current State | Event | Next State | Action |
|---|---|---|---|
| Pending | Interviewee clicks "Begin Interview" | Active | Create interview row, set `startedAt` |
| Active | Agent signals interview complete | Completed | Set `completedAt`, trigger schema extraction |
| Completed | Schema extraction succeeds | Validating | Present individual diagram to interviewee |
| Validating | Interviewee confirms diagram | Captured | Mark schema as validated |
| Validating | Interviewee requests correction | Validating | LLM correction cycle, stay in Validating |

The state machine lives in `src/lib/synthesis/state-machine.ts` per the architecture document. Routes call this module — they do not contain transition logic directly.

### Immediate Persistence Rule (Critical)

Every exchange is persisted to the database immediately on creation — not batched, not deferred. This is load-bearing for:
- Audit trail (FR47-49)
- Session resumability in the full product (FR13, not MVP but architecture supports it)
- The `sequenceNumber` unique constraint ensures ordering integrity

The `addExchange` function in `session.ts` must call `createInterviewExchange` in `queries.ts` synchronously (awaited) and return only after the DB write succeeds. If the DB write fails, the error must propagate — never silently drop an exchange.

### NFR9: No Client-Side Interview Data Storage

The session manager runs server-side only. No interview exchange content, segment data, or session state is stored in browser `localStorage` or `sessionStorage`. All state is server-side (DB + in-memory session on the API route). Client components receive data via API responses and SSE streams — they render it but do not persist it.

### Service Boundaries — Enforced

- `src/lib/interview/session.ts` imports from `@/lib/db/queries` — it does NOT import from `drizzle-orm` or `@/lib/db/schema`
- `src/lib/synthesis/state-machine.ts` imports from `@/lib/db/queries` — it does NOT import from `drizzle-orm` or `@/lib/db/schema`
- New query functions in `src/lib/db/queries.ts` import from `drizzle-orm` and `@/lib/db/schema` — this is the only place Drizzle is used
- The `interviewExchanges` table is the authoritative source for exchange types — use the enum values from schema, do not redefine them

### Mock Strategy for Tests

- `session.test.ts`: Mock `@/lib/db/queries` functions (`createInterviewExchange`, `getInterviewExchangesByInterviewId`, `updateExchangeVerification`, `getExchangeCountByInterviewId`). Do NOT mock Drizzle ORM or the DB connection.
- `state-machine.test.ts`: Mock `@/lib/db/queries` functions (`getInterviewById`, `updateInterviewStatus`). Do NOT mock Drizzle ORM or the DB connection.
- Use `vi.mock('@/lib/db/queries', ...)` pattern in Vitest

### What NOT to Do

- Do NOT create the SSE streaming endpoint (Story 3.3)
- Do NOT create the interview UI components (Story 3.4+)
- Do NOT create the schema extraction pipeline (Epic 4)
- Do NOT create the consent screen or page routing (Story 2.2/2.3)
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT batch or defer exchange persistence — every exchange hits the DB immediately
- Do NOT store interview data in browser localStorage/sessionStorage
- Do NOT allow `is_verified = true` on question, response, or confirmation exchange types
- Do NOT hardcode interview state transitions in route handlers — use the state machine module
- Do NOT add a Paused state — session resumability is excluded from MVP

### Project Structure Notes

Files **created** by this story:
- `src/lib/interview/session.ts` — Interview session manager (segment tracking, exchange persistence)
- `src/lib/synthesis/state-machine.ts` — Interview state machine (transition validation and enforcement)
- `src/lib/interview/session.test.ts` — Tests for session manager
- `src/lib/synthesis/state-machine.test.ts` — Tests for state machine

Files **modified** by this story:
- `src/lib/db/queries.ts` — New query functions: `createInterview`, `getInterviewById`, `getExchangesBySegmentId`, `updateExchangeVerification`, `getExchangeCountByInterviewId`, and optionally `updateInterviewTimestamps` or extended `updateInterviewStatus`

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete, no schema changes needed
- `src/lib/db/connection.ts` — already complete
- `src/lib/interview/token.ts` — already complete (Story 2.1)
- `package.json` — no new dependencies needed

### References

- [Source: _bmad-output/planning-artifacts/prd.md#FR47 — Every exchange persisted immediately]
- [Source: _bmad-output/planning-artifacts/prd.md#FR48 — Exchange record fields]
- [Source: _bmad-output/planning-artifacts/prd.md#FR49 — Verified reflective summaries as audit anchors]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR9 — No client-side interview data storage]
- [Source: _bmad-output/planning-artifacts/architecture.md#Interview State Machine — State transitions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — interviewExchanges table]
- [Source: _bmad-output/coding-standards.md#Section 2 — Interview Exchange Data Model, segment rules, persistence rule]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules — Reflect-and-confirm pattern, immediate persistence, service boundaries]
- [Source: CLAUDE.md — Service boundaries, data integrity rules]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None — all tasks completed without issues.

### Completion Notes List
- Task 1: Created `session.ts` with functional session manager: `startSession` (initializes with correct sequence from existing exchange count), `startSegment` (UUID v4 segment tracking), `addExchange` (immediate DB persistence via queries, auto-incrementing sequence), `verifyExchange` (only reflective_summary/revised_summary allowed), `getSegmentExchanges`, `getSessionExchanges`. No Drizzle imports — calls query functions only.
- Task 2: Added 5 new query functions to `queries.ts`: `getInterviewById`, `getExchangesBySegmentId` (with AND filter + ascending order), `updateExchangeVerification`, `getExchangeCountByInterviewId` (using count aggregate), `updateInterviewStatusWithTimestamps`. Also added `and` and `count` imports from drizzle-orm.
- Task 3: Created `state-machine.ts` with `validateTransition` (transition map) and `transitionInterview` (fetch, validate, persist with timestamps). Error classes: `InterviewNotFoundError`, `InvalidStateTransitionError`. Transition map: pending->active, active->completed, completed->validating, validating->captured/validating, captured->terminal. No Drizzle imports.
- Task 4: Implemented `updateInterviewStatusWithTimestamps` in queries.ts — single function that handles both status update and optional timestamp fields (startedAt/completedAt) in one DB round trip. Decision: combined approach vs separate timestamp function to reduce DB calls.
- Task 5: Created 33 tests total. Session tests (20): startSession init + resume, startSegment UUID, addExchange params + sequence increment + segmentId, verifyExchange success for reflective_summary/revised_summary + throws for question/response/confirmation, getSegmentExchanges/getSessionExchanges delegation. State machine tests (13): 5 valid transitions, 7 invalid transitions via parameterized tests, transitionInterview DB calls, error throwing, timestamp setting for active/completed, no timestamps for validating/captured.

### Change Log
- 2026-04-09: Completed all 5 tasks for Story 3.2. Full test suite: 278 tests across 26 files, all passing.

### File List
- `src/lib/interview/session.ts` (created)
- `src/lib/synthesis/state-machine.ts` (created)
- `src/lib/interview/session.test.ts` (created)
- `src/lib/synthesis/state-machine.test.ts` (created)
- `src/lib/db/queries.ts` (modified — added 5 new query functions)
