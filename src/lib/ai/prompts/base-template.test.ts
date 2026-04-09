import { describe, expect, it } from 'vitest';
import { getBaseTemplate } from './base-template';

describe('getBaseTemplate', () => {
  const template = getBaseTemplate();

  it('returns a non-empty string', () => {
    expect(template).toBeTruthy();
    expect(typeof template).toBe('string');
    expect(template.length).toBeGreaterThan(0);
  });

  it('contains reflect-and-confirm behavioral instructions', () => {
    const lower = template.toLowerCase();
    expect(lower).toContain('reflect');
    expect(lower).toContain('confirm');
  });

  it('contains exchange limit guidance', () => {
    expect(template).toContain('5-8');
  });

  it('contains one-question-at-a-time rule', () => {
    const lower = template.toLowerCase();
    expect(lower).toContain('one question at a time');
  });

  it('mentions question exchange type', () => {
    expect(template).toContain('question');
  });

  it('mentions reflective_summary exchange type', () => {
    expect(template).toContain('reflective_summary');
  });

  it('contains psychological safety guidance', () => {
    const lower = template.toLowerCase();
    expect(lower).toContain('no wrong answers');
  });

  it('contains reflective summary structure', () => {
    expect(template).toContain('What happens');
    expect(template).toContain('Why');
    expect(template).toContain('How');
    expect(template).toContain('Then');
  });
});
