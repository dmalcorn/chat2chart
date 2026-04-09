# chat2bpmn — Approved Tech Stack

> Pinned versions as of April 8, 2026. All versions reflect the latest stable releases verified via npm/GitHub/official sources.

---

## Runtime & Language

| Technology | Pinned Version | Notes |
|---|---|---|
| Node.js | 24.14.1 LTS | Active LTS through April 2028 |
| TypeScript | 6.0.x | Last JS-based compiler release; TS 7 (Go-native) still in preview |

## Frontend Framework

| Technology | Pinned Version | Notes |
|---|---|---|
| Next.js | 16.2.2 | Turbopack stable, SSE support in API routes |
| React | 19.2.4 | Server Components, compiler-based memoization |
| Tailwind CSS | 4.2.2 | CSS-first config, cascade layers, `@property` support |
| shadcn/ui | CLI v4 | Code-distributed components, not a versioned npm package |
| Radix UI | _(managed by shadcn/ui)_ | Installed per-component via shadcn CLI |

## Database & ORM

| Technology | Pinned Version | Notes |
|---|---|---|
| PostgreSQL | 17.9 | Via Railway add-on; PG 18 available but 17 is the proven LTS line |
| Drizzle ORM | 0.45.2 | Stable release; v1.0 is beta — do not adopt yet |
| drizzle-kit | 0.45.x (stable) | Use stable track, not 1.0.0-beta |

## Authentication

| Technology | Pinned Version | Notes |
|---|---|---|
| bcrypt | 6.0.0 | Password hashing for email/password authentication (PM and supervisor) |

## AI / LLM

| Technology | Pinned Version | Notes |
|---|---|---|
| @anthropic-ai/sdk | 0.85.0 | TypeScript SDK for Claude API |
| Claude Sonnet 4 | _(model, not package)_ | Primary model for interview agent & synthesis reasoning |

## NLP

| Technology | Pinned Version | Notes |
|---|---|---|
| compromise | 14.15.0 | Lightweight NLP library for individual process schema extraction — verb-object decomposition, sentence parsing, tense normalization |

## Validation & Schema

| Technology | Pinned Version | Notes |
|---|---|---|
| Zod | 4.3.6 | Major v4 rewrite — faster, smaller, improved type inference |

## Visualization

| Technology | Pinned Version | Notes |
|---|---|---|
| Mermaid.js | 11.14.0 | Client-side flowchart/diagram rendering |
| bpmn-js | 18.14.0 | BPMN 2.0 diagram rendering and editing |
| bpmn-moddle | 9.0.4 | BPMN data model library |

## Testing

| Technology | Pinned Version | Notes |
|---|---|---|
| Vitest | 4.1.2 | Unit & integration testing |
| @testing-library/react | 16.3.2 | React component testing utilities |
| Playwright | 1.59.1 | End-to-end browser testing |

## Developer Tooling & Pre-Commit Hooks

| Technology | Pinned Version | Notes |
|---|---|---|
| ESLint | 10.2.0 | Flat config format (v10) |
| Prettier | 3.8.1 | Opinionated code formatter |
| Husky | 9.1.7 | Git hook management (pre-commit, pre-push) |
| lint-staged | 16.4.0 | Run lint/format on staged files only |

## Logging (Post-MVP)

| Technology | Pinned Version | Notes |
|---|---|---|
| pino | 10.3.1 | Structured JSON logging for production |

## Speech-to-Text

| Technology | Pinned Version | Notes |
|---|---|---|
| Browser Web Speech API | _(browser-native)_ | Default STT; zero-config, Chrome-optimized |

## Deployment & Infrastructure

| Technology | Version | Notes |
|---|---|---|
| Railway | _(platform)_ | Single Next.js service + PostgreSQL add-on |
| Git / GitHub | _(platform)_ | Version control and open-source distribution |

---

## Version Pinning Policy

- **Lock exact versions** in `package.json` (no `^` or `~` prefixes) for all production dependencies.
- **Update only with intent** — version bumps require testing and a deliberate decision, not automatic upgrades.
- **PostgreSQL version** is determined by Railway's available add-on versions at provisioning time; target 17.x.
- **shadcn/ui components** are code-copied into the project. Pin the CLI version used to install them; components themselves are owned source code once installed.
