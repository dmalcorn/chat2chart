# Story 5.1: Supervisor Authentication & Login Page

Status: complete

## Story

As a supervisor,
I want to sign in with my email and password,
So that I can access the review interface for my project.

## Acceptance Criteria

1. **Given** I navigate to `/review` without a session **When** I am redirected **Then** I see the login page at `/auth/login` with email input, password input, and "Sign In" primary button (UX-DR12)
2. **Given** I submit the login form **When** the credentials are valid **Then** `POST /api/auth/login` validates credentials against the per-project supervisor allowlist in `project_supervisors` table (MVP4, MVP11)
3. **Given** a successful login **When** the API responds **Then** a JWT signed cookie session is created with 24h expiry and I am redirected to `/review` (MVP14)
4. **Given** a failed login **When** the API responds with an error **Then** an inline error message appears below the form: "Access not available. Contact your project manager." (UX-DR12)
5. **Given** the login form **When** the password field is displayed **Then** helper text below password reads: "This is a project-specific password..." (UX-DR12)
6. **Given** the login form **When** I press Enter **Then** the form submits. No "remember me" or "forgot password" controls are present (UX-DR12)
7. **Given** the session endpoints **When** `POST /api/auth/logout` is called **Then** the session cookie is destroyed. `GET /api/auth/session` validates the current session and returns supervisor info (MVP13)
8. **Given** the supervisor allowlist **When** admin needs to manage it **Then** the allowlist is editable by admin directly in the database — no UI (MVP12)

## Tasks / Subtasks

- [x] Task 1: Implement `/review` page redirect logic (AC: #1)
  - [x] 1.1 Update `src/app/review/page.tsx` — Server Component checks session via `cookies()` + `validateSession()`, redirects to `/auth/login` if no session
  - [x] 1.2 If session exists but role is not `supervisor`, also redirect to `/auth/login`

- [x] Task 2: Build the login page UI at `src/app/auth/login/page.tsx` (AC: #1, #4, #5, #6)
  - [x] 2.1 Extracted to `src/components/auth/login-form.tsx` as `"use client"` component
  - [x] 2.2 Centered card with Email/Password inputs, helper text, Sign In button
  - [x] 2.3 Form submits via `fetch('POST', '/api/auth/login')` with JSON body
  - [x] 2.4 On success, redirects to `/review` via `router.push`
  - [x] 2.5 On error, displays inline error message below form
  - [x] 2.6 Enter key submits via native `<form>` + `<button type="submit">`
  - [x] 2.7 No "remember me", no "forgot password", no OAuth
  - [x] 2.8 Button disabled with "Signing in..." text during request

- [x] Task 3: Verify API routes are complete and correct (AC: #2, #3, #7)
  - [x] 3.1 POST /api/auth/login verified — complete and correct
  - [x] 3.2 POST /api/auth/logout verified — complete and correct
  - [x] 3.3 GET /api/auth/session verified — complete and correct

- [x] Task 4: Verify existing tests and add login page tests (AC: #1-#8)
  - [x] 4.1 Existing API route tests verified passing (7 login + 1 logout + 3 session)
  - [x] 4.2 Created `src/components/auth/login-form.test.tsx` — 7 tests
  - [x] 4.3 Created `src/app/review/page.test.tsx` — 3 tests

## Dev Notes

### What Already Exists (from Stories 1.3/1.4)

- `src/lib/auth/config.ts` — `hashPassword()` and `verifyPassword()` using bcrypt (10 salt rounds). bcrypt is imported ONLY here per service boundary rules
- `src/lib/auth/session.ts` — Full JWT session management: `createSession()`, `validateSession()`, `setSessionCookie()`, `clearSessionCookie()`, `getSessionFromRequest()`. Uses `jose` library with HS256. 24h expiry. httpOnly secure cookie
- `src/lib/auth/middleware.ts` — `withSupervisorAuth()` higher-order function that validates session and checks `role === 'supervisor'`. Returns 401/403 on failure. Used to wrap supervisor API routes
- `src/lib/auth/bootstrap.ts` — `bootstrapAccounts()` creates first supervisor from `FIRST_SUPERVISOR_EMAIL` + `FIRST_SUPERVISOR_PASSWORD` env vars if user doesn't exist
- `src/lib/auth/index.ts` — Barrel exports for all auth functions
- `src/lib/db/queries.ts` — `getUserByEmail()`, `createUser()`, `isEmailInSupervisorAllowlist()` all implemented
- `src/lib/schema/api-requests.ts` — `loginSchema` Zod schema: `{ email: z.email(), password: z.string().min(1) }`
- `src/app/api/auth/login/route.ts` — Full POST handler: validates body with `loginSchema`, checks env allowlist + DB allowlist, verifies password, creates session, sets cookie. Returns `{ data: { role } }` on success, `{ error: { message, code } }` on failure
- `src/app/api/auth/logout/route.ts` — POST handler clears session cookie, returns `{ data: { success: true } }`
- `src/app/api/auth/session/route.ts` — GET handler validates session, returns `{ data: { userId, email, role } }` or 401
- `src/app/auth/login/page.tsx` — **Placeholder only** (`<p>Login -- placeholder</p>`). Must be replaced with actual login form
- `src/app/review/page.tsx` — **Placeholder only**. Must add auth redirect logic
- `src/components/ui/button.tsx` — shadcn/ui Button component exists
- All three API route test files exist and have passing tests (login: 7 tests, logout: 1 test, session: 3 tests)

### Database Schema Details (already in schema.ts)

**`users` table columns:**
`id` (UUID PK), `email` (text, unique), `passwordHash` (text), `name` (text, nullable), `role` (text), `createdAt`, `updatedAt`

**`project_supervisors` table columns:**
`id` (UUID PK), `projectId` (FK -> projects), `userId` (FK -> users), `createdAt`, `updatedAt`
Unique constraint on `(projectId, userId)`.

The `isEmailInSupervisorAllowlist()` query function checks the `users` table for a user with the given email, confirms `role === 'supervisor'`, and verifies they have at least one row in `project_supervisors`.

### Login Flow (end-to-end)

```
1. User navigates to /review
2. Server Component checks session → no session → redirect to /auth/login
3. User enters email + password, presses Enter or clicks "Sign In"
4. Client POSTs to /api/auth/login { email, password }
5. Route validates with loginSchema (Zod)
6. Route checks email against SUPERVISOR_EMAIL_ALLOWLIST env var
7. Route checks email against project_supervisors table via isEmailInSupervisorAllowlist()
8. If neither allowlist matches → 403
9. Route looks up user via getUserByEmail()
10. Route verifies password via verifyPassword() (bcrypt compare in config.ts)
11. If password fails → 403 (same error message — no enumeration)
12. Route creates JWT via createSession() → sets httpOnly cookie via setSessionCookie()
13. Client receives 200 → redirects to /review via router.push()
```

### Design Tokens (from globals.css)

- Primary button: `--primary: #2563eb` / `--primary-foreground: #ffffff`
- Card background: `--card: #ffffff` / `--card-foreground: #171717`
- Helper text: `--muted-foreground: #737373`
- Inputs: `--input: #e5e5e5` (border color)
- Border radius: `--radius: 0.5rem`
- Error text: `--destructive: #dc2626`

### Session Cookie Details

- Cookie name: `session`
- Algorithm: HS256
- Signed with: `SESSION_SECRET` env var
- Max age: 86400 seconds (24 hours)
- Flags: `httpOnly`, `secure` (in production), `sameSite: lax`, `path: /`

### What NOT to Do

- Do NOT import `bcrypt` outside `src/lib/auth/config.ts` — service boundary
- Do NOT build a supervisor dashboard or review carousel (Story 5.2)
- Do NOT add "remember me", "forgot password", or OAuth (UX-DR12)
- Do NOT use alerts, modals, or toasts for error messages — inline only (UX-DR12)
- Do NOT store session data in localStorage/sessionStorage (NFR9)
- Do NOT add Next.js middleware for auth redirects if Server Component `redirect()` is sufficient — keep it simple
- Do NOT modify the existing API routes unless a bug is found during verification
- Do NOT modify `src/lib/auth/config.ts`, `session.ts`, `middleware.ts`, or `bootstrap.ts` — they are complete
- Do NOT modify `src/lib/db/queries.ts` or `src/lib/db/schema.ts` — they are complete for this story
- Do NOT add supervisor editing, approval, or state transitions (MVP10 — view only)

### Project Structure Notes

Files **created** by this story:
- `src/app/auth/login/page.tsx` (replaced — was placeholder)
- `src/app/auth/login/page.test.tsx` (new) — login form UI tests
- `src/app/review/page.test.tsx` (new) — redirect logic tests
- `src/components/auth/login-form.tsx` (new, optional) — extracted client component if preferred over inline

Files **modified** by this story:
- `src/app/review/page.tsx` — add session check and redirect to `/auth/login`

Files **NOT modified** by this story:
- `src/lib/auth/*` — all auth infrastructure complete
- `src/lib/db/queries.ts` — all needed query functions exist
- `src/lib/db/schema.ts` — schema complete
- `src/lib/schema/api-requests.ts` — loginSchema exists
- `src/app/api/auth/login/route.ts` — route complete
- `src/app/api/auth/logout/route.ts` — route complete
- `src/app/api/auth/session/route.ts` — route complete
- `package.json` — no new dependencies needed (jose already installed)

### References

- [Source: _bmad-output/planning-artifacts/prd.md#MVP4 — Supervisor sign-in via email/password against allowlist]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP11 — Supervisor access: email/password against per-project allowlist]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP12 — Supervisor allowlist editable by admin directly, no UI]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP13 — All endpoints require valid token or authenticated session]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP14 — Session expiry: 24h default for supervisor sessions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns — Sign-in form: email, password, enter submits, inline validation, helper text, no remember me]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Supervisor session JWT, route protection pattern]
- [Source: _bmad-output/coding-standards.md#Section 7 — Authentication implementation: bcrypt in config.ts only, JWT with SESSION_SECRET, withSupervisorAuth middleware]
- [Source: _bmad-output/project-context.md#API Route Auth Planes — Supervisor routes require session, middleware wraps routes]
- [Source: CLAUDE.md#Service Boundaries — bcrypt ONLY in src/lib/auth/config.ts]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- All 3 existing API routes verified complete — no modifications needed
- LoginForm extracted to `src/components/auth/login-form.tsx` for separation of concerns
- 10 new tests added (7 login form + 3 review page redirect), all passing
- Full suite: 624 tests, 64 files, 0 failures

### Change Log
- Created `src/components/auth/login-form.tsx` — client login form component
- Modified `src/app/auth/login/page.tsx` — replaced placeholder with LoginForm
- Modified `src/app/review/page.tsx` — added session validation + redirect logic
- Created `src/components/auth/login-form.test.tsx` — 7 tests
- Created `src/app/review/page.test.tsx` — 3 tests

### File List
- `src/components/auth/login-form.tsx` (new)
- `src/components/auth/login-form.test.tsx` (new)
- `src/app/auth/login/page.tsx` (modified)
- `src/app/review/page.tsx` (modified)
- `src/app/review/page.test.tsx` (new)
