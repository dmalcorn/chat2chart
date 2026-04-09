# Story 1.2: Database Schema & Connection

Status: review

## Story

As a developer,
I want the PostgreSQL database schema defined and connectable via Drizzle ORM,
So that features can persist and query data.

## Acceptance Criteria

1. **Given** the project from Story 1.1, **When** the database schema is defined, **Then** all 12 tables from the Architecture document exist in `src/lib/db/schema.ts` using Drizzle with camelCase mode
2. **Given** the schema is defined, **When** `src/lib/db/connection.ts` is created, **Then** it establishes a connection using `DATABASE_URL` from environment
3. **Given** the connection works, **When** `src/lib/db/queries.ts` is created, **Then** it exports reusable query functions (no raw SQL outside `src/lib/db/`)
4. **Given** schema and connection exist, **When** `drizzle.config.ts` is created, **Then** it is configured for migrations with correct schema path and credentials
5. **Given** any table definition, **When** checking timestamps, **Then** every table includes `created_at` and `updated_at` columns
6. **Given** the full schema, **When** checking relationships, **Then** foreign key relationships match the Architecture data model exactly

## Tasks / Subtasks

- [x] Task 1: Install Drizzle ORM and PostgreSQL dependencies (AC: #1, #4)
  - [x] 1.1 Install exact versions: `drizzle-orm@0.45.2`, `drizzle-kit@0.45.x` (latest 0.45 patch), `postgres` (node-postgres driver) as dependencies — pin without `^` or `~`
  - [x] 1.2 Install `drizzle-kit` as a devDependency
  - [x] 1.3 Add scripts to `package.json`: `"db:push": "drizzle-kit push"`, `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`, `"db:studio": "drizzle-kit studio"`
  - [x] 1.4 Run `npm install` to update `package-lock.json`

- [x] Task 2: Create `drizzle.config.ts` at project root (AC: #4)
  - [x] 2.1 Configure `schema` pointing to `./src/lib/db/schema.ts`
  - [x] 2.2 Configure `out` pointing to `./src/lib/db/migrations`
  - [x] 2.3 Set `dialect: 'postgresql'` and `dbCredentials.url` from `process.env.DATABASE_URL`
  - [x] 2.4 Enable `camelCase: true` in the config (this is the Drizzle camelCase mode that auto-maps TypeScript camelCase to PostgreSQL snake_case)

- [x] Task 3: Create `src/lib/db/connection.ts` (AC: #2)
  - [x] 3.1 Import `drizzle` from `drizzle-orm/node-postgres` (or the appropriate Drizzle PostgreSQL adapter)
  - [x] 3.2 Read `DATABASE_URL` from `process.env` (direct read for now — Story 1.3 adds Zod validation via `env.ts`)
  - [x] 3.3 Create and export the Drizzle database instance with `{ camelCase: true }` — this is the camelCase mode setting
  - [x] 3.4 Export the `db` instance as the single connection point for all queries

- [x] Task 4: Define all 12 tables in `src/lib/db/schema.ts` (AC: #1, #5, #6)
  - [x] 4.1 Import Drizzle schema builders: `pgTable`, `uuid`, `text`, `timestamp`, `integer`, `boolean`, `jsonb`, `varchar`, `pgEnum`
  - [x] 4.2 Define `projects` table:
    - `id` (UUID, PK, default random)
    - `name` (text, not null)
    - `description` (text, nullable)
    - `skillName` (text, not null) — references the domain skill directory name
    - `defaultLlmProvider` (text, not null, default `'anthropic'`)
    - `createdAt` (timestamp, default now)
    - `updatedAt` (timestamp, default now)
  - [x] 4.3 Define `processNodes` table:
    - `id` (UUID, PK, default random)
    - `projectId` (UUID, FK → projects, not null)
    - `parentNodeId` (UUID, FK → processNodes, nullable — null = root)
    - `name` (text, not null) — verb phrases per BPM standards
    - `description` (text, nullable)
    - `level` (integer, not null) — depth in tree, 1 = root
    - `nodeType` (text/enum, not null) — `'organizational'` | `'leaf'`
    - `sortOrder` (integer, not null) — sibling ordering within parent
    - `createdAt`, `updatedAt` (timestamps)
  - [x] 4.4 Define `users` table:
    - `id` (UUID, PK, default random)
    - `email` (text, not null, unique)
    - `passwordHash` (text, not null) — bcrypt hash
    - `name` (text, nullable)
    - `role` (text, not null) — `'pm'` | `'supervisor'`
    - `createdAt`, `updatedAt` (timestamps)
  - [x] 4.5 Define `projectSupervisors` table:
    - `id` (UUID, PK, default random)
    - `projectId` (UUID, FK → projects, not null)
    - `userId` (UUID, FK → users, not null)
    - `createdAt`, `updatedAt` (timestamps)
    - Unique constraint on (`projectId`, `userId`)
  - [x] 4.6 Define `projectSkillProviders` table:
    - `id` (UUID, PK, default random)
    - `projectId` (UUID, FK → projects, not null)
    - `skillName` (text, not null) — e.g., `'interview_agent'`
    - `providerName` (text, not null) — e.g., `'anthropic'`
    - `modelName` (text, not null) — e.g., `'claude-sonnet-4'`
    - `createdAt`, `updatedAt` (timestamps)
    - Unique constraint on (`projectId`, `skillName`)
  - [x] 4.7 Define `interviewTokens` table:
    - `id` (UUID, PK, default random)
    - `projectId` (UUID, FK → projects, not null)
    - `processNodeId` (UUID, FK → processNodes, not null)
    - `token` (text, not null, unique) — UUID v4, cryptographically random
    - `intervieweeName` (text, not null)
    - `intervieweeRole` (text, nullable) — e.g., "Mail Clerk — Austin Campus"
    - `createdAt`, `updatedAt` (timestamps)
  - [x] 4.8 Define interview status enum and `interviews` table:
    - Create pgEnum for interview status: `'pending'`, `'active'`, `'completed'`, `'validating'`, `'captured'`
    - `id` (UUID, PK, default random)
    - `tokenId` (UUID, FK → interviewTokens, not null, unique — one interview per token)
    - `projectId` (UUID, FK → projects, not null)
    - `processNodeId` (UUID, FK → processNodes, not null)
    - `status` (interview status enum, not null, default `'pending'`)
    - `llmProvider` (text, nullable) — provider attribution
    - `sttProvider` (text, nullable) — provider attribution
    - `startedAt` (timestamp, nullable)
    - `completedAt` (timestamp, nullable)
    - `createdAt`, `updatedAt` (timestamps)
  - [x] 4.9 Define exchange type enum and `interviewExchanges` table:
    - Create pgEnum for exchange type: `'question'`, `'response'`, `'reflective_summary'`, `'confirmation'`, `'revised_summary'`
    - Create pgEnum for speaker: `'agent'`, `'interviewee'`
    - `id` (UUID, PK, default random)
    - `interviewId` (UUID, FK → interviews, not null)
    - `segmentId` (UUID, not null) — groups one probe-response-reflect-confirm cycle
    - `exchangeType` (exchange type enum, not null)
    - `speaker` (speaker enum, not null)
    - `content` (text, not null)
    - `isVerified` (boolean, not null, default false) — true ONLY on final confirmed summary per segment
    - `sequenceNumber` (integer, not null) — ordering within the interview
    - `createdAt` (timestamp, default now)
    - Note: No `updatedAt` needed — exchanges are immutable once created
  - [x] 4.10 Define `individualProcessSchemas` table:
    - `id` (UUID, PK, default random)
    - `interviewId` (UUID, FK → interviews, not null, unique — one schema per interview)
    - `processNodeId` (UUID, FK → processNodes, not null)
    - `schemaJson` (jsonb, not null) — Process Schema JSON (validated by `workflow.ts` Zod schema)
    - `mermaidDefinition` (text, nullable) — Mermaid.js flowchart source
    - `validationStatus` (text, not null) — `'draft'` | `'validated'` | `'corrected'`
    - `extractionMethod` (text, not null) — `'programmatic'` | `'llm_fallback'`
    - `createdAt`, `updatedAt` (timestamps)
  - [x] 4.11 Define `structuredCaptures` table:
    - `id` (UUID, PK, default random)
    - `interviewId` (UUID, FK → interviews, not null)
    - `processNodeId` (UUID, FK → processNodes, not null)
    - `captureJson` (jsonb, not null) — verb-object-purpose decomposition
    - `createdAt`, `updatedAt` (timestamps)
  - [x] 4.12 Define `synthesisResults` table:
    - `id` (UUID, PK, default random)
    - `projectId` (UUID, FK → projects, not null)
    - `processNodeId` (UUID, FK → processNodes, not null)
    - `synthesisVersion` (integer, not null) — increments on re-trigger
    - `workflowJson` (jsonb, not null) — synthesized Process Schema with divergence annotations
    - `mermaidDefinition` (text, nullable) — synthesis Mermaid diagram
    - `interviewCount` (integer, not null) — number of interviews included
    - `createdAt`, `updatedAt` (timestamps)
  - [x] 4.13 Define `synthesisCheckpoints` table:
    - `id` (UUID, PK, default random)
    - `projectId` (UUID, FK → projects, not null)
    - `processNodeId` (UUID, FK → processNodes, not null)
    - `synthesisVersion` (integer, not null) — matches `synthesisResults.synthesisVersion`
    - `stage` (text, not null) — `'match'` | `'classify'` (Stage 5 goes to `synthesisResults`, not checkpoints)
    - `resultJson` (jsonb, not null) — stage output
    - `durationMs` (integer, nullable) — execution time for monitoring
    - `createdAt` (timestamp, default now)
  - [x] 4.14 Add indexes per Architecture naming convention:
    - `idx_process_nodes_project_id` on `processNodes.projectId`
    - `idx_process_nodes_parent_node_id` on `processNodes.parentNodeId`
    - `idx_interviews_project_id` on `interviews.projectId`
    - `idx_interviews_process_node_id` on `interviews.processNodeId`
    - `idx_interviews_token_id` on `interviews.tokenId`
    - `idx_interview_exchanges_interview_id` on `interviewExchanges.interviewId`
    - `idx_interview_exchanges_segment_id` on `interviewExchanges.segmentId`
    - `idx_interview_tokens_token` on `interviewTokens.token`
    - `idx_interview_tokens_project_id` on `interviewTokens.projectId`
    - `idx_individual_process_schemas_interview_id` on `individualProcessSchemas.interviewId`
    - `idx_synthesis_results_process_node_id` on `synthesisResults.processNodeId`
  - [x] 4.15 Define Drizzle relations for type-safe joins (Drizzle `relations()` API)

- [x] Task 5: Create `src/lib/db/queries.ts` with initial query functions (AC: #3)
  - [x] 5.1 Import `db` from `./connection` and schema tables from `./schema`
  - [x] 5.2 Implement and export these foundational query functions:
    - `getProjectById(projectId: string)` → project or null
    - `getProcessNodesByProjectId(projectId: string)` → process node array
    - `getInterviewTokenByToken(token: string)` → token with project and process node or null
    - `getInterviewByTokenId(tokenId: string)` → interview or null
    - `getInterviewExchangesByInterviewId(interviewId: string)` → exchange array ordered by `sequenceNumber`
    - `createInterviewExchange(data)` → new exchange (persist immediately — audit trail critical)
    - `updateInterviewStatus(interviewId: string, status)` → updated interview
    - `getSynthesisResultByNodeId(nodeId: string)` → latest synthesis result or null
  - [x] 5.3 Every query function returns typed results (inferred from Drizzle schema)
  - [x] 5.4 No raw SQL — all queries use Drizzle query builder or relational queries

- [x] Task 6: Verify database connection and schema push (AC: #2, #4)
  - [x] 6.1 Ensure PostgreSQL is running (via `docker-compose up db` or local PostgreSQL)
  - [x] 6.2 Create `.env.local` from `.env.example` with the Docker database URL: `postgresql://chat2chart:chat2chart_dev@localhost:5432/chat2chart`
  - [x] 6.3 Run `npm run db:push` to push schema to the database
  - [x] 6.4 Verify all 12 tables are created with correct snake_case names and columns
  - [x] 6.5 Verify foreign key relationships are created correctly
  - [x] 6.6 Run `npm run db:studio` to visually inspect the schema (optional verification)

- [x] Task 7: Create unit tests for schema and queries (AC: #1, #3)
  - [x] 7.1 Create `src/lib/db/schema.test.ts` — verify all 12 tables are exported, verify column definitions match expectations
  - [x] 7.2 Create `src/lib/db/queries.test.ts` — test query functions against a test database (use the Docker PostgreSQL instance)
  - [x] 7.3 Verify tests pass with `npm run test`

## Dev Notes

### Critical: Drizzle camelCase Mode

This is the single most important configuration detail. When `camelCase: true` is set:
- TypeScript code uses camelCase everywhere: `projectId`, `createdAt`, `intervieweeName`
- Drizzle auto-generates snake_case columns in PostgreSQL: `project_id`, `created_at`, `interviewee_name`
- Zero manual column mapping needed — do NOT specify column names manually

This must be set in BOTH:
1. `drizzle.config.ts` — for migrations and kit commands
2. `src/lib/db/connection.ts` — for runtime queries

### Environment Variables: Two Allowlists

The parent project references `PM_EMAIL_ALLOWLIST`, `FIRST_PM_EMAIL`, `FIRST_PM_PASSWORD` but **these are NOT needed for the MVP**. The MVP uses only supervisor auth:
- `SUPERVISOR_EMAIL_ALLOWLIST` — comma-separated approved supervisor emails
- `FIRST_SUPERVISOR_EMAIL` / `FIRST_SUPERVISOR_PASSWORD` — bootstrap first supervisor account

Interviewees use token-based access (no login). There is no PM UI in the MVP. When implementing `env.ts` (Story 1.3), validate only the supervisor env vars — do not add PM vars.

### Interview Exchange Immutability

`interviewExchanges` does NOT need an `updatedAt` column — exchanges are write-once, never updated. Every exchange is persisted immediately on creation (not batched). This is load-bearing for session resumability (FR13) and audit trail (FR47-49a).

### JSONB Columns

Tables use JSONB for workflow artifacts — `schemaJson`, `captureJson`, `workflowJson`, `resultJson`. These store the same shape as the Process Schema types from `src/lib/schema/workflow.ts`. Zod validates at API boundaries; DB stores as JSONB without normalization overhead.

### Enum vs Text for Status Fields

Use Drizzle's `pgEnum` for fields with fixed domain values:
- Interview status: `pending`, `active`, `completed`, `validating`, `captured`
- Exchange type: `question`, `response`, `reflective_summary`, `confirmation`, `revised_summary`
- Speaker: `agent`, `interviewee`

Use plain text for fields that could vary or are informational:
- `nodeType`: `'organizational'` | `'leaf'`
- `validationStatus`: `'draft'` | `'validated'` | `'corrected'`
- `extractionMethod`: `'programmatic'` | `'llm_fallback'`
- `role` on users: `'pm'` | `'supervisor'`

### Process Tree Constraints (Domain Rule)

A node is EITHER organizational (has children, no interviews) OR leaf (has interviews, no children) — never both. This is enforced at the service level (`src/lib/process/tree.ts`), not in the database schema. The database schema defines the FK relationships; business logic enforces the invariant.

### Seed Script Placeholder

Story 1.2 creates the schema and connection — the seed script (`src/lib/db/seed.ts`) content is deferred to Story 6.1. However, create the file as a placeholder with a comment noting it will be populated later.

### Docker PostgreSQL Already Configured

The `docker-compose.yml` (already committed) provisions PostgreSQL 17 with:
- User: `chat2chart`
- Password: `chat2chart_dev`
- Database: `chat2chart`
- Port: `5432`
- Health check configured

Run `docker-compose up db` to start just the database for development.

### What NOT to Do

- Do NOT install `@anthropic-ai/sdk`, `bcrypt`, `compromise`, `zod`, or `mermaid` — those are later stories
- Do NOT create `src/lib/env.ts` Zod validation — that's Story 1.3 (read `DATABASE_URL` directly from `process.env` for now)
- Do NOT create auth infrastructure — that's Story 1.3
- Do NOT create the seed script content — that's Story 6.1
- Do NOT import Drizzle in any file outside `src/lib/db/` — this is a service boundary rule
- Do NOT use `^` or `~` version prefixes on any dependency
- Do NOT manually specify snake_case column names — let camelCase mode handle the mapping

### Project Structure Notes

Files created by this story align with the Architecture directory structure:
- `src/lib/db/schema.ts` — all 12 Drizzle table definitions
- `src/lib/db/connection.ts` — database connection setup
- `src/lib/db/queries.ts` — reusable query functions
- `src/lib/db/seed.ts` — placeholder for Story 6.1
- `drizzle.config.ts` — root-level Drizzle configuration
- `.env.local` — local environment variables (gitignored)

The `src/lib/db/migrations/` directory will be auto-created by `drizzle-kit generate` when production migrations are needed. For dev, `drizzle-kit push` is used instead.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Tables, schema pattern, validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Complete Project Directory Structure — File locations]
- [Source: _bmad-output/planning-artifacts/architecture.md#Seed Script Architecture — Seed conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — Env var names]
- [Source: _bmad-output/coding-standards.md#Interview Exchange Data Model — Exchange fields, segment rules]
- [Source: _bmad-output/coding-standards.md#Process Decomposition Tree — Node data model]
- [Source: _bmad-output/coding-standards.md#Synthesis Pipeline — Checkpoint schema]
- [Source: _bmad-output/coding-standards.md#Authentication Implementation — Password handling, session management]
- [Source: _bmad-output/project-context.md#Technology Stack — Drizzle 0.45.2, PostgreSQL 17.9]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1, Story 1.2 — Acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md#FR47-49 — Exchange persistence requirements]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- drizzle-kit 0.45.x does not exist; installed 0.31.10 (latest stable track matching drizzle-orm@0.45.2)
- `casing: 'camelCase'` in drizzle.config.ts produces camelCase columns in DB (wrong); changed to `casing: 'snake_case'` to produce correct snake_case columns
- `drizzle-orm/node-postgres` requires `pg` package; switched to `drizzle-orm/postgres-js` to match installed `postgres` package
- Self-referential FK on `processNodes.parentNodeId` requires `AnyPgColumn` type annotation to avoid circular type inference

### Completion Notes List

- All 12 tables defined with correct column types, FKs, unique constraints, and indexes
- 3 pgEnums: interview_status, exchange_type, speaker
- 11 named indexes per Architecture naming convention
- Drizzle relations defined for all tables including self-referential processNodes
- 8 query functions implemented with typed returns, no raw SQL
- interviewExchanges table is immutable (no updatedAt) per domain spec
- synthesisCheckpoints table has no updatedAt (write-once stage checkpoints)
- seed.ts created as placeholder for Story 6.1
- All 99 tests pass (47 pre-existing + 35 schema + 17 queries)
- TypeScript compiles clean, ESLint clean

### Change Log

- 2026-04-08: Implemented Story 1.2 — all 7 tasks complete

### File List

- `package.json` — added drizzle-orm, postgres, drizzle-kit dependencies and db scripts
- `package-lock.json` — updated
- `drizzle.config.ts` — new, Drizzle Kit configuration with snake_case casing
- `src/lib/db/connection.ts` — new, database connection via postgres-js driver
- `src/lib/db/schema.ts` — new, all 12 table definitions, enums, indexes, relations
- `src/lib/db/queries.ts` — new, 8 reusable query functions
- `src/lib/db/seed.ts` — new, placeholder for Story 6.1
- `src/lib/db/schema.test.ts` — new, 35 tests for schema structure
- `src/lib/db/queries.test.ts` — new, 17 integration tests against real PostgreSQL
- `src/lib/db/.gitkeep` — deleted (replaced by actual files)

### Review Findings

#### Decision Needed

- [x] [Review][Decision] **`casing: 'snake_case'` vs spec's `camelCase: true`** — Drizzle 0.45.2 API uses `casing: 'snake_case'` to achieve camelCase-in-TS → snake_case-in-PG mapping. Spec language was conceptual, not literal. Approved by Winston. Doc amendment noted in `deferred-work.md`.

#### Patches

- [x] [Review][Patch] Add `{ withTimezone: true }` to all timestamp columns — already applied prior to review [src/lib/db/schema.ts]
- [x] [Review][Patch] Add `.$onUpdate(() => new Date())` to all `updatedAt` columns — prevents stale timestamps on update [src/lib/db/schema.ts]
- [x] [Review][Patch] Add unique constraint `uq_interview_exchanges_sequence` on `(interviewId, sequenceNumber)` — prevents duplicate sequence numbers [src/lib/db/schema.ts]
- [x] [Review][Patch] Add index `idx_structured_captures_interview_id` on `structuredCaptures.interviewId` — prevents table scans [src/lib/db/schema.ts]
- [x] [Review][Patch] Remove manual `updatedAt: new Date()` from `updateInterviewStatus` — `$onUpdate` handles it now [src/lib/db/queries.ts]

#### Deferred

- [x] [Review][Defer] `queries.test.ts` runs destructive deletes with no test DB guard — low risk on local Docker; revisit when CI is set up [src/lib/db/queries.test.ts]
- [x] [Review][Defer] Module-level side effect in `connection.ts` — crashes if `DATABASE_URL` unset at import time. Story 1.3 env validation addresses this [src/lib/db/connection.ts]
- [x] [Review][Defer] No connection pool lifecycle management — no `.end()` exported, no pool config. Acceptable for MVP dev [src/lib/db/connection.ts]
- [x] [Review][Defer] `interviewExchanges` missing DB constraint for one-verified-per-segment rule — will be enforced at service level in future story [src/lib/db/schema.ts]
