---
project_name: 'chat2chart'
user_name: 'Diane'
date: '2026-04-08'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
scope: 'mvp-demo'
rule_count: 34
optimized_for_llm: true
---

# Project Context for AI Agents — MVP Demo

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Scoped to the MVP demo — see the MVP PRD for what's in and out of scope._

---

## Technology Stack & Versions

**Version Pinning Policy:** Lock exact versions in `package.json` (no `^` or `~` prefixes). Version bumps require testing and a deliberate decision — no automatic upgrades.

### Core Technologies

| Technology | Version | Notes |
|---|---|---|
| Node.js | 24.14.1 LTS | Active LTS through April 2028 |
| TypeScript | 6.0.x | Strict mode required |
| Next.js | 16.2.2 | Turbopack stable, App Router, API routes for SSE |
| React | 19.2.4 | Server Components default, Client Components opt-in |
| Tailwind CSS | 4.2.2 | CSS-first config, cascade layers |
| shadcn/ui | CLI v4 | Code-distributed components — not a versioned npm package |
| PostgreSQL | 17.9 | Via Railway add-on; target 17.x |
| Drizzle ORM | 0.45.2 | Stable track — do NOT use v1.0 beta |
| drizzle-kit | 0.45.x | Stable track — do NOT use 1.0.0-beta |

### Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| @anthropic-ai/sdk | 0.85.0 | Claude API (sole LLM provider for MVP) |
| bcrypt | 6.0.0 | Password hashing for supervisor email/password auth |
| compromise | 14.15.0 | NLP extraction for individual process schemas |
| Zod | 4.3.6 | API validation and schema enforcement |
| mermaid | 11.14.0 | Client-side flowchart rendering |
| Vitest | 4.1.2 | Unit/integration testing |
| @testing-library/react | 16.3.2 | Component testing utilities |
| Playwright | 1.59.1 | E2E browser testing |
| ESLint | 10.2.0 | Flat config format (v10) |
| Prettier | 3.8.1 | Code formatting |
| Husky | 9.1.7 | Git hook management |
| lint-staged | 16.4.0 | Run lint/format on staged files only |

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

- **Strict mode required** — no `any` types without explicit justification
- **Drizzle camelCase mode** — TypeScript uses camelCase throughout; Drizzle auto-generates snake_case columns in PostgreSQL. Zero manual mapping.
- **Barrel exports** (`index.ts`) only for directories with 3+ public exports
- **Zod schemas** defined in `src/lib/schema/` — shared between API validation and client-side form validation. Validate at API boundary; trust internal code after that point.
- **Process Schema types** exported from `src/lib/schema/workflow.ts` — single source of truth consumed by capture, extraction, synthesis, and Mermaid rendering

**Service boundary imports — strictly enforced:**

| Package/SDK | Only imported in | Never imported in |
|---|---|---|
| `@anthropic-ai/sdk` | `src/lib/ai/` | Route handlers, components, hooks |
| Drizzle | `src/lib/db/` | Anywhere else — routes call query functions, never raw SQL |
| Web Speech API | `src/lib/stt/` | Components call hooks, not providers directly |
| `compromise` | `src/lib/interview/schema-extractor.ts` | Anywhere else |
| `bcrypt` | `src/lib/auth/config.ts` | Anywhere else |

**Error handling patterns:**

- API routes: try/catch at route handler level → `{ error: { message: string, code: string } }` with HTTP status. Never leak stack traces.
- LLM errors: Retry once with exponential backoff. If retry fails → "The AI agent is temporarily unavailable."
- SSE streams: emit typed error events → `event: error`, `data: { message, code }`

### Framework-Specific Rules (Next.js / React)

**Server vs. Client Components:**
- Server Components by default. `"use client"` pushed to leaf components — boundary as low as possible in the component tree.
- No global state libraries (Redux, Zustand). Use Server Components for data-fetching views, `useState`/`useReducer` for interactive Client Components.

**Component Organization:**
- Feature-based directories under `src/components/`: `interview/`, `synthesis/`, `shared/`
- shadcn/ui primitives in `src/components/ui/` (auto-managed by CLI)
- Interview components: Client Components only, skill-agnostic — render whatever the agent sends via SSE
- Synthesis components: render whatever elements exist in synthesis output — skill-aware by data shape, not special code

**API Route Auth Planes (MVP):**

| Plane | Route prefix | Auth |
|---|---|---|
| Interview | `/api/interview/[token]/**` | Token-based — no login |
| Supervisor | `/api/review/**` | Supervisor session required (email/password, allowlist) |

- Auth middleware from `src/lib/auth/middleware.ts` wraps supervisor routes — routes do not contain auth logic directly

**SSE Event Format (standardized across all streaming routes):**

| Event | Data | Purpose |
|---|---|---|
| `message` | `{ content, exchangeType }` | Agent response tokens — `exchangeType` tells UI whether it's a `question` or `reflective_summary` |
| `done` | `{ interviewExchangeId, segmentId }` | Stream completion |
| `error` | `{ message, code }` | Error during streaming |

**Dynamic Imports (Performance):**
- Mermaid.js: dynamic import, no SSR — loaded only on interview diagram and synthesis pages
- Route-based code splitting automatic via App Router

**Loading States:**
- Route-level: `loading.tsx` convention (App Router)
- Component-level: `isLoading` boolean → skeleton or spinner
- SSE streaming: typing indicator while waiting for first token, then stream content

### Testing Rules

**Organization:**
- Tests co-located with source files — `interview-panel.test.tsx` next to `interview-panel.tsx`
- Playwright E2E tests in `e2e/` at project root: `interview-flow.spec.ts`, `synthesis-flow.spec.ts`

**Test Boundaries:**
- Unit: individual functions and components in isolation (Vitest + @testing-library/react)
- Integration: API route handlers with mocked DB/LLM providers
- E2E: full user flows via Playwright

**Mock at the adapter interface level, not at the SDK level:**
- LLM calls → mock `LLMProvider` interface, never mock `@anthropic-ai/sdk` directly
- STT → mock `STTProvider` interface, never mock Web Speech API directly
- Database → use Drizzle test utilities against a test database, not in-memory mocks
- Tokens → generate real UUID v4 tokens in test scenarios

**Never mock — always test with real implementations:**
- Zod validation schemas
- Process Schema validation (Zod schemas from `src/lib/schema/workflow.ts`)

### Code Quality & Style Rules

**Naming Conventions:**

| Context | Convention | Examples |
|---|---|---|
| Files | `kebab-case.ts` / `.tsx` | `interview-panel.tsx`, `llm-provider.ts` |
| Components | PascalCase in code | `InterviewPanel`, `SynthesisViewer` |
| Functions/variables | camelCase | `getProjectById`, `interviewCount` |
| Types/interfaces | PascalCase | `Interview`, `SynthesisResult`, `WorkflowStep` |
| Constants | UPPER_SNAKE_CASE | `MAX_INTERVIEW_DURATION`, `DEFAULT_STT_PROVIDER` |
| DB tables | snake_case, plural | `projects`, `interview_exchanges` |
| DB columns | snake_case | `project_id`, `created_at` |
| DB foreign keys | `{table_singular}_id` | `project_id`, `interview_id` |
| DB indexes | `idx_{table}_{column}` | `idx_interviews_project_id` |
| API endpoints | plural nouns, lowercase | `/api/interview/[token]`, `/api/review` |
| Route params | `[camelCase]` | `[token]` |
| Query params | camelCase | `?sortBy=createdAt` |
| JSON response fields | camelCase | `{ projectId, createdAt }` |

**API Response Format (enforced on every route):**

| Type | Format |
|---|---|
| Success | `{ data: T }` |
| Error | `{ error: { message: string, code: string } }` + HTTP status |
| Lists | `{ data: T[], count: number }` |
| Dates | ISO 8601 strings: `"2026-04-06T18:30:00Z"` |

**DB Schema Rules:**
- Include `created_at` and `updated_at` timestamps on every table
- JSONB columns for workflow artifacts (captures, schemas, synthesis results) — same shape as Process Schema, no normalization overhead
- Drizzle `camelCase` mode handles TypeScript↔PostgreSQL naming automatically — no manual column mapping

### Development Workflow Rules

**Deployment:**
- Railway: single Next.js service + PostgreSQL add-on
- Auto-deploy from GitHub `main` branch
- Tests run locally before push

**Environment Variables (Zod-validated at startup via `src/lib/env.ts`):**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API access |
| `SESSION_SECRET` | JWT signing key |
| `SUPERVISOR_EMAIL_ALLOWLIST` | Comma-separated approved supervisor emails |
| `FIRST_SUPERVISOR_EMAIL` | Bootstrap first supervisor account at deployment |
| `FIRST_SUPERVISOR_PASSWORD` | Bootstrap first supervisor password at deployment |
| `NODE_ENV` | Runtime environment |

**Database Migrations:**
- Development: `drizzle-kit push` for rapid iteration
- Production: `drizzle-kit generate` + `drizzle-kit migrate`

### Critical Don't-Miss Rules

**Anti-Patterns — NEVER do these:**
- Direct Anthropic SDK calls outside `src/lib/ai/` — breaks provider abstraction
- Store interview data in browser `localStorage`/`sessionStorage` — violates NFR9
- Return unwrapped API responses (raw data without `{ data: T }` wrapper)
- Use PascalCase or camelCase for DB table/column names — Drizzle camelCase mode handles the mapping
- Use global state libraries (Redux, Zustand) — Server Components + local state only
- Swallow errors silently in catch-all handlers — always log and return structured error
- Hardcode interview prompts — always use `skill-loader.ts` → `prompt-assembler.ts`
- Import Drizzle outside `src/lib/db/` — routes call query functions only

**Domain-Specific Rules Agents Will Miss:**
- **Process tree (seeded):** A node is EITHER organizational (has children, no interviews) OR leaf (has interviews, no children) — never both. The MVP seeds this tree; there is no UI to modify it. Interviews and synthesis scoped to leaf nodes via `process_node_id`.
- **Two-dimensional AI (single provider for MVP):** Skills = *what* the LLM does. Providers = *which* LLM does it. All LLM calls through provider registry (`src/lib/ai/provider-registry.ts`). MVP uses Claude as the sole provider. Never call the Anthropic SDK directly from business logic.
- **Reflect-and-confirm pattern:** Every exchange has `exchange_type` (`question` | `response` | `reflective_summary` | `confirmation` | `revised_summary`) and `segment_id`. Only `reflective_summary` or `revised_summary` can be `is_verified = true`. Exactly one verified summary per segment.
- **Persist every exchange immediately:** Each interview exchange saved to DB on creation. Audit trail depends on this. Never batch or defer.
- **Individual schema extraction:** Happy path = compromise.js (programmatic, no LLM). Quality gate (Zod + completeness + richness) auto-falls back to LLM on failure. Interviewee NEVER sees a failed extraction — fallback is transparent.
- **Two-source attribution (MVP):** Every element carries `sourceType`: `interview_discovered` (interviewee confirmed reflective summary) or `synthesis_inferred` (engine matched/classified). Never tag as `interview_discovered` unless an interviewee confirmed it. (`supervisor_contributed` is not applicable — no supervisor editing in MVP.)

**Security Rules:**
- All LLM calls server-side via API routes — never expose API keys to client
- Interview tokens: UUID v4 (cryptographically random) — grants access to exactly one interview, nothing else (NFR10b)
- Supervisor sessions: 24h expiry via JWT
- No client-side interview data storage (NFR9)
- HTTPS via Railway SSL termination

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code
- This is scoped to the MVP demo — do NOT build features excluded in the MVP PRD (no PM UI, no BPMN export, no supervisor editing, no state machine transitions, no multi-provider support)
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Refer to `_bmad-output/coding-standards.md` for detailed coding patterns, interface contracts, and code examples
- Refer to the MVP PRD (`_bmad-output/planning-artifacts/prd.md`) for what's in scope

**For Humans:**
- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review periodically for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-04-08
