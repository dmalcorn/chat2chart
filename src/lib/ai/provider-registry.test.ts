// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock env
vi.mock('@/lib/env', () => ({
  env: {
    ANTHROPIC_API_KEY: 'sk-ant-test-key',
  },
}));

// Mock queries
vi.mock('@/lib/db/queries', () => ({
  getSkillProviderByProjectAndSkill: vi.fn(),
  getProjectById: vi.fn(),
}));

import { registerProvider, resolveProvider, ProviderResolutionError } from './provider-registry';
import type { LLMProvider, LLMProviderConfig } from './provider';
import { getSkillProviderByProjectAndSkill, getProjectById } from '@/lib/db/queries';

const mockGetSkillProvider = vi.mocked(getSkillProviderByProjectAndSkill);
const mockGetProject = vi.mocked(getProjectById);

function createMockProvider(config: LLMProviderConfig): LLMProvider {
  return {
    initialize: vi.fn(),
    sendMessage: vi.fn(async () => 'mock response'),
    streamResponse: vi.fn(async function* () {
      yield 'mock token';
    }),
    metadata: {
      providerName: 'mock',
      modelName: config.model,
      modelVersion: '1.0',
      tokenLimits: { input: 100000, output: 4096 },
    },
  };
}

describe('Provider Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerProvider('mock-provider', createMockProvider);
  });

  it('resolves provider from project_skill_providers table', async () => {
    registerProvider('anthropic', createMockProvider);
    mockGetSkillProvider.mockResolvedValue({
      id: 'sp-1',
      projectId: 'proj-1',
      skillName: 'interview_agent',
      providerName: 'anthropic',
      modelName: 'claude-sonnet-4-20250514',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const provider = await resolveProvider('proj-1', 'interview_agent');
    expect(provider.metadata.modelName).toBe('claude-sonnet-4-20250514');
    expect(mockGetSkillProvider).toHaveBeenCalledWith('proj-1', 'interview_agent');
  });

  it('falls back to project defaultLlmProvider when no skill-specific config', async () => {
    mockGetSkillProvider.mockResolvedValue(null);
    mockGetProject.mockResolvedValue({
      id: 'proj-1',
      name: 'Test Project',
      description: null,
      skillName: 'federal-document-processing',
      defaultLlmProvider: 'anthropic',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    registerProvider('anthropic', createMockProvider);

    const provider = await resolveProvider('proj-1', 'interview_agent');
    expect(provider).toBeDefined();
    expect(mockGetProject).toHaveBeenCalledWith('proj-1');
  });

  it('throws PROVIDER_NOT_FOUND when no factory registered', async () => {
    mockGetSkillProvider.mockResolvedValue({
      id: 'sp-1',
      projectId: 'proj-1',
      skillName: 'interview_agent',
      providerName: 'nonexistent-provider',
      modelName: 'model',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(resolveProvider('proj-1', 'interview_agent')).rejects.toThrow(
      ProviderResolutionError,
    );

    try {
      await resolveProvider('proj-1', 'interview_agent');
    } catch (e) {
      expect((e as ProviderResolutionError).code).toBe('PROVIDER_NOT_FOUND');
    }
  });

  it('throws PROJECT_NOT_FOUND when project does not exist', async () => {
    mockGetSkillProvider.mockResolvedValue(null);
    mockGetProject.mockResolvedValue(null);

    await expect(resolveProvider('nonexistent', 'interview_agent')).rejects.toThrow(
      ProviderResolutionError,
    );

    try {
      await resolveProvider('nonexistent', 'interview_agent');
    } catch (e) {
      expect((e as ProviderResolutionError).code).toBe('PROJECT_NOT_FOUND');
    }
  });

  it('registers and resolves anthropic provider with env API key', async () => {
    registerProvider('anthropic', createMockProvider);
    mockGetSkillProvider.mockResolvedValue({
      id: 'sp-1',
      projectId: 'proj-1',
      skillName: 'interview_agent',
      providerName: 'anthropic',
      modelName: 'claude-sonnet-4-20250514',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const provider = await resolveProvider('proj-1', 'interview_agent');
    expect(provider.metadata.modelName).toBe('claude-sonnet-4-20250514');
  });
});
