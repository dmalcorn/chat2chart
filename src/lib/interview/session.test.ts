// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/queries', () => ({
  createInterviewExchange: vi.fn(),
  getInterviewExchangesByInterviewId: vi.fn(),
  getExchangesBySegmentId: vi.fn(),
  updateExchangeVerification: vi.fn(),
  getExchangeCountByInterviewId: vi.fn(),
}));

import {
  startSession,
  startSegment,
  addExchange,
  verifyExchange,
  getSegmentExchanges,
  getSessionExchanges,
} from './session';
import {
  createInterviewExchange,
  getInterviewExchangesByInterviewId,
  getExchangesBySegmentId,
  updateExchangeVerification,
  getExchangeCountByInterviewId,
} from '@/lib/db/queries';

const mockCreateExchange = vi.mocked(createInterviewExchange);
const mockGetExchangesByInterview = vi.mocked(getInterviewExchangesByInterviewId);
const mockGetExchangesBySegment = vi.mocked(getExchangesBySegmentId);
const mockUpdateVerification = vi.mocked(updateExchangeVerification);
const mockGetExchangeCount = vi.mocked(getExchangeCountByInterviewId);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('startSession', () => {
  it('initializes with correct interviewId and sequence number starting at 1', async () => {
    mockGetExchangeCount.mockResolvedValue(0);
    const session = await startSession('interview-123');
    expect(session.interviewId).toBe('interview-123');
    expect(session.nextSequenceNumber).toBe(1);
    expect(session.currentSegmentId).toMatch(UUID_REGEX);
    expect(mockGetExchangeCount).toHaveBeenCalledWith('interview-123');
  });

  it('resumes sequence number from existing exchange count', async () => {
    mockGetExchangeCount.mockResolvedValue(5);
    const session = await startSession('interview-456');
    expect(session.nextSequenceNumber).toBe(6);
  });
});

describe('startSegment', () => {
  it('generates a valid UUID v4 segmentId and updates the session', async () => {
    mockGetExchangeCount.mockResolvedValue(0);
    const session = await startSession('interview-123');
    const oldSegmentId = session.currentSegmentId;
    const newSegmentId = startSegment(session);
    expect(newSegmentId).toMatch(UUID_REGEX);
    expect(newSegmentId).not.toBe(oldSegmentId);
    expect(session.currentSegmentId).toBe(newSegmentId);
  });
});

describe('addExchange', () => {
  it('calls createInterviewExchange with correct parameters', async () => {
    mockGetExchangeCount.mockResolvedValue(0);
    const session = await startSession('interview-123');
    const mockExchange = {
      id: 'exchange-1',
      interviewId: 'interview-123',
      segmentId: session.currentSegmentId,
      exchangeType: 'question' as const,
      speaker: 'agent' as const,
      content: 'What do you do first?',
      isVerified: false,
      sequenceNumber: 1,
      createdAt: new Date(),
    };
    mockCreateExchange.mockResolvedValue(mockExchange);
    const result = await addExchange(session, {
      exchangeType: 'question',
      speaker: 'agent',
      content: 'What do you do first?',
    });
    expect(mockCreateExchange).toHaveBeenCalledWith({
      interviewId: 'interview-123',
      segmentId: session.currentSegmentId,
      sequenceNumber: 1,
      exchangeType: 'question',
      speaker: 'agent',
      content: 'What do you do first?',
      isVerified: false,
    });
    expect(result).toEqual(mockExchange);
  });

  it('increments sequenceNumber across multiple calls', async () => {
    mockGetExchangeCount.mockResolvedValue(0);
    const session = await startSession('interview-123');
    mockCreateExchange.mockResolvedValue({
      id: 'ex-1',
      interviewId: 'interview-123',
      segmentId: session.currentSegmentId,
      exchangeType: 'question',
      speaker: 'agent',
      content: 'Q1',
      isVerified: false,
      sequenceNumber: 1,
      createdAt: new Date(),
    });
    await addExchange(session, { exchangeType: 'question', speaker: 'agent', content: 'Q1' });
    expect(session.nextSequenceNumber).toBe(2);

    mockCreateExchange.mockResolvedValue({
      id: 'ex-2',
      interviewId: 'interview-123',
      segmentId: session.currentSegmentId,
      exchangeType: 'response',
      speaker: 'interviewee',
      content: 'A1',
      isVerified: false,
      sequenceNumber: 2,
      createdAt: new Date(),
    });
    await addExchange(session, {
      exchangeType: 'response',
      speaker: 'interviewee',
      content: 'A1',
    });
    expect(session.nextSequenceNumber).toBe(3);
    expect(mockCreateExchange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sequenceNumber: 2 }),
    );
  });

  it('passes the current segmentId from the session', async () => {
    mockGetExchangeCount.mockResolvedValue(0);
    const session = await startSession('interview-123');
    const segmentId = startSegment(session);
    mockCreateExchange.mockResolvedValue({
      id: 'ex-1',
      interviewId: 'interview-123',
      segmentId,
      exchangeType: 'question',
      speaker: 'agent',
      content: 'Q',
      isVerified: false,
      sequenceNumber: 1,
      createdAt: new Date(),
    });
    await addExchange(session, { exchangeType: 'question', speaker: 'agent', content: 'Q' });
    expect(mockCreateExchange).toHaveBeenCalledWith(expect.objectContaining({ segmentId }));
  });
});

describe('verifyExchange', () => {
  it('succeeds for reflective_summary exchange type', async () => {
    mockUpdateVerification.mockResolvedValue({
      id: 'ex-1',
      interviewId: 'i-1',
      segmentId: 's-1',
      exchangeType: 'reflective_summary',
      speaker: 'agent',
      content: 'Summary',
      isVerified: true,
      sequenceNumber: 1,
      createdAt: new Date(),
    });
    const result = await verifyExchange('ex-1', 'reflective_summary');
    expect(mockUpdateVerification).toHaveBeenCalledWith('ex-1', true);
    expect(result?.isVerified).toBe(true);
  });

  it('succeeds for revised_summary exchange type', async () => {
    mockUpdateVerification.mockResolvedValue({
      id: 'ex-2',
      interviewId: 'i-1',
      segmentId: 's-1',
      exchangeType: 'revised_summary',
      speaker: 'agent',
      content: 'Revised',
      isVerified: true,
      sequenceNumber: 2,
      createdAt: new Date(),
    });
    const result = await verifyExchange('ex-2', 'revised_summary');
    expect(mockUpdateVerification).toHaveBeenCalledWith('ex-2', true);
    expect(result?.isVerified).toBe(true);
  });

  it('throws for question exchange type', async () => {
    await expect(verifyExchange('ex-1', 'question')).rejects.toThrow('Cannot verify');
    expect(mockUpdateVerification).not.toHaveBeenCalled();
  });

  it('throws for response exchange type', async () => {
    await expect(verifyExchange('ex-1', 'response')).rejects.toThrow('Cannot verify');
  });

  it('throws for confirmation exchange type', async () => {
    await expect(verifyExchange('ex-1', 'confirmation')).rejects.toThrow('Cannot verify');
  });
});

describe('getSegmentExchanges', () => {
  it('calls getExchangesBySegmentId with correct parameters', async () => {
    mockGetExchangeCount.mockResolvedValue(0);
    const session = await startSession('interview-123');
    mockGetExchangesBySegment.mockResolvedValue([]);
    await getSegmentExchanges(session);
    expect(mockGetExchangesBySegment).toHaveBeenCalledWith(
      'interview-123',
      session.currentSegmentId,
    );
  });
});

describe('getSessionExchanges', () => {
  it('calls getInterviewExchangesByInterviewId with correct interviewId', async () => {
    mockGetExchangeCount.mockResolvedValue(0);
    const session = await startSession('interview-123');
    mockGetExchangesByInterview.mockResolvedValue([]);
    await getSessionExchanges(session);
    expect(mockGetExchangesByInterview).toHaveBeenCalledWith('interview-123');
  });
});
