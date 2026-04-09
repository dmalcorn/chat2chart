'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSpeechProvider } from './web-speech-provider';
import type { STTProvider } from './provider';

export type SpeechRecognitionStatus = 'idle' | 'recording' | 'processing';

export interface UseSpeechRecognitionReturn {
  status: SpeechRecognitionStatus;
  startRecording: () => void;
  stopRecording: () => Promise<string>;
  isSupported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [isSupported, setIsSupported] = useState(false);
  const providerRef = useRef<STTProvider | null>(null);

  useEffect(() => {
    const supported = WebSpeechProvider.isSupported();
    setIsSupported(supported);

    if (supported) {
      const provider = new WebSpeechProvider();
      provider.initialize({});
      providerRef.current = provider;
    }

    return () => {
      // Cleanup: stop any active recognition on unmount
      if (providerRef.current) {
        providerRef.current.stopListening();
        providerRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!providerRef.current) return;
    setStatus('recording');
    try {
      providerRef.current.startListening();
    } catch {
      setStatus('idle');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    if (!providerRef.current) return '';
    setStatus('processing');
    const transcript = await providerRef.current.stopListening();
    setStatus('idle');
    return transcript;
  }, []);

  return { status, startRecording, stopRecording, isSupported };
}
