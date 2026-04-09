import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';

vi.mock('@/lib/db/queries', () => ({
  getCapturedInterviewsByNodeId: vi.fn(),
  getIndividualSchemasByNodeId: vi.fn(),
  getLatestSynthesisVersion: vi.fn(),
  createSynthesisCheckpoint: vi.fn(),
  createSynthesisResult: vi.fn(),
  createSynthesisResultWithVersion: vi.fn(),
  getIntervieweeNamesByInterviewIds: vi.fn(),
  getSynthesisCheckpoint: vi.fn(),
  updateSynthesisResultMermaid: vi.fn(),
}));

vi.mock('./correlator', () => ({
  correlateSteps: vi.fn(),
}));

vi.mock('./divergence', () => ({
  classifyDivergences: vi.fn(),
}));

vi.mock('./narrator', () => ({
  narrateDivergences: vi.fn(),
}));

vi.mock('./mermaid-generator', () => ({
  generateSynthesisMermaid: vi.fn().mockReturnValue('flowchart TD\n  step1(["Test"])'),
}));

vi.mock('@/lib/ai/prompts/synthesis/match-template', () => ({
  toNormalizedSchemas: vi.fn().mockReturnValue([]),
}));

vi.mock('@/lib/schema/synthesis', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/schema/synthesis')>();
  return {
    ...actual,
    synthesisOutputSchema: {
      parse: vi.fn().mockImplementation((data: unknown) => data),
    },
    classificationResultSchema: actual.classificationResultSchema,
  };
});

import { runSynthesisPipeline, SynthesisError } from './engine';
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

const mockGetCaptured = vi.mocked(getCapturedInterviewsByNodeId);
const mockGetSchemas = vi.mocked(getIndividualSchemasByNodeId);
const mockGetLatestVersion = vi.mocked(getLatestSynthesisVersion);
const mockCreateCheckpoint = vi.mocked(createSynthesisCheckpoint);
const mockCreateResultWithVersion = vi.mocked(createSynthesisResultWithVersion);
const mockGetNames = vi.mocked(getIntervieweeNamesByInterviewIds);
const mockGetCheckpoint = vi.mocked(getSynthesisCheckpoint);
const mockUpdateMermaid = vi.mocked(updateSynthesisResultMermaid);
const mockCorrelate = vi.mocked(correlateSteps);
const mockClassify = vi.mocked(classifyDivergences);
const mockNarrate = vi.mocked(narrateDivergences);
vi.mocked(generateSynthesisMermaid);

const NODE_ID = randomUUID();
const PROJECT_ID = randomUUID();

function makeMockInterview(id?: string) {
  return {
    id: id ?? randomUUID(),
    tokenId: randomUUID(),
    projectId: PROJECT_ID,
    processNodeId: NODE_ID,
    status: 'captured' as const,
    llmProvider: null,
    sttProvider: null,
    startedAt: new Date(),
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeMockMatchResult() {
  return {
    matchType: 'exact_match' as const,
    confidence: 0.95,
    rationale: 'Identical steps',
    sourceSteps: [
      {
        interviewId: randomUUID(),
        intervieweeName: 'Alice',
        stepId: randomUUID(),
        stepLabel: 'Scan',
      },
      {
        interviewId: randomUUID(),
        intervieweeName: 'Bob',
        stepId: randomUUID(),
        stepLabel: 'Scan',
      },
    ],
    sourceType: 'synthesis_inferred' as const,
  };
}

function makeMockClassificationResult() {
  return {
    divergences: [
      {
        id: randomUUID(),
        stepId: randomUUID(),
        divergenceType: 'genuinely_unique' as const,
        intervieweeIds: [randomUUID()],
        confidence: 0.8,
        explanation: '',
        sourceType: 'synthesis_inferred' as const,
      },
    ],
    implicitSteps: [],
    processedAt: new Date().toISOString(),
  };
}

function makeMockNarrationResult() {
  return {
    divergences: [
      {
        id: randomUUID(),
        stepId: randomUUID(),
        divergenceType: 'genuinely_unique' as const,
        intervieweeIds: [randomUUID()],
        confidence: 0.8,
        explanation: 'Janet performs an extra QC step.',
        sourceType: 'synthesis_inferred' as const,
      },
    ],
    summary: 'Workers follow a similar process with one notable divergence.',
  };
}

function makeMockSchema(interviewId: string) {
  return {
    id: randomUUID(),
    interviewId,
    processNodeId: NODE_ID,
    schemaJson: {
      schemaVersion: '1.0',
      processNodeId: NODE_ID,
      interviewId,
      steps: [
        {
          id: randomUUID(),
          label: 'Step',
          type: 'step',
          sourceType: 'interview_discovered',
          sourceExchangeIds: [],
        },
      ],
      connections: [],
      metadata: {
        extractionMethod: 'programmatic',
        extractedAt: new Date().toISOString(),
        stepCount: 1,
        decisionPointCount: 0,
      },
    },
    mermaidDefinition: null,
    validationStatus: 'valid',
    extractionMethod: 'programmatic',
    createdAt: new Date(),
    updatedAt: new Date(),
    interviewStatus: 'captured' as const,
  };
}

function setupSuccessfulPipeline() {
  const interviews = [makeMockInterview(), makeMockInterview()];
  mockGetCaptured.mockResolvedValue(interviews);
  mockGetSchemas.mockResolvedValue([
    makeMockSchema(interviews[0].id),
    makeMockSchema(interviews[1].id),
  ]);
  mockGetLatestVersion.mockResolvedValue(0);
  mockGetNames.mockResolvedValue(
    new Map([
      [interviews[0].id, 'Alice'],
      [interviews[1].id, 'Bob'],
    ]),
  );
  mockGetCheckpoint.mockResolvedValue(null);
  const matchResults = [makeMockMatchResult()];
  mockCorrelate.mockResolvedValue(matchResults);
  mockClassify.mockResolvedValue(makeMockClassificationResult());
  mockNarrate.mockResolvedValue(makeMockNarrationResult());
  mockCreateCheckpoint.mockResolvedValue({
    id: randomUUID(),
    projectId: PROJECT_ID,
    processNodeId: NODE_ID,
    synthesisVersion: 1,
    stage: 'match',
    resultJson: matchResults,
    durationMs: 100,
    createdAt: new Date(),
  });
  const resultId = randomUUID();
  mockCreateResultWithVersion.mockResolvedValue({
    id: resultId,
    synthesisVersion: 1,
  });
  mockUpdateMermaid.mockResolvedValue({
    id: resultId,
    projectId: PROJECT_ID,
    processNodeId: NODE_ID,
    synthesisVersion: 1,
    workflowJson: {},
    mermaidDefinition: 'flowchart TD',
    interviewCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { interviews, matchResults, resultId };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runSynthesisPipeline', () => {
  it('orchestrates all stages in order (Collect, Normalize, Match, Classify, Narrate)', async () => {
    setupSuccessfulPipeline();

    await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    // Collect: getIndividualSchemasByNodeId called
    expect(mockGetSchemas).toHaveBeenCalledWith(NODE_ID);
    // Match: correlateSteps called
    expect(mockCorrelate).toHaveBeenCalledOnce();
    // Classify: classifyDivergences called
    expect(mockClassify).toHaveBeenCalledOnce();
    // Narrate: narrateDivergences called
    expect(mockNarrate).toHaveBeenCalledOnce();
    // Final result stored atomically
    expect(mockCreateResultWithVersion).toHaveBeenCalledOnce();
  });

  it('calls Stage 4 after Stage 3 completes', async () => {
    setupSuccessfulPipeline();
    const callOrder: string[] = [];
    mockCorrelate.mockImplementation(async () => {
      callOrder.push('match');
      return [makeMockMatchResult()];
    });
    mockClassify.mockImplementation(async () => {
      callOrder.push('classify');
      return makeMockClassificationResult();
    });

    await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    expect(callOrder).toEqual(['match', 'classify']);
  });

  it('calls Stage 5 after Stage 4 completes', async () => {
    setupSuccessfulPipeline();
    const callOrder: string[] = [];
    mockClassify.mockImplementation(async () => {
      callOrder.push('classify');
      return makeMockClassificationResult();
    });
    mockNarrate.mockImplementation(async () => {
      callOrder.push('narrate');
      return makeMockNarrationResult();
    });

    await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    expect(callOrder).toEqual(['classify', 'narrate']);
  });

  it('persists final result to synthesis_results (not checkpoints) after Stage 5', async () => {
    setupSuccessfulPipeline();

    await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    expect(mockCreateResultWithVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        processNodeId: NODE_ID,
        interviewCount: 2,
        workflowJson: expect.objectContaining({
          divergenceAnnotations: expect.any(Array),
          narrativeSummary: expect.any(String),
          sourceInterviewIds: expect.any(Array),
        }),
      }),
    );
  });

  it('skips Stage 3 if valid match checkpoint exists (resume behavior)', async () => {
    setupSuccessfulPipeline();
    const matchResult = [makeMockMatchResult()];
    // getSynthesisCheckpoint is called for both match and classify — return match checkpoint for match call
    mockGetCheckpoint.mockImplementation(async (_projectId, _nodeId, _version, stage) => {
      if (stage === 'match') {
        return {
          id: randomUUID(),
          projectId: PROJECT_ID,
          processNodeId: NODE_ID,
          synthesisVersion: 1,
          stage: 'match',
          resultJson: matchResult,
          durationMs: 300,
          createdAt: new Date(),
        };
      }
      return null;
    });

    await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    // correlateSteps should NOT be called since match checkpoint exists
    expect(mockCorrelate).not.toHaveBeenCalled();
    // But classify and narrate should still be called
    expect(mockClassify).toHaveBeenCalledOnce();
    expect(mockNarrate).toHaveBeenCalledOnce();
  });

  it('skips Stage 4 if valid classify checkpoint exists (resume behavior)', async () => {
    setupSuccessfulPipeline();
    const classifyResult = makeMockClassificationResult();
    // getSynthesisCheckpoint returns classify checkpoint only
    mockGetCheckpoint.mockImplementation(async (_projectId, _nodeId, _version, stage) => {
      if (stage === 'classify') {
        return {
          id: randomUUID(),
          projectId: PROJECT_ID,
          processNodeId: NODE_ID,
          synthesisVersion: 1,
          stage: 'classify',
          resultJson: classifyResult,
          durationMs: 500,
          createdAt: new Date(),
        };
      }
      return null;
    });

    await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    // classifyDivergences should NOT be called since checkpoint exists
    expect(mockClassify).not.toHaveBeenCalled();
    // But narrate should still be called
    expect(mockNarrate).toHaveBeenCalledOnce();
  });

  it('rejects with fewer than 2 individual process schemas', async () => {
    const interviews = [makeMockInterview(), makeMockInterview()];
    mockGetCaptured.mockResolvedValue(interviews);
    mockGetSchemas.mockResolvedValue([makeMockSchema(interviews[0].id)]); // only 1 schema

    try {
      await runSynthesisPipeline(NODE_ID, PROJECT_ID);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SynthesisError);
      expect((error as SynthesisError).code).toBe('INSUFFICIENT_INTERVIEWS');
      expect((error as SynthesisError).message).toContain('Insufficient process schemas');
    }
  });

  it('rejects with fewer than 2 Captured interviews', async () => {
    mockGetCaptured.mockResolvedValue([makeMockInterview()]);

    await expect(runSynthesisPipeline(NODE_ID, PROJECT_ID)).rejects.toThrow(SynthesisError);
    await expect(runSynthesisPipeline(NODE_ID, PROJECT_ID)).rejects.toThrow(
      'Insufficient interviews',
    );
  });

  it('passes with exactly 2 Captured interviews', async () => {
    setupSuccessfulPipeline();

    const result = await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    expect(result).toBeDefined();
    expect(result.interviewCount).toBe(2);
  });

  it('uses atomic createSynthesisResultWithVersion for version safety', async () => {
    setupSuccessfulPipeline();

    await runSynthesisPipeline(NODE_ID, PROJECT_ID);

    expect(mockCreateResultWithVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT_ID,
        processNodeId: NODE_ID,
        interviewCount: 2,
      }),
    );
  });

  it('throws SynthesisError with INSUFFICIENT_INTERVIEWS code for guard failure', async () => {
    mockGetCaptured.mockResolvedValue([]);

    try {
      await runSynthesisPipeline(NODE_ID, PROJECT_ID);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SynthesisError);
      expect((error as SynthesisError).code).toBe('INSUFFICIENT_INTERVIEWS');
    }
  });

  it('wraps unexpected errors in SynthesisError', async () => {
    mockGetCaptured.mockRejectedValue(new Error('DB connection lost'));

    try {
      await runSynthesisPipeline(NODE_ID, PROJECT_ID);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(SynthesisError);
      expect((error as SynthesisError).code).toBe('SYNTHESIS_FAILED');
      expect((error as SynthesisError).message).toContain('DB connection lost');
    }
  });
});
