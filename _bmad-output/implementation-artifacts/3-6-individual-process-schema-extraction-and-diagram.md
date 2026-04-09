# Story 3.6: Individual Process Schema Extraction & Diagram Generation

Status: complete

## Story

As an interviewee,
I want the system to extract my described process and show me a personal diagram I can validate,
So that I can confirm my knowledge was captured accurately.

## Acceptance Criteria

1. **Given** an interview reaches completion (5-8 exchanges) **When** extraction runs **Then** `src/lib/interview/schema-extractor.ts` performs programmatic NLP extraction via compromise.js (FR79)
2. **Given** the extraction module **When** compromise.js is imported **Then** it is imported only in `schema-extractor.ts` (service boundary)
3. **Given** a programmatic extraction result **When** quality gate runs **Then** it checks structural validity (Zod), completeness (step count vs. summary count), and richness (decision points when conditional language exists) (FR80)
4. **Given** a quality gate failure **When** fallback triggers **Then** automatic LLM fallback is triggered transparently — interviewee never sees a failed extraction (FR81)
5. **Given** a valid Process Schema **When** diagram generation runs **Then** `src/lib/interview/individual-mermaid-generator.ts` converts the schema to a simple vertical Mermaid.js flowchart (rounded rectangles for steps, diamonds for decisions, arrows for flow) (FR82)
6. **Given** diagram generation completes **When** the diagram is presented **Then** it renders in a DiagramCanvas (max-width 700px, 12px radius, pan/zoom controls top-right, text alternative via `<details><summary>`) with "Yes, that looks right" (green primary) and "Something's not right" (ghost) buttons (FR83, UX-DR7)
7. **Given** extraction begins **When** the interviewee is waiting **Then** "Let me put together what you described..." message appears with pulsing placeholder (2-5 sec) before diagram fades in (UX-DR15)
8. **Given** a confirmed diagram **When** the interviewee clicks "Yes, that looks right" **Then** the validated individual schema is stored as a persistent artifact in Process Schema format (FR85)
9. **Given** a confirmed diagram **When** persistence completes **Then** interview state transitions to Captured via state machine

## Tasks / Subtasks

- [x] Task 1: Create Process Schema types `src/lib/schema/workflow.ts` (AC: #1, #5, #8)
  - [x] 1.1 Define `IndividualStep` Zod schema with fields: `id` (UUID), `label` (string, verb-phrase), `type` (`'step'` | `'decision'`), `sourceType` (`'interview_discovered'` | `'synthesis_inferred'`), `sourceExchangeIds` (string array — segment IDs of verified summaries that contributed)
  - [x] 1.2 Define `IndividualConnection` Zod schema with fields: `from` (step ID), `to` (step ID), `label` (optional string — for decision branch labels like "Yes" / "No")
  - [x] 1.3 Define `IndividualProcessSchema` Zod schema with fields: `schemaVersion` (string, e.g. `"1.0"`), `processNodeId` (UUID), `interviewId` (UUID), `steps` (array of `IndividualStep`), `connections` (array of `IndividualConnection`), `metadata` (object: `extractionMethod` (`'programmatic'` | `'llm_fallback'`), `extractedAt` (ISO 8601 string), `stepCount` (number), `decisionPointCount` (number))
  - [x] 1.4 Export the Zod schemas and inferred TypeScript types (`IndividualStep`, `IndividualConnection`, `IndividualProcessSchema`)
  - [x] 1.5 This file is the single source of truth consumed by extraction, Mermaid generation, and later by synthesis — keep it clean and well-documented

- [x] Task 2: Create NLP extraction pipeline `src/lib/interview/schema-extractor.ts` (AC: #1, #2, #3, #4)
  - [x] 2.1 Import `compromise` (v14.15.0) — this is the ONLY file that may import it (service boundary)
  - [x] 2.2 Implement `extractProcessSchema(verifiedSummaries: VerifiedSummary[], context: ExtractionContext): Promise<IndividualProcessSchema>` where:
    - `VerifiedSummary` = `{ exchangeId: string; segmentId: string; content: string; sequenceNumber: number }` — the confirmed reflective/revised summaries from the interview
    - `ExtractionContext` = `{ interviewId: string; processNodeId: string; projectId: string }` — context needed for schema metadata and LLM fallback
  - [x] 2.3 Implement programmatic NLP extraction function `extractProgrammatic(summaries: VerifiedSummary[]): IndividualProcessSchema`:
    - Use `compromise(text)` on each verified summary
    - Extract verb-object pairs via `.verbs()` and `.nouns()` to identify process steps (label = verb + object, e.g. "Scan documents", "Sort mail")
    - Detect temporal sequence from conversational position (summary order) and temporal markers ("first", "then", "next", "after", "finally", "before")
    - Detect decision points from conditional patterns: look for "if", "when", "depends", "unless", "sometimes", "either", "or" — these become `type: 'decision'` steps
    - Generate UUIDs for each step
    - Build connections array based on sequential order, with decision branches getting labeled connections
    - Set `sourceType: 'interview_discovered'` on all steps (these come from verified summaries)
    - Populate `sourceExchangeIds` with the segment IDs of the summaries that contributed to each step
  - [x] 2.4 Implement quality gate function `runQualityGate(schema: unknown): QualityGateResult`:
    - **Structural check:** Parse with `IndividualProcessSchema` Zod schema via `.safeParse()` — must succeed
    - **Completeness check:** `schema.steps.length >= Math.ceil(summaries.length / 2)` — at least 1 step per 2 confirmed summaries
    - **Richness check:** If any verified summary contains conditional language (if/when/depends/unless/sometimes), then `schema.metadata.decisionPointCount >= 1`
    - Return `{ passed: boolean; checks: { structural: boolean; completeness: boolean; richness: boolean }; scores: { stepCount: number; decisionPointCount: number; summaryCount: number } }`
  - [x] 2.5 Implement LLM fallback function `extractViaLlm(summaries: VerifiedSummary[], context: ExtractionContext): Promise<IndividualProcessSchema>`:
    - Resolve the LLM provider via `provider-registry.ts` for the project's `interview_agent` skill
    - Send the verified summaries as input with a system prompt requesting Process Schema JSON output
    - Use structured output mode (Zod schema → JSON Schema) to constrain the LLM response to valid `IndividualProcessSchema`
    - Set `extractionMethod: 'llm_fallback'` in metadata
    - Validate LLM output with Zod before returning — if LLM also fails, throw an error (this is an exceptional case; the interviewee would see the diagram generation loading state fail)
  - [x] 2.6 Implement the orchestration in `extractProcessSchema()`:
    - Call `extractProgrammatic()` first
    - Run `runQualityGate()` on the result
    - If quality gate passes → return programmatic result
    - If quality gate fails → call `extractViaLlm()` transparently (no user notification)
    - Log extraction attempt with: method used (`programmatic` or `llm_fallback`), quality gate results (pass/fail per check with scores), extraction duration in ms, step count produced
  - [x] 2.7 The extractor does NOT import Drizzle — it receives verified summaries as input and returns a schema as output. DB operations happen in the calling route handler

- [x] Task 3: Create Mermaid diagram generator `src/lib/interview/individual-mermaid-generator.ts` (AC: #5)
  - [x] 3.1 Implement `generateIndividualMermaid(schema: IndividualProcessSchema): string` that converts Process Schema JSON to a Mermaid.js flowchart definition string
  - [x] 3.2 Use `flowchart TD` (top-down/vertical) orientation
  - [x] 3.3 Render steps as rounded rectangles: `nodeId("Step Label")` — Mermaid's `()` syntax produces rounded rectangles
  - [x] 3.4 Render decision points as diamonds: `nodeId{"Decision Label?"}` — Mermaid's `{}` syntax produces diamonds
  - [x] 3.5 Render connections as arrows: `nodeA --> nodeB` for unlabeled, `nodeA -->|"Yes"| nodeB` for labeled (decision branches)
  - [x] 3.6 Generate sanitized node IDs from step IDs (replace hyphens with underscores, prefix with `s_` to avoid Mermaid reserved words)
  - [x] 3.7 Implement `generateTextAlternative(schema: IndividualProcessSchema): string` — produces a structured plain-text description of the process for the `<details><summary>` accessibility fallback:
    - "Process: [process name]"
    - "Steps: 1. [Step label] 2. [Step label] ..."
    - "Decision points: [Decision label] — [branch labels]"
    - "Flow: [Step 1] leads to [Step 2] leads to ..."

- [x] Task 4: Create DiagramCanvas component `src/components/diagram/diagram-canvas.tsx` (AC: #6, #7)
  - [x] 4.1 Create as a Client Component (`"use client"`) — Mermaid.js requires browser DOM
  - [x] 4.2 Props: `mermaidDefinition: string`, `textAlternative: string`, `isLoading?: boolean`, `onConfirm?: () => void`, `onReject?: () => void`, `variant: 'individual-interview' | 'individual-carousel' | 'synthesis'`
  - [x] 4.3 Use `src/hooks/use-mermaid.ts` hook (create in Task 5) to render the Mermaid definition into SVG
  - [x] 4.4 Layout: `max-width: 700px` for individual variants, full panel width for synthesis variant. Background `--card`. Border radius 12px (`--radius-lg`). Shadow `--shadow-md`
  - [x] 4.5 Pan/zoom controls: absolute-positioned top-right overlay with `+`, `-`, `Fit` buttons (36px each). Pan via click-drag on diagram. Zoom via scroll wheel or +/- buttons. Fit resets to show full diagram
  - [x] 4.6 Implement pan/zoom with CSS `transform: translate(x, y) scale(s)` on the diagram container, tracking state with `useState`
  - [x] 4.7 Text alternative: render `<details><summary>View text description</summary><p>{textAlternative}</p></details>` below the diagram canvas
  - [x] 4.8 Loading state (`isLoading=true`): display "Let me put together what you described..." agent message with pulsing placeholder animation (pulse CSS animation on a card-sized placeholder, 2-5 sec duration)
  - [x] 4.9 Diagram appearance: when `isLoading` transitions to `false`, fade in the diagram with a CSS transition (`opacity 0 → 1`, `transition: opacity 500ms ease-in`)
  - [x] 4.10 For `variant='individual-interview'` only: render confirm/reject buttons below the diagram:
    - "Yes, that looks right" — green primary button (`--success` bg, white text, weight 600, 8px radius)
    - "Something's not right" — ghost button (no border, text only, `--foreground` color)
    - Buttons call `onConfirm` / `onReject` callbacks respectively
  - [x] 4.11 Keyboard accessibility: arrow keys for pan, `+`/`-` for zoom, Enter activates focused button. Focus indicators (2px solid primary, 2px offset) on all interactive elements via `:focus-visible`
  - [x] 4.12 Do NOT import Mermaid.js directly — use the `use-mermaid` hook which handles dynamic import

- [x] Task 5: Create Mermaid rendering hook `src/hooks/use-mermaid.ts` (AC: #6)
  - [x] 5.1 Implement `useMermaid(definition: string, containerId: string): { svg: string | null; isRendering: boolean; error: string | null }`
  - [x] 5.2 Dynamically import `mermaid` (v11.14.0) using `import('mermaid')` — no SSR, no static import
  - [x] 5.3 Initialize Mermaid with theme settings on first load (only once per session)
  - [x] 5.4 Call `mermaid.render(containerId, definition)` to produce SVG string
  - [x] 5.5 Handle errors gracefully — if Mermaid parsing fails, set `error` with a descriptive message. Do not throw
  - [x] 5.6 Re-render when `definition` changes (via `useEffect` dependency)

- [x] Task 6: Create API routes for schema operations (AC: #6, #8, #9)
  - [x] 6.1 Create `src/app/api/interview/[token]/schema/route.ts` with GET and POST handlers
  - [x] 6.2 **GET handler** — `GET /api/interview/[token]/schema`:
    - Validate token format via `validateTokenFormat()` from `@/lib/interview/token`
    - Look up token → interview via query functions from `@/lib/db/queries`
    - If interview status is not `completed`, `validating`, or `captured`, return 404 with `{ error: { message: "No schema available for this interview", code: "SCHEMA_NOT_AVAILABLE" } }`
    - If individual process schema exists in DB (check `individual_process_schemas` table), return it: `{ data: { schema: schemaJson, mermaidDefinition, textAlternative, validationStatus } }`
    - If interview is `completed` but no schema exists yet, trigger extraction:
      - Query verified summaries (exchanges where `isVerified = true`) via `@/lib/db/queries`
      - Call `extractProcessSchema(summaries, context)` from `@/lib/interview/schema-extractor`
      - Call `generateIndividualMermaid(schema)` from `@/lib/interview/individual-mermaid-generator`
      - Call `generateTextAlternative(schema)` from `@/lib/interview/individual-mermaid-generator`
      - Persist schema, Mermaid definition to `individual_process_schemas` table via query function with `validationStatus: 'pending'`, `extractionMethod` from schema metadata
      - Transition interview status to `validating` via state machine
      - Return the generated schema and diagram
    - Wrap in try/catch — on error return `{ error: { message: "An unexpected error occurred", code: "INTERNAL_ERROR" } }` with HTTP 500
  - [x] 6.3 **POST handler** — `POST /api/interview/[token]/schema` (confirm validation):
    - Validate token format
    - Look up token → interview → individual schema
    - Interview must be in `validating` status — if not, return 400 with `{ error: { message: "Interview is not in validating state", code: "INVALID_STATE" } }`
    - Update `validationStatus` to `'validated'` on the `individual_process_schemas` row
    - Transition interview status from `validating` to `captured` via state machine (`transitionInterviewStatus()` from `@/lib/synthesis/state-machine.ts`)
    - Return `{ data: { interviewState: 'captured', validationStatus: 'validated' } }`
    - Wrap in try/catch — on error return 500 with `INTERNAL_ERROR`
  - [x] 6.4 Both handlers follow Next.js 16 async params pattern: `{ params }: { params: Promise<{ token: string }> }`
  - [x] 6.5 Route handlers import from `@/lib/db/queries`, `@/lib/interview/token`, `@/lib/interview/schema-extractor`, `@/lib/interview/individual-mermaid-generator`, `@/lib/synthesis/state-machine` — they do NOT import Drizzle directly

- [x] Task 7: Add new query functions to `src/lib/db/queries.ts` (AC: #1, #8)
  - [x] 7.1 Implement `getVerifiedExchangesByInterviewId(interviewId: string): Promise<ExchangeRecord[]>` — queries `interviewExchanges` where `interviewId` matches AND `isVerified = true`, ordered by `sequenceNumber` ascending
  - [x] 7.2 Implement `getIndividualProcessSchemaByInterviewId(interviewId: string): Promise<SchemaRecord | null>` — queries `individualProcessSchemas` by `interviewId`, returns row or null
  - [x] 7.3 Implement `createIndividualProcessSchema(data: { interviewId, processNodeId, schemaJson, mermaidDefinition, validationStatus, extractionMethod }): Promise<SchemaRecord>` — inserts into `individualProcessSchemas` table, returns created record
  - [x] 7.4 Implement `updateIndividualProcessSchemaValidation(schemaId: string, validationStatus: string): Promise<SchemaRecord>` — updates `validationStatus` on existing row, returns updated record
  - [x] 7.5 All query functions use Drizzle — this is one of the only files allowed to import it

- [x] Task 8: Create diagram review component `src/components/interview/diagram-review.tsx` (AC: #6, #7, #8, #9)
  - [x] 8.1 Create as a Client Component (`"use client"`)
  - [x] 8.2 Props: `token: string`, `interviewId: string`
  - [x] 8.3 On mount, call `GET /api/interview/[token]/schema` via `fetch()`
  - [x] 8.4 While loading: render DiagramCanvas with `isLoading={true}` — shows "Let me put together what you described..." with pulsing placeholder
  - [x] 8.5 When schema returns: render DiagramCanvas with `isLoading={false}`, `mermaidDefinition`, `textAlternative`, `variant='individual-interview'`
  - [x] 8.6 On "Yes, that looks right" click (`onConfirm`): call `POST /api/interview/[token]/schema` to confirm validation. On success, notify parent component that interview is now Captured (via callback prop or event)
  - [x] 8.7 On "Something's not right" click (`onReject`): this story does NOT implement the correction flow — Story 3.7 handles it. For now, set a local state flag `correctionRequested: true` that the parent can observe. Log a console warning: "Correction flow not yet implemented (Story 3.7)"
  - [x] 8.8 Handle error states: if the GET or POST fails, display an error message in the diagram area
  - [x] 8.9 No interview data in browser localStorage/sessionStorage (NFR9) — all state is in component state or on the server

- [x] Task 9: Create tests (AC: #1-#9)
  - [x] 9.1 Create `src/lib/schema/workflow.test.ts`:
    - Test valid `IndividualProcessSchema` passes Zod validation
    - Test invalid schemas fail validation (missing steps, invalid types, missing metadata)
    - Test schema with decision points validates correctly
    - Use REAL Zod validation (never mock Zod schemas)
  - [x] 9.2 Create `src/lib/interview/schema-extractor.test.ts`:
    - Test programmatic extraction produces valid schema from sample verified summaries
    - Test quality gate passes for well-formed extraction
    - Test quality gate fails on structural invalidity (bad Zod parse)
    - Test quality gate fails on completeness (too few steps for summary count)
    - Test quality gate fails on richness (conditional language present but no decision points)
    - Test LLM fallback is called when quality gate fails — mock `LLMProvider` interface (not `@anthropic-ai/sdk`)
    - Test LLM fallback result passes Zod validation
    - Test logging captures method, quality gate results, duration, step count
    - Test `compromise` import is used (verify NLP functions are called)
  - [x] 9.3 Create `src/lib/interview/individual-mermaid-generator.test.ts`:
    - Test generates valid `flowchart TD` Mermaid syntax
    - Test steps render as rounded rectangles (parentheses syntax)
    - Test decision points render as diamonds (curly brace syntax)
    - Test labeled connections render with pipe syntax
    - Test text alternative includes all steps and decision points
    - Test node ID sanitization (hyphens → underscores, `s_` prefix)
  - [x] 9.4 Create `src/app/api/interview/[token]/schema/route.test.ts`:
    - Test GET with completed interview triggers extraction and returns schema
    - Test GET with validating interview returns existing schema
    - Test GET with captured interview returns existing schema
    - Test GET with active interview returns 404 SCHEMA_NOT_AVAILABLE
    - Test GET with invalid token returns 404 INVALID_TOKEN
    - Test POST confirms validation, transitions to captured, returns success
    - Test POST with non-validating interview returns 400 INVALID_STATE
    - Test POST with invalid token returns 404
    - Mock query functions from `@/lib/db/queries` — NOT Drizzle directly
    - Mock `extractProcessSchema` and `generateIndividualMermaid` from their respective modules
    - Mock `transitionInterviewStatus` from `@/lib/synthesis/state-machine`
  - [x] 9.5 Create `src/components/diagram/diagram-canvas.test.tsx`:
    - Test renders loading state with "Let me put together..." message
    - Test renders Mermaid diagram when not loading
    - Test confirm button calls `onConfirm` callback
    - Test reject button calls `onReject` callback
    - Test text alternative renders in `<details>` element
    - Test pan/zoom controls render with correct buttons
    - Test buttons only render for `individual-interview` variant
    - Mock `use-mermaid` hook to return test SVG
  - [x] 9.6 Create `src/hooks/use-mermaid.test.ts`:
    - Test dynamically imports Mermaid.js
    - Test returns SVG string on successful render
    - Test returns error on invalid Mermaid syntax
    - Test re-renders when definition changes
    - Mock `mermaid` module for dynamic import

## Dev Notes

### What Already Exists (from prior stories)

- `src/lib/db/schema.ts` — All 12 tables including `individualProcessSchemas` with columns: `id`, `interviewId` (unique FK), `processNodeId` (FK), `schemaJson` (JSONB), `mermaidDefinition` (text, nullable), `validationStatus` (text), `extractionMethod` (text), `createdAt`, `updatedAt`
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/db/queries.ts` — Exists with token and interview query functions from Stories 2.1, 3.2
- `src/lib/interview/token.ts` — UUID v4 validation utility
- `src/lib/interview/session.ts` — Interview session management (Story 3.2)
- `src/lib/synthesis/state-machine.ts` — Interview state machine with `transitionInterviewStatus()` (Story 3.2)
- `src/lib/ai/provider-registry.ts` — LLM provider registry with `resolveProvider()` (Story 1.4)
- `src/lib/ai/claude-provider.ts` — Claude provider implementation (Story 1.4)
- `src/app/api/interview/[token]/schema/` — Directory exists with `correct/` subdir (`.gitkeep` files only)
- `src/components/interview/` — Directory exists (`.gitkeep` only, or components from Stories 2.3, 3.5)
- `src/components/diagram/` — Directory does NOT exist — must be created by this story
- `src/lib/schema/workflow.ts` — DOES NOT EXIST — must be created by this story
- `src/hooks/use-mermaid.ts` — DOES NOT EXIST — must be created by this story
- `src/lib/schema/api-requests.ts` — Exists with login schema from Story 1.3

### Database Schema Details (already in schema.ts)

**`individualProcessSchemas` table columns:**
`id` (UUID PK), `interviewId` (FK -> interviews, unique), `processNodeId` (FK -> processNodes), `schemaJson` (JSONB), `mermaidDefinition` (text, nullable), `validationStatus` (text), `extractionMethod` (text), `createdAt`, `updatedAt`

**`interviewExchanges` table columns (relevant for querying verified summaries):**
`id` (UUID PK), `interviewId` (FK -> interviews), `segmentId` (UUID), `exchangeType` (enum), `speaker` (enum), `content` (text), `isVerified` (boolean), `sequenceNumber` (integer), `createdAt`

### Interview State Machine (from Story 3.2)

```
Pending -> Active -> Completed -> Validating -> Captured
```

This story uses two transitions:
- `Completed -> Validating` — when extraction succeeds and diagram is presented
- `Validating -> Captured` — when interviewee confirms the diagram

Both transitions are enforced by `transitionInterviewStatus()` in `src/lib/synthesis/state-machine.ts`. Route handlers call this function; they do not contain transition logic directly.

### Extraction Pipeline Architecture

```
Verified reflective summaries (from DB)
  |
  v
schema-extractor.ts
  |
  +--> Tier 1: Programmatic NLP (compromise.js)
  |      - verb-object decomposition via .verbs(), .nouns()
  |      - temporal sequence from order + temporal markers
  |      - decision points from conditional patterns
  |      - ~50-200ms, deterministic, no API cost
  |
  +--> Tier 2: Quality Gate (heuristic checks, no LLM)
  |      - Structural: Zod validation against IndividualProcessSchema
  |      - Completeness: >= 1 step per 2 confirmed summaries
  |      - Richness: >= 1 decision point if conditional language exists
  |      - ANY check fails -> automatic LLM fallback
  |
  +--> Tier 3: LLM Fallback (automatic on quality gate failure)
         - Same verified summaries as input
         - Process Schema as output contract via structured output mode
         - Uses project's interview_agent LLM provider
         - Interviewee sees only slightly longer loading (~2-4s vs ~200ms)
```

### Observability Logging

`schema-extractor.ts` must log every extraction attempt with:
- Method used: `programmatic` or `llm_fallback`
- Quality gate results: pass/fail per check with scores
- Extraction duration in ms
- Step count produced
- The `extractionMethod` field is also stored in the `individual_process_schemas` table

### Individual Mermaid Generator Rules (from coding-standards.md Section 9)

Three visual elements ONLY:
- Rounded rectangles for steps
- Diamonds for decision points
- Arrows for sequence flow
- NO BPMN notation, NO swimlanes, NO parallel paths (FR90)

### DiagramCanvas Component Spec (from UX design specification)

**Anatomy:**
```
+------------------------------------------+
|                          [+][-][Fit]     |  <- Controls overlay, top-right
|                                           |
|         [Mermaid.js rendered diagram]     |
|                                           |
+------------------------------------------+
```

**Interactions:** Pan (click-drag), zoom (scroll wheel or +/- buttons), fit (reset to show full diagram).

**Specs:** Background `--card`. Radius 12px (`--radius-lg`). Shadow `--shadow-md`. Padding 32px (interview context).

**Individual interview variant:** Max-width 700px. Confirm/correct buttons below. No export.

**Accessibility:** `<details><summary>` with structured text alternative. Pan/zoom controls keyboard-accessible (arrow keys for pan, +/- for zoom). Focus indicators (2px solid primary, 2px offset) via `:focus-visible`.

**Keyboard navigation order:** Diagram canvas (arrow keys pan, +/- zoom) -> "Yes, that looks right" -> "Something's not right". Enter activates selected button.

### Loading State Pattern (UX-DR15)

1. Agent message: "Let me put together what you described..." (left-aligned, agent style)
2. Pulsing placeholder where diagram will appear (2-5 sec, matches diagram card dimensions)
3. Diagram fades in (opacity transition, no pop-in, no layout shift)

### Source Attribution Rules

All steps extracted from verified reflective summaries get `sourceType: 'interview_discovered'` — the interviewee confirmed these summaries. The `sourceExchangeIds` field traces each step back to the specific segments that contributed.

Never tag as `interview_discovered` unless an interviewee confirmed the reflective summary containing it.

### Button Hierarchy (from UX spec)

- "Yes, that looks right" — Confirm variant: solid fill, `--success` bg, white text, weight 600, 8px radius
- "Something's not right" — Ghost variant: no border, text only with hover bg, `--foreground` color

### API Response Format (enforced)

```typescript
// Success — schema retrieval
{ data: { schema: IndividualProcessSchema, mermaidDefinition: string, textAlternative: string, validationStatus: string } }

// Success — confirmation
{ data: { interviewState: 'captured', validationStatus: 'validated' } }

// Error
{ error: { message: string, code: string } }
```

All responses use `NextResponse.json()`. Dates as ISO 8601 strings. No unwrapped data.

### Service Boundaries -- Enforced

- `compromise` imported ONLY in `src/lib/interview/schema-extractor.ts`
- Drizzle imported ONLY in `src/lib/db/queries.ts` (and `connection.ts`)
- `@anthropic-ai/sdk` imported ONLY in `src/lib/ai/` — the schema extractor calls `LLMProvider` interface via provider registry, never the SDK directly
- Mermaid.js loaded via dynamic import in `src/hooks/use-mermaid.ts` — never statically imported
- State transitions through `src/lib/synthesis/state-machine.ts` — route handlers do not contain transition logic

### Next.js 16 Route Handler Pattern

```typescript
// src/app/api/interview/[token]/schema/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params; // Next.js 16: params is a Promise
  // ...
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  // ...
}
```

### Mock Strategy for Tests

- Schema extractor tests: mock `LLMProvider` interface (not `@anthropic-ai/sdk`), use real Zod validation, use real `compromise` for programmatic extraction tests
- Route handler tests: mock `@/lib/db/queries`, `@/lib/interview/schema-extractor`, `@/lib/interview/individual-mermaid-generator`, `@/lib/synthesis/state-machine`
- Component tests: mock `use-mermaid` hook, mock `fetch` for API calls
- Zod validation: ALWAYS test with real implementations — never mock

### What NOT to Do

- Do NOT create the diagram correction flow (Story 3.7) — "Something's not right" sets a flag but does not trigger correction
- Do NOT create the read-only completed view (separate story)
- Do NOT create synthesis components — this is individual schema only
- Do NOT import `compromise` outside `schema-extractor.ts`
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT statically import Mermaid.js — always dynamic import
- Do NOT store interview data in browser localStorage/sessionStorage (NFR9)
- Do NOT add BPMN notation, swimlanes, or parallel paths to the individual diagram (FR90)
- Do NOT hardcode interview prompts for the LLM fallback — use prompt-assembler pattern
- Do NOT return unwrapped API responses — always `{ data }` or `{ error }`

### Project Structure Notes

Files **created** by this story:
- `src/lib/schema/workflow.ts` — Process Schema Zod types (single source of truth)
- `src/lib/interview/schema-extractor.ts` — NLP extraction pipeline
- `src/lib/interview/individual-mermaid-generator.ts` — Schema -> Mermaid flowchart
- `src/components/diagram/diagram-canvas.tsx` — Pan/zoom Mermaid wrapper (shared component)
- `src/hooks/use-mermaid.ts` — Mermaid.js rendering hook (dynamic import)
- `src/app/api/interview/[token]/schema/route.ts` — GET (trigger/return schema) and POST (confirm validation)
- `src/components/interview/diagram-review.tsx` — Diagram review container component

Files **modified** by this story:
- `src/lib/db/queries.ts` — Add schema query functions (getVerifiedExchangesByInterviewId, getIndividualProcessSchemaByInterviewId, createIndividualProcessSchema, updateIndividualProcessSchemaValidation)

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete
- `src/lib/db/connection.ts` — already complete
- `src/lib/interview/token.ts` — already complete
- `src/lib/synthesis/state-machine.ts` — already complete
- `package.json` — compromise, mermaid, and Zod already installed

### Dependencies (must be complete before this story)

- Story 1.4: LLM provider registry and Claude provider (for LLM fallback)
- Story 3.2: Interview session management, exchange persistence, state machine (for verified summaries and state transitions)
- Story 3.5: Conversation thread UI (extraction runs after interview completion in that UI context)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6 -- Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow -- Individual schema generation pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Interview State Machine -- Completed -> Validating -> Captured]
- [Source: _bmad-output/planning-artifacts/architecture.md#Directory Structure -- File locations]
- [Source: _bmad-output/coding-standards.md#Section 5 -- Individual Schema Extraction Pipeline]
- [Source: _bmad-output/coding-standards.md#Section 9 -- Individual Process Diagrams]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DiagramCanvas -- Component spec]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey 1 -- Diagram generation flow]
- [Source: _bmad-output/planning-artifacts/prd.md#FR79-FR85 -- Individual Process Schema requirements]
- [Source: _bmad-output/project-context.md#Service Boundaries -- compromise only in schema-extractor.ts]
- [Source: _bmad-output/project-context.md#Critical Rules -- Individual schema extraction pipeline]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
N/A — all tests pass on first full-suite run.

### Completion Notes List
- Process Schema Zod types created with `zod/v4` — `IndividualStep`, `IndividualConnection`, `IndividualProcessSchema`
- NLP extraction pipeline uses `compromise` v14.15.0 for verb-object extraction with conditional pattern detection
- Quality gate checks structural (Zod), completeness (step/summary ratio), and richness (decision point presence)
- LLM fallback transparently engages via `resolveProvider()` when quality gate fails
- Mermaid generator outputs `flowchart TD` with rounded rectangles for steps and diamonds for decisions
- DiagramCanvas component implements pan/zoom (CSS transform), keyboard navigation, and loading/fade-in states
- useMermaid hook dynamically imports mermaid.js — no SSR
- API route GET triggers extraction on completed interviews, POST confirms validation and transitions to captured
- All service boundaries enforced: compromise only in schema-extractor, Drizzle only in queries, Mermaid only via dynamic import
- 62 new tests across 6 test files, all passing

### File List
- `src/lib/schema/workflow.ts` (created)
- `src/lib/schema/workflow.test.ts` (created)
- `src/lib/interview/schema-extractor.ts` (created)
- `src/lib/interview/schema-extractor.test.ts` (created)
- `src/lib/interview/individual-mermaid-generator.ts` (created)
- `src/lib/interview/individual-mermaid-generator.test.ts` (created)
- `src/hooks/use-mermaid.ts` (created)
- `src/hooks/use-mermaid.test.ts` (created)
- `src/components/diagram/diagram-canvas.tsx` (created)
- `src/components/diagram/diagram-canvas.test.tsx` (created)
- `src/app/api/interview/[token]/schema/route.ts` (created)
- `src/app/api/interview/[token]/schema/route.test.ts` (created)
- `src/components/interview/diagram-review.tsx` (created)
- `src/lib/db/queries.ts` (modified — added 5 schema query functions)
