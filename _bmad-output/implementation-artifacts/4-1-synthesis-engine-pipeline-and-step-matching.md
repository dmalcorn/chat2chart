# Story 4.1: Synthesis Engine Pipeline & Step Matching

Status: ready-for-dev

## Story

As the system,
I want to correlate steps across multiple captured interviews,
So that a normalized workflow can be constructed from individual accounts.

## Acceptance Criteria

1. **Given** 2+ interviews with status Captured for the same process node **When** synthesis is triggered via `POST /api/synthesis/[nodeId]` **Then** `src/lib/synthesis/engine.ts` orchestrates the five-stage pipeline (FR22)
2. **Given** the synthesis route **When** a request is received **Then** a guard validates minimum 2 Captured interviews before proceeding (FR55a) **And** returns an error if fewer than 2 Captured interviews exist
3. **Given** the five-stage pipeline **When** Stage 1 (Collect) runs **Then** all validated individual process schemas for the process node are gathered from `individual_process_schemas` where the interview status is Captured
4. **Given** the collected schemas **When** Stage 2 (Normalize) runs **Then** terminology and step granularity are standardized across interviews to prepare for matching
5. **Given** the normalized schemas **When** Stage 3 (Match) runs **Then** `src/lib/synthesis/correlator.ts` matches steps across interviews using the 5 match types: exact match, semantic match, subsumption (one step encompasses another), split/merge (one step maps to multiple or vice versa), and unmatched/unique
6. **Given** Stage 3 matching **When** the LLM is called for step correlation **Then** `src/lib/ai/prompts/synthesis/match-template.ts` defines the prompt, using temperature 0.1-0.2 for deterministic matching, with Claude's `output_format` parameter for structured output
7. **Given** Stage 3 matching **When** steps are sent to the LLM **Then** the order of interview steps is randomized in the prompt to mitigate position bias
8. **Given** each stage completes **When** results are produced **Then** match results are persisted as a synthesis checkpoint in the `synthesis_checkpoints` table with `stage`, `resultJson`, `synthesisVersion`, and `durationMs`
9. **Given** the synthesis pipeline **When** output is produced **Then** it follows the documented Process Schema structure (FR33) **And** all engine-produced elements carry `sourceType: synthesis_inferred`
10. **Given** the `POST /api/synthesis/[nodeId]` route **When** a request is received **Then** supervisor authentication is required via `withSupervisorAuth` middleware

## Tasks / Subtasks

- [ ] Task 1: Create Process Schema types `src/lib/schema/workflow.ts` (AC: #9)
  - [ ] 1.1 Define Zod schemas for the Process Schema structure: `WorkflowStep` (action, object, actor, systems, sourceType, sequenceOrder), `DecisionPoint` (condition, branches, sourceType), `WorkflowSequence` (steps in order with links), and `ProcessSchema` (top-level container with steps, decisions, actors, metadata)
  - [ ] 1.2 Define `sourceType` as a Zod enum: `interview_discovered` | `synthesis_inferred`
  - [ ] 1.3 Define the `MatchResult` type for Stage 3 output: match pairs with `matchType` (exact_match, semantic_match, subsumption, split_merge, unmatched), confidence score (0-1), rationale string, and source step references per interview
  - [ ] 1.4 Define the `SynthesisCheckpoint` type matching the `synthesis_checkpoints` table shape
  - [ ] 1.5 Export all types — this file is the single source of truth consumed by capture, extraction, synthesis, and Mermaid rendering

- [ ] Task 2: Create synthesis engine orchestrator `src/lib/synthesis/engine.ts` (AC: #1, #2, #8)
  - [ ] 2.1 Create `runSynthesisPipeline(nodeId: string, projectId: string): Promise<SynthesisResult>` that orchestrates all five stages
  - [ ] 2.2 Implement the interview guard: query all interviews for the process node with status `captured`, reject with a descriptive error if fewer than 2 exist
  - [ ] 2.3 Implement Stage 1 (Collect): call a query function to gather all validated `individual_process_schemas` for the node where the interview is Captured
  - [ ] 2.4 Implement Stage 2 (Normalize): standardize terminology and step granularity across collected schemas — this can be a pass-through for MVP if schemas are already well-structured from extraction, but the stage boundary must exist
  - [ ] 2.5 Implement Stage 3 (Match): delegate to `correlator.ts` with the normalized schemas
  - [ ] 2.6 After each stage (match, classify), persist a checkpoint to `synthesis_checkpoints` via a query function, recording `stage`, `resultJson`, `synthesisVersion`, `durationMs`, `projectId`, `processNodeId`
  - [ ] 2.7 Determine `synthesisVersion` by querying the latest version for this node and incrementing by 1 (first run = version 1)
  - [ ] 2.8 Stages 4 (Classify) and 5 (Narrate) are stub functions that return placeholder data — they will be implemented in Story 4.2. The engine must call them in sequence but they can pass through the match results unchanged for now
  - [ ] 2.9 On completion, store the final result in `synthesis_results` table via a query function
  - [ ] 2.10 Wrap the entire pipeline in try/catch — log errors and throw a typed `SynthesisError` with code

- [ ] Task 3: Create step correlator `src/lib/synthesis/correlator.ts` (AC: #5, #6, #7)
  - [ ] 3.1 Create `correlateSteps(schemas: IndividualSchema[], projectId: string): Promise<MatchResult[]>` function
  - [ ] 3.2 Randomize the order of interview steps before building the prompt to mitigate position bias
  - [ ] 3.3 Resolve the LLM provider via `resolveProvider(projectId, 'synthesis_engine')` from `@/lib/ai/provider-registry`
  - [ ] 3.4 Build the match prompt using `buildMatchPrompt()` from `@/lib/ai/prompts/synthesis/match-template`
  - [ ] 3.5 Call `provider.sendMessage()` with `temperature: 0.2` and `outputFormat` set to the Zod-generated JSON schema for `MatchResult[]`
  - [ ] 3.6 Parse and validate the LLM response against the `MatchResult` Zod schema
  - [ ] 3.7 Implement retry-once with exponential backoff on LLM failure — if retry fails, throw with "The AI agent is temporarily unavailable."
  - [ ] 3.8 Return the validated match results, each carrying `sourceType: synthesis_inferred`

- [ ] Task 4: Create match prompt template `src/lib/ai/prompts/synthesis/match-template.ts` (AC: #6)
  - [ ] 4.1 Create `buildMatchPrompt(schemas: NormalizedSchema[]): string` that assembles the prompt for step matching
  - [ ] 4.2 The prompt must instruct the LLM to compare steps across interviews and classify each pair into one of 5 match types: exact_match (identical steps), semantic_match (same intent, different wording), subsumption (one step encompasses another at different granularity), split_merge (one step maps to multiple steps or vice versa), unmatched (step unique to one interview)
  - [ ] 4.3 The prompt must require a confidence score (0-1) and rationale for each match
  - [ ] 4.4 The prompt must define the structured output format matching the `MatchResult` Zod schema
  - [ ] 4.5 The prompt must include all interview steps with their source interview identifiers (interviewee name/id) so matches can be attributed

- [ ] Task 5: Create database query functions for synthesis in `src/lib/db/queries.ts` (AC: #2, #3, #8, #9)
  - [ ] 5.1 Add import for `synthesisCheckpoints`, `individualProcessSchemas` to existing imports in `queries.ts`
  - [ ] 5.2 Implement `getCapturedInterviewsByNodeId(nodeId: string)` — queries `interviews` where `processNodeId = nodeId` and `status = 'captured'`, returns array
  - [ ] 5.3 Implement `getIndividualSchemasByNodeId(nodeId: string)` — queries `individual_process_schemas` where `processNodeId = nodeId` and joins with interviews to filter only Captured interviews, returns array with schema JSON and interview metadata
  - [ ] 5.4 Implement `createSynthesisCheckpoint(data: { projectId, processNodeId, synthesisVersion, stage, resultJson, durationMs })` — inserts into `synthesis_checkpoints`, returns the row
  - [ ] 5.5 Implement `createSynthesisResult(data: { projectId, processNodeId, synthesisVersion, workflowJson, interviewCount })` — inserts into `synthesis_results`, returns the row
  - [ ] 5.6 Implement `getLatestSynthesisVersion(nodeId: string)` — queries max `synthesisVersion` from `synthesis_results` for the node, returns number or 0

- [ ] Task 6: Create `POST /api/synthesis/[nodeId]` route handler (AC: #1, #2, #10)
  - [ ] 6.1 Create `src/app/api/synthesis/[nodeId]/route.ts`
  - [ ] 6.2 Wrap with `withSupervisorAuth` from `@/lib/auth/middleware`
  - [ ] 6.3 Extract `nodeId` from route params: `{ params }: { params: Promise<{ nodeId: string }> }` (Next.js 16 async params)
  - [ ] 6.4 Validate that the process node exists and is a leaf node via `getProcessNodeById`
  - [ ] 6.5 Call `runSynthesisPipeline(nodeId, projectId)` from `@/lib/synthesis/engine`
  - [ ] 6.6 Return success: `{ data: synthesisResult }` with HTTP 201
  - [ ] 6.7 Return 400 with `INSUFFICIENT_INTERVIEWS` if the guard fails (fewer than 2 Captured interviews)
  - [ ] 6.8 Return 404 with `NODE_NOT_FOUND` if the node doesn't exist
  - [ ] 6.9 Wrap in try/catch — on unexpected errors return `{ error: { message: "An unexpected error occurred", code: "INTERNAL_ERROR" } }` with HTTP 500

- [ ] Task 7: Create tests (AC: #1-#10)
  - [ ] 7.1 Create `src/lib/synthesis/engine.test.ts`:
    - Test pipeline orchestrates all stages in order (Collect, Normalize, Match, Classify stub, Narrate stub)
    - Test guard rejects with fewer than 2 Captured interviews
    - Test guard passes with exactly 2 Captured interviews
    - Test checkpoint persistence after Match stage with correct stage name and synthesisVersion
    - Test synthesisVersion increments from latest existing version
    - Test synthesis result is stored in `synthesis_results` on completion
    - Mock query functions from `@/lib/db/queries` and correlator from `@/lib/synthesis/correlator`
  - [ ] 7.2 Create `src/lib/synthesis/correlator.test.ts`:
    - Test successful step correlation returns validated MatchResult array
    - Test position bias mitigation: verify step order is randomized before LLM call
    - Test each of the 5 match types appears correctly in output
    - Test LLM retry on first failure succeeds on second attempt
    - Test LLM retry exhaustion throws descriptive error
    - Test all match results carry `sourceType: synthesis_inferred`
    - Mock `LLMProvider` interface — NOT `@anthropic-ai/sdk` directly
  - [ ] 7.3 Create `src/lib/ai/prompts/synthesis/match-template.test.ts`:
    - Test prompt includes all interview steps with source identifiers
    - Test prompt includes the 5 match type definitions
    - Test prompt includes structured output format specification
  - [ ] 7.4 Create `src/lib/schema/workflow.test.ts`:
    - Test Zod schemas validate correct Process Schema data
    - Test Zod schemas reject invalid data (missing required fields, invalid sourceType, etc.)
    - Test MatchResult schema validates all 5 match types
    - Use real Zod validation — do NOT mock Zod schemas
  - [ ] 7.5 Create `src/app/api/synthesis/[nodeId]/route.test.ts`:
    - Test POST with valid supervisor session triggers synthesis and returns 201
    - Test POST without session returns 401
    - Test POST with non-supervisor session returns 403
    - Test POST with nonexistent node returns 404
    - Test POST with fewer than 2 Captured interviews returns 400 with `INSUFFICIENT_INTERVIEWS`
    - Test unexpected error returns 500 with `INTERNAL_ERROR`
    - Mock query functions from `@/lib/db/queries` and engine from `@/lib/synthesis/engine`

## Dev Notes

### What Already Exists (from Epics 1-3)

- `src/lib/db/schema.ts` — All 12 tables defined including `synthesis_results` and `synthesis_checkpoints` with correct columns, JSONB fields, indexes, and foreign keys
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/db/queries.ts` — Existing query functions (getProjectById, getProcessNodeById, getSynthesisResultByNodeId, getCapturedInterviews functions need to be added)
- `src/lib/ai/provider.ts` — `LLMProvider` interface with `sendMessage`, `streamResponse`, `LLMCallOptions` (temperature, outputFormat)
- `src/lib/ai/provider-registry.ts` — `resolveProvider(projectId, skillName)` function that resolves providers via project_skill_providers table with fallback
- `src/lib/ai/claude-provider.ts` — Claude implementation of `LLMProvider`
- `src/lib/auth/middleware.ts` — `withSupervisorAuth` wrapper that validates supervisor session
- `src/lib/synthesis/` — Directory exists with `.gitkeep` only
- `src/lib/ai/prompts/synthesis/` — Directory exists with `.gitkeep` only
- `src/app/api/synthesis/[nodeId]/` — Directory exists with `.gitkeep` only
- `src/lib/schema/api-requests.ts` — Existing Zod schemas (loginSchema)
- `src/lib/schema/workflow.ts` — DOES NOT EXIST — must be created by this story

### Database Schema Details (already in schema.ts)

**`synthesis_checkpoints` table columns:**
`id` (UUID PK), `projectId` (FK -> projects), `processNodeId` (FK -> processNodes), `synthesisVersion` (integer), `stage` (text), `resultJson` (jsonb), `durationMs` (integer, nullable), `createdAt` (timestamp)

**`synthesis_results` table columns:**
`id` (UUID PK), `projectId` (FK -> projects), `processNodeId` (FK -> processNodes), `synthesisVersion` (integer), `workflowJson` (jsonb), `mermaidDefinition` (text, nullable), `interviewCount` (integer), `createdAt` (timestamp), `updatedAt` (timestamp)

**`individual_process_schemas` table columns:**
`id` (UUID PK), `interviewId` (FK -> interviews, unique), `processNodeId` (FK -> processNodes), `schemaJson` (jsonb), `mermaidDefinition` (text, nullable), `validationStatus` (text), `extractionMethod` (text), `createdAt`, `updatedAt`

**`interviews` table columns (relevant):**
`id` (UUID PK), `processNodeId` (FK -> processNodes), `projectId` (FK -> projects), `status` (enum: pending/active/completed/validating/captured)

### Five-Stage Synthesis Pipeline

```
Stage 1: Collect — Gather all validated individual schemas for the process node
Stage 2: Normalize — Standardize terminology and step granularity
Stage 3: Match — Correlate steps across interviews (5 match types) [THIS STORY]
Stage 4: Classify — Identify divergences and implicit steps [Story 4.2 — STUB]
Stage 5: Narrate — Generate human-readable explanations [Story 4.2 — STUB]
```

This story implements Stages 1-3 fully. Stages 4-5 are stubs that pass data through unchanged. The engine must define all 5 stage boundaries so that Story 4.2 can fill in Classify and Narrate without restructuring.

### The 5 Match Types

| Match Type | Description | Example |
|---|---|---|
| `exact_match` | Identical steps across interviews — same action, same object | "Scan document" in both interviews |
| `semantic_match` | Same intent, different wording — conceptually equivalent | "Sort mail" vs. "Organize incoming correspondence" |
| `subsumption` | One step encompasses another at different granularity | "Process document" subsumes "Scan document" + "Classify document" |
| `split_merge` | One step in one interview maps to multiple in another (or vice versa) | "Scan and classify" in Interview A maps to "Scan" + "Classify" in Interview B |
| `unmatched` | Step unique to one interview — no counterpart in others | "Quality check" only in Ogden interview |

### Checkpoint Persistence Rules (from coding-standards.md)

- Checkpoints are immutable — new synthesis runs create new rows, never overwrite
- On retry, resume from the last successful checkpoint (engine should check for existing checkpoints)
- Stage 5 output goes to `synthesis_results.workflowJson`, NOT to checkpoints
- Only Match and Classify stages produce checkpoints

### Temperature Settings (from coding-standards.md)

- Stage 3 (Match): temperature 0.1-0.2 — deterministic matching
- Use Claude's `output_format` parameter with Zod-generated JSON Schema for structured output

### Position Bias Mitigation

Randomize the order of interview steps in the Stage 3 prompt before sending to the LLM. This prevents the model from favoring steps that appear first. Use a Fisher-Yates shuffle or equivalent.

### Source Attribution Rules

- All elements produced by the synthesis engine carry `sourceType: synthesis_inferred`
- Never tag engine output as `interview_discovered` — that requires an interviewee confirming a reflective summary
- Match inferences, granularity annotations, and implicit step classifications are ALL `synthesis_inferred`

### API Route Pattern

```typescript
// src/app/api/synthesis/[nodeId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSupervisorAuth } from '@/lib/auth/middleware';

export const POST = withSupervisorAuth(async (request, session) => {
  const { nodeId } = await params; // Next.js 16 async params
  // ... synthesis logic
});
```

Note: The route uses `withSupervisorAuth` because synthesis is a supervisor-plane operation (`/api/synthesis/[nodeId]` per architecture). The supervisor's session provides the authenticated context.

### Process Node Validation

The route must verify the node exists and is a leaf node (nodeType === 'leaf'). Interviews and synthesis are scoped to leaf nodes only — organizational nodes cannot have interviews or synthesis.

### Skill Name for Synthesis

The skill name for resolving the LLM provider for synthesis is `synthesis_engine` (distinct from `interview_agent`). The `project_skill_providers` table maps this to the Claude provider. If no specific mapping exists, the provider registry falls back to the project's `defaultLlmProvider`.

### What NOT to Do

- Do NOT implement Stage 4 (Classify) or Stage 5 (Narrate) — those are Story 4.2. Create stubs only.
- Do NOT create Mermaid diagram generation — that is Story 4.3
- Do NOT create the GET route for synthesis retrieval — that is Story 4.3
- Do NOT build any supervisor UI components — that is Epic 5
- Do NOT import Drizzle outside `src/lib/db/` — add query functions to `queries.ts`
- Do NOT import `@anthropic-ai/sdk` outside `src/lib/ai/` — use `resolveProvider` from the registry
- Do NOT hardcode prompts in route handlers or correlator — use `match-template.ts`
- Do NOT store interview data in browser storage
- Do NOT create a `workflow.ts` that duplicates types already inferable from Drizzle schema — only define Process Schema types that are NOT table types (the workflow JSON shape, match types, etc.)

### Project Structure Notes

Files **created** by this story:
- `src/lib/schema/workflow.ts` — Process Schema Zod types (single source of truth)
- `src/lib/synthesis/engine.ts` — Five-stage pipeline orchestrator
- `src/lib/synthesis/correlator.ts` — Stage 3 step matching with 5 match types
- `src/lib/ai/prompts/synthesis/match-template.ts` — LLM prompt for step correlation
- `src/app/api/synthesis/[nodeId]/route.ts` — POST route handler (trigger synthesis)

Files **modified** by this story:
- `src/lib/db/queries.ts` — Add synthesis query functions (getCapturedInterviewsByNodeId, getIndividualSchemasByNodeId, createSynthesisCheckpoint, createSynthesisResult, getLatestSynthesisVersion)

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete
- `src/lib/db/connection.ts` — already complete
- `src/lib/ai/provider.ts` — already complete
- `src/lib/ai/provider-registry.ts` — already complete
- `src/lib/auth/middleware.ts` — already complete
- `package.json` — no new dependencies needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1 — Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — POST /api/synthesis/[nodeId] route]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Synthesis pipeline flow]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Directory Structure — synthesis files, prompt files]
- [Source: _bmad-output/coding-standards.md#Section 4 — Synthesis Pipeline Coding Rules, temperature, checkpoints, position bias]
- [Source: _bmad-output/coding-standards.md#Section 10 — Source Type Attribution Rules]
- [Source: _bmad-output/planning-artifacts/prd.md#FR22 — Synthesis engine correlates multiple interviews]
- [Source: _bmad-output/planning-artifacts/prd.md#FR23 — Normalized workflow with divergence annotations]
- [Source: _bmad-output/planning-artifacts/prd.md#FR33 — Process Schema structure]
- [Source: _bmad-output/planning-artifacts/prd.md#FR55a — Minimum 2 captured interviews]
- [Source: _bmad-output/project-context.md#Service Boundaries — LLM only in src/lib/ai/, Drizzle only in src/lib/db/]
- [Source: _bmad-output/project-context.md#Two-dimensional AI — Skills + Providers pattern]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
