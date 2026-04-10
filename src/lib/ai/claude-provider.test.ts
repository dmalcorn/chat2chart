// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock @anthropic-ai/sdk at the adapter boundary
const { mockCreate, mockStream } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
    mockStream: vi.fn(),
  };
});

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: mockCreate,
      stream: mockStream,
    };
  }

  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  return {
    default: MockAnthropic,
    APIError: MockAPIError,
  };
});

vi.mock('@/lib/env', () => ({
  env: { ANTHROPIC_API_KEY: 'sk-ant-test-key' },
}));

import { createClaudeProvider } from './claude-provider';
import type { LLMProvider } from './provider';

describe('Claude Provider', () => {
  let provider: LLMProvider;

  beforeEach(() => {
    vi.resetAllMocks();
    provider = createClaudeProvider({
      apiKey: 'sk-ant-test-key',
      model: 'claude-sonnet-4-6',
    });
  });

  describe('metadata', () => {
    it('has correct provider name and model', () => {
      expect(provider.metadata.providerName).toBe('anthropic');
      expect(provider.metadata.modelName).toBe('claude-sonnet-4-6');
    });

    it('has token limits defined', () => {
      expect(provider.metadata.tokenLimits.input).toBeGreaterThan(0);
      expect(provider.metadata.tokenLimits.output).toBeGreaterThan(0);
    });
  });

  describe('sendMessage', () => {
    it('returns text content from response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Hello from Claude' }],
      });

      const result = await provider.sendMessage('Say hello');
      expect(result).toBe('Hello from Claude');
      expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('passes conversation history to API', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Reply' }],
      });

      await provider.sendMessage('Follow up', [
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'First reply' },
      ]);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages).toHaveLength(3);
      expect(callArgs.messages[0]).toEqual({
        role: 'user',
        content: 'First message',
      });
      expect(callArgs.messages[2]).toEqual({
        role: 'user',
        content: 'Follow up',
      });
    });

    it('passes temperature option to API', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });

      await provider.sendMessage('Prompt', [], { temperature: 0.2 });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.2);
    });

    it('returns empty string when no text block in response', async () => {
      mockCreate.mockResolvedValue({ content: [] });

      const result = await provider.sendMessage('Prompt');
      expect(result).toBe('');
    });

    it('retries once on server error then succeeds', async () => {
      const serverError = new Error('Server error');
      (serverError as unknown as Record<string, unknown>).status = 500;
      Object.setPrototypeOf(serverError, Error.prototype);

      mockCreate.mockRejectedValueOnce(serverError).mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Recovered' }],
      });

      const result = await provider.sendMessage('Prompt');
      expect(result).toBe('Recovered');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('throws "temporarily unavailable" after retry exhaustion', async () => {
      const serverError = new Error('Server error');

      mockCreate.mockRejectedValueOnce(serverError).mockRejectedValueOnce(serverError);

      await expect(provider.sendMessage('Prompt')).rejects.toThrow(
        'The AI agent is temporarily unavailable.',
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('streamResponse', () => {
    it('yields text delta tokens', async () => {
      const mockEvents = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } },
      ];

      mockStream.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockEvents) {
            yield event;
          }
        },
      });

      const tokens: string[] = [];
      for await (const token of provider.streamResponse('Say hello')) {
        tokens.push(token);
      }

      expect(tokens).toEqual(['Hello', ' world']);
    });

    it('filters non-text-delta events', async () => {
      const mockEvents = [
        { type: 'message_start', message: {} },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Token' } },
        { type: 'message_stop' },
      ];

      mockStream.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const event of mockEvents) {
            yield event;
          }
        },
      });

      const tokens: string[] = [];
      for await (const token of provider.streamResponse('Prompt')) {
        tokens.push(token);
      }

      expect(tokens).toEqual(['Token']);
    });

    it('retries once on stream error then succeeds', async () => {
      const serverError = new Error('Server error');
      (serverError as unknown as Record<string, unknown>).status = 500;

      const mockEvents = [
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Recovered' } },
      ];

      mockStream
        .mockReturnValueOnce({
          [Symbol.asyncIterator]: async function* () {
            throw serverError;
          },
        })
        .mockReturnValueOnce({
          [Symbol.asyncIterator]: async function* () {
            for (const event of mockEvents) {
              yield event;
            }
          },
        });

      const tokens: string[] = [];
      for await (const token of provider.streamResponse('Prompt')) {
        tokens.push(token);
      }

      expect(tokens).toEqual(['Recovered']);
      expect(mockStream).toHaveBeenCalledTimes(2);
    });

    it('throws "temporarily unavailable" after stream retry exhaustion', async () => {
      const serverError = new Error('Server error');

      mockStream
        .mockReturnValueOnce({
          [Symbol.asyncIterator]: async function* () {
            throw serverError;
          },
        })
        .mockReturnValueOnce({
          [Symbol.asyncIterator]: async function* () {
            throw serverError;
          },
        });

      const tokens: string[] = [];
      await expect(async () => {
        for await (const token of provider.streamResponse('Prompt')) {
          tokens.push(token);
        }
      }).rejects.toThrow('The AI agent is temporarily unavailable.');
      expect(mockStream).toHaveBeenCalledTimes(2);
    });

    it('passes temperature option through', async () => {
      mockStream.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // empty stream
        },
      });

      const tokens: string[] = [];
      for await (const token of provider.streamResponse('Prompt', [], {
        temperature: 0.3,
      })) {
        tokens.push(token);
      }

      const callArgs = mockStream.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.3);
    });
  });
});
