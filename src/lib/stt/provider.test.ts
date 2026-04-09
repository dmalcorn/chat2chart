import { describe, it, expectTypeOf } from 'vitest';
import type { STTProvider, STTTranscriptResult } from './provider';

describe('STTProvider interface', () => {
  it('STTTranscriptResult has required fields', () => {
    expectTypeOf<STTTranscriptResult>().toHaveProperty('text');
    expectTypeOf<STTTranscriptResult>().toHaveProperty('confidence');
    expectTypeOf<STTTranscriptResult>().toHaveProperty('isFinal');
  });

  it('STTProvider has required methods', () => {
    expectTypeOf<STTProvider>().toHaveProperty('initialize');
    expectTypeOf<STTProvider>().toHaveProperty('startListening');
    expectTypeOf<STTProvider>().toHaveProperty('stopListening');
    expectTypeOf<STTProvider>().toHaveProperty('onTranscript');
  });

  it('stopListening returns Promise<string>', () => {
    expectTypeOf<STTProvider['stopListening']>().returns.toEqualTypeOf<Promise<string>>();
  });

  it('onTranscript accepts a callback with STTTranscriptResult', () => {
    type Callback = (result: STTTranscriptResult) => void;
    expectTypeOf<STTProvider['onTranscript']>().parameter(0).toEqualTypeOf<Callback>();
  });
});
