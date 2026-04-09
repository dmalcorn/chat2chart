# Story 1.3: Environment Validation & Auth Infrastructure

Status: done

## Story

As a developer,
I want Zod-validated environment variables and the auth infrastructure in place,
So that the application starts safely and auth is ready for features.

## Acceptance Criteria

1. **Given** the database from Story 1.2, **When** the app starts, **Then** `src/lib/env.ts` validates all required environment variables via Zod and fails fast with clear messages on missing/invalid vars
2. **Given** env validation passes, **When** checking `src/lib/auth/config.ts`, **Then** bcrypt password hashing is configured (bcrypt imported ONLY here — service boundary)
3. **Given** auth config exists, **When** checking `src/lib/auth/session.ts`, **Then** it implements JWT signed cookie creation, validation, and 24h expiry using `SESSION_SECRET`
4. **Given** session management exists, **When** checking `src/lib/auth/middleware.ts`, **Then** it provides a `withSupervisorAuth` route-handler wrapper for session checks
5. **Given** middleware exists, **When** an unauthenticated request hits a protected endpoint, **Then** it returns `{ error: { message, code } }` with HTTP 401 (MVP13)
6. **Given** `FIRST_SUPERVISOR_EMAIL` and `FIRST_SUPERVISOR_PASSWORD` are set, **When** the app starts and no supervisor user exists, **Then** the supervisor account is created with bcrypt-hashed password
7. **Given** API auth routes exist, **When** `POST /api/auth/login` receives valid supervisor credentials, **Then** a JWT signed cookie is created and the response includes the user role for redirect

## Tasks / Subtasks

- [x] Task 1: Install Zod and auth dependencies (AC: #1, #2)
  - [x] 1.1 Install exact versions: `zod@4.3.6`, `bcrypt@6.0.0`, `jsonwebtoken@9.x.x` (or use Next.js built-in JWT via `jose` — prefer `jose` since it works in Edge Runtime and avoids native dependencies)
  - [x] 1.2 Install `@types/bcrypt` as devDependency if needed (check if bcrypt 6.0.0 ships types)
  - [x] 1.3 Pin all versions without `^` or `~`
  - [x] 1.4 Run `npm install` to update `package-lock.json`

- [x] Task 2: Create `src/lib/env.ts` — Zod environment validation (AC: #1)
  - [x] 2.1 Define a Zod schema for all environment variables:
    - `DATABASE_URL` (string, starts with `postgresql://`)
    - `ANTHROPIC_API_KEY` (string, starts with `sk-ant-`)
    - `SESSION_SECRET` (string, min length for security — at least 32 chars)
    - `SUPERVISOR_EMAIL_ALLOWLIST` (string — comma-separated approved supervisor emails)
    - `FIRST_SUPERVISOR_EMAIL` (string, email format — bootstrap first supervisor account)
    - `FIRST_SUPERVISOR_PASSWORD` (string, min 8 chars — bootstrap first supervisor password)
    - `NODE_ENV` (enum: `'development'` | `'production'` | `'test'`, default `'development'`)
  - [x] 2.2 Parse `process.env` through the schema at module load time
  - [x] 2.3 Export typed `env` object — all downstream code imports from here, never reads `process.env` directly
  - [x] 2.4 On validation failure: throw with clear message listing which vars are missing/invalid — fail fast before any server code runs
  - [x] 2.5 Handle optional vars gracefully: `ANTHROPIC_API_KEY` can be empty in test environment, `FIRST_SUPERVISOR_*` are optional (only needed for bootstrap)

- [x] Task 3: Create `src/lib/auth/config.ts` — bcrypt configuration (AC: #2)
  - [x] 3.1 Import `bcrypt` — this is the ONLY file allowed to import bcrypt (service boundary)
  - [x] 3.2 Export `hashPassword(plaintext: string): Promise<string>` — uses bcrypt with default salt rounds (10)
  - [x] 3.3 Export `verifyPassword(plaintext: string, hash: string): Promise<boolean>` — bcrypt compare
  - [x] 3.4 No other exports — keep this file focused on password operations only

- [x] Task 4: Create `src/lib/auth/session.ts` — JWT session management (AC: #3)
  - [x] 4.1 Import `SESSION_SECRET` from `@/lib/env`
  - [x] 4.2 Define session payload type: `{ userId: string; email: string; role: 'supervisor'; iat: number; exp: number }`
  - [x] 4.3 Export `createSession(payload: { userId: string; email: string; role: 'supervisor' }): string` — signs JWT with 24h expiry
  - [x] 4.4 Export `validateSession(token: string): SessionPayload | null` — verifies and decodes JWT, returns null if expired/invalid
  - [x] 4.5 Export `setSessionCookie(response: NextResponse, token: string): void` — sets HTTP-only, secure, SameSite=Lax cookie
  - [x] 4.6 Export `clearSessionCookie(response: NextResponse): void` — clears the session cookie
  - [x] 4.7 Export `getSessionFromRequest(request: Request): SessionPayload | null` — extracts and validates session from cookie header
  - [x] 4.8 Cookie settings: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 86400` (24h)

- [x] Task 5: Create `src/lib/auth/middleware.ts` — route protection wrappers (AC: #4, #5)
  - [x] 5.1 Export `withSupervisorAuth(handler)` — wraps a route handler, validates session, rejects with `{ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } }` and HTTP 401 if no valid session
  - [x] 5.2 The wrapper passes `(request, session)` to the inner handler — handler receives validated session
  - [x] 5.3 Return `{ error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } }` with HTTP 403 if session exists but role doesn't match `'supervisor'`

- [x] Task 6: Create `src/lib/auth/index.ts` — barrel exports (AC: #2, #3, #4)
  - [x] 6.1 Re-export public functions from `config.ts`, `session.ts`, and `middleware.ts`
  - [x] 6.2 Do NOT re-export bcrypt itself — only the `hashPassword` and `verifyPassword` wrappers

- [x] Task 7: Create auth API routes (AC: #5, #7)
  - [x] 7.1 Create `src/app/api/auth/login/route.ts`:
    - `POST` handler: parse `{ email, password }` from request body
    - Validate with Zod schema (import from `@/lib/schema/api-requests`)
    - Check email against `SUPERVISOR_EMAIL_ALLOWLIST` env var OR query `project_supervisors` table joined with `users` table
    - If not on any allowlist → return `{ error: { message: 'Access not available. Contact your project manager.', code: 'FORBIDDEN' } }` with 403
    - Verify password via `verifyPassword()` from `@/lib/auth/config`
    - On password mismatch → same 403 error (don't reveal whether email exists)
    - On success → create session via `createSession()`, set cookie, return `{ data: { role: 'supervisor' } }` with 200
  - [x] 7.2 Create `src/app/api/auth/logout/route.ts`:
    - `POST` handler: clear session cookie, return `{ data: { success: true } }` with 200
  - [x] 7.3 Create `src/app/api/auth/session/route.ts`:
    - `GET` handler: validate session from request, return `{ data: { userId, email, role } }` or `{ error: { message: 'No valid session', code: 'UNAUTHORIZED' } }` with 401
  - [x] 7.4 Create login request Zod schema in `src/lib/schema/api-requests.ts`:
    - `loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })`

- [x] Task 8: Implement supervisor bootstrap at startup (AC: #6)
  - [x] 8.1 Create `src/lib/auth/bootstrap.ts`:
    - Check if `FIRST_SUPERVISOR_EMAIL` and `FIRST_SUPERVISOR_PASSWORD` are set in env
    - Query `users` table for existing user with that email
    - If not found → hash password via `hashPassword()`, insert user with `role: 'supervisor'`
    - Log: "Bootstrapped supervisor account: {email}" or "Supervisor account already exists: {email}"
  - [x] 8.2 Wire bootstrap into app startup — call from a Next.js instrumentation hook (`src/instrumentation.ts`)
  - [x] 8.3 Bootstrap must be idempotent — safe to run on every startup

- [x] Task 9: Update `.env.example` with supervisor env vars (AC: #1)
  - [x] 9.1 Add `SUPERVISOR_EMAIL_ALLOWLIST=supervisor@example.com` to `.env.example`
  - [x] 9.2 Add `FIRST_SUPERVISOR_EMAIL=supervisor@example.com` to `.env.example`
  - [x] 9.3 Add `FIRST_SUPERVISOR_PASSWORD=change-me-on-first-deploy` to `.env.example`

- [x] Task 10: Create tests (AC: #1-#7)
  - [x] 10.1 Create `src/lib/env.test.ts` — test Zod validation catches missing/invalid vars, test valid env passes
  - [x] 10.2 Create `src/lib/auth/config.test.ts` — test `hashPassword` produces valid bcrypt hash, test `verifyPassword` matches correctly, test wrong password fails
  - [x] 10.3 Create `src/lib/auth/session.test.ts` — test JWT creation, validation, expiry, invalid token handling
  - [x] 10.4 Create `src/lib/auth/middleware.test.ts` — test `withSupervisorAuth` rejects unauthenticated, passes authenticated with session
  - [x] 10.5 Verify all tests pass with `npm run test`

## Dev Notes

### Two Auth Planes — Different Credential Models

The MVP has two auth planes with different approaches:

| Plane | Route prefix | Credential |
|-------|-------------|------------|
| Interview | `/api/interview/[token]/**` | Token-based — no login, no session |
| Supervisor | `/api/review/**`, `/api/auth/**` | Email/password → JWT session |

Interview routes validate the token parameter — they do NOT use session middleware. Supervisor routes use `withSupervisorAuth` middleware.

### Supervisor-Only Auth in MVP

The MVP only has supervisor auth. No PM allowlist or PM login is needed.
- `SUPERVISOR_EMAIL_ALLOWLIST` — comma-separated approved supervisor emails (env var)
- `FIRST_SUPERVISOR_EMAIL` / `FIRST_SUPERVISOR_PASSWORD` — bootstrap first supervisor account at startup
- The `project_supervisors` table provides per-project allowlisting (seeded in Story 6.1)

The parent project's `PM_EMAIL_ALLOWLIST` / `FIRST_PM_EMAIL` / `FIRST_PM_PASSWORD` are NOT included in this MVP.

### Login Flow

```
POST /api/auth/login { email, password }
  → check email against SUPERVISOR_EMAIL_ALLOWLIST env var
  → also check project_supervisors table joined with users
  → if not on any allowlist → 403 "Access not available. Contact your project manager."
  → verify password against bcrypt hash in users table
  → create signed JWT cookie → redirect to /review
```

### JWT Library Choice: `jose` over `jsonwebtoken`

Prefer the `jose` library over `jsonwebtoken` because:
- Works in Next.js Edge Runtime (no native Node.js dependencies)
- Modern API with Promises
- Built-in TypeScript types
- No `@types/` package needed

If using `jose`, the API is slightly different (async sign/verify), but the session module interface stays the same.

### Bootstrap via Next.js Instrumentation

Next.js supports `src/instrumentation.ts` which runs once on server startup — ideal for supervisor account bootstrap. This avoids polluting the database connection module with bootstrap logic.

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapAccounts } = await import('@/lib/auth/bootstrap');
    await bootstrapAccounts();
  }
}
```

### Zod Schema for API Requests

Story 1.3 creates `src/lib/schema/api-requests.ts` with the login schema. This file will grow as more API routes are added in later stories. The pattern: one Zod schema per request body, exported by name.

### Service Boundary: bcrypt

`bcrypt` is imported ONLY in `src/lib/auth/config.ts`. All other code uses the exported `hashPassword()` and `verifyPassword()` functions. This is a strict service boundary from the Architecture document — do NOT import bcrypt anywhere else.

### API Response Format — Every Route

All auth routes must follow the standard response format:
- Success: `{ data: T }` with appropriate HTTP status
- Error: `{ error: { message: string, code: string } }` with HTTP status
- Never return unwrapped data
- Never leak stack traces in error responses

### Cookie Security Settings

```typescript
{
  httpOnly: true,          // JS can't read the cookie
  secure: env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: 'lax',         // CSRF protection
  path: '/',               // Available to all routes
  maxAge: 86400            // 24 hours in seconds
}
```

### What NOT to Do

- Do NOT create the login page UI — that's Story 5.1
- Do NOT create interview token validation — that's Story 2.1
- Do NOT install `@anthropic-ai/sdk` — that's Story 1.4
- Do NOT create the seed script content — that's Story 6.1
- Do NOT import bcrypt outside `src/lib/auth/config.ts`
- Do NOT import Drizzle outside `src/lib/db/` — use query functions from `queries.ts`
- Do NOT use `^` or `~` version prefixes
- Do NOT store session data in localStorage/sessionStorage (NFR9)
- Do NOT create a "forgot password" or "remember me" feature — not in scope

### Previous Story Context (Story 1.2)

Story 1.2 established:
- All 12 Drizzle table definitions in `src/lib/db/schema.ts` (includes `users`, `projectSupervisors` tables needed for auth)
- Database connection in `src/lib/db/connection.ts` with camelCase mode
- Query functions in `src/lib/db/queries.ts`
- `drizzle.config.ts` at project root

Story 1.3 will need to add query functions to `queries.ts` for auth operations:
- `getUserByEmail(email: string)` → user or null
- `createUser(data)` → new user
- `getSupervisorsByProjectId(projectId: string)` → supervisor list
- `isEmailInSupervisorAllowlist(email: string)` → boolean (joins `projectSupervisors` + `users`)

### Project Structure Notes

Files created by this story:
- `src/lib/env.ts` — replaces placeholder from Story 1.1
- `src/lib/auth/config.ts` — bcrypt wrapper (service boundary)
- `src/lib/auth/session.ts` — JWT session management
- `src/lib/auth/middleware.ts` — route protection wrappers
- `src/lib/auth/bootstrap.ts` — supervisor account bootstrap
- `src/lib/auth/index.ts` — barrel exports
- `src/lib/schema/api-requests.ts` — Zod request schemas (starts with login)
- `src/app/api/auth/login/route.ts` — login endpoint
- `src/app/api/auth/logout/route.ts` — logout endpoint
- `src/app/api/auth/session/route.ts` — session validation endpoint
- `src/instrumentation.ts` — startup bootstrap hook

Files modified by this story:
- `src/lib/db/queries.ts` — add auth query functions
- `package.json` — add zod, bcrypt, jose dependencies
- `.env.example` — add supervisor env vars

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Auth planes, JWT, bcrypt, token identity]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Auth routes, response format]
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment — Env vars list]
- [Source: _bmad-output/coding-standards.md#Section 7: Authentication Implementation — Password handling, session, route protection, login flow, PM bootstrap]
- [Source: _bmad-output/coding-standards.md#Section 8: API Route Patterns — Response wrapping, validation pattern]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3 — Acceptance criteria]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1 — Supervisor login (depends on this story's infrastructure)]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP11-MVP14 — Supervisor auth requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP11-MVP14 — Supervisor auth requirements (PM auth not in MVP scope)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX-DR12 — Login form spec (implemented in Story 5.1)]
- [Source: _bmad-output/project-context.md — SUPERVISOR_EMAIL_ALLOWLIST, FIRST_SUPERVISOR_EMAIL, FIRST_SUPERVISOR_PASSWORD env vars]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Zod v4 uses `zod/v4` import path; `z.email()` is a top-level validator, `z.prettifyError()` for formatting
- jose v6.2.2 requires Web Crypto API — auth tests need `// @vitest-environment node` directive (jsdom lacks crypto)
- Used `jose` over `jsonwebtoken` per story Dev Notes — async API, Edge Runtime compatible, no native deps
- `drizzle-orm/postgres-js` driver (not `node-postgres`) matches the installed `postgres` package from Story 1.2
- `.env.local` SESSION_SECRET updated to 32+ chars to pass Zod validation

### Completion Notes List

- Zod env validation with fail-fast on startup; optional vars handled gracefully
- bcrypt service boundary: imported ONLY in `src/lib/auth/config.ts`
- JWT sessions via jose: create, validate, cookie set/clear, request extraction
- `withSupervisorAuth` middleware returns 401/403 per API response format spec
- Login route checks env allowlist AND DB `project_supervisors` table; same 403 for missing/wrong credentials (no email enumeration)
- Logout clears cookie; session route returns current user info or 401
- Bootstrap creates first supervisor on startup via `src/instrumentation.ts`
- Auth query functions added to `queries.ts`: `getUserByEmail`, `createUser`, `isEmailInSupervisorAllowlist`
- 32 new tests (13 env + 5 bcrypt + 10 session + 4 middleware)
- All 131 tests pass, TypeScript and ESLint clean

### Review Findings

- [x] [Review][Patch] `isEmailInSupervisorAllowlist` compares email string against UUID column — fixed: single query via user email → projectSupervisors relation
- [x] [Review][Patch] `ANTHROPIC_API_KEY` missing `sk-ant-` prefix validation — fixed: added `.refine()` allowing empty or `sk-ant-` prefix
- [x] [Review][Patch] `request.json()` failure returns 500 instead of 400 — fixed: inner try/catch returns 400
- [x] [Review][Patch] Env test duplicates Zod schema — fixed: extracted schema to `env-schema.ts`, test imports real schema
- [x] [Review][Patch] Missing test coverage for bootstrap.ts and auth routes — fixed: added bootstrap.test.ts, login/logout/session route.test.ts (15 new tests)
- [x] [Review][Defer] No rate limiting on login endpoint — deferred, infrastructure scope
- [x] [Review][Defer] No JWT server-side revocation — deferred, not MVP scope
- [x] [Review][Defer] `FIRST_SUPERVISOR_PASSWORD` remains in process.env after bootstrap — deferred, Node.js limitation
- [x] [Review][Defer] Bootstrap race condition on concurrent startup — deferred, MVP is single instance
- [x] [Review][Defer] `parseCookies` doesn't URL-decode values — deferred, JWTs use base64url
- [x] [Review][Defer] `DATABASE_URL` rejects `postgres://` scheme alias — deferred, Railway uses `postgresql://`
- [x] [Review][Defer] SESSION_SECRET without HKDF key derivation — deferred, acceptable for MVP

### Review Findings (Epic 1 Review — 2026-04-09)

#### Patches

- [x] [Review][Patch] Login route hardcoded `role: 'supervisor'` in session instead of reading `user.role` — fixed to use `user.role` [src/app/api/auth/login/route.ts:95]
- [x] [Review][Patch] `SessionPayload.role` type widened from `'supervisor'` to `'pm' | 'supervisor'` [src/lib/auth/session.ts:12]
- [x] [Review][Patch] Bootstrap silently no-ops when only one `FIRST_SUPERVISOR_*` var is set — added warning log [src/lib/auth/bootstrap.ts:8-12]

#### Deferred

- [x] [Review][Defer] `ANTHROPIC_API_KEY` defaults to empty string — silent misconfiguration until first LLM call [src/lib/env-schema.ts] — deferred, startup warning for future story
- [x] [Review][Defer] Bootstrap race condition on concurrent cold start — no `ON CONFLICT` [src/lib/auth/bootstrap.ts] — deferred, MVP single instance

### Change Log

- 2026-04-08: Implemented Story 1.3 — all 10 tasks complete
- 2026-04-08: Code review — 5 patches applied (UUID query bug, API key validation, JSON error handling, schema test refactor, added 15 route/bootstrap tests), 7 deferred, 8 dismissed

### File List

- `package.json` — added zod, bcrypt, jose dependencies; @types/bcrypt devDependency
- `package-lock.json` — updated
- `src/lib/env-schema.ts` — new, extracted Zod env schema (no side effects)
- `src/lib/env.ts` — replaced placeholder with Zod environment validation, re-exports schema
- `src/lib/env.test.ts` — new, 15 tests for env schema validation (imports real schema)
- `src/lib/auth/config.ts` — new, bcrypt hashPassword/verifyPassword (service boundary)
- `src/lib/auth/config.test.ts` — new, 5 bcrypt tests
- `src/lib/auth/session.ts` — new, JWT session management via jose
- `src/lib/auth/session.test.ts` — new, 10 JWT session tests
- `src/lib/auth/middleware.ts` — new, withSupervisorAuth route wrapper
- `src/lib/auth/middleware.test.ts` — new, 4 middleware tests
- `src/lib/auth/bootstrap.ts` — new, supervisor account bootstrap
- `src/lib/auth/bootstrap.test.ts` — new, 3 bootstrap tests
- `src/lib/auth/index.ts` — new, barrel exports
- `src/lib/schema/api-requests.ts` — new, loginSchema Zod validator
- `src/app/api/auth/login/route.ts` — new, POST login endpoint
- `src/app/api/auth/login/route.test.ts` — new, 7 login route tests
- `src/app/api/auth/logout/route.ts` — new, POST logout endpoint
- `src/app/api/auth/logout/route.test.ts` — new, 1 logout route test
- `src/app/api/auth/session/route.ts` — new, GET session endpoint
- `src/app/api/auth/session/route.test.ts` — new, 3 session route tests
- `src/instrumentation.ts` — new, Next.js startup hook for bootstrap
- `src/lib/db/queries.ts` — modified, added getUserByEmail, createUser, isEmailInSupervisorAllowlist
- `.env.example` — modified, replaced PM vars with supervisor vars
- `.env.local` — modified, replaced PM vars with supervisor vars, longer SESSION_SECRET
- `src/lib/auth/.gitkeep` — deleted
- `src/lib/schema/.gitkeep` — deleted
- `src/app/api/auth/login/.gitkeep` — deleted
- `src/app/api/auth/logout/.gitkeep` — deleted
- `src/app/api/auth/session/.gitkeep` — deleted
