# Story 4.3: Synthesis Mermaid Generation & Retrieval API

Status: ready-for-dev

## Story

As a supervisor,
I want the synthesis results rendered as a diagram and retrievable via API,
So that the comparison view can display them.

## Acceptance Criteria

1. **Given** a completed synthesis result **When** the Mermaid diagram is generated **Then** `src/lib/synthesis/mermaid-generator.ts` converts the synthesis JSON to a Mermaid flowchart with divergence annotation markers on nodes (FR23)
2. **Given** a synthesis diagram **When** divergence annotations exist **Then** they are encoded in the Mermaid definition using CSS classes and node metadata so the rendering layer can add clickable badges with three types: "Genuinely Unique" (teal), "Sequence Conflict" (darker teal), "Uncertain — Needs Review" (amber) (UX-DR9)
3. **Given** a supervisor with an authenticated session **When** they call `GET /api/synthesis/[nodeId]` **Then** the API returns the synthesis results including normalized workflow, divergence annotations, individual schemas, and Mermaid definitions for both synthesis and individual diagrams
4. **Given** the synthesis retrieval API **When** any response is returned **Then** it follows the `{ data: T }` wrapper format (success) or `{ error: { message, code } }` format (error)
5. **Given** a supervisor viewing synthesis **When** the visualization loads **Then** it completes in < 5 seconds (MVP-NFR2)
6. **Given** a new interview has been captured **When** synthesis is re-triggered via `POST /api/synthesis/[nodeId]` **Then** the synthesis incorporates the additional interview data and produces a new version (MVP3)

## Tasks / Subtasks

- [ ] Task 1: Create `src/lib/synthesis/mermaid-generator.ts` (AC: #1, #2)
  - [ ] 1.1 Create function `generateSynthesisMermaid(synthesisWorkflow: SynthesisWorkflowJson): string` that accepts the `workflowJson` from `synthesis_results` and returns a Mermaid flowchart definition string
  - [ ] 1.2 Generate `flowchart TD` (top-down) Mermaid syntax with:
    - Rounded rectangles (`([...])`) for regular steps
    - Diamonds (`{...}`) for decision points
    - Arrows (`-->`) for sequence flow
    - Start/end nodes
  - [ ] 1.3 For steps with subsumption matches, generate nested `subgraph` blocks to visually group subsumed steps
  - [ ] 1.4 For steps with divergence annotations, apply CSS class names to nodes that encode the divergence type:
    - `class nodeId divergence-unique` for "Genuinely Unique" type
    - `class nodeId divergence-sequence` for "Sequence Conflict" type
    - `class nodeId divergence-uncertain` for "Uncertain — Needs Review" type
  - [ ] 1.5 Encode divergence metadata as Mermaid comments (`%%`) adjacent to annotated nodes — include divergence type, affected interviewee IDs, and a short description so the client rendering layer can parse them for badge generation
  - [ ] 1.6 Add `classDef` statements for each divergence type using teal and amber color tokens:
    - `classDef divergence-unique fill:#CCFBF1,stroke:#0D9488,stroke-width:2px` (teal)
    - `classDef divergence-sequence fill:#99F6E4,stroke:#0F766E,stroke-width:2px` (darker teal)
    - `classDef divergence-uncertain fill:#FEF3C7,stroke:#D97706,stroke-width:2px` (amber)
  - [ ] 1.7 Include step attribution as tooltip text where available (source interviewees for each step)
  - [ ] 1.8 Ensure generated Mermaid definitions are valid and renderable by Mermaid 11.14.0

- [ ] Task 2: Add database query functions in `src/lib/db/queries.ts` (AC: #3, #6)
  - [ ] 2.1 Add `getIndividualSchemasByNodeId(nodeId: string)` — queries `individualProcessSchemas` table by `processNodeId`, returns all individual schemas for the node with their associated interview data (interviewee name/role via join through `interviews` → `interviewTokens`)
  - [ ] 2.2 Add `getSynthesisResultByNodeIdWithVersion(nodeId: string, version?: number)` — queries `synthesis_results` by `processNodeId`, returns the latest version by default or a specific version if provided. (The existing `getSynthesisResultByNodeId` can be reused or extended.)
  - [ ] 2.3 Add `updateSynthesisResultMermaid(synthesisId: string, mermaidDefinition: string)` — updates the `mermaidDefinition` column on an existing `synthesis_results` row
  - [ ] 2.4 All query functions return typed results inferred from the Drizzle schema — do NOT define separate TypeScript types

- [ ] Task 3: Create `GET /api/synthesis/[nodeId]` route handler (AC: #3, #4, #5)
  - [ ] 3.1 Create `src/app/api/synthesis/[nodeId]/route.ts`
  - [ ] 3.2 Wrap the GET handler with `withSupervisorAuth` from `@/lib/auth/middleware` — supervisor session required
  - [ ] 3.3 Extract `nodeId` from route params: `{ params }: { params: Promise<{ nodeId: string }> }` (Next.js 16 async params)
  - [ ] 3.4 Validate that `nodeId` is a valid UUID format — if invalid, return 400 with `{ error: { message: "Invalid node ID format", code: "VALIDATION_ERROR" } }`
  - [ ] 3.5 Look up process node via `getProcessNodeById(nodeId)` — if not found, return 404 with `{ error: { message: "Process node not found", code: "NODE_NOT_FOUND" } }`
  - [ ] 3.6 Look up the latest synthesis result via `getSynthesisResultByNodeId(nodeId)` — if not found, return 404 with `{ error: { message: "No synthesis results available for this process node", code: "SYNTHESIS_NOT_FOUND" } }`
  - [ ] 3.7 Look up all individual schemas for the node via `getIndividualSchemasByNodeId(nodeId)`
  - [ ] 3.8 Return success response wrapped per API standard:
    ```typescript
    {
      data: {
        synthesis: {
          id: synthesisResult.id,
          processNodeId: synthesisResult.processNodeId,
          synthesisVersion: synthesisResult.synthesisVersion,
          workflowJson: synthesisResult.workflowJson,
          mermaidDefinition: synthesisResult.mermaidDefinition,
          interviewCount: synthesisResult.interviewCount,
          createdAt: synthesisResult.createdAt,
        },
        individualSchemas: individualSchemas.map(schema => ({
          id: schema.id,
          interviewId: schema.interviewId,
          intervieweeName: schema.intervieweeName,
          intervieweeRole: schema.intervieweeRole,
          schemaJson: schema.schemaJson,
          mermaidDefinition: schema.mermaidDefinition,
          validationStatus: schema.validationStatus,
        })),
      }
    }
    ```
  - [ ] 3.9 Wrap in try/catch — on unexpected errors, return `{ error: { message: "An unexpected error occurred", code: "INTERNAL_ERROR" } }` with HTTP 500

- [ ] Task 4: Integrate Mermaid generation into synthesis pipeline (AC: #1, #6)
  - [ ] 4.1 After the synthesis pipeline completes (Stage 5 output stored in `synthesis_results`), call `generateSynthesisMermaid()` with the `workflowJson` from the synthesis result
  - [ ] 4.2 Persist the generated Mermaid definition to `synthesis_results.mermaidDefinition` via `updateSynthesisResultMermaid()`
  - [ ] 4.3 When synthesis is re-triggered (MVP3), the new synthesis version gets its own Mermaid definition — the old version's definition is preserved (immutable versioning)

- [ ] Task 5: Create tests (AC: #1-#6)
  - [ ] 5.1 Create `src/lib/synthesis/mermaid-generator.test.ts`:
    - Test that a minimal synthesis workflow (2 steps, no divergences) produces valid Mermaid `flowchart TD` syntax
    - Test that divergence annotations produce correct CSS class assignments (`divergence-unique`, `divergence-sequence`, `divergence-uncertain`)
    - Test that `classDef` statements are included for all three divergence types
    - Test that divergence metadata comments are embedded adjacent to annotated nodes
    - Test that subsumption matches produce nested `subgraph` blocks
    - Test that decision points produce diamond-shaped nodes
    - Test with the expected demo divergences (sort timing, classification method, QC check)
  - [ ] 5.2 Create `src/app/api/synthesis/[nodeId]/route.test.ts`:
    - Test valid request with supervisor session returns 200 with synthesis + individual schemas
    - Test unauthenticated request returns 401 with `UNAUTHORIZED`
    - Test non-supervisor role returns 403 with `FORBIDDEN`
    - Test invalid nodeId format returns 400 with `VALIDATION_ERROR`
    - Test nonexistent process node returns 404 with `NODE_NOT_FOUND`
    - Test process node with no synthesis returns 404 with `SYNTHESIS_NOT_FOUND`
    - Test response includes `mermaidDefinition` for both synthesis and individual schemas
    - Test response follows `{ data: T }` wrapper format
    - Test unexpected DB error returns 500 with `INTERNAL_ERROR`
    - Mock query functions from `@/lib/db/queries` — NOT the Drizzle ORM directly

## Dev Notes

### What Already Exists (from Earlier Stories)

- `src/lib/db/schema.ts` — All 12 tables defined including `synthesisResults` (with `workflowJson` JSONB, `mermaidDefinition` text, `synthesisVersion` integer, `interviewCount` integer) and `synthesisCheckpoints`
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/db/queries.ts` — Exists with query functions including `getSynthesisResultByNodeId(nodeId)` (returns latest version by `synthesisVersion` desc), `getProcessNodeById(nodeId)`, `getProjectById(projectId)`
- `src/lib/auth/middleware.ts` — `withSupervisorAuth` middleware exists and validates supervisor sessions, returns 401/403 on failure
- `src/lib/synthesis/` — Directory exists with `.gitkeep` only — `engine.ts`, `correlator.ts`, `divergence.ts`, `narrator.ts` are Story 4.1/4.2 scope
- `src/app/api/synthesis/[nodeId]/` — Directory exists with `.gitkeep` only — `route.ts` must be created by this story
- `src/lib/interview/individual-mermaid-generator.ts` — Does NOT exist yet (Story 3.3 scope) but follows the same pattern: converts schema JSON to Mermaid definition string. Reference for the generation approach.

### Database Schema Details (already in schema.ts)

**`synthesis_results` table columns:**
`id` (UUID PK), `projectId` (FK -> projects), `processNodeId` (FK -> processNodes), `synthesisVersion` (integer), `workflowJson` (JSONB), `mermaidDefinition` (text, nullable), `interviewCount` (integer), `createdAt`, `updatedAt`

**`individual_process_schemas` table columns:**
`id` (UUID PK), `interviewId` (FK -> interviews, unique), `processNodeId` (FK -> processNodes), `schemaJson` (JSONB), `mermaidDefinition` (text, nullable), `validationStatus` (text), `extractionMethod` (text), `createdAt`, `updatedAt`

**`synthesis_checkpoints` table columns:**
`id` (UUID PK), `projectId` (FK -> projects), `processNodeId` (FK -> processNodes), `synthesisVersion` (integer), `stage` (text), `resultJson` (JSONB), `durationMs` (integer, nullable), `createdAt`

### Mermaid Generation Approach

The synthesis Mermaid generator (`mermaid-generator.ts`) is richer than the individual generator:

- **Individual diagrams** (reference pattern): Three visual elements only — rounded rectangles for steps, diamonds for decision points, arrows for flow. No BPMN notation, no swimlanes (FR90).
- **Synthesis diagrams** (this story): Richer — subsumption matches as nested subgraphs, divergence annotations as color-coded annotated nodes, step attribution as tooltips/annotations (coding-standards.md Section 9).

**Divergence encoding in Mermaid definition:**
The Mermaid definition must encode divergence information in a way that the client-side rendering layer (`DiagramCanvas` component + `DivergenceAnnotation` component) can parse and overlay clickable badges. The strategy is:
1. **CSS classes on nodes** — `divergence-unique`, `divergence-sequence`, `divergence-uncertain` classes applied via Mermaid `class` statements, with `classDef` for visual styling
2. **Metadata comments** — Structured comments (`%% divergence: {...}`) adjacent to annotated nodes containing type, affected interviewee IDs, description, and confidence level. The client parses these after rendering to position badges.
3. **Node IDs** — Stable, deterministic node IDs (e.g., `step_1`, `decision_2`) so the client can map between Mermaid nodes and synthesis JSON data

**Three badge types (from UX-DR9):**

| Type | Label | Color | Mermaid Class |
|------|-------|-------|---------------|
| Genuinely Unique | "Genuinely Unique" | Teal (`#0D9488`) | `divergence-unique` |
| Sequence Conflict | "Sequence Conflict" | Darker teal (`#0F766E`) | `divergence-sequence` |
| Uncertain | "Uncertain -- Needs Review" | Amber (`#D97706`) | `divergence-uncertain` |

### GET /api/synthesis/[nodeId] Response Shape

The API must return enough data for the supervisor comparison view (Mode 2) to render both the synthesis diagram and the individual carousel:

```typescript
{
  data: {
    synthesis: {
      id: string;
      processNodeId: string;
      synthesisVersion: number;
      workflowJson: object;          // Full synthesis workflow with divergence annotations
      mermaidDefinition: string;      // Synthesis Mermaid flowchart definition
      interviewCount: number;
      createdAt: string;              // ISO 8601
    };
    individualSchemas: Array<{
      id: string;
      interviewId: string;
      intervieweeName: string;        // From interviewTokens join
      intervieweeRole: string | null; // From interviewTokens join
      schemaJson: object;             // Individual Process Schema JSON
      mermaidDefinition: string;      // Individual Mermaid flowchart definition
      validationStatus: string;
    }>;
  }
}
```

### Re-Trigger Support (MVP3)

The `POST /api/synthesis/[nodeId]` route (triggering synthesis) is implemented by Story 4.1/4.2 as part of the synthesis engine. This story ensures:
- After any synthesis run completes, the Mermaid definition is generated and stored (Task 4)
- The GET endpoint always returns the latest version (highest `synthesisVersion`)
- Previous versions are preserved — each synthesis run produces a new `synthesis_results` row with incremented `synthesisVersion`

### API Response Format (enforced)

```typescript
// Success
{ data: { synthesis: {...}, individualSchemas: [...] } }

// Error
{ error: { message: string, code: string } }
```

All responses must use `NextResponse.json()`. Dates as ISO 8601 strings. No unwrapped data.

### Service Boundaries -- Enforced

- Drizzle imported ONLY in `src/lib/db/queries.ts` and `src/lib/db/connection.ts` — the route handler and mermaid-generator call query functions, never raw SQL
- The route handler imports from `@/lib/db/queries`, `@/lib/auth/middleware`, and `@/lib/synthesis/mermaid-generator` — it does NOT import from `drizzle-orm` or `@/lib/db/schema`
- Process Schema types from `@/lib/schema/workflow.ts` used for typing the synthesis workflow input
- Mermaid.js (the rendering library) is NOT imported server-side — this story generates the definition string only. Client-side rendering is Epic 5 scope.

### Next.js 16 Route Handler Pattern

```typescript
// src/app/api/synthesis/[nodeId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSupervisorAuth } from '@/lib/auth/middleware';

export const GET = withSupervisorAuth(async (
  request: NextRequest,
  session
) => {
  const { nodeId } = await (request as any).params; // See note below
  // ...
});
```

**Note on params with middleware wrapper:** Because `withSupervisorAuth` wraps the handler, the route params must be accessed differently than a bare route handler. The middleware passes the original `NextRequest` which carries the route context. Follow the established pattern from other wrapped routes in the project — extract `nodeId` from the URL path if the middleware wrapper does not forward params directly:

```typescript
export const GET = withSupervisorAuth(async (request, session) => {
  const url = new URL(request.url);
  const nodeId = url.pathname.split('/').pop();
  // ...
});
```

### Mock Strategy for Tests

- Route handler tests: mock `@/lib/db/queries` functions (`getSynthesisResultByNodeId`, `getProcessNodeById`, `getIndividualSchemasByNodeId`)
- Mock `@/lib/auth/middleware` — test both authenticated and unauthenticated scenarios
- Mermaid generator tests: pure function tests with crafted input JSON, no mocks needed
- Do NOT mock Drizzle ORM, SDK imports, or the DB connection directly

### What NOT to Do

- Do NOT create the `DiagramCanvas` component or any client-side Mermaid rendering (Epic 5, Story 5.2)
- Do NOT create the `DivergenceAnnotation` React component (Epic 5, Story 5.2)
- Do NOT create the supervisor comparison view UI (Epic 5, Story 5.2)
- Do NOT implement the POST trigger endpoint — that is Story 4.1/4.2 scope (synthesis engine)
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT import `mermaid` (the rendering library) — this story only generates definition strings
- Do NOT create the `individual-mermaid-generator.ts` — that is Story 3.3 scope
- Do NOT add Zod request body schemas for the GET route — it only takes a path param (`nodeId`), validated as UUID format

### Dependencies

- **Story 4.1 (Synthesis Engine Core):** Provides `engine.ts`, `correlator.ts` (Stage 3), the synthesis pipeline orchestration, and the `synthesis_results` table population
- **Story 4.2 (Divergence Classification & Narration):** Provides `divergence.ts` (Stage 4), `narrator.ts` (Stage 5), and the full `workflowJson` with divergence annotations stored in `synthesis_results`
- **Story 1.3 (Auth Infrastructure):** Provides `withSupervisorAuth` middleware
- **Story 1.2 (Database Schema):** Provides all table definitions and Drizzle connection

### Project Structure Notes

Files **created** by this story:
- `src/lib/synthesis/mermaid-generator.ts` — Synthesis JSON to Mermaid definition converter
- `src/app/api/synthesis/[nodeId]/route.ts` — GET route handler (replaces `.gitkeep`)
- `src/lib/synthesis/mermaid-generator.test.ts` — Mermaid generator tests
- `src/app/api/synthesis/[nodeId]/route.test.ts` — Route handler tests

Files **modified** by this story:
- `src/lib/db/queries.ts` — Add `getIndividualSchemasByNodeId()`, possibly `updateSynthesisResultMermaid()`
- `src/lib/synthesis/engine.ts` — Add Mermaid generation step after Stage 5 completes (if engine.ts exists from Story 4.1; otherwise document integration point)

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete
- `src/lib/db/connection.ts` — already complete
- `src/lib/auth/middleware.ts` — already complete
- `package.json` — no new dependencies needed (Mermaid definition is a plain string)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3 -- Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns -- GET/POST /api/synthesis/[nodeId] routes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow -- Synthesis pipeline and supervisor viewing]
- [Source: _bmad-output/coding-standards.md#Section 9 -- Mermaid and BPMN Generation, Synthesis Diagrams]
- [Source: _bmad-output/coding-standards.md#Section 4 -- Synthesis Pipeline Coding Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DivergenceAnnotation -- Badge types, click behavior, visual specs]
- [Source: _bmad-output/planning-artifacts/prd.md#FR23 -- Normalized workflow with divergence annotations]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP3 -- Synthesis re-trigger after new interview]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP-NFR2 -- Synthesis visualization < 5 seconds]
- [Source: _bmad-output/project-context.md#Service Boundaries -- Drizzle only in src/lib/db/]
- [Source: _bmad-output/coding-standards.md#Section 8 -- API Route Patterns, response wrapping]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
