# Story 1.1: Initialize Next.js Project with Approved Tech Stack

Status: done

## Story

As a developer,
I want the project scaffolded with all approved dependencies and configuration,
So that I can begin building features on a consistent foundation.

## Acceptance Criteria

1. **Given** no existing Next.js project, **When** the init script runs, **Then** a Next.js 16.2.2 app is created with TypeScript, Tailwind 4.2.2, ESLint, App Router, src directory, Turbopack, and `@/*` import alias
2. **Given** the Next.js app exists, **When** shadcn/ui v4 is initialized, **Then** the project's CSS custom property token system is configured with the design tokens from UX-DR11
3. **Given** the app is scaffolded, **When** test tooling is added, **Then** Vitest 4.1.2, @testing-library/react 16.3.2, and Playwright 1.59.1 are installed and configured
4. **Given** dev tooling exists (Husky, lint-staged, Prettier already in repo), **When** the project is initialized, **Then** pre-commit hooks are preserved and ESLint flat config is integrated
5. **Given** all dependencies are installed, **When** checking `package.json`, **Then** all versions are pinned exactly (no `^` or `~`)
6. **Given** the project is scaffolded, **When** checking the directory structure, **Then** it matches the Architecture document structure under `src/` (`src/lib/`, `src/components/`, `src/hooks/`, `src/types/`, `e2e/`)
7. **Given** the project is set up, **When** running `npm run dev`, **Then** it starts successfully with Turbopack

## Tasks / Subtasks

- [x] Task 1: Run `create-next-app@16` to scaffold the Next.js project (AC: #1)
  - [x] 1.1 Run `npx create-next-app@16 . --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --turbopack` (running in existing directory — must handle existing files like CLAUDE.md, README.md, package.json, Dockerfile, etc.)
  - [x] 1.2 Merge the generated `package.json` with the existing one (preserve existing scripts, devDependencies for Husky/lint-staged/Prettier, and metadata)
  - [x] 1.3 Verify `next.config.ts` is created with Turbopack config
  - [x] 1.4 Verify `tsconfig.json` has strict mode enabled and `@/*` path alias
  - [x] 1.5 Verify `tailwind.config.ts` exists (create-next-app should generate it; if Tailwind v4 CSS-first mode omits it, create a minimal one for plugin support)

- [x] Task 2: Pin all dependency versions (AC: #5)
  - [x] 2.1 Replace any `^` or `~` prefixes in `package.json` with exact versions
  - [x] 2.2 Ensure these exact versions: Next.js 16.2.2, React 19.2.4, Tailwind CSS 4.2.2, TypeScript 6.0.x, ESLint 10.2.0
  - [x] 2.3 Run `npm install` to regenerate `package-lock.json` with pinned versions

- [x] Task 3: Initialize shadcn/ui with design token system (AC: #2)
  - [x] 3.1 Run `npx shadcn@latest init` to set up shadcn/ui v4
  - [x] 3.2 Configure `components.json` for `src/components/ui/` path, `@/*` import alias, and Tailwind CSS
  - [x] 3.3 Implement CSS custom property design tokens in `src/app/globals.css` per UX-DR11:
    - Primary blue: `#2563EB`
    - Accent teal: `#0D9488`
    - Summary violet: `#F5F3FF` (background), `#C4B5FD` (border), `#7C3AED` (text)
    - Success green: `#16A34A`
    - Warning amber: `#D97706`
    - Destructive red: `#DC2626`
    - Spacing scale: 4px base
    - Border radius tokens: 6px to 9999px
    - Shadow system: sm/md/lg
    - Inter font with type scale (12px-36px)

- [x] Task 4: Install and configure test tooling (AC: #3)
  - [x] 4.1 Install Vitest 4.1.2 and @testing-library/react 16.3.2 as devDependencies (exact versions)
  - [x] 4.2 Create `vitest.config.ts` with path aliases matching tsconfig, React testing environment
  - [x] 4.3 Install Playwright 1.59.1 as devDependency (exact version)
  - [x] 4.4 Create `playwright.config.ts` targeting Chrome (latest 2 versions per MVP-NFR4)
  - [x] 4.5 Create `e2e/` directory at project root
  - [x] 4.6 Add test scripts to `package.json`: `"test"`, `"test:e2e"`

- [x] Task 5: Integrate ESLint flat config and preserve existing tooling (AC: #4)
  - [x] 5.1 Ensure ESLint 10.2.0 flat config works with Next.js generated config
  - [x] 5.2 Verify Husky 9.1.7 pre-commit hook (`npx lint-staged`) is preserved
  - [x] 5.3 Verify lint-staged 16.4.0 config in `package.json` covers `*.{ts,tsx}` and `*.{js,jsx,json,css,md}`
  - [x] 5.4 Verify Prettier 3.8.1 and `.prettierrc`/`.prettierignore` are preserved

- [x] Task 6: Create directory structure per Architecture document (AC: #6)
  - [x] 6.1 Create `src/lib/auth/` (future: config.ts, session.ts, middleware.ts, index.ts)
  - [x] 6.2 Create `src/lib/ai/` (future: provider.ts, provider-registry.ts, claude-provider.ts)
  - [x] 6.3 Create `src/lib/ai/prompts/` (future: base-template.ts, prompt-assembler.ts)
  - [x] 6.4 Create `src/lib/ai/prompts/synthesis/` (future: match/classify/narrate templates)
  - [x] 6.5 Create `src/lib/stt/` (future: provider.ts, web-speech-provider.ts)
  - [x] 6.6 Create `src/lib/schema/` (future: workflow.ts, api-requests.ts, api-responses.ts)
  - [x] 6.7 Create `src/lib/db/` (future: schema.ts, queries.ts, connection.ts, seed.ts)
  - [x] 6.8 Create `src/lib/interview/` (future: session.ts, capture.ts, schema-extractor.ts, etc.)
  - [x] 6.9 Create `src/lib/synthesis/` (future: engine.ts, correlator.ts, divergence.ts, etc.)
  - [x] 6.10 Create `src/lib/env.ts` as placeholder
  - [x] 6.11 Create `src/lib/utils.ts` (cn helper for shadcn/ui class merging)
  - [x] 6.12 Create `src/components/interview/` directory
  - [x] 6.13 Create `src/components/supervisor/` directory
  - [x] 6.14 Create `src/components/diagram/` directory
  - [x] 6.15 Create `src/components/auth/` directory
  - [x] 6.16 Create `src/components/shared/` directory
  - [x] 6.17 Create `src/hooks/` directory
  - [x] 6.18 Create `src/types/index.ts` as placeholder
  - [x] 6.19 Create `src/app/interview/[token]/` directory with placeholder page.tsx
  - [x] 6.20 Create `src/app/review/` directory with placeholder page.tsx
  - [x] 6.21 Create `src/app/auth/login/` directory with placeholder page.tsx
  - [x] 6.22 Create `src/app/api/` route directory structure (auth, interview, synthesis)
  - [x] 6.23 Create `src/app/error.tsx` as root error boundary placeholder
  - [x] 6.24 Create full API route directory tree with `.gitkeep` files:
    - `src/app/api/auth/login/`
    - `src/app/api/auth/logout/`
    - `src/app/api/auth/session/`
    - `src/app/api/interview/[token]/messages/`
    - `src/app/api/interview/[token]/schema/correct/`
    - `src/app/api/synthesis/[nodeId]/`
  - [x] 6.25 Verify `skills/` directory exists at project root (already present — contains `general-process-discovery/`). Create `skills/federal-document-processing/` directory with `.gitkeep` for the demo skill location
  - [x] 6.26 Place `.gitkeep` in all empty directories to ensure they survive git commits

- [x] Task 7: Verify the application starts (AC: #7)
  - [x] 7.1 Run `npm run dev` and verify Turbopack starts without errors
  - [x] 7.2 Verify the landing page loads at `http://localhost:3000`
  - [x] 7.3 Run `npm run lint` and verify no errors
  - [x] 7.4 Run `npm run format:check` and verify formatting is clean

## Dev Notes

### Critical: Existing Files to Preserve

The repository already has these files that must NOT be overwritten or deleted by `create-next-app`:
- `CLAUDE.md` — project instructions (root level)
- `README.md` — will be overwritten by create-next-app, restore or merge after
- `package.json` — merge with generated one (keep existing scripts, devDependencies, metadata)
- `Dockerfile` — Docker setup for development
- `docker-compose.yml` — PostgreSQL 17 + app service
- `.husky/pre-commit` — lint-staged hook
- `.prettierrc`, `.prettierignore` — Prettier config
- `.dockerignore` — Docker ignore rules
- `.env.example` — environment variable template
- `.gitignore` — existing ignore rules
- `_bmad/`, `_bmad-output/`, `.claude/`, `docs/`, `skills/` — project artifacts

**Strategy:** Back up existing files before running `create-next-app`, then restore/merge after scaffold completes. Alternatively, run `create-next-app` in a temp directory and copy generated files over.

### Initialization Command

```bash
npx create-next-app@16 chat2chart --typescript --tailwind --eslint --app --src-dir --import-alias="@/*" --turbopack
```

Since the project directory already exists with files, the developer should either:
1. Run in a temp directory and copy the scaffolded files (src/, next.config.ts, tsconfig.json, etc.) into the existing project
2. Or run in-place and carefully merge conflicts

### shadcn/ui Init Command

```bash
npx shadcn@latest init
```

This creates `components.json` and sets up the UI component infrastructure. The `src/lib/utils.ts` file with the `cn()` helper (clsx + tailwind-merge) is auto-generated by this command.

### Version Pinning — Exact Versions Required

From `_bmad-output/approved-tech-stack.md`, all dependencies must be pinned without `^` or `~`:

| Package | Exact Version |
|---|---|
| next | 16.2.2 |
| react | 19.2.4 |
| react-dom | 19.2.4 |
| tailwindcss | 4.2.2 |
| typescript | 6.0.x (latest 6.0 patch) |
| eslint | 10.2.0 |
| prettier | 3.8.1 |
| husky | 9.1.7 |
| lint-staged | 16.4.0 |
| vitest | 4.1.2 |
| @testing-library/react | 16.3.2 |
| playwright | 1.59.1 |

### CSS Design Tokens (UX-DR11)

The `globals.css` must define CSS custom properties for the full design system. Key values:

```css
:root {
  /* Primary */
  --primary: #2563EB;
  --primary-soft: #DBEAFE; /* blue-100 — gradient backgrounds, consent screen */

  /* Accent (teal — used for divergence annotations) */
  --accent: #0D9488;
  --accent-soft: #CCFBF1; /* teal-100 — divergence badge backgrounds */

  /* Summary (violet — reflective summary cards) */
  --summary-bg: #F5F3FF;
  --summary-border: #C4B5FD;
  --summary-text: #7C3AED;

  /* Status */
  --success: #16A34A;
  --warning: #D97706;
  --destructive: #DC2626;

  /* Spacing scale: 4px base */
  /* Border radius: 6px, 8px, 12px, 9999px */
  /* Shadows: sm, md, lg */
  /* Font: Inter, type scale 12px-36px */
}
```

These must integrate with shadcn/ui's theming system (which uses CSS custom properties by default).

**Tailwind v4 CSS-first config note:** Tailwind 4.x uses CSS-first configuration — design tokens are defined via `@theme` directives in CSS, NOT via `tailwind.config.js`. The config file may still exist for plugins but the primary token definition happens in `globals.css` with `@import "tailwindcss"` and `@theme { }` blocks. This is a significant change from Tailwind v3.

### Directory Structure Rationale

Empty directories are created now so that subsequent stories have correct file locations established from day one. This prevents developers from guessing where files go. Place `.gitkeep` files in empty directories.

The full directory tree from the Architecture document is the authoritative reference — see `_bmad-output/planning-artifacts/architecture.md`, "Complete Project Directory Structure" section (line 484).

### Docker Setup (Already Done)

The Dockerfile and docker-compose.yml are already configured:
- `Dockerfile`: Node 24-slim, `npm install`, expose 3000, `npm run dev`
- `docker-compose.yml`: app service (port 3000) + PostgreSQL 17 (port 5432), health check, volume mounts
- Database credentials: `chat2chart` / `chat2chart_dev` / `chat2chart`
- The app service overrides `DATABASE_URL` to use the `db` hostname

After `create-next-app`, verify the Dockerfile still works with the Next.js dev server.

### ESLint Flat Config (v10)

ESLint 10.2.0 uses flat config format (`eslint.config.mjs` or `eslint.config.js`). Next.js 16's `create-next-app` generates a compatible flat config. Ensure it doesn't conflict with the existing ESLint 10.2.0 devDependency.

### What NOT to Do

- Do NOT install dependencies excluded from the MVP: `bpmn-js`, `bpmn-moddle`, `pino`, `@openai/sdk`
- Do NOT create application logic files — only empty directories and placeholder pages
- Do NOT configure the database connection (that's Story 1.2)
- Do NOT set up environment validation (that's Story 1.3)
- Do NOT install `@anthropic-ai/sdk`, `bcrypt`, `compromise`, `zod`, `mermaid`, or `drizzle` (those are Stories 1.2-1.4 and later)
- Do NOT use `^` or `~` version prefixes under any circumstances
- Do NOT remove existing Docker, Husky, or Prettier configurations

### Project Structure Notes

- The existing `package.json` has `"type": "commonjs"` — Next.js 16 may require ESM. Check if this needs to change to `"module"` or be removed entirely (Next.js handles module resolution).
- The existing `skills/` directory contains `general-process-discovery/` which may be from parent project planning — keep it. Create the `skills/federal-document-processing/` directory now (with `.gitkeep`) per the Architecture document; the actual `skill.md` content will be authored in Epic 3.
- The `src/app/page.tsx` landing page should redirect to `/interview` or `/review` based on context, but for this story a simple placeholder is sufficient.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - "Starter Template Evaluation" and "Complete Project Directory Structure"]
- [Source: _bmad-output/approved-tech-stack.md - All pinned versions]
- [Source: _bmad-output/planning-artifacts/epics.md - Story 1.1 acceptance criteria]
- [Source: _bmad-output/project-context.md - Technology Stack & Versions, Critical Implementation Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - UX-DR11 design tokens]
- [Source: _bmad-output/coding-standards.md - Provider abstractions, naming conventions]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- ESLint 10.2.0 incompatibility with `eslint-plugin-react` bundled in `eslint-config-next@16.2.2` — `getFilename()` API removed in ESLint 10. Resolved by using `typescript-eslint@8.58.1` + `@next/eslint-plugin-next@16.2.2` directly instead of `eslint-config-next` plugin-react rules.
- Tailwind v4 uses CSS-first config (`@theme` directives in CSS, `@tailwindcss/postcss` plugin) — no `tailwind.config.ts` generated. This is correct for v4.
- Prettier auto-lowercased hex colors in globals.css — updated tests to use case-insensitive comparison.

### Completion Notes List

- Scaffolded Next.js 16.2.2 via temp directory to preserve existing repo files (CLAUDE.md, Dockerfile, docker-compose.yml, .husky, .prettierrc, etc.)
- Merged package.json preserving existing scripts, devDependencies, and metadata. Removed `"type": "commonjs"` and `"main": "index.js"` as Next.js handles module resolution.
- Initialized shadcn/ui v4 (base-nova style) with full UX-DR11 design token system in globals.css: primary blue, accent teal, summary violet, status colors, spacing scale, border radius, shadows, Inter font
- Configured Vitest 4.1.2 with jsdom, @testing-library/react 16.3.2, @testing-library/jest-dom 6.6.3, vitest.setup.ts
- Configured Playwright 1.59.1 targeting Chromium with webServer integration
- ESLint 10.2.0 flat config with typescript-eslint and @next/eslint-plugin-next
- Created full directory structure per Architecture doc with .gitkeep files
- Created placeholder pages for interview/[token], review, auth/login, error boundary
- All 47 verification tests passing, ESLint clean, Prettier clean
- Dev server starts successfully with Turbopack

### Change Log

- 2026-04-08: Story 1.1 implemented — project scaffolding complete

### File List

- package.json (modified — merged with scaffold, all deps pinned)
- package-lock.json (regenerated)
- next.config.ts (new)
- tsconfig.json (new)
- eslint.config.mjs (new)
- postcss.config.mjs (new)
- next-env.d.ts (new)
- components.json (new — shadcn/ui config)
- vitest.config.ts (new)
- vitest.setup.ts (new)
- playwright.config.ts (new)
- .gitignore (modified — added next-env.d.ts)
- .prettierignore (modified — added .agents, .claude, docs, skills)
- src/app/globals.css (new — UX-DR11 design tokens + shadcn/ui theme)
- src/app/layout.tsx (new — Inter font, metadata)
- src/app/page.tsx (new — placeholder)
- src/app/error.tsx (new — error boundary)
- src/app/interview/[token]/page.tsx (new — placeholder)
- src/app/review/page.tsx (new — placeholder)
- src/app/auth/login/page.tsx (new — placeholder)
- src/components/ui/button.tsx (new — shadcn/ui)
- src/lib/utils.ts (new — cn() helper)
- src/lib/env.ts (new — placeholder)
- src/types/index.ts (new — placeholder)
- src/lib/project-setup.test.ts (new — 47 verification tests)
- public/file.svg, globe.svg, next.svg, vercel.svg, window.svg (new — scaffold assets)
- e2e/.gitkeep (new)
- src/lib/auth/.gitkeep, src/lib/ai/.gitkeep, src/lib/ai/prompts/.gitkeep, src/lib/ai/prompts/synthesis/.gitkeep (new)
- src/lib/stt/.gitkeep, src/lib/schema/.gitkeep, src/lib/db/.gitkeep (new)
- src/lib/interview/.gitkeep, src/lib/synthesis/.gitkeep, src/lib/process/.gitkeep (new)
- src/components/interview/.gitkeep, src/components/supervisor/.gitkeep (new)
- src/components/diagram/.gitkeep, src/components/auth/.gitkeep, src/components/shared/.gitkeep (new)
- src/hooks/.gitkeep (new)
- src/app/api/auth/login/.gitkeep, src/app/api/auth/logout/.gitkeep, src/app/api/auth/session/.gitkeep (new)
- src/app/api/interview/[token]/messages/.gitkeep, src/app/api/interview/[token]/schema/correct/.gitkeep (new)
- src/app/api/synthesis/[nodeId]/.gitkeep (new)
- skills/federal-document-processing/.gitkeep (new)

### Review Findings

#### Decision Needed

- [x] [Review][Decision] **Explicit `vite` pinning** — Resolved: pinned `vite@7.3.2` in devDependencies [package.json]
- [x] [Review][Decision] **`button.tsx` hover selector never fires** — Resolved: patched `[a]:hover:bg-primary/80` to `hover:bg-primary/80` [src/components/ui/button.tsx:11]

#### Patches

- [x] [Review][Patch] Move `shadcn` from `dependencies` to `devDependencies` — fixed [package.json]
- [x] [Review][Patch] `error.tsx` unused `error` prop — fixed: now logs error via `console.error` [src/app/error.tsx]
- [x] [Review][Patch] Remove unused `eslint-plugin-react` and `eslint-config-next` from devDependencies — removed [package.json]
- [x] [Review][Patch] Add `@testing-library/dom` as explicit devDependency — added `10.4.1` [package.json]
- [x] [Review][Patch] `error.tsx` uses raw `<button>` instead of `<Button>` component — fixed: now uses `<Button>` [src/app/error.tsx]
- [x] [Review][Patch] Add `e2e/` and `playwright.config.ts` to tsconfig.json `exclude` — added [tsconfig.json]

#### Deferred

- [x] [Review][Defer] Dark mode CSS defined but unreachable — `.dark` class never applied to `<html>`, no ThemeProvider or `prefers-color-scheme` detection. Not in MVP scope. [src/app/globals.css, src/app/layout.tsx]
- [x] [Review][Defer] No `not-found.tsx` — 404s fall through to unstyled Next.js default. Not in Story 1.1 scope. [src/app/]
- [x] [Review][Defer] `error.tsx` has no error reporting — error boundary silently discards errors with no logging hook. Future observability concern. [src/app/error.tsx]
- [x] [Review][Defer] Vitest path aliases manually mirrored from tsconfig — works now but will diverge when new paths are added. Consider `vite-tsconfig-paths` plugin in a future story. [vitest.config.ts]
