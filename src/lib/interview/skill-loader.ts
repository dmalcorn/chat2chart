import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

// --- Types ---

export interface SkillPersona {
  identity: string;
  communicationStyle: string;
  principles: string;
}

export interface SkillDefinition {
  name: string;
  description: string;
  persona: SkillPersona;
  probeElements: string;
  synthesisElements: string;
  followUpStrategies: string | null;
  reflectiveSummaryTemplate: string | null;
  rawContent: string;
}

// --- Error Classes ---

export class SkillNotFoundError extends Error {
  readonly code = 'SKILL_NOT_FOUND';
  constructor(skillName: string) {
    super(`Skill not found: ${skillName}`);
    this.name = 'SkillNotFoundError';
  }
}

export class SkillValidationError extends Error {
  readonly code = 'SKILL_VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'SkillValidationError';
  }
}

// --- Frontmatter Parser ---

function parseFrontmatter(content: string): {
  frontmatter: Record<string, string>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = match[1];
  const body = match[2];
  const frontmatter: Record<string, string> = {};

  let currentKey = '';
  let currentValue = '';
  let inMultiline = false;

  for (const line of yamlBlock.split(/\r?\n/)) {
    if (inMultiline) {
      const trimmed = line.trimStart();
      if (trimmed.length > 0 && line.length > line.replace(/^\s+/, '').length) {
        currentValue += (currentValue ? ' ' : '') + trimmed;
        continue;
      } else {
        frontmatter[currentKey] = currentValue;
        inMultiline = false;
      }
    }

    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const rawValue = kvMatch[2].trim();

      if (rawValue === '>-' || rawValue === '>') {
        inMultiline = true;
        currentValue = '';
      } else {
        frontmatter[currentKey] = rawValue.replace(/^['"]|['"]$/g, '');
      }
    }
  }

  if (inMultiline && currentKey) {
    frontmatter[currentKey] = currentValue;
  }

  return { frontmatter, body };
}

// --- Section Parser ---

function parseSections(body: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = body.split(/\r?\n/);
  let currentHeading = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,3})\s+(.+)/);
    if (headingMatch) {
      if (currentHeading) {
        sections.set(currentHeading, currentContent.join('\n').trim());
      }
      currentHeading = headingMatch[2].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading) {
    sections.set(currentHeading, currentContent.join('\n').trim());
  }

  return sections;
}

// --- Cache ---

const skillCache = new Map<string, SkillDefinition>();

// --- Skill Loader ---

export async function loadSkill(skillName: string): Promise<SkillDefinition> {
  const cached = skillCache.get(skillName);
  if (cached) return cached;

  if (skillName.includes('..') || skillName.includes('/') || skillName.includes('\\')) {
    throw new SkillNotFoundError(skillName);
  }

  const skillDir = path.join(process.cwd(), 'skills', skillName);

  try {
    await access(skillDir);
  } catch {
    throw new SkillNotFoundError(skillName);
  }

  const skillFilePath = path.join(skillDir, 'skill.md');

  let rawContent: string;
  try {
    rawContent = await readFile(skillFilePath, 'utf-8');
  } catch {
    throw new SkillNotFoundError(`${skillName} — skill.md not found`);
  }

  const { frontmatter, body } = parseFrontmatter(rawContent);

  if (!frontmatter.name || frontmatter.name.trim() === '') {
    throw new SkillValidationError('Missing required frontmatter field: name');
  }
  if (!frontmatter.description || frontmatter.description.trim() === '') {
    throw new SkillValidationError('Missing required frontmatter field: description');
  }

  const sections = parseSections(body);

  const requiredSections = ['Persona', 'Probe Elements', 'Synthesis Elements'];
  for (const section of requiredSections) {
    if (!sections.has(section)) {
      throw new SkillValidationError(`Missing required section: ${section}`);
    }
  }

  const personaSubsections = ['Identity', 'Communication Style', 'Principles'];
  for (const sub of personaSubsections) {
    if (!sections.has(sub)) {
      throw new SkillValidationError(`Missing required Persona subsection: ${sub}`);
    }
  }

  const definition: SkillDefinition = {
    name: frontmatter.name,
    description: frontmatter.description,
    persona: {
      identity: sections.get('Identity')!,
      communicationStyle: sections.get('Communication Style')!,
      principles: sections.get('Principles')!,
    },
    probeElements: sections.get('Probe Elements')!,
    synthesisElements: sections.get('Synthesis Elements')!,
    followUpStrategies: sections.get('Follow-Up Strategies') ?? null,
    reflectiveSummaryTemplate: sections.get('Reflective Summary Template') ?? null,
    rawContent,
  };

  skillCache.set(skillName, definition);
  return definition;
}
