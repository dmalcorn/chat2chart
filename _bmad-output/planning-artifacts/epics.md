---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-04-08'
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# chat2chart - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for chat2chart, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR70: Worker accesses interview via token-based URL — no login required
FR71: System resolves token to project, process node, interview skill, and interviewee slot
FR72: Welcome/consent screen: process name, AI disclosure, recording/attribution notice, speech capture notice, estimated duration (~90 seconds)
FR73: "Begin Interview" triggers microphone permission and creates active session
FR74: Token state resolution: consent screen (Pending), active interview (Active), read-only view (Completed/Captured)
FR75: Read-only view of confirmed reflective summaries and personal diagram via same token after completion
FR76: Invalid token error: "This link isn't valid. Contact the person who sent it to you."
MVP1: Interview limited to 5-8 exchanges for demo scope (~90 seconds)
FR11a: Red/green recording indicator — red = not recording, green = recording
FR11b: Explicit start recording button (no auto-start)
FR11c: Explicit "Done" button to stop recording (no silence detection)
FR11d: Listening animation while recording is active
FR11e: "Prefer to type?" toggle for text input fallback
FR14: STT via pluggable provider interface (Browser Web Speech API for demo)
FR50: Interview agent AI skill conducts process discovery conversation
MVP2: Interview agent uses "Federal Document Processing" custom domain skill
FR50a: Domain skill loaded by skill-loader.ts, prompt assembled by prompt-assembler.ts — never hardcoded
FR7: Single-panel conversational thread (agent and worker messages in natural order)
FR8: Reflect-and-confirm pattern: agent reformulates scattered speech into reflective summaries, worker confirms or corrects
FR47: Every exchange persisted to DB immediately — never batched
FR48: Each exchange carries exchange_type, segment_id, timestamp, attribution
FR49: Verified reflective summaries (is_verified = true) are the audit trail anchors
FR79: Programmatic NLP extraction via compromise.js at interview completion — no LLM on happy path
FR80: Quality gate: structural validity, completeness (step count vs. summary count), richness (decision points when conditional language exists)
FR81: Automatic LLM fallback when quality gate fails — interviewee never sees failed extraction
FR82: Personal process diagram rendered as simple vertical Mermaid.js flowchart (rounded rectangles, diamonds, arrows)
FR83: Interviewee reviews diagram and confirms or identifies errors
FR84: LLM-based conversational correction flow on exception path (diagram correction agent skill)
FR85: Validated individual schema stored as persistent artifact in Process Schema format
FR22: Synthesis engine correlates multiple interviews for the same process node
FR23: Engine produces normalized workflow with divergence annotations
FR24: Divergence annotations attribute to specific interviewees with confidence levels
FR55a: Minimum 2 captured interviews required to trigger synthesis
MVP3: Synthesis can be re-triggered after third interview completes to incorporate all three
FR33: Synthesis output follows documented Process Schema structure
MVP4: Supervisor signs in via email/password, validated against per-project supervisor allowlist
MVP5: Supervisor accesses review interface at {base_url}/review
MVP6: Mode 1 (default): Full-width individual diagram carousel with left/right navigation, interviewee name + location in header, position indicator (1/3, 2/3, 3/3)
MVP7: Mode 2: Split-screen — pinned synthesis diagram (~55% width) + individual carousel (~45% width). Toggle via "Compare with Synthesis" button
MVP8: Divergence annotations on synthesis diagram are clickable — clicking auto-navigates carousel to relevant interviewee and highlights corresponding step
MVP9: Supervisor can toggle between Mode 1 and Mode 2 freely
MVP10: Viewing only — no editing, no approval, no state transitions
MVP11: Supervisor access: email/password sign-in against per-project allowlist
MVP12: Supervisor allowlist editable by admin directly (no UI)
FR66: PM allowlist via environment variable (infrastructure parity, no PM UI in demo)
FR66a: First PM bootstrapped via environment variable
MVP13: All endpoints require either valid token or authenticated session — no open endpoints on public internet
MVP14: Session expiry: 24h default for supervisor sessions
MVP15: Seed script populates project, process tree (L1 org + L2 leaf), PM account, supervisor account(s)
MVP16: Two completed interviews seeded with full exchange history, validated individual schemas, and personal diagrams (Rachel Torres - Austin, Marcus Williams - Kansas City)
MVP17: One pending interview token seeded for live demo (Janet Park - Ogden)
MVP18: Synthesis result seeded from two completed interviews with divergence annotations
MVP19: Federal Document Processing domain skill definition file included in deployment

### NonFunctional Requirements

NFR1: Interview agent response latency < 3 seconds (first token via SSE)
NFR2: Raw speech transcript never shown to interviewee — first text they see is the agent's reflective summary
NFR9: No interview data in browser localStorage/sessionStorage
NFR10b: Interview tokens: UUID v4, cryptographically random
MVP-NFR1: Demo interview completes in ~90 seconds (5-8 exchanges)
MVP-NFR2: Synthesis visualization loads in < 5 seconds
MVP-NFR3: Supervisor carousel navigation is instant (no reload between slides)
MVP-NFR4: Works in Chrome (latest 2 versions) — primary and only required browser for demo
MVP-NFR5: Deployed on Railway with HTTPS via SSL termination
MVP-NFR6: All LLM calls server-side — API keys never exposed to client

### Additional Requirements

- Starter template: `create-next-app@16` with TypeScript, Tailwind, ESLint, App Router, src directory, Turbopack, followed by shadcn/ui init
- Database: PostgreSQL 17.9 via Railway, Drizzle ORM 0.45.2 with camelCase mode, 12 tables matching parent project schema
- Environment validation: Zod-validated env vars at startup (DATABASE_URL, ANTHROPIC_API_KEY, SESSION_SECRET, PM_EMAIL_ALLOWLIST, FIRST_PM_EMAIL, FIRST_PM_PASSWORD, NODE_ENV)
- Auth infrastructure: bcrypt password hashing (only in config.ts), JWT signed cookies with 24h expiry, PM allowlist via env var
- LLM provider registry: Provider abstraction interface (LLMProvider), Claude provider as single implementation, provider-registry resolves per-project per-skill
- Skill system: skill-loader reads skill.md files from skills/ directory, prompt-assembler combines base template + domain skill, Federal Document Processing skill definition
- Interview API routes with SSE streaming: standardized event format (message, done, error), exchangeType distinguishes question vs reflective_summary
- STT provider: Web Speech API implementation behind pluggable STTProvider interface
- Interview state machine: 5 states (Pending → Active → Completed → Validating → Captured), enforced in state-machine.ts
- NLP extraction pipeline: compromise.js programmatic extraction → quality gate (structural + completeness + richness) → LLM fallback
- Synthesis engine: five-stage pipeline with checkpoints (Stage 3: Match, Stage 4: Classify, Stage 5: Narrate)
- Seed script: idempotent, uses Drizzle query functions (no raw SQL), deterministic UUIDs, all seeded data passes Zod validation
- Service boundary enforcement: @anthropic-ai/sdk only in src/lib/ai/, Drizzle only in src/lib/db/, bcrypt only in src/lib/auth/config.ts, compromise only in schema-extractor.ts, Web Speech API only in src/lib/stt/, process tree operations only through src/lib/process/
- Migrations: drizzle-kit push for development, drizzle-kit generate + migrate for production
- Infrastructure: Railway single service + PostgreSQL add-on, auto-deploy from GitHub main

### UX Design Requirements

UX-DR1: ConsentScreen component — Typeform-inspired centered card on gradient background (primary-soft → background), max-width 560px, shadow-lg, warm info blocks (AI disclosure, speech capture, attribution notice), "Begin Interview" full-width primary button, estimated ~90 seconds duration display
UX-DR2: ConversationThread component — Single-column scrollable container (max-width 800px centered), left-aligned agent messages (max-width 75%), right-aligned user messages (max-width 75%), reflective summaries left-aligned (max-width 80%), 16px gap between messages, 32px gap with Separator between reflect-and-confirm cycles, auto-scroll to latest message, fixed MicBar at bottom
UX-DR3: ReflectiveSummaryCard component — Violet background (#F5F3FF) with violet border (#C4B5FD, 1.5px), "REFLECTIVE SUMMARY" label (12px uppercase, #7C3AED, letter-spacing 0.04em), body text 18px weight 500, SSE token-by-token streaming, four states: Streaming → Awaiting confirmation (Confirm + "That's not right" buttons) → Confirmed (green checkmark badge) or Correction requested
UX-DR4: SpeechCard component — Right-aligned raw speech card (max-width 75%), white background with border, only appears after "Done" click (never during recording), timestamp in muted-foreground, "Processing your response..." indicator before text reveal
UX-DR5: MicBar component — Fixed bottom of conversation, 48px circle mic button, four states: Idle (red border, "Tap to start"), Recording (green bg, pulse-ring animation, "Recording...", Done button), Processing (disabled), Text mode (text input field). "Prefer to type?" toggle always visible, right-aligned
UX-DR6: ActiveListeningState component — Right-aligned in conversation thread during recording, success-soft background with green border, pulsing green dot (6px, opacity animation), 8 waveform bars (3px wide, varying heights 8-28px, green), "I'm hearing you..." text, "Words appear after Done" helper
UX-DR7: DiagramCanvas component — Shared pan/zoom Mermaid.js wrapper with controls overlay (top-right: +, -, Fit buttons), card background with 12px radius. Three variants: Individual interview (max-width 700px, confirm/correct buttons below), Individual carousel (max-width 700px, no buttons), Synthesis (full panel width, divergence badges on nodes, clickable nodes). Text alternative via <details><summary>
UX-DR8: IndividualDiagramCarousel component — Mode 1 full-width: left/right arrow navigation, header with interviewee name + location + position indicator (1/3), "Compare with Synthesis" button. Mode 2 compact (~45% width right panel): condensed header, smaller arrows. Instant navigation (no reload). Arrow keys for keyboard navigation
UX-DR9: DivergenceAnnotation component — Teal badges on synthesis nodes (accent-soft bg, white text pill). Three types: Genuinely Unique (teal), Sequence Conflict (darker teal), Uncertain (amber/warning). Detail card with 3px teal left border, explanation text, source tags. Click auto-navigates carousel to relevant interviewee + highlights corresponding step with teal glow (box-shadow)
UX-DR10: ComparisonView (Mode 2) — 55/45 split-screen layout at 1200px+ (synthesis pinned left, carousel right), slide-in transition 200-300ms CSS, "Back to Individual Review" button to return to Mode 1
UX-DR11: Design token system implementation — CSS custom properties for full color palette (primary blue #2563EB, accent teal #0D9488, summary violet #F5F3FF, success green #16A34A, warning amber #D97706, destructive red #DC2626), spacing scale (4px base), border radius tokens (6px-9999px), shadow system (sm/md/lg), Inter font with defined type scale (12px-36px)
UX-DR12: Login form component — Email + password inputs, "Sign In" primary button, inline error message ("Access not available. Contact your project manager."), helper text below password field, Enter submits, no "remember me" or "forgot password"
UX-DR13: Error state screens — Invalid token: full-page centered card with destructive icon, "This link isn't valid. Contact the person who sent it to you." Unsupported device (<768px): full-page centered message with warning icon, "This experience requires a tablet or desktop screen."
UX-DR14: Read-only completed view — Post-interview view via same token showing confirmed reflective summaries with green checkmark badges, personal validated diagram, "Thank you for sharing your expertise" message
UX-DR15: Loading and transition patterns — Skeleton components matching final layout (no spinners), content fades in (no pop-in), no layout shift. Typing indicator (three animated dots) before agent responses. SSE streaming word-by-word. Diagram generation: agent message + pulsing placeholder 2-5 sec + fade in
UX-DR16: Accessibility — WCAG 2.1 Level A: focus indicators (2px solid primary, 2px offset) on all interactive elements via :focus-visible, aria-live="polite" on dynamic content (speech cards, streaming responses, confirmed badges), role="article" on summary cards, semantic HTML, keyboard navigation for all flows, 44px minimum touch targets at 768px, color independence for all information
UX-DR17: Responsive breakpoints — <768px: unsupported (full-page message). 768-1023px tablet: full-width thread, 520px consent card, 44px touch targets, Mode 2 NOT available. 1024-1199px desktop: 800px thread, 560px consent, 700px diagram. 1200px+: full experience including Mode 2 comparison
UX-DR18: Supervisor top bar — Brand icon + app name + project name on left, user avatar + name on right, not clickable, informational context only
UX-DR19: Feedback patterns — No toast notifications anywhere, all feedback inline at point of action. Summary confirmed: green checkmark replaces buttons on violet card. Diagram validated: card transitions, status → Captured. Auth failure: inline below form. Agent unavailable: system message in conversation with retry
UX-DR20: Button hierarchy — One primary button per section (blue), Confirm variant (green, only for validating interviewee content), Secondary (outlined, supporting actions), Ghost (text only, low emphasis). No destructive actions in demo

### FR Coverage Map

FR70: Epic 2 - Interview token-based URL access
FR71: Epic 2 - Token resolves to project/node/skill/interviewee
FR72: Epic 2 - Consent screen content (process name, AI disclosure, recording notice, duration)
FR73: Epic 2 - "Begin Interview" triggers mic permission and active session
FR74: Epic 2 - Token state resolution (Pending/Active/Completed/Captured)
FR75: Epic 3 - Read-only view of confirmed summaries and diagram post-completion
FR76: Epic 2 - Invalid token error message
MVP1: Epic 2 - Interview limited to 5-8 exchanges
FR11a: Epic 3 - Red/green recording indicator
FR11b: Epic 3 - Explicit start recording button
FR11c: Epic 3 - Explicit "Done" button to stop recording
FR11d: Epic 3 - Listening animation while recording
FR11e: Epic 3 - "Prefer to type?" toggle fallback
FR14: Epic 3 - STT via pluggable provider interface
FR50: Epic 3 - Interview agent conducts process discovery conversation
MVP2: Epic 3 - Federal Document Processing domain skill
FR50a: Epic 3 - Skill loaded by skill-loader, prompt assembled by prompt-assembler
FR7: Epic 3 - Single-panel conversational thread
FR8: Epic 3 - Reflect-and-confirm pattern
FR47: Epic 3 - Every exchange persisted to DB immediately
FR48: Epic 3 - Exchange carries type, segment_id, timestamp, attribution
FR49: Epic 3 - Verified reflective summaries as audit trail anchors
FR79: Epic 3 - NLP extraction via compromise.js
FR80: Epic 3 - Quality gate (structural, completeness, richness)
FR81: Epic 3 - Automatic LLM fallback on quality gate failure
FR82: Epic 3 - Personal diagram as Mermaid.js flowchart
FR83: Epic 3 - Interviewee reviews and confirms diagram
FR84: Epic 3 - LLM correction flow for diagram errors
FR85: Epic 3 - Validated schema stored in Process Schema format
FR22: Epic 4 - Synthesis correlates multiple interviews
FR23: Epic 4 - Normalized workflow with divergence annotations
FR24: Epic 4 - Divergence annotations with interviewee attribution and confidence
FR55a: Epic 4 - Minimum 2 captured interviews to trigger synthesis
MVP3: Epic 4 - Synthesis re-triggerable after 3rd interview
FR33: Epic 4 - Synthesis output follows Process Schema structure
MVP4: Epic 5 - Supervisor signs in via email/password against allowlist
MVP5: Epic 5 - Supervisor accesses review at /review
MVP6: Epic 5 - Mode 1: full-width individual diagram carousel
MVP7: Epic 5 - Mode 2: split-screen synthesis + carousel
MVP8: Epic 5 - Clickable divergence annotations auto-navigate carousel
MVP9: Epic 5 - Toggle between Mode 1 and Mode 2
MVP10: Epic 5 - Viewing only, no editing
MVP11: Epic 5 - Supervisor email/password sign-in
MVP12: Epic 5 - Supervisor allowlist editable by admin
FR66: Epic 1 - PM allowlist via environment variable
FR66a: Epic 1 - First PM bootstrapped via env var
MVP13: Epic 1 - All endpoints require valid token or authenticated session
MVP14: Epic 5 - Session expiry 24h
MVP15: Epic 6 - Seed script populates project, process tree, accounts
MVP16: Epic 6 - Two completed interviews seeded with full data
MVP17: Epic 6 - Pending interview token seeded for Janet Park
MVP18: Epic 6 - Synthesis result seeded from two interviews
MVP19: Epic 6 - Federal Document Processing skill definition included
NFR1: Epic 3 - Agent response latency < 3s first token
NFR2: Epic 3 - Raw speech never shown to interviewee
NFR9: Epic 3 - No interview data in browser storage
NFR10b: Epic 2 - Interview tokens UUID v4
MVP-NFR1: Epic 3 - Demo interview ~90 seconds
MVP-NFR2: Epic 4 - Synthesis visualization < 5s
MVP-NFR3: Epic 5 - Instant carousel navigation
MVP-NFR4: Epic 1 - Chrome latest 2 versions
MVP-NFR5: Epic 1 - Railway deployment with HTTPS
MVP-NFR6: Epic 1 - All LLM calls server-side

## Epic List

### Epic 1: Project Foundation & Infrastructure
The development environment, database, auth infrastructure, and seed data framework are operational — developers can build and deploy the application.
**FRs covered:** FR66, FR66a, MVP13, MVP-NFR4, MVP-NFR5, MVP-NFR6

### Epic 2: Interview Access & Consent
A worker clicks a token link and lands on the correct screen — consent for pending, read-only for completed, error for invalid. The consent screen establishes trust and the worker can begin the interview.
**FRs covered:** FR70, FR71, FR72, FR73, FR74, FR76, MVP1, NFR10b
**UX-DRs:** UX-DR1, UX-DR11, UX-DR13, UX-DR17

### Epic 3: Voice Interview & Process Capture
The worker conducts a full voice conversation with the AI interview agent — speaking naturally, seeing reflective summaries, confirming or correcting, and having every exchange persisted. At completion, the system extracts their individual process schema and renders a personal diagram they validate.
**FRs covered:** FR7, FR8, FR11a-e, FR14, FR47, FR48, FR49, FR50, FR50a, MVP2, FR75, FR79, FR80, FR81, FR82, FR83, FR84, FR85
**NFRs:** NFR1, NFR2, NFR9, MVP-NFR1
**UX-DRs:** UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR6, UX-DR7 (individual), UX-DR14, UX-DR15, UX-DR16, UX-DR19, UX-DR20

### Epic 4: Synthesis Engine
Given 2+ captured interviews, the synthesis engine produces a normalized workflow with divergence annotations — the intellectual core of the product. Synthesis results are persisted and retrievable.
**FRs covered:** FR22, FR23, FR24, FR33, FR55a, MVP3
**NFRs:** MVP-NFR2

### Epic 5: Supervisor Review Experience
A supervisor signs in, browses individual diagrams in a carousel, toggles to the split-screen comparison with synthesis, and clicks divergence annotations to navigate between interviewees — the "aha moment."
**FRs covered:** MVP4, MVP5, MVP6, MVP7, MVP8, MVP9, MVP10, MVP11, MVP12, MVP14
**NFRs:** MVP-NFR3
**UX-DRs:** UX-DR7 (synthesis + carousel), UX-DR8, UX-DR9, UX-DR10, UX-DR12, UX-DR18

### Epic 6: Demo Seed Data & Polish
The complete demo dataset is seeded — two completed interviews, one pending token, synthesis with divergences — and the application is demo-ready with all error states, loading patterns, and edge cases handled.
**FRs covered:** MVP15, MVP16, MVP17, MVP18, MVP19
**UX-DRs:** UX-DR15 (polish)

## Epic 1: Project Foundation & Infrastructure

The development environment, database, auth infrastructure, and seed data framework are operational — developers can build and deploy the application.

### Story 1.1: Initialize Next.js Project with Approved Tech Stack

As a developer,
I want the project scaffolded with all approved dependencies and configuration,
So that I can begin building features on a consistent foundation.

**Acceptance Criteria:**

**Given** no existing project
**When** the init script runs
**Then** a Next.js 16.2.2 app is created with TypeScript, Tailwind 4.2.2, ESLint, App Router, src directory, Turbopack, and `@/*` import alias
**And** shadcn/ui v4 is initialized with the project's CSS custom property token system
**And** Vitest 4.1.2, @testing-library/react 16.3.2, and Playwright 1.59.1 are installed
**And** Prettier 3.8.1, Husky 9.1.7, lint-staged 16.4.0 are configured for pre-commit quality
**And** all dependency versions are pinned exactly (no `^` or `~`)
**And** the directory structure matches the Architecture document (`src/lib/`, `src/components/`, `src/hooks/`, `src/types/`, `skills/`, `e2e/`)
**And** `npm run dev` starts successfully with Turbopack

### Story 1.2: Database Schema & Connection

As a developer,
I want the PostgreSQL database schema defined and connectable via Drizzle ORM,
So that features can persist and query data.

**Acceptance Criteria:**

**Given** the project from Story 1.1
**When** the database schema is defined
**Then** all 12 tables from the Architecture document exist in `src/lib/db/schema.ts` using Drizzle with camelCase mode
**And** `src/lib/db/connection.ts` establishes a connection using `DATABASE_URL` from environment
**And** `src/lib/db/queries.ts` exports reusable query functions (no raw SQL outside `src/lib/db/`)
**And** `drizzle.config.ts` is configured for migrations
**And** tables include `created_at` and `updated_at` timestamps
**And** foreign key relationships match the Architecture data model

### Story 1.3: Environment Validation & Auth Infrastructure

As a developer,
I want Zod-validated environment variables and the auth infrastructure in place,
So that the application starts safely and auth is ready for features.

**Acceptance Criteria:**

**Given** the database from Story 1.2
**When** the app starts
**Then** `src/lib/env.ts` validates `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SESSION_SECRET`, `PM_EMAIL_ALLOWLIST`, `FIRST_PM_EMAIL`, `FIRST_PM_PASSWORD`, `NODE_ENV` via Zod and fails fast with clear messages on missing/invalid vars
**And** `src/lib/auth/config.ts` configures bcrypt password hashing (bcrypt imported only here)
**And** `src/lib/auth/session.ts` implements JWT signed cookie creation, validation, and 24h expiry
**And** `src/lib/auth/middleware.ts` provides route-handler wrappers for session checks
**And** PM allowlist is read from `PM_EMAIL_ALLOWLIST` env var (FR66)
**And** first PM account can be bootstrapped from `FIRST_PM_EMAIL` + `FIRST_PM_PASSWORD` (FR66a)
**And** all endpoints return `{ error: { message, code } }` for unauthenticated requests (MVP13)

### Story 1.4: LLM Provider Registry & Claude Provider

As a developer,
I want the LLM provider abstraction and Claude implementation in place,
So that AI features can call the provider registry without importing SDKs directly.

**Acceptance Criteria:**

**Given** the auth infrastructure from Story 1.3
**When** an AI feature needs LLM access
**Then** `src/lib/ai/provider.ts` defines the `LLMProvider` adapter interface
**And** `src/lib/ai/provider-registry.ts` resolves providers per-project per-skill
**And** `src/lib/ai/claude-provider.ts` implements `LLMProvider` using `@anthropic-ai/sdk` 0.85.0
**And** `@anthropic-ai/sdk` is imported only in `src/lib/ai/` (service boundary enforced)
**And** all LLM calls are server-side only — no API keys exposed to client (MVP-NFR6)
**And** the provider supports SSE streaming with standardized event format (message, done, error)

## Epic 2: Interview Access & Consent

A worker clicks a token link and lands on the correct screen — consent for pending, read-only for completed, error for invalid. The consent screen establishes trust and the worker can begin the interview.

### Story 2.1: Interview Token System & API Route

As an interviewee,
I want to click a token-based link and have the system resolve my identity and interview context,
So that I can access my interview without creating an account.

**Acceptance Criteria:**

**Given** a URL `{base_url}/interview/{token}`
**When** the token is valid
**Then** `GET /api/interview/[token]` returns the project, process node, interview skill, and interviewee slot (FR71)
**And** `src/lib/interview/token.ts` validates tokens as UUID v4 (NFR10b)
**And** the response includes the current interview state: Pending, Active, Completed, or Captured (FR74)
**And** no login or account creation is required — the token is the credential (FR70)

**Given** an invalid or nonexistent token
**When** the API is called
**Then** it returns `{ error: { message: "This link isn't valid. Contact the person who sent it to you.", code: "INVALID_TOKEN" } }` with HTTP 404 (FR76)

### Story 2.2: Token State Resolution & Page Routing

As an interviewee,
I want the interview page to show the right screen based on my token's state,
So that I always see what's contextually appropriate.

**Acceptance Criteria:**

**Given** a valid token with state Pending
**When** I visit `/interview/{token}`
**Then** I see the consent screen (FR74)

**Given** a valid token with state Active
**When** I visit
**Then** I see the active interview conversation

**Given** a valid token with state Completed or Captured
**When** I visit
**Then** I see the read-only completed view (FR74)

**Given** an invalid token
**When** I visit
**Then** I see the invalid token error screen (UX-DR13)

**Given** a device with viewport < 768px
**When** I visit any interview URL
**Then** I see "This experience requires a tablet or desktop screen" (UX-DR13, UX-DR17)
**And** a loading skeleton matching the consent card layout displays while the token resolves (UX-DR15)

### Story 2.3: Consent Screen & Interview Initiation

As an interviewee,
I want a warm, clear consent screen that tells me what will happen before I start,
So that I feel safe and informed.

**Acceptance Criteria:**

**Given** a Pending token resolves
**When** the consent screen renders
**Then** it displays the process name ("Receive and Digitize Incoming Mail"), AI disclosure, recording/attribution notice, speech capture notice, and estimated duration (~90 seconds) (FR72)
**And** the screen uses a Typeform-inspired centered card (max-width 560px) on gradient background (primary-soft → background) with shadow-lg (UX-DR1)
**And** info blocks use muted background with icon + text, 8px radius (UX-DR1)
**And** the design token system (CSS custom properties) is applied: primary blue, accent teal, summary violet, neutrals, spacing scale, border radius tokens, shadow system, Inter font type scale (UX-DR11)

**Given** the interviewee clicks "Begin Interview"
**When** the button is pressed
**Then** the browser requests microphone permission and the interview state transitions to Active (FR73)
**And** the "Begin Interview" button is full-width, primary style, 16px weight 600 (UX-DR1)

## Epic 3: Voice Interview & Process Capture

The worker conducts a full voice conversation with the AI interview agent — speaking naturally, seeing reflective summaries, confirming or correcting, and having every exchange persisted. At completion, the system extracts their individual process schema and renders a personal diagram they validate.

### Story 3.1: Skill Loader, Prompt Assembler & Federal Document Processing Skill

As a developer,
I want the interview skill system operational with the demo domain skill loaded,
So that the interview agent has domain-specific context for its conversations.

**Acceptance Criteria:**

**Given** the skill system needs configuration
**When** a skill is requested
**Then** `src/lib/interview/skill-loader.ts` reads and validates skill.md files from the `skills/` directory (FR50a)
**And** `src/lib/ai/prompts/prompt-assembler.ts` combines the base interview template with the loaded domain skill into an assembled prompt (FR50a)
**And** `src/lib/ai/prompts/base-template.ts` defines the core interview agent behavior (reflect-and-confirm pattern, 5-8 exchange limit) (FR8, MVP1)
**And** `skills/federal-document-processing/skill.md` exists with domain context, probing targets, vocabulary, and follow-up strategies for IRS DPT workflows (MVP2)
**And** interview prompts are never hardcoded — always assembled from skill + base template

### Story 3.2: Interview Session Management & Exchange Persistence

As a developer,
I want interview session tracking and immediate exchange persistence,
So that every conversation turn is durably stored the moment it happens.

**Acceptance Criteria:**

**Given** an Active interview session
**When** an exchange occurs
**Then** `src/lib/interview/session.ts` manages session state and segment tracking
**And** every exchange is persisted to DB immediately on creation — never batched (FR47)
**And** each exchange record carries `exchange_type` (question, response, reflective_summary, confirmation, revised_summary), `segment_id`, `sequence_number`, timestamp, and attribution (FR48)
**And** `is_verified` is set to true only on reflective_summary or revised_summary that the interviewee confirmed (FR49)
**And** `src/lib/synthesis/state-machine.ts` enforces interview state transitions (Pending → Active → Completed → Validating → Captured)
**And** no interview data is stored in browser localStorage/sessionStorage (NFR9)

### Story 3.3: Interview Message API with SSE Streaming

As an interviewee,
I want to send messages and receive the AI agent's responses in real-time via streaming,
So that the conversation feels natural and responsive.

**Acceptance Criteria:**

**Given** an Active interview
**When** I send a message via `POST /api/interview/[token]/messages`
**Then** the route loads the skill via skill-loader, assembles the prompt, and calls the LLM provider via provider-registry (FR50)
**And** the agent response streams via SSE with events: `message` (content + exchangeType), `done` (ids), `error` (message + code)
**And** `exchangeType` distinguishes `question` from `reflective_summary` so the UI renders them differently
**And** first token latency is < 3 seconds (NFR1)
**And** the agent uses the reflect-and-confirm pattern: reformulates speech into reflective summaries, asks for confirmation (FR8)
**And** the agent probes for decision points, exceptions, handoffs, and systems touched per the domain skill

### Story 3.4: Voice Input Controls & STT Provider

As an interviewee,
I want to speak naturally using my microphone with clear recording controls,
So that I can describe my work without friction.

**Acceptance Criteria:**

**Given** an Active interview with mic permission granted
**When** I interact with the MicBar
**Then** I see a 48px circle mic button with four states: Idle (red border, "Tap to start"), Recording (green bg, pulse-ring animation, "Recording...", Done button), Processing (disabled), Text mode (UX-DR5)
**And** recording indicator shows red = not recording, green = recording (FR11a)
**And** I click to start recording explicitly (no auto-start) (FR11b)
**And** I click "Done" to stop recording (no silence detection) (FR11c)
**And** a waveform animation displays during recording with "I'm hearing you..." (ActiveListeningState, right-aligned) (FR11d, UX-DR6)
**And** "Prefer to type?" toggle is always visible for text input fallback (FR11e, UX-DR5)
**And** `src/lib/stt/provider.ts` defines the `STTProvider` interface, `src/lib/stt/web-speech-provider.ts` implements it for Browser Web Speech API (FR14)
**And** raw speech transcript is never shown while recording — first text the interviewee sees is the agent's reflective summary (NFR2)

### Story 3.5: Conversation Thread UI

As an interviewee,
I want a clean, familiar messaging interface for my interview conversation,
So that I can focus on describing my work.

**Acceptance Criteria:**

**Given** an Active interview
**When** conversation exchanges occur
**Then** the ConversationThread renders as a single-panel scrollable container (max-width 800px centered) with MicBar fixed at bottom (FR7, UX-DR2)
**And** agent messages (questions) are left-aligned (max-width 75%) with primary-soft background and Avatar icon (UX-DR2)
**And** SpeechCards (user's raw speech) appear right-aligned (max-width 75%) with white background only after "Done" is clicked, with "Processing your response..." indicator first (UX-DR4, NFR2)
**And** ReflectiveSummaryCards are left-aligned (max-width 80%) with violet background (#F5F3FF), violet border (#C4B5FD), "REFLECTIVE SUMMARY" label (12px uppercase, #7C3AED), body text 18px weight 500 (UX-DR3)
**And** ReflectiveSummaryCards have four states: Streaming (token-by-token), Awaiting confirmation ("Confirm" primary + "That's not right" ghost), Confirmed (green checkmark badge), Correction requested (UX-DR3)
**And** 16px gap between messages, 32px gap with Separator between reflect-and-confirm cycles (UX-DR2)
**And** thread auto-scrolls to latest message, pauses auto-scroll when user scrolls up (UX-DR2)
**And** typing indicator (three animated dots) appears before agent responses (UX-DR15)
**And** all interactive elements have focus indicators (2px solid primary, 2px offset) via `:focus-visible` (UX-DR16)
**And** `aria-live="polite"` on speech cards, streaming responses, and confirmed badges (UX-DR16)
**And** button hierarchy: one primary per section, Confirm (green) only for validation, Ghost for low emphasis (UX-DR20)

### Story 3.6: Individual Process Schema Extraction & Diagram Generation

As an interviewee,
I want the system to extract my described process and show me a personal diagram I can validate,
So that I can confirm my knowledge was captured accurately.

**Acceptance Criteria:**

**Given** an interview reaches completion (5-8 exchanges)
**When** extraction runs
**Then** `src/lib/interview/schema-extractor.ts` performs programmatic NLP extraction via compromise.js (FR79)
**And** compromise is imported only in `schema-extractor.ts` (service boundary)
**And** a quality gate checks structural validity (Zod), completeness (step count vs. summary count), and richness (decision points when conditional language exists) (FR80)
**And** if quality gate fails, automatic LLM fallback is triggered transparently — interviewee never sees a failed extraction (FR81)
**And** `src/lib/interview/individual-mermaid-generator.ts` converts the schema to a simple vertical Mermaid.js flowchart (rounded rectangles for steps, diamonds for decisions, arrows for flow) (FR82)
**And** the diagram is presented in a DiagramCanvas (max-width 700px, 12px radius, pan/zoom controls top-right, text alternative via `<details><summary>`) with "Yes, that looks right" (green primary) and "Something's not right" (ghost) buttons (FR83, UX-DR7)
**And** "Let me put together what you described..." message appears with pulsing placeholder (2-5 sec) before diagram fades in (UX-DR15)
**And** the validated individual schema is stored as a persistent artifact in Process Schema format (FR85)
**And** on confirmation, interview state transitions to Captured via state machine

### Story 3.7: Diagram Correction Flow & Read-Only Completed View

As an interviewee,
I want to correct my diagram if something's wrong and see a read-only view after completion,
So that my process is accurately captured and I can revisit it.

**Acceptance Criteria:**

**Given** the interviewee clicks "Something's not right" on their diagram
**When** they describe the error
**Then** `POST /api/interview/[token]/schema/correct` triggers the diagram correction agent via SSE streaming (FR84)
**And** `src/lib/ai/prompts/correction-template.ts` defines the LLM correction agent behavior
**And** `src/lib/interview/correction-agent.ts` orchestrates the correction session
**And** the corrected schema is re-validated, Mermaid diagram regenerated, and re-presented for validation
**And** the correction flow feels collaborative, not adversarial (UX principle)

**Given** the interviewee confirms the diagram (original or corrected)
**When** state transitions to Captured
**Then** the same token URL shows the read-only completed view (FR75)
**And** the read-only view displays confirmed reflective summaries with green checkmark badges and the validated personal diagram (UX-DR14)
**And** a "Thank you for sharing your expertise" message is displayed (UX-DR14)

## Epic 4: Synthesis Engine

Given 2+ captured interviews, the synthesis engine produces a normalized workflow with divergence annotations — the intellectual core of the product. Synthesis results are persisted and retrievable.

### Story 4.1: Synthesis Engine Pipeline & Step Matching

As the system,
I want to correlate steps across multiple captured interviews,
So that a normalized workflow can be constructed from individual accounts.

**Acceptance Criteria:**

**Given** 2+ interviews with status Captured for the same process node
**When** synthesis is triggered via `POST /api/synthesis/[nodeId]`
**Then** `src/lib/synthesis/engine.ts` orchestrates the five-stage pipeline (FR22)
**And** a guard validates minimum 2 Captured interviews before proceeding (FR55a)
**And** Stage 3 (Match): `src/lib/synthesis/correlator.ts` matches steps across interviews using the 5 match types from the parent architecture
**And** `src/lib/ai/prompts/synthesis/match-template.ts` defines the LLM prompt for step matching
**And** match results are persisted as a synthesis checkpoint in `synthesis_checkpoints` table
**And** the synthesis output follows the documented Process Schema structure (FR33)

### Story 4.2: Divergence Classification & Narrative Generation

As the system,
I want to classify divergences between interviews and generate human-readable explanations,
So that supervisors can understand where and why processes differ.

**Acceptance Criteria:**

**Given** step matching (Stage 3) is complete
**When** classification runs
**Then** Stage 4 (Classify): `src/lib/synthesis/divergence.ts` identifies divergences and implicit steps, attributing each to specific interviewees with confidence levels (FR23, FR24)
**And** `src/lib/ai/prompts/synthesis/classify-template.ts` defines the classification prompt
**And** classification results are persisted as a synthesis checkpoint
**And** Stage 5 (Narrate): `src/lib/synthesis/narrator.ts` generates human-readable explanations for each divergence (FR23)
**And** `src/lib/ai/prompts/synthesis/narrate-template.ts` defines the narration prompt
**And** the final synthesis result is stored in `synthesis_results` with the normalized workflow, divergence annotations, and match metadata

### Story 4.3: Synthesis Mermaid Generation & Retrieval API

As a supervisor,
I want the synthesis results rendered as a diagram and retrievable via API,
So that the comparison view can display them.

**Acceptance Criteria:**

**Given** a completed synthesis result
**When** the Mermaid diagram is generated
**Then** `src/lib/synthesis/mermaid-generator.ts` converts the synthesis JSON to a Mermaid flowchart with divergence annotation markers on nodes (FR23)
**And** divergence annotations are encoded in the Mermaid definition so they can be rendered as clickable badges
**And** `GET /api/synthesis/[nodeId]` returns the synthesis results including normalized workflow, divergence annotations, individual schemas, and Mermaid definitions
**And** synthesis visualization loads in < 5 seconds (MVP-NFR2)
**And** synthesis can be re-triggered after a new interview completes to incorporate additional data (MVP3)
**And** the API response follows `{ data: T }` wrapper format

## Epic 5: Supervisor Review Experience

A supervisor signs in, browses individual diagrams in a carousel, toggles to the split-screen comparison with synthesis, and clicks divergence annotations to navigate between interviewees — the "aha moment."

### Story 5.1: Supervisor Authentication & Login Page

As a supervisor,
I want to sign in with my email and password,
So that I can access the review interface for my project.

**Acceptance Criteria:**

**Given** I navigate to `/review` without a session
**When** I am redirected
**Then** I see the login page at `/auth/login` with email input, password input, and "Sign In" primary button (UX-DR12)
**And** `POST /api/auth/login` validates credentials against the per-project supervisor allowlist in `project_supervisors` table (MVP4, MVP11)
**And** on success, a JWT signed cookie session is created with 24h expiry and I am redirected to `/review` (MVP14)
**And** on failure, an inline error message appears below the form: "Access not available. Contact your project manager." (UX-DR12)
**And** helper text below password reads: "This is a project-specific password..." (UX-DR12)
**And** Enter submits the form. No "remember me" or "forgot password" (UX-DR12)
**And** `POST /api/auth/logout` destroys the session. `GET /api/auth/session` validates the current session (MVP13)
**And** the supervisor allowlist is editable by admin directly, no UI (MVP12)

### Story 5.2: Individual Diagram Carousel (Mode 1)

As a supervisor,
I want to browse each interviewee's personal diagram in a full-width carousel,
So that I can form my own impressions before seeing the synthesis.

**Acceptance Criteria:**

**Given** I am authenticated and on `/review`
**When** the page loads
**Then** I see Mode 1: a full-width individual diagram carousel (MVP6, UX-DR8)
**And** left/right arrow buttons navigate between interviewees (MVP6)
**And** the header shows interviewee name, location, and position indicator (e.g., "Rachel Torres — Austin, TX (1/3)") (MVP6, UX-DR8)
**And** a sublabel shows validation date and step count (UX-DR8)
**And** each slide displays the interviewee's validated personal diagram in a DiagramCanvas (max-width 700px, pan/zoom controls) (UX-DR7)
**And** carousel navigation is instant — no page reload between slides (MVP-NFR3)
**And** left/right arrow keys navigate the carousel (UX-DR8, UX-DR16)
**And** a "Compare with Synthesis" button is visible below the carousel (MVP7)
**And** a supervisor top bar shows brand icon + app name + project name on left, user avatar + name on right (UX-DR18)
**And** viewing only — no editing, no approval, no state transitions (MVP10)

### Story 5.3: Synthesis Comparison View (Mode 2) with Divergence Navigation

As a supervisor,
I want to compare the synthesized workflow against individual diagrams side-by-side and click divergences to navigate,
So that I can discover where processes differ.

**Acceptance Criteria:**

**Given** I am in Mode 1
**When** I click "Compare with Synthesis"
**Then** the view transitions to Mode 2: split-screen with synthesis pinned left (~55%) and individual carousel right (~45%) (MVP7, UX-DR10)
**And** the synthesis panel slides in from the left with a 200-300ms CSS transition (UX-DR10)
**And** the synthesis diagram renders in a DiagramCanvas (full panel width) with divergence annotation badges on nodes (UX-DR7, UX-DR9)
**And** divergence badges are teal pills with three types: "Genuinely Unique" (teal), "Sequence Conflict" (darker teal), "Uncertain — Needs Review" (amber) (UX-DR9)

**Given** I click a divergence badge
**When** the click registers
**Then** the carousel auto-navigates to the relevant interviewee and highlights the corresponding step with a teal glow (box-shadow: 0 0 0 3px rgba(13,148,136,0.25)) (MVP8, UX-DR9)
**And** a divergence detail card appears with 3px teal left border, explanation text, source tags, and confidence level (UX-DR9)
**And** I can toggle back to Mode 1 via "Back to Individual Review" button (MVP9, UX-DR10)
**And** Mode 2 requires 1200px+ viewport width; below 1200px only Mode 1 is available (UX-DR17)
**And** Enter on a divergence badge triggers auto-navigation (UX-DR16)

## Epic 6: Demo Seed Data & Polish

The complete demo dataset is seeded — two completed interviews, one pending token, synthesis with divergences — and the application is demo-ready with all error states, loading patterns, and edge cases handled.

### Story 6.1: Seed Script — Project, Process Tree & Accounts

As a developer,
I want the foundational demo data seeded — project, process tree, and user accounts,
So that the application has the structural context for interviews and supervisor access.

**Acceptance Criteria:**

**Given** the database schema exists
**When** `npx tsx src/lib/db/seed.ts` runs
**Then** the project "IRS Taxpayer Document Processing Discovery" is created (MVP15)
**And** the process tree is seeded: L1 organizational root ("Taxpayer Document Processing") + L2 leaf ("Receive and Digitize Incoming Mail") (MVP15)
**And** a PM account is bootstrapped from `FIRST_PM_EMAIL` + `FIRST_PM_PASSWORD` env vars (MVP15)
**And** supervisor account(s) are created and added to the per-project supervisor allowlist (MVP15)
**And** the Federal Document Processing domain skill definition exists at `skills/federal-document-processing/skill.md` (MVP19)
**And** the skill-provider mapping (interview_agent → Claude) is seeded in `project_skill_providers`
**And** the seed script is idempotent — checks for existing data before inserting (safe to run multiple times)
**And** the seed script uses Drizzle query functions (no raw SQL) and logs what it creates
**And** UUIDs for seed data are deterministic (hardcoded, not random) for reproducibility

### Story 6.2: Seed Script — Completed Interviews & Synthesis

As a demo presenter,
I want two completed interviews and a synthesis result pre-seeded with realistic data,
So that the supervisor view has content to display from the start.

**Acceptance Criteria:**

**Given** project and process tree are seeded
**When** interview seed data is created
**Then** two completed interviews exist: Rachel Torres (Austin, TX) and Marcus Williams (Kansas City, MO) with status Captured (MVP16)
**And** each interview has 5-8 exchanges following the reflect-and-confirm segment structure with `exchange_type`, `segment_id`, `is_verified` (exactly one `is_verified = true` per segment) (MVP16)
**And** each interview has a validated individual process schema that passes Zod validation against the Process Schema (MVP16)
**And** each interview has a personal Mermaid.js diagram definition that renders a valid flowchart (MVP16)
**And** structured captures (verb-object-purpose decomposition) exist for each interview
**And** one pending interview token is seeded for Janet Park (Ogden, UT) with status Pending (MVP17)
**And** a synthesis result is seeded from the two completed interviews with three divergence annotations: sort timing, classification method, QC check (MVP18)
**And** synthesis checkpoints (Match + Classify stage results) are seeded
**And** all seeded data passes the same Zod validation as live data
**And** synthesis divergence annotations reference correct interviewee data

### Story 6.3: Demo Polish & Error States

As a demo presenter,
I want all error states, loading patterns, and edge cases polished,
So that the demo runs smoothly end-to-end.

**Acceptance Criteria:**

**Given** the full application is functional
**When** reviewing for demo readiness
**Then** all loading states use skeleton components matching final layout — no spinners, no layout shift, content fades in (UX-DR15)
**And** the invalid token error screen renders correctly with destructive icon and actionable message (UX-DR13)
**And** the unsupported device screen renders correctly at < 768px (UX-DR13)
**And** agent unavailable errors show an inline system message in conversation with retry (UX-DR19)
**And** the demo flow works end-to-end: open Janet Park's pending link → consent → interview → diagram validation → switch to supervisor → carousel → comparison → divergence click
**And** the fallback plan is verified: if live interview has issues, Janet's interview can be pre-seeded as a third completed interview
**And** LLM error handling retries once with exponential backoff, then shows "The AI agent is temporarily unavailable"
