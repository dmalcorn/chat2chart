import nlp from 'compromise';
import { randomUUID } from 'crypto';
import {
  individualProcessSchemaSchema,
  type IndividualProcessSchema,
  type IndividualStep,
  type IndividualConnection,
} from '@/lib/schema/workflow';
import { resolveProvider } from '@/lib/ai/provider-registry';

// --- Types ---

export type VerifiedSummary = {
  exchangeId: string;
  segmentId: string;
  content: string;
  sequenceNumber: number;
};

export type ExtractionContext = {
  interviewId: string;
  processNodeId: string;
  projectId: string;
};

export type QualityGateResult = {
  passed: boolean;
  checks: {
    structural: boolean;
    completeness: boolean;
    richness: boolean;
  };
  scores: {
    stepCount: number;
    decisionPointCount: number;
    summaryCount: number;
  };
};

// --- Constants ---

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TEMPORAL_MARKERS =
  /\b(first|then|next|after|finally|before|lastly|subsequently|afterwards|later)\b/i;
const CONDITIONAL_PATTERNS = /\b(if|when|depends|unless|sometimes|either|or)\b/i;

// --- Programmatic NLP Extraction ---

export function extractProgrammatic(
  summaries: VerifiedSummary[],
  context: ExtractionContext,
): IndividualProcessSchema {
  const steps: IndividualStep[] = [];
  const connections: IndividualConnection[] = [];

  for (const summary of summaries) {
    const doc = nlp(summary.content);

    // Extract verb-object pairs as process steps
    const verbPhrases = doc.match('#Verb+ (the|a|an)? #Noun+').out('array') as string[];

    // Detect if this summary contains conditional language
    const hasConditional = CONDITIONAL_PATTERNS.test(summary.content);

    if (verbPhrases.length === 0) {
      // Fallback: use the sentence(s) as step labels
      const sentences = doc.sentences().out('array') as string[];
      for (const sentence of sentences) {
        const trimmed = sentence.replace(/[.!?]+$/, '').trim();
        if (trimmed.length < 3) continue;
        const isDecision = hasConditional && CONDITIONAL_PATTERNS.test(sentence);
        steps.push({
          id: randomUUID(),
          label: capitalizeFirst(trimmed),
          type: isDecision ? 'decision' : 'step',
          sourceType: 'interview_discovered',
          sourceExchangeIds: [summary.segmentId],
        });
      }
    } else {
      for (const phrase of verbPhrases) {
        const isDecision = hasConditional && CONDITIONAL_PATTERNS.test(phrase);
        steps.push({
          id: randomUUID(),
          label: capitalizeFirst(phrase),
          type: isDecision ? 'decision' : 'step',
          sourceType: 'interview_discovered',
          sourceExchangeIds: [summary.segmentId],
        });
      }
    }

    // If conditional language is present and no decision step was created, mark the first step as decision
    if (hasConditional && steps.length > 0) {
      const summarySteps = steps.filter((s) => s.sourceExchangeIds.includes(summary.segmentId));
      const hasDecision = summarySteps.some((s) => s.type === 'decision');
      if (!hasDecision && summarySteps.length > 0) {
        summarySteps[0].type = 'decision';
      }
    }
  }

  // If no steps were extracted at all, create a single fallback step
  if (steps.length === 0) {
    steps.push({
      id: randomUUID(),
      label: 'Process step',
      type: 'step',
      sourceType: 'interview_discovered',
      sourceExchangeIds: summaries.map((s) => s.segmentId),
    });
  }

  // Build sequential connections
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    const next = steps[i + 1];

    if (current.type === 'decision') {
      // Decision step gets labeled branches
      connections.push({ from: current.id, to: next.id, label: 'Yes' });
      // If there's a step after next, add a "No" branch to it
      if (i + 2 < steps.length) {
        connections.push({ from: current.id, to: steps[i + 2].id, label: 'No' });
      }
    } else {
      connections.push({ from: current.id, to: next.id });
    }
  }

  const decisionPointCount = steps.filter((s) => s.type === 'decision').length;

  return {
    schemaVersion: '1.0',
    processNodeId: context.processNodeId,
    interviewId: context.interviewId,
    steps,
    connections,
    metadata: {
      extractionMethod: 'programmatic',
      extractedAt: new Date().toISOString(),
      stepCount: steps.length,
      decisionPointCount,
    },
  };
}

// --- Quality Gate ---

export function runQualityGate(schema: unknown, summaries: VerifiedSummary[]): QualityGateResult {
  // Structural check: Zod validation
  const parseResult = individualProcessSchemaSchema.safeParse(schema);
  const structural = parseResult.success;

  let stepCount = 0;
  let decisionPointCount = 0;

  if (structural && parseResult.data) {
    stepCount = parseResult.data.metadata.stepCount;
    decisionPointCount = parseResult.data.metadata.decisionPointCount;
  }

  // Completeness check: at least 1 step per 2 summaries
  const minSteps = Math.ceil(summaries.length / 2);
  const completeness = structural && stepCount >= minSteps;

  // Richness check: if any summary has conditional language, need at least 1 decision point
  const hasConditionalLanguage = summaries.some((s) => CONDITIONAL_PATTERNS.test(s.content));
  const richness = !hasConditionalLanguage || decisionPointCount >= 1;

  return {
    passed: structural && completeness && richness,
    checks: { structural, completeness, richness },
    scores: {
      stepCount,
      decisionPointCount,
      summaryCount: summaries.length,
    },
  };
}

// --- LLM Fallback ---

export async function extractViaLlm(
  summaries: VerifiedSummary[],
  context: ExtractionContext,
): Promise<IndividualProcessSchema> {
  const provider = await resolveProvider(context.projectId, 'interview_agent');

  const summaryTexts = summaries
    .map((s, i) => `Summary ${i + 1} (segment ${s.segmentId}): ${s.content}`)
    .join('\n\n');

  const systemPrompt = `You are a process extraction agent. Given verified interview summaries describing a work process, extract a structured process schema that accurately represents the interviewee's workflow.

Each summary follows a structured format:
- **What happens:** [action] on [object] by [actor]
- **Why:** [purpose or trigger]
- **How:** [method, system, or tool used]
- **Then:** [what happens next, or handoff]

Use this structure to identify distinct process steps, decision points, and the connections between them. Preserve the interviewee's language and level of detail. One summary may contain multiple steps or a single step — use your judgment based on the content.

Output ONLY valid JSON matching this exact structure:
{
  "schemaVersion": "1.0",
  "processNodeId": "${context.processNodeId}",
  "interviewId": "${context.interviewId}",
  "steps": [
    {
      "id": "<uuid>",
      "label": "<verb phrase describing the step>",
      "type": "step" or "decision",
      "sourceType": "interview_discovered",
      "sourceExchangeIds": ["<segment IDs from summaries that contributed>"]
    }
  ],
  "connections": [
    { "from": "<step id>", "to": "<step id>", "label": "<optional: for decision branches>" }
  ],
  "metadata": {
    "extractionMethod": "llm",
    "extractedAt": "${new Date().toISOString()}",
    "stepCount": <number of steps>,
    "decisionPointCount": <number of decision type steps>
  }
}

Rules:
- Step labels must be clear verb phrases (e.g., "Review budget request", "Sort incoming mail by form type")
- Use type "decision" for conditional/branching steps — where the interviewee described "if", "when", "depends on", "sometimes", or alternate paths
- Use type "step" for sequential process steps
- All sourceType values must be "interview_discovered"
- Generate valid UUID v4 for each step id
- Connections define the flow: sequential steps connect in order, decision steps branch with labeled connections (e.g., "Yes"/"No", "Damaged"/"Intact", or other contextual labels from the interview)
- stepCount and decisionPointCount in metadata must match the actual counts
- Aim for clarity in a flowchart — a reader unfamiliar with the process should understand the workflow from the step labels alone`;

  const response = await provider.sendMessage(
    systemPrompt,
    [{ role: 'user', content: summaryTexts }],
    { temperature: 0.1 },
  );

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, response];
  const jsonStr = (jsonMatch[1] ?? response).trim();

  const parsed = JSON.parse(jsonStr);
  const validated = individualProcessSchemaSchema.parse(parsed);
  return validated;
}

// --- Orchestrator ---

export async function extractProcessSchema(
  summaries: VerifiedSummary[],
  context: ExtractionContext,
): Promise<IndividualProcessSchema> {
  const startTime = Date.now();

  // Tier 1: LLM extraction (primary — higher quality)
  try {
    const llmResult = await extractViaLlm(summaries, context);
    const duration = Date.now() - startTime;

    console.log('[schema-extractor] Extraction complete', {
      method: 'llm',
      durationMs: duration,
      stepCount: llmResult.metadata.stepCount,
    });

    return llmResult;
  } catch (llmError) {
    console.warn('[schema-extractor] LLM extraction failed, falling back to programmatic', {
      error: llmError instanceof Error ? llmError.message : String(llmError),
    });
  }

  // Tier 2: Programmatic NLP fallback (when LLM is unavailable)
  const programmaticResult = extractProgrammatic(summaries, context);
  const qualityGateResult = runQualityGate(programmaticResult, summaries);
  const duration = Date.now() - startTime;

  console.log('[schema-extractor] Extraction complete', {
    method: 'programmatic_fallback',
    qualityGate: qualityGateResult,
    durationMs: duration,
    stepCount: programmaticResult.metadata.stepCount,
  });

  return programmaticResult;
}

// --- Helpers ---

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
