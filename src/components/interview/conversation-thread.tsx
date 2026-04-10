'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MicBar } from './mic-bar';
import type { MicBarMode } from './mic-bar';
import { AgentMessageCard } from './agent-message-card';
import { SpeechCard } from './speech-card';
import { ReflectiveSummaryCard } from './reflective-summary-card';
import { TypingIndicator } from './typing-indicator';
import { CycleSeparator } from './cycle-separator';
import { useInterviewStream } from './use-interview-stream';
import { useAutoScroll } from './use-auto-scroll';
import { useSpeechRecognition } from '@/lib/stt/use-speech-recognition';
import { Button } from '@/components/ui/button';

interface ConversationThreadProps {
  token: string;
}

export function ConversationThread({ token }: ConversationThreadProps) {
  const {
    messages,
    isAgentTyping,
    isProcessingSpeech,
    confirmedCycleCount,
    sendMessage,
    confirmSummary,
    requestCorrection,
    completeInterview,
    completionSuggested,
  } = useInterviewStream(token);

  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const completionTriggeredRef = useRef(false);

  // P4: Use ref for latest handleComplete to avoid stale closure in useEffect
  const handleCompleteRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const handleComplete = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setCompletionError(null);
    try {
      const result = await completeInterview();
      if (result.success) {
        // Force a full page reload to let the server component re-render
        // based on the updated interview status
        window.location.reload();
      } else {
        setCompletionError('Something went wrong completing the interview. Please try again.');
        setIsCompleting(false);
        completionTriggeredRef.current = false;
      }
    } catch {
      setCompletionError('Something went wrong completing the interview. Please try again.');
      setIsCompleting(false);
      completionTriggeredRef.current = false;
    }
  }, [completeInterview, isCompleting]);

  handleCompleteRef.current = handleComplete;

  // Auto-trigger completion when agent suggests it
  useEffect(() => {
    if (completionSuggested && !completionTriggeredRef.current && !isCompleting) {
      completionTriggeredRef.current = true;
      handleCompleteRef.current?.();
    }
  }, [completionSuggested, isCompleting]);

  const { status: sttStatus, startRecording, stopRecording, isSupported } = useSpeechRecognition();

  const [isTextMode, setIsTextMode] = useState(false);
  const hasInitializedTextMode = useRef(false);

  // Sync text mode with STT support after hydration
  useEffect(() => {
    if (!hasInitializedTextMode.current) {
      hasInitializedTextMode.current = true;
      if (!isSupported) {
        setIsTextMode(true);
      }
    }
  }, [isSupported]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { sentinelRef } = useAutoScroll(scrollContainerRef, [messages, isAgentTyping]);

  const getMicBarMode = useCallback((): MicBarMode => {
    if (isTextMode) return 'text';
    if (isProcessingSpeech) return 'processing';
    if (sttStatus === 'recording') return 'recording';
    if (sttStatus === 'processing') return 'processing';
    return 'idle';
  }, [isTextMode, isProcessingSpeech, sttStatus]);

  const handleStartRecording = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    const transcript = await stopRecording();
    if (transcript.trim()) {
      sendMessage(transcript);
    }
  }, [stopRecording, sendMessage]);

  const handleToggleTextMode = useCallback(() => {
    setIsTextMode((prev) => !prev);
  }, []);

  const handleSendText = useCallback(
    (text: string) => {
      sendMessage(text);
    },
    [sendMessage],
  );

  // Render messages with separators between different segments
  function renderMessages() {
    const elements: React.ReactNode[] = [];
    let lastSegmentId = '';

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      // Add separator between segments (only when both have a segmentId)
      if (msg.segmentId && lastSegmentId && msg.segmentId !== lastSegmentId) {
        elements.push(<CycleSeparator key={`sep-${i}`} />);
      }

      if (msg.segmentId) {
        lastSegmentId = msg.segmentId;
      }

      switch (msg.type) {
        case 'agent_question':
          elements.push(<AgentMessageCard key={msg.id} content={msg.content} />);
          break;
        case 'system_error':
          elements.push(
            <div key={msg.id} className="flex justify-start">
              <div
                className="max-w-[75%] rounded-lg border px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'var(--destructive-soft)',
                  borderColor: 'var(--destructive)',
                  color: 'var(--destructive)',
                }}
                role="alert"
              >
                <p>{msg.content}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    // Find the last speech_card before this error and resend
                    const lastSpeech = messages
                      .slice(0, i)
                      .reverse()
                      .find((m) => m.type === 'speech_card');
                    if (lastSpeech) {
                      sendMessage(lastSpeech.content);
                    }
                  }}
                >
                  Try Again
                </Button>
              </div>
            </div>,
          );
          break;
        case 'speech_card':
          elements.push(
            <SpeechCard
              key={msg.id}
              content={msg.content}
              isProcessing={isProcessingSpeech && i === messages.length - 1}
              timestamp={msg.timestamp}
            />,
          );
          break;
        case 'reflective_summary':
          elements.push(
            <ReflectiveSummaryCard
              key={msg.id}
              content={msg.content}
              summaryState={msg.summaryState ?? 'streaming'}
              segmentId={msg.segmentId}
              isStreaming={msg.summaryState === 'streaming'}
              onConfirm={confirmSummary}
              onCorrect={requestCorrection}
            />,
          );
          break;
        default:
          break;
      }
    }

    return elements;
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Scrollable message area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{
          paddingBottom: sttStatus === 'recording' ? '200px' : '120px',
          transition: 'padding-bottom 200ms ease',
        }}
      >
        <div className="mx-auto flex max-w-[800px] flex-col gap-4 p-4">
          {renderMessages()}

          {/* Typing indicator */}
          {isAgentTyping && <TypingIndicator />}

          {/* Completion error */}
          {completionError && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{
                backgroundColor: 'var(--destructive-soft)',
                borderColor: 'var(--destructive)',
                color: 'var(--destructive)',
              }}
              role="alert"
            >
              {completionError}
            </div>
          )}

          {/* Scroll sentinel */}
          <div ref={sentinelRef} />
        </div>
      </div>

      {/* Fixed MicBar at bottom */}
      <MicBar
        mode={getMicBarMode()}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onToggleTextMode={handleToggleTextMode}
        onSendText={handleSendText}
        disabled={isProcessingSpeech || isCompleting}
        canComplete={confirmedCycleCount >= 2}
        onCompleteInterview={handleComplete}
        isCompleting={isCompleting}
        isRecording={sttStatus === 'recording'}
      />
    </div>
  );
}
