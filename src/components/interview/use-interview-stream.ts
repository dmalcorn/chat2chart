'use client';

import { useReducer, useCallback } from 'react';

// --- Types ---

const INTERVIEW_COMPLETE_MARKER = '[INTERVIEW_COMPLETE]';

export type MessageType =
  | 'agent_question'
  | 'speech_card'
  | 'reflective_summary'
  | 'typing_indicator'
  | 'processing_indicator'
  | 'system_error';

export type SummaryState =
  | 'streaming'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'correction_requested';

export interface ThreadMessage {
  id: string;
  type: MessageType;
  content: string;
  segmentId: string;
  summaryState?: SummaryState;
  timestamp: string;
}

export interface ThreadState {
  messages: ThreadMessage[];
  isAutoScrollEnabled: boolean;
  isAgentTyping: boolean;
  isProcessingSpeech: boolean;
  confirmedCycleCount: number;
  completionSuggested: boolean;
}

// --- Actions ---

type ThreadAction =
  | { type: 'ADD_MESSAGE'; payload: ThreadMessage }
  | { type: 'PATCH_MESSAGE'; payload: { id: string; patch: Partial<ThreadMessage> } }
  | { type: 'SET_SUMMARY_STATE_BY_ID'; payload: { id: string; summaryState: SummaryState } }
  | {
      type: 'SET_SUMMARY_STATE_BY_SEGMENT';
      payload: { segmentId: string; summaryState: SummaryState };
    }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_AUTO_SCROLL'; payload: boolean }
  | { type: 'APPEND_STREAMING_CONTENT'; payload: { id: string; content: string } }
  | { type: 'INCREMENT_CONFIRMED_CYCLES' }
  | { type: 'SET_COMPLETION_SUGGESTED'; payload: boolean }
  | { type: 'STRIP_MARKER'; payload: { id: string; marker: string } };

// --- Reducer ---

export function threadReducer(state: ThreadState, action: ThreadAction): ThreadState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'PATCH_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload.patch } : m,
        ),
      };
    case 'SET_SUMMARY_STATE_BY_ID':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? { ...m, summaryState: action.payload.summaryState } : m,
        ),
      };
    case 'SET_SUMMARY_STATE_BY_SEGMENT':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.segmentId === action.payload.segmentId && m.type === 'reflective_summary'
            ? { ...m, summaryState: action.payload.summaryState }
            : m,
        ),
      };
    case 'SET_TYPING':
      return { ...state, isAgentTyping: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessingSpeech: action.payload };
    case 'SET_AUTO_SCROLL':
      return { ...state, isAutoScrollEnabled: action.payload };
    case 'APPEND_STREAMING_CONTENT':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id ? { ...m, content: m.content + action.payload.content } : m,
        ),
      };
    case 'INCREMENT_CONFIRMED_CYCLES':
      return { ...state, confirmedCycleCount: state.confirmedCycleCount + 1 };
    case 'SET_COMPLETION_SUGGESTED':
      return { ...state, completionSuggested: action.payload };
    case 'STRIP_MARKER':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.payload.id
            ? { ...m, content: m.content.replace(action.payload.marker, '').trimEnd() }
            : m,
        ),
      };
    default:
      return state;
  }
}

const initialState: ThreadState = {
  messages: [],
  isAutoScrollEnabled: true,
  isAgentTyping: false,
  isProcessingSpeech: false,
  confirmedCycleCount: 0,
  completionSuggested: false,
};

// --- SSE Parser ---

interface SSEEvent {
  event: string;
  data: string;
}

function parseSSEChunk(text: string): { events: SSEEvent[]; remainder: string } {
  const events: SSEEvent[] = [];
  // Split on double newline — each block is one SSE event
  const parts = text.split('\n\n');
  // The last part may be incomplete
  const remainder = parts.pop() ?? '';

  for (const block of parts) {
    if (!block.trim()) continue;
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) {
        event = line.slice(7);
      } else if (line.startsWith('data: ')) {
        data = line.slice(6);
      }
    }
    if (data) {
      events.push({ event, data });
    }
  }
  return { events, remainder };
}

// --- Hook ---

export function useInterviewStream(token: string) {
  const [state, dispatch] = useReducer(threadReducer, initialState);

  const sendMessage = useCallback(
    async (content: string) => {
      // Add the user's speech card
      const speechId = crypto.randomUUID();
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: speechId,
          type: 'speech_card',
          content,
          segmentId: '',
          timestamp: new Date().toISOString(),
        },
      });

      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_TYPING', payload: true });

      try {
        const response = await fetch(`/api/interview/${token}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        });

        if (!response.ok || !response.body) {
          dispatch({ type: 'SET_TYPING', payload: false });
          dispatch({ type: 'SET_PROCESSING', payload: false });
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: crypto.randomUUID(),
              type: 'system_error',
              content: 'The AI agent is temporarily unavailable.',
              segmentId: '',
              timestamp: new Date().toISOString(),
            },
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let activeMessageId: string | null = null;
        let activeMessageType: MessageType | null = null;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseSSEChunk(buffer);
          buffer = remainder;

          for (const sseEvent of events) {
            if (sseEvent.event === 'type') {
              const parsed = JSON.parse(sseEvent.data) as {
                exchangeType: string;
              };
              activeMessageType =
                parsed.exchangeType === 'reflective_summary'
                  ? 'reflective_summary'
                  : 'agent_question';
            } else if (sseEvent.event === 'message') {
              const parsed = JSON.parse(sseEvent.data) as { content: string };

              if (!activeMessageId) {
                dispatch({ type: 'SET_TYPING', payload: false });
                dispatch({ type: 'SET_PROCESSING', payload: false });

                // Use type from prior 'type' event, default to agent_question
                if (!activeMessageType) {
                  activeMessageType = 'agent_question';
                }

                activeMessageId = crypto.randomUUID();
                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: {
                    id: activeMessageId,
                    type: activeMessageType,
                    content: parsed.content,
                    segmentId: '',
                    summaryState:
                      activeMessageType === 'reflective_summary' ? 'streaming' : undefined,
                    timestamp: new Date().toISOString(),
                  },
                });
              } else {
                dispatch({
                  type: 'APPEND_STREAMING_CONTENT',
                  payload: { id: activeMessageId, content: parsed.content },
                });
              }
            } else if (sseEvent.event === 'done') {
              const parsed = JSON.parse(sseEvent.data) as {
                interviewExchangeId: string;
                segmentId: string;
                exchangeType: string;
                completionSuggested?: boolean;
              };

              // Patch segmentId onto the speech card and agent message
              dispatch({
                type: 'PATCH_MESSAGE',
                payload: { id: speechId, patch: { segmentId: parsed.segmentId } },
              });

              if (activeMessageId) {
                // P2: Strip completion marker from displayed content
                if (parsed.completionSuggested) {
                  dispatch({
                    type: 'PATCH_MESSAGE',
                    payload: {
                      id: activeMessageId,
                      patch: { segmentId: parsed.segmentId },
                    },
                  });
                  // Remove marker text that was streamed to the client
                  dispatch({
                    type: 'STRIP_MARKER',
                    payload: { id: activeMessageId, marker: INTERVIEW_COMPLETE_MARKER },
                  });
                } else {
                  dispatch({
                    type: 'PATCH_MESSAGE',
                    payload: { id: activeMessageId, patch: { segmentId: parsed.segmentId } },
                  });
                }

                // If it was a reflective summary, transition to awaiting confirmation
                if (activeMessageType === 'reflective_summary') {
                  dispatch({
                    type: 'SET_SUMMARY_STATE_BY_ID',
                    payload: { id: activeMessageId, summaryState: 'awaiting_confirmation' },
                  });
                }
              }

              // Agent-driven completion detection
              if (parsed.completionSuggested) {
                dispatch({ type: 'SET_COMPLETION_SUGGESTED', payload: true });
              }

              dispatch({ type: 'SET_TYPING', payload: false });
              dispatch({ type: 'SET_PROCESSING', payload: false });
              activeMessageId = null;
              activeMessageType = null;
            } else if (sseEvent.event === 'error') {
              const parsed = JSON.parse(sseEvent.data) as {
                message: string;
                code: string;
              };
              dispatch({ type: 'SET_TYPING', payload: false });
              dispatch({ type: 'SET_PROCESSING', payload: false });
              dispatch({
                type: 'ADD_MESSAGE',
                payload: {
                  id: crypto.randomUUID(),
                  type: 'system_error',
                  content: parsed.message,
                  segmentId: '',
                  timestamp: new Date().toISOString(),
                },
              });
              activeMessageId = null;
              activeMessageType = null;
            }
          }
        }
      } catch {
        dispatch({ type: 'SET_TYPING', payload: false });
        dispatch({ type: 'SET_PROCESSING', payload: false });
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: crypto.randomUUID(),
            type: 'system_error',
            content: 'The AI agent is temporarily unavailable.',
            segmentId: '',
            timestamp: new Date().toISOString(),
          },
        });
      }
    },
    [token],
  );

  const confirmSummary = useCallback(
    async (segmentId: string) => {
      try {
        const response = await fetch(`/api/interview/${token}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'confirmed', exchangeType: 'confirmation' }),
        });

        if (!response.ok || !response.body) {
          // User can retry
          return;
        }

        dispatch({
          type: 'SET_SUMMARY_STATE_BY_SEGMENT',
          payload: { segmentId, summaryState: 'confirmed' },
        });
        dispatch({ type: 'INCREMENT_CONFIRMED_CYCLES' });

        // D2: Consume the SSE stream — agent sends a follow-up question
        dispatch({ type: 'SET_TYPING', payload: true });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let activeMessageId: string | null = null;
        let activeMessageType: MessageType | null = null;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseSSEChunk(buffer);
          buffer = remainder;

          for (const sseEvent of events) {
            if (sseEvent.event === 'type') {
              const parsed = JSON.parse(sseEvent.data) as { exchangeType: string };
              activeMessageType =
                parsed.exchangeType === 'reflective_summary'
                  ? 'reflective_summary'
                  : 'agent_question';
            } else if (sseEvent.event === 'message') {
              const parsed = JSON.parse(sseEvent.data) as { content: string };
              if (!activeMessageId) {
                dispatch({ type: 'SET_TYPING', payload: false });
                if (!activeMessageType) activeMessageType = 'agent_question';
                activeMessageId = crypto.randomUUID();
                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: {
                    id: activeMessageId,
                    type: activeMessageType,
                    content: parsed.content,
                    segmentId: '',
                    summaryState:
                      activeMessageType === 'reflective_summary' ? 'streaming' : undefined,
                    timestamp: new Date().toISOString(),
                  },
                });
              } else {
                dispatch({
                  type: 'APPEND_STREAMING_CONTENT',
                  payload: { id: activeMessageId, content: parsed.content },
                });
              }
            } else if (sseEvent.event === 'done') {
              const parsed = JSON.parse(sseEvent.data) as {
                interviewExchangeId: string;
                segmentId: string;
                completionSuggested?: boolean;
              };
              if (activeMessageId) {
                dispatch({
                  type: 'PATCH_MESSAGE',
                  payload: { id: activeMessageId, patch: { segmentId: parsed.segmentId } },
                });
                if (activeMessageType === 'reflective_summary') {
                  dispatch({
                    type: 'SET_SUMMARY_STATE_BY_ID',
                    payload: { id: activeMessageId, summaryState: 'awaiting_confirmation' },
                  });
                }
              }
              if (parsed.completionSuggested) {
                dispatch({ type: 'SET_COMPLETION_SUGGESTED', payload: true });
              }
              dispatch({ type: 'SET_TYPING', payload: false });
              activeMessageId = null;
              activeMessageType = null;
            } else if (sseEvent.event === 'error') {
              dispatch({ type: 'SET_TYPING', payload: false });
              activeMessageId = null;
              activeMessageType = null;
            }
          }
        }
      } catch {
        dispatch({ type: 'SET_TYPING', payload: false });
      }
    },
    [token],
  );

  const requestCorrection = useCallback(
    async (segmentId: string) => {
      dispatch({
        type: 'SET_SUMMARY_STATE_BY_SEGMENT',
        payload: { segmentId, summaryState: 'correction_requested' },
      });
      dispatch({ type: 'SET_TYPING', payload: true });

      try {
        const response = await fetch(`/api/interview/${token}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: "That's not quite right. Please revise your summary.",
            exchangeType: 'confirmation',
          }),
        });

        if (!response.ok || !response.body) {
          dispatch({ type: 'SET_TYPING', payload: false });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let activeMessageId: string | null = null;
        let activeMessageType: MessageType | null = null;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, remainder } = parseSSEChunk(buffer);
          buffer = remainder;

          for (const sseEvent of events) {
            if (sseEvent.event === 'type') {
              const parsed = JSON.parse(sseEvent.data) as { exchangeType: string };
              activeMessageType =
                parsed.exchangeType === 'reflective_summary'
                  ? 'reflective_summary'
                  : 'agent_question';
            } else if (sseEvent.event === 'message') {
              const parsed = JSON.parse(sseEvent.data) as { content: string };

              if (!activeMessageId) {
                dispatch({ type: 'SET_TYPING', payload: false });
                // Corrections expect a revised summary from the agent
                if (!activeMessageType) activeMessageType = 'reflective_summary';
                activeMessageId = crypto.randomUUID();
                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: {
                    id: activeMessageId,
                    type: activeMessageType,
                    content: parsed.content,
                    segmentId,
                    summaryState:
                      activeMessageType === 'reflective_summary' ? 'streaming' : undefined,
                    timestamp: new Date().toISOString(),
                  },
                });
              } else {
                dispatch({
                  type: 'APPEND_STREAMING_CONTENT',
                  payload: { id: activeMessageId, content: parsed.content },
                });
              }
            } else if (sseEvent.event === 'done') {
              const parsed = JSON.parse(sseEvent.data) as {
                interviewExchangeId: string;
                segmentId: string;
                completionSuggested?: boolean;
              };
              if (activeMessageId) {
                dispatch({
                  type: 'PATCH_MESSAGE',
                  payload: { id: activeMessageId, patch: { segmentId: parsed.segmentId } },
                });
                if (activeMessageType === 'reflective_summary') {
                  dispatch({
                    type: 'SET_SUMMARY_STATE_BY_ID',
                    payload: { id: activeMessageId, summaryState: 'awaiting_confirmation' },
                  });
                }
              }
              if (parsed.completionSuggested) {
                dispatch({ type: 'SET_COMPLETION_SUGGESTED', payload: true });
              }
              dispatch({ type: 'SET_TYPING', payload: false });
              activeMessageId = null;
              activeMessageType = null;
            } else if (sseEvent.event === 'error') {
              dispatch({ type: 'SET_TYPING', payload: false });
              // Clean up partially-added card stuck in streaming state
              if (activeMessageId) {
                dispatch({
                  type: 'SET_SUMMARY_STATE_BY_ID',
                  payload: { id: activeMessageId, summaryState: 'awaiting_confirmation' },
                });
              }
              activeMessageId = null;
              activeMessageType = null;
            }
          }
        }
      } catch {
        dispatch({ type: 'SET_TYPING', payload: false });
      }
    },
    [token],
  );

  const completeInterview = useCallback(async (): Promise<{
    success: boolean;
    schemaReady?: boolean;
  }> => {
    try {
      const response = await fetch(`/api/interview/${token}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        return { success: false };
      }

      const body = await response.json();
      return { success: true, schemaReady: body.data?.schemaReady };
    } catch {
      return { success: false };
    }
  }, [token]);

  return {
    messages: state.messages,
    isAgentTyping: state.isAgentTyping,
    isProcessingSpeech: state.isProcessingSpeech,
    confirmedCycleCount: state.confirmedCycleCount,
    completionSuggested: state.completionSuggested,
    sendMessage,
    confirmSummary,
    requestCorrection,
    completeInterview,
    dispatch,
  };
}
