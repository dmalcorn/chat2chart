import type { STTProvider, STTTranscriptResult } from './provider';

// Extend Window to include vendor-prefixed SpeechRecognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as unknown as Record<string, SpeechRecognitionConstructor>).SpeechRecognition ??
    (window as unknown as Record<string, SpeechRecognitionConstructor>).webkitSpeechRecognition ??
    null
  );
}

export class WebSpeechProvider implements STTProvider {
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private accumulatedTranscript = '';
  private transcriptCallback: ((result: STTTranscriptResult) => void) | null = null;
  private stopResolve: ((transcript: string) => void) | null = null;

  static isSupported(): boolean {
    return getSpeechRecognitionConstructor() !== null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialize(config: { apiKey?: string; options?: Record<string, unknown> }): void {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return;

    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          const transcript = result[0].transcript;
          const confidence = result[0].confidence;
          const isFinal = result.isFinal;

          if (isFinal) {
            this.accumulatedTranscript += transcript;
          }

          this.transcriptCallback?.({
            text: transcript,
            confidence,
            isFinal,
          });
        }
      }
    };

    this.recognition.onerror = () => {
      this.transcriptCallback?.({
        text: '',
        confidence: 0,
        isFinal: true,
      });
    };

    this.recognition.onend = () => {
      // If browser stopped unexpectedly while still listening, mark as not listening
      if (this.isListening) {
        this.isListening = false;
      }
      // Always resolve any pending stopListening promise
      if (this.stopResolve) {
        this.stopResolve(this.accumulatedTranscript);
        this.stopResolve = null;
      }
    };
  }

  startListening(): void {
    if (!this.recognition) return;
    this.accumulatedTranscript = '';
    this.isListening = true;
    this.recognition.start();
  }

  stopListening(): Promise<string> {
    return new Promise<string>((resolve) => {
      if (!this.recognition || !this.isListening) {
        resolve(this.accumulatedTranscript);
        return;
      }

      this.stopResolve = resolve;
      this.isListening = false;
      this.recognition.stop();
    });
  }

  onTranscript(callback: (result: STTTranscriptResult) => void): void {
    this.transcriptCallback = callback;
  }
}
