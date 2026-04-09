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
