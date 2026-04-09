# Story 3.3: Interview Message API with SSE Streaming

Status: review

## Story

As an interviewee,
I want to send messages and receive the AI agent's responses in real-time via streaming,
So that the conversation feels natural and responsive.

## Acceptance Criteria

1. **Given** an Active interview **When** I send a message via `POST /api/interview/[token]/messages` **Then** the route loads the skill via skill-loader, assembles the prompt, and calls the LLM provider via provider-registry (FR50)
2. **Given** a streaming response **When** the agent responds **Then** the response streams via SSE with events: `message` (content + exchangeType), `done` (interviewExchangeId + segmentId), `error` (message + code)
3. **Given** a streaming response **When** the agent sends content **Then** `exchangeType` distinguishes `question` from `reflective_summary` so the UI renders them differently
4. **Given** an Active interview **When** I send a message **Then** first token latency is < 3 seconds (NFR1)
5. **Given** an Active interview **When** the agent responds **Then** the agent uses the reflect-and-confirm pattern: reformulates speech into reflective summaries, asks for confirmation (FR8)
6. **Given** an Active interview **When** the agent probes **Then** the agent probes for decision points, exceptions, handoffs, and systems touched per the domain skill
7. **Given** a message request **When** the interview is not Active **Then** return `{ error: { message: "Interview is not active", code: "INTERVIEW_NOT_ACTIVE" } }` with HTTP 400
8. **Given** a message request **When** the token is invalid or not found **Then** return the standard 404 error per Story 2.1

## Tasks / Subtasks

- [x] Task 1: Create Zod request schema for message endpoint (AC: #1)
  - [x] 1.1 Add `sendMessageSchema` to `src/lib/schema/api-requests.ts` — validates `{ message: string }` where `message` is a non-empty trimmed string (max 5000 chars)
  - [x] 1.2 Export the schema for use by the route and tests

- [x] Task 2: Create skill-loader `src/lib/interview/skill-loader.ts` (AC: #1, #5, #6)
  - [x] 2.1 Create `loadSkill(skillName: string)` function that reads `skills/{skillName}/skill.md` from the project root
  - [x] 2.2 Parse markdown frontmatter (YAML) and body content — extract persona, workflow steps, probe elements, vocabulary, follow-up strategies, and synthesis elements
  - [x] 2.3 Return a typed `SkillDefinition` object: `{ name, persona, workflow, probeElements, vocabulary, followUpStrategies, synthesisElements, rawContent }`
  - [x] 2.4 Validate that required sections exist — throw descriptive error if skill file is missing or malformed
  - [x] 2.5 Cache loaded skills in a module-level Map to avoid repeated file reads within the same process

- [x] Task 3: Create prompt-assembler `src/lib/ai/prompts/prompt-assembler.ts` (AC: #1, #5, #6)
  - [x] 3.1 Create `assembleInterviewPrompt(skill: SkillDefinition)` function that merges: base template (reflect-and-confirm pattern, 5-8 exchange limit, behavioral rules) + skill persona + skill workflow (all steps inline) + synthesis context
  - [x] 3.2 Import the base template from `src/lib/ai/prompts/base-template.ts` — this file must be created as a dependency
  - [x] 3.3 Output is a single system prompt string in the four-block order: base template, skill persona, skill workflow, synthesis context
  - [x] 3.4 The assembler is the ONLY file where skill definitions meet LLM prompts — route handlers call `assembleInterviewPrompt()`, never construct prompts directly

- [x] Task 4: Create base interview template `src/lib/ai/prompts/base-template.ts` (AC: #5)
  - [x] 4.1 Define the core interview agent behavioral rules as a template string
  - [x] 4.2 Include reflect-and-confirm pattern instructions: reformulate scattered speech into clear reflective summaries, ask the interviewee to confirm or correct
  - [x] 4.3 Include 5-8 exchange limit guidance (MVP1): be efficient, not exhaustive
  - [x] 4.4 Include instructions for probing decision points, exceptions, handoffs, and systems touched
  - [x] 4.5 Include instructions for the agent to indicate its exchange type: when it is asking a question vs. when it is providing a reflective summary — this metadata is used by the route to set `exchangeType` in SSE events
  - [x] 4.6 Export a `getBaseTemplate()` function that returns the template string

- [x] Task 5: Create `POST /api/interview/[token]/messages/route.ts` (AC: #1-#8)
  - [x] 5.1 Create the route file at `src/app/api/interview/[token]/messages/route.ts`
  - [x] 5.2 Extract `token` from route params (Next.js 16 async params pattern: `{ params }: { params: Promise<{ token: string }> }`)
  - [x] 5.3 Validate token format using `validateTokenFormat()` from `@/lib/interview/token` — if invalid, return 404
  - [x] 5.4 Look up token via `getInterviewTokenByToken(token)` — if not found, return 404 with `"This link isn't valid. Contact the person who sent it to you."` and code `INVALID_TOKEN`
  - [x] 5.5 Look up interview via `getInterviewByTokenId(tokenRow.id)` — if no interview or status is not `active`, return 400 with `INTERVIEW_NOT_ACTIVE`
  - [x] 5.6 Parse and validate request body using `sendMessageSchema` — if invalid, return 400 with `VALIDATION_ERROR`
  - [x] 5.7 Load conversation history from DB via `getInterviewExchangesByInterviewId(interview.id)` — convert to `Message[]` format for the LLM provider
  - [x] 5.8 Persist the user's message as an exchange immediately: `createInterviewExchange()` with `exchangeType: 'response'`, `speaker: 'interviewee'`, next `sequenceNumber`
  - [x] 5.9 Load the skill via `loadSkill(project.skillName)` using the project from the token lookup
  - [x] 5.10 Assemble the system prompt via `assembleInterviewPrompt(skill)`
  - [x] 5.11 Resolve the LLM provider via `resolveProvider(project.id, 'interview_agent')` from `@/lib/ai`
  - [x] 5.12 Call `provider.streamResponse(systemPrompt, conversationHistory)` to get the `AsyncIterable<string>`
  - [x] 5.13 Create a `ReadableStream` that:
    - Accumulates streamed tokens into a full response string
    - Determines `exchangeType` from the agent's response content (parse for reflective summary markers)
    - Emits `event: message` with `{ content: token, exchangeType }` for each token
    - On stream completion: persists the full agent response as an exchange via `createInterviewExchange()` with `speaker: 'agent'` and the determined `exchangeType` and appropriate `segmentId`
    - Emits `event: done` with `{ interviewExchangeId, segmentId }`
    - On error: emits `event: error` with `{ message: "The AI agent is temporarily unavailable.", code: "LLM_ERROR" }`
  - [x] 5.14 Return `new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })`
  - [x] 5.15 Wrap the entire handler in try/catch — unexpected errors return `{ error: { message: "An unexpected error occurred", code: "INTERNAL_ERROR" } }` with HTTP 500

- [x] Task 6: Add query functions to `src/lib/db/queries.ts` if needed (AC: #1)
  - [x] 6.1 Verify `getInterviewExchangesByInterviewId` exists (it does) — no new query needed for history loading
  - [x] 6.2 Verify `createInterviewExchange` exists (it does) — no new query needed for persistence
  - [x] 6.3 Add `getMaxSequenceNumber(interviewId: string)` to efficiently get the next sequence number for a new exchange — queries `interview_exchanges` for MAX(sequence_number) WHERE interview_id = interviewId

- [x] Task 7: Create segment tracking helper (AC: #2, #5)
  - [x] 7.1 In `src/lib/interview/session.ts` (created by Story 3.2), ensure there is a function to determine the current segment: `getCurrentSegmentId(interviewId: string)` — returns the active segment's UUID, or generates a new one if the last segment was completed (confirmed)
  - [x] 7.2 If `session.ts` does not yet exist (Story 3.2 not yet implemented), create a minimal version with `getCurrentSegmentId` and `getNextSequenceNumber` that this story can use, with a comment noting Story 3.2 will expand it

- [x] Task 8: Create exchangeType detection utility (AC: #3)
  - [x] 8.1 Create a helper function `detectExchangeType(content: string): 'question' | 'reflective_summary'` in the route file or a shared utility
  - [x] 8.2 The LLM is instructed (via base template) to prefix reflective summaries with a marker (e.g., `[REFLECTIVE_SUMMARY]`) — the detector strips this marker and returns the type
  - [x] 8.3 Default to `question` if no marker is detected — questions are the more common exchange type

- [x] Task 9: Create tests (AC: #1-#8)
  - [x] 9.1 Create `src/lib/interview/skill-loader.test.ts`:
    - Test loading a valid skill file returns correct SkillDefinition structure
    - Test loading a nonexistent skill throws descriptive error
    - Test skill caching returns same object on repeated calls
  - [x] 9.2 Create `src/lib/ai/prompts/prompt-assembler.test.ts`:
    - Test assembled prompt contains all four blocks in order (base, persona, workflow, synthesis context)
    - Test assembled prompt includes reflect-and-confirm instructions
    - Test assembled prompt includes skill-specific vocabulary and probe elements
  - [x] 9.3 Create `src/app/api/interview/[token]/messages/route.test.ts`:
    - Test valid request with active interview returns SSE stream (Content-Type: text/event-stream)
    - Test SSE stream contains `event: message` events with `content` and `exchangeType`
    - Test SSE stream ends with `event: done` containing `interviewExchangeId` and `segmentId`
    - Test user message is persisted as exchange with `speaker: 'interviewee'` before LLM call
    - Test agent response is persisted as exchange with `speaker: 'agent'` after stream completes
    - Test invalid token format returns 404
    - Test nonexistent token returns 404 with `INVALID_TOKEN`
    - Test non-active interview returns 400 with `INTERVIEW_NOT_ACTIVE`
    - Test empty message body returns 400 with `VALIDATION_ERROR`
    - Test LLM error emits `event: error` with `LLM_ERROR` code
    - Test unexpected error returns 500 with `INTERNAL_ERROR`
    - Mock `@/lib/db/queries` functions, mock `@/lib/ai` resolveProvider (returns mock LLMProvider), mock `@/lib/interview/skill-loader`
    - Do NOT mock `@anthropic-ai/sdk` directly — mock at the `LLMProvider` interface level

## Dev Notes

### What Already Exists (from Previous Stories)

- `src/lib/db/schema.ts` — All 12 tables including `interviewExchanges` with `exchangeType`, `segmentId`, `isVerified`, `sequenceNumber`
- `src/lib/db/connection.ts` — Drizzle DB instance with camelCase mode
- `src/lib/db/queries.ts` — Query functions including `getInterviewTokenByToken`, `getInterviewByTokenId`, `getInterviewExchangesByInterviewId`, `createInterviewExchange`, `getProjectById`, `getSkillProviderByProjectAndSkill`
- `src/lib/interview/token.ts` — Token format validation (UUID v4)
- `src/app/api/interview/[token]/route.ts` — GET route for token resolution (Story 2.1)
- `src/app/api/interview/[token]/messages/` — Directory exists with `.gitkeep` only — route.ts must be created
- `src/lib/ai/provider.ts` — `LLMProvider` interface with `streamResponse()` returning `AsyncIterable<string>`
- `src/lib/ai/provider-registry.ts` — `resolveProvider(projectId, skillName)` resolves project-specific or default provider
- `src/lib/ai/claude-provider.ts` — Claude implementation with retry logic (1 retry, exponential backoff) already built into `streamResponse()`
- `src/lib/ai/index.ts` — Barrel export that registers Claude provider on module load
- `src/lib/ai/prompts/` — Directory exists with `.gitkeep` only — `base-template.ts` and `prompt-assembler.ts` must be created
- `src/lib/interview/session.ts` — Expected from Story 3.2 (session management, segment tracking). If not yet implemented, this story creates a minimal version.
- `skills/` — Root-level directory for skill definitions. `federal-document-processing/skill.md` may or may not exist yet.

### Database Schema Details (already in schema.ts)

**`interviewExchanges` table columns:**
`id` (UUID PK), `interviewId` (FK -> interviews), `segmentId` (UUID, not FK — grouping key), `exchangeType` (enum: question/response/reflective_summary/confirmation/revised_summary), `speaker` (enum: agent/interviewee), `content` (text), `isVerified` (boolean, default false), `sequenceNumber` (integer, unique per interview), `createdAt`

**Note:** `interviewExchanges` is immutable — no `updatedAt` column. Each exchange is persisted once and never modified.

### Two-Dimensional AI Pattern

This story implements the full skill-loader -> prompt-assembler -> provider-registry chain for interview conversations:

```
1. Route receives POST with user message
2. skill-loader.ts reads skills/{skillName}/skill.md, parses frontmatter + body
3. prompt-assembler.ts merges: base-template + skill persona + skill workflow + synthesis context
4. provider-registry.ts resolves LLM provider for (projectId, 'interview_agent')
   -> checks project_skill_providers table
   -> falls back to project's default_llm_provider (anthropic)
5. provider.streamResponse(assembledPrompt, conversationHistory) streams tokens
6. Route wraps tokens in SSE events and sends to client
```

The route handler never imports `@anthropic-ai/sdk` — it works through the `LLMProvider` interface exclusively.

### SSE Streaming Pattern

```typescript
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  // ... validation, history loading, prompt assembly ...

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullResponse = '';
        const provider = await resolveProvider(projectId, 'interview_agent');

        for await (const token of provider.streamResponse(systemPrompt, conversation)) {
          fullResponse += token;
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify({ content: token, exchangeType })}\n\n`)
          );
        }

        // Persist agent response
        const exchange = await createInterviewExchange({ ... });

        controller.enqueue(
          encoder.encode(`event: done\ndata: ${JSON.stringify({ interviewExchangeId: exchange.id, segmentId })}\n\n`)
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'The AI agent is temporarily unavailable.', code: 'LLM_ERROR' })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Conversation History Format

The route loads all previous exchanges from DB and converts them to the `Message[]` format expected by `LLMProvider.streamResponse()`:

```typescript
// Message type from src/lib/ai/provider.ts
type Message = { role: 'user' | 'assistant'; content: string };

// Mapping: speaker 'interviewee' -> role 'user', speaker 'agent' -> role 'assistant'
```

The system prompt (assembled from skill + base template) is passed as the `prompt` parameter, not as part of `conversation`. The conversation array contains only prior exchanges.

### Exchange Type Detection

The base template instructs the LLM to prefix reflective summaries with a marker (e.g., `[REFLECTIVE_SUMMARY]`). The route strips this marker before sending content to the client and uses it to set `exchangeType` in SSE events. If no marker is present, the exchange is treated as a `question`.

This approach keeps the detection logic simple and deterministic without requiring a secondary LLM call to classify the response.

### Segment Tracking

Segments group one conversational cycle: question -> response -> reflective_summary -> confirmation. The segment ID is a UUID generated when a new cycle begins. The route must:

1. Determine the current segment from the conversation history (or create a new one if the last segment was confirmed)
2. Use that segment ID for both the user's exchange and the agent's response exchange
3. Pass the segment ID in the `done` SSE event

### Persist-Before-Stream Pattern

The user's message is persisted to DB **before** the LLM call begins. The agent's response is persisted **after** the stream completes. This ensures:
- The user's message is never lost even if the LLM call fails
- The agent's response is persisted as a complete message, not partial tokens
- Sequence numbers are assigned in order

### Error Handling

| Error Condition | HTTP Status | Error Code | Error Message |
|---|---|---|---|
| Invalid token format | 404 | `INVALID_TOKEN` | "This link isn't valid. Contact the person who sent it to you." |
| Token not found in DB | 404 | `INVALID_TOKEN` | "This link isn't valid. Contact the person who sent it to you." |
| Interview not active | 400 | `INTERVIEW_NOT_ACTIVE` | "Interview is not active" |
| Invalid request body | 400 | `VALIDATION_ERROR` | Zod error message |
| LLM streaming error | SSE event | `LLM_ERROR` | "The AI agent is temporarily unavailable." |
| Unexpected error | 500 | `INTERNAL_ERROR` | "An unexpected error occurred" |

Note: LLM errors during streaming are emitted as SSE `error` events, not as HTTP error responses, because the SSE stream has already started with a 200 status.

### Service Boundaries — Enforced

- `@anthropic-ai/sdk` imported ONLY in `src/lib/ai/claude-provider.ts` — the route handler uses `resolveProvider()` and the `LLMProvider` interface
- Drizzle imported ONLY in `src/lib/db/queries.ts` and `src/lib/db/connection.ts` — the route calls query functions
- `skill-loader.ts` is the ONLY file that reads from the `skills/` directory
- `prompt-assembler.ts` is the ONLY file where skill definitions meet LLM prompts
- Route handler imports from `@/lib/db/queries`, `@/lib/interview/token`, `@/lib/interview/skill-loader`, `@/lib/ai/prompts/prompt-assembler`, and `@/lib/ai` (barrel) — nothing else

### Next.js 16 Route Handler Pattern

```typescript
// src/app/api/interview/[token]/messages/route.ts
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params; // Next.js 16: params is a Promise
  // ...
}
```

### Mock Strategy for Tests

- Route handler tests: mock `@/lib/db/queries` (getInterviewTokenByToken, getInterviewByTokenId, getInterviewExchangesByInterviewId, createInterviewExchange), mock `@/lib/ai` (resolveProvider returns a mock LLMProvider whose `streamResponse` yields test tokens), mock `@/lib/interview/skill-loader`
- Skill-loader tests: use a test fixture skill.md file in the test directory
- Prompt-assembler tests: pass a mock SkillDefinition object, verify output string structure
- Do NOT mock `@anthropic-ai/sdk` directly — mock at the `LLMProvider` interface level
- Do NOT mock Drizzle ORM or DB connection directly

### What NOT to Do

- Do NOT create the conversation thread UI (Story 3.5)
- Do NOT create the voice input / STT components (Story 3.4)
- Do NOT create the consent screen (Story 2.3)
- Do NOT create the individual schema extraction pipeline (Story 3.6)
- Do NOT import `@anthropic-ai/sdk` in the route handler — use provider-registry
- Do NOT import Drizzle outside `src/lib/db/`
- Do NOT hardcode interview prompts — always use skill-loader -> prompt-assembler
- Do NOT store any interview data in browser localStorage/sessionStorage (NFR9)
- Do NOT return unwrapped API responses — always use `{ data: T }` or `{ error: { message, code } }`
- Do NOT add token expiration logic — not in demo scope
- Do NOT implement interview completion logic (transition to Completed state) — that is triggered by a separate "end interview" action, not by the message API

### Dependency on Story 3.2

This story depends on Story 3.2 (Interview Session Management & Exchange Persistence) for `src/lib/interview/session.ts` which provides segment tracking and session state management. If Story 3.2 is not yet complete, Task 7 creates a minimal implementation sufficient for this story's needs.

### Dependency on Skill Definition File

This story requires `skills/federal-document-processing/skill.md` to exist (created in Story 3.1). If the file does not yet exist, create a minimal placeholder with the required frontmatter structure so the skill-loader and prompt-assembler can be tested.

### Project Structure Notes

Files **created** by this story:
- `src/app/api/interview/[token]/messages/route.ts` — POST route handler with SSE streaming
- `src/lib/interview/skill-loader.ts` — Skill definition file reader and parser
- `src/lib/ai/prompts/prompt-assembler.ts` — Skill + base template merger
- `src/lib/ai/prompts/base-template.ts` — Core interview agent behavior template
- `src/lib/schema/api-requests.ts` — Zod request schemas (or add to existing if it exists)

Files **modified** by this story:
- `src/lib/db/queries.ts` — Add `getMaxSequenceNumber` query function

Files **NOT modified** by this story:
- `src/lib/db/schema.ts` — already complete
- `src/lib/ai/provider.ts` — already complete
- `src/lib/ai/provider-registry.ts` — already complete
- `src/lib/ai/claude-provider.ts` — already complete (retry logic built in)
- `src/lib/ai/index.ts` — already complete (Claude provider registered on import)
- `package.json` — no new dependencies needed (Zod already installed)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3 — Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — POST /api/interview/[token]/messages route]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSE Event Formats — message, done, error events]
- [Source: _bmad-output/coding-standards.md#Section 6 — Skill Loading and Prompt Assembly chain]
- [Source: _bmad-output/coding-standards.md#Section 8 — SSE Streaming Pattern]
- [Source: _bmad-output/coding-standards.md#Section 1 — LLM Provider Interface, Provider Resolution Chain]
- [Source: _bmad-output/coding-standards.md#Section 2 — Interview Exchange Data Model, Segment Rules]
- [Source: _bmad-output/project-context.md#SSE Event Format — standardized event table]
- [Source: _bmad-output/project-context.md#Error Handling Patterns — LLM retry, SSE error events]
- [Source: _bmad-output/planning-artifacts/prd.md#FR50 — Interview agent AI skill]
- [Source: _bmad-output/planning-artifacts/prd.md#FR8 — Reflect-and-confirm pattern]
- [Source: _bmad-output/planning-artifacts/prd.md#FR47-49 — Exchange persistence and verification]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR1 — First token latency < 3 seconds]
- [Source: _bmad-output/planning-artifacts/prd.md#MVP-NFR6 — All LLM calls server-side]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None.

### Completion Notes List
- Tasks 2-4, 7: Already implemented in Stories 3.1/3.2. Added `[REFLECTIVE_SUMMARY]` marker instruction to base-template.ts.
- Task 1: Added `sendMessageSchema` to api-requests.ts (non-empty, trimmed, max 5000 chars).
- Task 6: Added `getMaxSequenceNumber` query using max() aggregate.
- Task 5: Created POST route with SSE streaming pipeline: token validation, interview status check, body validation, persist user message, load skill, assemble prompt, resolve provider, stream response, detect exchange type, persist agent response, emit done event.
- Task 8: `detectExchangeType()` inline in route — detects `[REFLECTIVE_SUMMARY]` marker, strips it, defaults to question.
- Task 9: 18 route tests covering SSE format, persistence, exchange type detection, error handling, validation.

### Change Log
- 2026-04-09: Completed all tasks. 299 tests across 28 files, all passing.

### File List
- `src/app/api/interview/[token]/messages/route.ts` (created)
- `src/app/api/interview/[token]/messages/route.test.ts` (created)
- `src/lib/schema/api-requests.ts` (modified)
- `src/lib/db/queries.ts` (modified)
- `src/lib/ai/prompts/base-template.ts` (modified)

### Review Findings
- [x] [Review][Patch] Race condition on sequence numbers — added `persistExchangeWithRetry` with unique constraint retry [route.ts]
- [x] [Review][Patch] `request.json()` returns 500 on malformed JSON — wrapped in try/catch, returns 400 VALIDATION_ERROR [route.ts]
- [x] [Review][Patch] Orphaned user exchange on LLM failure — retry-based persistence mitigates sequence gaps [route.ts]
- [x] [Review][Patch] SSE `message` events missing `exchangeType` — added `type` SSE event emitted before content streaming [route.ts]
- [x] [Review][Patch] `[REFLECTIVE_SUMMARY]` marker leaks to client — buffered initial tokens, detect and strip marker before streaming [route.ts]
- [x] [Review][Patch] Removed unused `Connection: keep-alive` header [route.ts]
- [x] [Review][Defer] `session.ts` bypassed by message route — deferred to Story 3.5, logged in deferred-work.md
