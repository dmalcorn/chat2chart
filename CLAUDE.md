# CLAUDE.md — chat2chart (MVP Demo)

AI-powered workflow discovery tool. Workers describe how they do their jobs through speech conversations with an AI interview agent. Multiple interviews are synthesized into normalized workflows with divergence annotations. Output is structured JSON (Process Schema), visualized as Mermaid.js flowcharts.

**Scope:** MVP demo — interview, synthesis, visualization. No PM UI, no BPMN export, no supervisor editing, no state machine transitions, no multi-provider support.

## Key Documents (read before implementing)

- `_bmad-output/project-context.md` — Technology stack, implementation rules, naming conventions, anti-patterns (MVP-scoped)
- `_bmad-output/coding-standards.md` — Detailed coding patterns, interface contracts, code examples
- `_bmad-output/approved-tech-stack.md` — Pinned dependency versions (lock exact versions, no `^` or `~`)
- `_bmad-output/planning-artifacts/prd.md` — MVP product requirements

## Universal Rules

### Service Boundaries — No Exceptions

- `@anthropic-ai/sdk` imported ONLY in `src/lib/ai/`
- Drizzle imported ONLY in `src/lib/db/` — routes call query functions, never raw SQL
- `bcrypt` imported ONLY in `src/lib/auth/config.ts`
- `compromise` imported ONLY in `src/lib/interview/schema-extractor.ts`
- Web Speech API touched ONLY in `src/lib/stt/`
- Process tree operations ONLY through `src/lib/process/`

### API Response Format — Every Route

- Success: `{ data: T }` or `{ data: T[], count: number }`
- Error: `{ error: { message: string, code: string } }` + HTTP status
- Dates: ISO 8601 strings
- Never return unwrapped data

### Data Integrity

- Persist every interview exchange to DB immediately on creation — never batch
- Every element carries `sourceType`: `interview_discovered` or `synthesis_inferred`
- Never tag as `interview_discovered` unless an interviewee confirmed the reflective summary
- Process nodes: EITHER organizational (children, no interviews) OR leaf (interviews, no children) — never both. Tree is seeded, not built via UI.

### Security

- All LLM calls server-side — never expose API keys to the client
- No interview data in browser localStorage/sessionStorage (NFR9)
- Interview tokens are the credential — no login required for interviewees

### Architecture

- Two-dimensional AI: Skills define *what* the LLM does; Providers define *which* LLM. Claude is the sole provider for MVP. All calls through `provider-registry.ts`.
- Interview prompts assembled via `skill-loader.ts` → `prompt-assembler.ts` — never hardcoded
- Server Components by default; `"use client"` only at leaf components
- No global state libraries — Server Components + local state only

### Naming

- Files: `kebab-case.ts`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- DB tables/columns: `snake_case` (Drizzle camelCase mode handles mapping)
- Process nodes: verb phrases ("Review Budget Request", not "Budget Review")

### Testing

- Tests co-located with source files
- Mock at adapter interface level (`LLMProvider`, `STTProvider`), never at SDK level
- Zod validation and Process Schema validation: always test with real implementations
