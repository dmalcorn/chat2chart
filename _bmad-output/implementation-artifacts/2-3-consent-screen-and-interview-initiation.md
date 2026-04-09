# Story 2.3: Consent Screen & Interview Initiation

Status: done

## Story

As an interviewee,
I want a warm, clear consent screen that tells me what will happen before I start,
So that I feel safe and informed.

## Acceptance Criteria

1. **Given** a Pending token resolves **When** the consent screen renders **Then** it displays the process name (e.g., "Receive and Digitize Incoming Mail"), AI disclosure, recording/attribution notice, speech capture notice, and estimated duration (~90 seconds) (FR72)
2. **Given** the consent screen renders **When** the layout is visible **Then** the screen uses a Typeform-inspired centered card (max-width 560px) on gradient background (primary-soft to background) with shadow-lg (UX-DR1)
3. **Given** the consent screen renders **When** info blocks are displayed **Then** they use muted background with icon + text, 8px border radius (UX-DR1)
4. **Given** the consent screen renders **When** design tokens are applied **Then** the design token system (CSS custom properties) is applied: primary blue, accent teal, summary violet, neutrals, spacing scale, border radius tokens, shadow system, Inter font type scale (UX-DR11)
5. **Given** the interviewee clicks "Begin Interview" **When** the button is pressed **Then** the browser requests microphone permission and the interview state transitions to Active (FR73)
6. **Given** the "Begin Interview" button renders **When** it is visible **Then** it is full-width, primary style, 16px font size, weight 600 (UX-DR1)
7. **Given** the interviewee clicks "Begin Interview" **When** microphone permission is denied **Then** the interview still starts (typed fallback available) and the state transitions to Active

## Tasks / Subtasks

- [x] Task 1: Create the `ConsentScreen` client component `src/components/interview/consent-screen.tsx` (AC: #1, #2, #3, #4, #6)
  - [x] 1.1 Add `"use client"` directive at top of file — this component uses browser APIs and user interaction
  - [x] 1.2 Define the component props interface:
    ```typescript
    interface ConsentScreenProps {
      processName: string;
      intervieweeName: string;
      token: string;
      onInterviewStarted: () => void;
    }
    ```
  - [x] 1.3 Render the outer layout: full-viewport gradient background using `bg-gradient-to-b from-primary-soft to-background`, centered flex container
  - [x] 1.4 Render the consent card: `max-w-[560px]`, `shadow-lg`, `rounded-lg` (12px via `--radius-lg`), white card background, generous padding (24px)
  - [x] 1.5 Render the title: Display level typography (36px, weight 700, line-height 1.2) — e.g., "Tell Us About Your Process"
  - [x] 1.6 Render the process name dynamically from the `processName` prop — Body Large (18px, weight 400)
  - [x] 1.7 Render four info blocks, each with muted background (`bg-muted`), 8px border radius (`rounded-md`), icon + text layout, padding 12-16px:
    - AI Disclosure: "You'll be having a conversation with an AI assistant that will ask about your work process."
    - Recording Notice: "Your responses will be recorded and attributed to you as part of this process discovery project."
    - Speech Capture Notice: "You'll speak your answers using your microphone. A typing option is also available."
    - Duration Estimate: "This typically takes about 90 seconds."
  - [x] 1.8 Use inline SVG icons for each info block (no external icon library per UX spec) — simple, recognizable shapes (chat bubble, document, microphone, clock)
  - [x] 1.9 Render the "Begin Interview" button: full-width, primary style (`bg-primary text-primary-foreground`), 16px font size, font-weight 600, using the shadcn/ui `Button` component with appropriate size and class overrides
  - [x] 1.10 Ensure the component uses only design tokens from `globals.css` — primary blue, muted neutrals, spacing scale, border radius tokens, shadow-lg, Inter font

- [x] Task 2: Implement microphone permission request and interview start flow (AC: #5, #7)
  - [x] 2.1 On "Begin Interview" click, set a loading/disabled state on the button to prevent double-clicks
  - [x] 2.2 Call `navigator.mediaDevices.getUserMedia({ audio: true })` to request microphone permission
  - [x] 2.3 If permission granted, store the MediaStream reference (stop tracks immediately — actual recording starts later in Epic 3)
  - [x] 2.4 If permission denied or getUserMedia throws, proceed anyway — typed fallback will be available (do NOT block interview start on mic denial)
  - [x] 2.5 After mic permission attempt (success or failure), call `POST /api/interview/[token]/start` to create the interview row and transition state to `active`
  - [x] 2.6 On successful API response, call `onInterviewStarted()` callback so the parent routing component (Story 2.2) can transition the view to the active interview screen
  - [x] 2.7 On API error, display an inline error message below the button using the error message from the `{ error: { message, code } }` response — do NOT use alert() or modal

- [x] Task 3: Create `POST /api/interview/[token]/start` route handler `src/app/api/interview/[token]/start/route.ts` (AC: #5)
  - [x] 3.1 Create the route file at `src/app/api/interview/[token]/start/route.ts`
  - [x] 3.2 Extract `token` from route params using Next.js 16 async params pattern: `{ params }: { params: Promise<{ token: string }> }`
  - [x] 3.3 Validate token format using `validateTokenFormat()` from `@/lib/interview/token` — if invalid, return 404 with `INVALID_TOKEN` error
  - [x] 3.4 Look up token in DB via `getInterviewTokenByToken(token)` — if not found, return 404 with message `"This link isn't valid. Contact the person who sent it to you."` and code `INVALID_TOKEN`
  - [x] 3.5 Check if an interview already exists via `getInterviewByTokenId(tokenRow.id)` — if it exists and status is not `pending`, return 409 with message `"This interview has already been started."` and code `INTERVIEW_ALREADY_STARTED`
  - [x] 3.6 Create a new interview row in the `interviews` table via a new query function `createInterview(data)` in `src/lib/db/queries.ts`:
    ```typescript
    {
      tokenId: tokenRow.id,
      projectId: tokenRow.projectId,
      processNodeId: tokenRow.processNodeId,
      status: 'active',
      startedAt: new Date(),
    }
    ```
  - [x] 3.7 Return success response: `{ data: { interviewId: newInterview.id, status: 'active' } }` with HTTP 201
  - [x] 3.8 Wrap in try/catch — on unexpected errors, return `{ error: { message: "An unexpected error occurred", code: "INTERNAL_ERROR" } }` with HTTP 500

- [x] Task 4: Add `createInterview` query function to `src/lib/db/queries.ts` (AC: #5)
  - [x] 4.1 Import the `interviews` table from `@/lib/db/schema`
  - [x] 4.2 Implement `createInterview(data: { tokenId: string; projectId: string; processNodeId: string; status: string; startedAt: Date })` — inserts a row into the `interviews` table and returns the created row
  - [x] 4.3 Use Drizzle's `.returning()` to get the created row back from the insert
  - [x] 4.4 Return type inferred from the Drizzle schema — do NOT define a separate TypeScript type

- [x] Task 5: Create tests (AC: #1-#7)
  - [x] 5.1 Create `src/components/interview/consent-screen.test.tsx`:
    - Test that process name is rendered from props
    - Test that all four info blocks render (AI disclosure, recording notice, speech capture notice, duration estimate)
    - Test that "Begin Interview" button renders with correct text
    - Test that clicking "Begin Interview" calls getUserMedia and then the start API
    - Test that mic permission denial still triggers the API call (does not block)
    - Test that API error displays inline error message
    - Test that successful start calls `onInterviewStarted` callback
    - Mock `navigator.mediaDevices.getUserMedia` and `fetch` — NOT SDK-level mocks
  - [x] 5.2 Create `src/app/api/interview/[token]/start/route.test.ts`:
    - Test valid token with no existing interview creates interview row, returns 201 with interview ID and status `active`
    - Test valid token with existing active interview returns 409 `INTERVIEW_ALREADY_STARTED`
    - Test invalid token format returns 404 `INVALID_TOKEN`
    - Test nonexistent token returns 404 with exact error message
    - Test unexpected DB error returns 500 `INTERNAL_ERROR`
    - Mock query functions from `@/lib/db/queries` — NOT Drizzle ORM directly

## Dev Notes

### What Already Exists

- `src/lib/db/schema.ts` — All 12 tables defined including `interviewTokens` and `interviews` with correct columns, enums (`interviewStatusEnum`: pending/active/completed/validating/captured), indexes, and foreign keys
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/db/queries.ts` — Created by Story 2.1 with `getInterviewTokenByToken()`, `getInterviewByTokenId()`, `getProjectById()`, `getProcessNodeById()` query functions
- `src/lib/interview/token.ts` — Created by Story 2.1 with `validateTokenFormat()` UUID v4 validation
- `src/app/api/interview/[token]/route.ts` — Created by Story 2.1 — GET route handler returning token data with interview state
- `src/app/interview/[token]/page.tsx` — Placeholder page (will be replaced by Story 2.2 with state-based routing)
- `src/components/interview/` — Directory exists with `.gitkeep` only — this is where the ConsentScreen component goes
- `src/components/ui/button.tsx` — shadcn/ui Button component already installed
- `src/app/globals.css` — Design token system (CSS custom properties) already implemented with UX-DR11 tokens: primary blue (#2563EB), accent teal (#0D9488), summary violet, neutrals (Zinc scale), spacing scale (4px base), border radius tokens, shadow system (sm/md/lg), and Inter font type scale. Both light and dark mode tokens are defined. No additional CSS token work needed for this story.

### Database Schema Details

**`interviews` table columns (from schema.ts):**
`id` (UUID PK, defaultRandom), `tokenId` (FK to interviewTokens, unique), `projectId` (FK to projects), `processNodeId` (FK to processNodes), `status` (enum: pending/active/completed/validating/captured, default 'pending'), `llmProvider` (text, nullable), `sttProvider` (text, nullable), `startedAt` (timestamp, nullable), `completedAt` (timestamp, nullable), `createdAt`, `updatedAt`

**`interviewTokens` table columns (from schema.ts):**
`id` (UUID PK), `projectId` (FK to projects), `processNodeId` (FK to processNodes), `token` (text, unique, indexed), `intervieweeName` (text), `intervieweeRole` (text, nullable), `createdAt`, `updatedAt`

### Interview State Transition for This Story

This story implements exactly one state transition: **Pending to Active**.

- A token exists in `interview_tokens` with no corresponding `interviews` row = Pending state
- Clicking "Begin Interview" creates an `interviews` row with `status: 'active'` and `startedAt: now()` = Active state
- The parent routing component (Story 2.2) re-evaluates the state and transitions the view from the consent screen to the active interview screen

### Consent Screen Content (FR72)

The consent screen must display these specific items:
1. **Process name** — dynamically from token API response (e.g., "Receive and Digitize Incoming Mail")
2. **AI disclosure** — the interviewee is conversing with an AI assistant, not a human
3. **Recording/attribution notice** — responses will be recorded and attributed to the interviewee
4. **Speech capture notice** — microphone will be used; typing fallback available
5. **Estimated duration** — approximately 90 seconds

### Consent Screen Visual Design (UX-DR1, UX-DR11)

All design tokens are already defined in `src/app/globals.css`. The component applies them via Tailwind utility classes:

- **Gradient background:** `bg-gradient-to-b from-primary-soft to-background` (primary-soft #DBEAFE to background #FFFFFF)
- **Centered card:** `max-w-[560px]`, `shadow-lg` (already defined as `--shadow-lg`), `rounded-lg` (12px via radius tokens)
- **Info blocks:** `bg-muted` (#F4F4F5), `rounded-md` (8px), icon + text, padding 12-16px
- **"Begin Interview" button:** full-width, `bg-primary text-primary-foreground`, 16px font, font-weight 600
- **Title:** 36px, weight 700, line-height 1.2 (Display level from type scale)
- **Body text:** 18px, weight 400 (Body Large from type scale)
- **Font:** Inter (already configured as `--font-sans` and `--font-heading`)

### Microphone Permission Flow

```
User clicks "Begin Interview"
  -> Button disabled, loading state
  -> navigator.mediaDevices.getUserMedia({ audio: true })
  -> If granted: stop tracks immediately (actual recording handled in Epic 3)
  -> If denied: proceed anyway (typed fallback available)
  -> POST /api/interview/[token]/start
  -> If 201: call onInterviewStarted() callback
  -> If error: show inline error message
```

Key: microphone denial does NOT block interview start. The interview works with typed input as a fallback. The mic permission is requested here so the browser prompt appears at the right moment (after consent, before conversation).

### API Response Format (enforced)

```typescript
// Success — POST /api/interview/[token]/start
{ data: { interviewId: string, status: 'active' } }  // HTTP 201

// Error
{ error: { message: string, code: string } }  // HTTP 404, 409, or 500
```

### Service Boundaries — Enforced

- Drizzle imported ONLY in `src/lib/db/queries.ts` and `src/lib/db/connection.ts` — the route handler calls query functions, never raw SQL
- The route handler imports from `@/lib/db/queries` and `@/lib/interview/token` — it does NOT import from `drizzle-orm` or `@/lib/db/schema`
- The ConsentScreen component calls `fetch()` to hit the API route — it does NOT import DB or server-side modules
- Web Speech API (getUserMedia) is called in the client component only

### Next.js 16 Route Handler Pattern

```typescript
// src/app/api/interview/[token]/start/route.ts
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params; // Next.js 16: params is a Promise
  // ...
}
```

### Mock Strategy for Tests

- ConsentScreen tests: mock `navigator.mediaDevices.getUserMedia` and `global.fetch` — test the component's behavior on permission grant/deny and API success/failure
- Route handler tests: mock `@/lib/db/queries` functions (getInterviewTokenByToken, getInterviewByTokenId, createInterview) — NOT Drizzle ORM directly
- Use `@testing-library/react` for component rendering and interaction

### What NOT to Do

- Do NOT create the active interview conversation UI (Epic 3)
- Do NOT create SSE streaming endpoints (Epic 3)
- Do NOT implement actual voice recording or STT (Epic 3)
- Do NOT add checkboxes or legal-style consent language — clicking "Begin" IS implicit consent (UX anti-pattern: no "legal wall consent")
- Do NOT add progress bars, question counts, or timers — warmth over efficiency (UX principle)
- Do NOT store any interview data in browser localStorage/sessionStorage (NFR9)
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT add token expiration logic — not in demo scope
- Do NOT add an external icon library — use inline SVGs per UX spec
- Do NOT modify `src/app/globals.css` — design tokens are already complete
- Do NOT create a separate design tokens file — tokens are already in globals.css

### Project Structure Notes

Files **created** by this story:
- `src/components/interview/consent-screen.tsx` — ConsentScreen client component
- `src/app/api/interview/[token]/start/route.ts` — POST route handler to start interview
- `src/components/interview/consent-screen.test.tsx` — Component tests
- `src/app/api/interview/[token]/start/route.test.ts` — Route handler tests

Files **modified** by this story:
- `src/lib/db/queries.ts` — Add `createInterview()` query function

Files **NOT modified** by this story:
- `src/app/globals.css` — design tokens already complete
- `src/lib/db/schema.ts` — already complete
- `src/lib/db/connection.ts` — already complete
- `src/lib/interview/token.ts` — already complete from Story 2.1
- `package.json` — no new dependencies needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3 — Acceptance criteria, FR72, FR73]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Consent Screen — Visual design, info blocks, gradient, card layout]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation — Color system, typography, spacing, border radius, shadows]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design System Foundation — shadcn/ui components, ConsentScreen custom component]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows — Pending to consent to Begin to mic permission to Active]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — POST route pattern]
- [Source: _bmad-output/coding-standards.md#Section 8 — API Route Patterns, response wrapping]
- [Source: _bmad-output/project-context.md#Service Boundaries — Drizzle only in src/lib/db/]
- [Source: _bmad-output/planning-artifacts/prd.md#FR72 — Consent screen content requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#FR73 — Begin Interview initiates microphone and transitions to Active]
- [Source: src/app/globals.css — Design tokens already implemented (UX-DR11)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation, no issues encountered.

### Completion Notes List

- Task 1: Created `ConsentScreen` client component with `"use client"` directive, Typeform-inspired centered card layout (max-w-560px, shadow-lg, rounded-lg), gradient background (from-primary-soft to-background), four info blocks with inline SVG icons (chat bubble, document, microphone, clock), display title typography (36px/700), process name as Body Large (18px/400), and full-width primary "Begin Interview" button (16px/600). All design tokens from globals.css, no external icon library.
- Task 2: Implemented mic permission flow in `handleBeginInterview` — button disabled on click, getUserMedia called, tracks stopped immediately on grant, mic denial does NOT block start. POST to `/api/interview/[token]/start` follows. On success calls `onInterviewStarted()` callback; on error shows inline error below button via `role="alert"`.
- Task 3: Created POST route handler at `src/app/api/interview/[token]/start/route.ts`. Validates token format, looks up token row, checks for existing non-pending interview (409), creates interview row with `status: 'active'` and `startedAt: now()`, returns 201 with `{ data: { interviewId, status } }`. Try/catch wraps entire handler for 500 fallback.
- Task 4: Added `createInterview()` to `src/lib/db/queries.ts` with properly typed status enum parameter. Uses Drizzle `.insert().values().returning()` pattern. Return type inferred from schema.
- Task 5: Created 7 component tests (consent-screen.test.tsx) and 6 route handler tests (start/route.test.ts). All 13 new tests pass. Full suite: 215/215 pass, zero regressions.

### Change Log

- 2026-04-09: Story 2.3 implemented — ConsentScreen component, POST /api/interview/[token]/start route, createInterview query, 13 tests added.

### Review Findings

- [x] [Review][Patch] Info block border radius uses `rounded-md` (6.4px) instead of AC3-required 8px — should be `rounded-lg` [src/components/interview/consent-screen.tsx]
- [x] [Review][Defer] Race condition: concurrent POST returns 500 instead of 409 — DB unique constraint on `tokenId` prevents data corruption but error message is opaque; handle pg error code 23505 for proper 409 response — deferred, MVP demo single-user-per-token makes this extremely unlikely
- [x] [Review][Defer] Pending interview row edge case: if a pending interview row exists, route attempts duplicate insert instead of updating — DB unique constraint prevents corruption; theoretical scenario since normal flow never creates pending rows — deferred, pre-existing architectural limitation

### File List

- `src/components/interview/consent-screen.tsx` (created)
- `src/components/interview/consent-screen.test.tsx` (created)
- `src/app/api/interview/[token]/start/route.ts` (created)
- `src/app/api/interview/[token]/start/route.test.ts` (created)
- `src/lib/db/queries.ts` (modified — added createInterview function)
