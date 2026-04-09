import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf-8'));
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf-8');
}

describe('Project Setup (Story 1.1)', () => {
  describe('AC#1: Next.js scaffolding', () => {
    it('has next.config.ts', () => {
      expect(fileExists('next.config.ts')).toBe(true);
    });

    it('has tsconfig.json with strict mode and path alias', () => {
      const tsconfig = readJson('tsconfig.json');
      expect(tsconfig.compilerOptions.strict).toBe(true);
      expect(tsconfig.compilerOptions.paths['@/*']).toEqual(['./src/*']);
    });

    it('has src/app directory with layout and page', () => {
      expect(fileExists('src/app/layout.tsx')).toBe(true);
      expect(fileExists('src/app/page.tsx')).toBe(true);
    });

    it('has postcss.config.mjs for Tailwind v4', () => {
      expect(fileExists('postcss.config.mjs')).toBe(true);
    });
  });

  describe('AC#2: shadcn/ui with design tokens', () => {
    it('has components.json configured for src/components/ui/', () => {
      const config = readJson('components.json');
      expect(config.aliases.ui).toBe('@/components/ui');
      expect(config.aliases.utils).toBe('@/lib/utils');
    });

    it('has cn() utility in src/lib/utils.ts', () => {
      expect(fileExists('src/lib/utils.ts')).toBe(true);
      const content = readFile('src/lib/utils.ts');
      expect(content).toContain('export function cn');
    });

    it('has UX-DR11 design tokens in globals.css', () => {
      const css = readFile('src/app/globals.css');
      const cssLower = css.toLowerCase();
      expect(cssLower).toContain('--primary: #2563eb');
      expect(cssLower).toContain('--accent: #0d9488');
      expect(cssLower).toContain('--summary-bg: #f5f3ff');
      expect(cssLower).toContain('--summary-border: #c4b5fd');
      expect(cssLower).toContain('--summary-text: #7c3aed');
      expect(cssLower).toContain('--success: #16a34a');
      expect(cssLower).toContain('--warning: #d97706');
      expect(cssLower).toContain('--destructive: #dc2626');
      expect(cssLower).toContain('--primary-soft: #dbeafe');
      expect(cssLower).toContain('--accent-soft: #ccfbf1');
    });

    it('uses Inter font', () => {
      const layout = readFile('src/app/layout.tsx');
      expect(layout).toContain('Inter');
      expect(layout).toContain('--font-inter');
    });
  });

  describe('AC#3: Test tooling', () => {
    it('has vitest.config.ts', () => {
      expect(fileExists('vitest.config.ts')).toBe(true);
    });

    it('has playwright.config.ts', () => {
      expect(fileExists('playwright.config.ts')).toBe(true);
    });

    it('has e2e/ directory', () => {
      expect(fs.statSync(path.join(ROOT, 'e2e')).isDirectory()).toBe(true);
    });

    it('has test scripts in package.json', () => {
      const pkg = readJson('package.json');
      expect(pkg.scripts.test).toBe('vitest run');
      expect(pkg.scripts['test:e2e']).toBe('playwright test');
    });
  });

  describe('AC#4: Dev tooling preserved', () => {
    it('has Husky pre-commit hook', () => {
      expect(fileExists('.husky/pre-commit')).toBe(true);
      const hook = readFile('.husky/pre-commit');
      expect(hook).toContain('lint-staged');
    });

    it('has lint-staged config', () => {
      const pkg = readJson('package.json');
      expect(pkg['lint-staged']['*.{ts,tsx}']).toBeDefined();
      expect(pkg['lint-staged']['*.{js,jsx,json,css,md}']).toBeDefined();
    });

    it('has Prettier config', () => {
      expect(fileExists('.prettierrc')).toBe(true);
      expect(fileExists('.prettierignore')).toBe(true);
    });

    it('has ESLint flat config', () => {
      expect(fileExists('eslint.config.mjs')).toBe(true);
    });
  });

  describe('AC#5: Pinned versions', () => {
    it('has no ^ or ~ prefixes in any dependency', () => {
      const pkg = readJson('package.json');
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [name, version] of Object.entries(allDeps)) {
        expect(version, `${name} version should be pinned`).not.toMatch(/^[\^~]/);
      }
    });

    it('has correct core versions', () => {
      const pkg = readJson('package.json');
      expect(pkg.dependencies.next).toBe('16.2.2');
      expect(pkg.dependencies.react).toBe('19.2.4');
      expect(pkg.devDependencies.tailwindcss).toBe('4.2.2');
      expect(pkg.devDependencies.eslint).toBe('10.2.0');
      expect(pkg.devDependencies.vitest).toBe('4.1.2');
      expect(pkg.devDependencies['@testing-library/react']).toBe('16.3.2');
      expect(pkg.devDependencies['@playwright/test']).toBe('1.59.1');
    });
  });

  describe('AC#6: Directory structure', () => {
    const requiredDirs = [
      'src/lib/auth',
      'src/lib/ai',
      'src/lib/ai/prompts',
      'src/lib/ai/prompts/synthesis',
      'src/lib/stt',
      'src/lib/schema',
      'src/lib/db',
      'src/lib/interview',
      'src/lib/synthesis',
      'src/lib/process',
      'src/components/interview',
      'src/components/supervisor',
      'src/components/diagram',
      'src/components/auth',
      'src/components/shared',
      'src/hooks',
      'src/types',
      'src/app/interview/[token]',
      'src/app/review',
      'src/app/auth/login',
      'src/app/api/auth/login',
      'src/app/api/auth/logout',
      'src/app/api/auth/session',
      'src/app/api/interview/[token]/messages',
      'src/app/api/interview/[token]/schema/correct',
      'src/app/api/synthesis/[nodeId]',
      'e2e',
      'skills/federal-document-processing',
    ];

    it.each(requiredDirs)('has directory: %s', (dir) => {
      const fullPath = path.join(ROOT, dir);
      expect(fs.existsSync(fullPath), `${dir} should exist`).toBe(true);
      expect(fs.statSync(fullPath).isDirectory(), `${dir} should be a directory`).toBe(true);
    });

    it('has placeholder files', () => {
      expect(fileExists('src/lib/env.ts')).toBe(true);
      expect(fileExists('src/types/index.ts')).toBe(true);
      expect(fileExists('src/app/error.tsx')).toBe(true);
      expect(fileExists('src/app/interview/[token]/page.tsx')).toBe(true);
      expect(fileExists('src/app/review/page.tsx')).toBe(true);
      expect(fileExists('src/app/auth/login/page.tsx')).toBe(true);
    });
  });
});
