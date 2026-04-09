export interface STTTranscriptResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface STTProvider {
  initialize(config: { apiKey?: string; options?: Record<string, unknown> }): void;
  startListening(): void;
  stopListening(): Promise<string>;
  onTranscript(callback: (result: STTTranscriptResult) => void): void;
}
