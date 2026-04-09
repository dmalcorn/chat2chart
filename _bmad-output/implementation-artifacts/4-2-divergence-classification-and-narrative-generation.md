# Story 4.2: Divergence Classification & Narrative Generation

Status: ready-for-dev

## Story

As the system,
I want to classify divergences between interviews and generate human-readable explanations,
So that supervisors can understand where and why processes differ.

## Acceptance Criteria

1. **Given** step matching (Stage 3) is complete **When** classification runs **Then** Stage 4 (Classify): `src/lib/synthesis/divergence.ts` identifies divergences and implicit steps, attributing each to specific interviewees with confidence levels (FR23, FR24)
2. **Given** the classification stage, **When** the LLM is called, **Then** `src/lib/ai/prompts/synthesis/classify-template.ts` defines the classification prompt sent via `prompt-assembler.ts`
3. **Given** classification completes, **When** results are produced, **Then** classification results are persisted as a synthesis checkpoint in `synthesis_checkpoints` with stage `'classify'`
4. **Given** classification is complete, **When** narration runs, **Then** Stage 5 (Narrate): `src/lib/synthesis/narrator.ts` generates human-readable explanations for each divergence (FR23)
5. **Given** the narration stage, **When** the LLM is called, **Then** `src/lib/ai/prompts/synthesis/narrate-template.ts` defines the narration prompt sent via `prompt-assembler.ts`
6. **Given** narration completes, **When** the final result is assembled, **Then** the synthesis result is stored in `synthesis_results` with the normalized workflow, divergence annotations, and match metadata
7. **Given** any engine-produced element, **When** it is stored, **Then** its `sourceType` is `synthesis_inferred` — never `interview_discovered` unless an interviewee confirmed the reflective summary containing it

## Tasks / Subtasks

- [ ] Task 1: Create classification Zod schemas in `src/lib/schema/synthesis.ts` (AC: #1, #7)
  - [ ] 1.1 Create `src/lib/schema/synthesis.ts` if it does not exist
  - [ ] 1.2 Define `divergenceTypeSchema` — Zod enum: `'genuinely_unique' | 'sequence_conflict' | 'uncertain_needs_review'`
  - [ ] 1.3 Define `divergenceAnnotationSchema` — Zod object with fields: `id` (UUID), `stepId` (UUID, references the synthesized step), `divergenceType` (from 1.2), `intervieweeIds` (array of interview IDs attributed to this divergence), `confidence` (number 0-1), `explanation` (string, populated by narrator in Stage 5), `sourceType` (literal `'synthesis_inferred'`)
  - [ ] 1.4 Define `implicitStepSchema` — Zod object with fields: `id` (UUID), `stepId` (UUID), `mentionedByIds` (array of interview IDs that mentioned it), `omittedByIds` (array of interview IDs that omitted it), `classification` (enum: `'likely_omission' | 'genuinely_different'`), `confidence` (number 0-1), `sourceType` (literal `'synthesis_inferred'`)
  - [ ] 1.5 Define `classificationResultSchema` — Zod object containing `divergences` (array of divergenceAnnotationSchema), `implicitSteps` (array of implicitStepSchema), `processedAt` (ISO 8601 string)
  - [ ] 1.6 Define `narrationResultSchema` — Zod object containing `divergences` (array of divergenceAnnotationSchema with `explanation` populated), `summary` (string — overall narrative summary of divergences)
  - [ ] 1.7 Define `synthesisOutputSchema` — Zod object containing the full synthesis result shape: `normalizedWorkflow` (workflow JSON), `divergenceAnnotations` (array of divergenceAnnotationSchema), `matchMetadata` (match results from Stage 3), `narrativeSummary` (string), `interviewCount` (number), `sourceInterviewIds` (array of UUIDs)
  - [ ] 1.8 Export all schemas and their inferred TypeScript types

- [ ] Task 2: Create classification prompt template `src/lib/ai/prompts/synthesis/classify-template.ts` (AC: #2)
  - [ ] 2.1 Create the file at `src/lib/ai/prompts/synthesis/classify-template.ts`
  - [ ] 2.2 Export a `buildClassifyPrompt(input: ClassifyPromptInput): string` function
  - [ ] 2.3 `ClassifyPromptInput` type includes: `matchResults` (Stage 3 output — step matches with match types), `individualSchemas` (array of individual process schemas with interviewee attribution), `skillContext` (domain vocabulary and synthesis elements from skill definition)
  - [ ] 2.4 Prompt instructs the LLM to: (a) examine unmatched steps and partial matches to identify divergences, (b) classify each divergence as one of three types: Genuinely Unique, Sequence Conflict, or Uncertain — Needs Review, (c) identify implicit steps (steps one interviewee mentioned that another did not), (d) attribute each divergence to specific interviewees, (e) assign confidence levels (0-1) to each classification
  - [ ] 2.5 Prompt includes the JSON Schema derived from `classificationResultSchema` as the required output format (for Claude's `output_format` parameter)
  - [ ] 2.6 Prompt includes domain context from the skill definition's `synthesisElements` to inform classification (e.g., knowing that "pre-sort" and "classify digitally" are semantically different approaches, not the same step described differently)

- [ ] Task 3: Create `src/lib/synthesis/divergence.ts` — Stage 4 classifier (AC: #1, #3, #7)
  - [ ] 3.1 Create the file at `src/lib/synthesis/divergence.ts`
  - [ ] 3.2 Export an async function `classifyDivergences(input: ClassifyInput): Promise<ClassificationResult>` where `ClassifyInput` includes: `projectId` (string), `processNodeId` (string), `synthesisVersion` (number), `matchResults` (Stage 3 output), `individualSchemas` (array of individual process schemas)
  - [ ] 3.3 Load the skill definition for the project via `skill-loader.ts` to get domain context for the prompt
  - [ ] 3.4 Build the classification prompt via `buildClassifyPrompt()` from `classify-template.ts`
  - [ ] 3.5 Resolve the LLM provider via `resolveProvider(projectId, 'synthesis_engine')` from `provider-registry.ts`
  - [ ] 3.6 Call `provider.sendMessage()` with the classification prompt and options: `{ temperature: 0.1, outputFormat: classificationResultJsonSchema }`
  - [ ] 3.7 Parse and validate the LLM response against `classificationResultSchema` using Zod — if validation fails, retry once
  - [ ] 3.8 Record timing: capture start time before LLM call, calculate `durationMs` after completion
  - [ ] 3.9 Persist classification results to `synthesis_checkpoints` table via a query function: `{ projectId, processNodeId, synthesisVersion, stage: 'classify', resultJson: classificationResult, durationMs }`
  - [ ] 3.10 Return the validated `ClassificationResult`
  - [ ] 3.11 All produced elements must have `sourceType: 'synthesis_inferred'`

- [ ] Task 4: Create narration prompt template `src/lib/ai/prompts/synthesis/narrate-template.ts` (AC: #5)
  - [ ] 4.1 Create the file at `src/lib/ai/prompts/synthesis/narrate-template.ts`
  - [ ] 4.2 Export a `buildNarratePrompt(input: NarratePromptInput): string` function
  - [ ] 4.3 `NarratePromptInput` type includes: `classificationResult` (Stage 4 output — divergences with types and attributions), `individualSchemas` (array of individual process schemas with interviewee names/roles), `matchResults` (Stage 3 output for context), `skillContext` (domain vocabulary)
  - [ ] 4.4 Prompt instructs the LLM to: (a) generate a concise human-readable explanation for each divergence, written for a non-technical supervisor audience, (b) reference interviewees by name and location, (c) explain WHY the divergence matters (operational impact), (d) generate an overall narrative summary of all divergences (2-4 sentences)
  - [ ] 4.5 Prompt includes the JSON Schema derived from `narrationResultSchema` as the required output format
  - [ ] 4.6 Temperature guidance: slightly higher (0.3-0.4) for natural language fluency while respecting structured output

- [ ] Task 5: Create `src/lib/synthesis/narrator.ts` — Stage 5 narrator (AC: #4, #6)
  - [ ] 5.1 Create the file at `src/lib/synthesis/narrator.ts`
  - [ ] 5.2 Export an async function `narrateDivergences(input: NarrateInput): Promise<NarrationResult>` where `NarrateInput` includes: `projectId` (string), `processNodeId` (string), `synthesisVersion` (number), `classificationResult` (Stage 4 output), `individualSchemas` (array), `matchResults` (Stage 3 output)
  - [ ] 5.3 Load the skill definition for domain context
  - [ ] 5.4 Build the narration prompt via `buildNarratePrompt()` from `narrate-template.ts`
  - [ ] 5.5 Resolve the LLM provider via `resolveProvider(projectId, 'synthesis_engine')`
  - [ ] 5.6 Call `provider.sendMessage()` with options: `{ temperature: 0.4, outputFormat: narrationResultJsonSchema }`
  - [ ] 5.7 Parse and validate the LLM response against `narrationResultSchema` — if validation fails, retry once
  - [ ] 5.8 Merge narration explanations back into the divergence annotations (each divergence now has its `explanation` field populated)
  - [ ] 5.9 Return the validated `NarrationResult` including enriched divergence annotations and overall narrative summary

- [ ] Task 6: Create database query functions for synthesis persistence (AC: #3, #6)
  - [ ] 6.1 Add to `src/lib/db/queries.ts`: `createSynthesisCheckpoint(data: { projectId, processNodeId, synthesisVersion, stage, resultJson, durationMs })` — inserts a row into `synthesis_checkpoints`
  - [ ] 6.2 Add to `src/lib/db/queries.ts`: `createSynthesisResult(data: { projectId, processNodeId, synthesisVersion, workflowJson, mermaidDefinition?, interviewCount })` — inserts a row into `synthesis_results`
  - [ ] 6.3 Add to `src/lib/db/queries.ts`: `getSynthesisCheckpoint(projectId, processNodeId, synthesisVersion, stage)` — retrieves a checkpoint for resume-on-retry
  - [ ] 6.4 Add to `src/lib/db/queries.ts`: `getLatestSynthesisVersion(projectId, processNodeId)` — returns the highest `synthesisVersion` for a process node, or 0 if none
  - [ ] 6.5 All query functions use Drizzle ORM — no raw SQL. Types inferred from Drizzle schema.

- [ ] Task 7: Integrate Stages 4-5 into the synthesis engine orchestrator (AC: #1-#6)
  - [ ] 7.1 Update `src/lib/synthesis/engine.ts` (created by Story 4.1) to call `classifyDivergences()` after Stage 3 completes
  - [ ] 7.2 After classification, call `narrateDivergences()` with the classification result
  - [ ] 7.3 After narration, assemble the final synthesis output: normalized workflow (from Stage 3 match results), enriched divergence annotations (from Stages 4+5), match metadata, narrative summary
  - [ ] 7.4 Validate the assembled output against `synthesisOutputSchema`
  - [ ] 7.5 Persist the final result to `synthesis_results` via `createSynthesisResult()` — Stage 5 output goes to `synthesis_results.workflow_json`, NOT to checkpoints
  - [ ] 7.6 On resume (retry after failure): check for existing `'classify'` checkpoint before re-running Stage 4. If checkpoint exists and is valid, skip to Stage 5.
  - [ ] 7.7 Log stage durations for observability

- [ ] Task 8: Create tests (AC: #1-#7)
  - [ ] 8.1 Create `src/lib/schema/synthesis.test.ts`:
    - Test `classificationResultSchema` validates correct classification output
    - Test `classificationResultSchema` rejects invalid divergence types
    - Test `divergenceAnnotationSchema` rejects `sourceType` values other than `'synthesis_inferred'`
    - Test `narrationResultSchema` validates correct narration output
    - Test `synthesisOutputSchema` validates complete synthesis result
    - Use real Zod validation — do NOT mock Zod
  - [ ] 8.2 Create `src/lib/synthesis/divergence.test.ts`:
    - Test `classifyDivergences()` calls LLM with correct temperature (0.1) and output format
    - Test `classifyDivergences()` persists checkpoint to `synthesis_checkpoints` with stage `'classify'`
    - Test `classifyDivergences()` retries once on Zod validation failure
    - Test `classifyDivergences()` throws on second validation failure (no infinite retry)
    - Test all returned elements have `sourceType: 'synthesis_inferred'`
    - Mock `LLMProvider` interface — NOT `@anthropic-ai/sdk` directly
    - Mock `@/lib/db/queries` for checkpoint persistence
  - [ ] 8.3 Create `src/lib/synthesis/narrator.test.ts`:
    - Test `narrateDivergences()` calls LLM with correct temperature (0.4) and output format
    - Test `narrateDivergences()` populates `explanation` on each divergence annotation
    - Test `narrateDivergences()` returns a narrative summary string
    - Test `narrateDivergences()` retries once on Zod validation failure
    - Mock `LLMProvider` interface
  - [ ] 8.4 Create `src/lib/ai/prompts/synthesis/classify-template.test.ts`:
    - Test `buildClassifyPrompt()` includes match results in the prompt
    - Test `buildClassifyPrompt()` includes individual schema data
    - Test `buildClassifyPrompt()` includes skill domain context
    - Test prompt mentions all three divergence types
  - [ ] 8.5 Create `src/lib/ai/prompts/synthesis/narrate-template.test.ts`:
    - Test `buildNarratePrompt()` includes classification results
    - Test `buildNarratePrompt()` includes interviewee names and roles
    - Test prompt instructs supervisor-friendly language
  - [ ] 8.6 Create `src/lib/synthesis/engine.test.ts` (extend from Story 4.1):
    - Test engine calls Stage 4 after Stage 3 completes
    - Test engine calls Stage 5 after Stage 4 completes
    - Test engine persists final result to `synthesis_results` (not checkpoints) after Stage 5
    - Test engine skips Stage 4 if valid `'classify'` checkpoint exists (resume behavior)
    - Test final output passes `synthesisOutputSchema` validation

## Dev Notes

### What Already Exists (from Stories 4.1 and earlier)

- `src/lib/synthesis/` — Directory with `.gitkeep` only (Story 4.1 creates `engine.ts` and `correlator.ts`)
- `src/lib/ai/prompts/synthesis/` — Directory with `.gitkeep` only (Story 4.1 creates `match-template.ts`)
- `src/lib/ai/provider.ts` — `LLMProvider` interface with `sendMessage()`, `streamResponse()`, `LLMCallOptions` (temperature, outputFormat)
- `src/lib/ai/provider-registry.ts` — `resolveProvider(projectId, skillName)` returns configured `LLMProvider`
- `src/lib/ai/claude-provider.ts` — Claude implementation of `LLMProvider`
- `src/lib/db/schema.ts` — All 12 tables including `synthesis_checkpoints` and `synthesis_results`
- `src/lib/db/queries.ts` — Exists (created by Story 2.1), needs new query functions added
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/schema/api-requests.ts` — Exists with login schema
- `src/lib/schema/workflow.ts` — DOES NOT EXIST yet (Process Schema types — may be created by Story 3.6 or needs to be created here if not yet available)

### Dependencies on Story 4.1

This story assumes Story 4.1 is complete and provides:
- `src/lib/synthesis/engine.ts` — Pipeline orchestrator with Stages 1-3
- `src/lib/synthesis/correlator.ts` — Stage 3 match results including match types (Exact Match, Subsumption, Partial Overlap, Near Miss, No Match)
- `src/lib/ai/prompts/synthesis/match-template.ts` — Stage 3 prompt template
- Match checkpoint persisted to `synthesis_checkpoints` with stage `'match'`
- Normalized workflow structure assembled from matched steps

If `src/lib/schema/workflow.ts` (Process Schema types) does not exist yet, this story must create it or the schemas must be defined in `src/lib/schema/synthesis.ts` alongside the synthesis-specific schemas.

### Synthesis Pipeline Data Flow (Stages 4-5)

```
Stage 3 Output (from Story 4.1):
  matchResults: { matches: [{ stepA, stepB, matchType, confidence }], unmatchedSteps: [...] }

  ↓

Stage 4: Classify (divergence.ts)
  Input: matchResults + individualSchemas + skillContext
  LLM call: temperature 0.1, structured output via classificationResultSchema
  Output: { divergences: [{ stepId, type, intervieweeIds, confidence }], implicitSteps: [...] }
  Persist: synthesis_checkpoints (stage: 'classify')

  ↓

Stage 5: Narrate (narrator.ts)
  Input: classificationResult + individualSchemas + matchResults + skillContext
  LLM call: temperature 0.4, structured output via narrationResultSchema
  Output: { divergences: [{ ...enriched with explanation }], summary: "..." }
  Persist: synthesis_results.workflow_json (NOT checkpoints)
```

### Divergence Types

| Type | Meaning | Example (IRS Demo) |
|---|---|---|
| Genuinely Unique | A step that one interviewee does that others do not — a real process variation | Janet Park's manual QC check (1 in 5 entries spot-checked) |
| Sequence Conflict | Same steps exist but in a different order | Austin pre-sorts physically before scanning; KC and Ogden scan first then sort digitally |
| Uncertain — Needs Review | The engine cannot confidently classify — may be terminology difference or genuine divergence | Ambiguous wording that could mean the same action or different actions |

### Implicit Steps

Steps mentioned by some interviewees but omitted by others. These are NOT automatically divergences — an omission might mean the interviewee forgot to mention it, or it might be genuinely different. The classifier must distinguish:
- `likely_omission`: The step is probably universal but wasn't mentioned (low confidence divergence)
- `genuinely_different`: The step is probably unique to specific interviewees (high confidence divergence)

### Temperature Settings

| Stage | File | Temperature | Rationale |
|---|---|---|---|
| Stage 4: Classify | `divergence.ts` | 0.1-0.2 | Deterministic classification — same inputs should produce same results |
| Stage 5: Narrate | `narrator.ts` | 0.3-0.4 | Slightly creative for natural language fluency while respecting structured output |

### Structured Output Pattern

Use Claude's `output_format` parameter with Zod-generated JSON Schema. The same Zod schema validates the response and generates the structured output constraint — single source of truth.

```typescript
import { classificationResultSchema } from '@/lib/schema/synthesis';
import { zodToJsonSchema } from 'zod-to-json-schema'; // or Zod v4's built-in .toJSONSchema()

const outputFormat = classificationResultSchema.toJSONSchema(); // Zod v4 native

const response = await provider.sendMessage(prompt, [], {
  temperature: 0.1,
  outputFormat,
});

const parsed = classificationResultSchema.parse(JSON.parse(response));
```

### Checkpoint Persistence Rules

- Checkpoints are **immutable** — new synthesis runs create new rows, never overwrite
- On retry, resume from the last successful checkpoint
- Stage 4 output goes to `synthesis_checkpoints` with stage `'classify'`
- Stage 5 output goes to `synthesis_results.workflow_json` — NOT to checkpoints
- Each checkpoint records `durationMs` for monitoring

### Database Schema Details (already in schema.ts)

**`synthesis_checkpoints` table columns:**
`id` (UUID PK), `projectId` (FK), `processNodeId` (FK), `synthesisVersion` (integer), `stage` (text), `resultJson` (JSONB), `durationMs` (integer, nullable), `createdAt` (timestamp)

**`synthesis_results` table columns:**
`id` (UUID PK), `projectId` (FK), `processNodeId` (FK), `synthesisVersion` (integer), `workflowJson` (JSONB), `mermaidDefinition` (text, nullable), `interviewCount` (integer), `createdAt` (timestamp), `updatedAt` (timestamp)

### Source Attribution — Critical Rule

The synthesis engine MUST NOT produce elements with `sourceType: interview_discovered` unless at least one interviewee actually said it AND the reflective summary was confirmed. Match inferences, granularity annotations, implicit step classifications, and divergence annotations are ALL `sourceType: 'synthesis_inferred'`.

### Service Boundaries — Enforced

- `@anthropic-ai/sdk` imported ONLY in `src/lib/ai/` — `divergence.ts` and `narrator.ts` call the `LLMProvider` interface, never the SDK
- Drizzle imported ONLY in `src/lib/db/` — synthesis modules call query functions from `@/lib/db/queries`, never raw SQL
- Prompts assembled ONLY via `prompt-assembler.ts` and template files in `src/lib/ai/prompts/synthesis/`
- Skill definitions loaded ONLY via `skill-loader.ts`

### LLM Call Pattern

Both `divergence.ts` and `narrator.ts` follow the same pattern:
1. Resolve provider via `resolveProvider(projectId, 'synthesis_engine')`
2. Build prompt via the appropriate template function
3. Call `provider.sendMessage()` with prompt + options (temperature, outputFormat)
4. Parse response as JSON
5. Validate against Zod schema
6. On validation failure: retry once (same prompt, same provider call)
7. On second failure: throw a structured error

### Mock Strategy for Tests

- Synthesis module tests (`divergence.test.ts`, `narrator.test.ts`): mock `LLMProvider` interface (return pre-crafted JSON responses), mock `@/lib/db/queries` for checkpoint persistence, mock `skill-loader.ts` for domain context
- Prompt template tests: pure functions, no mocks needed — verify prompt string content
- Schema tests: real Zod validation — never mock Zod
- Engine integration tests: mock `divergence.ts` and `narrator.ts` module exports to test orchestration flow
- Do NOT mock `@anthropic-ai/sdk`, Drizzle ORM, or the DB connection directly

### What NOT to Do

- Do NOT create the Mermaid diagram generation (Story 4.3)
- Do NOT create the synthesis retrieval API route (Story 4.3)
- Do NOT create the synthesis trigger API route (Story 4.1 creates the POST route)
- Do NOT create supervisor UI components (Epic 5)
- Do NOT import `@anthropic-ai/sdk` in `divergence.ts` or `narrator.ts` — use `LLMProvider` interface only
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT hardcode prompts — use template functions
- Do NOT tag any engine-produced element as `sourceType: 'interview_discovered'`
- Do NOT store Stage 5 output in `synthesis_checkpoints` — it goes to `synthesis_results`
- Do NOT use temperatures above 0.2 for classification (Stage 4) or above 0.5 for narration (Stage 5)

### Project Structure Notes

Files **created** by this story:
- `src/lib/synthesis/divergence.ts` — Stage 4: Divergence classification
- `src/lib/synthesis/narrator.ts` — Stage 5: Narrative generation
- `src/lib/ai/prompts/synthesis/classify-template.ts` — Classification prompt builder
- `src/lib/ai/prompts/synthesis/narrate-template.ts` — Narration prompt builder
- `src/lib/schema/synthesis.ts` — Zod schemas for synthesis classification and output

Files **modified** by this story:
- `src/lib/db/queries.ts` — Add synthesis checkpoint and result query functions
- `src/lib/synthesis/engine.ts` — Integrate Stages 4-5 into the pipeline orchestrator

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete
- `src/lib/db/connection.ts` — already complete
- `src/lib/ai/provider.ts` — already complete
- `src/lib/ai/provider-registry.ts` — already complete
- `package.json` — no new dependencies needed (Zod v4 has built-in JSON Schema generation)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2 — Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/architecture.md#Directory Structure — synthesis/ files, prompts/synthesis/ files]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Synthesis pipeline stages 4-5]
- [Source: _bmad-output/coding-standards.md#Section 4 — Synthesis Pipeline Coding Rules (temperature, structured output, checkpoints)]
- [Source: _bmad-output/coding-standards.md#Section 10 — Source Type Attribution Rules]
- [Source: _bmad-output/planning-artifacts/prd.md#FR22-FR24 — Synthesis requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#FR33 — Process Schema structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DivergenceAnnotation — Three divergence types with colors]
- [Source: _bmad-output/project-context.md#Service Boundaries — Import restrictions]
- [Source: _bmad-output/project-context.md#Two-dimensional AI — Provider resolution for synthesis_engine skill]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
