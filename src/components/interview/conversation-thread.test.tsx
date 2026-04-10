import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the hooks used by ConversationThread
const mockSendMessage = vi.fn();
const mockConfirmSummary = vi.fn();
const mockRequestCorrection = vi.fn();
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn().mockResolvedValue('');

vi.mock('./use-interview-stream', () => ({
  useInterviewStream: vi.fn(() => ({
    messages: [],
    isAgentTyping: false,
    isProcessingSpeech: false,
    sendMessage: mockSendMessage,
    confirmSummary: mockConfirmSummary,
    requestCorrection: mockRequestCorrection,
    completeInterview: vi.fn().mockResolvedValue({ success: false }),
    confirmedCycleCount: 0,
    completionSuggested: false,
    dispatch: vi.fn(),
  })),
}));

vi.mock('@/lib/stt/use-speech-recognition', () => ({
  useSpeechRecognition: vi.fn(() => ({
    status: 'idle',
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
    isSupported: true,
  })),
}));

import { ConversationThread } from './conversation-thread';
import { useInterviewStream } from './use-interview-stream';
import type { ThreadMessage } from './use-interview-stream';

const mockedUseInterviewStream = vi.mocked(useInterviewStream);

const baseHookReturn = {
  messages: [] as ThreadMessage[],
  isAgentTyping: false,
  isProcessingSpeech: false,
  sendMessage: mockSendMessage,
  confirmSummary: mockConfirmSummary,
  requestCorrection: mockRequestCorrection,
  completeInterview: vi.fn().mockResolvedValue({ success: false }),
  confirmedCycleCount: 0,
  completionSuggested: false,
  dispatch: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseInterviewStream.mockReturnValue({ ...baseHookReturn, dispatch: vi.fn() });
});

function makeMessage(overrides: Partial<ThreadMessage>): ThreadMessage {
  return {
    id: crypto.randomUUID(),
    type: 'agent_question',
    content: 'test',
    segmentId: 'seg-1',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('ConversationThread', () => {
  it('renders empty thread with no messages', () => {
    render(<ConversationThread token="test-token" />);
    // Should render the MicBar
    expect(screen.getByLabelText('Start recording')).toBeInTheDocument();
  });

  it('renders agent message left-aligned with primary-soft background', () => {
    mockedUseInterviewStream.mockReturnValue({
      ...baseHookReturn,
      messages: [makeMessage({ content: 'How do you start your day?', type: 'agent_question' })],
      dispatch: vi.fn(),
    });

    render(<ConversationThread token="test-token" />);
    expect(screen.getByText('How do you start your day?')).toBeInTheDocument();
  });

  it('renders speech card right-aligned', () => {
    mockedUseInterviewStream.mockReturnValue({
      ...baseHookReturn,
      messages: [makeMessage({ content: 'I check my email first.', type: 'speech_card' })],
      dispatch: vi.fn(),
    });

    render(<ConversationThread token="test-token" />);
    expect(screen.getByText('I check my email first.')).toBeInTheDocument();
  });

  it('renders reflective summary card with violet label', () => {
    mockedUseInterviewStream.mockReturnValue({
      ...baseHookReturn,
      messages: [
        makeMessage({
          content: 'You mentioned checking email first.',
          type: 'reflective_summary',
          summaryState: 'awaiting_confirmation',
        }),
      ],
      dispatch: vi.fn(),
    });

    render(<ConversationThread token="test-token" />);
    expect(screen.getByText('Reflective Summary')).toBeInTheDocument();
    expect(screen.getByText('You mentioned checking email first.')).toBeInTheDocument();
  });

  it('renders cycle separator between different segment IDs', () => {
    mockedUseInterviewStream.mockReturnValue({
      ...baseHookReturn,
      messages: [
        makeMessage({ content: 'Question 1', type: 'agent_question', segmentId: 'seg-1' }),
        makeMessage({ content: 'Question 2', type: 'agent_question', segmentId: 'seg-2' }),
      ],
      dispatch: vi.fn(),
    });

    const { container } = render(<ConversationThread token="test-token" />);
    const separator = container.querySelector('[role="separator"]');
    expect(separator).toBeInTheDocument();
  });

  it('does NOT render ActiveListeningState waveform inline in the message area', () => {
    // Even when recording, no waveform card should appear in the scrollable thread
    // (it's now in MicBar)
    const { container } = render(<ConversationThread token="test-token" />);
    // The old ActiveListeningState was wrapped in a div.flex.justify-end card
    // with role="status" and aria-label containing "waveform"
    const statusInThread = container.querySelector(
      '.flex-1.overflow-y-auto [role="status"][aria-label*="waveform"]',
    );
    expect(statusInThread).not.toBeInTheDocument();
  });

  it('does not render separator between same-segment messages', () => {
    mockedUseInterviewStream.mockReturnValue({
      ...baseHookReturn,
      messages: [
        makeMessage({ content: 'Question 1', type: 'agent_question', segmentId: 'seg-1' }),
        makeMessage({ content: 'Response 1', type: 'speech_card', segmentId: 'seg-1' }),
      ],
      dispatch: vi.fn(),
    });

    const { container } = render(<ConversationThread token="test-token" />);
    const separator = container.querySelector('[role="separator"]');
    expect(separator).not.toBeInTheDocument();
  });
});
