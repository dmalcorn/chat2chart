import { asc, desc, eq } from 'drizzle-orm';
import { db } from './connection';
import {
  interviews,
  interviewExchanges,
  interviewTokens,
  processNodes,
  projects,
  synthesisResults,
  users,
} from './schema';

export async function getProjectById(projectId: string) {
  const result = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  return result ?? null;
}

export async function getProcessNodesByProjectId(projectId: string) {
  return db.query.processNodes.findMany({
    where: eq(processNodes.projectId, projectId),
    orderBy: [asc(processNodes.sortOrder)],
  });
}

export async function getInterviewTokenByToken(token: string) {
  const result = await db.query.interviewTokens.findFirst({
    where: eq(interviewTokens.token, token),
    with: {
      project: true,
      processNode: true,
    },
  });
  return result ?? null;
}

export async function getInterviewByTokenId(tokenId: string) {
  const result = await db.query.interviews.findFirst({
    where: eq(interviews.tokenId, tokenId),
  });
  return result ?? null;
}

export async function getInterviewExchangesByInterviewId(interviewId: string) {
  return db.query.interviewExchanges.findMany({
    where: eq(interviewExchanges.interviewId, interviewId),
    orderBy: [asc(interviewExchanges.sequenceNumber)],
  });
}

export async function createInterviewExchange(data: {
  interviewId: string;
  segmentId: string;
  exchangeType: 'question' | 'response' | 'reflective_summary' | 'confirmation' | 'revised_summary';
  speaker: 'agent' | 'interviewee';
  content: string;
  isVerified?: boolean;
  sequenceNumber: number;
}) {
  const [exchange] = await db.insert(interviewExchanges).values(data).returning();
  return exchange;
}

export async function updateInterviewStatus(
  interviewId: string,
  status: 'pending' | 'active' | 'completed' | 'validating' | 'captured',
) {
  const [updated] = await db
    .update(interviews)
    .set({ status })
    .where(eq(interviews.id, interviewId))
    .returning();
  return updated;
}

export async function getUserByEmail(email: string) {
  const result = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  return result ?? null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name?: string;
  role: string;
}) {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function isEmailInSupervisorAllowlist(email: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    with: { projectSupervisors: true },
  });
  if (!user) return false;
  return (user.projectSupervisors?.length ?? 0) > 0;
}

export async function getSkillProviderByProjectAndSkill(projectId: string, skillName: string) {
  const result = await db.query.projectSkillProviders.findFirst({
    where: (table, { and }) => and(eq(table.projectId, projectId), eq(table.skillName, skillName)),
  });
  return result ?? null;
}

export async function getSynthesisResultByNodeId(nodeId: string) {
  const result = await db.query.synthesisResults.findFirst({
    where: eq(synthesisResults.processNodeId, nodeId),
    orderBy: [desc(synthesisResults.synthesisVersion)],
  });
  return result ?? null;
}
