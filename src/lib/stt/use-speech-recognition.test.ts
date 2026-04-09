import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock WebSpeechProvider at the module level — mock the STTProvider interface, NOT the browser API
const mockStartListening = vi.fn();
const mockStopListening = vi.fn().mockResolvedValue('test transcript');
const mockInitialize = vi.fn();
const mockOnTranscript = vi.fn();

vi.mock('./web-speech-provider', () => {
  const MockWebSpeechProvider = class {
    initialize = mockInitialize;
    startListening = mockStartListening;
    stopListening = mockStopListening;
    onTranscript = mockOnTranscript;
    static isSupported = vi.fn().mockReturnValue(true);
  };
  return { WebSpeechProvider: MockWebSpeechProvider };
});

import { WebSpeechProvider } from './web-speech-provider';
const MockedWebSpeechProvider = WebSpeechProvider as unknown as {
  isSupported: ReturnType<typeof vi.fn>;
};

import { useSpeechRecognition } from './use-speech-recognition';

beforeEach(() => {
  vi.clearAllMocks();
  MockedWebSpeechProvider.isSupported = vi.fn().mockReturnValue(true);
  mockStopListening.mockResolvedValue('test transcript');
});

describe('useSpeechRecognition', () => {
  it('initial state is idle with isSupported based on provider', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.status).toBe('idle');
    expect(result.current.isSupported).toBe(true);
  });

  it('reports isSupported as false when provider says so', () => {
    MockedWebSpeechProvider.isSupported = vi.fn().mockReturnValue(false);

    const { result } = renderHook(() => useSpeechRecognition());

    expect(result.current.isSupported).toBe(false);
  });

  it('startRecording transitions status to recording', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startRecording();
    });

    expect(result.current.status).toBe('recording');
    expect(mockStartListening).toHaveBeenCalled();
  });

  it('stopRecording transitions through processing to idle and returns transcript', async () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => {
      result.current.startRecording();
    });

    let transcript = '';
    await act(async () => {
      transcript = await result.current.stopRecording();
    });

    expect(transcript).toBe('test transcript');
    expect(result.current.status).toBe('idle');
    expect(mockStopListening).toHaveBeenCalled();
  });

  it('does NOT expose transcript as state — raw text is never available for rendering (NFR2)', () => {
    const { result } = renderHook(() => useSpeechRecognition());

    // The hook only returns status, startRecording, stopRecording, isSupported
    const keys = Object.keys(result.current);
    expect(keys).not.toContain('transcript');
    expect(keys).not.toContain('text');
    expect(keys).not.toContain('rawText');
  });

  it('cleanup on unmount stops recognition', () => {
    const { unmount } = renderHook(() => useSpeechRecognition());

    unmount();

    expect(mockStopListening).toHaveBeenCalled();
  });
});
