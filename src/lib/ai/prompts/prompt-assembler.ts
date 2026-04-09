import { getBaseTemplate } from './base-template';
import type { SkillDefinition } from '@/lib/interview/skill-loader';

export function assembleInterviewPrompt(skill: SkillDefinition): string {
  const blocks: string[] = [];

  // Block 1: Base template (core behavioral rules)
  blocks.push(getBaseTemplate());

  // Block 2: Skill persona
  let personaBlock = `---

# Domain Skill Persona

## Identity
${skill.persona.identity}

## Communication Style
${skill.persona.communicationStyle}

## Principles
${skill.persona.principles}`;

  if (skill.reflectiveSummaryTemplate) {
    personaBlock += `

## Reflective Summary Template (Domain Override)
${skill.reflectiveSummaryTemplate}`;
  }

  blocks.push(personaBlock);

  // Block 3: Skill workflow (Probe Elements + Follow-Up Strategies)
  let workflowBlock = `---

# Interview Workflow

## Probe Elements
${skill.probeElements}`;

  if (skill.followUpStrategies) {
    workflowBlock += `

## Follow-Up Strategies
${skill.followUpStrategies}`;
  }

  blocks.push(workflowBlock);

  // Block 4: Synthesis context
  blocks.push(`---

# Synthesis Context

The following fields will be extracted from confirmed interview segments. Keep these in mind as you conduct the interview — your reflective summaries should surface information that maps to these fields.

## Synthesis Elements
${skill.synthesisElements}`);

  return blocks.join('\n');
}
