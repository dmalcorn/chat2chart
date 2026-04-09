export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type LLMProviderConfig = {
  apiKey: string;
  model: string;
  options?: Record<string, unknown>;
};

export type LLMCallOptions = {
  temperature?: number;
  outputFormat?: Record<string, unknown>;
};

export interface LLMProvider {
  initialize(config: LLMProviderConfig): void;
  sendMessage(prompt: string, conversation?: Message[], options?: LLMCallOptions): Promise<string>;
  streamResponse(
    prompt: string,
    conversation?: Message[],
    options?: LLMCallOptions,
  ): AsyncIterable<string>;
  metadata: {
    providerName: string;
    modelName: string;
    modelVersion: string;
    tokenLimits: { input: number; output: number };
    costEstimate?: { inputPerMToken: number; outputPerMToken: number };
  };
}

export type ProviderFactory = (config: LLMProviderConfig) => LLMProvider;
