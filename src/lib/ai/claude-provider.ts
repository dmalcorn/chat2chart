import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMProviderConfig, LLMCallOptions, Message } from './provider';

const RETRY_BASE_DELAY_MS = 1000;
const MAX_RETRIES = 1;

class ClaudeProvider implements LLMProvider {
  private client: Anthropic | null = null;
  private model = '';

  metadata = {
    providerName: 'anthropic',
    modelName: '',
    modelVersion: '',
    tokenLimits: { input: 200000, output: 8192 },
    costEstimate: { inputPerMToken: 3, outputPerMToken: 15 },
  };

  initialize(config: LLMProviderConfig): void {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
    this.metadata.modelName = config.model;
    this.metadata.modelVersion = config.model;
  }

  async sendMessage(
    prompt: string,
    conversation?: Message[],
    options?: LLMCallOptions,
  ): Promise<string> {
    return this.withRetry(async () => {
      const client = this.getClient();
      const messages = this.buildMessages(prompt, conversation);

      const params: Anthropic.MessageCreateParams = {
        model: this.model,
        max_tokens: this.metadata.tokenLimits.output,
        messages,
      };

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }

      const response = await client.messages.create(params);
      const textBlock = response.content.find((block) => block.type === 'text');
      return textBlock?.text ?? '';
    });
  }

  async *streamResponse(
    prompt: string,
    conversation?: Message[],
    options?: LLMCallOptions,
  ): AsyncIterable<string> {
    const client = this.getClient();
    const messages = this.buildMessages(prompt, conversation);

    const params: Anthropic.MessageCreateParams = {
      model: this.model,
      max_tokens: this.metadata.tokenLimits.output,
      messages,
      stream: true,
    };

    if (options?.temperature !== undefined) {
      params.temperature = options.temperature;
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const stream = client.messages.stream({
          ...params,
          stream: undefined,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield event.delta.text;
          }
        }
        return;
      } catch (error) {
        if (attempt < MAX_RETRIES && this.isRetryable(error)) {
          await this.delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        } else if (!this.isRetryable(error)) {
          throw error;
        } else {
          break;
        }
      }
    }

    throw new Error('The AI agent is temporarily unavailable.');
  }

  private getClient(): Anthropic {
    if (!this.client) {
      throw new Error('Claude provider not initialized. Call initialize() first.');
    }
    return this.client;
  }

  private buildMessages(prompt: string, conversation?: Message[]): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    if (conversation) {
      for (const msg of conversation) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: prompt });
    return messages;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt < MAX_RETRIES && this.isRetryable(error)) {
          await this.delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        } else if (!this.isRetryable(error)) {
          throw error;
        } else {
          break;
        }
      }
    }

    throw new Error('The AI agent is temporarily unavailable.');
  }

  private isRetryable(error: unknown): boolean {
    // Check for API errors with HTTP status codes
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status;
      // Don't retry 4xx client errors (except 429 rate limit)
      return status >= 500 || status === 429;
    }
    // Retry network errors
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function createClaudeProvider(config: LLMProviderConfig): LLMProvider {
  const provider = new ClaudeProvider();
  provider.initialize(config);
  return provider;
}
