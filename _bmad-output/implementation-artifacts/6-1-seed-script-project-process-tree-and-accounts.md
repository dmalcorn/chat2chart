# Story 6.1: Seed Script — Project, Process Tree & Accounts

Status: done

## Story

As a developer,
I want the foundational demo data seeded — project, process tree, and user accounts,
So that the application has the structural context for interviews and supervisor access.

## Acceptance Criteria

1. **Given** the database schema exists, **When** `npx tsx src/lib/db/seed.ts` runs, **Then** the project "IRS Taxpayer Document Processing Discovery" is created (MVP15)
2. **And** the process tree is seeded: L1 organizational root ("Taxpayer Document Processing") + L2 leaf ("Receive and Digitize Incoming Mail") (MVP15)
3. **And** a PM account is bootstrapped from `FIRST_SUPERVISOR_EMAIL` + `FIRST_SUPERVISOR_PASSWORD` env vars (MVP15) — note: the existing `bootstrap.ts` handles supervisor bootstrap at startup; the seed script creates additional supervisor accounts explicitly
4. **And** supervisor account(s) are created and added to the per-project supervisor allowlist in `project_supervisors` (MVP15)
5. **And** the Federal Document Processing domain skill definition exists at `skills/federal-document-processing/skill.md` (MVP19) — already exists, verify only
6. **And** the skill-provider mapping (`interview_agent` → Claude via `anthropic` provider, model `claude-sonnet-4-5-20250514`) is seeded in `project_skill_providers`
7. **And** the seed script is idempotent — checks for existing data before inserting (safe to run multiple times)
8. **And** the seed script uses Drizzle query functions from `src/lib/db/queries.ts` (no raw SQL) and logs what it creates vs skips
9. **And** UUIDs for seed data are deterministic (hardcoded constants, not `defaultRandom()`) for reproducibility

## Tasks / Subtasks

- [x] Task 1: Define deterministic seed UUIDs (AC: #9)
  - [x] Create a `seed-constants.ts` file in `src/lib/db/` with all hardcoded UUIDs used across Stories 6.1 and 6.2
  - [x] UUIDs needed: project, L1 process node, L2 process node (leaf), supervisor user, project-supervisor link, skill-provider mapping, 3 interview tokens (Rachel, Marcus, Janet), 2 interviews (Rachel, Marcus), and placeholder IDs for exchanges/schemas/synthesis (Story 6.2 will use these)
  - [x] Use valid UUID v4 format — e.g., `00000000-0000-4000-a000-000000000001` style for easy identification

- [x] Task 2: Add missing query functions to `queries.ts` (AC: #7, #8)
  - [x] Add `getProjectByName(name: string)` — for idempotency check
  - [x] Add `createProject(data)` — insert into `projects` table with explicit `id`
  - [x] Add `createProcessNode(data)` — insert into `process_nodes` with explicit `id`
  - [x] Add `createProjectSupervisor(data)` — insert into `project_supervisors`
  - [x] Add `createProjectSkillProvider(data)` — insert into `project_skill_providers`
  - [x] Add `createInterviewToken(data)` — insert into `interview_tokens` with explicit `id`
  - [x] Follow existing patterns: destructure from `db.insert(...).values(data).returning()`, return single object

- [x] Task 3: Implement `src/lib/db/seed.ts` — foundational data (AC: #1-#8)
  - [x] Import `db` from `./connection` and table schemas for idempotency checks
  - [x] Import seed constants from `./seed-constants`
  - [x] Import `hashPassword` from `@/lib/auth/config` for supervisor password
  - [x] Seed project with explicit `id` from constants, `skillName: 'federal-document-processing'`, `defaultLlmProvider: 'anthropic'`
  - [x] Seed L1 process node: `name: 'Taxpayer Document Processing'`, `level: 1`, `nodeType: 'organizational'`, `sortOrder: 1`, `parentNodeId: null`
  - [x] Seed L2 process node: `name: 'Receive and Digitize Incoming Mail'`, `level: 2`, `nodeType: 'leaf'`, `sortOrder: 1`, `parentNodeId: <L1 node id>`
  - [x] Seed supervisor user: `email: 'supervisor@demo.local'`, `role: 'supervisor'`, bcrypt-hashed password `'DemoPass123!'`
  - [x] Seed `project_supervisors` row linking supervisor to project
  - [x] Seed `project_skill_providers` row: `skillName: 'interview_agent'`, `providerName: 'anthropic'`, `modelName: 'claude-sonnet-4-5-20250514'`
  - [x] Idempotency: check if project exists by name before each major insert, log skip/create
  - [x] Wrap in async main with try/catch, `process.exit(0)` on success, `process.exit(1)` on error

- [x] Task 4: Verify skill definition file exists (AC: #5)
  - [x] Confirm `skills/federal-document-processing/skill.md` exists (it does — already verified)
  - [x] No action needed, just document in completion notes

- [x] Task 5: Test seed script (AC: #7)
  - [x] Run `npx tsx src/lib/db/seed.ts` — verify it creates all records and logs output
  - [x] Run again — verify it's idempotent (logs "already exists" for each entity, no errors)

## Dev Notes

### Database Schema Reference

All tables are defined in `src/lib/db/schema.ts`. Key tables for this story:

- **projects**: `id (uuid PK)`, `name`, `description`, `skillName`, `defaultLlmProvider`, timestamps
- **processNodes**: `id (uuid PK)`, `projectId (FK)`, `parentNodeId (FK, nullable)`, `name`, `description`, `level (int)`, `nodeType (text)`, `sortOrder (int)`, timestamps
- **users**: `id (uuid PK)`, `email (unique)`, `passwordHash`, `name`, `role`, timestamps
- **projectSupervisors**: `id (uuid PK)`, `projectId (FK)`, `userId (FK)`, unique constraint on `(projectId, userId)`
- **projectSkillProviders**: `id (uuid PK)`, `projectId (FK)`, `skillName`, `providerName`, `modelName`, unique constraint on `(projectId, skillName)`
- **interviewTokens**: `id (uuid PK)`, `projectId (FK)`, `processNodeId (FK)`, `token (unique)`, `intervieweeName`, `intervieweeRole`

Drizzle uses camelCase mode — TypeScript uses camelCase, DB uses snake_case automatically.

### Process Tree Rules

- L1 node is **organizational** (has children, no interviews)
- L2 node is **leaf** (has interviews, no children)
- Never both — a node is EITHER org OR leaf

### Existing Patterns

- Query functions in `queries.ts` follow the pattern: `const [result] = await db.insert(table).values(data).returning(); return result;`
- Auth bootstrap pattern exists in `src/lib/auth/bootstrap.ts` — uses `getUserByEmail` for idempotency, `hashPassword` from `config.ts`
- `bcrypt` is ONLY imported in `src/lib/auth/config.ts` — seed script must import `hashPassword` from there, never import bcrypt directly

### Service Boundaries

- Drizzle imports ONLY in `src/lib/db/` — seed script lives here, so direct DB access is allowed
- `bcrypt` ONLY in `src/lib/auth/config.ts` — seed uses `hashPassword` from there
- Seed script can use `db.insert()` directly since it's in `src/lib/db/`

### Environment Variables

The seed script needs `DATABASE_URL` to connect. It does NOT need `FIRST_SUPERVISOR_EMAIL` / `FIRST_SUPERVISOR_PASSWORD` — those are for the runtime bootstrap flow. The seed script creates its own demo supervisor with hardcoded credentials.

### Idempotency Pattern

```typescript
const existingProject = await db.query.projects.findFirst({
  where: eq(projects.name, 'IRS Taxpayer Document Processing Discovery'),
});
if (existingProject) {
  console.log('Project already exists, skipping...');
} else {
  await db.insert(projects).values({ id: SEED_PROJECT_ID, ... });
  console.log('Created project: IRS Taxpayer Document Processing Discovery');
}
```

### Project Structure Notes

- `src/lib/db/seed.ts` — placeholder already exists, replace content
- `src/lib/db/seed-constants.ts` — new file for deterministic UUIDs
- `src/lib/db/queries.ts` — add missing create functions
- No new directories needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Seed Data section]
- [Source: _bmad-output/project-context.md — Service Boundaries, Anti-Patterns]
- [Source: src/lib/db/schema.ts — all table definitions]
- [Source: src/lib/auth/bootstrap.ts — existing bootstrap pattern]
- [Source: src/lib/auth/config.ts — hashPassword function]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
N/A

### Completion Notes List
- Created `seed-constants.ts` with deterministic UUID v4 format IDs for all entities across Stories 6.1 and 6.2
- Added 7 query functions to `queries.ts`: `getProjectByName`, `createProject`, `createProcessNode`, `createProjectSupervisor`, `createProjectSkillProvider`, `createInterviewToken`, `createStructuredCapture`
- Implemented `seed.ts` with idempotent seeding (check-before-insert pattern), async main with error handling
- Seed script uses `db` from `./connection` directly (allowed since it's in `src/lib/db/`)
- Password hashing via `hashPassword` from `@/lib/auth/config` (service boundary respected)
- Interview tokens for Rachel, Marcus, and Janet created in foundational seed (Task 1 of 6.2 merged here)
- Skill definition `skills/federal-document-processing/skill.md` verified present
- All 648 tests pass, zero type errors

### File List
- `src/lib/db/seed-constants.ts` (new)
- `src/lib/db/seed.ts` (replaced placeholder)
- `src/lib/db/queries.ts` (modified — added imports + 7 query functions)
