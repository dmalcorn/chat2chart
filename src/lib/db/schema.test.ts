import { describe, expect, it } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from './schema';

describe('Database Schema', () => {
  const tables = {
    projects: schema.projects,
    processNodes: schema.processNodes,
    users: schema.users,
    projectSupervisors: schema.projectSupervisors,
    projectSkillProviders: schema.projectSkillProviders,
    interviewTokens: schema.interviewTokens,
    interviews: schema.interviews,
    interviewExchanges: schema.interviewExchanges,
    individualProcessSchemas: schema.individualProcessSchemas,
    structuredCaptures: schema.structuredCaptures,
    synthesisResults: schema.synthesisResults,
    synthesisCheckpoints: schema.synthesisCheckpoints,
  } as const;

  it('exports all 12 tables', () => {
    expect(Object.keys(tables)).toHaveLength(12);
    for (const table of Object.values(tables)) {
      expect(table).toBeDefined();
    }
  });

  it('uses correct snake_case table names', () => {
    const expectedNames: Record<string, string> = {
      projects: 'projects',
      processNodes: 'process_nodes',
      users: 'users',
      projectSupervisors: 'project_supervisors',
      projectSkillProviders: 'project_skill_providers',
      interviewTokens: 'interview_tokens',
      interviews: 'interviews',
      interviewExchanges: 'interview_exchanges',
      individualProcessSchemas: 'individual_process_schemas',
      structuredCaptures: 'structured_captures',
      synthesisResults: 'synthesis_results',
      synthesisCheckpoints: 'synthesis_checkpoints',
    };

    for (const [key, table] of Object.entries(tables)) {
      expect(getTableName(table)).toBe(expectedNames[key]);
    }
  });

  describe('timestamp columns', () => {
    const tablesWithBothTimestamps = [
      'projects',
      'processNodes',
      'users',
      'projectSupervisors',
      'projectSkillProviders',
      'interviewTokens',
      'interviews',
      'individualProcessSchemas',
      'structuredCaptures',
      'synthesisResults',
    ] as const;

    it.each(tablesWithBothTimestamps)('%s has createdAt and updatedAt', (tableName) => {
      const table = tables[tableName];
      const config = getTableConfig(table);
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });

    it('interviewExchanges has createdAt but NO updatedAt (immutable)', () => {
      const config = getTableConfig(schema.interviewExchanges);
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain('createdAt');
      expect(columnNames).not.toContain('updatedAt');
    });

    it('synthesisCheckpoints has createdAt but NO updatedAt', () => {
      const config = getTableConfig(schema.synthesisCheckpoints);
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain('createdAt');
      expect(columnNames).not.toContain('updatedAt');
    });
  });

  describe('enums', () => {
    it('exports interviewStatusEnum with correct values', () => {
      expect(schema.interviewStatusEnum.enumValues).toEqual([
        'pending',
        'active',
        'completed',
        'validating',
        'captured',
      ]);
    });

    it('exports exchangeTypeEnum with correct values', () => {
      expect(schema.exchangeTypeEnum.enumValues).toEqual([
        'question',
        'response',
        'reflective_summary',
        'confirmation',
        'revised_summary',
      ]);
    });

    it('exports speakerEnum with correct values', () => {
      expect(schema.speakerEnum.enumValues).toEqual(['agent', 'interviewee']);
    });
  });

  describe('column definitions', () => {
    it('projects has required columns', () => {
      const config = getTableConfig(schema.projects);
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('skillName');
      expect(columnNames).toContain('defaultLlmProvider');
    });

    it('processNodes has required columns', () => {
      const config = getTableConfig(schema.processNodes);
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('projectId');
      expect(columnNames).toContain('parentNodeId');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('level');
      expect(columnNames).toContain('nodeType');
      expect(columnNames).toContain('sortOrder');
    });

    it('interviewExchanges has required columns', () => {
      const config = getTableConfig(schema.interviewExchanges);
      const columnNames = config.columns.map((c) => c.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('interviewId');
      expect(columnNames).toContain('segmentId');
      expect(columnNames).toContain('exchangeType');
      expect(columnNames).toContain('speaker');
      expect(columnNames).toContain('content');
      expect(columnNames).toContain('isVerified');
      expect(columnNames).toContain('sequenceNumber');
    });

    it('interviews has unique constraint on tokenId', () => {
      const config = getTableConfig(schema.interviews);
      const tokenIdCol = config.columns.find((c) => c.name === 'tokenId');
      expect(tokenIdCol?.isUnique).toBe(true);
    });

    it('individualProcessSchemas has unique constraint on interviewId', () => {
      const config = getTableConfig(schema.individualProcessSchemas);
      const interviewIdCol = config.columns.find((c) => c.name === 'interviewId');
      expect(interviewIdCol?.isUnique).toBe(true);
    });

    it('interviewTokens has unique constraint on token', () => {
      const config = getTableConfig(schema.interviewTokens);
      const tokenCol = config.columns.find((c) => c.name === 'token');
      expect(tokenCol?.isUnique).toBe(true);
    });

    it('users has unique constraint on email', () => {
      const config = getTableConfig(schema.users);
      const emailCol = config.columns.find((c) => c.name === 'email');
      expect(emailCol?.isUnique).toBe(true);
    });
  });

  describe('indexes', () => {
    it('processNodes has project_id and parent_node_id indexes', () => {
      const config = getTableConfig(schema.processNodes);
      const indexNames = Object.values(config.indexes).map((i) => i.config.name);
      expect(indexNames).toContain('idx_process_nodes_project_id');
      expect(indexNames).toContain('idx_process_nodes_parent_node_id');
    });

    it('interviews has project_id, process_node_id, and token_id indexes', () => {
      const config = getTableConfig(schema.interviews);
      const indexNames = Object.values(config.indexes).map((i) => i.config.name);
      expect(indexNames).toContain('idx_interviews_project_id');
      expect(indexNames).toContain('idx_interviews_process_node_id');
      expect(indexNames).toContain('idx_interviews_token_id');
    });

    it('interviewExchanges has interview_id and segment_id indexes', () => {
      const config = getTableConfig(schema.interviewExchanges);
      const indexNames = Object.values(config.indexes).map((i) => i.config.name);
      expect(indexNames).toContain('idx_interview_exchanges_interview_id');
      expect(indexNames).toContain('idx_interview_exchanges_segment_id');
    });

    it('interviewTokens has token and project_id indexes', () => {
      const config = getTableConfig(schema.interviewTokens);
      const indexNames = Object.values(config.indexes).map((i) => i.config.name);
      expect(indexNames).toContain('idx_interview_tokens_token');
      expect(indexNames).toContain('idx_interview_tokens_project_id');
    });

    it('individualProcessSchemas has interview_id index', () => {
      const config = getTableConfig(schema.individualProcessSchemas);
      const indexNames = Object.values(config.indexes).map((i) => i.config.name);
      expect(indexNames).toContain('idx_individual_process_schemas_interview_id');
    });

    it('synthesisResults has process_node_id index', () => {
      const config = getTableConfig(schema.synthesisResults);
      const indexNames = Object.values(config.indexes).map((i) => i.config.name);
      expect(indexNames).toContain('idx_synthesis_results_process_node_id');
    });
  });

  describe('foreign key relationships', () => {
    it('processNodes references projects and self', () => {
      const config = getTableConfig(schema.processNodes);
      const fkTableNames = config.foreignKeys.map((fk) =>
        getTableName(fk.reference().foreignTable),
      );
      expect(fkTableNames).toContain('projects');
      expect(fkTableNames).toContain('process_nodes');
    });

    it('interviews references interviewTokens, projects, and processNodes', () => {
      const config = getTableConfig(schema.interviews);
      const fkTableNames = config.foreignKeys.map((fk) =>
        getTableName(fk.reference().foreignTable),
      );
      expect(fkTableNames).toContain('interview_tokens');
      expect(fkTableNames).toContain('projects');
      expect(fkTableNames).toContain('process_nodes');
    });

    it('interviewExchanges references interviews', () => {
      const config = getTableConfig(schema.interviewExchanges);
      const fkTableNames = config.foreignKeys.map((fk) =>
        getTableName(fk.reference().foreignTable),
      );
      expect(fkTableNames).toContain('interviews');
    });

    it('projectSupervisors references projects and users', () => {
      const config = getTableConfig(schema.projectSupervisors);
      const fkTableNames = config.foreignKeys.map((fk) =>
        getTableName(fk.reference().foreignTable),
      );
      expect(fkTableNames).toContain('projects');
      expect(fkTableNames).toContain('users');
    });
  });

  describe('relations', () => {
    it('exports all relation definitions', () => {
      expect(schema.projectsRelations).toBeDefined();
      expect(schema.processNodesRelations).toBeDefined();
      expect(schema.usersRelations).toBeDefined();
      expect(schema.projectSupervisorsRelations).toBeDefined();
      expect(schema.projectSkillProvidersRelations).toBeDefined();
      expect(schema.interviewTokensRelations).toBeDefined();
      expect(schema.interviewsRelations).toBeDefined();
      expect(schema.interviewExchangesRelations).toBeDefined();
      expect(schema.individualProcessSchemasRelations).toBeDefined();
      expect(schema.structuredCapturesRelations).toBeDefined();
      expect(schema.synthesisResultsRelations).toBeDefined();
      expect(schema.synthesisCheckpointsRelations).toBeDefined();
    });
  });
});
