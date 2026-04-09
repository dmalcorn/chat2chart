import { describe, expect, it, vi, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Mock the middleware to either pass through or reject
const mockWithSupervisorAuth = vi.fn();
vi.mock('@/lib/auth/middleware', () => ({
  withSupervisorAuth: (handler: (...args: unknown[]) => unknown) => mockWithSupervisorAuth(handler),
}));

vi.mock('@/lib/db/queries', () => ({
  getProcessNodeById: vi.fn(),
  getSynthesisResultByNodeId: vi.fn(),
  getIndividualSchemasByNodeIdWithInterviewees: vi.fn(),
  isSupervisorForProject: vi.fn(),
}));

vi.mock('@/lib/synthesis/engine', () => ({
  runSynthesisPipeline: vi.fn(),
  SynthesisError: class SynthesisError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'SynthesisError';
      this.code = code;
    }
  },
}));

import { POST, GET } from './route';
import {
  getProcessNodeById,
  getSynthesisResultByNodeId,
  getIndividualSchemasByNodeIdWithInterviewees,
  isSupervisorForProject,
} from '@/lib/db/queries';
import { runSynthesisPipeline, SynthesisError } from '@/lib/synthesis/engine';

const mockGetNode = vi.mocked(getProcessNodeById);
const mockGetSynthesis = vi.mocked(getSynthesisResultByNodeId);
const mockGetSchemas = vi.mocked(getIndividualSchemasByNodeIdWithInterviewees);
const mockIsSupervisor = vi.mocked(isSupervisorForProject);
const mockRunPipeline = vi.mocked(runSynthesisPipeline);

const NODE_ID = randomUUID();
const PROJECT_ID = randomUUID();
const USER_ID = randomUUID();

function makeRequest(method: string, nodeId?: string) {
  return new NextRequest('http://localhost/api/synthesis/' + (nodeId ?? NODE_ID), {
    method,
    headers: { cookie: 'session=valid-token' },
  });
}

function makeSupervisorSession() {
  return {
    userId: USER_ID,
    email: 'supervisor@test.com',
    role: 'supervisor' as const,
    iat: Date.now(),
    exp: Date.now() + 86400,
  };
}

function makeLeafNode() {
  return {
    id: NODE_ID,
    projectId: PROJECT_ID,
    parentNodeId: null,
    name: 'Review Budget',
    description: null,
    level: 1,
    nodeType: 'leaf',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeSynthesisResult() {
  return {
    id: randomUUID(),
    projectId: PROJECT_ID,
    processNodeId: NODE_ID,
    synthesisVersion: 1,
    workflowJson: { normalizedWorkflow: [], divergenceAnnotations: [] },
    mermaidDefinition: 'flowchart TD\n  step1(["Scan"])',
    interviewCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeIndividualSchema() {
  return {
    id: randomUUID(),
    interviewId: randomUUID(),
    processNodeId: NODE_ID,
    schemaJson: { steps: [] },
    mermaidDefinition: 'flowchart TD\n  s1(["Step"])',
    validationStatus: 'valid',
    extractionMethod: 'programmatic',
    createdAt: new Date(),
    updatedAt: new Date(),
    intervieweeName: 'Janet Park',
    intervieweeRole: 'Mail Clerk',
  };
}

/**
 * Set up the middleware mock to pass through to the handler with a supervisor session.
 * Returns 401/403 based on the `scenario` parameter.
 */
function setupMiddleware(scenario: 'authenticated' | 'unauthenticated' | 'non-supervisor') {
  if (scenario === 'unauthenticated') {
    mockWithSupervisorAuth.mockImplementation(() => {
      return async () =>
        NextResponse.json(
          { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
          { status: 401 },
        );
    });
  } else if (scenario === 'non-supervisor') {
    mockWithSupervisorAuth.mockImplementation(() => {
      return async () =>
        NextResponse.json(
          { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
          { status: 403 },
        );
    });
  } else {
    mockWithSupervisorAuth.mockImplementation((handler: (...args: unknown[]) => unknown) => {
      return async (request: NextRequest) => handler(request, makeSupervisorSession());
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMiddleware('authenticated');
  mockIsSupervisor.mockResolvedValue(true);
});

// --- POST Tests ---

describe('POST /api/synthesis/[nodeId]', () => {
  it('triggers synthesis and returns 201 with valid supervisor session', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    const synthResult = {
      id: randomUUID(),
      projectId: PROJECT_ID,
      processNodeId: NODE_ID,
      synthesisVersion: 1,
      workflowJson: {},
      mermaidDefinition: null,
      interviewCount: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRunPipeline.mockResolvedValue(synthResult);

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data.id).toBe(synthResult.id);
  });

  it('returns 401 without session', async () => {
    setupMiddleware('unauthenticated');

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 with non-supervisor session', async () => {
    setupMiddleware('non-supervisor');

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 with nonexistent node', async () => {
    mockGetNode.mockResolvedValue(null);

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NODE_NOT_FOUND');
  });

  it('returns 400 with INSUFFICIENT_INTERVIEWS when guard fails', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockRunPipeline.mockRejectedValue(
      new SynthesisError('Insufficient interviews: found 1', 'INSUFFICIENT_INTERVIEWS'),
    );

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INSUFFICIENT_INTERVIEWS');
  });

  it('returns 500 with INTERNAL_ERROR on unexpected error', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockRunPipeline.mockRejectedValue(new Error('Unexpected failure'));

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 502 with SYNTHESIS_FAILED when pipeline fails with that code', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockRunPipeline.mockRejectedValue(
      new SynthesisError('Synthesis pipeline failed: LLM error', 'SYNTHESIS_FAILED'),
    );

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.code).toBe('SYNTHESIS_FAILED');
  });

  it('returns 400 for invalid nodeId format', async () => {
    const response = await POST(makeRequest('POST', 'not-a-uuid'), {
      params: Promise.resolve({ nodeId: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when supervisor lacks project access', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockIsSupervisor.mockResolvedValue(false);

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for non-leaf node', async () => {
    mockGetNode.mockResolvedValue({ ...makeLeafNode(), nodeType: 'organizational' });

    const response = await POST(makeRequest('POST'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_NODE_TYPE');
  });
});

// --- GET Tests ---

describe('GET /api/synthesis/[nodeId]', () => {
  it('returns 200 with synthesis and individual schemas for valid supervisor', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    const synthResult = makeSynthesisResult();
    mockGetSynthesis.mockResolvedValue(synthResult);
    const schema = makeIndividualSchema();
    mockGetSchemas.mockResolvedValue([schema]);

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.synthesis.id).toBe(synthResult.id);
    expect(body.data.synthesis.synthesisVersion).toBe(1);
    expect(body.data.synthesis.mermaidDefinition).toBeTruthy();
    expect(body.data.individualSchemas).toHaveLength(1);
    expect(body.data.individualSchemas[0].intervieweeName).toBe('Janet Park');
    expect(body.data.individualSchemas[0].intervieweeRole).toBe('Mail Clerk');
  });

  it('returns 401 for unauthenticated request', async () => {
    setupMiddleware('unauthenticated');

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 for non-supervisor role', async () => {
    setupMiddleware('non-supervisor');

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for invalid nodeId format', async () => {
    const response = await GET(makeRequest('GET', 'not-a-uuid'), {
      params: Promise.resolve({ nodeId: 'not-a-uuid' }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when supervisor lacks project access', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockIsSupervisor.mockResolvedValue(false);

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for nonexistent process node', async () => {
    mockGetNode.mockResolvedValue(null);

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('NODE_NOT_FOUND');
  });

  it('returns 404 when no synthesis results exist', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockGetSynthesis.mockResolvedValue(null);

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe('SYNTHESIS_NOT_FOUND');
  });

  it('response includes mermaidDefinition for both synthesis and individual schemas', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockGetSynthesis.mockResolvedValue(makeSynthesisResult());
    mockGetSchemas.mockResolvedValue([makeIndividualSchema()]);

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    const body = await response.json();
    expect(body.data.synthesis.mermaidDefinition).toBeDefined();
    expect(body.data.individualSchemas[0].mermaidDefinition).toBeDefined();
  });

  it('response follows { data: T } wrapper format', async () => {
    mockGetNode.mockResolvedValue(makeLeafNode());
    mockGetSynthesis.mockResolvedValue(makeSynthesisResult());
    mockGetSchemas.mockResolvedValue([]);

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('synthesis');
    expect(body.data).toHaveProperty('individualSchemas');
  });

  it('returns 500 with INTERNAL_ERROR on unexpected DB error', async () => {
    mockGetNode.mockRejectedValue(new Error('DB connection lost'));

    const response = await GET(makeRequest('GET'), {
      params: Promise.resolve({ nodeId: NODE_ID }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
