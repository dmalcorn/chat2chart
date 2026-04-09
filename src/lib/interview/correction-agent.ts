import { buildCorrectionPrompt } from '@/lib/ai/prompts/correction-template';
import { resolveProvider } from '@/lib/ai/provider-registry';
import { individualProcessSchemaSchema } from '@/lib/schema/workflow';

export class CorrectionValidationError extends Error {
  readonly code = 'CORRECTION_VALIDATION_FAILED';
  constructor(message: string) {
    super(message);
    this.name = 'CorrectionValidationError';
  }
}

/**
 * Orchestrates a diagram correction session via LLM.
 * Yields streamed tokens from the provider, then validates the result.
 */
export async function* streamCorrectedSchema(params: {
  currentSchema: object;
  errorDescription: string;
  projectId: string;
}): AsyncIterable<string> {
  const { currentSchema, errorDescription, projectId } = params;

  const provider = await resolveProvider(projectId, 'diagram_correction');
  const systemPrompt = buildCorrectionPrompt(currentSchema, errorDescription);

  let accumulated = '';

  for await (const token of provider.streamResponse(
    systemPrompt,
    [{ role: 'user', content: errorDescription }],
    { temperature: 0.1 },
  )) {
    accumulated += token;
    yield token;
  }

  // Validate accumulated response
  const jsonStr = extractJson(accumulated);
  const parsed = JSON.parse(jsonStr);
  const result = individualProcessSchemaSchema.safeParse(parsed);

  if (result.success) {
    return;
  }

  // Retry once with clarifying prompt
  let retryAccumulated = '';
  for await (const token of provider.streamResponse(
    systemPrompt,
    [
      { role: 'user', content: errorDescription },
      { role: 'assistant', content: accumulated },
      {
        role: 'user',
        content:
          'The JSON you returned did not pass schema validation. Please fix the JSON structure and return only valid JSON matching the Process Schema format.',
      },
    ],
    { temperature: 0.1 },
  )) {
    retryAccumulated += token;
    yield token;
  }

  const retryJson = extractJson(retryAccumulated);
  const retryParsed = JSON.parse(retryJson);
  const retryResult = individualProcessSchemaSchema.safeParse(retryParsed);

  if (!retryResult.success) {
    throw new CorrectionValidationError('Failed to produce valid corrected schema after retry');
  }
}

/**
 * Extracts the final validated schema from streamed content.
 * Call this after streaming completes to get the parsed schema.
 */
export async function getCorrectedSchema(params: {
  currentSchema: object;
  errorDescription: string;
  projectId: string;
}): Promise<object> {
  const { currentSchema, errorDescription, projectId } = params;

  const provider = await resolveProvider(projectId, 'diagram_correction');
  const systemPrompt = buildCorrectionPrompt(currentSchema, errorDescription);

  const response = await provider.sendMessage(
    systemPrompt,
    [{ role: 'user', content: errorDescription }],
    { temperature: 0.1 },
  );

  try {
    const jsonStr = extractJson(response);
    const parsed = JSON.parse(jsonStr);
    const result = individualProcessSchemaSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }
  } catch {
    // Fall through to retry
  }

  // Retry once
  const retryResponse = await provider.sendMessage(
    systemPrompt,
    [
      { role: 'user', content: errorDescription },
      { role: 'assistant', content: response },
      {
        role: 'user',
        content:
          'The JSON you returned did not pass schema validation. Please fix the JSON structure and return only valid JSON matching the Process Schema format.',
      },
    ],
    { temperature: 0.1 },
  );

  try {
    const retryJson = extractJson(retryResponse);
    const retryParsed = JSON.parse(retryJson);
    const retryResult = individualProcessSchemaSchema.safeParse(retryParsed);

    if (retryResult.success) {
      return retryResult.data;
    }
  } catch {
    // Fall through to error
  }

  throw new CorrectionValidationError('Failed to produce valid corrected schema after retry');
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (match?.[1] ?? text).trim();
}
