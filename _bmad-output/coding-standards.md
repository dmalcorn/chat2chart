# Coding Standards — chat2bpmn

_Detailed coding rules and patterns for implementation. AI agents should read `project-context.md` first for the quick-scan summary, then reference this document for deeper guidance on specific patterns._

---

## 1. Provider Abstraction Contracts

All LLM and STT interactions go through provider adapter interfaces. Never call SDKs directly from business logic.

### LLM Provider Interface (FR98)

```typescript
interface LLMProvider {
  initialize(config: { apiKey: string; model: string; options?: Record<string, unknown> }): void;
  sendMessage(prompt: string, conversation?: Message[]): Promise<string>;
  streamResponse(prompt: string, conversation?: Message[]): AsyncIterable<string>;
  metadata: {
    providerName: string;   // e.g., "anthropic", "openai"
    modelName: string;      // e.g., "claude-sonnet-4"
    modelVersion: string;
    tokenLimits: { input: number; output: number };
    costEstimate?: { inputPerMToken: number; outputPerMToken: number };
  };
}
```

### STT Provider Interface (FR14)

```typescript
interface STTProvider {
  initialize(config: { apiKey?: string; options?: Record<string, unknown> }): void;
  startListening(): void;
  stopListening(): Promise<string>;
  onTranscript(callback: (result: { text: string; confidence: number; isFinal: boolean }) => void): void;
}
```

### Provider Resolution Chain

```
Route handler receives request
  → provider-registry.ts resolves provider for (projectId, skillName)
  → checks project_skill_providers table for specific assignment
  → falls back to project's default_llm_provider
  → returns configured LLMProvider instance
```

- Register providers in `src/lib/ai/provider-registry.ts`
- Each provider implementation lives in its own file: `claude-provider.ts`, `openai-provider.ts`
- Provider attribution: record `llm_provider` and `stt_provider` on every interview session

---

## 2. Interview Exchange Data Model

### Exchange Types and Segment Grouping

Every row in `interview_exchanges` carries these critical fields:

```typescript
{
  exchangeId: string;       // UUID primary key
  interviewId: string;      // FK → interviews
  segmentId: string;        // UUID — groups one probe-response-reflect-confirm cycle
  exchangeType: 'question' | 'response' | 'reflective_summary' | 'confirmation' | 'revised_summary';
  speaker: 'agent' | 'interviewee';
  content: string;
  isVerified: boolean;      // true ONLY on the final confirmed reflective summary in a segment
  sequenceNumber: number;   // ordering within the interview
  createdAt: Date;
}
```

### Segment Rules

- A segment groups one conversational cycle about a single process step or topic
- A segment contains: question → response → reflective_summary → confirmation (minimum)
- If interviewee corrects: add revised_summary → confirmation (repeat until confirmed)
- Exactly ONE exchange per segment can have `isVerified = true`
- Only `reflective_summary` or `revised_summary` types can be verified — never `question`, `response`, or `confirmation`
- A `confirmation` with no substantive correction signals agreement — the preceding summary is verified
- A `confirmation` with corrections triggers a `revised_summary` cycle

### Persistence Rule

Every exchange is persisted to the database immediately on creation — not batched, not deferred. This is load-bearing for both session resumability (FR13) and audit trail (FR47-49a).

---

## 3. Process Decomposition Tree

### Data Model Enforcement

```typescript
// process_nodes table
{
  nodeId: string;           // UUID primary key
  projectId: string;        // FK → projects
  parentNodeId: string | null; // FK → process_nodes (null = root)
  name: string;             // Verb-phrase: "Review Budget Request", not "Budget Review"
  description: string | null;
  level: number;            // Depth in tree, 1 = root
  nodeType: 'organizational' | 'leaf';
  sortOrder: number;        // Sibling ordering within parent
  createdAt: Date;
  updatedAt: Date;
}
```

### Constraint Enforcement (FR109b)

These constraints must be enforced at the service level (`src/lib/process/tree.ts`), not just at the UI level:

- **Adding a child** to a leaf node that has interviews → REJECT. The node must remain a leaf.
- **Adding an interview** to an organizational node → REJECT. Interviews only attach to leaf nodes.
- **Deleting an organizational node** with descendants → REQUIRE confirmation, cascade delete children.
- **Deleting a leaf node** with interview data → REQUIRE confirmation, warn about data loss.
- **Converting** a leaf node with no interviews to organizational → ALLOW (adding first child implicitly converts it).
- **Converting** an organizational node with no children to leaf → ALLOW (removing last child implicitly converts it).

### Naming Convention

Process nodes use verb phrases per BPM standards:
- Correct: "Review Budget Request", "Submit Domestic Travel Request", "Approve as Supervisor"
- Incorrect: "Budget Review", "Domestic Travel", "Supervisor Approval"

### Status Roll-Up Logic (`src/lib/process/status-rollup.ts`)

```
Leaf node status:
  - grey: 0 interviews started
  - amber: some interviews in progress (not all Captured)
  - green: all interviews Captured

Organizational node status:
  - Aggregate children: "X of Y sub-processes complete"
  - A child is "complete" when all its leaves are green (all Captured + synthesized)
  - Propagate upward recursively
```

---

## 4. Synthesis Pipeline Coding Rules

### Temperature Settings Per Stage

| Stage | File | Temperature | Rationale |
|---|---|---|---|
| Stage 3: Match | `correlator.ts` | 0.1–0.2 | Deterministic matching — same inputs should produce same matches |
| Stage 4: Classify | `divergence.ts` | 0.1–0.2 | Deterministic classification — same inputs should produce same classifications |
| Stage 5: Narrate | `narrator.ts` | 0.3–0.4 | Slightly creative for natural language fluency while respecting structured output |

### Structured Output

Use Claude's `output_format` parameter with Zod-generated JSON Schema for Stages 3–5. The same Zod schema that validates synthesis output can be converted to JSON Schema for structured output mode — single source of truth.

### Checkpoint Persistence

After each stage completes, persist to `synthesis_checkpoints`:

```typescript
{
  checkpointId: string;
  projectId: string;
  synthesisVersion: number;
  stage: 'match' | 'classify';   // Stage 5 result goes to synthesis_results, not checkpoints
  resultJson: object;            // JSONB — stage output
  createdAt: Date;
  durationMs: number;            // Stage execution time for monitoring
}
```

- Checkpoints are immutable — new synthesis runs create new rows, never overwrite
- On retry, resume from the last successful checkpoint
- Stage 5 output goes to `synthesis_results.workflow_json`, not to checkpoints

### Position Bias Mitigation (MVP)

Randomize the order of interview steps in the Stage 3 prompt before sending to the LLM. This prevents the model from favoring steps that appear first.

---

## 5. Individual Schema Extraction Pipeline

### Three-Tier Quality Assurance

```
Tier 1: Programmatic extraction (compromise.js)
  → verb-object decomposition via .verbs(), .nouns()
  → temporal sequence from conversational position + temporal markers
  → decision points from conditional patterns (if/when/depends/unless/sometimes)
  → ~50-200ms, deterministic, no API cost

Tier 2: Quality gate (heuristic checks, no LLM)
  → Structural: Zod validation against Process Schema
  → Completeness: at least 1 step per 2 confirmed summaries
  → Richness: at least 1 decision point if conditional language exists
  → ANY check fails → automatic LLM fallback (Tier 2→3 is transparent to interviewee)

Tier 3: LLM fallback (automatic on quality gate failure)
  → Same verified reflective summaries as input
  → Process Schema as output contract via structured output mode
  → Uses project's interview_agent LLM provider
  → Interviewee sees only slightly longer loading (~2-4s vs. ~200ms)
```

### Observability Logging

`schema-extractor.ts` must log every extraction attempt with:
- Method used: `programmatic` or `llm_fallback`
- Quality gate results: pass/fail per check with scores
- Extraction duration in ms
- Step count produced
- Store `extraction_method` in `individual_process_schemas` table

---

## 6. Skill Loading and Prompt Assembly

### Skill Loading Chain

```
1. PM selects domain skill at project creation → skill_name stored in projects table
2. Interview session init → skill-loader.ts reads skills/{skill_name}/skill.md
3. skill-loader.ts parses markdown frontmatter, validates structure, returns typed definition
4. prompt-assembler.ts merges:
   - base-template.ts (reflect-and-confirm pattern, core behavioral rules)
   - skill persona (communication style, behavioral rules from skill.md)
   - skill workflow (probe elements, follow-up strategies, domain vocabulary from skill.md)
5. provider-registry.ts resolves LLM provider for interview_agent skill
6. Assembled prompt + provider → drives the interview agent
```

### Rules

- Never hardcode interview prompts in route handlers or components
- `skill-loader.ts` is the ONLY file that reads from the `skills/` directory
- `prompt-assembler.ts` is the ONLY file where skill definitions meet LLM prompts
- Synthesis pipeline also uses skill definitions: `synthesisElements` from the skill feed into Stage 3–5 prompts
- Domain skill definitions are markdown files with frontmatter — not TypeScript, not JSON
- Interview agent prompt is assembled once at session init — all skill content (persona, workflow, steps, probes, vocabulary) loaded into a single system prompt. No dynamic step loading during the conversation
- Assembler output is four blocks in order: base template → skill persona → skill workflow (with all steps inline) → synthesis context
- Route handlers call `assembleInterviewPrompt(skill)` or `assembleSynthesisPrompt(stage, skill)` — never construct prompts directly

---

## 7. Authentication Implementation

### Password Handling

- Hash with `bcrypt` before storage — never store plaintext
- `bcrypt` imported ONLY in `src/lib/auth/config.ts`
- Salt rounds: use bcrypt default (10 rounds)

### Session Management

- JWT signed with `SESSION_SECRET` environment variable
- Stored as signed HTTP-only cookie
- Default expiry: 24 hours of inactivity (configurable)
- Session validation via `src/lib/auth/session.ts` — creates, validates, and destroys sessions

### Route Protection Pattern

```typescript
// In route handler — use middleware helper, do not inline auth logic
import { withPMAuth } from '@/lib/auth/middleware';

export const GET = withPMAuth(async (req, session) => {
  // session is validated — contains PM email, userId
  // ... route logic
});
```

- Management plane routes (`/api/projects/**`) → wrap with `withPMAuth`
- Interview plane routes (`/api/interview/[token]/**`) → validate token, no session required
- Review plane routes (Phase 2) → wrap with `withSupervisorAuth`

### Login Flow

```
POST /api/auth/login { email, password }
  → check email against PM_EMAIL_ALLOWLIST env var
  → if not found, check project_supervisors table
  → if neither → 403 "Access not available. Contact the administrator."
  → verify password against bcrypt hash in users table
  → create signed JWT cookie → redirect based on role (FR69e)
```

### First PM Bootstrap

At application startup, check if `FIRST_PM_EMAIL` and `FIRST_PM_PASSWORD` env vars are set. If the user doesn't exist in the `users` table, create the account with hashed password. This runs once — subsequent startups skip if the user already exists.

---

## 8. API Route Patterns

### Consistent Response Wrapping

Every API route must use these response shapes — no exceptions:

```typescript
// Success — single item
return NextResponse.json({ data: project }, { status: 200 });

// Success — list
return NextResponse.json({ data: projects, count: projects.length }, { status: 200 });

// Created
return NextResponse.json({ data: newProject }, { status: 201 });

// Error
return NextResponse.json(
  { error: { message: 'Project not found', code: 'PROJECT_NOT_FOUND' } },
  { status: 404 }
);
```

### Validation Pattern

```typescript
import { createProjectSchema } from '@/lib/schema/api-requests';

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { message: parsed.error.message, code: 'VALIDATION_ERROR' } },
      { status: 400 }
    );
  }

  // Use parsed.data — fully typed and validated
}
```

- Validate at the API boundary with Zod
- Trust internal code after validation — no redundant checks deeper in the stack
- Zod schemas live in `src/lib/schema/api-requests.ts` (requests) and `src/lib/schema/api-responses.ts` (response types)

### SSE Streaming Pattern

```typescript
export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const provider = await resolveProvider(projectId, 'interview_agent');
        for await (const token of provider.streamResponse(prompt, conversation)) {
          controller.enqueue(
            encoder.encode(`event: message\ndata: ${JSON.stringify({ content: token, exchangeType })}\n\n`)
          );
        }
        controller.enqueue(
          encoder.encode(`event: done\ndata: ${JSON.stringify({ interviewExchangeId, segmentId })}\n\n`)
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: 'Agent unavailable', code: 'LLM_ERROR' })}\n\n`)
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  });
}
```

---

## 9. Mermaid and BPMN Generation

### Individual Process Diagrams (Non-Technical Audience)

Generated by `individual-mermaid-generator.ts` — three visual elements ONLY:
- Rounded rectangles for steps
- Diamonds for decision points
- Arrows for sequence flow
- NO BPMN notation, NO swimlanes, NO parallel paths (FR90)

### Synthesis Diagrams

Generated by `mermaid-generator.ts` — richer than individual diagrams:
- Subsumption matches → nested subgraphs
- Divergence annotations → annotated nodes (color-coded)
- Step attribution → tooltip or annotation

### BPMN 2.0 Generation

Generated by `bpmn-generator.ts` server-side using `bpmn-moddle`:

| Process Schema Element | BPMN 2.0 Construct |
|---|---|
| Step (action + object) | `bpmn:Task` |
| Decision point | `bpmn:ExclusiveGateway` |
| Actor | `bpmn:Lane` within `bpmn:Pool` |
| Sequence | `bpmn:SequenceFlow` |
| Divergence annotation | `bpmn:TextAnnotation` + `bpmn:Association` |
| Sub-steps (subsumption) | `bpmn:SubProcess` (collapsed) |
| Process start/end | `bpmn:StartEvent` / `bpmn:EndEvent` |

- Single actor → single pool, no lanes
- Multiple actors → collaboration diagram with lanes per actor
- Validate generated XML against BPMN 2.0 XSD as part of the generation pipeline
- Store `.bpmn` XML in `synthesis_results` table
- Triggered on-demand from Approved state only (FR96)

---

## 10. Source Type Attribution Rules

Every element in the Process Schema carries a `sourceType` field. These rules are inviolable:

| Source Type | When to Assign | Evidence Required |
|---|---|---|
| `interview_discovered` | An interviewee described it AND confirmed the reflective summary containing it | `is_verified = true` on the source exchange |
| `synthesis_inferred` | The engine matched, classified, or inferred it | Match pair with confidence score and rationale |
| `supervisor_contributed` | A supervisor added or modified it (Phase 2) | Supervisor edit record with attribution |

**Critical rule:** The synthesis engine MUST NOT produce elements with `sourceType: interview_discovered` unless at least one interviewee actually said it AND the reflective summary was confirmed. Match inferences, granularity annotations, and implicit step classifications are ALL `synthesis_inferred`.

---

## 11. File Creation and Organization

### When Creating New Files

- Check if an existing file can be extended before creating a new one
- Place files according to the directory structure in the architecture document
- Use `kebab-case` for all file names
- Co-locate test files with source: `my-component.tsx` and `my-component.test.tsx` in the same directory

### When Creating New Components

- Default to Server Component — only add `"use client"` if the component needs interactivity, hooks, or browser APIs
- Place in the appropriate feature directory: `interview/`, `synthesis/`, `project/`, or `shared/`
- If using shadcn/ui primitives, import from `@/components/ui/`

### When Creating New API Routes

- Follow the existing route structure in `src/app/api/`
- Wrap management routes with auth middleware
- Use Zod validation on all incoming request bodies
- Return consistent `{ data }` / `{ error }` response shapes
- For streaming routes, use the SSE pattern documented above

### When Creating New DB Tables

- Use snake_case for table and column names (Drizzle camelCase mode handles the TypeScript side)
- Include `created_at` and `updated_at` on every table
- Use UUID primary keys
- Foreign keys follow `{table_singular}_id` convention
- Add indexes for columns used in WHERE clauses and JOINs: `idx_{table}_{column}`

---

Last Updated: 2026-04-08
