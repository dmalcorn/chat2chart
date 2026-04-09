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
