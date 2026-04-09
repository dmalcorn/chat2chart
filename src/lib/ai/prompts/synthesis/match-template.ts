import type { IndividualProcessSchema } from '@/lib/schema/workflow';

export type NormalizedSchema = {
  interviewId: string;
  intervieweeName: string;
  steps: Array<{
    stepId: string;
    label: string;
    type: string;
  }>;
};

export function buildMatchPrompt(schemas: NormalizedSchema[]): string {
  const interviewSections = schemas
    .map(
      (schema) =>
        `## Interview: ${schema.intervieweeName} (ID: ${schema.interviewId})\n\n` +
        schema.steps
          .map((step, i) => `${i + 1}. [${step.stepId}] ${step.label} (type: ${step.type})`)
          .join('\n'),
    )
    .join('\n\n');

  return `# Step Matching Task

You are a workflow analysis expert. Your task is to compare process steps across multiple interviews and identify how they relate to each other.

## Match Type Definitions

For each pair or group of steps, classify the relationship using exactly one of these 5 match types:

1. **exact_match** — Identical steps across interviews. Same action performed on the same object. Example: "Scan document" appears in both interviews.
2. **semantic_match** — Same intent, different wording. Conceptually equivalent steps described differently. Example: "Sort mail" vs. "Organize incoming correspondence".
3. **subsumption** — One step encompasses another at different granularity levels. A higher-level step in one interview covers multiple lower-level steps in another. Example: "Process document" subsumes "Scan document" + "Classify document".
4. **split_merge** — One step in one interview maps to multiple steps in another (or vice versa). The steps are not hierarchical but represent the same work divided differently. Example: "Scan and classify" maps to "Scan" + "Classify".
5. **unmatched** — A step that is unique to one interview with no counterpart in any other interview. Example: "Quality check" appears only in one interview.

## Instructions

- Compare ALL steps across ALL interviews below
- Every step must appear in at least one match result
- For each match, provide:
  - The match type (one of the 5 types above)
  - A confidence score from 0.0 to 1.0
  - A brief rationale explaining why this classification was chosen
  - The source steps with their interview IDs, interviewee names, step IDs, and labels

## Interview Steps

${interviewSections}

## Output Format

Return a JSON array of match results. Each match result must have this exact structure:

\`\`\`json
{
  "matchType": "exact_match | semantic_match | subsumption | split_merge | unmatched",
  "confidence": 0.0-1.0,
  "rationale": "Brief explanation of why this match type was chosen",
  "sourceSteps": [
    {
      "interviewId": "interview UUID",
      "intervieweeName": "name",
      "stepId": "step UUID",
      "stepLabel": "step label text"
    }
  ],
  "sourceType": "synthesis_inferred"
}
\`\`\`

Important rules:
- Every step from every interview must be accounted for in at least one match result
- "unmatched" results will have only one sourceStep entry
- All other match types must have at least 2 sourceStep entries
- The sourceType field must always be "synthesis_inferred"
- Be conservative with confidence scores — only use > 0.9 for obvious exact matches`;
}

export function toNormalizedSchemas(
  schemas: Array<{
    interviewId: string;
    schemaJson: unknown;
  }>,
  interviewNames: Map<string, string>,
): NormalizedSchema[] {
  return schemas.map((schema) => {
    const raw = schema.schemaJson;
    if (
      !raw ||
      typeof raw !== 'object' ||
      !('steps' in raw) ||
      !Array.isArray((raw as Record<string, unknown>).steps)
    ) {
      return {
        interviewId: schema.interviewId,
        intervieweeName: interviewNames.get(schema.interviewId) ?? 'Unknown',
        steps: [],
      };
    }
    const parsed = raw as IndividualProcessSchema;
    return {
      interviewId: schema.interviewId,
      intervieweeName: interviewNames.get(schema.interviewId) ?? 'Unknown',
      steps: parsed.steps.map((step) => ({
        stepId: step.id,
        label: step.label,
        type: step.type,
      })),
    };
  });
}
