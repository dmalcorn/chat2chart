import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSpeechProvider } from './web-speech-provider';
import type { STTTranscriptResult } from './provider';

// Mock SpeechRecognition at the browser API level (adapter boundary)
function createMockRecognition() {
  const mock = {
    continuous: false,
    interimResults: false,
    lang: '',
    start: vi.fn(),
    stop: vi.fn(),
    onresult: null as ((event: unknown) => void) | null,
    onerror: null as ((event: unknown) => void) | null,
    onend: null as (() => void) | null,
  };
  // When stop() is called, fire onend asynchronously (mimics browser behavior)
  mock.stop.mockImplementation(() => {
    queueMicrotask(() => mock.onend?.());
  });
  return mock;
}

let mockRecognition: ReturnType<typeof createMockRecognition>;

beforeEach(() => {
  mockRecognition = createMockRecognition();
  // Must use a real class so `new Ctor()` works
  (globalThis as Record<string, unknown>).SpeechRecognition = class {
    constructor() {
      return mockRecognition;
    }
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).SpeechRecognition;
  delete (globalThis as Record<string, unknown>).webkitSpeechRecognition;
});

describe('WebSpeechProvider', () => {
  describe('isSupported', () => {
    it('returns true when SpeechRecognition exists on window', () => {
      expect(WebSpeechProvider.isSupported()).toBe(true);
    });

    it('returns true when webkitSpeechRecognition exists', () => {
      delete (globalThis as Record<string, unknown>).SpeechRecognition;
      (globalThis as Record<string, unknown>).webkitSpeechRecognition = class {
        constructor() {
          return mockRecognition;
        }
      };
      expect(WebSpeechProvider.isSupported()).toBe(true);
    });

    it('returns false when neither exists', () => {
      delete (globalThis as Record<string, unknown>).SpeechRecognition;
      expect(WebSpeechProvider.isSupported()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('creates a recognition instance with correct settings', () => {
      const provider = new WebSpeechProvider();
      provider.initialize({});

      expect(mockRecognition.continuous).toBe(true);
      expect(mockRecognition.interimResults).toBe(false);
      expect(mockRecognition.lang).toBe('en-US');
    });
  });

  describe('startListening', () => {
    it('calls recognition.start()', () => {
      const provider = new WebSpeechProvider();
      provider.initialize({});
      provider.startListening();

      expect(mockRecognition.start).toHaveBeenCalled();
    });
  });

  describe('stopListening', () => {
    it('resolves with accumulated transcript', async () => {
      const provider = new WebSpeechProvider();
      provider.initialize({});
      provider.startListening();

      // Simulate a recognition result
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            0: { transcript: 'hello world', confidence: 0.95 },
            isFinal: true,
            length: 1,
          },
        },
      });

      // Stop — mock's stop() fires onend asynchronously
      const transcript = await provider.stopListening();

      expect(transcript).toBe('hello world');
      expect(mockRecognition.stop).toHaveBeenCalled();
    });
  });

  describe('onTranscript', () => {
    it('invokes callback with correct STTTranscriptResult shape', () => {
      const provider = new WebSpeechProvider();
      provider.initialize({});

      const callback = vi.fn<(result: STTTranscriptResult) => void>();
      provider.onTranscript(callback);
      provider.startListening();

      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            0: { transcript: 'test', confidence: 0.9 },
            isFinal: true,
            length: 1,
          },
        },
      });

      expect(callback).toHaveBeenCalledWith({
        text: 'test',
        confidence: 0.9,
        isFinal: true,
      });
    });
  });

  describe('error handling', () => {
    it('onerror triggers callback with empty text and isFinal true', () => {
      const provider = new WebSpeechProvider();
      provider.initialize({});

      const callback = vi.fn<(result: STTTranscriptResult) => void>();
      provider.onTranscript(callback);

      mockRecognition.onerror?.({ error: 'not-allowed', message: 'Permission denied' });

      expect(callback).toHaveBeenCalledWith({
        text: '',
        confidence: 0,
        isFinal: true,
      });
    });
  });

  describe('onend — unexpected browser stop', () => {
    it('resolves when browser ends recognition unexpectedly', async () => {
      const provider = new WebSpeechProvider();
      provider.initialize({});

      // Override stop() to NOT fire onend (simulating browser ending on its own)
      mockRecognition.stop.mockImplementation(() => {
        // Don't fire onend here — we simulate the browser doing it separately
      });

      provider.startListening();

      // Simulate result
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            0: { transcript: 'partial', confidence: 0.8 },
            isFinal: true,
            length: 1,
          },
        },
      });

      // Call stopListening to set up the resolve
      const promise = provider.stopListening();
      // Then browser fires onend
      mockRecognition.onend?.();

      const result = await promise;
      expect(result).toBe('partial');
    });
  });
});
