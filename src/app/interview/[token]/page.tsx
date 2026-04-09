import { validateTokenFormat } from '@/lib/interview/token';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getProjectById,
  getProcessNodeById,
} from '@/lib/db/queries';
import { InvalidTokenScreen } from '@/components/interview/invalid-token-screen';
import { ViewportCheck } from '@/components/interview/viewport-check';
import { ConsentPlaceholder } from '@/components/interview/consent-placeholder';
import { ActiveInterviewPlaceholder } from '@/components/interview/active-interview-placeholder';
import { CompletedViewPlaceholder } from '@/components/interview/completed-view-placeholder';

export default async function InterviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!validateTokenFormat(token)) {
    return (
      <ViewportCheck>
        <InvalidTokenScreen />
      </ViewportCheck>
    );
  }

  const tokenRow = await getInterviewTokenByToken(token);

  if (!tokenRow) {
    return (
      <ViewportCheck>
        <InvalidTokenScreen />
      </ViewportCheck>
    );
  }

  const [interview, project, processNode] = await Promise.all([
    getInterviewByTokenId(tokenRow.id),
    getProjectById(tokenRow.projectId),
    getProcessNodeById(tokenRow.processNodeId),
  ]);

  if (!project || !processNode) {
    return (
      <ViewportCheck>
        <InvalidTokenScreen />
      </ViewportCheck>
    );
  }

  const interviewState = interview?.status ?? 'pending';
  const { intervieweeName } = tokenRow;
  const processNodeName = processNode.name;
  const projectName = project.name;

  function renderStateView() {
    switch (interviewState) {
      case 'pending':
        return (
          <ConsentPlaceholder
            intervieweeName={intervieweeName}
            processNodeName={processNodeName}
            projectName={projectName}
            token={token}
          />
        );
      case 'active':
      case 'validating':
        return (
          <ActiveInterviewPlaceholder
            intervieweeName={intervieweeName}
            processNodeName={processNodeName}
            token={token}
          />
        );
      case 'completed':
      case 'captured':
        return (
          <CompletedViewPlaceholder
            intervieweeName={intervieweeName}
            processNodeName={processNodeName}
            interviewState={interviewState}
          />
        );
      default:
        return <InvalidTokenScreen />;
    }
  }

  return <ViewportCheck>{renderStateView()}</ViewportCheck>;
}
