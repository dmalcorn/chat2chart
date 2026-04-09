import { getInterviewById, updateInterviewStatusWithTimestamps } from '@/lib/db/queries';

// --- Types ---

export type InterviewStatus = 'pending' | 'active' | 'completed' | 'validating' | 'captured';

// --- Error Classes ---

export class InterviewNotFoundError extends Error {
  readonly code = 'INTERVIEW_NOT_FOUND';
  constructor(interviewId: string) {
    super(`Interview not found: ${interviewId}`);
    this.name = 'InterviewNotFoundError';
  }
}

export class InvalidStateTransitionError extends Error {
  readonly code = 'INVALID_STATE_TRANSITION';
  constructor(current: InterviewStatus, target: InterviewStatus) {
    super(`Invalid state transition: ${current} → ${target}`);
    this.name = 'InvalidStateTransitionError';
  }
}

// --- Transition Map ---

const VALID_TRANSITIONS: Record<InterviewStatus, InterviewStatus[]> = {
  pending: ['active'],
  active: ['completed'],
  completed: ['validating'],
  validating: ['captured', 'validating'],
  captured: [],
};

// --- Functions ---

export function validateTransition(
  currentStatus: InterviewStatus,
  targetStatus: InterviewStatus,
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export async function transitionInterview(interviewId: string, targetStatus: InterviewStatus) {
  const interview = await getInterviewById(interviewId);
  if (!interview) {
    throw new InterviewNotFoundError(interviewId);
  }

  const currentStatus = interview.status as InterviewStatus;
  if (!validateTransition(currentStatus, targetStatus)) {
    throw new InvalidStateTransitionError(currentStatus, targetStatus);
  }

  const timestamps: { startedAt?: Date; completedAt?: Date } = {};
  if (targetStatus === 'active') {
    timestamps.startedAt = new Date();
  }
  if (targetStatus === 'completed') {
    timestamps.completedAt = new Date();
  }

  const updated = await updateInterviewStatusWithTimestamps(interviewId, targetStatus, timestamps);
  return updated;
}
