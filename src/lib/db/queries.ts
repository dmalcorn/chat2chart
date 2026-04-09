import { and, asc, count, desc, eq, inArray, max } from 'drizzle-orm';
import { db } from './connection';
import {
  individualProcessSchemas,
  interviews,
  interviewExchanges,
  interviewTokens,
  processNodes,
  projects,
  projectSupervisors,
  synthesisCheckpoints,
  synthesisResults,
  users,
} from './schema';

export async function getProjectById(projectId: string) {
  const result = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  return result ?? null;
}

export async function getProcessNodeById(nodeId: string) {
  const result = await db.query.processNodes.findFirst({
    where: eq(processNodes.id, nodeId),
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
  });
  return result ?? null;
}

export async function getInterviewByTokenId(tokenId: string) {
  const result = await db.query.interviews.findFirst({
    where: eq(interviews.tokenId, tokenId),
  });
  return result ?? null;
}

export async function createInterview(data: {
  tokenId: string;
  projectId: string;
  processNodeId: string;
  status: 'pending' | 'active' | 'completed' | 'validating' | 'captured';
  startedAt: Date;
}) {
  const [interview] = await db.insert(interviews).values(data).returning();
  return interview;
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
  return updated ?? null;
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
  if (user.role !== 'supervisor') return false;
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

export async function getInterviewById(interviewId: string) {
  const result = await db.query.interviews.findFirst({
    where: eq(interviews.id, interviewId),
  });
  return result ?? null;
}

export async function getExchangesBySegmentId(interviewId: string, segmentId: string) {
  return db.query.interviewExchanges.findMany({
    where: and(
      eq(interviewExchanges.interviewId, interviewId),
      eq(interviewExchanges.segmentId, segmentId),
    ),
    orderBy: [asc(interviewExchanges.sequenceNumber)],
  });
}

export async function updateExchangeVerification(exchangeId: string, isVerified: boolean) {
  const [updated] = await db
    .update(interviewExchanges)
    .set({ isVerified })
    .where(eq(interviewExchanges.id, exchangeId))
    .returning();
  return updated ?? null;
}

export async function getExchangeCountByInterviewId(interviewId: string): Promise<number> {
  const [result] = await db
    .select({ value: count() })
    .from(interviewExchanges)
    .where(eq(interviewExchanges.interviewId, interviewId));
  return result?.value ?? 0;
}

export async function getMaxSequenceNumber(interviewId: string): Promise<number> {
  const [result] = await db
    .select({ value: max(interviewExchanges.sequenceNumber) })
    .from(interviewExchanges)
    .where(eq(interviewExchanges.interviewId, interviewId));
  return Number(result?.value ?? 0);
}

export async function getLatestVerifiableExchangeInSegment(interviewId: string, segmentId: string) {
  const results = await db
    .select()
    .from(interviewExchanges)
    .where(
      and(
        eq(interviewExchanges.interviewId, interviewId),
        eq(interviewExchanges.segmentId, segmentId),
      ),
    )
    .orderBy(desc(interviewExchanges.sequenceNumber))
    .limit(10);
  return (
    results.find(
      (ex) =>
        (ex.exchangeType === 'reflective_summary' || ex.exchangeType === 'revised_summary') &&
        !ex.isVerified,
    ) ?? null
  );
}

// --- Individual Process Schema Queries ---

export async function getVerifiedExchangesByInterviewId(interviewId: string) {
  return db.query.interviewExchanges.findMany({
    where: and(
      eq(interviewExchanges.interviewId, interviewId),
      eq(interviewExchanges.isVerified, true),
    ),
    orderBy: [asc(interviewExchanges.sequenceNumber)],
  });
}

export async function getIndividualProcessSchemaByInterviewId(interviewId: string) {
  const result = await db.query.individualProcessSchemas.findFirst({
    where: eq(individualProcessSchemas.interviewId, interviewId),
  });
  return result ?? null;
}

export async function createIndividualProcessSchema(data: {
  interviewId: string;
  processNodeId: string;
  schemaJson: unknown;
  mermaidDefinition: string;
  validationStatus: string;
  extractionMethod: string;
}) {
  const [schema] = await db.insert(individualProcessSchemas).values(data).returning();
  return schema;
}

export async function updateIndividualProcessSchemaValidation(
  schemaId: string,
  validationStatus: string,
) {
  const [updated] = await db
    .update(individualProcessSchemas)
    .set({ validationStatus })
    .where(eq(individualProcessSchemas.id, schemaId))
    .returning();
  return updated ?? null;
}

export async function updateIndividualProcessSchema(
  schemaId: string,
  data: { schemaJson: unknown; mermaidDefinition: string; validationStatus: string },
) {
  const [updated] = await db
    .update(individualProcessSchemas)
    .set(data)
    .where(eq(individualProcessSchemas.id, schemaId))
    .returning();
  return updated ?? null;
}

export async function updateInterviewStatusWithTimestamps(
  interviewId: string,
  status: 'pending' | 'active' | 'completed' | 'validating' | 'captured',
  timestamps?: { startedAt?: Date; completedAt?: Date },
) {
  const [updated] = await db
    .update(interviews)
    .set({ status, ...timestamps })
    .where(eq(interviews.id, interviewId))
    .returning();
  return updated ?? null;
}

// --- Synthesis Queries ---

export async function getCapturedInterviewsByNodeId(nodeId: string) {
  return db.query.interviews.findMany({
    where: and(eq(interviews.processNodeId, nodeId), eq(interviews.status, 'captured')),
  });
}

export async function getIndividualSchemasByNodeId(nodeId: string) {
  const schemas = await db
    .select({
      id: individualProcessSchemas.id,
      interviewId: individualProcessSchemas.interviewId,
      processNodeId: individualProcessSchemas.processNodeId,
      schemaJson: individualProcessSchemas.schemaJson,
      mermaidDefinition: individualProcessSchemas.mermaidDefinition,
      validationStatus: individualProcessSchemas.validationStatus,
      extractionMethod: individualProcessSchemas.extractionMethod,
      createdAt: individualProcessSchemas.createdAt,
      updatedAt: individualProcessSchemas.updatedAt,
      interviewStatus: interviews.status,
    })
    .from(individualProcessSchemas)
    .innerJoin(interviews, eq(individualProcessSchemas.interviewId, interviews.id))
    .where(
      and(eq(individualProcessSchemas.processNodeId, nodeId), eq(interviews.status, 'captured')),
    );
  return schemas;
}

export async function createSynthesisCheckpoint(data: {
  projectId: string;
  processNodeId: string;
  synthesisVersion: number;
  stage: string;
  resultJson: unknown;
  durationMs?: number;
}) {
  const [checkpoint] = await db.insert(synthesisCheckpoints).values(data).returning();
  return checkpoint;
}

export async function createSynthesisResult(data: {
  projectId: string;
  processNodeId: string;
  synthesisVersion: number;
  workflowJson: unknown;
  interviewCount: number;
}) {
  const [result] = await db.insert(synthesisResults).values(data).returning();
  return result;
}

export async function getLatestSynthesisVersion(nodeId: string): Promise<number> {
  const [result] = await db
    .select({ value: max(synthesisResults.synthesisVersion) })
    .from(synthesisResults)
    .where(eq(synthesisResults.processNodeId, nodeId));
  return result?.value ?? 0;
}

/**
 * Atomically determine the next synthesis version and create the result row
 * inside a transaction to prevent TOCTOU races on concurrent requests.
 */
export async function createSynthesisResultWithVersion(data: {
  projectId: string;
  processNodeId: string;
  workflowJson: unknown;
  interviewCount: number;
}): Promise<{ id: string; synthesisVersion: number }> {
  return db.transaction(async (tx) => {
    const [versionResult] = await tx
      .select({ value: max(synthesisResults.synthesisVersion) })
      .from(synthesisResults)
      .where(eq(synthesisResults.processNodeId, data.processNodeId));
    const synthesisVersion = (versionResult?.value ?? 0) + 1;

    const [result] = await tx
      .insert(synthesisResults)
      .values({ ...data, synthesisVersion })
      .returning({ id: synthesisResults.id, synthesisVersion: synthesisResults.synthesisVersion });

    return result;
  });
}

export async function getSynthesisCheckpoint(
  projectId: string,
  processNodeId: string,
  synthesisVersion: number,
  stage: string,
) {
  const result = await db.query.synthesisCheckpoints.findFirst({
    where: and(
      eq(synthesisCheckpoints.projectId, projectId),
      eq(synthesisCheckpoints.processNodeId, processNodeId),
      eq(synthesisCheckpoints.synthesisVersion, synthesisVersion),
      eq(synthesisCheckpoints.stage, stage),
    ),
  });
  return result ?? null;
}

export async function getIndividualSchemasByNodeIdWithInterviewees(nodeId: string) {
  const schemas = await db
    .select({
      id: individualProcessSchemas.id,
      interviewId: individualProcessSchemas.interviewId,
      processNodeId: individualProcessSchemas.processNodeId,
      schemaJson: individualProcessSchemas.schemaJson,
      mermaidDefinition: individualProcessSchemas.mermaidDefinition,
      validationStatus: individualProcessSchemas.validationStatus,
      extractionMethod: individualProcessSchemas.extractionMethod,
      createdAt: individualProcessSchemas.createdAt,
      updatedAt: individualProcessSchemas.updatedAt,
      intervieweeName: interviewTokens.intervieweeName,
      intervieweeRole: interviewTokens.intervieweeRole,
    })
    .from(individualProcessSchemas)
    .innerJoin(interviews, eq(individualProcessSchemas.interviewId, interviews.id))
    .innerJoin(interviewTokens, eq(interviews.tokenId, interviewTokens.id))
    .where(
      and(eq(individualProcessSchemas.processNodeId, nodeId), eq(interviews.status, 'captured')),
    );
  return schemas;
}

export async function getSynthesisResultByNodeIdWithVersion(nodeId: string, version?: number) {
  if (version !== undefined) {
    const result = await db.query.synthesisResults.findFirst({
      where: and(
        eq(synthesisResults.processNodeId, nodeId),
        eq(synthesisResults.synthesisVersion, version),
      ),
    });
    return result ?? null;
  }
  // Default: return latest version
  const result = await db.query.synthesisResults.findFirst({
    where: eq(synthesisResults.processNodeId, nodeId),
    orderBy: [desc(synthesisResults.synthesisVersion)],
  });
  return result ?? null;
}

export async function updateSynthesisResultMermaid(synthesisId: string, mermaidDefinition: string) {
  const [updated] = await db
    .update(synthesisResults)
    .set({ mermaidDefinition })
    .where(eq(synthesisResults.id, synthesisId))
    .returning();
  return updated ?? null;
}

export async function getIntervieweeNamesByInterviewIds(
  interviewIds: string[],
): Promise<Map<string, string>> {
  if (interviewIds.length === 0) return new Map();

  const results = await db
    .select({
      interviewId: interviews.id,
      intervieweeName: interviewTokens.intervieweeName,
    })
    .from(interviews)
    .innerJoin(interviewTokens, eq(interviews.tokenId, interviewTokens.id))
    .where(inArray(interviews.id, interviewIds));

  const names = new Map<string, string>();
  for (const row of results) {
    names.set(row.interviewId, row.intervieweeName);
  }
  return names;
}

export async function isSupervisorForProject(userId: string, projectId: string): Promise<boolean> {
  const result = await db.query.projectSupervisors.findFirst({
    where: and(eq(projectSupervisors.userId, userId), eq(projectSupervisors.projectId, projectId)),
  });
  return result !== undefined && result !== null;
}
