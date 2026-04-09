import { relations } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// --- Enums ---

export const interviewStatusEnum = pgEnum('interview_status', [
  'pending',
  'active',
  'completed',
  'validating',
  'captured',
]);

export const exchangeTypeEnum = pgEnum('exchange_type', [
  'question',
  'response',
  'reflective_summary',
  'confirmation',
  'revised_summary',
]);

export const speakerEnum = pgEnum('speaker', ['agent', 'interviewee']);

// --- Tables ---

// 1. projects
export const projects = pgTable('projects', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text(),
  skillName: text().notNull(),
  defaultLlmProvider: text().notNull().default('anthropic'),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// 2. processNodes
export const processNodes = pgTable(
  'process_nodes',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id),
    parentNodeId: uuid().references((): AnyPgColumn => processNodes.id),
    name: text().notNull(),
    description: text(),
    level: integer().notNull(),
    nodeType: text().notNull(),
    sortOrder: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_process_nodes_project_id').on(table.projectId),
    index('idx_process_nodes_parent_node_id').on(table.parentNodeId),
  ],
);

// 3. users
export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  name: text(),
  role: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// 4. projectSupervisors
export const projectSupervisors = pgTable(
  'project_supervisors',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.projectId, table.userId)],
);

// 5. projectSkillProviders
export const projectSkillProviders = pgTable(
  'project_skill_providers',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id),
    skillName: text().notNull(),
    providerName: text().notNull(),
    modelName: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.projectId, table.skillName)],
);

// 6. interviewTokens
export const interviewTokens = pgTable(
  'interview_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id),
    processNodeId: uuid()
      .notNull()
      .references(() => processNodes.id),
    token: text().notNull().unique(),
    intervieweeName: text().notNull(),
    intervieweeRole: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_interview_tokens_token').on(table.token),
    index('idx_interview_tokens_project_id').on(table.projectId),
  ],
);

// 7. interviews
export const interviews = pgTable(
  'interviews',
  {
    id: uuid().primaryKey().defaultRandom(),
    tokenId: uuid()
      .notNull()
      .unique()
      .references(() => interviewTokens.id),
    projectId: uuid()
      .notNull()
      .references(() => projects.id),
    processNodeId: uuid()
      .notNull()
      .references(() => processNodes.id),
    status: interviewStatusEnum().notNull().default('pending'),
    llmProvider: text(),
    sttProvider: text(),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_interviews_project_id').on(table.projectId),
    index('idx_interviews_process_node_id').on(table.processNodeId),
    index('idx_interviews_token_id').on(table.tokenId),
  ],
);

// 8. interviewExchanges (immutable — no updatedAt)
export const interviewExchanges = pgTable(
  'interview_exchanges',
  {
    id: uuid().primaryKey().defaultRandom(),
    interviewId: uuid()
      .notNull()
      .references(() => interviews.id),
    segmentId: uuid().notNull(),
    exchangeType: exchangeTypeEnum().notNull(),
    speaker: speakerEnum().notNull(),
    content: text().notNull(),
    isVerified: boolean().notNull().default(false),
    sequenceNumber: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_interview_exchanges_interview_id').on(table.interviewId),
    index('idx_interview_exchanges_segment_id').on(table.segmentId),
    unique('uq_interview_exchanges_sequence').on(table.interviewId, table.sequenceNumber),
  ],
);

// 9. individualProcessSchemas
export const individualProcessSchemas = pgTable(
  'individual_process_schemas',
  {
    id: uuid().primaryKey().defaultRandom(),
    interviewId: uuid()
      .notNull()
      .unique()
      .references(() => interviews.id),
    processNodeId: uuid()
      .notNull()
      .references(() => processNodes.id),
    schemaJson: jsonb().notNull(),
    mermaidDefinition: text(),
    validationStatus: text().notNull(),
    extractionMethod: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_individual_process_schemas_interview_id').on(table.interviewId)],
);

// 10. structuredCaptures
export const structuredCaptures = pgTable(
  'structured_captures',
  {
    id: uuid().primaryKey().defaultRandom(),
    interviewId: uuid()
      .notNull()
      .references(() => interviews.id),
    processNodeId: uuid()
      .notNull()
      .references(() => processNodes.id),
    captureJson: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_structured_captures_interview_id').on(table.interviewId)],
);

// 11. synthesisResults
export const synthesisResults = pgTable(
  'synthesis_results',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id),
    processNodeId: uuid()
      .notNull()
      .references(() => processNodes.id),
    synthesisVersion: integer().notNull(),
    workflowJson: jsonb().notNull(),
    mermaidDefinition: text(),
    interviewCount: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('idx_synthesis_results_process_node_id').on(table.processNodeId)],
);

// 12. synthesisCheckpoints
export const synthesisCheckpoints = pgTable('synthesis_checkpoints', {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid()
    .notNull()
    .references(() => projects.id),
  processNodeId: uuid()
    .notNull()
    .references(() => processNodes.id),
  synthesisVersion: integer().notNull(),
  stage: text().notNull(),
  resultJson: jsonb().notNull(),
  durationMs: integer(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// --- Relations ---

export const projectsRelations = relations(projects, ({ many }) => ({
  processNodes: many(processNodes),
  projectSupervisors: many(projectSupervisors),
  projectSkillProviders: many(projectSkillProviders),
  interviewTokens: many(interviewTokens),
  interviews: many(interviews),
  synthesisResults: many(synthesisResults),
  synthesisCheckpoints: many(synthesisCheckpoints),
}));

export const processNodesRelations = relations(processNodes, ({ one, many }) => ({
  project: one(projects, {
    fields: [processNodes.projectId],
    references: [projects.id],
  }),
  parentNode: one(processNodes, {
    fields: [processNodes.parentNodeId],
    references: [processNodes.id],
    relationName: 'parentChild',
  }),
  childNodes: many(processNodes, { relationName: 'parentChild' }),
  interviewTokens: many(interviewTokens),
  interviews: many(interviews),
  individualProcessSchemas: many(individualProcessSchemas),
  structuredCaptures: many(structuredCaptures),
  synthesisResults: many(synthesisResults),
  synthesisCheckpoints: many(synthesisCheckpoints),
}));

export const usersRelations = relations(users, ({ many }) => ({
  projectSupervisors: many(projectSupervisors),
}));

export const projectSupervisorsRelations = relations(projectSupervisors, ({ one }) => ({
  project: one(projects, {
    fields: [projectSupervisors.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectSupervisors.userId],
    references: [users.id],
  }),
}));

export const projectSkillProvidersRelations = relations(projectSkillProviders, ({ one }) => ({
  project: one(projects, {
    fields: [projectSkillProviders.projectId],
    references: [projects.id],
  }),
}));

export const interviewTokensRelations = relations(interviewTokens, ({ one, many }) => ({
  project: one(projects, {
    fields: [interviewTokens.projectId],
    references: [projects.id],
  }),
  processNode: one(processNodes, {
    fields: [interviewTokens.processNodeId],
    references: [processNodes.id],
  }),
  interviews: many(interviews),
}));

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  token: one(interviewTokens, {
    fields: [interviews.tokenId],
    references: [interviewTokens.id],
  }),
  project: one(projects, {
    fields: [interviews.projectId],
    references: [projects.id],
  }),
  processNode: one(processNodes, {
    fields: [interviews.processNodeId],
    references: [processNodes.id],
  }),
  exchanges: many(interviewExchanges),
  individualProcessSchema: one(individualProcessSchemas),
  structuredCaptures: many(structuredCaptures),
}));

export const interviewExchangesRelations = relations(interviewExchanges, ({ one }) => ({
  interview: one(interviews, {
    fields: [interviewExchanges.interviewId],
    references: [interviews.id],
  }),
}));

export const individualProcessSchemasRelations = relations(individualProcessSchemas, ({ one }) => ({
  interview: one(interviews, {
    fields: [individualProcessSchemas.interviewId],
    references: [interviews.id],
  }),
  processNode: one(processNodes, {
    fields: [individualProcessSchemas.processNodeId],
    references: [processNodes.id],
  }),
}));

export const structuredCapturesRelations = relations(structuredCaptures, ({ one }) => ({
  interview: one(interviews, {
    fields: [structuredCaptures.interviewId],
    references: [interviews.id],
  }),
  processNode: one(processNodes, {
    fields: [structuredCaptures.processNodeId],
    references: [processNodes.id],
  }),
}));

export const synthesisResultsRelations = relations(synthesisResults, ({ one }) => ({
  project: one(projects, {
    fields: [synthesisResults.projectId],
    references: [projects.id],
  }),
  processNode: one(processNodes, {
    fields: [synthesisResults.processNodeId],
    references: [processNodes.id],
  }),
}));

export const synthesisCheckpointsRelations = relations(synthesisCheckpoints, ({ one }) => ({
  project: one(projects, {
    fields: [synthesisCheckpoints.projectId],
    references: [projects.id],
  }),
  processNode: one(processNodes, {
    fields: [synthesisCheckpoints.processNodeId],
    references: [processNodes.id],
  }),
}));
