import { describe, expect, it, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { loadSkill, SkillNotFoundError, SkillValidationError } from './skill-loader';

describe('loadSkill', () => {
  const tempSkillDir = path.join(process.cwd(), 'skills', '__test-temp-skill__');

  afterAll(async () => {
    await rm(tempSkillDir, { recursive: true, force: true });
  });

  it('loads general-process-discovery skill with all required fields', async () => {
    const skill = await loadSkill('general-process-discovery');

    expect(skill.name).toBe('general-process-discovery');
    expect(skill.description).toBeTruthy();
    expect(skill.persona.identity).toBeTruthy();
    expect(skill.persona.communicationStyle).toBeTruthy();
    expect(skill.persona.principles).toBeTruthy();
    expect(skill.probeElements).toBeTruthy();
    expect(skill.synthesisElements).toBeTruthy();
    expect(skill.followUpStrategies).toBeTruthy();
    expect(skill.reflectiveSummaryTemplate).toBeTruthy();
    expect(skill.rawContent).toContain('general-process-discovery');
  });

  it('loads federal-document-processing skill with all required fields', async () => {
    const skill = await loadSkill('federal-document-processing');

    expect(skill.name).toBe('federal-document-processing');
    expect(skill.description).toContain('IRS');
    expect(skill.persona.identity).toContain('DPT');
    expect(skill.persona.communicationStyle).toBeTruthy();
    expect(skill.persona.principles).toBeTruthy();
    expect(skill.probeElements).toContain('scanning');
    expect(skill.synthesisElements).toContain('formType');
    expect(skill.followUpStrategies).toBeTruthy();
    expect(skill.reflectiveSummaryTemplate).toBeTruthy();
  });

  it('throws SkillNotFoundError for nonexistent skill', async () => {
    await expect(loadSkill('nonexistent-skill')).rejects.toThrow(SkillNotFoundError);
    await expect(loadSkill('nonexistent-skill')).rejects.toThrow('not found');
  });

  it('throws SkillNotFoundError when directory exists but skill.md is missing', async () => {
    await mkdir(path.join(tempSkillDir, 'empty-dir'), { recursive: true });
    const emptyDir = path.join(process.cwd(), 'skills', '__test-empty-skill__');
    await mkdir(emptyDir, { recursive: true });

    try {
      await expect(loadSkill('__test-empty-skill__')).rejects.toThrow(SkillNotFoundError);
      await expect(loadSkill('__test-empty-skill__')).rejects.toThrow('skill.md not found');
    } finally {
      await rm(emptyDir, { recursive: true, force: true });
    }
  });

  it('throws SkillValidationError when Persona section is missing', async () => {
    await mkdir(tempSkillDir, { recursive: true });
    await writeFile(
      path.join(tempSkillDir, 'skill.md'),
      `---
name: test-skill
description: A test skill
---

## Probe Elements
Some probes

## Synthesis Elements
Some elements
`,
    );

    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow(SkillValidationError);
    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow('Persona');
  });

  it('throws SkillValidationError when frontmatter name is missing', async () => {
    await mkdir(tempSkillDir, { recursive: true });
    await writeFile(
      path.join(tempSkillDir, 'skill.md'),
      `---
description: A test skill
---

## Persona

### Identity
Test identity

### Communication Style
Test style

### Principles
Test principles

## Probe Elements
Some probes

## Synthesis Elements
Some elements
`,
    );

    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow(SkillValidationError);
    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow('name');
  });

  it('throws SkillValidationError when Probe Elements section is missing', async () => {
    await mkdir(tempSkillDir, { recursive: true });
    await writeFile(
      path.join(tempSkillDir, 'skill.md'),
      `---
name: test-skill
description: A test skill
---

## Persona

### Identity
Test identity

### Communication Style
Test style

### Principles
Test principles

## Synthesis Elements
Some elements
`,
    );

    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow(SkillValidationError);
    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow('Probe Elements');
  });

  it('throws SkillValidationError when Identity subsection is missing from Persona', async () => {
    await mkdir(tempSkillDir, { recursive: true });
    await writeFile(
      path.join(tempSkillDir, 'skill.md'),
      `---
name: test-skill
description: A test skill
---

## Persona

### Communication Style
Test style

### Principles
Test principles

## Probe Elements
Some probes

## Synthesis Elements
Some elements
`,
    );

    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow(SkillValidationError);
    await expect(loadSkill('__test-temp-skill__')).rejects.toThrow('Identity');
  });

  it('handles optional sections as null when absent', async () => {
    await mkdir(tempSkillDir, { recursive: true });
    await writeFile(
      path.join(tempSkillDir, 'skill.md'),
      `---
name: test-skill
description: A minimal test skill
---

## Persona

### Identity
Test identity

### Communication Style
Test style

### Principles
Test principles

## Probe Elements
Some probes

## Synthesis Elements
Some elements
`,
    );

    const skill = await loadSkill('__test-temp-skill__');
    expect(skill.followUpStrategies).toBeNull();
    expect(skill.reflectiveSummaryTemplate).toBeNull();
  });
});
