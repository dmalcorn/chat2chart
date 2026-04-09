import { NextResponse } from 'next/server';
import { validateTokenFormat } from '@/lib/interview/token';
import { correctionRequestSchema } from '@/lib/schema/api-requests';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getIndividualProcessSchemaByInterviewId,
  updateIndividualProcessSchema,
} from '@/lib/db/queries';
import { streamCorrectedSchema } from '@/lib/interview/correction-agent';
import { generateIndividualMermaid } from '@/lib/interview/individual-mermaid-generator';
import { individualProcessSchemaSchema } from '@/lib/schema/workflow';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Validate token
  if (!validateTokenFormat(token)) {
    return NextResponse.json(
      { error: { message: 'Invalid token format', code: 'INVALID_TOKEN' } },
      { status: 404 },
    );
  }

  const tokenRow = await getInterviewTokenByToken(token);
  if (!tokenRow) {
    return NextResponse.json(
      { error: { message: 'Token not found', code: 'INVALID_TOKEN' } },
      { status: 404 },
    );
  }

  const interview = await getInterviewByTokenId(tokenRow.id);
  if (!interview || interview.status !== 'validating') {
    return NextResponse.json(
      {
        error: {
          message: 'Interview is not in a state that allows corrections',
          code: 'INVALID_STATE',
        },
      },
      { status: 400 },
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body', code: 'VALIDATION_ERROR' } },
      { status: 400 },
    );
  }

  const parseResult = correctionRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: { message: 'Invalid request body', code: 'VALIDATION_ERROR' } },
      { status: 400 },
    );
  }

  const { errorDescription, currentSchema } = parseResult.data;

  // Stream SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let accumulated = '';

        for await (const token of streamCorrectedSchema({
          currentSchema,
          errorDescription,
          projectId: interview.projectId,
        })) {
          accumulated += token;
          const event = `event: message\ndata: ${JSON.stringify({ content: token, exchangeType: 'correction' })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }

        // Parse the final schema from accumulated response
        const jsonMatch = accumulated.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = (jsonMatch?.[1] ?? accumulated).trim();
        const parsed = JSON.parse(jsonStr);
        const validated = individualProcessSchemaSchema.parse(parsed);

        // Regenerate Mermaid from corrected schema
        const mermaidDef = generateIndividualMermaid(validated);

        // Update the DB
        const existingSchema = await getIndividualProcessSchemaByInterviewId(interview.id);
        if (existingSchema) {
          await updateIndividualProcessSchema(existingSchema.id, {
            schemaJson: validated,
            mermaidDefinition: mermaidDef,
            validationStatus: 'pending',
          });
        }

        // Send schema event
        const schemaEvent = `event: schema\ndata: ${JSON.stringify({ schema: validated, mermaidDefinition: mermaidDef })}\n\n`;
        controller.enqueue(encoder.encode(schemaEvent));

        // Done event
        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      } catch (error) {
        console.error('[correction-route] Error:', error);
        const errorEvent = `event: error\ndata: ${JSON.stringify({ message: 'The AI agent is temporarily unavailable. Please try again.', code: 'LLM_ERROR' })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
