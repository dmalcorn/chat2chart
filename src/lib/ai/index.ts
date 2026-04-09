export type {
  LLMProvider,
  LLMProviderConfig,
  LLMCallOptions,
  Message,
  ProviderFactory,
} from './provider';
export { resolveProvider, registerProvider, ProviderResolutionError } from './provider-registry';

// Register Claude provider on module load
import { registerProvider } from './provider-registry';
import { createClaudeProvider } from './claude-provider';
registerProvider('anthropic', createClaudeProvider);
