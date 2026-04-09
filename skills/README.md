# Interview Skill Setup Guide

This guide explains how to create and customize interview domain skills for a running chat2bpmn instance. It covers the skill file format, required sections, optional companion files, and a worked example using the default General Process Discovery skill.

For the underlying design rationale, BMAD pattern mapping, and customization levels (persona-only through full custom), see the [Interview Skill Customization Guide](./../_bmad-output/planning-artifacts/interview-skill-customization-guide.md).

For the technical contract (TypeScript interfaces, validation rules, loader behavior), see the Architecture Document's **Skill Definition Schema** section.

---

## Quick Start

To add a new interview domain skill:

1. Create a directory under `skills/` named with kebab-case (e.g., `skills/healthcare-clinical-workflow/`)
2. Create a `skill.md` file in that directory with YAML frontmatter and required sections
3. The skill appears in the PM's skill picker automatically — no code changes, no restart

---

## Skill File Format

### Entry Point: `skill.md`

Every skill requires a `skill.md` at its directory root. This file defines the interview agent's persona and behavior for that domain.

#### Required Frontmatter

```yaml
---
name: your-skill-name              # Must match the directory name
description: >-                    # Shown in PM's skill selection dropdown
  One or two sentences describing what this skill specializes in.
---
```

#### Required Sections

Your `skill.md` must include these markdown sections. The section headings must match exactly — `skill-loader.ts` parses by heading name.

**1. Persona** — Who the interview agent is during the conversation.

```markdown
## Persona

### Identity
[Who the agent is — role, expertise, familiarity with the domain]

### Communication Style
[How the agent speaks — tone, warmth, formality, vocabulary choices]

### Principles
[Behavioral rules the agent always follows — listed as bullet points]
```

The Persona section maps directly to the BMAD agent skill pattern (Identity, Communication Style, Principles). The interview agent maintains this persona throughout the entire interview — from opening greeting through final wrap-up. See the BMAD architect skill (`.claude/skills/bmad-agent-architect/SKILL.md`) for a reference example.

**2. Probe Elements** — What the agent asks about during the interview.

```markdown
## Probe Elements
- [Category 1]: [What to probe for]
- [Category 2]: [What to probe for]
- ...
```

Probe elements define the interview agent's follow-up question strategy. When an interviewee describes a process step, the agent uses probe elements to decide what to dig into next. The default General Process Discovery skill probes for: decision points, exceptions, loops/repetition, handoffs between people, systems and tools touched, inputs and outputs, and timing/frequency.

Domain-specific skills add specialized probes. A healthcare skill adds medication handoffs, compliance checkpoints, and safety procedures. A manufacturing skill adds quality gates, equipment handoffs, and safety procedures.

**3. Synthesis Elements** — What fields the synthesis pipeline extracts from interviews.

```markdown
## Synthesis Elements
- fieldName (type): description
- fieldName (type): description
- ...
```

Synthesis elements feed directly into Stages 3-5 of the synthesis pipeline. The synthesis prompts use these fields to match steps across interviews, classify divergences, and generate explanatory narratives. Every skill must define at minimum the standard fields (`action`, `object`, `purpose`). Domain skills add custom fields (e.g., `complianceGate`, `safetyCheck`).

#### Optional Sections

```markdown
## Follow-Up Strategies
[How the agent digs deeper — conditional branch exploration, exception probing, etc.]

## Reflective Summary Template
[How the agent structures its reflective summaries back to the interviewee]
```

### Optional Companion Files

These files enhance the skill but are not required. When present, `skill-loader.ts` loads them automatically. When absent, the skill works with just `skill.md`.

| File | When to Use | Format |
|------|------------|--------|
| `workflow.md` | When you need interview flow orchestration beyond what probe elements provide — role definition, critical mindset, anti-bias protocols, phase routing | Free-form markdown |
| `steps/step-{NN}-{name}.md` | When you want each interview phase to be a self-contained file with its own guardrails, success metrics, and failure modes (BMAD micro-file architecture) | Markdown with structured sections |
| `probe-elements.csv` | When you have many probe elements and want structured follow-up strategies | `category,element_name,description,follow_up_strategy` |
| `domain-vocabulary.csv` | When the domain has specialized terminology the agent should recognize and mirror | `term,definition,synonyms,context` |

#### When to Use Multi-File vs. Single-File

**Single-file (`skill.md` only):** Good for general-purpose skills, quick customization, or when the domain doesn't need phase-by-phase interview scripting. The General Process Discovery default skill is a good example.

**Multi-file (with workflow, steps, CSVs):** Good for specialized domains where:
- Each interview phase needs explicit guardrails (e.g., "never skip the compliance checkpoint probe")
- The domain vocabulary is extensive enough to warrant a separate file
- Probe elements have structured follow-up strategies that benefit from CSV format
- The organization wants version-controlled, reviewable interview scripts

---

## The Three AI Agent Skills

chat2bpmn uses three AI agent skills (defined in code via `base-template.ts` and related prompt templates). Interview domain skills customize **only the interview agent** — the other two agents have fixed behavior:

| Agent Skill | What It Does | Customizable via Domain Skills? |
|------------|-------------|-------------------------------|
| **Interview Agent** | Conducts process discovery conversations using reflect-and-confirm pattern | Yes — domain skills customize persona, probe elements, follow-up strategies, synthesis elements |
| **Diagram Correction Agent** | Fixes errors in generated process schemas through dialogue with the interviewee | No — fixed behavior defined in `correction-template.ts` |
| **Supervisor Review Agent** | Helps supervisors adjust synthesis results conversationally (Phase 2) | No — fixed behavior defined in `review-template.ts` |

Domain skills plug into the interview agent via `prompt-assembler.ts`, which merges:
1. `base-template.ts` — Core reflect-and-confirm pattern, behavioral rules common to all interviews
2. Skill persona — Identity, communication style, principles from `skill.md`
3. Skill workflow — Probe elements, follow-up strategies, domain vocabulary from `skill.md` and companion files
4. Synthesis elements — Fields for the synthesis pipeline from `skill.md`

---

## Worked Example: General Process Discovery

The `general-process-discovery/` directory is the default skill that ships with chat2bpmn. It works across any industry or process type. Study this skill as a starting point for creating custom domain skills.

### Directory Structure

```
skills/general-process-discovery/
├── skill.md                     # Persona + probe elements + synthesis elements
├── workflow.md                  # Interview flow orchestration
├── domain-vocabulary.csv        # Empty for general skill (no domain-specific terms)
├── probe-elements.csv           # Universal probe categories with follow-up strategies
└── steps/
    ├── step-01-opening.md       # Greeting, psychological safety, expectation setting
    ├── step-02-process-walkthrough.md   # "Walk me through your typical day/task"
    ├── step-03-decision-points.md       # Probe for conditionals, branches, choices
    ├── step-04-exceptions.md            # Probe for edge cases, workarounds, failures
    ├── step-05-systems-handoffs.md      # Probe for tools, handoffs, actors
    └── step-06-wrap-up.md               # Final summary, confirmation, closure
```

### How the Skill Maps to the Interview Flow

1. **PM creates project** → selects "General Process Discovery" from skill picker → `skill_name = "general-process-discovery"` stored in `projects` table
2. **Interviewee opens interview link** → session initializes → `skill-loader.ts` reads `skills/general-process-discovery/skill.md`
3. **Prompt assembly** → `prompt-assembler.ts` merges base template + skill persona + probe elements + synthesis elements into a system prompt
4. **Interview begins** → Agent greets interviewee using the skill's communication style, asks opening questions per `step-01-opening.md`
5. **Process walkthrough** → Agent follows probe elements to explore decision points, exceptions, handoffs, systems
6. **Reflective summaries** → After each interviewee response, agent distills what was said and confirms understanding
7. **Synthesis** → Synthesis pipeline uses the skill's `synthesisElements` to match steps across interviews and classify divergences

---

## Creating a Custom Domain Skill

### Step 1: Copy the Default

```bash
cp -r skills/general-process-discovery skills/your-domain-name
```

### Step 2: Edit `skill.md`

Update the frontmatter, persona, probe elements, and synthesis elements for your domain. At minimum:

- **name** and **description** in frontmatter
- **Identity** — domain expertise the agent should project
- **Communication Style** — appropriate tone for your interviewees
- **Principles** — domain-specific behavioral rules
- **Probe Elements** — what the agent asks about in your domain
- **Synthesis Elements** — custom fields your domain needs for synthesis

### Step 3: Update Companion Files (Optional)

- **`probe-elements.csv`** — Add domain-specific probe categories with follow-up strategies
- **`domain-vocabulary.csv`** — Add industry terms, abbreviations, and jargon the agent should recognize
- **`workflow.md`** — Customize the interview flow orchestration if needed
- **`steps/`** — Create or modify phase files with domain-specific guardrails

### Step 4: Test

1. Create a project in chat2bpmn and select your new skill
2. Open an interview link and conduct a test interview
3. Verify the agent uses your persona, asks about your probe elements, and produces reflective summaries using your domain vocabulary
4. Run synthesis and verify your custom synthesis elements appear in the output

---

## Validation

`skill-loader.ts` validates skills at interview session initialization. If your skill has issues, the error surfaces when someone tries to start an interview — not at project creation or application startup.

Common validation errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `SkillNotFoundError: skill "xyz" not found` | Directory `skills/xyz/` doesn't exist | Create the directory and `skill.md` |
| `SkillNotFoundError: skill.md not found` | Directory exists but `skill.md` is missing | Create `skill.md` in the skill directory |
| `SkillValidationError: missing frontmatter field "name"` | YAML frontmatter missing `name` | Add `name:` to frontmatter |
| `SkillValidationError: missing section "Persona"` | Required `## Persona` heading not found | Add the `## Persona` section with required subsections |
| `SkillValidationError: missing section "Probe Elements"` | Required `## Probe Elements` heading not found | Add the `## Probe Elements` section |
| `SkillValidationError: malformed CSV headers in probe-elements.csv` | CSV exists but headers don't match expected format | Use headers: `category,element_name,description,follow_up_strategy` |
