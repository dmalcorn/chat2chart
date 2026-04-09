import { randomUUID } from 'node:crypto';
import {
  createInterviewExchange,
  getInterviewExchangesByInterviewId,
  getExchangesBySegmentId,
  updateExchangeVerification,
  getExchangeCountByInterviewId,
} from '@/lib/db/queries';

// --- Types ---

export type ExchangeType =
  | 'question'
  | 'response'
  | 'reflective_summary'
  | 'confirmation'
  | 'revised_summary';

export type Speaker = 'agent' | 'interviewee';

export interface InterviewSession {
  interviewId: string;
  currentSegmentId: string;
  nextSequenceNumber: number;
}

export interface AddExchangeData {
  exchangeType: ExchangeType;
  speaker: Speaker;
  content: string;
  isVerified?: boolean;
}

// --- Verification Constants ---

const VERIFIABLE_TYPES: ReadonlySet<ExchangeType> = new Set([
  'reflective_summary',
  'revised_summary',
]);

// --- Session Functions ---

export async function startSession(interviewId: string): Promise<InterviewSession> {
  const existingCount = await getExchangeCountByInterviewId(interviewId);
  return {
    interviewId,
    currentSegmentId: randomUUID(),
    nextSequenceNumber: existingCount + 1,
  };
}

export function startSegment(session: InterviewSession): string {
  const segmentId = randomUUID();
  session.currentSegmentId = segmentId;
  return segmentId;
}

export async function addExchange(session: InterviewSession, data: AddExchangeData) {
  const exchange = await createInterviewExchange({
    interviewId: session.interviewId,
    segmentId: session.currentSegmentId,
    sequenceNumber: session.nextSequenceNumber,
    exchangeType: data.exchangeType,
    speaker: data.speaker,
    content: data.content,
    isVerified: data.isVerified ?? false,
  });
  session.nextSequenceNumber++;
  return exchange;
}

export async function verifyExchange(
  exchangeId: string,
  exchangeType: ExchangeType,
  interviewId?: string,
) {
  if (!VERIFIABLE_TYPES.has(exchangeType)) {
    throw new Error(
      `Cannot verify exchange of type "${exchangeType}". Only reflective_summary and revised_summary can be verified.`,
    );
  }
  if (interviewId) {
    const exchanges = await getInterviewExchangesByInterviewId(interviewId);
    const exchange = exchanges.find((ex) => ex.id === exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found in interview ${interviewId}`);
    }
  }
  return updateExchangeVerification(exchangeId, true);
}

export async function getSegmentExchanges(session: InterviewSession) {
  return getExchangesBySegmentId(session.interviewId, session.currentSegmentId);
}

export async function getSessionExchanges(session: InterviewSession) {
  return getInterviewExchangesByInterviewId(session.interviewId);
}
