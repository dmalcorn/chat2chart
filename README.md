# chat2chart

AI-powered workflow discovery tool. Workers describe how they do their jobs through voice conversations with an AI interview agent. Multiple interviews are synthesized into normalized workflows with divergence annotations. Output is structured JSON (Process Schema), visualized as Mermaid.js flowcharts.

**Core insight:** Divergences between employees' accounts of the same process are discoveries to surface, not errors to resolve.

## Demo Scenario

**IRS Taxpayer Document Processing** (TREAS-IRS-64) — Three Document Processing Technicians at different IRS Service Centers describe how they handle incoming taxpayer correspondence. The synthesis reveals meaningful operational variation:

| Interviewee     | Location        | Key Divergence                                    |
| --------------- | --------------- | ------------------------------------------------- |
| Rachel Torres   | Austin, TX      | Pre-sorts mail by form type before scanning       |
| Marcus Williams | Kansas City, MO | Scans first, classifies digitally via auto-detect |
| Janet Park      | Ogden, UT       | Adds manual QC spot-check after data entry        |

Two interviews are pre-seeded. Janet Park's interview is conducted live during the demo.

## Two User Experiences

### The Interviewee (Voice Interview)

Token-based link, no login. Consent screen, voice conversation with reflect-and-confirm pattern, personal process diagram validation. ~90 seconds, 5-8 exchanges.

### The Supervisor (Synthesis Viewing)

Email/password sign-in. Mode 1: individual diagram carousel. Mode 2: split-screen comparison with clickable divergence annotations that auto-navigate to the relevant interviewee.

## Tech Stack

| Component      | Technology                          | Version               |
| -------------- | ----------------------------------- | --------------------- |
| Framework      | Next.js (App Router)                | 16.2.2                |
| Frontend       | React, Tailwind CSS, shadcn/ui      | 19.2.4, 4.2.2, v4     |
| Database       | PostgreSQL via Railway              | 17.9                  |
| ORM            | Drizzle                             | 0.45.2                |
| LLM            | Claude via @anthropic-ai/sdk        | 0.85.0                |
| NLP Extraction | compromise                          | 14.15.0               |
| Validation     | Zod                                 | 4.3.6                 |
| Visualization  | Mermaid                             | 11.14.0               |
| STT            | Browser Web Speech API              | —                     |
| Testing        | Vitest, Testing Library, Playwright | 4.1.2, 16.3.2, 1.59.1 |
| Deployment     | Railway                             | —                     |

## Getting Started

### Prerequisites

- Node.js 24.14.1 LTS
- PostgreSQL 17.x (or Railway add-on)
- Anthropic API key

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
SESSION_SECRET=<random-string>
PM_EMAIL_ALLOWLIST=admin@example.com
FIRST_PM_EMAIL=admin@example.com
FIRST_PM_PASSWORD=<password>
```

### Setup

```bash
npm install
npx drizzle-kit push        # Apply schema to database
npx tsx src/lib/db/seed.ts   # Seed demo data (idempotent)
npm run dev                  # Start dev server with Turbopack
```

### Seed Data

The seed script populates:

- Project and process tree (L1 org root + L2 leaf node)
- PM and supervisor accounts
- Two completed interviews (Rachel Torres, Marcus Williams) with validated schemas and diagrams
- One pending interview token (Janet Park) for live demo
- Synthesis result with three divergence annotations
- Federal Document Processing domain skill

## Project Structure

```
chat2chart/
├── skills/                          # Interview skill definitions
│   └── federal-document-processing/
├── e2e/                             # Playwright E2E tests
├── src/
│   ├── app/
│   │   ├── interview/[token]/       # Interview experience
│   │   ├── review/                  # Supervisor review
│   │   ├── auth/login/              # Supervisor sign-in
│   │   └── api/                     # REST + SSE endpoints
│   ├── components/
│   │   ├── interview/               # Conversation thread, mic bar, summary cards
│   │   ├── supervisor/              # Carousel, divergence annotations, comparison
│   │   ├── diagram/                 # Shared pan/zoom Mermaid canvas
│   │   └── ui/                      # shadcn/ui primitives
│   ├── lib/
│   │   ├── ai/                      # LLM provider registry, Claude, prompts
│   │   ├── auth/                    # bcrypt, JWT sessions, middleware
│   │   ├── db/                      # Drizzle schema, queries, seed, migrations
│   │   ├── interview/               # Session, extraction, skill-loader, correction
│   │   ├── synthesis/               # Engine, correlator, divergence, state machine
│   │   ├── stt/                     # STT provider interface + Web Speech API
│   │   └── schema/                  # Zod schemas (Process Schema, API contracts)
│   └── hooks/                       # use-interview, use-speech-to-text, use-mermaid
└── _bmad-output/                    # Planning artifacts (PRD, architecture, epics)
```

## Service Boundaries

These import restrictions are enforced without exception:

| Package             | Allowed Only In                         |
| ------------------- | --------------------------------------- |
| `@anthropic-ai/sdk` | `src/lib/ai/`                           |
| Drizzle             | `src/lib/db/`                           |
| `bcrypt`            | `src/lib/auth/config.ts`                |
| `compromise`        | `src/lib/interview/schema-extractor.ts` |
| Web Speech API      | `src/lib/stt/`                          |

## Architecture

- **Two-dimensional AI:** Skills define _what_ the LLM does; Providers define _which_ LLM. Single provider (Claude) and single skill (Federal Document Processing) for MVP.
- **Interview flow:** Skill-loader → prompt-assembler → provider-registry → Claude → SSE stream
- **Extraction pipeline:** compromise.js NLP → quality gate → LLM fallback (transparent to interviewee)
- **Synthesis engine:** Five-stage pipeline with checkpoints (Match → Classify → Narrate)
- **Interview states:** Pending → Active → Completed → Validating → Captured

## Demo Flow

1. Open Janet Park's pending interview link
2. Conduct live voice interview (~90 seconds)
3. Validate personal process diagram
4. Switch to supervisor view, browse individual diagrams
5. Toggle to comparison mode, click divergence annotations
6. "This would have taken me two weeks."

**Fallback:** If live STT has issues, "Prefer to type?" toggle is available. Janet's interview can also be pre-seeded.

## Planning Artifacts

| Document            | Path                                                         |
| ------------------- | ------------------------------------------------------------ |
| MVP PRD             | `_bmad-output/planning-artifacts/prd.md`                     |
| Architecture        | `_bmad-output/planning-artifacts/architecture.md`            |
| UX Design Spec      | `_bmad-output/planning-artifacts/ux-design-specification.md` |
| Epics & Stories     | `_bmad-output/planning-artifacts/epics.md`                   |
| Project Context     | `_bmad-output/project-context.md`                            |
| Coding Standards    | `_bmad-output/coding-standards.md`                           |
| Approved Tech Stack | `_bmad-output/approved-tech-stack.md`                        |

## License

Private project.
