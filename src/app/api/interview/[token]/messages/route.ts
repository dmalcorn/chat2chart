import { NextResponse } from 'next/server';
import { validateTokenFormat } from '@/lib/interview/token';
import { sendMessageSchema } from '@/lib/schema/api-requests';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getProjectById,
  getInterviewExchangesByInterviewId,
  createInterviewExchange,
  getMaxSequenceNumber,
} from '@/lib/db/queries';
import { loadSkill } from '@/lib/interview/skill-loader';
import { assembleInterviewPrompt } from '@/lib/ai/prompts/prompt-assembler';
import { resolveProvider } from '@/lib/ai';
import type { Message } from '@/lib/ai';

const REFLECTIVE_SUMMARY_MARKER = '[REFLECTIVE_SUMMARY]';
const MARKER_BUFFER_LENGTH = REFLECTIVE_SUMMARY_MARKER.length + 5;
const MAX_SEQUENCE_RETRIES = 3;

function detectExchangeType(content: string): {
  exchangeType: 'question' | 'reflective_summary';
  cleanContent: string;
} {
  const trimmed = content.trimStart();
  if (trimmed.startsWith(REFLECTIVE_SUMMARY_MARKER)) {
    return {
      exchangeType: 'reflective_summary',
      cleanContent: trimmed.slice(REFLECTIVE_SUMMARY_MARKER.length).trimStart(),
    };
  }
  return { exchangeType: 'question', cleanContent: content };
}

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function persistExchangeWithRetry(data: {
  interviewId: string;
  segmentId: string;
  sequenceNumber: number;
  exchangeType: 'question' | 'response' | 'reflective_summary' | 'confirmation' | 'revised_summary';
  speaker: 'agent' | 'interviewee';
  content: string;
}) {
  for (let attempt = 0; attempt < MAX_SEQUENCE_RETRIES; attempt++) {
    try {
      return await createInterviewExchange(data);
    } catch (error: unknown) {
      const isUniqueViolation =
        error instanceof Error && error.message.includes('uq_interview_exchanges_sequence');
      if (!isUniqueViolation || attempt === MAX_SEQUENCE_RETRIES - 1) throw error;
      const freshMax = await getMaxSequenceNumber(data.interviewId);
      data = { ...data, sequenceNumber: freshMax + 1 };
    }
  }
  throw new Error('Failed to persist exchange after retries');
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!validateTokenFormat(token)) {
      return NextResponse.json(
        {
          error: {
            message: "This link isn't valid. Contact the person who sent it to you.",
            code: 'INVALID_TOKEN',
          },
        },
        { status: 404 },
      );
    }

    const tokenRow = await getInterviewTokenByToken(token);
    if (!tokenRow) {
      return NextResponse.json(
        {
          error: {
            message: "This link isn't valid. Contact the person who sent it to you.",
            code: 'INVALID_TOKEN',
          },
        },
        { status: 404 },
      );
    }

    const interview = await getInterviewByTokenId(tokenRow.id);
    if (!interview || interview.status !== 'active') {
      return NextResponse.json(
        {
          error: {
            message: 'Interview is not active',
            code: 'INTERVIEW_NOT_ACTIVE',
          },
        },
        { status: 400 },
      );
    }

    // P2: Handle malformed JSON gracefully
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            message: 'Request body must be valid JSON',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      );
    }

    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: parsed.error.issues[0]?.message ?? 'Invalid request body',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 },
      );
    }

    const { message } = parsed.data;

    const project = await getProjectById(tokenRow.projectId);
    if (!project) {
      return NextResponse.json(
        {
          error: {
            message: 'An unexpected error occurred',
            code: 'INTERNAL_ERROR',
          },
        },
        { status: 500 },
      );
    }

    // Load conversation history
    const exchanges = await getInterviewExchangesByInterviewId(interview.id);
    const conversation: Message[] = exchanges.map((ex) => ({
      role: ex.speaker === 'agent' ? ('assistant' as const) : ('user' as const),
      content: ex.content,
    }));

    // Determine segment and sequence
    const maxSeq = await getMaxSequenceNumber(interview.id);
    const userSequence = maxSeq + 1;

    // Determine segment: reuse last segment if it exists, or generate new
    const lastExchange = exchanges[exchanges.length - 1];
    const segmentId =
      lastExchange && lastExchange.exchangeType !== 'confirmation'
        ? lastExchange.segmentId
        : crypto.randomUUID();

    // P1+P3: Persist user message with retry for sequence conflicts
    await persistExchangeWithRetry({
      interviewId: interview.id,
      segmentId,
      sequenceNumber: userSequence,
      exchangeType: 'response',
      speaker: 'interviewee',
      content: message,
    });

    // Add user message to conversation for LLM
    conversation.push({ role: 'user', content: message });

    // Load skill and assemble prompt
    const skill = await loadSkill(project.skillName);
    const systemPrompt = assembleInterviewPrompt(skill);

    // Resolve LLM provider
    const provider = await resolveProvider(project.id, 'interview_agent');

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          let buffer = '';
          let markerDetected = false;
          let exchangeType: 'question' | 'reflective_summary' = 'question';
          let typeEmitted = false;

          for await (const token of provider.streamResponse(systemPrompt, conversation)) {
            fullResponse += token;

            // P8: Buffer initial tokens to detect and strip the marker
            if (!typeEmitted) {
              buffer += token;
              if (buffer.trimStart().startsWith(REFLECTIVE_SUMMARY_MARKER)) {
                markerDetected = true;
                exchangeType = 'reflective_summary';
                // Strip marker from buffer and emit type event
                const cleanBuffer = buffer
                  .trimStart()
                  .slice(REFLECTIVE_SUMMARY_MARKER.length)
                  .trimStart();
                controller.enqueue(
                  encoder.encode(sseEncode('type', { exchangeType: 'reflective_summary' })),
                );
                typeEmitted = true;
                if (cleanBuffer.length > 0) {
                  controller.enqueue(
                    encoder.encode(sseEncode('message', { content: cleanBuffer })),
                  );
                }
              } else if (buffer.length >= MARKER_BUFFER_LENGTH) {
                // Buffer is long enough — no marker present
                exchangeType = 'question';
                controller.enqueue(encoder.encode(sseEncode('type', { exchangeType: 'question' })));
                typeEmitted = true;
                controller.enqueue(encoder.encode(sseEncode('message', { content: buffer })));
              }
              // Still buffering — don't emit yet
            } else {
              controller.enqueue(encoder.encode(sseEncode('message', { content: token })));
            }
          }

          // Flush remaining buffer if type was never emitted (very short response)
          if (!typeEmitted) {
            const detected = detectExchangeType(buffer);
            exchangeType = detected.exchangeType;
            controller.enqueue(encoder.encode(sseEncode('type', { exchangeType })));
            controller.enqueue(
              encoder.encode(sseEncode('message', { content: detected.cleanContent })),
            );
          }

          // Determine clean content for persistence
          const { cleanContent } = markerDetected
            ? detectExchangeType(fullResponse)
            : { cleanContent: fullResponse };

          // P1: Persist agent response with retry for sequence conflicts
          const agentSequence = userSequence + 1;
          const agentExchange = await persistExchangeWithRetry({
            interviewId: interview.id,
            segmentId,
            sequenceNumber: agentSequence,
            exchangeType,
            speaker: 'agent',
            content: cleanContent,
          });

          controller.enqueue(
            encoder.encode(
              sseEncode('done', {
                interviewExchangeId: agentExchange.id,
                segmentId,
                exchangeType,
              }),
            ),
          );
        } catch (error) {
          console.error('LLM streaming error:', error);
          controller.enqueue(
            encoder.encode(
              sseEncode('error', {
                message: 'The AI agent is temporarily unavailable.',
                code: 'LLM_ERROR',
              }),
            ),
          );
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Interview message route error:', error);
    return NextResponse.json(
      {
        error: {
          message: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
