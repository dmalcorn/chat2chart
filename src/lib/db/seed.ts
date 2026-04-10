// Seed script — creates foundational demo data
// Usage: npx tsx src/lib/db/seed.ts
// Requires: DATABASE_URL, SESSION_SECRET env vars

import { eq } from 'drizzle-orm';
import { db } from './connection';
import {
  individualProcessSchemas,
  interviewExchanges,
  interviews,
  interviewTokens,
  processNodes,
  projects,
  projectSkillProviders,
  projectSupervisors,
  structuredCaptures,
  synthesisCheckpoints,
  synthesisResults,
  users,
} from './schema';
import { hashPassword } from '@/lib/auth/config';
import { individualProcessSchemaSchema } from '@/lib/schema/workflow';
import { synthesisOutputSchema } from '@/lib/schema/synthesis';
import {
  SEED_PROJECT_ID,
  SEED_L1_NODE_ID,
  SEED_L2_NODE_ID,
  SEED_SUPERVISOR_USER_ID,
  SEED_PROJECT_SUPERVISOR_ID,
  SEED_SKILL_PROVIDER_ID,
  SEED_TOKEN_RACHEL_ID,
  SEED_TOKEN_MARCUS_ID,
  SEED_TOKEN_JANET_ID,
  SEED_TOKEN_RACHEL,
  SEED_TOKEN_MARCUS,
  SEED_TOKEN_JANET,
  SEED_INTERVIEW_RACHEL_ID,
  SEED_INTERVIEW_MARCUS_ID,
  SEED_INTERVIEW_JANET_ID,
  SEED_SCHEMA_RACHEL_ID,
  SEED_SCHEMA_MARCUS_ID,
  SEED_SCHEMA_JANET_ID,
  SEED_CAPTURE_RACHEL_ID,
  SEED_CAPTURE_MARCUS_ID,
  SEED_CAPTURE_JANET_ID,
  SEED_SYNTHESIS_ID,
  SEED_SYNTHESIS_CHECKPOINT_MATCH_ID,
  SEED_SYNTHESIS_CHECKPOINT_CLASSIFY_ID,
  SEED_SYNTHESIS_V2_ID,
} from './seed-constants';
import {
  buildRachelExchanges,
  buildMarcusExchanges,
  buildJanetExchanges,
  buildRachelSchema,
  buildMarcusSchema,
  buildJanetSchema,
  RACHEL_MERMAID,
  MARCUS_MERMAID,
  JANET_MERMAID,
  RACHEL_CAPTURES,
  MARCUS_CAPTURES,
  JANET_CAPTURES,
  buildSynthesisOutput,
  SYNTHESIS_MERMAID,
  buildMatchCheckpoint,
  buildClassifyCheckpoint,
} from './seed-data';

const SEED_JANET = process.env.SEED_JANET_COMPLETED === 'true';

async function seedFoundational() {
  console.log('\n=== Story 6.1: Foundational Data ===\n');

  // --- Project ---
  const existingProject = await db.query.projects.findFirst({
    where: eq(projects.name, 'IRS Taxpayer Document Processing Discovery'),
  });

  if (existingProject) {
    console.log('✓ Project already exists, skipping');
  } else {
    await db.insert(projects).values({
      id: SEED_PROJECT_ID,
      name: 'IRS Taxpayer Document Processing Discovery',
      description:
        'Discover and document the taxpayer document processing workflow at IRS Service Centers through worker interviews.',
      skillName: 'federal-document-processing',
      defaultLlmProvider: 'anthropic',
    });
    console.log('✓ Created project: IRS Taxpayer Document Processing Discovery');
  }

  // --- L1 Process Node (organizational) ---
  const existingL1 = await db.query.processNodes.findFirst({
    where: eq(processNodes.id, SEED_L1_NODE_ID),
  });

  if (existingL1) {
    console.log('✓ L1 process node already exists, skipping');
  } else {
    await db.insert(processNodes).values({
      id: SEED_L1_NODE_ID,
      projectId: SEED_PROJECT_ID,
      parentNodeId: null,
      name: 'Taxpayer Document Processing',
      description: 'Top-level organizational node for the taxpayer document processing workflow.',
      level: 1,
      nodeType: 'organizational',
      sortOrder: 1,
    });
    console.log('✓ Created L1 node: Taxpayer Document Processing');
  }

  // --- L2 Process Node (leaf) ---
  const existingL2 = await db.query.processNodes.findFirst({
    where: eq(processNodes.id, SEED_L2_NODE_ID),
  });

  if (existingL2) {
    console.log('✓ L2 process node already exists, skipping');
  } else {
    await db.insert(processNodes).values({
      id: SEED_L2_NODE_ID,
      projectId: SEED_PROJECT_ID,
      parentNodeId: SEED_L1_NODE_ID,
      name: 'Receive and Digitize Incoming Mail',
      description:
        'Leaf process: receiving physical mail, scanning/digitizing, classifying, and routing documents.',
      level: 2,
      nodeType: 'leaf',
      sortOrder: 1,
    });
    console.log('✓ Created L2 node: Receive and Digitize Incoming Mail');
  }

  // --- Supervisor User ---
  const existingSupervisor = await db.query.users.findFirst({
    where: eq(users.email, 'supervisor@demo.local'),
  });

  if (existingSupervisor) {
    console.log('✓ Supervisor user already exists, skipping');
  } else {
    const passwordHash = await hashPassword('DemoPass123!');
    await db.insert(users).values({
      id: SEED_SUPERVISOR_USER_ID,
      email: 'supervisor@demo.local',
      passwordHash,
      name: 'Demo Supervisor',
      role: 'supervisor',
    });
    console.log('✓ Created supervisor: supervisor@demo.local (password: DemoPass123!)');
  }

  // --- Project Supervisor Link ---
  const existingPS = await db.query.projectSupervisors.findFirst({
    where: eq(projectSupervisors.id, SEED_PROJECT_SUPERVISOR_ID),
  });

  if (existingPS) {
    console.log('✓ Project-supervisor link already exists, skipping');
  } else {
    await db.insert(projectSupervisors).values({
      id: SEED_PROJECT_SUPERVISOR_ID,
      projectId: SEED_PROJECT_ID,
      userId: SEED_SUPERVISOR_USER_ID,
    });
    console.log('✓ Linked supervisor to project');
  }

  // --- Skill Provider Mapping ---
  const existingSP = await db.query.projectSkillProviders.findFirst({
    where: eq(projectSkillProviders.id, SEED_SKILL_PROVIDER_ID),
  });

  if (existingSP) {
    console.log('✓ Skill-provider mapping already exists, skipping');
  } else {
    await db.insert(projectSkillProviders).values({
      id: SEED_SKILL_PROVIDER_ID,
      projectId: SEED_PROJECT_ID,
      skillName: 'interview_agent',
      providerName: 'anthropic',
      modelName: 'claude-sonnet-4-6',
    });
    console.log('✓ Created skill-provider mapping: interview_agent → anthropic/claude-sonnet-4-6');
  }

  // --- Interview Tokens ---
  const existingTokenRachel = await db.query.interviewTokens.findFirst({
    where: eq(interviewTokens.id, SEED_TOKEN_RACHEL_ID),
  });

  if (existingTokenRachel) {
    console.log('✓ Interview tokens already exist, skipping');
  } else {
    await db.insert(interviewTokens).values([
      {
        id: SEED_TOKEN_RACHEL_ID,
        projectId: SEED_PROJECT_ID,
        processNodeId: SEED_L2_NODE_ID,
        token: SEED_TOKEN_RACHEL,
        intervieweeName: 'Rachel Torres',
        intervieweeRole: 'Mail Clerk',
      },
      {
        id: SEED_TOKEN_MARCUS_ID,
        projectId: SEED_PROJECT_ID,
        processNodeId: SEED_L2_NODE_ID,
        token: SEED_TOKEN_MARCUS,
        intervieweeName: 'Marcus Williams',
        intervieweeRole: 'Document Processor',
      },
      {
        id: SEED_TOKEN_JANET_ID,
        projectId: SEED_PROJECT_ID,
        processNodeId: SEED_L2_NODE_ID,
        token: SEED_TOKEN_JANET,
        intervieweeName: 'Janet Park',
        intervieweeRole: 'Mail Clerk',
      },
    ]);
    console.log('✓ Created interview tokens: Rachel Torres, Marcus Williams, Janet Park');
  }
}

async function seedInterviewsAndSynthesis() {
  console.log('\n=== Story 6.2: Interviews & Synthesis ===\n');

  // --- Interviews ---
  const existingRachelInterview = await db.query.interviews.findFirst({
    where: eq(interviews.id, SEED_INTERVIEW_RACHEL_ID),
  });

  if (existingRachelInterview) {
    console.log('✓ Interviews already exist, skipping');
  } else {
    await db.insert(interviews).values([
      {
        id: SEED_INTERVIEW_RACHEL_ID,
        tokenId: SEED_TOKEN_RACHEL_ID,
        projectId: SEED_PROJECT_ID,
        processNodeId: SEED_L2_NODE_ID,
        status: 'captured',
        llmProvider: 'anthropic',
        sttProvider: 'web-speech',
        startedAt: new Date('2026-04-01T09:00:00Z'),
        completedAt: new Date('2026-04-01T09:35:00Z'),
      },
      {
        id: SEED_INTERVIEW_MARCUS_ID,
        tokenId: SEED_TOKEN_MARCUS_ID,
        projectId: SEED_PROJECT_ID,
        processNodeId: SEED_L2_NODE_ID,
        status: 'captured',
        llmProvider: 'anthropic',
        sttProvider: 'web-speech',
        startedAt: new Date('2026-04-01T10:00:00Z'),
        completedAt: new Date('2026-04-01T10:40:00Z'),
      },
    ]);
    console.log('✓ Created interviews: Rachel Torres (captured), Marcus Williams (captured)');
  }

  // --- Exchanges ---
  const existingExchanges = await db.query.interviewExchanges.findFirst({
    where: eq(interviewExchanges.interviewId, SEED_INTERVIEW_RACHEL_ID),
  });

  if (existingExchanges) {
    console.log('✓ Exchanges already exist, skipping');
  } else {
    const rachelExchanges = buildRachelExchanges();
    const marcusExchanges = buildMarcusExchanges();
    await db.insert(interviewExchanges).values(rachelExchanges);
    await db.insert(interviewExchanges).values(marcusExchanges);
    console.log(
      `✓ Created exchanges: ${rachelExchanges.length} for Rachel, ${marcusExchanges.length} for Marcus`,
    );
  }

  // --- Individual Process Schemas ---
  const existingSchema = await db.query.individualProcessSchemas.findFirst({
    where: eq(individualProcessSchemas.id, SEED_SCHEMA_RACHEL_ID),
  });

  if (existingSchema) {
    console.log('✓ Individual process schemas already exist, skipping');
  } else {
    const rachelSchema = buildRachelSchema();
    const marcusSchema = buildMarcusSchema();

    // Validate against Zod schemas before inserting
    individualProcessSchemaSchema.parse(rachelSchema);
    individualProcessSchemaSchema.parse(marcusSchema);
    console.log('✓ Zod validation passed for both individual process schemas');

    await db.insert(individualProcessSchemas).values([
      {
        id: SEED_SCHEMA_RACHEL_ID,
        interviewId: SEED_INTERVIEW_RACHEL_ID,
        processNodeId: SEED_L2_NODE_ID,
        schemaJson: rachelSchema,
        mermaidDefinition: RACHEL_MERMAID,
        validationStatus: 'valid',
        extractionMethod: 'programmatic',
      },
      {
        id: SEED_SCHEMA_MARCUS_ID,
        interviewId: SEED_INTERVIEW_MARCUS_ID,
        processNodeId: SEED_L2_NODE_ID,
        schemaJson: marcusSchema,
        mermaidDefinition: MARCUS_MERMAID,
        validationStatus: 'valid',
        extractionMethod: 'programmatic',
      },
    ]);
    console.log('✓ Created individual process schemas: Rachel, Marcus');
  }

  // --- Structured Captures ---
  const existingCapture = await db.query.structuredCaptures.findFirst({
    where: eq(structuredCaptures.id, SEED_CAPTURE_RACHEL_ID),
  });

  if (existingCapture) {
    console.log('✓ Structured captures already exist, skipping');
  } else {
    await db.insert(structuredCaptures).values([
      {
        id: SEED_CAPTURE_RACHEL_ID,
        interviewId: SEED_INTERVIEW_RACHEL_ID,
        processNodeId: SEED_L2_NODE_ID,
        captureJson: RACHEL_CAPTURES,
      },
      {
        id: SEED_CAPTURE_MARCUS_ID,
        interviewId: SEED_INTERVIEW_MARCUS_ID,
        processNodeId: SEED_L2_NODE_ID,
        captureJson: MARCUS_CAPTURES,
      },
    ]);
    console.log('✓ Created structured captures: Rachel, Marcus');
  }

  // --- Synthesis Result ---
  const existingSynthesis = await db.query.synthesisResults.findFirst({
    where: eq(synthesisResults.id, SEED_SYNTHESIS_ID),
  });

  if (existingSynthesis) {
    console.log('✓ Synthesis result already exists, skipping');
  } else {
    const synthesisOutput = buildSynthesisOutput();

    // Validate against Zod schema before inserting
    synthesisOutputSchema.parse(synthesisOutput);
    console.log('✓ Zod validation passed for synthesis output');

    await db.insert(synthesisResults).values({
      id: SEED_SYNTHESIS_ID,
      projectId: SEED_PROJECT_ID,
      processNodeId: SEED_L2_NODE_ID,
      synthesisVersion: 1,
      workflowJson: synthesisOutput,
      mermaidDefinition: SYNTHESIS_MERMAID,
      interviewCount: 2,
    });
    console.log('✓ Created synthesis result (version 1, 2 interviews, 3 divergences)');
  }

  // --- Synthesis Checkpoints ---
  const existingCheckpoint = await db.query.synthesisCheckpoints.findFirst({
    where: eq(synthesisCheckpoints.id, SEED_SYNTHESIS_CHECKPOINT_MATCH_ID),
  });

  if (existingCheckpoint) {
    console.log('✓ Synthesis checkpoints already exist, skipping');
  } else {
    await db.insert(synthesisCheckpoints).values([
      {
        id: SEED_SYNTHESIS_CHECKPOINT_MATCH_ID,
        projectId: SEED_PROJECT_ID,
        processNodeId: SEED_L2_NODE_ID,
        synthesisVersion: 1,
        stage: 'match',
        resultJson: buildMatchCheckpoint(),
        durationMs: 215,
      },
      {
        id: SEED_SYNTHESIS_CHECKPOINT_CLASSIFY_ID,
        projectId: SEED_PROJECT_ID,
        processNodeId: SEED_L2_NODE_ID,
        synthesisVersion: 1,
        stage: 'classify',
        resultJson: buildClassifyCheckpoint(),
        durationMs: 148,
      },
    ]);
    console.log('✓ Created synthesis checkpoints: match (215ms), classify (148ms)');
  }
}

async function seedJanetCompleted() {
  console.log('\n=== Story 6.3 Fallback: Janet Park Completed Interview ===\n');

  // --- Interview ---
  const existingJanet = await db.query.interviews.findFirst({
    where: eq(interviews.id, SEED_INTERVIEW_JANET_ID),
  });

  if (existingJanet) {
    console.log('✓ Janet interview already exists, skipping');
  } else {
    await db.insert(interviews).values({
      id: SEED_INTERVIEW_JANET_ID,
      tokenId: SEED_TOKEN_JANET_ID,
      projectId: SEED_PROJECT_ID,
      processNodeId: SEED_L2_NODE_ID,
      status: 'captured',
      llmProvider: 'anthropic',
      sttProvider: 'web-speech',
      startedAt: new Date('2026-04-02T08:00:00Z'),
      completedAt: new Date('2026-04-02T08:30:00Z'),
    });
    console.log('✓ Created Janet Park interview (captured)');
  }

  // --- Exchanges ---
  const existingJanetExchanges = await db.query.interviewExchanges.findFirst({
    where: eq(interviewExchanges.interviewId, SEED_INTERVIEW_JANET_ID),
  });

  if (existingJanetExchanges) {
    console.log('✓ Janet exchanges already exist, skipping');
  } else {
    const janetExchanges = buildJanetExchanges();
    await db.insert(interviewExchanges).values(janetExchanges);
    console.log(`✓ Created ${janetExchanges.length} exchanges for Janet`);
  }

  // --- Individual Process Schema ---
  const existingJanetSchema = await db.query.individualProcessSchemas.findFirst({
    where: eq(individualProcessSchemas.id, SEED_SCHEMA_JANET_ID),
  });

  if (existingJanetSchema) {
    console.log('✓ Janet process schema already exists, skipping');
  } else {
    const janetSchema = buildJanetSchema();
    individualProcessSchemaSchema.parse(janetSchema);
    console.log('✓ Zod validation passed for Janet schema');

    await db.insert(individualProcessSchemas).values({
      id: SEED_SCHEMA_JANET_ID,
      interviewId: SEED_INTERVIEW_JANET_ID,
      processNodeId: SEED_L2_NODE_ID,
      schemaJson: janetSchema,
      mermaidDefinition: JANET_MERMAID,
      validationStatus: 'valid',
      extractionMethod: 'programmatic',
    });
    console.log('✓ Created Janet individual process schema');
  }

  // --- Structured Capture ---
  const existingJanetCapture = await db.query.structuredCaptures.findFirst({
    where: eq(structuredCaptures.id, SEED_CAPTURE_JANET_ID),
  });

  if (existingJanetCapture) {
    console.log('✓ Janet structured capture already exists, skipping');
  } else {
    await db.insert(structuredCaptures).values({
      id: SEED_CAPTURE_JANET_ID,
      interviewId: SEED_INTERVIEW_JANET_ID,
      processNodeId: SEED_L2_NODE_ID,
      captureJson: JANET_CAPTURES,
    });
    console.log('✓ Created Janet structured capture');
  }

  // --- Synthesis v2 with 3 interviews ---
  const existingSynthesisV2 = await db.query.synthesisResults.findFirst({
    where: eq(synthesisResults.id, SEED_SYNTHESIS_V2_ID),
  });

  if (existingSynthesisV2) {
    console.log('✓ Synthesis v2 already exists, skipping');
  } else {
    const synthesisOutput = buildSynthesisOutput();
    const synthesisV2 = {
      ...synthesisOutput,
      interviewCount: 3,
      sourceInterviewIds: [...synthesisOutput.sourceInterviewIds, SEED_INTERVIEW_JANET_ID],
    };
    synthesisOutputSchema.parse(synthesisV2);

    await db.insert(synthesisResults).values({
      id: SEED_SYNTHESIS_V2_ID,
      projectId: SEED_PROJECT_ID,
      processNodeId: SEED_L2_NODE_ID,
      synthesisVersion: 2,
      workflowJson: synthesisV2,
      mermaidDefinition: SYNTHESIS_MERMAID,
      interviewCount: 3,
    });
    console.log('✓ Created synthesis result v2 (3 interviews)');
  }
}

async function main() {
  try {
    await seedFoundational();
    await seedInterviewsAndSynthesis();
    if (SEED_JANET) {
      await seedJanetCompleted();
    } else {
      console.log(
        '\n(Janet Park token seeded as pending — use SEED_JANET_COMPLETED=true for fallback)',
      );
    }
    console.log('\n=== Seed complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

main();
