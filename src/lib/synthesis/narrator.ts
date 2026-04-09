import { resolveProvider } from '@/lib/ai/provider-registry';
import { buildNarratePrompt } from '@/lib/ai/prompts/synthesis/narrate-template';
import type { NarratePromptInput } from '@/lib/ai/prompts/synthesis/narrate-template';
import { z } from 'zod/v4';
import { narrationResultSchema } from '@/lib/schema/synthesis';
import type { ClassificationResult, NarrationResult } from '@/lib/schema/synthesis';
import type { MatchResult, IndividualProcessSchema } from '@/lib/schema/workflow';
import { loadSkill } from '@/lib/interview/skill-loader';
import { getProjectById } from '@/lib/db/queries';

export type NarrateInput = {
  projectId: string;
  processNodeId: string;
  synthesisVersion: number;
  classificationResult: ClassificationResult;
  individualSchemas: Array<{
    interviewId: string;
    intervieweeName: string;
    intervieweeRole: string | null;
    schemaJson: IndividualProcessSchema;
  }>;
  matchResults: MatchResult[];
};

export async function narrateDivergences(input: NarrateInput): Promise<NarrationResult> {
  const { projectId, classificationResult, individualSchemas, matchResults } = input;

  // Load skill definition for domain context
  const project = await getProjectById(projectId);
  const skillName = project?.skillName ?? 'default';
  const skill = await loadSkill(skillName);
  const skillContext = skill.synthesisElements;

  // Build the narration prompt
  const promptInput: NarratePromptInput = {
    classificationResult,
    individualSchemas,
    matchResults,
    skillContext,
  };
  const prompt = buildNarratePrompt(promptInput);

  // Resolve LLM provider
  const provider = await resolveProvider(projectId, 'synthesis_engine');

  // Build output format from Zod schema
  const outputFormat = {
    type: 'json_schema' as const,
    json_schema: {
      name: 'narration_result',
      schema: z.toJSONSchema(narrationResultSchema),
    },
  };

  // Call LLM
  let response: string;
  try {
    response = await provider.sendMessage(prompt, [], {
      temperature: 0.4,
      outputFormat,
    });
  } catch {
    throw new SynthesisNarrationError(
      'The AI agent is temporarily unavailable.',
      'LLM_UNAVAILABLE',
    );
  }

  let result: NarrationResult;
  const parsed = JSON.parse(response);
  const validation = narrationResultSchema.safeParse(parsed);

  if (!validation.success) {
    // Retry once
    try {
      const retryResponse = await provider.sendMessage(prompt, [], {
        temperature: 0.4,
        outputFormat,
      });
      const retryParsed = JSON.parse(retryResponse);
      const retryValidation = narrationResultSchema.safeParse(retryParsed);
      if (!retryValidation.success) {
        throw new SynthesisNarrationError(
          `Invalid narration results from LLM: ${retryValidation.error.message}`,
          'INVALID_LLM_RESPONSE',
        );
      }
      result = retryValidation.data;
    } catch (error) {
      if (error instanceof SynthesisNarrationError) throw error;
      throw new SynthesisNarrationError(
        'The AI agent is temporarily unavailable.',
        'LLM_UNAVAILABLE',
      );
    }
  } else {
    result = validation.data;
  }

  // Merge narration explanations back into the divergence annotations
  // The LLM returns divergences with populated explanation fields
  return result;
}

export class SynthesisNarrationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SynthesisNarrationError';
    this.code = code;
  }
}
