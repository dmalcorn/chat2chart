import { z } from 'zod/v4';

// --- Source Type ---

export const sourceTypeSchema = z.enum(['interview_discovered', 'synthesis_inferred']);

export type SourceType = z.infer<typeof sourceTypeSchema>;

// --- Individual Step ---

export const individualStepSchema = z.object({
  id: z.uuid(),
  label: z.string().min(1),
  type: z.enum(['step', 'decision']),
  sourceType: z.enum(['interview_discovered', 'synthesis_inferred']),
  sourceExchangeIds: z.array(z.string()),
});

export type IndividualStep = z.infer<typeof individualStepSchema>;

// --- Individual Connection ---

export const individualConnectionSchema = z.object({
  from: z.uuid(),
  to: z.uuid(),
  label: z.string().optional(),
});

export type IndividualConnection = z.infer<typeof individualConnectionSchema>;

// --- Individual Process Schema ---

export const individualProcessSchemaSchema = z.object({
  schemaVersion: z.string(),
  processNodeId: z.uuid(),
  interviewId: z.uuid(),
  steps: z.array(individualStepSchema).min(1),
  connections: z.array(individualConnectionSchema),
  metadata: z.object({
    extractionMethod: z.enum(['programmatic', 'llm_fallback']),
    extractedAt: z.iso.datetime(),
    stepCount: z.number().int().min(1),
    decisionPointCount: z.number().int().min(0),
  }),
});

export type IndividualProcessSchema = z.infer<typeof individualProcessSchemaSchema>;

// --- Workflow Step (Synthesis Output) ---

export const workflowStepSchema = z.object({
  id: z.uuid(),
  action: z.string().min(1),
  object: z.string().min(1),
  actor: z.string().optional(),
  systems: z.array(z.string()).optional(),
  sourceType: sourceTypeSchema,
  sequenceOrder: z.number().int().min(0),
  sourceInterviewIds: z.array(z.string()).optional(),
});

export type WorkflowStep = z.infer<typeof workflowStepSchema>;

// --- Decision Point ---

export const decisionPointSchema = z.object({
  id: z.uuid(),
  condition: z.string().min(1),
  branches: z
    .array(
      z.object({
        label: z.string().min(1),
        targetStepId: z.uuid(),
      }),
    )
    .min(1),
  sourceType: sourceTypeSchema,
  sourceInterviewIds: z.array(z.string()).optional(),
});

export type DecisionPoint = z.infer<typeof decisionPointSchema>;

// --- Workflow Sequence ---

export const workflowSequenceSchema = z.object({
  steps: z.array(workflowStepSchema),
  decisions: z.array(decisionPointSchema),
  links: z.array(
    z.object({
      from: z.uuid(),
      to: z.uuid(),
      label: z.string().optional(),
    }),
  ),
});

export type WorkflowSequence = z.infer<typeof workflowSequenceSchema>;

// --- Process Schema (Top-Level Synthesis Output) ---

export const processSchemaSchema = z.object({
  schemaVersion: z.string(),
  processNodeId: z.uuid(),
  sequence: workflowSequenceSchema,
  actors: z.array(z.string()),
  metadata: z.object({
    synthesisVersion: z.number().int().min(1),
    interviewCount: z.number().int().min(2),
    synthesizedAt: z.iso.datetime(),
  }),
});

export type ProcessSchema = z.infer<typeof processSchemaSchema>;

// --- Match Types ---

export const matchTypeSchema = z.enum([
  'exact_match',
  'semantic_match',
  'subsumption',
  'split_merge',
  'unmatched',
]);

export type MatchType = z.infer<typeof matchTypeSchema>;

// --- Match Result (Stage 3 Output) ---

export const matchResultSchema = z.object({
  matchType: matchTypeSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  sourceSteps: z
    .array(
      z.object({
        interviewId: z.string(),
        intervieweeName: z.string(),
        stepId: z.string(),
        stepLabel: z.string(),
      }),
    )
    .min(1),
  sourceType: z.literal('synthesis_inferred'),
});

export type MatchResult = z.infer<typeof matchResultSchema>;

export const matchResultArraySchema = z.array(matchResultSchema);

// --- Synthesis Checkpoint ---

export const synthesisCheckpointSchema = z.object({
  projectId: z.uuid(),
  processNodeId: z.uuid(),
  synthesisVersion: z.number().int().min(1),
  stage: z.string().min(1),
  resultJson: z.unknown(),
  durationMs: z.number().int().min(0).optional(),
});

export type SynthesisCheckpoint = z.infer<typeof synthesisCheckpointSchema>;
