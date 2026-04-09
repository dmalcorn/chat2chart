import { z } from 'zod/v4';
import { matchResultArraySchema } from './workflow';

// --- Divergence Types ---

export const divergenceTypeSchema = z.enum([
  'genuinely_unique',
  'sequence_conflict',
  'uncertain_needs_review',
]);

export type DivergenceType = z.infer<typeof divergenceTypeSchema>;

// --- Divergence Annotation ---

export const divergenceAnnotationSchema = z.object({
  id: z.uuid(),
  stepId: z.uuid(),
  divergenceType: divergenceTypeSchema,
  intervieweeIds: z.array(z.string()).min(1),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  sourceType: z.literal('synthesis_inferred'),
});

export type DivergenceAnnotation = z.infer<typeof divergenceAnnotationSchema>;

// --- Implicit Step ---

export const implicitStepClassificationSchema = z.enum(['likely_omission', 'genuinely_different']);

export const implicitStepSchema = z.object({
  id: z.uuid(),
  stepId: z.uuid(),
  mentionedByIds: z.array(z.string()).min(1),
  omittedByIds: z.array(z.string()).min(1),
  classification: implicitStepClassificationSchema,
  confidence: z.number().min(0).max(1),
  sourceType: z.literal('synthesis_inferred'),
});

export type ImplicitStep = z.infer<typeof implicitStepSchema>;

// --- Classification Result (Stage 4 Output) ---

export const classificationResultSchema = z.object({
  divergences: z.array(divergenceAnnotationSchema),
  implicitSteps: z.array(implicitStepSchema),
  processedAt: z.iso.datetime(),
});

export type ClassificationResult = z.infer<typeof classificationResultSchema>;

// --- Narration Result (Stage 5 Output) ---

export const narrationResultSchema = z.object({
  divergences: z.array(divergenceAnnotationSchema),
  summary: z.string().min(1),
});

export type NarrationResult = z.infer<typeof narrationResultSchema>;

// --- Synthesis Output (Final Assembled Result) ---

export const synthesisOutputSchema = z.object({
  normalizedWorkflow: matchResultArraySchema,
  divergenceAnnotations: z.array(divergenceAnnotationSchema),
  matchMetadata: matchResultArraySchema,
  narrativeSummary: z.string(),
  interviewCount: z.number().int().min(2),
  sourceInterviewIds: z.array(z.string()),
});

export type SynthesisOutput = z.infer<typeof synthesisOutputSchema>;
