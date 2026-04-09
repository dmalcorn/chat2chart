import type { ClassificationResult } from '@/lib/schema/synthesis';
import type { MatchResult, IndividualProcessSchema } from '@/lib/schema/workflow';

export type NarratePromptInput = {
  classificationResult: ClassificationResult;
  individualSchemas: Array<{
    interviewId: string;
    intervieweeName: string;
    intervieweeRole: string | null;
    schemaJson: IndividualProcessSchema;
  }>;
  matchResults: MatchResult[];
  skillContext: string;
};

export function buildNarratePrompt(input: NarratePromptInput): string {
  const { classificationResult, individualSchemas, matchResults, skillContext } = input;

  const intervieweeSection = individualSchemas
    .map(
      (schema) =>
        `- **${schema.intervieweeName}**${schema.intervieweeRole ? ` (${schema.intervieweeRole})` : ''} — Interview: ${schema.interviewId}`,
    )
    .join('\n');

  const divergenceSection = classificationResult.divergences
    .map((div, i) => {
      const intervieweeNames = div.intervieweeIds
        .map((id) => {
          const schema = individualSchemas.find((s) => s.interviewId === id);
          return schema?.intervieweeName ?? id;
        })
        .join(', ');
      return `### Divergence ${i + 1}: ${div.divergenceType} (confidence: ${div.confidence})\n- Step ID: ${div.stepId}\n- Affected interviewees: ${intervieweeNames}`;
    })
    .join('\n\n');

  const implicitSection = classificationResult.implicitSteps
    .map((step, i) => {
      const mentionedNames = step.mentionedByIds
        .map((id) => {
          const schema = individualSchemas.find((s) => s.interviewId === id);
          return schema?.intervieweeName ?? id;
        })
        .join(', ');
      const omittedNames = step.omittedByIds
        .map((id) => {
          const schema = individualSchemas.find((s) => s.interviewId === id);
          return schema?.intervieweeName ?? id;
        })
        .join(', ');
      return `### Implicit Step ${i + 1}: ${step.classification} (confidence: ${step.confidence})\n- Step ID: ${step.stepId}\n- Mentioned by: ${mentionedNames}\n- Omitted by: ${omittedNames}`;
    })
    .join('\n\n');

  const matchSummary = matchResults
    .filter((m) => m.matchType === 'unmatched' || m.confidence < 0.7)
    .map((m) => {
      const steps = m.sourceSteps.map((s) => `${s.intervieweeName}: "${s.stepLabel}"`).join(', ');
      return `- ${m.matchType} (confidence: ${m.confidence}): ${steps}`;
    })
    .join('\n');

  return `# Divergence Narration Task

You are a technical writer creating human-readable explanations of process divergences for non-technical supervisors.

## Domain Context

${skillContext}

## Interviewees

${intervieweeSection}

## Classified Divergences

${divergenceSection}

## Implicit Steps

${implicitSection || 'No implicit steps identified.'}

## Low-Confidence Matches (Context)

${matchSummary || 'All matches were high confidence.'}

## Instructions

For each divergence listed above, generate a concise, supervisor-friendly explanation that:

1. **References interviewees by name** and role where available
2. **Explains the divergence** in plain language a non-technical supervisor can understand
3. **Describes the operational impact** — why does this divergence matter for the process?
4. **Avoids technical jargon** — no UUIDs, match types, or confidence scores in the explanation text

Then generate an **overall narrative summary** (2-4 sentences) that gives the supervisor a high-level understanding of how the interviewed processes diverge.

## Critical Rules

- Every divergence annotation must have \`sourceType: "synthesis_inferred"\`
- Preserve the exact same \`id\`, \`stepId\`, \`divergenceType\`, \`intervieweeIds\`, and \`confidence\` from the input
- Only populate the \`explanation\` field with your generated text
- Write in clear, professional language suitable for a supervisor audience

## Output Format

Return a JSON object with this exact structure:

\`\`\`json
{
  "divergences": [
    {
      "id": "same UUID from input",
      "stepId": "same UUID from input",
      "divergenceType": "same type from input",
      "intervieweeIds": ["same IDs from input"],
      "confidence": 0.0-1.0,
      "explanation": "Your generated human-readable explanation here",
      "sourceType": "synthesis_inferred"
    }
  ],
  "summary": "2-4 sentence overall narrative summary of divergences"
}
\`\`\``;
}
