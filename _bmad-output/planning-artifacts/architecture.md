---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-08'
inputDocuments:
  - prd.md
  - ux-design-specification.md
  - project-context.md
  - coding-standards.md
  - approved-tech-stack.md
  - ref_docs/architecture.md
workflowType: 'architecture'
project_name: 'chat2chart'
user_name: 'Diane'
date: '2026-04-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
~40 requirements spanning 6 domains. The interview flow (FR70-76, FR7-8, FR47-49, FR50-50a, MVP1-2) and individual schema extraction (FR79-85) form the critical path for the live demo. Synthesis (FR22-24, FR33, FR55a, MVP3) is the intellectual core but operates on seeded data for 2 of 3 interviews. Supervisor viewing (MVP4-10) is read-only — architecturally simpler but UX-rich. Authentication (FR66-66a, FR70, MVP11-14) spans two planes with different credential models.

**Non-Functional Requirements:**
- **Performance:** < 3s first-token SSE latency (NFR1), < 5s synthesis visualization load (MVP-NFR2), instant carousel navigation (MVP-NFR3)
- **Security:** No client-side interview data storage (NFR9), server-side-only LLM calls (MVP-NFR6), UUID v4 tokens (NFR10b)
- **Platform:** Chrome latest 2 versions only (MVP-NFR4), Railway deployment with HTTPS (MVP-NFR5)
- **UX:** Raw speech transcript never shown to interviewee during recording (NFR2), ~90 second interview target (MVP-NFR1)

**Scale & Complexity:**

- Primary domain: Full-stack web (Next.js App Router + PostgreSQL + LLM integration)
- Complexity level: Medium — focused demo scope with genuine architectural depth in streaming, NLP pipeline, synthesis engine, and dual auth
- Estimated architectural components: ~15 major modules (auth, interview flow, voice input, SSE streaming, exchange persistence, NLP extraction, quality gate, LLM fallback, synthesis engine, Process Schema, Mermaid rendering, diagram canvas, supervisor carousel, comparison view, seed script)

### Technical Constraints & Dependencies

- **Parent project alignment:** Tech stack, coding standards, service boundaries, and design system are inherited from chat2bpmn. Architecture decisions must stay compatible.
- **Single LLM provider (Claude):** Provider abstraction built but only one implementation needed for demo.
- **Single STT provider (Web Speech API):** Browser-native, Chrome-optimized. No server-side STT.
- **Single domain skill (Federal Document Processing):** Skill-loader/prompt-assembler architecture built but only one skill definition needed.
- **Seeded demo data:** Two of three interviews are pre-seeded. The seed script is a first-class architectural concern — it must produce valid exchange histories, verified summaries, individual schemas, personal diagrams, and a synthesis result with divergence annotations.
- **No PM UI:** Project/process tree creation is seeded, not user-driven. No management plane UI needed.
- **No editing capability:** Supervisor is view-only. No review agent, no state transitions, no approval workflow.
- **Railway deployment:** Single Next.js service + PostgreSQL add-on. No separate microservices.

### Cross-Cutting Concerns Identified

1. **Process Schema as universal data contract** — The same Zod-validated JSON structure flows from individual extraction through synthesis to Mermaid rendering and export. Schema changes cascade everywhere.
2. **Source attribution (three-source model)** — Every element carries `sourceType`. Attribution rules must be enforced at the extraction and synthesis layers, not the UI layer.
3. **Immediate exchange persistence** — Every interview exchange hits the DB on creation. This is load-bearing for audit trail and (in the full product) session resumability.
4. **State machine transitions** — Interview states (Pending → Active → Completed → Captured) and synthesis states drive what the UI renders and what operations are allowed.
5. **SSE streaming pattern** — Standardized event format (`message`, `done`, `error`) used by both the interview agent and potentially diagram correction agent.
6. **Service boundary enforcement** — LLM SDKs, Drizzle, bcrypt, compromise each confined to specific directories. This is a hard rule from the parent project. _(Note: bpmn-moddle was listed here originally but is not MVP scope — BPMN export excluded from MVP PRD.)_

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (Next.js App Router + PostgreSQL + LLM integration). The approved tech stack and architectural patterns are fully specified by the parent project (chat2bpmn) architecture document. chat2chart is a proper subset — same stack, same patterns, same data model, reduced scope.

### Starter Options Considered

| Option | Verdict | Rationale |
|---|---|---|
| `create-next-app@16` | **Selected** | Defaults align with approved stack. Thin scaffolding — layer on exactly what's needed from the parent's dependency list. |
| T3 Stack (`create-t3-app`) | Rejected | Brings tRPC and NextAuth, neither in approved stack. |
| Fork parent project codebase | Not applicable | Parent has no code yet — both in planning phase. |

### Selected Starter: create-next-app@16

**Rationale for Selection:**
Next.js 16's `create-next-app` defaults to TypeScript, Tailwind CSS, ESLint, App Router, and Turbopack — matching the parent project's approved tech stack exactly. The parent architecture document provides the complete directory structure, service boundaries, data model, and implementation patterns. We adopt those verbatim and scope down.

**Initialization Command:**

```bash
npx create-next-app@16 chat2chart --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --turbopack
cd chat2chart
npx shadcn@latest init
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:** TypeScript with strict mode. Node.js runtime. Turbopack stable for dev and builds.

**Styling Solution:** Tailwind CSS 4.2.2 with CSS-first config. shadcn/ui initialized separately.

**Build Tooling:** Turbopack (default in Next.js 16).

**Testing Framework:** Vitest 4.1.2, @testing-library/react 16.3.2, Playwright 1.59.1 added from approved tech stack.

**Code Organization:** `src/` directory, App Router in `src/app/`, `@/*` import alias. Full directory structure inherited from parent architecture, scoped to demo features only.

**Development Experience:** ESLint 10.2.0 flat config. Prettier 3.8.1, Husky 9.1.7, lint-staged 16.4.0 for pre-commit quality.

### Relationship to Parent Architecture

The parent architecture document ([ref_docs/architecture.md](ref_docs/architecture.md)) is the authoritative reference for all shared patterns. chat2chart adopts the following verbatim:

- **Data model** — Same table definitions, same JSONB patterns, same Drizzle camelCase mode
- **Service boundaries** — Same import restrictions (LLM SDKs only in `src/lib/ai/`, Drizzle only in `src/lib/db/`, etc.)
- **API patterns** — Same REST + SSE, same response wrappers, same error format
- **Provider abstractions** — Same LLMProvider and STTProvider adapter interfaces
- **Skill system** — Same skill-loader → prompt-assembler → provider-registry chain
- **Interview agent architecture** — Same reflect-and-confirm pattern, exchange types, segment grouping
- **Synthesis engine** — Same five-stage pipeline with checkpoints
- **NLP extraction pipeline** — Same compromise.js → quality gate → LLM fallback
- **Naming conventions** — All naming rules identical
- **Implementation patterns** — All error handling, validation, loading state patterns identical

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Already Decided (inherited from parent architecture — adopted verbatim):**
- Data modeling: Relational tables + JSONB for workflow artifacts (Drizzle ORM 0.45.2, PostgreSQL 17.9)
- API pattern: REST + SSE, management plane vs. interview plane separation
- LLM/STT provider abstraction interfaces (LLMProvider, STTProvider)
- Process Schema design (Zod-validated JSON, `src/lib/schema/workflow.ts`)
- Authentication: Email/password with bcrypt, JWT signed cookies, PM allowlist, interview tokens as UUID v4
- Frontend: Server Components default, Client Components at leaves, no global state, feature-based component dirs
- Infrastructure: Railway single service + PostgreSQL add-on, Zod-validated env vars
- All naming conventions, service boundaries, error handling patterns, SSE event formats

**Critical Decisions (Scope-Down for Demo):**
- Which tables to include (all parent tables, seeded rather than user-created)
- Which API routes to include (interview plane + auth + synthesis viewing, no management plane)
- Which UI components to build (interview experience + supervisor viewing, no PM dashboard)
- Interview state machine simplification (drop Paused state)
- Seed script architecture (first-class concern — produces all demo data)

**Deferred Decisions (Not Applicable to Demo):**
- PM dashboard UI
- Process decomposition UI
- Supervisor editing / review agent
- State transitions / approval workflow
- BPMN 2.0 export
- Multiple LLM/STT providers
- Multiple domain skills
- Session resumability (pause/resume)
- CORS for third-party consumers
- Structured logging, CI/CD, horizontal scaling

### Data Architecture

**Database:** PostgreSQL 17.9 via Railway add-on. Drizzle ORM 0.45.2 with camelCase mode (TypeScript camelCase → PostgreSQL snake_case automatically). Same schema definitions as parent project.

**Tables (all included, most seeded):**

| Table | Seeded? | Live Data? | Purpose |
|---|---|---|---|
| `projects` | Yes | No | Single project record |
| `process_nodes` | Yes | No | L1 org root + L2 leaf node |
| `users` | Yes | No | PM + supervisor accounts |
| `project_supervisors` | Yes | No | Per-project supervisor allowlist |
| `project_skill_providers` | Yes | No | Single skill-provider mapping (interview_agent → Claude) |
| `interview_tokens` | Yes | No | 2 completed + 1 pending (Janet Park) |
| `interviews` | Yes | Yes | 2 seeded completed + 1 live |
| `interview_exchanges` | Yes | Yes | 2 seeded histories + live exchanges |
| `individual_process_schemas` | Yes | Yes | 2 seeded validated + 1 generated live |
| `structured_captures` | Yes | Yes | Extraction output per interview |
| `synthesis_results` | Yes | Yes | Seeded from 2 interviews, re-triggered with 3 |
| `synthesis_checkpoints` | Yes | Yes | Pipeline stage persistence |

**Schema pattern:** Identical to parent — relational tables for entities, JSONB columns for workflow artifacts (`schema_json`, `workflow_json`, `result_json`). No tables added or removed. Interview exchanges carry `exchange_type`, `segment_id`, `is_verified`, `sequence_number` exactly as specified in parent architecture.

**Validation:** Zod schemas at API boundaries. Drizzle handles DB constraints. Process Schema validated against `src/lib/schema/workflow.ts`.

**Migrations:** `drizzle-kit push` for development, `drizzle-kit generate` + `drizzle-kit migrate` for production.

### Authentication & Security

**Supervisor Authentication (promoted to MVP for demo):**
- Email/password sign-in at `/review` (MVP11)
- Per-project supervisor allowlist in `project_supervisors` table (seeded, not PM-managed)
- JWT signed cookie with 24h expiry (MVP14)
- Login validates against supervisor allowlist → session created → redirect to review interface
- Failed login: "Access not available. Contact your project manager." (MVP11)

**PM Authentication (infrastructure parity):**
- PM account seeded via `FIRST_PM_EMAIL` + `FIRST_PM_PASSWORD` env vars (FR66a)
- PM allowlist maintained via `PM_EMAIL_ALLOWLIST` env var (FR66)
- No PM UI — auth infrastructure exists for parent project compatibility

**Interview Token Identity:**
- UUID v4 tokens, cryptographically random (NFR10b)
- Token resolves to project, process node, skill, and interviewee slot (FR71)
- Token isolation: grants access to exactly one interview session
- No expiration for demo scope

**Security rules (inherited from parent):**
- All LLM calls server-side via API routes — API keys never exposed to client
- No interview data in browser localStorage/sessionStorage (NFR9)
- HTTPS via Railway SSL termination
- Passwords hashed with bcrypt before storage (bcrypt only in `src/lib/auth/config.ts`)

### API & Communication Patterns

**Included Routes:**

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Supervisor (and PM) sign-in |
| `/api/auth/logout` | POST | Session destruction |
| `/api/auth/session` | GET | Session validation |
| `/api/interview/[token]` | GET | Token resolution — returns session state and context |
| `/api/interview/[token]/messages` | POST | Send message → SSE stream of agent response |
| `/api/interview/[token]/schema` | GET | Individual process schema + Mermaid diagram |
| `/api/interview/[token]/schema` | POST | Confirm diagram validation → Captured |
| `/api/interview/[token]/schema/correct` | POST | Correction message → SSE stream of corrected schema |
| `/api/synthesis/[nodeId]` | POST | Trigger synthesis (re-trigger after 3rd interview) |
| `/api/synthesis/[nodeId]` | GET | Retrieve synthesis results for supervisor viewing |

**Excluded Routes (no PM UI, no management plane):**
- `/api/projects/**` — Project CRUD, process tree management, settings, supervisors
- `/api/skills/` — Skill listing (single skill, seeded)
- `/api/schema/` — Schema documentation endpoint
- `/api/projects/[projectId]/synthesis/review/**` — Phase 2 supervisor editing
- `/api/projects/[projectId]/synthesis/approve/` — Phase 2 approval
- `/api/projects/[projectId]/synthesis/bpmn/` — BPMN export

**API patterns (inherited from parent):**
- Success: `{ data: T }` or `{ data: T[], count: number }`
- Error: `{ error: { message: string, code: string } }` + HTTP status
- SSE events: `message` (content + exchangeType), `done` (ids), `error` (message + code)
- Zod validation on all incoming request bodies

### Frontend Architecture

**Interview Experience (Client Components):**

| Component | Source Dir | Purpose |
|---|---|---|
| ConsentScreen | `interview/` | Welcome/consent — process name, AI disclosure, ~90s estimate |
| ConversationThread | `interview/` | Single-panel scrollable thread with left/right alignment |
| ReflectiveSummaryCard | `interview/` | Violet card with SSE streaming + confirm/correct |
| SpeechCard | `interview/` | Right-aligned raw speech after Done |
| MicBar | `interview/` | Recording controls with red/green indicator |
| ActiveListeningState | `interview/` | Waveform animation during recording |
| DiagramCanvas | `diagram/` | Pan/zoom Mermaid.js wrapper (shared) |
| diagram-review | `interview/` | Personal diagram validation with confirm/correct |
| correction-panel | `interview/` | LLM correction conversation UI |
| read-only-view | `interview/` | Post-completion confirmed summaries + diagram |
| invalid-token | `interview/` | Error: "This link isn't valid" |
| unsupported-device | `interview/` | Error: "Requires a larger screen" |

**Supervisor Experience:**

| Component | Source Dir | Purpose |
|---|---|---|
| Login page | `auth/` | Email/password sign-in |
| IndividualDiagramCarousel | `supervisor/` | Mode 1 full-width + Mode 2 compact |
| DiagramCanvas (synthesis) | `diagram/` | Synthesis diagram with divergence badges |
| DivergenceAnnotation | `supervisor/` | Teal badges + detail cards + click-to-navigate |
| Comparison view | `supervisor/` | 55/45 split-screen (1200px+) |

**Not built (excluded from demo):**
- All `project/` components (project-card, create-project-form, process-tree, process-node-detail, decomposition-guide, breadcrumb-nav, node-status-badge, interview-list, generate-link-dialog, synthesis-readiness, project-settings, config-history, provider-summary, supervisor-manager)
- Phase 2 synthesis components (review-agent-panel, review-summary, edit-history, approval-controls, status-indicator)
- bpmn-chart

**State management:** Server Components for initial data loads. Client Components with `useState`/`useReducer` for interview session state, recording state, carousel position, mode toggle. No global state library.

**Performance:** Mermaid.js dynamically imported (no SSR). Route-based code splitting automatic via App Router.

### Interview State Machine (Simplified)

5 states (parent has 6 — Paused state dropped per PRD exclusion of session resumability):

```
Pending → Active → Completed → Validating → Captured
```

| Current State | Event | Next State | Action |
|---|---|---|---|
| Pending | Interviewee opens link | Active | Initialize session, begin agent conversation |
| Active | Interviewee signals done | Completed | Persist final transcript, run structured extraction |
| Completed | NLP schema extraction succeeds | Validating | Generate individual schema + Mermaid diagram, present to interviewee |
| Validating | Interviewee confirms diagram | Captured | Set validation_status: validated, schema is human-confirmed artifact |
| Validating | Interviewee requests correction | Validating | LLM correction cycle, regenerate diagram, re-present |

**Implementation:** `src/lib/synthesis/state-machine.ts` — same service-level enforcement as parent. Routes call this module; they do not contain transition logic directly.

### Seed Script Architecture

The seed script (`src/lib/db/seed.ts`) is a first-class architectural concern. It produces the complete demo dataset.

**Seeded entities:**

1. **Project:** "IRS Taxpayer Document Processing Discovery"
2. **Process tree:** L1 organizational root ("Taxpayer Document Processing") + L2 leaf ("Receive and Digitize Incoming Mail")
3. **PM account:** Bootstrapped via `FIRST_PM_EMAIL` + `FIRST_PM_PASSWORD`
4. **Supervisor account(s):** On per-project supervisor allowlist
5. **Two completed interviews** (Rachel Torres — Austin, Marcus Williams — Kansas City):
   - Full exchange histories (5-8 exchanges each, reflect-and-confirm pattern with `exchange_type`, `segment_id`, `is_verified`)
   - Validated individual process schemas (Process Schema JSON)
   - Personal Mermaid.js diagram definitions
   - Structured captures (verb-object-purpose decomposition)
   - Status: Captured
6. **One pending interview token:** Janet Park (Ogden), status: Pending
7. **Synthesis result:** Generated from two completed interviews with divergence annotations (sort timing, classification method, QC check divergences)
8. **Synthesis checkpoints:** Match + Classify stage results
9. **Federal Document Processing domain skill:** Skill definition file at `skills/federal-document-processing/skill.md`
10. **Skill-provider mapping:** interview_agent → Claude in `project_skill_providers`

**Seed data quality requirements:**
- Exchange histories must follow valid reflect-and-confirm segment structure
- Exactly one `is_verified = true` per segment
- Individual schemas must pass Zod validation against Process Schema
- Mermaid definitions must render valid flowcharts
- Synthesis divergence annotations must reference correct interviewee data
- Three expected divergences seeded: sort timing, classification method, QC check

**Execution:** `npx tsx src/lib/db/seed.ts` — idempotent (checks for existing data before inserting).

### Infrastructure & Deployment

- **Hosting:** Railway — single Next.js service + PostgreSQL add-on (identical to parent)
- **Environment variables:** `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SESSION_SECRET`, `PM_EMAIL_ALLOWLIST`, `FIRST_PM_EMAIL`, `FIRST_PM_PASSWORD`, `NODE_ENV`. Zod-validated at startup via `src/lib/env.ts`.
- **CI/CD:** Railway auto-deploy from GitHub `main`. Tests run locally before push.
- **No OPENAI_API_KEY** — single provider (Claude) for demo

### Decision Impact Analysis

**Implementation Sequence:**
1. Project init (`create-next-app` + shadcn/ui + Drizzle + dependencies)
2. Database schema (all tables from parent, Drizzle camelCase mode)
3. Environment validation (`src/lib/env.ts`)
4. Auth infrastructure (bcrypt config, JWT sessions, login/logout routes, middleware)
5. LLM provider registry + Claude provider (single provider)
6. Skill loader + prompt assembler + Federal Document Processing skill definition
7. Interview API routes + SSE streaming
8. STT provider (Web Speech API) + voice input hook
9. Interview UI (consent screen → conversation thread → voice controls)
10. Individual schema extraction pipeline (compromise.js → quality gate → LLM fallback)
11. Diagram generation + validation UI
12. Diagram correction agent (exception path)
13. Synthesis engine (five-stage pipeline with checkpoints)
14. Synthesis Mermaid generation
15. Supervisor auth + login page
16. Supervisor viewing UI (carousel + comparison + divergence navigation)
17. Seed script (all demo data)
18. Read-only completed view (same token, post-completion)
19. Polish, error states, and demo prep

**Cross-Component Dependencies:**
- Process Schema (`workflow.ts`) must be finalized before extraction, synthesis, and Mermaid generation
- LLM provider registry consumed by interview agent, synthesis engine, and correction agent
- Interview token system consumed by all `/api/interview/[token]` routes
- NLP extraction depends on structured capture completing first
- Individual Mermaid generator depends on schema-extractor output
- Synthesis depends on ≥2 Captured interviews (guard in state machine)
- Supervisor viewing depends on synthesis results existing
- Seed script depends on all other components being structurally complete

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 categories (naming, structure, format, communication, process) — all resolved by the parent architecture. chat2chart inherits every pattern verbatim. This section documents the authoritative rules and adds demo-specific patterns.

### Naming Patterns

**Database Naming Conventions (Drizzle camelCase mode):**
- Tables: `snake_case`, plural — `projects`, `interviews`, `interview_exchanges`, `interview_tokens`
- Columns: `snake_case` — `project_id`, `created_at`, `interviewee_name`
- Foreign keys: `{referenced_table_singular}_id` — `project_id`, `interview_id`
- Indexes: `idx_{table}_{column}` — `idx_interviews_project_id`
- Drizzle camelCase mode handles mapping — TypeScript uses camelCase, PostgreSQL columns are auto-generated snake_case. Zero manual mapping.

**API Naming Conventions:**
- Endpoints: plural nouns, lowercase — `/api/interview`, `/api/auth`
- Route params: `[camelCase]` — `[token]`, `[nodeId]`
- Query params: `camelCase` — `?sortBy=createdAt`
- JSON response fields: `camelCase` — `{ projectId, createdAt, intervieweeRole }`

**Code Naming Conventions:**
- Files: `kebab-case.ts` / `.tsx` — `interview-panel.tsx`, `llm-provider.ts`
- Components: `PascalCase` — `InterviewPanel`, `ConsentScreen`
- Functions/variables: `camelCase` — `getProjectById`, `interviewCount`
- Types/interfaces: `PascalCase` — `Interview`, `SynthesisResult`, `WorkflowStep`
- Constants: `UPPER_SNAKE_CASE` — `MAX_INTERVIEW_DURATION`, `DEFAULT_STT_PROVIDER`

### Structure Patterns

**Project Organization:**
- Tests co-located with source files — `interview-panel.test.tsx` next to `interview-panel.tsx`
- Playwright E2E tests in `e2e/` at project root
- Barrel exports (`index.ts`) only for directories with 3+ public exports
- Server Components default; `"use client"` pushed to leaf components

**Component Organization:**
- `src/components/interview/` — Client Components only, skill-agnostic
- `src/components/supervisor/` — Supervisor viewing components
- `src/components/diagram/` — Shared diagram canvas
- `src/components/ui/` — shadcn/ui primitives (auto-managed by CLI)
- `src/components/auth/` — Login form component
- `src/components/shared/` — Header, footer if needed

### Format Patterns

**API Response Formats:**
- Success: `{ data: T }` — always wrapped
- Error: `{ error: { message: string, code: string } }` with appropriate HTTP status
- Lists: `{ data: T[], count: number }`
- Dates: ISO 8601 strings — `"2026-04-06T18:30:00Z"`

**SSE Event Formats:**
- Agent tokens: `event: message`, `data: { content: string, exchangeType: string }`
- Completion: `event: done`, `data: { interviewExchangeId: string, segmentId: string }`
- Errors: `event: error`, `data: { message: string, code: string }`
- `exchangeType` tells the UI whether incoming content is a `question` or `reflective_summary` for distinct rendering

### Process Patterns

**Error Handling:**
- API routes: try/catch at route handler level, return consistent error JSON. Never leak stack traces.
- LLM errors: Retry once with exponential backoff. If retry fails: "The AI agent is temporarily unavailable."
- SSE streams: emit typed error events for client-side handling
- Client: React error boundaries at page level

**Loading States:**
- Route-level: `loading.tsx` convention (App Router)
- Component-level: `isLoading` boolean → skeleton or spinner
- SSE streaming: typing indicator while waiting for first token, then stream content
- Skeletons over spinners. No layout shift. Content fades in.

**Validation:**
- Zod schemas in `src/lib/schema/` — shared between API validation and client-side form validation
- Validate at API boundary. Trust internal code after validation.
- Drizzle schema handles DB constraints

### Seed Data Patterns (Demo-Specific)

**Seed script conventions:**
- Located at `src/lib/db/seed.ts`
- Idempotent: checks for existing data before inserting (safe to run multiple times)
- Uses the same Drizzle query functions as production code — no raw SQL in seed script
- All seeded data must pass the same Zod validation as live data
- UUIDs for seed data are deterministic (hardcoded in seed script, not randomly generated) to enable reliable test assertions and demo reproducibility
- Seed script logs what it creates: "Created project: IRS Taxpayer Document Processing Discovery"

**Seed data validation:**
- Exchange histories follow valid reflect-and-confirm segment structure
- Individual schemas pass Zod validation against Process Schema
- Mermaid definitions render valid flowcharts (verified manually before shipping)
- Synthesis divergence annotations reference correct interviewee data

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow the naming conventions above — no exceptions
- Use the `{ data: T }` / `{ error: { message, code } }` response wrapper for every API route
- Co-locate tests with source files
- Use Zod for all API request validation
- Use the provider abstraction interface for LLM calls — never call `@anthropic-ai/sdk` directly from a route handler
- Include `createdAt` and `updatedAt` timestamps on every database table
- Use the state machine module for interview state transitions — never transition states in route handlers directly
- Persist every interview exchange to DB immediately on creation — never batch

**Anti-Patterns to Avoid:**
- Direct Anthropic SDK calls outside `src/lib/ai/` — breaks model-agnostic abstraction
- Storing interview data in browser localStorage/sessionStorage — violates NFR9
- Unwrapped API responses (returning raw data without `{ data: T }` wrapper)
- PascalCase or camelCase database table/column names — Drizzle camelCase mode handles the mapping
- Global state libraries (Redux, Zustand) — Server Components + local state only
- Catch-all error handlers that swallow errors silently — always log and return structured error
- Hardcoded interview prompts — always use skill-loader → prompt-assembler
- Importing Drizzle outside `src/lib/db/` — routes call query functions only

## Project Structure & Boundaries

### Complete Project Directory Structure

```
chat2chart/
├── README.md
├── package.json
├── next.config.ts
├── postcss.config.mjs                  # Tailwind v4 CSS-first (no tailwind.config.ts)
├── tsconfig.json
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── components.json                     # shadcn/ui config
├── .env.local                          # Local dev: DATABASE_URL, ANTHROPIC_API_KEY, SESSION_SECRET, PM_EMAIL_ALLOWLIST, FIRST_PM_EMAIL, FIRST_PM_PASSWORD
├── .env.example                        # Template for env vars
├── .gitignore
│
├── e2e/                                # Playwright end-to-end tests
│   ├── interview-flow.spec.ts
│   └── supervisor-viewing.spec.ts
│
├── skills/                             # Interview skill definitions (root-level)
│   └── federal-document-processing/    # Demo skill
│       └── skill.md                    # Persona, probe elements, synthesis elements for IRS DPT workflow
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx                  # Root layout (fonts, metadata)
│   │   ├── page.tsx                    # Landing — redirect to /interview or /review based on context
│   │   ├── error.tsx                   # Root error boundary
│   │   │
│   │   ├── interview/
│   │   │   └── [token]/
│   │   │       ├── page.tsx            # Token state resolver — consent, active, validating, read-only, or error
│   │   │       └── loading.tsx         # Skeleton while token resolves
│   │   │
│   │   ├── review/
│   │   │   ├── page.tsx               # Supervisor review — requires auth, loads synthesis + individual diagrams
│   │   │   └── loading.tsx            # Skeleton while data loads
│   │   │
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── page.tsx            # Email/password login page
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts        # POST — email/password login, session creation
│   │       │   ├── logout/
│   │       │   │   └── route.ts        # POST — session destruction
│   │       │   └── session/
│   │       │       └── route.ts        # GET — current session validation
│   │       ├── interview/
│   │       │   └── [token]/
│   │       │       ├── route.ts        # GET — token resolution (session state, project/skill context)
│   │       │       ├── messages/
│   │       │       │   └── route.ts    # POST — send message → SSE stream
│   │       │       └── schema/
│   │       │           ├── route.ts    # GET (schema + diagram), POST (confirm validation → Captured)
│   │       │           └── correct/
│   │       │               └── route.ts # POST — correction message → SSE stream
│   │       └── synthesis/
│   │           └── [nodeId]/
│   │               └── route.ts        # POST (trigger synthesis), GET (retrieve results)
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components (auto-managed)
│   │   ├── interview/
│   │   │   ├── consent-screen.tsx      # Welcome/consent: process name, AI disclosure, ~90s estimate
│   │   │   ├── conversation-thread.tsx # Single-panel scrollable thread, left/right alignment, fixed mic bar
│   │   │   ├── reflective-summary-card.tsx  # Violet card with SSE streaming + confirm/correct
│   │   │   ├── speech-card.tsx         # Right-aligned raw speech after Done
│   │   │   ├── mic-bar.tsx             # Recording controls: red/green indicator, start/done, "Prefer to type?"
│   │   │   ├── active-listening-state.tsx   # Waveform animation during recording
│   │   │   ├── diagram-review.tsx      # Personal diagram validation with confirm/correct buttons
│   │   │   ├── correction-panel.tsx    # LLM correction conversation UI
│   │   │   ├── read-only-view.tsx      # Post-completion confirmed summaries + diagram
│   │   │   ├── invalid-token.tsx       # Error: "This link isn't valid"
│   │   │   └── unsupported-device.tsx  # Error: "Requires a larger screen"
│   │   ├── supervisor/
│   │   │   ├── individual-diagram-carousel.tsx  # Mode 1 full-width + Mode 2 compact
│   │   │   ├── divergence-annotation.tsx        # Teal badges + detail cards + click-to-navigate
│   │   │   └── comparison-view.tsx              # 55/45 split-screen layout (1200px+)
│   │   ├── diagram/
│   │   │   └── diagram-canvas.tsx      # Pan/zoom Mermaid.js wrapper (shared between interview + supervisor)
│   │   ├── auth/
│   │   │   └── login-form.tsx          # Email + password form with error display
│   │   └── shared/
│   │       └── top-bar.tsx             # Supervisor top bar (brand + project name + user)
│   │
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── config.ts              # PM allowlist, session settings, bcrypt password hashing
│   │   │   ├── session.ts             # JWT session creation, validation, expiry
│   │   │   ├── middleware.ts          # Auth middleware — wraps route handlers with session check
│   │   │   └── index.ts
│   │   ├── ai/
│   │   │   ├── provider.ts            # LLMProvider adapter interface
│   │   │   ├── provider-registry.ts   # Provider registry — register/resolve per-project per-skill
│   │   │   ├── claude-provider.ts     # Anthropic Claude implementation
│   │   │   ├── prompts/
│   │   │   │   ├── base-template.ts   # Core interview agent behavior (reflect-and-confirm)
│   │   │   │   ├── prompt-assembler.ts # Loads skill + base → assembled prompt
│   │   │   │   ├── correction-template.ts  # LLM correction agent for diagram errors
│   │   │   │   └── synthesis/
│   │   │   │       ├── match-template.ts    # Stage 3: Step matching
│   │   │   │       ├── classify-template.ts # Stage 4: Divergence classification
│   │   │   │       └── narrate-template.ts  # Stage 5: Explanation generation
│   │   │   └── index.ts
│   │   ├── stt/
│   │   │   ├── provider.ts            # STTProvider adapter interface
│   │   │   ├── web-speech-provider.ts # Browser Web Speech API implementation
│   │   │   └── index.ts
│   │   ├── schema/
│   │   │   ├── workflow.ts            # Process Schema (Zod) — single source of truth
│   │   │   ├── api-requests.ts        # Zod schemas for API request validation
│   │   │   ├── api-responses.ts       # Response type definitions
│   │   │   └── index.ts
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle table definitions (all 12 tables)
│   │   │   ├── queries.ts            # Reusable query functions
│   │   │   ├── connection.ts         # Database connection setup
│   │   │   ├── seed.ts              # Demo seed script (idempotent)
│   │   │   └── migrations/          # Generated migration files
│   │   ├── interview/
│   │   │   ├── session.ts            # Interview session management, segment tracking
│   │   │   ├── capture.ts            # Structured extraction from verified reflective summaries
│   │   │   ├── schema-extractor.ts   # NLP pipeline: compromise.js → quality gate → LLM fallback
│   │   │   ├── individual-mermaid-generator.ts  # Schema JSON → simple vertical Mermaid flowchart
│   │   │   ├── correction-agent.ts   # LLM correction session orchestration
│   │   │   ├── token.ts             # Token generation and validation
│   │   │   └── skill-loader.ts      # Reads/validates skill.md files
│   │   ├── synthesis/
│   │   │   ├── engine.ts            # Five-stage pipeline orchestration with checkpoints
│   │   │   ├── correlator.ts        # Stage 3: Match — step matching with 5 match types
│   │   │   ├── divergence.ts        # Stage 4: Classify — divergence + implicit step classification
│   │   │   ├── narrator.ts          # Stage 5: Narrate — explanations + framework matrix
│   │   │   ├── mermaid-generator.ts # Synthesis JSON → Mermaid definition (divergence annotations)
│   │   │   └── state-machine.ts     # Interview state transitions (5 states)
│   │   ├── env.ts                   # Zod-validated environment variables
│   │   └── utils.ts                 # General utilities (cn, formatDate, etc.)
│   │
│   ├── hooks/
│   │   ├── use-interview.ts          # Interview session state management
│   │   ├── use-speech-to-text.ts     # STT provider hook
│   │   └── use-mermaid.ts            # Mermaid.js rendering hook (dynamic import)
│   │
│   └── types/
│       └── index.ts                  # Re-exports from schema
```

### Architectural Boundaries

**API Boundaries:**
- `/api/auth/**` — Public. Login, logout, session check.
- `/api/interview/[token]/**` — Token-authenticated. Interview plane — session init, messages (SSE), schema operations, correction.
- `/api/synthesis/[nodeId]/**` — Authenticated (supervisor session). Synthesis trigger and results retrieval.

**Component Boundaries:**
- `src/components/interview/` — Client Components only. Skill-agnostic — renders whatever the agent sends via SSE. No direct LLM calls.
- `src/components/supervisor/` — Renders synthesis data and individual diagrams. Read-only — no editing, no state transitions.
- `src/components/diagram/` — Shared DiagramCanvas used by both interview (individual) and supervisor (synthesis + individual carousel).

**Service Boundaries (strictly enforced):**
- `src/lib/ai/` — Only place that imports `@anthropic-ai/sdk`. All other code calls `LLMProvider` interface.
- `src/lib/db/` — Only place that imports Drizzle. Routes call query functions, never raw SQL.
- `src/lib/auth/config.ts` — Only place that imports `bcrypt`.
- `src/lib/interview/schema-extractor.ts` — Only place that imports `compromise`.
- `src/lib/stt/` — Only place that touches Web Speech API.
- `src/lib/interview/skill-loader.ts` — Only place that reads from `skills/` directory.
- `src/lib/ai/prompts/prompt-assembler.ts` — Only place where skill definitions meet LLM prompts.
- `src/lib/synthesis/state-machine.ts` — Only place that manages interview state transitions.

**Data Flow:**
```
Interview initiation:
  Worker clicks token URL → GET /api/interview/[token]
  → token resolved → state checked:
     Pending → consent screen → "Begin Interview" → mic permission → Active
     Completed/Captured → read-only view
     Invalid → error message

Interview session:
  Token → project → skill_name → skill-loader reads skill.md
  → provider-registry resolves Claude for interview_agent skill
  → prompt-assembler (base template + domain skill) → Claude
  → POST /api/interview/[token]/messages → SSE stream
  → Worker speaks → Done → speech captured → agent reflects → worker confirms
  → Each exchange persisted to DB immediately
  → Interview complete → structured extraction (capture.ts)

Individual schema generation:
  Completed interview → schema-extractor.ts
  → PRIMARY: compromise.js programmatic NLP
  → QUALITY GATE: structural (Zod) + completeness + richness
  → Pass → proceed | Fail → LLM fallback (transparent to interviewee)
  → individual-mermaid-generator.ts → simple flowchart
  → Interview → Validating → present diagram
  → Confirm → Captured | Correct → LLM correction cycle → re-present

Synthesis:
  ≥2 Captured interviews → POST /api/synthesis/[nodeId]
  → Stage 3: Match (correlator.ts) → checkpoint
  → Stage 4: Classify (divergence.ts) → checkpoint
  → Stage 5: Narrate (narrator.ts) → synthesis_results
  → Mermaid generator → synthesis diagram definition

Supervisor viewing:
  Supervisor → /auth/login → session created → redirect to /review
  → GET /api/synthesis/[nodeId] → synthesis results + individual schemas
  → Mode 1: carousel through individual diagrams
  → Mode 2: split-screen — synthesis pinned left, carousel right
  → Click divergence badge → carousel navigates to relevant interviewee
```

### Requirements to Structure Mapping

| FR Category | Primary Location | Supporting Files |
|---|---|---|
| Interview Access & Flow (FR70-76, MVP1) | `src/app/interview/[token]/`, `src/components/interview/` | `src/lib/interview/token.ts`, `src/lib/interview/session.ts` |
| Voice Input (FR11a-e, FR14) | `src/components/interview/mic-bar.tsx`, `src/lib/stt/` | `src/hooks/use-speech-to-text.ts` |
| Interview Agent (FR50, MVP2, FR7-8, FR47-49) | `src/app/api/interview/[token]/messages/`, `src/lib/ai/prompts/` | `src/lib/interview/skill-loader.ts`, `skills/federal-document-processing/` |
| Individual Process Schema (FR79-85) | `src/lib/interview/schema-extractor.ts`, `src/lib/interview/individual-mermaid-generator.ts` | `src/lib/interview/correction-agent.ts`, `src/components/interview/diagram-review.tsx` |
| Synthesis (FR22-24, FR33, FR55a, MVP3) | `src/lib/synthesis/` | `src/lib/ai/prompts/synthesis/`, `src/lib/interview/skill-loader.ts` |
| Supervisor Viewing (MVP4-10) | `src/app/review/`, `src/components/supervisor/` | `src/components/diagram/diagram-canvas.tsx`, `src/hooks/use-mermaid.ts` |
| Authentication (FR66-66a, FR70, MVP11-14) | `src/lib/auth/`, `src/app/api/auth/`, `src/app/auth/` | `src/lib/env.ts`, `src/lib/db/schema.ts` |
| Seeded Data (MVP15-19) | `src/lib/db/seed.ts` | `src/lib/db/schema.ts`, `src/lib/db/queries.ts` |

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible: Next.js 16.2.2 + Drizzle ORM 0.45.2 + PostgreSQL 17.9 + shadcn/ui CLI v4 + Tailwind 4.2.2 + Vitest + Playwright. SSE streaming natively supported. Mermaid.js dynamic import is a standard App Router pattern. All versions match the parent project's approved tech stack.

**Pattern Consistency:**
Drizzle camelCase mode resolves DB↔TypeScript naming. API response format consistent across all routes. SSE event format standardized. Naming conventions coherent across code, components, files, and DB.

**Structure Alignment:**
Directory structure directly supports all decisions. Clear boundaries between interview plane, auth, and synthesis viewing. Provider abstractions properly isolated. Skill system loading chain well-defined.

### Requirements Coverage Validation ✅

**Functional Requirements (~40 FRs):**
All functional requirements have explicit architectural support mapped to specific files and directories. Interview flow (FR70-76), voice input (FR11a-e), interview agent (FR50, FR7-8, FR47-49), individual schema (FR79-85), synthesis (FR22-24, FR33, FR55a), supervisor viewing (MVP4-10), authentication (FR66-66a, MVP11-14), and seeded data (MVP15-19) all have complete architectural homes. No gaps.

**Non-Functional Requirements (10 NFRs):**
All NFRs architecturally addressed. Performance (SSE streaming, client-side Mermaid, dynamic import). Security (server-side LLM, no client storage, UUID v4 tokens, bcrypt, JWT). Platform (Chrome STT, Railway HTTPS). UX (raw speech hidden during recording, instant carousel navigation).

### Implementation Readiness Validation ✅

**Decision Completeness:**
All critical decisions documented with pinned versions. Implementation patterns inherited from fully-specified parent architecture. Consistency rules clear with concrete examples and anti-patterns.

**Structure Completeness:**
Complete directory structure with every file and directory specified. 12 database tables defined. All API routes enumerated. All components listed with source directories. Integration points mapped.

**Pattern Completeness:**
All naming conventions, response formats, error handling, SSE events, validation patterns, loading states, and seed data conventions specified. Enforcement guidelines and anti-patterns documented.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium)
- [x] Technical constraints identified (parent alignment, single provider, seeded data)
- [x] Cross-cutting concerns mapped (6 concerns)

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions (inherited from parent + scoped down)
- [x] Technology stack fully specified (pinned from approved-tech-stack.md)
- [x] Integration patterns defined (REST + SSE, provider abstractions)
- [x] Performance considerations addressed (dynamic import, SSE, client-side rendering)
- [x] Identity strategy defined (supervisor email/password, interview tokens)
- [x] Interview state machine simplified (5 states)
- [x] Seed script architecture specified

**✅ Implementation Patterns**
- [x] Naming conventions established (all inherited from parent)
- [x] Structure patterns defined (co-located tests, feature-based components)
- [x] Communication patterns specified (API wrappers, SSE events)
- [x] Process patterns documented (error handling, loading states, validation)
- [x] Seed data patterns added (demo-specific)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Service boundaries enforced
- [x] Integration points mapped
- [x] Requirements to structure mapping complete (~40 FRs → specific files)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Proper subset of parent architecture — every decision is aligned, code can fold back into the full project without refactoring
- Two-dimensional AI pattern (skills + providers) built correctly even with single provider/skill — architecture scales when parent project activates
- Five-stage synthesis pipeline with checkpoints provides failure recovery and debuggability from day one
- Reflect-and-confirm pattern produces verified process descriptions before extraction — dramatically simplifies NLP and strengthens audit trail
- Three-tier extraction quality assurance (programmatic → quality gate → LLM fallback) keeps the happy path fast and free
- Comprehensive seed script architecture ensures demo data quality — the seed script is a first-class concern, not an afterthought
- UX design fully specified with component specs, color tokens, and interaction patterns — no ambiguity for implementing agents

**Areas for Future Enhancement (parent project scope):**
- PM dashboard and project management UI
- Process decomposition tree UI
- Supervisor editing via review agent
- State transitions and approval workflow
- BPMN 2.0 export
- Multiple LLM/STT providers
- Multiple domain skills
- Session resumability (pause/resume)
- Structured logging (pino)
- CI/CD pipeline (GitHub Actions)
