import type { LLMProvider, LLMProviderConfig, ProviderFactory } from './provider';
import { getProjectById, getSkillProviderByProjectAndSkill } from '@/lib/db/queries';
import { env } from '@/lib/env';

const providerFactories = new Map<string, ProviderFactory>();

export function registerProvider(name: string, factory: ProviderFactory): void {
  providerFactories.set(name, factory);
}

export async function resolveProvider(projectId: string, skillName: string): Promise<LLMProvider> {
  // 1. Check project_skill_providers for specific assignment
  const skillProvider = await getSkillProviderByProjectAndSkill(projectId, skillName);

  let providerName: string;
  let modelName: string;

  if (skillProvider) {
    providerName = skillProvider.providerName;
    modelName = skillProvider.modelName;
  } else {
    // 2. Fall back to project's defaultLlmProvider
    const project = await getProjectById(projectId);
    if (!project) {
      throw new ProviderResolutionError(`Project not found: ${projectId}`, 'PROJECT_NOT_FOUND');
    }
    providerName = project.defaultLlmProvider;
    modelName = getDefaultModelForProvider(providerName);
  }

  // 3. Resolve factory
  const factory = providerFactories.get(providerName);
  if (!factory) {
    throw new ProviderResolutionError(
      `No LLM provider configured for skill: ${skillName}`,
      'PROVIDER_NOT_FOUND',
    );
  }

  // 4. Create and initialize provider
  const config: LLMProviderConfig = {
    apiKey: getApiKeyForProvider(providerName),
    model: modelName,
  };

  return factory(config);
}

function getApiKeyForProvider(providerName: string): string {
  if (providerName === 'anthropic') {
    return env.ANTHROPIC_API_KEY;
  }
  throw new ProviderResolutionError(
    `No API key configured for provider: ${providerName}`,
    'PROVIDER_NOT_FOUND',
  );
}

function getDefaultModelForProvider(providerName: string): string {
  if (providerName === 'anthropic') {
    return 'claude-sonnet-4-20250514';
  }
  throw new ProviderResolutionError(
    `No default model configured for provider: ${providerName}`,
    'PROVIDER_NOT_FOUND',
  );
}

export class ProviderResolutionError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ProviderResolutionError';
    this.code = code;
  }
}
