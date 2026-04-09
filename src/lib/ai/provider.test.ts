import { describe, expect, it } from 'vitest';
import type {
  LLMProvider,
  LLMProviderConfig,
  Message,
  LLMCallOptions,
  ProviderFactory,
} from './provider';

describe('LLMProvider Interface', () => {
  it('Message type supports user and assistant roles', () => {
    const userMsg: Message = { role: 'user', content: 'Hello' };
    const assistantMsg: Message = { role: 'assistant', content: 'Hi there' };
    expect(userMsg.role).toBe('user');
    expect(assistantMsg.role).toBe('assistant');
  });

  it('LLMProviderConfig type has required fields', () => {
    const config: LLMProviderConfig = {
      apiKey: 'test-key',
      model: 'test-model',
      options: { temperature: 0.5 },
    };
    expect(config.apiKey).toBe('test-key');
    expect(config.model).toBe('test-model');
    expect(config.options?.temperature).toBe(0.5);
  });

  it('LLMCallOptions type supports temperature and outputFormat', () => {
    const options: LLMCallOptions = {
      temperature: 0.2,
      outputFormat: { type: 'json_schema', schema: {} },
    };
    expect(options.temperature).toBe(0.2);
    expect(options.outputFormat).toBeDefined();
  });

  it('LLMProvider interface can be implemented', () => {
    const mockProvider: LLMProvider = {
      initialize: () => {},
      sendMessage: async () => 'response',
      streamResponse: async function* () {
        yield 'token';
      },
      metadata: {
        providerName: 'test',
        modelName: 'test-model',
        modelVersion: '1.0',
        tokenLimits: { input: 100000, output: 4096 },
      },
    };
    expect(mockProvider.metadata.providerName).toBe('test');
  });

  it('ProviderFactory type creates a provider from config', () => {
    const factory: ProviderFactory = (config) => ({
      initialize: () => {},
      sendMessage: async () => 'response',
      streamResponse: async function* () {
        yield 'token';
      },
      metadata: {
        providerName: 'test',
        modelName: config.model,
        modelVersion: '1.0',
        tokenLimits: { input: 100000, output: 4096 },
      },
    });
    const provider = factory({ apiKey: 'key', model: 'my-model' });
    expect(provider.metadata.modelName).toBe('my-model');
  });
});
