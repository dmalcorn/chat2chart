'use client';

import { useState } from 'react';
import { ConsentScreen } from './consent-screen';
import { ActiveInterviewPlaceholder } from './active-interview-placeholder';

interface InterviewFlowControllerProps {
  intervieweeName: string;
  processNodeName: string;
  projectName: string;
  token: string;
}

export function InterviewFlowController({
  intervieweeName,
  processNodeName,
  token,
}: InterviewFlowControllerProps) {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <ActiveInterviewPlaceholder
        intervieweeName={intervieweeName}
        processNodeName={processNodeName}
        token={token}
      />
    );
  }

  return (
    <ConsentScreen
      processName={processNodeName}
      intervieweeName={intervieweeName}
      token={token}
      onInterviewStarted={() => setStarted(true)}
    />
  );
}
