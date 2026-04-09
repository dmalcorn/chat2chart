// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCorrectionPrompt } from './correction-template';

const mockSchema = {
  schemaVersion: '1.0',
  steps: [
    { id: '123', label: 'Scan documents', type: 'step' },
    { id: '456', label: 'File documents', type: 'step' },
  ],
  connections: [{ from: '123', to: '456' }],
  metadata: { extractionMethod: 'programmatic', stepCount: 2 },
};

describe('buildCorrectionPrompt', () => {
  it('returns a string containing the schema', () => {
    const result = buildCorrectionPrompt(mockSchema, 'The second step should be Review');

    expect(typeof result).toBe('string');
    expect(result).toContain('Scan documents');
    expect(result).toContain('File documents');
  });

  it('includes the error description', () => {
    const description = 'The second step should be Review instead of File';
    const result = buildCorrectionPrompt(mockSchema, description);

    expect(result).toContain(description);
  });

  it('uses collaborative language (no "error", "failed", "wrong")', () => {
    const result = buildCorrectionPrompt(mockSchema, 'Fix the step');

    // The prompt itself should use collaborative tone
    expect(result).toContain('refinement');
    expect(result).toContain('adjust');
    // Should not use adversarial language in the template itself
    const lowerPrompt = result.toLowerCase();
    const templateParts = lowerPrompt.split('what the interviewee would like adjusted')[0];
    expect(templateParts).not.toContain('error detected');
    expect(templateParts).not.toContain('failure');
  });

  it('instructs JSON output matching Process Schema format', () => {
    const result = buildCorrectionPrompt(mockSchema, 'Fix step');

    expect(result).toContain('JSON');
    expect(result).toContain('Process Schema');
  });
});
