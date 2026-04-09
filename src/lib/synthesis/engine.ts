import {
  getCapturedInterviewsByNodeId,
  getIndividualSchemasByNodeId,
  getLatestSynthesisVersion,
  createSynthesisCheckpoint,
  createSynthesisResultWithVersion,
  getIntervieweeNamesByInterviewIds,
  getSynthesisCheckpoint,
  updateSynthesisResultMermaid,
} from '@/lib/db/queries';
import { correlateSteps } from './correlator';
import { classifyDivergences } from './divergence';
import { narrateDivergences } from './narrator';
import { generateSynthesisMermaid } from './mermaid-generator';
import type { SynthesisWorkflowJson } from './mermaid-generator';
import { toNormalizedSchemas } from '@/lib/ai/prompts/synthesis/match-template';
import { synthesisOutputSchema } from '@/lib/schema/synthesis';
import { classificationResultSchema } from '@/lib/schema/synthesis';
import { matchResultArraySchema } from '@/lib/schema/workflow';
import type { MatchResult, IndividualProcessSchema } from '@/lib/schema/workflow';
import type { ClassificationResult } from '@/lib/schema/synthesis';

export type SynthesisResult = {
  id: string;
  projectId: string;
  processNodeId: string;
  synthesisVersion: number;
  workflowJson: unknown;
  interviewCount: number;
};

export type SynthesisStageResult = {
  stage: string;
  data: unknown;
  durationMs: number;
};

export async function runSynthesisPipeline(
  nodeId: string,
  projectId: string,
): Promise<SynthesisResult> {
  try {
    // Guard: minimum 2 Captured interviews
    const capturedInterviews = await getCapturedInterviewsByNodeId(nodeId);
    if (capturedInterviews.length < 2) {
      throw new SynthesisError(
        `Insufficient interviews: found ${capturedInterviews.length}, need at least 2 Captured interviews for synthesis.`,
        'INSUFFICIENT_INTERVIEWS',
      );
    }

    // Stage 1: Collect
    const collectStart = Date.now();
    const schemas = await getIndividualSchemasByNodeId(nodeId);
    const collectDuration = Date.now() - collectStart;
    console.log(`[synthesis] Stage 1 (Collect): ${collectDuration}ms`);

    // Guard: ensure we have schemas for captured interviews (not just interview rows)
    if (schemas.length < 2) {
      throw new SynthesisError(
        `Insufficient process schemas: found ${schemas.length} schemas for ${capturedInterviews.length} captured interviews. At least 2 validated schemas are required.`,
        'INSUFFICIENT_INTERVIEWS',
      );
    }

    // Stage 2: Normalize (MVP pass-through)
    const normalizeStart = Date.now();
    const normalizedData = schemas;
    const normalizeDuration = Date.now() - normalizeStart;
    console.log(`[synthesis] Stage 2 (Normalize): ${normalizeDuration}ms`);

    // Determine synthesis version for checkpoint queries
    const latestVersion = await getLatestSynthesisVersion(nodeId);
    const checkpointVersion = latestVersion + 1;

    // Stage 3: Match (with checkpoint resume support)
    const interviewIds = capturedInterviews.map((i) => i.id);
    const interviewNames = await getIntervieweeNamesByInterviewIds(interviewIds);
    const normalizedSchemas = toNormalizedSchemas(normalizedData, interviewNames);

    let matchResults: MatchResult[];
    const existingMatchCheckpoint = await getSynthesisCheckpoint(
      projectId,
      nodeId,
      checkpointVersion,
      'match',
    );

    if (existingMatchCheckpoint) {
      const matchValidation = matchResultArraySchema.safeParse(existingMatchCheckpoint.resultJson);
      if (matchValidation.success) {
        matchResults = matchValidation.data;
        console.log(`[synthesis] Stage 3 (Match): resumed from checkpoint`);
      } else {
        // Checkpoint data invalid, re-run match
        const matchStart = Date.now();
        matchResults = await correlateSteps(normalizedSchemas, projectId);
        const matchDuration = Date.now() - matchStart;
        console.log(`[synthesis] Stage 3 (Match): ${matchDuration}ms`);

        await createSynthesisCheckpoint({
          projectId,
          processNodeId: nodeId,
          synthesisVersion: checkpointVersion,
          stage: 'match',
          resultJson: matchResults,
          durationMs: matchDuration,
        });
      }
    } else {
      const matchStart = Date.now();
      matchResults = await correlateSteps(normalizedSchemas, projectId);
      const matchDuration = Date.now() - matchStart;
      console.log(`[synthesis] Stage 3 (Match): ${matchDuration}ms`);

      await createSynthesisCheckpoint({
        projectId,
        processNodeId: nodeId,
        synthesisVersion: checkpointVersion,
        stage: 'match',
        resultJson: matchResults,
        durationMs: matchDuration,
      });
    }

    // Build enriched schemas for classify/narrate (with interviewee names and roles)
    const enrichedSchemas = schemas.map((schema) => ({
      interviewId: schema.interviewId,
      intervieweeName: interviewNames.get(schema.interviewId) ?? 'Unknown',
      intervieweeRole: null as string | null,
      schemaJson: schema.schemaJson as IndividualProcessSchema,
    }));

    // Stage 4: Classify (with resume support)
    let classificationResult: ClassificationResult;
    const existingClassifyCheckpoint = await getSynthesisCheckpoint(
      projectId,
      nodeId,
      checkpointVersion,
      'classify',
    );

    if (existingClassifyCheckpoint) {
      const checkpointValidation = classificationResultSchema.safeParse(
        existingClassifyCheckpoint.resultJson,
      );
      if (checkpointValidation.success) {
        classificationResult = checkpointValidation.data;
        console.log(`[synthesis] Stage 4 (Classify): resumed from checkpoint`);
      } else {
        classificationResult = await classifyDivergences({
          projectId,
          processNodeId: nodeId,
          synthesisVersion: checkpointVersion,
          matchResults,
          individualSchemas: enrichedSchemas,
        });
      }
    } else {
      const classifyStart = Date.now();
      classificationResult = await classifyDivergences({
        projectId,
        processNodeId: nodeId,
        synthesisVersion: checkpointVersion,
        matchResults,
        individualSchemas: enrichedSchemas,
      });
      const classifyDuration = Date.now() - classifyStart;
      console.log(`[synthesis] Stage 4 (Classify): ${classifyDuration}ms`);
    }

    // Stage 5: Narrate
    const narrateStart = Date.now();
    const narrationResult = await narrateDivergences({
      projectId,
      processNodeId: nodeId,
      synthesisVersion: checkpointVersion,
      classificationResult,
      individualSchemas: enrichedSchemas,
      matchResults,
    });
    const narrateDuration = Date.now() - narrateStart;
    console.log(`[synthesis] Stage 5 (Narrate): ${narrateDuration}ms`);

    // Assemble final synthesis output
    const synthesisOutput = {
      normalizedWorkflow: matchResults,
      divergenceAnnotations: narrationResult.divergences,
      matchMetadata: matchResults,
      narrativeSummary: narrationResult.summary,
      interviewCount: capturedInterviews.length,
      sourceInterviewIds: interviewIds,
    };

    // Validate final output
    synthesisOutputSchema.parse(synthesisOutput);

    // Store final result atomically (transaction prevents version race)
    const result = await createSynthesisResultWithVersion({
      projectId,
      processNodeId: nodeId,
      workflowJson: synthesisOutput,
      interviewCount: capturedInterviews.length,
    });

    // Generate Mermaid diagram and persist
    try {
      const mermaidDefinition = generateSynthesisMermaid(
        synthesisOutput as unknown as SynthesisWorkflowJson,
      );
      await updateSynthesisResultMermaid(result.id, mermaidDefinition);
    } catch (mermaidError) {
      // Mermaid generation failure is non-fatal — log and continue
      console.error('[synthesis] Mermaid generation failed:', mermaidError);
    }

    return {
      id: result.id,
      projectId,
      processNodeId: nodeId,
      synthesisVersion: result.synthesisVersion,
      workflowJson: synthesisOutput,
      interviewCount: capturedInterviews.length,
    };
  } catch (error) {
    if (error instanceof SynthesisError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new SynthesisError(`Synthesis pipeline failed: ${message}`, 'SYNTHESIS_FAILED');
  }
}

export class SynthesisError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'SynthesisError';
    this.code = code;
  }
}
