import { NextRequest, NextResponse } from 'next/server';
import { withSupervisorAuth } from '@/lib/auth/middleware';
import {
  getProcessNodeById,
  getSynthesisResultByNodeId,
  getIndividualSchemasByNodeIdWithInterviewees,
  isSupervisorForProject,
} from '@/lib/db/queries';
import { runSynthesisPipeline, SynthesisError } from '@/lib/synthesis/engine';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return withSupervisorAuth(async (_req, session) => {
    try {
      const { nodeId } = await params;

      // Validate nodeId format
      if (!UUID_REGEX.test(nodeId)) {
        return NextResponse.json(
          { error: { message: 'Invalid node ID format', code: 'VALIDATION_ERROR' } },
          { status: 400 },
        );
      }

      // Look up process node
      const node = await getProcessNodeById(nodeId);
      if (!node) {
        return NextResponse.json(
          { error: { message: 'Process node not found', code: 'NODE_NOT_FOUND' } },
          { status: 404 },
        );
      }

      // Verify supervisor has access to this project
      const hasAccess = await isSupervisorForProject(session.userId, node.projectId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
          { status: 403 },
        );
      }

      // Look up latest synthesis result
      const synthesisResult = await getSynthesisResultByNodeId(nodeId);
      if (!synthesisResult) {
        return NextResponse.json(
          {
            error: {
              message: 'No synthesis results available for this process node',
              code: 'SYNTHESIS_NOT_FOUND',
            },
          },
          { status: 404 },
        );
      }

      // Look up individual schemas with interviewee info
      const individualSchemas = await getIndividualSchemasByNodeIdWithInterviewees(nodeId);

      return NextResponse.json({
        data: {
          synthesis: {
            id: synthesisResult.id,
            processNodeId: synthesisResult.processNodeId,
            synthesisVersion: synthesisResult.synthesisVersion,
            workflowJson: synthesisResult.workflowJson,
            mermaidDefinition: synthesisResult.mermaidDefinition,
            interviewCount: synthesisResult.interviewCount,
            createdAt: synthesisResult.createdAt,
          },
          individualSchemas: individualSchemas.map((schema) => ({
            id: schema.id,
            interviewId: schema.interviewId,
            intervieweeName: schema.intervieweeName,
            intervieweeRole: schema.intervieweeRole,
            schemaJson: schema.schemaJson,
            mermaidDefinition: schema.mermaidDefinition,
            validationStatus: schema.validationStatus,
          })),
        },
      });
    } catch (error) {
      console.error('Synthesis GET route error:', error);
      return NextResponse.json(
        { error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
        { status: 500 },
      );
    }
  })(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  return withSupervisorAuth(async (_req, session) => {
    try {
      const { nodeId } = await params;

      // Validate nodeId format
      if (!UUID_REGEX.test(nodeId)) {
        return NextResponse.json(
          { error: { message: 'Invalid node ID format', code: 'VALIDATION_ERROR' } },
          { status: 400 },
        );
      }

      // Validate node exists and is a leaf
      const node = await getProcessNodeById(nodeId);
      if (!node) {
        return NextResponse.json(
          { error: { message: 'Process node not found', code: 'NODE_NOT_FOUND' } },
          { status: 404 },
        );
      }
      if (node.nodeType !== 'leaf') {
        return NextResponse.json(
          {
            error: {
              message: 'Synthesis can only be run on leaf nodes',
              code: 'INVALID_NODE_TYPE',
            },
          },
          { status: 400 },
        );
      }

      // Verify supervisor has access to this project
      const hasAccess = await isSupervisorForProject(session.userId, node.projectId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
          { status: 403 },
        );
      }

      const result = await runSynthesisPipeline(nodeId, node.projectId);

      return NextResponse.json({ data: result }, { status: 201 });
    } catch (error) {
      if (error instanceof SynthesisError) {
        if (error.code === 'INSUFFICIENT_INTERVIEWS') {
          return NextResponse.json(
            { error: { message: error.message, code: 'INSUFFICIENT_INTERVIEWS' } },
            { status: 400 },
          );
        }
        if (error.code === 'SYNTHESIS_FAILED') {
          return NextResponse.json(
            { error: { message: error.message, code: 'SYNTHESIS_FAILED' } },
            { status: 502 },
          );
        }
        // Other known synthesis errors
        return NextResponse.json(
          { error: { message: error.message, code: error.code } },
          { status: 500 },
        );
      }

      console.error('Synthesis route error:', error);
      return NextResponse.json(
        { error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
        { status: 500 },
      );
    }
  })(request);
}
