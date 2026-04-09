import { resolveProvider } from '@/lib/ai/provider-registry';
import { buildClassifyPrompt } from '@/lib/ai/prompts/synthesis/classify-template';
import type { ClassifyPromptInput } from '@/lib/ai/prompts/synthesis/classify-template';
import { z } from 'zod/v4';
import { classificationResultSchema } from '@/lib/schema/synthesis';
import type { ClassificationResult } from '@/lib/schema/synthesis';
import type { MatchResult, IndividualProcessSchema } from '@/lib/schema/workflow';
import { loadSkill } from '@/lib/interview/skill-loader';
import { getProjectById } from '@/lib/db/queries';
import { createSynthesisCheckpoint } from '@/lib/db/queries';

export type ClassifyInput = {
  projectId: string;
  processNodeId: string;
  synthesisVersion: number;
  matchResults: MatchResult[];
  individualSchemas: Array<{
    interviewId: string;
    intervieweeName: string;
    intervieweeRole: string | null;
    schemaJson: IndividualProcessSchema;
  }>;
};

export async function classifyDivergences(input: ClassifyInput): Promise<ClassificationResult> {
  const { projectId, processNodeId, synthesisVersion, matchResults, individualSchemas } = input;

  // Load skill definition for domain context
  const project = await getProjectById(projectId);
  const skillName = project?.skillName ?? 'default';
  const skill = await loadSkill(skillName);
  const skillContext = skill.synthesisElements;

  // Build the classification prompt
  const promptInput: ClassifyPromptInput = {
    matchResults,
    individualSchemas,
    skillContext,
  };
  const prompt = buildClassifyPrompt(promptInput);

  // Resolve LLM provider
  const provider = await resolveProvider(projectId, 'synthesis_engine');

  // Build output format from Zod schema
  const outputFormat = {
    type: 'json_schema' as const,
    json_schema: {
      name: 'classification_result',
      schema: z.toJSONSchema(classificationResultSchema),
    },
  };

  // Call LLM with retry on validation failure
  const start = Date.now();
  let response: string;
  try {
    response = await provider.sendMessage(prompt, [], {
      temperature: 0.1,
      outputFormat,
    });
  } catch {
    throw new SynthesisClassificationError(
      'The AI agent is temporarily unavailable.',
      'LLM_UNAVAILABLE',
    );
  }

  let result: ClassificationResult;
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    throw new SynthesisClassificationError(
      'LLM returned malformed JSON response',
      'INVALID_LLM_RESPONSE',
    );
  }
  const validation = classificationResultSchema.safeParse(parsed);

  if (!validation.success) {
    // Retry once
    try {
      const retryResponse = await provider.sendMessage(prompt, [], {
        temperature: 0.1,
        outputFormat,
      });
      const retryParsed = JSON.parse(retryResponse);
      const retryValidation = classificationResultSchema.safeParse(retryParsed);
      if (!retryValidation.success) {
        throw new SynthesisClassificationError(
          `Invalid classification results from LLM: ${retryValidation.error.message}`,
          'INVALID_LLM_RESPONSE',
        );
      }
      result = retryValidation.data;
    } catch (error) {
      if (error instanceof SynthesisClassificationError) throw error;
      throw new SynthesisClassificationError(
        'The AI agent is temporarily unavailable.',
        'LLM_UNAVAILABLE',
      );
    }
  } else {
    result = validation.data;
  }

  const durationMs = Date.now() - start;

  // Persist checkpoint
  await createSynthesisCheckpoint({
    projectId,
    processNodeId,
    synthesisVersion,
    stage: 'classify',
    resultJson: result,
    durationMs,
  });

  return result;
}

export class SynthesisClassificationError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SynthesisClassificationError';
    this.code = code;
  }
}
