// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/queries', () => ({
  getInterviewById: vi.fn(),
  updateInterviewStatusWithTimestamps: vi.fn(),
}));

import {
  validateTransition,
  transitionInterview,
  InterviewNotFoundError,
  InvalidStateTransitionError,
} from './state-machine';
import type { InterviewStatus } from './state-machine';
import { getInterviewById, updateInterviewStatusWithTimestamps } from '@/lib/db/queries';

const mockGetInterview = vi.mocked(getInterviewById);
const mockUpdateStatus = vi.mocked(updateInterviewStatusWithTimestamps);

beforeEach(() => {
  vi.clearAllMocks();
});

function createMockInterview(status: InterviewStatus) {
  return {
    id: 'interview-1',
    tokenId: 'token-1',
    projectId: 'project-1',
    processNodeId: 'node-1',
    status,
    llmProvider: null,
    sttProvider: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('validateTransition', () => {
  it.each([
    ['pending', 'active'],
    ['active', 'completed'],
    ['completed', 'validating'],
    ['validating', 'captured'],
    ['validating', 'validating'],
  ] as [InterviewStatus, InterviewStatus][])('allows valid transition: %s -> %s', (from, to) => {
    expect(validateTransition(from, to)).toBe(true);
  });

  it.each([
    ['pending', 'completed'],
    ['pending', 'validating'],
    ['active', 'captured'],
    ['active', 'pending'],
    ['completed', 'active'],
    ['captured', 'active'],
    ['captured', 'pending'],
  ] as [InterviewStatus, InterviewStatus][])('rejects invalid transition: %s -> %s', (from, to) => {
    expect(validateTransition(from, to)).toBe(false);
  });
});

describe('transitionInterview', () => {
  it('calls updateInterviewStatusWithTimestamps with correct parameters', async () => {
    mockGetInterview.mockResolvedValue(createMockInterview('active'));
    mockUpdateStatus.mockResolvedValue(createMockInterview('completed'));

    await transitionInterview('interview-1', 'completed');

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'interview-1',
      'completed',
      expect.objectContaining({ completedAt: expect.any(Date) }),
    );
  });

  it('throws InterviewNotFoundError when interview does not exist', async () => {
    mockGetInterview.mockResolvedValue(null);

    await expect(transitionInterview('nonexistent', 'active')).rejects.toThrow(
      InterviewNotFoundError,
    );
    await expect(transitionInterview('nonexistent', 'active')).rejects.toThrow(
      'Interview not found',
    );
  });

  it('throws InvalidStateTransitionError when transition is not allowed', async () => {
    mockGetInterview.mockResolvedValue(createMockInterview('pending'));

    await expect(transitionInterview('interview-1', 'completed')).rejects.toThrow(
      InvalidStateTransitionError,
    );
    await expect(transitionInterview('interview-1', 'completed')).rejects.toThrow(
      'Invalid state transition: pending',
    );
  });

  it('sets startedAt when transitioning to active', async () => {
    mockGetInterview.mockResolvedValue(createMockInterview('pending'));
    mockUpdateStatus.mockResolvedValue(createMockInterview('active'));

    await transitionInterview('interview-1', 'active');

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'interview-1',
      'active',
      expect.objectContaining({ startedAt: expect.any(Date) }),
    );
  });

  it('sets completedAt when transitioning to completed', async () => {
    mockGetInterview.mockResolvedValue(createMockInterview('active'));
    mockUpdateStatus.mockResolvedValue(createMockInterview('completed'));

    await transitionInterview('interview-1', 'completed');

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'interview-1',
      'completed',
      expect.objectContaining({ completedAt: expect.any(Date) }),
    );
  });

  it('does not set timestamps when transitioning to validating', async () => {
    mockGetInterview.mockResolvedValue(createMockInterview('completed'));
    mockUpdateStatus.mockResolvedValue(createMockInterview('validating'));

    await transitionInterview('interview-1', 'validating');

    expect(mockUpdateStatus).toHaveBeenCalledWith('interview-1', 'validating', {});
  });

  it('does not set timestamps when transitioning to captured', async () => {
    mockGetInterview.mockResolvedValue(createMockInterview('validating'));
    mockUpdateStatus.mockResolvedValue(createMockInterview('captured'));

    await transitionInterview('interview-1', 'captured');

    expect(mockUpdateStatus).toHaveBeenCalledWith('interview-1', 'captured', {});
  });

  it('allows validating to validating for correction cycles', async () => {
    mockGetInterview.mockResolvedValue(createMockInterview('validating'));
    mockUpdateStatus.mockResolvedValue(createMockInterview('validating'));

    const result = await transitionInterview('interview-1', 'validating');

    expect(mockUpdateStatus).toHaveBeenCalledWith('interview-1', 'validating', {});
    expect(result).toBeDefined();
  });
});
