// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    NODE_ENV: 'test',
  },
}));

vi.mock('@/lib/interview/token', () => ({
  validateTokenFormat: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  getInterviewTokenByToken: vi.fn(),
  getInterviewByTokenId: vi.fn(),
  getProjectById: vi.fn(),
  getProcessNodeById: vi.fn(),
}));

import InterviewPage from './page';
import { validateTokenFormat } from '@/lib/interview/token';
import {
  getInterviewTokenByToken,
  getInterviewByTokenId,
  getProjectById,
  getProcessNodeById,
} from '@/lib/db/queries';

const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

const mockTokenRow = {
  id: 'token-row-id',
  projectId: 'project-id',
  processNodeId: 'node-id',
  token: VALID_TOKEN,
  intervieweeName: 'Jane Doe',
  intervieweeRole: 'Mail Clerk' as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  project: {
    id: 'project-id',
    name: 'Test Project',
    description: null,
    skillName: 'federal-document-processing',
    defaultLlmProvider: 'anthropic',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  processNode: {
    id: 'node-id',
    projectId: 'project-id',
    parentNodeId: null,
    name: 'Review Budget Request',
    description: null,
    level: 1,
    nodeType: 'leaf',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const mockProject = {
  id: 'project-id',
  name: 'Test Project',
  description: null,
  skillName: 'federal-document-processing',
  defaultLlmProvider: 'anthropic',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProcessNode = {
  id: 'node-id',
  projectId: 'project-id',
  parentNodeId: null,
  name: 'Review Budget Request',
  description: null,
  level: 1,
  nodeType: 'leaf',
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeInterview(status: 'pending' | 'active' | 'completed' | 'validating' | 'captured') {
  return {
    id: 'interview-id',
    tokenId: 'token-row-id',
    projectId: 'project-id',
    processNodeId: 'node-id',
    status,
    llmProvider: null,
    sttProvider: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeParams(token: string) {
  return Promise.resolve({ token });
}

function getComponentName(element: React.JSX.Element): string {
  const type = element.type;
  if (typeof type === 'function') return type.name || 'Anonymous';
  if (typeof type === 'string') return type;
  return 'Unknown';
}

function getNestedComponentName(element: React.JSX.Element): string {
  // ViewportCheck wraps the state component — check its children
  const name = getComponentName(element);
  if (name === 'ViewportCheck' && element.props?.children) {
    return getComponentName(element.props.children);
  }
  return name;
}

describe('InterviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders consent placeholder for pending state (no interview row)', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('InterviewFlowController');
  });

  it('renders active interview placeholder for active state', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(makeInterview('active'));
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('ActiveInterviewPlaceholder');
  });

  it('renders completed view placeholder for completed state', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(makeInterview('completed'));
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    const inner = getNestedComponentName(result as React.JSX.Element);
    expect(inner).toBe('CompletedViewPlaceholder');
    expect((result as React.JSX.Element).props.children.props.interviewState).toBe('completed');
  });

  it('renders completed view placeholder for captured state', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(makeInterview('captured'));
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    const inner = getNestedComponentName(result as React.JSX.Element);
    expect(inner).toBe('CompletedViewPlaceholder');
    expect((result as React.JSX.Element).props.children.props.interviewState).toBe('captured');
  });

  it('renders active interview placeholder for validating state', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(makeInterview('validating'));
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('ActiveInterviewPlaceholder');
  });

  it('renders invalid token screen for unexpected interview status', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(makeInterview('unknown_status' as 'active'));
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('InvalidTokenScreen');
  });

  it('renders invalid token screen for invalid format', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(false);

    const result = await InterviewPage({ params: makeParams('not-a-uuid') });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('InvalidTokenScreen');
    expect(getInterviewTokenByToken).not.toHaveBeenCalled();
  });

  it('renders invalid token screen for nonexistent token', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(null);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('InvalidTokenScreen');
  });

  it('renders invalid token screen when project is null', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(getProjectById).mockResolvedValue(null);
    vi.mocked(getProcessNodeById).mockResolvedValue(mockProcessNode);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('InvalidTokenScreen');
  });

  it('renders invalid token screen when processNode is null', async () => {
    vi.mocked(validateTokenFormat).mockReturnValue(true);
    vi.mocked(getInterviewTokenByToken).mockResolvedValue(mockTokenRow);
    vi.mocked(getInterviewByTokenId).mockResolvedValue(null);
    vi.mocked(getProjectById).mockResolvedValue(mockProject);
    vi.mocked(getProcessNodeById).mockResolvedValue(null);

    const result = await InterviewPage({ params: makeParams(VALID_TOKEN) });
    expect(getNestedComponentName(result as React.JSX.Element)).toBe('InvalidTokenScreen');
  });
});
