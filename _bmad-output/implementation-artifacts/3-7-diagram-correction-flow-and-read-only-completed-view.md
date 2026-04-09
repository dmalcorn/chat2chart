# Story 3.7: Diagram Correction Flow & Read-Only Completed View

Status: ready-for-dev

## Story

As an interviewee,
I want to correct my diagram if something's wrong and see a read-only view after completion,
So that my process is accurately captured and I can revisit it.

## Acceptance Criteria

1. **Given** the interviewee clicks "Something's not right" on their diagram **When** they describe the error **Then** `POST /api/interview/[token]/schema/correct` triggers the diagram correction agent via SSE streaming (FR84)
2. **Given** a correction request **When** the server processes it **Then** `src/lib/ai/prompts/correction-template.ts` defines the LLM correction agent behavior and `src/lib/interview/correction-agent.ts` orchestrates the correction session
3. **Given** a corrected schema is produced **When** it is returned to the client **Then** the corrected schema is re-validated via Zod, the Mermaid diagram is regenerated, and the updated diagram is re-presented for validation
4. **Given** the correction flow **When** interacting with the interviewee **Then** the experience feels collaborative, not adversarial (UX principle — "let me try again" tone)
5. **Given** the interviewee confirms the diagram (original or corrected) **When** state transitions to Captured **Then** the same token URL shows the read-only completed view (FR75)
6. **Given** the read-only completed view **When** rendered **Then** it displays confirmed reflective summaries with green checkmark badges and the validated personal diagram (UX-DR14)
7. **Given** the read-only completed view **When** rendered **Then** a "Thank you for sharing your expertise" message is displayed (UX-DR14)

## Tasks / Subtasks

- [ ] Task 1: Create the correction prompt template `src/lib/ai/prompts/correction-template.ts` (AC: #2)
  - [ ] 1.1 Export a `buildCorrectionPrompt(currentSchema: object, errorDescription: string): string` function that constructs the system prompt for the diagram correction agent
  - [ ] 1.2 The prompt must instruct the LLM to: receive the current individual process schema + the interviewee's error description, produce a corrected schema in the same Process Schema JSON format, preserve all elements the interviewee did NOT flag as incorrect, apply corrections only to what was described as wrong
  - [ ] 1.3 The prompt tone must be collaborative — framing corrections as refinements, not failures. Use language like "Let me adjust that for you" not "Error detected"
  - [ ] 1.4 The prompt must instruct the LLM to return structured JSON output matching the Process Schema Zod schema from `@/lib/schema/workflow.ts`

- [ ] Task 2: Create the correction agent orchestrator `src/lib/interview/correction-agent.ts` (AC: #2, #3)
  - [ ] 2.1 Export an async generator function `streamCorrectedSchema(params: { currentSchema: object, errorDescription: string, projectId: string }): AsyncIterable<string>` that orchestrates the correction session
  - [ ] 2.2 Import `buildCorrectionPrompt` from `@/lib/ai/prompts/correction-template`
  - [ ] 2.3 Resolve the LLM provider via `resolveProvider` from `@/lib/ai/provider-registry` using the project ID and `'diagram_correction'` skill name
  - [ ] 2.4 Call `provider.streamResponse()` with the assembled correction prompt and the error description as the user message
  - [ ] 2.5 Yield streamed tokens from the provider
  - [ ] 2.6 After streaming completes, parse the accumulated response as JSON, validate against the Process Schema Zod schema
  - [ ] 2.7 If Zod validation fails, retry once with a clarifying prompt asking the LLM to fix the JSON structure — if retry also fails, throw an error with code `CORRECTION_VALIDATION_FAILED`

- [ ] Task 3: Create `POST /api/interview/[token]/schema/correct` route handler (AC: #1, #3, #4)
  - [ ] 3.1 Create `src/app/api/interview/[token]/schema/correct/route.ts` (directory already exists with `.gitkeep`)
  - [ ] 3.2 Extract `token` from route params: `{ params }: { params: Promise<{ token: string }> }` (Next.js 16 async params)
  - [ ] 3.3 Validate token format using `validateTokenFormat()` from `@/lib/interview/token` — if invalid, return 404 with `INVALID_TOKEN`
  - [ ] 3.4 Look up token via `getInterviewTokenByToken(token)` from `@/lib/db/queries` — if not found, return 404
  - [ ] 3.5 Look up interview via `getInterviewByTokenId(tokenRow.id)` — if not found or status is not `validating`, return 400 with `{ error: { message: "Interview is not in a state that allows corrections", code: "INVALID_STATE" } }`
  - [ ] 3.6 Parse request body with Zod: `{ errorDescription: string, currentSchema: object }` — return 400 with `VALIDATION_ERROR` on failure
  - [ ] 3.7 Call `streamCorrectedSchema()` from `@/lib/interview/correction-agent` with the current schema, error description, and project ID from the token
  - [ ] 3.8 Stream the response as SSE using the standardized event format:
    - `event: message` with `data: { content: token, exchangeType: 'correction' }` for each streamed token
    - `event: schema` with `data: { schema: correctedSchemaJson, mermaidDefinition: regeneratedMermaid }` when correction completes — this carries the validated corrected schema AND the regenerated Mermaid definition
    - `event: done` with `data: {}` on completion
    - `event: error` with `data: { message, code }` on failure
  - [ ] 3.9 After the corrected schema passes Zod validation, regenerate the Mermaid diagram using `generateIndividualMermaid()` from `@/lib/interview/individual-mermaid-generator` (this function must exist from Story 3.6)
  - [ ] 3.10 Update the `individual_process_schemas` row with the corrected `schemaJson` and `mermaidDefinition` — set `validationStatus` to `'pending'` (awaiting re-confirmation)
  - [ ] 3.11 Wrap in try/catch — on unexpected errors, emit SSE error event with `{ message: "The AI agent is temporarily unavailable. Please try again.", code: "LLM_ERROR" }`

- [ ] Task 4: Add database query functions to `src/lib/db/queries.ts` (AC: #3, #5)
  - [ ] 4.1 Add `getIndividualProcessSchemaByInterviewId(interviewId: string)` — queries `individualProcessSchemas` table by `interviewId`, returns row or null
  - [ ] 4.2 Add `updateIndividualProcessSchema(schemaId: string, data: { schemaJson: object, mermaidDefinition: string, validationStatus: string })` — updates the schema row and returns updated row
  - [ ] 4.3 Add `getVerifiedExchangesByInterviewId(interviewId: string)` — queries `interviewExchanges` where `interviewId` matches AND `isVerified = true`, ordered by `sequenceNumber` ascending — returns the confirmed reflective summaries for the read-only view

- [ ] Task 5: Create the `ReadOnlyView` component `src/components/interview/read-only-view.tsx` (AC: #5, #6, #7)
  - [ ] 5.1 Create a Client Component (`"use client"`) that receives props: `intervieweeName: string`, `processNodeName: string`, `verifiedSummaries: Array<{ id: string, content: string, sequenceNumber: number }>`, `mermaidDefinition: string`, `diagramTextAlternative: string`
  - [ ] 5.2 Render a heading: "Your Process: {processNodeName}" with the interviewee's name
  - [ ] 5.3 Render each verified reflective summary as a violet card (same styling as `ReflectiveSummaryCard` in confirmed state) with a green checkmark badge and "Confirmed" text — these are read-only, no buttons
  - [ ] 5.4 Render the validated personal diagram using `DiagramCanvas` component (dynamic import of Mermaid.js, no SSR) — max-width 700px, read-only variant (shadow-sm, no confirm/correct buttons)
  - [ ] 5.5 Include `<details><summary>Text description of your process</summary>` with a structured text alternative listing steps, decisions, and connections
  - [ ] 5.6 Display a warm completion message: "Thank you for sharing your expertise. Your process has been captured and will help inform how your team's work is understood." — styled with `--success` color accent, centered, generous padding (32px top)
  - [ ] 5.7 No interactive elements — no buttons, no recording controls, no correction options
  - [ ] 5.8 Accessible: semantic heading hierarchy, `aria-label` on the summary list section, `aria-live` not needed (static content)

- [ ] Task 6: Create the `CorrectionPanel` component `src/components/interview/correction-panel.tsx` (AC: #1, #4)
  - [ ] 6.1 Create a Client Component (`"use client"`) that receives props: `token: string`, `currentSchema: object`, `onCorrectionComplete: (correctedSchema: object, mermaidDefinition: string) => void`, `onCancel: () => void`
  - [ ] 6.2 Render a text input area (textarea, not voice — correction is text-based in this flow) with placeholder: "Tell me what's not right about the diagram..."
  - [ ] 6.3 Render a "Submit Correction" button (primary) and a "Cancel" link (ghost) that calls `onCancel`
  - [ ] 6.4 On submit, POST to `/api/interview/${token}/schema/correct` with `{ errorDescription, currentSchema }` and consume the SSE stream
  - [ ] 6.5 Display a streaming status indicator: "Updating your diagram..." with a pulsing animation while the correction streams
  - [ ] 6.6 On `event: schema`, call `onCorrectionComplete` with the corrected schema and Mermaid definition — the parent component handles re-rendering the diagram for re-validation
  - [ ] 6.7 On `event: error`, display the error message inline (not a modal) with collaborative tone: "I wasn't able to make that change. Could you try describing it differently?"
  - [ ] 6.8 The correction panel replaces the confirm/correct buttons area below the diagram — it does not appear as a modal or overlay

- [ ] Task 7: Create Zod schema for correction request `src/lib/schema/api-requests.ts` (AC: #1)
  - [ ] 7.1 Add `correctionRequestSchema` to the existing `api-requests.ts` file: `z.object({ errorDescription: z.string().min(1).max(1000), currentSchema: z.object({}).passthrough() })`
  - [ ] 7.2 Export `CorrectionRequest` type inferred from the schema

- [ ] Task 8: Create tests (AC: #1-#7)
  - [ ] 8.1 Create `src/lib/ai/prompts/correction-template.test.ts`:
    - Test `buildCorrectionPrompt` returns a string containing the schema and error description
    - Test the prompt contains collaborative language (no "error", "failed", "wrong")
    - Test the prompt instructs JSON output matching Process Schema format
  - [ ] 8.2 Create `src/lib/interview/correction-agent.test.ts`:
    - Test `streamCorrectedSchema` calls provider with assembled prompt
    - Test successful correction yields streamed tokens
    - Test Zod validation failure triggers one retry
    - Test retry failure throws with `CORRECTION_VALIDATION_FAILED` code
    - Mock `LLMProvider` interface — NOT `@anthropic-ai/sdk` directly
    - Mock `resolveProvider` from `@/lib/ai/provider-registry`
  - [ ] 8.3 Create `src/app/api/interview/[token]/schema/correct/route.test.ts`:
    - Test valid correction request returns SSE stream with `message`, `schema`, and `done` events
    - Test invalid token returns 404 with `INVALID_TOKEN`
    - Test interview not in `validating` state returns 400 with `INVALID_STATE`
    - Test invalid request body returns 400 with `VALIDATION_ERROR`
    - Test LLM error emits SSE error event with `LLM_ERROR`
    - Mock `@/lib/db/queries` functions and `@/lib/interview/correction-agent`
  - [ ] 8.4 Create `src/components/interview/read-only-view.test.tsx`:
    - Test renders interviewee name and process node name
    - Test renders all verified summaries with green checkmark badges
    - Test renders Mermaid diagram canvas (mock the dynamic import)
    - Test renders "Thank you for sharing your expertise" message
    - Test no interactive buttons are present
  - [ ] 8.5 Create `src/components/interview/correction-panel.test.tsx`:
    - Test renders textarea and submit button
    - Test submit sends POST with error description and current schema
    - Test streaming status indicator appears during correction
    - Test calls `onCorrectionComplete` on successful schema event
    - Test displays inline error on failure
    - Test cancel button calls `onCancel`

## Dev Notes

### What Already Exists (from Earlier Stories)

- `src/lib/db/schema.ts` — All 12 tables including `individualProcessSchemas` with `schemaJson`, `mermaidDefinition`, `validationStatus`, `extractionMethod` columns
- `src/lib/db/queries.ts` — Existing query functions (see below); needs 3 new functions added
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/interview/token.ts` — `validateTokenFormat()` function (Story 2.1)
- `src/app/api/interview/[token]/schema/correct/` — Directory exists with `.gitkeep` only
- `src/lib/ai/provider-registry.ts` — Provider registry with `resolveProvider()` (Story 1.4)
- `src/lib/ai/prompts/` — Directory exists with `.gitkeep` files; `base-template.ts` and `prompt-assembler.ts` should exist from Story 3.1
- `src/lib/interview/` — Directory exists; `session.ts` should exist from Story 3.2, `schema-extractor.ts` and `individual-mermaid-generator.ts` should exist from Story 3.6
- `src/components/interview/` — Directory exists; `diagram-review.tsx` should exist from Story 3.6 (provides the confirm/correct button UI that triggers this story's correction flow)
- `src/lib/schema/api-requests.ts` — Exists with `loginSchema`; extend with correction schema
- `src/lib/schema/workflow.ts` — MUST exist from a prior story (Process Schema Zod definition) — this is the validation target for corrected schemas

### Dependencies on Prior Stories

This story depends on artifacts from these stories being complete:

| Story | Required Artifact | Used By |
|-------|-------------------|---------|
| 2.1 | `validateTokenFormat()` in `token.ts`, query functions in `queries.ts` | Route handler token validation |
| 2.2 | State-based page routing in `page.tsx` | Routing to read-only view when status is `captured` |
| 3.1 | `prompt-assembler.ts`, skill loader | Pattern reference for prompt template structure |
| 3.5 | `ReflectiveSummaryCard` component | Read-only view reuses confirmed card styling |
| 3.6 | `schema-extractor.ts`, `individual-mermaid-generator.ts`, `diagram-review.tsx`, Process Schema Zod types in `workflow.ts` | Correction agent regenerates Mermaid from corrected schema; diagram-review provides the "Something's not right" trigger |

### Interview State Machine Context

The correction flow operates within the `validating` state:

```
Completed → (extraction succeeds) → Validating → (interviewee confirms) → Captured
                                        ↑                                      ↓
                                        └── (interviewee requests correction) ──┘
                                             LLM correction cycle, re-present
```

- The route handler MUST verify the interview is in `validating` state before accepting a correction
- Correction does NOT change the interview state — it remains `validating` until the interviewee confirms
- On confirmation (handled by the `POST /api/interview/[token]/schema` route from Story 3.6), state transitions to `captured`
- Once `captured`, the token URL renders the `ReadOnlyView` component (this story's Task 5)

### Database Schema Details (already in schema.ts)

**`individualProcessSchemas` table columns:**
`id` (UUID PK), `interviewId` (FK, unique), `processNodeId` (FK), `schemaJson` (JSONB), `mermaidDefinition` (text, nullable), `validationStatus` (text), `extractionMethod` (text), `createdAt`, `updatedAt`

**`interviewExchanges` table columns (relevant for read-only view):**
`id` (UUID PK), `interviewId` (FK), `segmentId` (UUID), `exchangeType` (enum), `speaker` (enum), `content` (text), `isVerified` (boolean), `sequenceNumber` (integer), `createdAt`

### SSE Streaming Pattern

The correction route follows the same SSE streaming pattern used by `/api/interview/[token]/messages` (Story 3.3), with a correction-specific event added:

```typescript
// Standard SSE events
event: message\ndata: { content: "token", exchangeType: "correction" }\n\n
event: schema\ndata: { schema: {...}, mermaidDefinition: "graph TD..." }\n\n
event: done\ndata: {}\n\n
event: error\ndata: { message: "...", code: "LLM_ERROR" }\n\n
```

Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`

### Correction Agent Design

The correction agent is simpler than the interview agent:
- **Input:** Current Process Schema JSON + interviewee's text description of what's wrong
- **Output:** Corrected Process Schema JSON
- **No conversation history** — single-turn correction, not a multi-turn dialogue
- **Streaming** — the response streams so the interviewee sees progress, but the schema event only fires after the complete response is validated
- **Temperature:** Low (0.1-0.2) — corrections should be deterministic and faithful to the interviewee's description
- **Structured output:** Use Claude's `output_format` parameter with Zod-generated JSON Schema for the Process Schema
- **Retry:** One retry on validation failure with a clarifying prompt

### Read-Only View Design (UX-DR14)

The completed view serves the emotional goal of "warm recall — a record that someone listened":

- Confirmed reflective summaries displayed as violet cards in confirmed state (green checkmark + "Confirmed" text, no buttons)
- Validated personal diagram in read-only DiagramCanvas (shadow-sm, no interactive buttons)
- Warm completion message with `--success` color accent
- No interactive elements — the interviewee can look but not modify
- Accessible via the same token URL at any time after capture

### Component Integration with page.tsx

The `page.tsx` state router (from Story 2.2) should already handle rendering different components based on interview state. This story adds:
- `captured` state → renders `ReadOnlyView`
- `validating` state with correction active → renders `CorrectionPanel` below the `DiagramCanvas`

The parent `diagram-review.tsx` component (Story 3.6) manages the transition between showing confirm/correct buttons and showing the `CorrectionPanel`:
1. User clicks "Something's not right" → parent hides buttons, shows `CorrectionPanel`
2. `CorrectionPanel` completes → calls `onCorrectionComplete` → parent updates diagram with corrected schema and re-shows confirm/correct buttons
3. User clicks "Yes, that looks right" → parent calls `POST /api/interview/[token]/schema` to confirm → state transitions to `captured` → page re-renders as `ReadOnlyView`

### Service Boundaries — Enforced

- `@anthropic-ai/sdk` imported ONLY via provider in `src/lib/ai/` — the correction agent and route handler never import it directly
- Drizzle imported ONLY in `src/lib/db/queries.ts` — route handler calls query functions
- Mermaid.js dynamically imported ONLY in client components — no SSR
- `correction-template.ts` lives in `src/lib/ai/prompts/` — prompt construction is in the AI directory
- `correction-agent.ts` lives in `src/lib/interview/` — orchestration is in the interview directory

### API Response Format (enforced)

```typescript
// Non-streaming error responses
{ error: { message: string, code: string } }

// SSE events (streaming)
event: message\ndata: { content: string, exchangeType: "correction" }\n\n
event: schema\ndata: { schema: object, mermaidDefinition: string }\n\n
event: done\ndata: {}\n\n
event: error\ndata: { message: string, code: string }\n\n
```

### Mock Strategy for Tests

- Route handler tests: mock `@/lib/db/queries` functions and `@/lib/interview/correction-agent`
- Correction agent tests: mock `LLMProvider` interface (NOT `@anthropic-ai/sdk`), mock `resolveProvider`
- Correction template tests: pure function, no mocks needed
- Component tests: mock fetch for SSE streaming, mock Mermaid.js dynamic import
- Do NOT mock Drizzle ORM, Anthropic SDK, or DB connection directly

### What NOT to Do

- Do NOT modify the interview state machine transitions — confirmation (→ Captured) is handled by the existing `POST /api/interview/[token]/schema` route (Story 3.6)
- Do NOT add voice input to the correction flow — corrections are text-only in this story
- Do NOT create a multi-turn correction conversation — single-turn: describe error → get corrected schema
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT import `@anthropic-ai/sdk` outside `src/lib/ai/`
- Do NOT store correction data in browser localStorage/sessionStorage (NFR9)
- Do NOT hardcode correction prompts in the route handler — use `correction-template.ts`
- Do NOT render Mermaid.js server-side — always dynamic import, no SSR
- Do NOT add editing capabilities to the read-only view
- Do NOT add toast notifications — all feedback is inline per UX spec

### Project Structure Notes

Files **created** by this story:
- `src/lib/ai/prompts/correction-template.ts` — LLM correction agent prompt builder
- `src/lib/interview/correction-agent.ts` — Correction session orchestrator
- `src/app/api/interview/[token]/schema/correct/route.ts` — SSE streaming correction endpoint
- `src/components/interview/read-only-view.tsx` — Post-completion read-only view
- `src/components/interview/correction-panel.tsx` — Correction input UI

Files **modified** by this story:
- `src/lib/db/queries.ts` — Add 3 new query functions (`getIndividualProcessSchemaByInterviewId`, `updateIndividualProcessSchema`, `getVerifiedExchangesByInterviewId`)
- `src/lib/schema/api-requests.ts` — Add `correctionRequestSchema` and `CorrectionRequest` type

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete, no new tables or columns needed
- `src/lib/db/connection.ts` — already complete
- `src/lib/ai/provider-registry.ts` — already complete
- `package.json` — no new dependencies needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.7 — Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — POST /api/interview/[token]/schema/correct route]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Architecture — correction-panel, read-only-view components]
- [Source: _bmad-output/planning-artifacts/architecture.md#Interview State Machine — Validating state correction cycle]
- [Source: _bmad-output/planning-artifacts/architecture.md#File Structure — correction-template.ts, correction-agent.ts locations]
- [Source: _bmad-output/planning-artifacts/prd.md#FR75 — Read-only view post-completion]
- [Source: _bmad-output/planning-artifacts/prd.md#FR84 — LLM-based conversational correction flow]
- [Source: _bmad-output/planning-artifacts/prd.md#FR85 — Validated individual schema stored as persistent artifact]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Journey — Error/correction: collaborative, not adversarial]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Journey — Return visit: warm recall, read-only completed view]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Interview Flow — Validation step 10: confirm/correct buttons]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 1 Flow — Correction flow and read-only completed view]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DiagramCanvas — shadow-sm for read-only variant]
- [Source: _bmad-output/coding-standards.md#Section 8 — SSE streaming pattern, API response wrapping]
- [Source: _bmad-output/project-context.md#Service Boundaries — LLM calls via provider registry only]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
