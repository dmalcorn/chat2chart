import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import {
  getProjectById,
  getProcessNodesByProjectId,
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getInterviewExchangesByInterviewId,
  createInterviewExchange,
  updateInterviewStatus,
  getSynthesisResultByNodeId,
} from './queries';

const testDatabaseUrl = process.env.DATABASE_URL;

let testDb: ReturnType<typeof drizzle>;
let testClient: ReturnType<typeof postgres>;

describe('Database Queries', () => {
  // Seed data IDs
  let projectId: string;
  let processNodeId: string;
  let tokenId: string;
  let interviewId: string;

  beforeAll(async () => {
    if (!testDatabaseUrl) {
      throw new Error('DATABASE_URL must be set for query tests');
    }

    testClient = postgres(testDatabaseUrl);
    testDb = drizzle(testClient, { schema, casing: 'snake_case' });
  });

  beforeEach(async () => {
    // Clean all tables in dependency order
    await testDb.delete(schema.synthesisCheckpoints);
    await testDb.delete(schema.synthesisResults);
    await testDb.delete(schema.structuredCaptures);
    await testDb.delete(schema.individualProcessSchemas);
    await testDb.delete(schema.interviewExchanges);
    await testDb.delete(schema.interviews);
    await testDb.delete(schema.interviewTokens);
    await testDb.delete(schema.projectSkillProviders);
    await testDb.delete(schema.projectSupervisors);
    await testDb.delete(schema.processNodes);
    await testDb.delete(schema.users);
    await testDb.delete(schema.projects);

    // Seed test data
    const [project] = await testDb
      .insert(schema.projects)
      .values({
        name: 'Test Project',
        description: 'A test project',
        skillName: 'federal-document-processing',
      })
      .returning();
    projectId = project.id;

    const [node] = await testDb
      .insert(schema.processNodes)
      .values({
        projectId,
        name: 'Review Budget Request',
        level: 1,
        nodeType: 'leaf',
        sortOrder: 1,
      })
      .returning();
    processNodeId = node.id;

    await testDb.insert(schema.users).values({
      email: 'test@example.com',
      passwordHash: '$2b$10$fakehash',
      role: 'supervisor',
    });

    const [token] = await testDb
      .insert(schema.interviewTokens)
      .values({
        projectId,
        processNodeId,
        token: 'test-token-uuid-v4',
        intervieweeName: 'Jane Doe',
        intervieweeRole: 'Mail Clerk — Austin Campus',
      })
      .returning();
    tokenId = token.id;

    const [interview] = await testDb
      .insert(schema.interviews)
      .values({
        tokenId,
        projectId,
        processNodeId,
      })
      .returning();
    interviewId = interview.id;
  });

  afterAll(async () => {
    // Clean up
    await testDb.delete(schema.synthesisCheckpoints);
    await testDb.delete(schema.synthesisResults);
    await testDb.delete(schema.structuredCaptures);
    await testDb.delete(schema.individualProcessSchemas);
    await testDb.delete(schema.interviewExchanges);
    await testDb.delete(schema.interviews);
    await testDb.delete(schema.interviewTokens);
    await testDb.delete(schema.projectSkillProviders);
    await testDb.delete(schema.projectSupervisors);
    await testDb.delete(schema.processNodes);
    await testDb.delete(schema.users);
    await testDb.delete(schema.projects);
    await testClient.end();
  });

  describe('getProjectById', () => {
    it('returns the project when it exists', async () => {
      const result = await getProjectById(projectId);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Test Project');
      expect(result!.skillName).toBe('federal-document-processing');
    });

    it('returns null for non-existent project', async () => {
      const result = await getProjectById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('getProcessNodesByProjectId', () => {
    it('returns process nodes for a project', async () => {
      const result = await getProcessNodesByProjectId(projectId);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Review Budget Request');
      expect(result[0].nodeType).toBe('leaf');
    });

    it('returns nodes ordered by sortOrder', async () => {
      await testDb.insert(schema.processNodes).values({
        projectId,
        name: 'Process Payment',
        level: 1,
        nodeType: 'leaf',
        sortOrder: 0,
      });

      const result = await getProcessNodesByProjectId(projectId);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Process Payment');
      expect(result[1].name).toBe('Review Budget Request');
    });

    it('returns empty array for project with no nodes', async () => {
      const [emptyProject] = await testDb
        .insert(schema.projects)
        .values({
          name: 'Empty Project',
          skillName: 'test-skill',
        })
        .returning();
      const result = await getProcessNodesByProjectId(emptyProject.id);
      expect(result).toHaveLength(0);
    });
  });

  describe('getInterviewTokenByToken', () => {
    it('returns token row with interviewee details', async () => {
      const result = await getInterviewTokenByToken('test-token-uuid-v4');
      expect(result).not.toBeNull();
      expect(result!.intervieweeName).toBe('Jane Doe');
      expect(result!.intervieweeRole).toBe('Mail Clerk — Austin Campus');
      expect(result!.projectId).toBeDefined();
      expect(result!.processNodeId).toBeDefined();
    });

    it('returns null for non-existent token', async () => {
      const result = await getInterviewTokenByToken('nonexistent-token');
      expect(result).toBeNull();
    });
  });

  describe('getInterviewByTokenId', () => {
    it('returns interview for a valid token ID', async () => {
      const result = await getInterviewByTokenId(tokenId);
      expect(result).not.toBeNull();
      expect(result!.status).toBe('pending');
      expect(result!.projectId).toBe(projectId);
    });

    it('returns null for non-existent token ID', async () => {
      const result = await getInterviewByTokenId('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('getInterviewExchangesByInterviewId', () => {
    it('returns exchanges ordered by sequenceNumber', async () => {
      await testDb.insert(schema.interviewExchanges).values([
        {
          interviewId,
          segmentId: '11111111-1111-1111-1111-111111111111',
          exchangeType: 'question',
          speaker: 'agent',
          content: 'What do you do first?',
          sequenceNumber: 1,
        },
        {
          interviewId,
          segmentId: '11111111-1111-1111-1111-111111111111',
          exchangeType: 'response',
          speaker: 'interviewee',
          content: 'I check the mail.',
          sequenceNumber: 2,
        },
      ]);

      const result = await getInterviewExchangesByInterviewId(interviewId);
      expect(result).toHaveLength(2);
      expect(result[0].sequenceNumber).toBe(1);
      expect(result[0].exchangeType).toBe('question');
      expect(result[1].sequenceNumber).toBe(2);
      expect(result[1].exchangeType).toBe('response');
    });

    it('returns empty array for interview with no exchanges', async () => {
      const result = await getInterviewExchangesByInterviewId(interviewId);
      expect(result).toHaveLength(0);
    });
  });

  describe('createInterviewExchange', () => {
    it('creates and returns a new exchange', async () => {
      const exchange = await createInterviewExchange({
        interviewId,
        segmentId: '22222222-2222-2222-2222-222222222222',
        exchangeType: 'question',
        speaker: 'agent',
        content: 'Tell me about your process.',
        sequenceNumber: 1,
      });

      expect(exchange).toBeDefined();
      expect(exchange.id).toBeDefined();
      expect(exchange.content).toBe('Tell me about your process.');
      expect(exchange.isVerified).toBe(false);
      expect(exchange.createdAt).toBeDefined();
    });

    it('persists exchange immediately (audit trail)', async () => {
      const exchange = await createInterviewExchange({
        interviewId,
        segmentId: '33333333-3333-3333-3333-333333333333',
        exchangeType: 'reflective_summary',
        speaker: 'agent',
        content: 'So you check the mail first.',
        isVerified: true,
        sequenceNumber: 3,
      });

      const retrieved = await getInterviewExchangesByInterviewId(interviewId);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(exchange.id);
      expect(retrieved[0].isVerified).toBe(true);
    });
  });

  describe('updateInterviewStatus', () => {
    it('updates status and returns updated interview', async () => {
      const updated = await updateInterviewStatus(interviewId, 'active');
      expect(updated).toBeDefined();
      expect(updated.status).toBe('active');
      expect(updated.id).toBe(interviewId);
    });

    it('sets updatedAt on status change', async () => {
      const updated = await updateInterviewStatus(interviewId, 'completed');
      expect(updated.updatedAt).toBeDefined();
      expect(updated.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getSynthesisResultByNodeId', () => {
    it('returns null when no synthesis exists', async () => {
      const result = await getSynthesisResultByNodeId(processNodeId);
      expect(result).toBeNull();
    });

    it('returns the latest synthesis version', async () => {
      await testDb.insert(schema.synthesisResults).values([
        {
          projectId,
          processNodeId,
          synthesisVersion: 1,
          workflowJson: { steps: [] },
          interviewCount: 2,
        },
        {
          projectId,
          processNodeId,
          synthesisVersion: 2,
          workflowJson: { steps: ['updated'] },
          interviewCount: 3,
        },
      ]);

      const result = await getSynthesisResultByNodeId(processNodeId);
      expect(result).not.toBeNull();
      expect(result!.synthesisVersion).toBe(2);
      expect(result!.interviewCount).toBe(3);
    });
  });
});
