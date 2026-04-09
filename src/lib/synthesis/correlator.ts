import { z } from 'zod/v4';
import { resolveProvider } from '@/lib/ai/provider-registry';
import { buildMatchPrompt } from '@/lib/ai/prompts/synthesis/match-template';
import type { NormalizedSchema } from '@/lib/ai/prompts/synthesis/match-template';
import { matchResultArraySchema, matchResultSchema } from '@/lib/schema/workflow';
import type { MatchResult } from '@/lib/schema/workflow';

// Zod schema for the LLM response wrapper (results array inside an object)
const matchResponseSchema = z.object({
  results: z.array(matchResultSchema),
});

/**
 * Fisher-Yates shuffle to randomize step order and mitigate position bias.
 */
function shuffleSteps(schemas: NormalizedSchema[]): NormalizedSchema[] {
  return schemas.map((schema) => {
    const steps = [...schema.steps];
    for (let i = steps.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [steps[i], steps[j]] = [steps[j], steps[i]];
    }
    return { ...schema, steps };
  });
}

export async function correlateSteps(
  schemas: NormalizedSchema[],
  projectId: string,
): Promise<MatchResult[]> {
  const shuffled = shuffleSteps(schemas);
  const prompt = buildMatchPrompt(shuffled);

  const provider = await resolveProvider(projectId, 'synthesis_engine');

  // Generate outputFormat from Zod schema — single source of truth
  const outputFormat = {
    type: 'json_schema' as const,
    json_schema: {
      name: 'match_results',
      schema: z.toJSONSchema(matchResponseSchema),
    },
  };

  let response: string;
  try {
    response = await provider.sendMessage(prompt, [], {
      temperature: 0.2,
      outputFormat,
    });
  } catch {
    // Retry once with fixed 1s delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      response = await provider.sendMessage(prompt, [], {
        temperature: 0.2,
        outputFormat,
      });
    } catch {
      throw new SynthesisCorrelationError(
        'The AI agent is temporarily unavailable.',
        'LLM_UNAVAILABLE',
      );
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    throw new SynthesisCorrelationError(
      'LLM returned malformed JSON response',
      'INVALID_LLM_RESPONSE',
    );
  }

  const rawResults = (parsed as Record<string, unknown>).results ?? parsed;

  const validated = matchResultArraySchema.safeParse(rawResults);
  if (!validated.success) {
    throw new SynthesisCorrelationError(
      `Invalid match results from LLM: ${validated.error.message}`,
      'INVALID_LLM_RESPONSE',
    );
  }

  return validated.data;
}

export class SynthesisCorrelationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SynthesisCorrelationError';
    this.code = code;
  }
}
