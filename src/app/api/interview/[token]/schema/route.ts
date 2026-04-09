import { NextResponse } from 'next/server';
import { validateTokenFormat } from '@/lib/interview/token';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getVerifiedExchangesByInterviewId,
  getIndividualProcessSchemaByInterviewId,
  createIndividualProcessSchema,
  updateIndividualProcessSchemaValidation,
} from '@/lib/db/queries';
import { extractProcessSchema } from '@/lib/interview/schema-extractor';
import {
  generateIndividualMermaid,
  generateTextAlternative,
} from '@/lib/interview/individual-mermaid-generator';
import { transitionInterview } from '@/lib/synthesis/state-machine';
import type { VerifiedSummary, ExtractionContext } from '@/lib/interview/schema-extractor';
import type { IndividualProcessSchema } from '@/lib/schema/workflow';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

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
    if (!interview) {
      return NextResponse.json(
        {
          error: {
            message: 'No schema available for this interview',
            code: 'SCHEMA_NOT_AVAILABLE',
          },
        },
        { status: 404 },
      );
    }

    const validStatuses = ['completed', 'validating', 'captured'];
    if (!validStatuses.includes(interview.status)) {
      return NextResponse.json(
        {
          error: {
            message: 'No schema available for this interview',
            code: 'SCHEMA_NOT_AVAILABLE',
          },
        },
        { status: 404 },
      );
    }

    // Check if schema already exists
    const existingSchema = await getIndividualProcessSchemaByInterviewId(interview.id);
    if (existingSchema) {
      const schemaJson = existingSchema.schemaJson as IndividualProcessSchema;
      const textAlt = generateTextAlternative(schemaJson);
      return NextResponse.json({
        data: {
          schema: schemaJson,
          mermaidDefinition: existingSchema.mermaidDefinition,
          textAlternative: textAlt,
          validationStatus: existingSchema.validationStatus,
        },
      });
    }

    // Interview is completed but no schema yet — trigger extraction
    const verifiedExchanges = await getVerifiedExchangesByInterviewId(interview.id);

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
    const mermaidDef = generateIndividualMermaid(schema);
    const textAlt = generateTextAlternative(schema);

    // Persist
    await createIndividualProcessSchema({
      interviewId: interview.id,
      processNodeId: interview.processNodeId,
      schemaJson: schema,
      mermaidDefinition: mermaidDef,
      validationStatus: 'pending',
      extractionMethod: schema.metadata.extractionMethod,
    });

    // Transition state: completed -> validating
    await transitionInterview(interview.id, 'validating');

    return NextResponse.json({
      data: {
        schema,
        mermaidDefinition: mermaidDef,
        textAlternative: textAlt,
        validationStatus: 'pending',
      },
    });
  } catch (error) {
    console.error('[schema-route] GET error:', error);
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

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
        { error: { message: 'Interview is not in validating state', code: 'INVALID_STATE' } },
        { status: 400 },
      );
    }

    const schemaRow = await getIndividualProcessSchemaByInterviewId(interview.id);
    if (!schemaRow) {
      return NextResponse.json(
        { error: { message: 'No schema found for this interview', code: 'SCHEMA_NOT_AVAILABLE' } },
        { status: 404 },
      );
    }

    // Confirm validation
    await updateIndividualProcessSchemaValidation(schemaRow.id, 'validated');

    // Transition state: validating -> captured
    await transitionInterview(interview.id, 'captured');

    return NextResponse.json({
      data: { interviewState: 'captured', validationStatus: 'validated' },
    });
  } catch (error) {
    console.error('[schema-route] POST error:', error);
    return NextResponse.json(
      { error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
