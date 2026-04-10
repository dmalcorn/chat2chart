import { NextResponse } from 'next/server';
import { validateTokenFormat } from '@/lib/interview/token';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getVerifiedExchangesByInterviewId,
  createIndividualProcessSchema,
} from '@/lib/db/queries';
import { transitionInterview, InvalidStateTransitionError } from '@/lib/synthesis/state-machine';
import { extractProcessSchema } from '@/lib/interview/schema-extractor';
import type { VerifiedSummary, ExtractionContext } from '@/lib/interview/schema-extractor';
import { generateIndividualMermaid } from '@/lib/interview/individual-mermaid-generator';

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

    if (!interview) {
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

    if (interview.status !== 'active') {
      return NextResponse.json(
        {
          error: {
            message: 'Interview is not active',
            code: 'INTERVIEW_NOT_ACTIVE',
          },
        },
        { status: 409 },
      );
    }

    // P8: Server-side minimum cycle count validation
    const verifiedExchanges = await getVerifiedExchangesByInterviewId(interview.id);
    if (verifiedExchanges.length < 2) {
      return NextResponse.json(
        {
          error: {
            message: 'Interview requires at least 2 confirmed exchanges before completion',
            code: 'INSUFFICIENT_EXCHANGES',
          },
        },
        { status: 422 },
      );
    }

    // Transition active → completed
    await transitionInterview(interview.id, 'completed');

    // Trigger schema extraction pipeline
    let schemaReady = false;

    try {
      const summaries: VerifiedSummary[] = verifiedExchanges.map((ex) => ({
        exchangeId: ex.id,
        segmentId: ex.segmentId,
        content: ex.content,
        sequenceNumber: ex.sequenceNumber,
      }));

      const context: ExtractionContext = {
        interviewId: interview.id,
        processNodeId: interview.processNodeId,
        projectId: interview.projectId,
      };

      const schema = await extractProcessSchema(summaries, context);
      const mermaidDefinition = generateIndividualMermaid(schema);

      await createIndividualProcessSchema({
        interviewId: interview.id,
        processNodeId: interview.processNodeId,
        schemaJson: schema,
        mermaidDefinition,
        validationStatus: 'pending_review',
        extractionMethod: schema.metadata.extractionMethod,
      });

      // P1: Only transition to validating after successful extraction
      await transitionInterview(interview.id, 'validating');
      schemaReady = true;
    } catch (extractionError) {
      console.error('Schema extraction failed:', extractionError);
      // Extraction failure is non-fatal — interview remains in completed state
    }

    return NextResponse.json({
      data: {
        status: 'completed',
        schemaReady,
      },
    });
  } catch (error) {
    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json(
        {
          error: {
            message: 'Interview is not active',
            code: 'INTERVIEW_NOT_ACTIVE',
          },
        },
        { status: 409 },
      );
    }

    console.error('Interview complete route error:', error);
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
