import { describe, expect, it } from 'vitest';
import { assembleInterviewPrompt } from './prompt-assembler';
import type { SkillDefinition } from '@/lib/interview/skill-loader';

function createMockSkill(overrides?: Partial<SkillDefinition>): SkillDefinition {
  return {
    name: 'test-skill',
    description: 'A test domain skill',
    persona: {
      identity: 'A test identity for the interview agent',
      communicationStyle: 'Friendly and professional',
      principles: 'One question at a time, reflect and confirm',
    },
    probeElements: '- Decision points\n- Exceptions\n- Handoffs',
    synthesisElements: '- action (string)\n- object (string)\n- purpose (string)',
    followUpStrategies: null,
    reflectiveSummaryTemplate: null,
    rawContent: 'raw content here',
    ...overrides,
  };
}

describe('assembleInterviewPrompt', () => {
  it('returns a string containing all four blocks', () => {
    const skill = createMockSkill();
    const prompt = assembleInterviewPrompt(skill);

    // Block 1: Base template content
    expect(prompt).toContain('Reflect-and-Confirm');
    expect(prompt).toContain('5-8');

    // Block 2: Skill persona
    expect(prompt).toContain('A test identity for the interview agent');
    expect(prompt).toContain('Friendly and professional');
    expect(prompt).toContain('One question at a time, reflect and confirm');

    // Block 3: Probe elements
    expect(prompt).toContain('Decision points');
    expect(prompt).toContain('Exceptions');
    expect(prompt).toContain('Handoffs');

    // Block 4: Synthesis elements
    expect(prompt).toContain('action (string)');
    expect(prompt).toContain('object (string)');
  });

  it('includes the skill persona identity text', () => {
    const skill = createMockSkill({
      persona: {
        identity: 'Unique persona identity XYZ123',
        communicationStyle: 'Direct and clear',
        principles: 'Be thorough',
      },
    });
    const prompt = assembleInterviewPrompt(skill);
    expect(prompt).toContain('Unique persona identity XYZ123');
  });

  it('includes the skill probe elements', () => {
    const skill = createMockSkill({
      probeElements: '- Custom probe alpha\n- Custom probe beta',
    });
    const prompt = assembleInterviewPrompt(skill);
    expect(prompt).toContain('Custom probe alpha');
    expect(prompt).toContain('Custom probe beta');
  });

  it('includes base template reflect-and-confirm instructions', () => {
    const skill = createMockSkill();
    const prompt = assembleInterviewPrompt(skill);
    expect(prompt.toLowerCase()).toContain('reflect');
    expect(prompt.toLowerCase()).toContain('confirm');
  });

  it('includes follow-up strategies when present', () => {
    const skill = createMockSkill({
      followUpStrategies: 'Ask about edge cases after every 3 steps',
    });
    const prompt = assembleInterviewPrompt(skill);
    expect(prompt).toContain('Follow-Up Strategies');
    expect(prompt).toContain('Ask about edge cases after every 3 steps');
  });

  it('omits follow-up strategies when null', () => {
    const skill = createMockSkill({ followUpStrategies: null });
    const prompt = assembleInterviewPrompt(skill);
    expect(prompt).not.toContain('Follow-Up Strategies');
  });

  it('includes reflective summary template when present', () => {
    const skill = createMockSkill({
      reflectiveSummaryTemplate: 'Custom summary: What, Why, How, Then',
    });
    const prompt = assembleInterviewPrompt(skill);
    expect(prompt).toContain('Reflective Summary Template (Domain Override)');
    expect(prompt).toContain('Custom summary: What, Why, How, Then');
  });

  it('omits reflective summary template when null', () => {
    const skill = createMockSkill({ reflectiveSummaryTemplate: null });
    const prompt = assembleInterviewPrompt(skill);
    expect(prompt).not.toContain('Domain Override');
  });

  it('maintains correct block order: base template before persona before probes before synthesis', () => {
    const skill = createMockSkill({
      persona: {
        identity: 'MARKER_PERSONA',
        communicationStyle: 'test',
        principles: 'test',
      },
      probeElements: 'MARKER_PROBES',
      synthesisElements: 'MARKER_SYNTHESIS',
    });
    const prompt = assembleInterviewPrompt(skill);

    const baseIdx = prompt.indexOf('Interview Agent');
    const personaIdx = prompt.indexOf('MARKER_PERSONA');
    const probeIdx = prompt.indexOf('MARKER_PROBES');
    const synthIdx = prompt.indexOf('MARKER_SYNTHESIS');

    expect(baseIdx).toBeLessThan(personaIdx);
    expect(personaIdx).toBeLessThan(probeIdx);
    expect(probeIdx).toBeLessThan(synthIdx);
  });
});
