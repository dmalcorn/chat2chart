# Story 3.1: Skill Loader, Prompt Assembler & Federal Document Processing Skill

Status: review

## Story

As a developer,
I want the interview skill system operational with the demo domain skill loaded,
So that the interview agent has domain-specific context for its conversations.

## Acceptance Criteria

1. **Given** a skill name from the project record **When** `loadSkill(skillName)` is called **Then** `src/lib/interview/skill-loader.ts` reads `skills/{skillName}/skill.md`, parses YAML frontmatter and markdown sections, validates required structure, and returns a typed `SkillDefinition` object (FR50a)
2. **Given** a loaded skill definition and the base template **When** `assembleInterviewPrompt(skill)` is called **Then** `src/lib/ai/prompts/prompt-assembler.ts` combines the base interview template with the domain skill into a single assembled system prompt string, in order: base template, skill persona, skill workflow (probe elements + follow-up strategies), synthesis context (FR50a)
3. **Given** the interview agent needs core behavioral rules **When** `getBaseTemplate()` is called **Then** `src/lib/ai/prompts/base-template.ts` returns the core interview agent behavior: reflect-and-confirm pattern, 5-8 exchange limit per segment, one question at a time, immediate reflective summary after each substantive response (FR8, MVP1)
4. **Given** the demo scenario requires Federal Document Processing **When** the skill directory is checked **Then** `skills/federal-document-processing/skill.md` exists with YAML frontmatter (`name`, `description`), Persona section (Identity, Communication Style, Principles), Probe Elements (physical handling, scanning, classification, data entry, quality checks, routing, systems, handoffs), Synthesis Elements (standard fields + domain-specific), Follow-Up Strategies, and Reflective Summary Template for IRS DPT workflows (MVP2)
5. **Given** any interview prompt construction **When** a route handler or service needs an interview prompt **Then** prompts are never hardcoded — always assembled by calling `assembleInterviewPrompt(skill)` from `prompt-assembler.ts` (FR50a)
6. **Given** a skill name that does not exist in the `skills/` directory **When** `loadSkill(skillName)` is called **Then** it throws a `SkillNotFoundError` with the skill name in the error message
7. **Given** a skill.md file with missing required sections or frontmatter **When** `loadSkill(skillName)` is called **Then** it throws a `SkillValidationError` specifying which section or field is missing

## Tasks / Subtasks

- [x] Task 1: Define the `SkillDefinition` type in `src/lib/interview/skill-loader.ts` (AC: #1, #4)
  - [x] 1.1 Create `src/lib/interview/skill-loader.ts` (replacing the `.gitkeep`)
  - [x] 1.2 Define `SkillDefinition` type with fields: `name` (string), `description` (string), `persona` (object with `identity`, `communicationStyle`, `principles` strings), `probeElements` (string — raw markdown list), `synthesisElements` (string — raw markdown list), `followUpStrategies` (string | null — optional section), `reflectiveSummaryTemplate` (string | null — optional section), `rawContent` (string — full skill.md content for advanced use)
  - [x] 1.3 Export the `SkillDefinition` type for use by `prompt-assembler.ts` and tests
  - [x] 1.4 Define and export `SkillNotFoundError` and `SkillValidationError` custom error classes (both extend `Error` with a `code` property)

- [x] Task 2: Implement `loadSkill()` in `src/lib/interview/skill-loader.ts` (AC: #1, #6, #7)
  - [x] 2.1 Implement `loadSkill(skillName: string): Promise<SkillDefinition>` — this is the ONLY function that reads from the `skills/` directory
  - [x] 2.2 Resolve the skill directory path: `path.join(process.cwd(), 'skills', skillName)` — verify directory exists, throw `SkillNotFoundError` if not
  - [x] 2.3 Read `skill.md` from the skill directory using `fs.readFile` — throw `SkillNotFoundError` with message `skill.md not found` if file is missing
  - [x] 2.4 Parse YAML frontmatter from the markdown content — extract `name` and `description` fields. Use a simple frontmatter parser (split on `---` delimiters, parse YAML between them). Do NOT add a new dependency — implement inline or use a lightweight approach
  - [x] 2.5 Validate frontmatter: `name` and `description` must be present and non-empty — throw `SkillValidationError` with specific field name if missing
  - [x] 2.6 Parse markdown body by section headings (`## Persona`, `## Probe Elements`, `## Synthesis Elements`, `## Follow-Up Strategies`, `## Reflective Summary Template`)
  - [x] 2.7 Validate required sections: `Persona` (with subsections `### Identity`, `### Communication Style`, `### Principles`), `Probe Elements`, `Synthesis Elements` must exist — throw `SkillValidationError` specifying which section is missing
  - [x] 2.8 Return a fully populated `SkillDefinition` object with parsed and validated data

- [x] Task 3: Implement base interview template in `src/lib/ai/prompts/base-template.ts` (AC: #3)
  - [x] 3.1 Create `src/lib/ai/prompts/base-template.ts` (replacing the `.gitkeep` in prompts/)
  - [x] 3.2 Implement `getBaseTemplate(): string` — returns the core system prompt text defining interview agent behavior
  - [x] 3.3 The base template must include these behavioral rules:
    - Reflect-and-confirm pattern: after each substantive interviewee response, distill what was said into a structured reflective summary and ask for confirmation before moving on
    - 5-8 exchange limit: aim for 5-8 total exchanges per interview (~90 seconds). Be efficient, not exhaustive
    - One question at a time: never stack multiple questions
    - Reflective summary structure: What happens, Why, How, Then
    - Confirmation prompt: "Did I get that right, or would you adjust anything?"
    - Exchange types: the agent produces `question` and `reflective_summary` exchange types
    - Segment grouping: each probe-response-reflect-confirm cycle is one segment
    - Never show raw transcript to the interviewee — the first text they see is the reflective summary
    - Create psychological safety — no wrong answers, no judgment
  - [x] 3.4 Export `getBaseTemplate` for use by `prompt-assembler.ts`

- [x] Task 4: Implement prompt assembler in `src/lib/ai/prompts/prompt-assembler.ts` (AC: #2, #5)
  - [x] 4.1 Create `src/lib/ai/prompts/prompt-assembler.ts`
  - [x] 4.2 Import `getBaseTemplate` from `./base-template` and `SkillDefinition` type from `@/lib/interview/skill-loader`
  - [x] 4.3 Implement `assembleInterviewPrompt(skill: SkillDefinition): string` — combines the four blocks in order:
    1. Base template (from `getBaseTemplate()`)
    2. Skill persona (Identity, Communication Style, Principles from the skill definition)
    3. Skill workflow (Probe Elements + Follow-Up Strategies from the skill definition, with all content inline)
    4. Synthesis context (Synthesis Elements from the skill definition — tells the agent what structured fields will be extracted)
  - [x] 4.4 Use clear section separators (e.g., markdown headers or delineators) between blocks so the LLM can distinguish them
  - [x] 4.5 If the skill has a `reflectiveSummaryTemplate`, include it in the persona/workflow section to override the base template's default summary structure
  - [x] 4.6 Export `assembleInterviewPrompt` — this is the ONLY function route handlers call to get an interview prompt

- [x] Task 5: Create the Federal Document Processing skill definition (AC: #4)
  - [x] 5.1 Create `skills/federal-document-processing/skill.md` (replacing the `.gitkeep`)
  - [x] 5.2 Add YAML frontmatter with `name: federal-document-processing` and a description referencing IRS taxpayer document processing workflows
  - [x] 5.3 Write `## Persona` section:
    - `### Identity`: A knowledgeable, patient facilitator familiar with federal government document processing operations, IRS Service Center workflows, and the daily work of Document Processing Technicians (DPTs)
    - `### Communication Style`: Professional but approachable. Uses plain language first, mirrors government terminology when the interviewee uses it. Acknowledges the complexity and importance of the work. Keeps responses concise.
    - `### Principles`: Reflect-and-confirm pattern, one question at a time, probe for informal practices, create psychological safety, follow interviewee's narrative then circle back for gaps
  - [x] 5.4 Write `## Probe Elements` section covering: physical mail handling steps, scanning/imaging procedures, classification methods (manual vs. system-assisted/SCRS), data entry procedures, quality check steps, routing/disposition, systems touched (document management, case management), handoffs between roles, batch processing vs. individual, form type identification
  - [x] 5.5 Write `## Synthesis Elements` section with standard fields (`action`, `object`, `purpose`, `actor`, `systemName`, `handoffTarget`, `isDecisionPoint`, `isException`) plus domain-specific fields: `formType` (string | null — IRS form type if applicable), `batchStep` (boolean — whether this step involves batch processing), `qualityCheckType` (string | null — type of QC if applicable)
  - [x] 5.6 Write `## Follow-Up Strategies` section: probe for exceptions (damaged documents, illegible handwriting, missing information), ask about volume/throughput ("how many do you process in a shift?"), probe for informal practices ("anything you do that isn't in the manual?"), after classification probe for what happens when auto-detect fails, after data entry ask about error correction procedures, explore sort timing (pre-scan vs. post-scan)
  - [x] 5.7 Write `## Reflective Summary Template` section following the pattern: What happens (action on object by actor), Why (purpose or trigger), How (method, system, or tool used), Then (what happens next or handoff). Confirm: "Did I get that right, or would you adjust anything?"

- [x] Task 6: Create tests (AC: #1-#7)
  - [x] 6.1 Create `src/lib/interview/skill-loader.test.ts`:
    - Test `loadSkill('general-process-discovery')` returns a valid `SkillDefinition` with all required fields populated (uses the real skill file that already exists)
    - Test `loadSkill('federal-document-processing')` returns a valid `SkillDefinition` after Task 5 creates the file
    - Test `loadSkill('nonexistent-skill')` throws `SkillNotFoundError`
    - Test loading a skill.md with missing `## Persona` section throws `SkillValidationError` mentioning "Persona"
    - Test loading a skill.md with missing frontmatter `name` throws `SkillValidationError` mentioning "name"
    - Use real filesystem reads (no mocking fs) — these are integration tests against actual skill files
    - For validation error tests, create temporary skill files with missing sections using `fs.writeFile` in a temp directory, clean up after
  - [x] 6.2 Create `src/lib/ai/prompts/base-template.test.ts`:
    - Test `getBaseTemplate()` returns a non-empty string
    - Test returned template contains key behavioral phrases: "reflect", "confirm", "5-8 exchanges" (or equivalent), "one question at a time"
    - Test returned template mentions exchange types: "question", "reflective_summary"
  - [x] 6.3 Create `src/lib/ai/prompts/prompt-assembler.test.ts`:
    - Test `assembleInterviewPrompt(skill)` returns a string containing content from all four blocks (base template text, skill persona identity, probe elements, synthesis elements)
    - Test assembled prompt includes the skill's persona identity text
    - Test assembled prompt includes the skill's probe elements
    - Test assembled prompt includes the base template's reflect-and-confirm instructions
    - Test with a minimal mock `SkillDefinition` (not mocking the skill-loader — just passing a typed object directly)
    - Test that optional sections (followUpStrategies, reflectiveSummaryTemplate) are included when present and omitted when null

## Dev Notes

### What Already Exists (from Epics 1 and 2)

- `src/lib/ai/provider.ts` — `LLMProvider` interface, `LLMProviderConfig`, `Message`, `LLMCallOptions`, `ProviderFactory` types
- `src/lib/ai/provider-registry.ts` — `registerProvider()`, `resolveProvider(projectId, skillName)`, `ProviderResolutionError`. Uses `getProjectById` and `getSkillProviderByProjectAndSkill` from `@/lib/db/queries`
- `src/lib/ai/claude-provider.ts` — Claude implementation of `LLMProvider`
- `src/lib/ai/index.ts` — Barrel exports + auto-registers Claude provider on module load
- `src/lib/ai/prompts/` — Directory exists with `.gitkeep` only. `base-template.ts` and `prompt-assembler.ts` do NOT exist yet
- `src/lib/ai/prompts/synthesis/` — Directory exists with `.gitkeep` only (not this story's scope)
- `src/lib/interview/` — Directory exists with `.gitkeep` only. `skill-loader.ts` does NOT exist yet
- `src/lib/db/queries.ts` — EXISTS (created by Story 2.1) with query functions
- `src/lib/db/schema.ts` — All 12 tables including `projects.skillName` column which stores the skill name per project
- `skills/general-process-discovery/` — Complete reference skill with `skill.md`, `workflow.md`, `probe-elements.csv`, `domain-vocabulary.csv`, and `steps/` directory
- `skills/federal-document-processing/` — Directory exists with `.gitkeep` only. `skill.md` does NOT exist yet
- `skills/README.md` — Comprehensive guide on skill file format, required sections, validation rules, and companion files

### Skill File Format (from skills/README.md)

**Required frontmatter:** `name` (must match directory name), `description`

**Required sections (headings must match exactly):**
- `## Persona` with subsections `### Identity`, `### Communication Style`, `### Principles`
- `## Probe Elements`
- `## Synthesis Elements`

**Optional sections:**
- `## Follow-Up Strategies`
- `## Reflective Summary Template`

**Optional companion files** (loaded automatically when present):
- `workflow.md` — interview flow orchestration
- `steps/step-{NN}-{name}.md` — phase-specific files
- `probe-elements.csv` — structured probe categories
- `domain-vocabulary.csv` — domain terminology

For this story, the federal-document-processing skill needs only `skill.md` (single-file approach). The general-process-discovery skill uses the multi-file approach as a reference, but the loader must handle both.

### Skill Loading Chain (from coding-standards.md Section 6)

```
1. PM selects domain skill at project creation -> skill_name stored in projects table
2. Interview session init -> skill-loader.ts reads skills/{skill_name}/skill.md
3. skill-loader.ts parses markdown frontmatter, validates structure, returns typed definition
4. prompt-assembler.ts merges:
   - base-template.ts (reflect-and-confirm pattern, core behavioral rules)
   - skill persona (communication style, behavioral rules from skill.md)
   - skill workflow (probe elements, follow-up strategies, domain vocabulary from skill.md)
   - synthesis context (synthesis elements from skill.md)
5. provider-registry.ts resolves LLM provider for interview_agent skill
6. Assembled prompt + provider -> drives the interview agent
```

Steps 5-6 are NOT this story's scope — they are already implemented in the provider registry (Story 1.4) and will be connected in Story 3.3 (SSE streaming).

### Assembler Output Format (from coding-standards.md Section 6)

The assembler output is four blocks in order:
1. Base template (reflect-and-confirm pattern, core behavioral rules)
2. Skill persona (Identity, Communication Style, Principles)
3. Skill workflow (Probe Elements + Follow-Up Strategies, all content inline)
4. Synthesis context (Synthesis Elements — tells agent what fields will be extracted)

Route handlers call `assembleInterviewPrompt(skill)` — never construct prompts directly.

### IRS Demo Scenario Context (from PRD Section 2)

The Federal Document Processing skill covers how IRS Document Processing Technicians (DPTs) handle incoming paper taxpayer correspondence at Service Centers. The three demo interviewees work at Austin TX, Kansas City MO, and Ogden UT centers.

**Expected divergences the skill should help surface:**
- Sort timing: Austin pre-sorts physically vs. Kansas City/Ogden sort digitally after scanning
- Classification method: Kansas City trusts system auto-detect (SCRS) vs. Austin/Ogden manually classify
- Quality check: Ogden has a manual verification step the other two skip

**Key vocabulary:** DPT (Document Processing Technician), correspondence, batch, Form type, TIN (taxpayer identification number), Submission Processing, SCRS (Service Center Recognition System)

### Service Boundaries — Enforced

- `skill-loader.ts` is the ONLY file that reads from the `skills/` directory
- `prompt-assembler.ts` is the ONLY file where skill definitions meet LLM prompts
- `@anthropic-ai/sdk` is NOT imported by any file in this story — this story prepares prompts, not LLM calls
- Drizzle is NOT imported by any file in this story — the `projects.skillName` value is passed in by the caller (Story 3.3)

### Frontmatter Parsing Strategy

Do NOT add a new dependency (e.g., `gray-matter`) for YAML frontmatter parsing. The frontmatter in skill.md files is simple key-value pairs. Implement a lightweight parser:
1. Split content on `---` delimiters
2. Extract the YAML block between the first two `---` markers
3. Parse each line as `key: value` (handle multi-line `>-` descriptions by joining continuation lines)
4. Alternatively, use `js-yaml` if it is already available via a transitive dependency — check first

### What NOT to Do

- Do NOT create the SSE streaming route (`POST /api/interview/[token]/messages`) — that is Story 3.3
- Do NOT create interview session management (`session.ts`) — that is Story 3.2
- Do NOT create the correction template (`correction-template.ts`) — that is a later story
- Do NOT create synthesis prompt templates (`match-template.ts`, etc.) — those are Epic 5
- Do NOT import `@anthropic-ai/sdk` anywhere in this story
- Do NOT import Drizzle anywhere in this story
- Do NOT add new npm dependencies for frontmatter parsing — implement inline
- Do NOT create companion files for the federal skill (no `workflow.md`, `steps/`, CSVs) — single-file approach is sufficient for the demo
- Do NOT load companion files (workflow.md, CSVs, steps/) in this story — the loader should handle `skill.md` only for now; companion file support can be added later if needed
- Do NOT modify the existing general-process-discovery skill files
- Do NOT modify `src/lib/ai/index.ts` — no barrel export changes needed for prompts yet

### Project Structure Notes

Files **created** by this story:
- `src/lib/interview/skill-loader.ts` — Skill loading and validation
- `src/lib/ai/prompts/base-template.ts` — Core interview agent behavior template
- `src/lib/ai/prompts/prompt-assembler.ts` — Combines base template + domain skill into assembled prompt
- `skills/federal-document-processing/skill.md` — IRS DPT workflow domain skill definition

Test files **created** by this story:
- `src/lib/interview/skill-loader.test.ts`
- `src/lib/ai/prompts/base-template.test.ts`
- `src/lib/ai/prompts/prompt-assembler.test.ts`

Files **NOT modified** by this story:
- `src/lib/ai/provider.ts` — already complete
- `src/lib/ai/provider-registry.ts` — already complete
- `src/lib/ai/claude-provider.ts` — already complete
- `src/lib/ai/index.ts` — no changes needed
- `src/lib/db/schema.ts` — already complete
- `src/lib/db/queries.ts` — already complete (Story 2.1)
- `skills/general-process-discovery/*` — reference skill, do not modify
- `package.json` — no new dependencies needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1 — Acceptance criteria, FR50a, FR8, MVP1, MVP2]
- [Source: _bmad-output/planning-artifacts/prd.md#Section 5 — AI Architecture, Federal Document Processing skill definition]
- [Source: _bmad-output/planning-artifacts/prd.md#FR50, FR50a, FR8, MVP1, MVP2 — Interview agent requirements]
- [Source: _bmad-output/coding-standards.md#Section 6 — Skill Loading and Prompt Assembly rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure — File locations for skill-loader, prompt-assembler, base-template]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Boundaries — skill-loader.ts only reads skills/, prompt-assembler.ts only place skills meet prompts]
- [Source: _bmad-output/project-context.md#Anti-Patterns — Never hardcode interview prompts]
- [Source: skills/README.md — Skill file format, required sections, validation rules]
- [Source: skills/general-process-discovery/skill.md — Reference skill implementation]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None — all tasks completed without issues.

### Completion Notes List
- Task 1-2: Created `skill-loader.ts` with `SkillDefinition` type, `SkillPersona` interface, `SkillNotFoundError`/`SkillValidationError` error classes, inline YAML frontmatter parser (no new deps), section parser for markdown headings, and `loadSkill()` function with full validation.
- Task 3: Created `base-template.ts` with `getBaseTemplate()` returning core interview agent behavioral rules: reflect-and-confirm pattern, 5-8 exchange limit, one question at a time, reflective summary structure (What/Why/How/Then), exchange types (question/reflective_summary), psychological safety.
- Task 4: Created `prompt-assembler.ts` with `assembleInterviewPrompt(skill)` combining 4 blocks in order: base template, skill persona, skill workflow (probes + follow-up strategies), synthesis context. Optional sections (followUpStrategies, reflectiveSummaryTemplate) included when present, omitted when null.
- Task 5: Created `skills/federal-document-processing/skill.md` with IRS DPT domain skill — full persona, probe elements covering mail handling/scanning/classification/data entry/QC/routing/systems/handoffs/batch processing/form types, domain-specific synthesis elements (formType, batchStep, qualityCheckType), follow-up strategies, and reflective summary template.
- Task 6: Tests already existed from prior session (8 skill-loader tests, 8 base-template tests, 10 prompt-assembler tests). All 26 story tests pass. Full regression suite: 245 tests across 24 files — all pass.

### Change Log
- 2026-04-09: Completed Tasks 5-6 (federal skill definition + test validation). Tasks 1-4 completed in prior session.

### File List
- `src/lib/interview/skill-loader.ts` (created)
- `src/lib/ai/prompts/base-template.ts` (created)
- `src/lib/ai/prompts/prompt-assembler.ts` (created)
- `skills/federal-document-processing/skill.md` (created)
- `src/lib/interview/skill-loader.test.ts` (created)
- `src/lib/ai/prompts/base-template.test.ts` (created)
- `src/lib/ai/prompts/prompt-assembler.test.ts` (created)

### Review Findings
- [x] [Review][Patch] Skill loader missing caching — added module-level Map cache [skill-loader.ts]
- [x] [Review][Defer] parseFrontmatter multiline YAML handling fragile — works for current skills, deferred to deferred-work.md
