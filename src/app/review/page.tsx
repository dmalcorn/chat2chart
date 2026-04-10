import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validateSession } from '@/lib/auth/session';
import {
  getProjectForSupervisor,
  getLeafNodeForProject,
  getSynthesisResultByNodeId,
  getIndividualSchemasByNodeIdWithInterviewees,
} from '@/lib/db/queries';
import { TopBar } from '@/components/shared/top-bar';
import { ReviewContent } from './review-content';
import type { SynthesisData } from '@/components/supervisor/comparison-view';

export default async function ReviewPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie?.value) {
    redirect('/auth/login');
  }

  const session = await validateSession(sessionCookie.value);

  if (!session || session.role !== 'supervisor') {
    redirect('/auth/login');
  }

  const projectInfo = await getProjectForSupervisor(session.userId);
  if (!projectInfo) {
    redirect('/auth/login');
  }

  const leafNode = await getLeafNodeForProject(projectInfo.projectId);

  // Fetch synthesis result and individual schemas
  const synthesisResult = leafNode ? await getSynthesisResultByNodeId(leafNode.id) : null;
  const individualSchemas = leafNode
    ? await getIndividualSchemasByNodeIdWithInterviewees(leafNode.id)
    : [];

  const supervisorName = projectInfo.supervisorName ?? projectInfo.supervisorEmail;
  const processNodeName = leafNode?.name ?? 'Process';

  // Build synthesis data for client component
  const synthesisData: SynthesisData | null = synthesisResult
    ? {
        id: synthesisResult.id,
        processNodeId: synthesisResult.processNodeId,
        synthesisVersion: synthesisResult.synthesisVersion,
        workflowJson: (synthesisResult.workflowJson ?? {
          normalizedWorkflow: [],
          divergenceAnnotations: [],
          matchMetadata: [],
          narrativeSummary: '',
          interviewCount: 0,
          sourceInterviewIds: [],
        }) as SynthesisData['workflowJson'],
        mermaidDefinition: (synthesisResult.mermaidDefinition as string) ?? '',
        interviewCount: synthesisResult.interviewCount,
        createdAt:
          synthesisResult.createdAt instanceof Date
            ? synthesisResult.createdAt.toISOString()
            : String(synthesisResult.createdAt),
      }
    : null;

  const schemas = individualSchemas.map((schema) => ({
    id: schema.id,
    interviewId: schema.interviewId,
    intervieweeName: schema.intervieweeName,
    intervieweeRole: schema.intervieweeRole,
    schemaJson: schema.schemaJson,
    mermaidDefinition: (schema.mermaidDefinition as string) ?? '',
    validationStatus: schema.validationStatus,
    validatedAt:
      schema.updatedAt instanceof Date
        ? schema.updatedAt.toISOString()
        : schema.updatedAt
          ? String(schema.updatedAt)
          : null,
  }));

  return (
    <>
      <TopBar projectName={projectInfo.projectName} supervisorName={supervisorName} />
      <main className="mx-auto max-w-[1400px] px-6 pt-20">
        <ReviewContent
          synthesisData={synthesisData}
          individualSchemas={schemas}
          processNodeName={processNodeName}
        />
      </main>
    </>
  );
}
