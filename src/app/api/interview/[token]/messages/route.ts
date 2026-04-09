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

    const body = await request.json();
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

    // Persist user message immediately (before LLM call)
    await createInterviewExchange({
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
          for await (const token of provider.streamResponse(systemPrompt, conversation)) {
            fullResponse += token;
            // Send interim token — exchangeType determined after full response
            controller.enqueue(encoder.encode(sseEncode('message', { content: token })));
          }

          // Detect exchange type from full response
          const { exchangeType, cleanContent } = detectExchangeType(fullResponse);

          // Persist agent response
          const agentSequence = userSequence + 1;
          const agentExchange = await createInterviewExchange({
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
        Connection: 'keep-alive',
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
