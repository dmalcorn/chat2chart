import type { MatchResult } from '@/lib/schema/workflow';
import type { IndividualProcessSchema } from '@/lib/schema/workflow';

export type ClassifyPromptInput = {
  matchResults: MatchResult[];
  individualSchemas: Array<{
    interviewId: string;
    intervieweeName: string;
    schemaJson: IndividualProcessSchema;
  }>;
  skillContext: string;
};

export function buildClassifyPrompt(input: ClassifyPromptInput): string {
  const { matchResults, individualSchemas, skillContext } = input;

  const matchSection = matchResults
    .map((match, i) => {
      const steps = match.sourceSteps
        .map((s) => `  - [${s.intervieweeName}] "${s.stepLabel}" (step: ${s.stepId})`)
        .join('\n');
      return `### Match ${i + 1}: ${match.matchType} (confidence: ${match.confidence})\nRationale: ${match.rationale}\nSteps:\n${steps}`;
    })
    .join('\n\n');

  const schemaSection = individualSchemas
    .map((schema) => {
      const steps = schema.schemaJson.steps
        .map((step, j) => `  ${j + 1}. [${step.id}] "${step.label}" (type: ${step.type})`)
        .join('\n');
      return `## ${schema.intervieweeName} (Interview: ${schema.interviewId})\n${steps}`;
    })
    .join('\n\n');

  return `# Divergence Classification Task

You are a workflow analysis expert. Your task is to examine the step matching results from a prior stage and classify divergences between interview accounts.

## Domain Context

${skillContext}

## Step Matching Results (from Prior Stage)

${matchSection}

## Individual Process Schemas

${schemaSection}

## Instructions

Analyze the match results above and:

1. **Identify divergences** — Examine unmatched steps, partial matches, and low-confidence matches to identify where interviewees describe genuinely different processes.

2. **Classify each divergence** as one of three types:
   - **genuinely_unique**: A step that one interviewee does that others do not — a real process variation. Example: A manual QC check that only one worker performs.
   - **sequence_conflict**: Same steps exist but in a different order across interviews. Example: One worker scans before sorting; another sorts before scanning.
   - **uncertain_needs_review**: The engine cannot confidently classify — may be terminology difference or genuine divergence. Flag for supervisor review.

3. **Identify implicit steps** — Steps mentioned by some interviewees but omitted by others. Classify each as:
   - **likely_omission**: The step is probably universal but wasn't mentioned (low confidence divergence)
   - **genuinely_different**: The step is probably unique to specific interviewees (high confidence divergence)

4. **Attribute each divergence** to specific interviewees by their interview IDs.

5. **Assign confidence levels** (0.0–1.0) to each classification.

## Critical Rules

- Every element you produce must have \`sourceType: "synthesis_inferred"\`
- Never tag anything as \`interview_discovered\` — you are classifying, not discovering
- Be conservative with confidence — only use > 0.8 for clear-cut cases
- The \`explanation\` field should be an empty string "" — it will be populated by the narration stage

## Output Format

Return a JSON object with this exact structure:

\`\`\`json
{
  "divergences": [
    {
      "id": "UUID",
      "stepId": "UUID of the synthesized step this divergence relates to",
      "divergenceType": "genuinely_unique | sequence_conflict | uncertain_needs_review",
      "intervieweeIds": ["interview-UUID-1", "interview-UUID-2"],
      "confidence": 0.0-1.0,
      "explanation": "",
      "sourceType": "synthesis_inferred"
    }
  ],
  "implicitSteps": [
    {
      "id": "UUID",
      "stepId": "UUID of the step in question",
      "mentionedByIds": ["interview-UUID-1"],
      "omittedByIds": ["interview-UUID-2"],
      "classification": "likely_omission | genuinely_different",
      "confidence": 0.0-1.0,
      "sourceType": "synthesis_inferred"
    }
  ],
  "processedAt": "ISO 8601 datetime"
}
\`\`\``;
}
