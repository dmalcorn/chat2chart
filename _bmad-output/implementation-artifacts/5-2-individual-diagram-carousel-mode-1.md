# Story 5.2: Individual Diagram Carousel (Mode 1)

Status: complete

## Story

As a supervisor,
I want to browse each interviewee's personal diagram in a full-width carousel,
So that I can form my own impressions before seeing the synthesis.

## Acceptance Criteria

1. **Given** I am authenticated and on `/review` **When** the page loads **Then** I see Mode 1: a full-width individual diagram carousel (MVP6, UX-DR8)
2. **Given** the carousel is displayed **When** I click left/right arrow buttons **Then** the carousel navigates between interviewees (MVP6)
3. **Given** the carousel is displayed **When** I view the header **Then** it shows interviewee name, location, and position indicator (e.g., "Rachel Torres — Austin, TX (1/3)") (MVP6, UX-DR8)
4. **Given** the carousel is displayed **When** I view the sublabel **Then** it shows validation date and step count (e.g., "Validated Apr 5, 2026 - 6 steps") (UX-DR8)
5. **Given** the carousel is displayed **When** I view each slide **Then** each slide displays the interviewee's validated personal diagram in a DiagramCanvas (max-width 700px, pan/zoom controls) (UX-DR7)
6. **Given** the carousel is displayed **When** I navigate between slides **Then** navigation is instant with no page reload (MVP-NFR3)
7. **Given** the carousel is displayed **When** I press left/right arrow keys **Then** the carousel navigates between interviewees (UX-DR8, UX-DR16)
8. **Given** the carousel is displayed **When** I look below the carousel **Then** a "Compare with Synthesis" button is visible (MVP7)
9. **Given** the page loads **When** I view the top of the page **Then** a supervisor top bar shows brand icon + app name + project name on left, user avatar + name on right (UX-DR18)
10. **Given** the entire review page **When** I interact with any element **Then** there is no editing, no approval, and no state transitions — viewing only (MVP10)

## Tasks / Subtasks

- [x] Task 1: Create `GET /api/review/interviews` API route (AC: #1, #6)
  - [x] 1.1-1.6 All implemented — protected route, query function, API standard response, error handling

- [x] Task 2: Create `GET /api/review/project` API route (AC: #9)
  - [x] 2.1-2.4 All implemented — protected route, query function, returns project+supervisor info

- [x] Task 3: Create supervisor top bar component (AC: #9)
  - [x] 3.1-3.4 Server Component, brand icon + app name + project name, avatar initials, fixed top bar

- [x] Task 4: DiagramCanvas + useMermaid (AC: #5) — already existed from Story 3.6
  - [x] 4.1-4.8 All already implemented with tests (8 DiagramCanvas tests + 5 useMermaid tests)

- [x] Task 5: Create IndividualDiagramCarousel component (AC: #1-#8)
  - [x] 5.1-5.10 All implemented — carousel state, arrow navigation, keyboard nav, aria-live, Compare button

- [x] Task 6: Build `/review` page (AC: #1, #9, #10)
  - [x] 6.1-6.7 Server Component with session validation, direct DB queries, TopBar + carousel, no editing

- [x] Task 7: Create loading skeleton (AC: #1)
  - [x] 7.1-7.2 Skeleton with animate-pulse matching page structure

- [x] Task 8: Add Next.js middleware (AC: #1)
  - [x] 8.1-8.3 Root middleware at `src/middleware.ts`, matcher for `/review/:path*`

- [x] Task 9: Create tests (AC: #1-#10)
  - [x] 9.1 `src/app/api/review/interviews/route.test.ts` — 4 tests (auth, 403, data, empty)
  - [x] 9.2 `src/components/supervisor/individual-diagram-carousel.test.tsx` — 7 tests
  - [x] 9.3 `src/components/shared/top-bar.test.tsx` — 3 tests
  - [x] 9.4 DiagramCanvas tests already existed — 8 tests covering carousel variant

## Dev Notes

### What Already Exists

- `src/app/review/page.tsx` — Placeholder page (`<p>Supervisor Review — placeholder</p>`). Must be replaced.
- `src/components/supervisor/` — Directory exists with `.gitkeep` only. No components yet.
- `src/components/shared/` — Directory exists with `.gitkeep` only. No components yet.
- `src/components/diagram/` — Directory exists with `.gitkeep` only. No components yet.
- `src/hooks/` — Directory exists with `.gitkeep` only. No hooks yet.
- `src/lib/auth/middleware.ts` — `withSupervisorAuth` middleware wrapper exists, checks session and role.
- `src/lib/auth/session.ts` — `SessionPayload` interface (`userId`, `email`, `role`), `getSessionFromRequest`, `validateSession`, `createSession` all exist and working.
- `src/lib/db/queries.ts` — Existing query functions: `getProjectById`, `getProcessNodeById`, `getProcessNodesByProjectId`, `getInterviewTokenByToken`, `getInterviewByTokenId`, `getSynthesisResultByNodeId`, `getUserByEmail`, etc. Does NOT yet have queries for fetching captured interviews with their schemas.
- `src/lib/db/schema.ts` — All 12 tables defined including `interviews`, `individualProcessSchemas`, `interviewTokens`, `projects`, `processNodes`, `users`, `projectSupervisors`. Relations defined.
- `src/app/api/synthesis/[nodeId]/` — Directory exists with `.gitkeep` only.
- No `/api/review/` routes exist yet.

### Database Schema Details (relevant tables)

**`interviews` table:** `id`, `tokenId` (FK -> interviewTokens, unique), `projectId`, `processNodeId`, `status` (enum: pending/active/completed/validating/captured), `startedAt`, `completedAt`, `createdAt`, `updatedAt`

**`individualProcessSchemas` table:** `id`, `interviewId` (FK -> interviews, unique), `processNodeId`, `schemaJson` (JSONB), `mermaidDefinition` (text), `validationStatus` (text), `extractionMethod` (text), `createdAt`, `updatedAt`

**`interviewTokens` table:** `id`, `projectId`, `processNodeId`, `token` (unique), `intervieweeName` (text), `intervieweeRole` (text, nullable — used as location, e.g., "Austin, TX"), `createdAt`, `updatedAt`

**`projects` table:** `id`, `name`, `description`, `skillName`, `defaultLlmProvider`, `createdAt`, `updatedAt`

**`users` table:** `id`, `email`, `passwordHash`, `name` (nullable), `role`, `createdAt`, `updatedAt`

**`projectSupervisors` table:** `id`, `projectId` (FK -> projects), `userId` (FK -> users), `createdAt`, `updatedAt`. Unique on (projectId, userId).

### Data Fetching Strategy

The `/review` page is a **Server Component** that fetches data directly via query functions in `src/lib/db/queries.ts`. It does NOT call its own API routes via `fetch()`. The API routes (`/api/review/interviews`, `/api/review/project`) exist for potential client-side use or external access, but the page itself uses direct DB queries for initial render.

The key query (`getCapturedInterviewsWithSchemas`) joins:
- `interviews` (filtered by `status = 'captured'` and `processNodeId`)
- `individualProcessSchemas` (via `interviewId`)
- `interviewTokens` (via `tokenId` on interviews) for interviewee name and role/location

Step count is derived from the `schemaJson` JSONB field — count the steps array within the Process Schema structure.

All interview data is pre-fetched in the Server Component and passed to the client `IndividualDiagramCarousel` as a prop. This ensures instant carousel navigation (MVP-NFR3) — no additional fetches needed when switching slides.

### Supervisor Session Validation on `/review`

The Server Component page reads the session cookie via `cookies()` from `next/headers`, then calls `validateSession()` from `src/lib/auth/session.ts`. If no valid session or role is not `supervisor`, redirect to `/auth/login` using `redirect()` from `next/navigation`.

Additionally, a Next.js root middleware (`src/middleware.ts`) intercepts `/review` requests and redirects unauthenticated users to `/auth/login` before the page even renders.

### Supervisor Top Bar Details (UX-DR18)

- Brand icon + "chat2chart" + project name on the left
- User avatar (initial-based circle, e.g., "DA" for Diane Alcorn) + supervisor name on the right
- Not clickable — purely informational context
- Max-width 1400px centered container
- The supervisor's name comes from `users.name` (nullable) or falls back to email

### DiagramCanvas Component (UX-DR7)

This is a shared component used across interview and supervisor experiences. For this story, only the `individual-carousel` variant is needed:
- Max-width 700px, no confirm/correct buttons
- Pan/zoom controls: [+] [-] [Fit] absolute-positioned top-right
- Card background, 12px radius, shadow-sm
- Mermaid.js dynamically imported (no SSR)
- The `use-mermaid.ts` hook handles: dynamic `import('mermaid')`, calling `mermaid.initialize()` with theme settings, `mermaid.render()` into a container ref, and cleanup on unmount

### IndividualDiagramCarousel Component (UX-DR8)

- Mode 1 (full-width) is the only mode in this story. Mode 2 (compact, right panel) is Story 5.3.
- Arrow buttons: 36px circle, border, left/right of header
- Label: 16px, weight 600
- Sublabel: 13px, muted-foreground
- Position indicator: "1/3" format, 13px muted-foreground
- Keyboard: ArrowLeft/ArrowRight cycle through slides. Wrap is optional (can disable at boundaries or wrap around).
- "Compare with Synthesis": secondary/outline button, triggers mode transition (Story 5.3 wires this up)

### Interviewee Location

The `intervieweeRole` field on `interviewTokens` is used as the location string (e.g., "Austin, TX"). In the seeded demo data, this field stores the Service Center location. The header format is: `"{name} — {role/location} ({position}/{total})"`.

### What NOT to Do

- Do NOT build Mode 2 (comparison/split-screen view) — that is Story 5.3
- Do NOT build divergence annotations or clickable badges — that is Story 5.3
- Do NOT build the login page or auth login API — that is Story 5.1
- Do NOT build synthesis diagram rendering — that is Story 5.3
- Do NOT add editing controls, approval buttons, or state transition logic (MVP10)
- Do NOT use global state (Redux, Zustand) — Server Components + local `useState` only
- Do NOT store interview data in localStorage/sessionStorage (NFR9)
- Do NOT import Drizzle outside `src/lib/db/` — the page calls query functions
- Do NOT import `@anthropic-ai/sdk` anywhere — this story has zero LLM interaction
- Do NOT build the seed script — that is Epic 6. Assume seeded data exists in the database
- Do NOT fetch data client-side for initial page render — use Server Component data fetching

### Project Structure Notes

Files **created** by this story:
- `src/app/api/review/interviews/route.ts` — GET route handler for captured interviews
- `src/app/api/review/project/route.ts` — GET route handler for project/supervisor info
- `src/components/supervisor/individual-diagram-carousel.tsx` — Mode 1 carousel component
- `src/components/shared/top-bar.tsx` — Supervisor top bar component
- `src/components/diagram/diagram-canvas.tsx` — Shared pan/zoom Mermaid.js wrapper
- `src/hooks/use-mermaid.ts` — Mermaid.js rendering hook
- `src/app/review/loading.tsx` — Skeleton loading state
- `src/middleware.ts` — Next.js root middleware for auth redirect (if not already created)

Files **modified** by this story:
- `src/app/review/page.tsx` — Replace placeholder with full Server Component implementation
- `src/lib/db/queries.ts` — Add `getCapturedInterviewsWithSchemas` and `getProjectForSupervisor` query functions

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete
- `src/lib/auth/middleware.ts` — already has `withSupervisorAuth`
- `src/lib/auth/session.ts` — already has session utilities
- `package.json` — mermaid already in approved dependencies

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2 — Acceptance criteria, MVP6, MVP7, MVP10, MVP-NFR3]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR7 — DiagramCanvas component spec]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR8 — IndividualDiagramCarousel component spec]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR16 — Accessibility, keyboard navigation]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR18 — Supervisor top bar spec]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DiagramCanvas — Component anatomy and specs]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#IndividualDiagramCarousel — Component anatomy, Mode 1 full-width layout]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation Patterns — Top bar spec]
- [Source: _bmad-output/planning-artifacts/architecture.md#Directory Structure — Component placement, review page, diagram-canvas]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Supervisor viewing flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries — Component and service boundaries]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP6 — Mode 1 full-width carousel]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP7 — "Compare with Synthesis" toggle]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP10 — Viewing only, no editing]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP-NFR3 — Instant carousel navigation]
- [Source: _bmad-output/coding-standards.md#Section 8 — API Route Patterns, response wrapping]
- [Source: _bmad-output/project-context.md#Service Boundaries — Drizzle only in src/lib/db/]
- [Source: _bmad-output/project-context.md#Framework-Specific Rules — Server vs. Client Components]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- DiagramCanvas and useMermaid already existed from Story 3.6 — reused as-is
- Added 3 new query functions to queries.ts: `getCapturedInterviewsWithSchemas`, `getProjectForSupervisor`, `getLeafNodeForProject`
- Created `review-content.tsx` as client wrapper to bridge Server Component page to client carousel
- `onCompareWithSynthesis` is a no-op placeholder for Story 5.3
- 14 new tests added, all passing. Full suite: 624 tests, 64 files, 0 failures

### Change Log
- Created `src/app/api/review/interviews/route.ts` — GET endpoint for captured interviews
- Created `src/app/api/review/project/route.ts` — GET endpoint for project/supervisor info
- Created `src/components/shared/top-bar.tsx` — supervisor top bar
- Created `src/components/supervisor/individual-diagram-carousel.tsx` — Mode 1 carousel
- Created `src/app/review/review-content.tsx` — client wrapper for carousel
- Created `src/app/review/loading.tsx` — skeleton loading state
- Created `src/middleware.ts` — Next.js auth middleware for /review routes
- Modified `src/app/review/page.tsx` — full Server Component with data fetching
- Modified `src/lib/db/queries.ts` — added 3 query functions
- Created `src/app/api/review/interviews/route.test.ts` — 4 tests
- Created `src/components/supervisor/individual-diagram-carousel.test.tsx` — 7 tests
- Created `src/components/shared/top-bar.test.tsx` — 3 tests

### File List
- `src/app/api/review/interviews/route.ts` (new)
- `src/app/api/review/interviews/route.test.ts` (new)
- `src/app/api/review/project/route.ts` (new)
- `src/components/shared/top-bar.tsx` (new)
- `src/components/shared/top-bar.test.tsx` (new)
- `src/components/supervisor/individual-diagram-carousel.tsx` (new)
- `src/components/supervisor/individual-diagram-carousel.test.tsx` (new)
- `src/app/review/review-content.tsx` (new)
- `src/app/review/loading.tsx` (new)
- `src/middleware.ts` (new)
- `src/app/review/page.tsx` (modified)
- `src/lib/db/queries.ts` (modified)
