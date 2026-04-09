# Story 5.2: Individual Diagram Carousel (Mode 1)

Status: ready-for-dev

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

- [ ] Task 1: Create `GET /api/review/interviews` API route (AC: #1, #6)
  - [ ] 1.1 Create `src/app/api/review/interviews/route.ts` — a GET endpoint protected by `withSupervisorAuth` from `@/lib/auth/middleware`
  - [ ] 1.2 The route queries all captured interviews for the project's leaf process node, along with their individual process schemas (including `schemaJson`, `mermaidDefinition`, `validationStatus`) and interview token data (for `intervieweeName`, `intervieweeRole`)
  - [ ] 1.3 Add query function `getCapturedInterviewsWithSchemas(processNodeId: string)` to `src/lib/db/queries.ts` — joins `interviews` (status = 'captured'), `individualProcessSchemas`, and `interviewTokens` tables. Returns array of objects with interviewee name, role (used as location), validation date (`updatedAt` from schema), step count (derived from `schemaJson`), and `mermaidDefinition`
  - [ ] 1.4 Return response wrapped per API standard: `{ data: InterviewSlide[], count: number }` where each `InterviewSlide` contains `intervieweeName`, `intervieweeRole`, `validatedAt` (ISO 8601), `stepCount`, `mermaidDefinition`, `schemaJson`
  - [ ] 1.5 If no captured interviews found, return `{ data: [], count: 0 }` with HTTP 200
  - [ ] 1.6 Wrap in try/catch — unexpected errors return `{ error: { message: "An unexpected error occurred", code: "INTERNAL_ERROR" } }` with HTTP 500

- [ ] Task 2: Create `GET /api/review/project` API route (AC: #9)
  - [ ] 2.1 Create `src/app/api/review/project/route.ts` — a GET endpoint protected by `withSupervisorAuth`
  - [ ] 2.2 Returns the project name and the supervisor's user info (name, email) from the session, for use in the top bar
  - [ ] 2.3 Add query function `getProjectForSupervisor(userId: string)` to `src/lib/db/queries.ts` — queries `projectSupervisors` joined with `projects` to find the supervisor's project. Also queries `users` by `userId` for the supervisor name
  - [ ] 2.4 Return response: `{ data: { projectName, supervisorName, supervisorEmail } }`

- [ ] Task 3: Create supervisor top bar component `src/components/shared/top-bar.tsx` (AC: #9)
  - [ ] 3.1 Create a Server Component (no `"use client"`) that receives `projectName` and `supervisorName` as props
  - [ ] 3.2 Layout: brand icon (placeholder SVG or text logo) + "chat2chart" app name + project name on the left side; user avatar (initial-based circle) + supervisor name on the right side
  - [ ] 3.3 Not clickable — purely informational context (UX-DR18)
  - [ ] 3.4 Style with Tailwind: fixed top, full width, max-width 1400px centered, border-bottom 1px, card background, z-index above content

- [ ] Task 4: Create `DiagramCanvas` shared component `src/components/diagram/diagram-canvas.tsx` (AC: #5)
  - [ ] 4.1 Create a `"use client"` component that wraps Mermaid.js rendering with pan/zoom controls
  - [ ] 4.2 Dynamic import of Mermaid.js (no SSR) via `next/dynamic` or lazy `import()` inside a `useEffect`
  - [ ] 4.3 Accept props: `mermaidDefinition: string`, `variant: 'individual-interview' | 'individual-carousel' | 'synthesis'`, `className?: string`
  - [ ] 4.4 Pan: click-drag on the diagram area. Zoom: scroll wheel or +/- buttons. Fit: reset to show full diagram
  - [ ] 4.5 Controls overlay absolute-positioned top-right: [+] [-] [Fit] buttons
  - [ ] 4.6 Specs: card background (`bg-card`), radius 12px, shadow-sm (read-only context). Individual carousel variant: max-width 700px, no buttons below
  - [ ] 4.7 Accessibility: `<details><summary>Text description</summary>` with structured text alternative. Pan/zoom controls keyboard-accessible (arrow keys for pan, +/- for zoom)
  - [ ] 4.8 Create `src/hooks/use-mermaid.ts` hook that handles Mermaid.js initialization, rendering to a container ref, and cleanup. Returns `{ containerRef, isLoading, error }`

- [ ] Task 5: Create `IndividualDiagramCarousel` component `src/components/supervisor/individual-diagram-carousel.tsx` (AC: #1, #2, #3, #4, #5, #6, #7, #8)
  - [ ] 5.1 Create a `"use client"` component that manages carousel state with `useState` for current slide index
  - [ ] 5.2 Accept props: `slides: InterviewSlide[]` (pre-fetched data array), `onCompareWithSynthesis: () => void` callback
  - [ ] 5.3 Header: interviewee name + " — " + location (from `intervieweeRole`) + position indicator in parentheses, e.g., "Rachel Torres — Austin, TX (1/3)". Label: 16px, weight 600. Counter: 13px, muted-foreground
  - [ ] 5.4 Sublabel: validation date formatted + " - " + step count + " steps", e.g., "Validated Apr 5, 2026 - 6 steps". Font: 13px, muted-foreground
  - [ ] 5.5 Left/right arrow buttons: 36px circle, border, positioned on either side of the header. Disable left on first slide, disable right on last slide
  - [ ] 5.6 Each slide renders a `DiagramCanvas` with variant `'individual-carousel'` and the slide's `mermaidDefinition`
  - [ ] 5.7 Keyboard navigation: `useEffect` with `keydown` listener for ArrowLeft/ArrowRight. Clean up on unmount
  - [ ] 5.8 Instant navigation: all slide data is already in the `slides` prop — switching index re-renders immediately, no fetch
  - [ ] 5.9 "Compare with Synthesis" button below the carousel area — calls `onCompareWithSynthesis` prop. Styled as secondary/outline button
  - [ ] 5.10 Accessibility: arrow key navigation, position announced to screen readers via `aria-live="polite"` region, focus indicators on arrow buttons (2px solid primary, 2px offset via `:focus-visible`)

- [ ] Task 6: Build the `/review` page `src/app/review/page.tsx` (AC: #1, #9, #10)
  - [ ] 6.1 This is a Server Component. Validate the supervisor session server-side using `getSessionFromRequest` (or via Next.js middleware redirect to `/auth/login` if no session). For the MVP, use `cookies()` from `next/headers` to read session and validate
  - [ ] 6.2 Fetch data server-side: call the query functions directly from the Server Component (NOT via fetch to API routes — Server Components can call DB queries directly through `src/lib/db/queries.ts`)
  - [ ] 6.3 Fetch: `getCapturedInterviewsWithSchemas(processNodeId)` and project/supervisor info. The process node ID comes from the seeded leaf node — query the project's leaf node
  - [ ] 6.4 Pass fetched data to client components: `<TopBar>` receives project name and supervisor name; `<IndividualDiagramCarousel>` receives the slides array
  - [ ] 6.5 The `onCompareWithSynthesis` callback is a placeholder for Story 5.3 — for now, it can be a no-op or log to console
  - [ ] 6.6 Layout: top bar at top, carousel content below with vertical centering in remaining viewport, max-width 1400px container
  - [ ] 6.7 No editing controls, no approval buttons, no state transition triggers — viewing only (MVP10)

- [ ] Task 7: Create `src/app/review/loading.tsx` skeleton (AC: #1)
  - [ ] 7.1 Skeleton layout matching the final page structure: top bar placeholder, header placeholder, diagram area placeholder
  - [ ] 7.2 Use Tailwind `animate-pulse` on placeholder rectangles

- [ ] Task 8: Add Next.js middleware for supervisor auth redirect (AC: #1)
  - [ ] 8.1 Create or update `src/middleware.ts` (Next.js root middleware) to check for a valid supervisor session cookie on `/review` routes
  - [ ] 8.2 If no valid session, redirect to `/auth/login`
  - [ ] 8.3 Use `matcher` config to apply only to `/review` paths

- [ ] Task 9: Create tests (AC: #1-#10)
  - [ ] 9.1 Create `src/app/api/review/interviews/route.test.ts`:
    - Test authenticated request returns captured interviews with schemas
    - Test unauthenticated request returns 401
    - Test non-supervisor role returns 403
    - Test empty result returns `{ data: [], count: 0 }`
    - Mock query functions from `@/lib/db/queries` — NOT Drizzle directly
  - [ ] 9.2 Create `src/components/supervisor/individual-diagram-carousel.test.tsx`:
    - Test renders first interviewee name, location, position indicator
    - Test renders sublabel with validation date and step count
    - Test left arrow disabled on first slide
    - Test right arrow disabled on last slide
    - Test clicking right arrow advances to next slide
    - Test ArrowLeft/ArrowRight keyboard navigation
    - Test "Compare with Synthesis" button is visible and calls callback
    - Mock DiagramCanvas as a simple div (no real Mermaid rendering in unit tests)
  - [ ] 9.3 Create `src/components/shared/top-bar.test.tsx`:
    - Test renders project name and supervisor name
    - Test renders brand text/icon
  - [ ] 9.4 Create `src/components/diagram/diagram-canvas.test.tsx`:
    - Test renders container with correct max-width for carousel variant
    - Test renders pan/zoom controls (+, -, Fit)
    - Test individual-carousel variant does not render confirm/correct buttons

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

### Debug Log References

### Completion Notes List

### Change Log

### File List
