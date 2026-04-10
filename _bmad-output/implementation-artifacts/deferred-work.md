# Deferred Work

## Deferred from: code review of 1-1-initialize-nextjs-project (2026-04-08)

- Dark mode CSS defined but unreachable — `.dark` class never applied to `<html>`, no ThemeProvider or `prefers-color-scheme` detection. Not in MVP scope.
- No `not-found.tsx` — 404s fall through to unstyled Next.js default page. Not in Story 1.1 scope.
- `error.tsx` has no error reporting — error boundary silently discards errors with no logging hook. Future observability concern.
- Vitest path aliases manually mirrored from tsconfig — works now but will diverge when new paths are added. Consider `vite-tsconfig-paths` plugin in a future story.

## Architectural Decision: Drizzle `casing: 'snake_case'` (2026-04-08)

**Context:** The approved tech stack and project-context.md reference "Drizzle camelCase mode" and `camelCase: true` as the configuration for automatic TypeScript camelCase → PostgreSQL snake_case column mapping.

**Finding:** Drizzle ORM 0.45.2 does not accept `camelCase: true`. The correct API is `casing: 'snake_case'`, which tells Drizzle to generate snake_case column names in PostgreSQL from camelCase TypeScript property names. Setting `casing: 'camelCase'` produces camelCase columns in the database — the opposite of what we want.

**Decision:** `casing: 'snake_case'` is the correct configuration. Applied in both `drizzle.config.ts` and `src/lib/db/connection.ts`. The spec language ("camelCase mode") describes the *behavior* (write camelCase in TS, get snake_case in PG), not the literal config key.

**Action required:** Any future documentation or story specs referencing `camelCase: true` should use `casing: 'snake_case'` instead. No code change needed — implementation is correct as shipped.

**Approved by:** Winston (Architect), 2026-04-08

## Deferred from: code review of 1-2-database-schema-and-connection (2026-04-08)

- `queries.test.ts` runs destructive deletes (`db.delete(table)`) with no test DB guard — if `DATABASE_URL` points to a non-test database, all data is wiped. Low risk while sole developer on local Docker; revisit when CI is set up.
- Module-level side effect in `connection.ts` — `postgres()` client created at import time; crashes if `DATABASE_URL` unset. Story 1.3 env validation will gate this.
- No connection pool lifecycle management — no `.end()` exported, no pool config. Acceptable for MVP dev; revisit for production deployment.
- `interviewExchanges` missing DB constraint for one-verified-per-segment rule — Architecture requires exactly one `is_verified = true` per segment. Will be enforced at service level in a future story.

## Deferred from: code review of 1-3-environment-validation-and-auth-infrastructure (2026-04-08)

- No rate limiting on login endpoint — brute-force protection needed before production
- No JWT server-side revocation — tokens remain valid for 24h even if user is deactivated
- `FIRST_SUPERVISOR_PASSWORD` remains in process.env after bootstrap — Node.js limitation, plaintext persists in memory
- Bootstrap race condition on concurrent startup — check-then-insert without conflict handling; MVP runs single instance
- `parseCookies` doesn't URL-decode cookie values — JWTs use base64url so no impact currently
- `DATABASE_URL` rejects `postgres://` scheme alias — Railway uses `postgresql://`, but some providers emit `postgres://`
- SESSION_SECRET used directly as HMAC key without HKDF derivation — acceptable for MVP demo

## Deferred from: code review of 1-4-llm-provider-registry-and-claude-provider (2026-04-08)

- Consecutive same-role messages not validated in `buildMessages()` — Anthropic API rejects these, but validation is caller responsibility (Epic 3 interview agent controls conversation history)
- Partial stream tokens irrecoverable on mid-stream error — inherent to AsyncIterable design, would require different streaming abstraction. Not actionable for MVP

## Deferred from: code review of Epic 1 (2026-04-09)

- `ANTHROPIC_API_KEY` defaults to empty string in env schema — no startup warning when API key is unset; failure surfaces only at first LLM call. Consider adding a startup check or log warning when key is empty outside test mode.
- Bootstrap race condition on concurrent cold start — `bootstrapAccounts()` uses check-then-insert without `ON CONFLICT DO NOTHING`; second worker process would crash on unique constraint. MVP is single instance.
- `streamResponse` retry restarts entire stream from scratch — if a mid-stream retry succeeds, duplicate content is yielded to the consumer. No deduplication mechanism exists in AsyncIterable design.
- `nodeType` and `role` are free-form `text()` columns with no DB-level enum constraint — unlike `interviewStatus`/`exchangeType`/`speaker` which use `pgEnum`. Invalid values can be inserted via direct DB access.
- `drizzle-kit` installed at `0.31.10` vs spec's `0.45.x` — `0.45.x` does not exist; `approved-tech-stack.md` not formally amended to reflect actual version.
- `interviewExchanges` and `synthesisCheckpoints` tables missing `updatedAt` — by design (immutable/write-once), but AC5 says "every table" without exceptions.

## Deferred from: code review of story 2-3 (2026-04-09)

- Race condition on concurrent POST `/api/interview/[token]/start` — DB unique constraint on `interviews.tokenId` prevents duplicate rows, but the route's catch block returns a generic 500 `INTERNAL_ERROR` instead of a user-friendly 409. Fix: catch pg error code `23505` and return 409 `INTERVIEW_ALREADY_STARTED`. MVP single-user-per-token makes this extremely unlikely.
- Pending interview row edge case — if a pending interview row exists for a token, the route falls through the guard and attempts a duplicate insert (blocked by unique constraint → 500). Normal flow never creates pending rows (tokens start with no interview row; this route always creates with status `active`). Theoretical scenario only.

## Deferred from: code review of story 2-2 (2026-04-09)

- No error handling on parallel DB queries in `page.tsx:34-38` — `Promise.all` has no try/catch; DB errors surface as Next.js 500. Pre-existing pattern, no error.tsx exists for the interview route segment.
- ViewportCheck SSR hydration flash on small viewports — `useState(true)` causes brief content flash on phones before useEffect fires. Spec acknowledges this trade-off by design.

## Deferred from: code review of Epic 3, stories 3.1–3.3 (2026-04-09)

- `transitionInterview` has TOCTOU — read-then-write without a transaction in `src/lib/synthesis/state-machine.ts`. Two concurrent transitions can both pass validation. Needs a DB-level `SELECT ... FOR UPDATE` or optimistic locking. Pre-existing architectural pattern.
- `parseFrontmatter` multiline YAML handling is fragile — inline parser in `src/lib/interview/skill-loader.ts` doesn't handle all YAML multiline edge cases (blank lines in `>-` blocks). Works for current skill files. A proper YAML parser would be the real fix but adds a dependency.
- `session.ts` bypassed by message route — `src/lib/interview/session.ts` manages session state per Story 3.2, but `src/app/api/interview/[token]/messages/route.ts` implements its own inline segment/sequence logic. These should converge when Story 3.5 (Conversation Thread UI) lands. The session module uses `getExchangeCountByInterviewId` while the route uses `getMaxSequenceNumber` — different strategies for the same concern.

## Deferred from: code review of story 4-1 (2026-04-09)

- Prompt injection via interviewee names in LLM prompt [match-template.ts:17-18] — interviewee names come from controlled DB, not direct user input in synthesis path. Revisit if user-editable names are added.
- workflowSequenceSchema allows empty steps array [workflow.ts:86] — schema strictness will be tightened when Stages 4-5 produce real workflow sequences in Story 4.2.
- No rate limiting on synthesis endpoint [route.ts] — rate limiting is infrastructure-level concern for all routes, not specific to this story.
- Position bias test does not assert randomization occurred [correlator.test.ts:92-109] — shuffle implementation is correct (Fisher-Yates), test is weak but not wrong. Improve when test suite is hardened.

## Deferred from: code review of Epic 4 (2026-04-09)

- Checkpoint version race — `checkpointVersion` computed outside transaction in `engine.ts:73-74`. Final result insert uses transactional `createSynthesisResultWithVersion`, but checkpoint writes use the non-transactional version. Low risk: duplicate checkpoint rows, not corrupt results.
- `toNormalizedSchemas` silently returns empty steps array for malformed `schemaJson` [match-template.ts:93-100] — data should be validated at extraction time (Story 3.6). Defensive fallback is reasonable for now.
- No concurrency guard on POST `/api/synthesis/[nodeId]` — parallel requests can trigger duplicate synthesis runs. `createSynthesisResultWithVersion` transaction prevents version collision, but wasted compute. Consider advisory lock or in-progress status check.
- Step IDs not sanitized for Mermaid syntax injection [mermaid-generator.ts:106-111] — IDs are DB-generated UUIDs (controlled input). Revisit if user-editable IDs are added.
- Fixed 1s retry delay in correlator [correlator.ts:52] — single retry with fixed delay. No thundering herd risk at MVP scale. Consider exponential backoff with jitter for production.

## Deferred from: code review of Epic 5, stories 5.1–5.3 (2026-04-09)

- `getProjectForSupervisor` uses `.limit(1)` with no ORDER BY — non-deterministic for multi-project supervisors [queries.ts:471]. MVP assumes single project per supervisor.
- `getLeafNodeForProject` uses `findFirst` with no ordering — non-deterministic for multi-leaf projects [queries.ts:476]. MVP assumes single leaf node.
- Swallowed errors in API routes — bare `catch {}` with no server-side logging [interviews/route.ts:43, project/route.ts:27]. Pre-existing pattern across all routes.
- No CSRF token on login form — JSON content-type provides implicit protection [login-form.tsx]. Pre-existing auth design decision.
- Duplicate auth in middleware + page.tsx — supervisor with valid session but no project gets redirected to login instead of a meaningful error [page.tsx:30, middleware.ts]. Edge case in MVP single-project setup.

## Deferred from: code review of story 7-1 (2026-04-09)

- TOCTOU race on concurrent completion requests — `transitionInterview` does read-then-write without atomic compare-and-swap. Two simultaneous POST `/complete` can both pass the status check. Pre-existing state machine design [src/lib/synthesis/state-machine.ts].
- Zero verified exchanges produces degenerate schema — if interview completes with no confirmed summaries, extraction creates a single meaningless "Process step" that passes quality gate. Pre-existing extraction fallback behavior [src/lib/interview/schema-extractor.ts].

## Deferred from: code review of story 7-2 (2026-04-09)

- Completion success path untested (`window.location.reload`) — Story 7.1 scope. The `handleComplete` success branch calls `window.location.reload()` with no test coverage; all test mocks return `{ success: false }`.
- `window.location.reload()` vs Next.js `router.refresh()` — Story 7.1 scope. Full page reload is heavy-handed; `router.refresh()` would re-render server components without losing client state in other parts of the page.

## Deferred from: code review of story 7-3 (2026-04-09)

- `getProjectForPM` ignores `userId` — queries single project with no user scoping. Spec-allowed MVP shortcut (Task 3.2). Must add user scoping for multi-tenant.
- URL constructed from request `origin`/`host` headers (spoofable) — spec prescribes this approach. Consider server-side env var for production.
- `handleComplete` stale-closure race in conversation-thread — Story 7.1 scope. `completionTriggeredRef` reset + React batching leaves a timing window for double-trigger from agent SSE.
- `aria-live="polite"` redundant on `role="status"` mic-bar waveform — Story 7.2 scope. Noisy for screen readers on repeated record/stop cycles.
- No leaf node → admin page renders but every POST fails 404 — MVP seeds leaf node. Surface a warning if `getLeafNodeForProject` returns null.
