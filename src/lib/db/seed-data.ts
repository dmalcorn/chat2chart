// Seed data for Story 6.2: Completed interviews, schemas, and synthesis
// All JSON payloads validated against Zod schemas before insertion

import type { IndividualProcessSchema } from '@/lib/schema/workflow';
import type { SynthesisOutput } from '@/lib/schema/synthesis';
import type { ClassificationResult } from '@/lib/schema/synthesis';
import type { MatchResult } from '@/lib/schema/workflow';
import {
  SEED_L2_NODE_ID,
  SEED_INTERVIEW_RACHEL_ID,
  SEED_INTERVIEW_MARCUS_ID,
  SEED_INTERVIEW_JANET_ID,
  SEED_RACHEL_SEGMENT_IDS,
  SEED_MARCUS_SEGMENT_IDS,
  SEED_JANET_SEGMENT_IDS,
  SEED_RACHEL_STEP_IDS,
  SEED_MARCUS_STEP_IDS,
  SEED_JANET_STEP_IDS,
  SEED_SYNTHESIS_STEP_IDS,
  SEED_DIVERGENCE_SORT_TIMING_ID,
  SEED_DIVERGENCE_CLASSIFICATION_ID,
  SEED_DIVERGENCE_QC_CHECK_ID,
} from './seed-constants';

// =====================================================================
// Exchange Data — Rachel Torres (sorts BEFORE scanning)
// =====================================================================

export function buildRachelExchanges() {
  const exchanges: Array<{
    interviewId: string;
    segmentId: string;
    exchangeType: 'question' | 'response' | 'reflective_summary' | 'confirmation';
    speaker: 'agent' | 'interviewee';
    content: string;
    isVerified: boolean;
    sequenceNumber: number;
  }> = [];

  let seq = 1;

  const segments = [
    {
      segmentId: SEED_RACHEL_SEGMENT_IDS[0],
      question:
        'Can you walk me through what happens when you first receive incoming mail at the service center?',
      response:
        "Sure. Every morning, the mail trucks arrive at the loading dock around 6 AM. I'm usually there by 5:45 to prep. We unload the trays and bags of mail, check the manifest against what we received, and log the batch in our tracking system. Each batch gets a unique ID and timestamp.",
      summary:
        'You receive incoming mail at the loading dock each morning around 6 AM, unload trays and bags, verify against the manifest, and log each batch with a unique ID and timestamp in your tracking system.',
      confirmation: "Yes, that's exactly right.",
    },
    {
      segmentId: SEED_RACHEL_SEGMENT_IDS[1],
      question:
        'After logging the batch, what do you do next with the mail? Walk me through the sorting process.',
      response:
        "After logging, I sort the mail by document type before we scan anything. We separate 1040s, 1099s, W-2s, and general correspondence into different bins. This is important because each type goes through a different scanning profile. I check the envelope markings and any visible form numbers. If I can't tell, I open it and check the first page.",
      summary:
        'After logging, you manually sort mail by document type (1040, 1099, W-2, correspondence) into separate bins BEFORE scanning. You use envelope markings and visible form numbers to classify, opening envelopes when needed to check the first page.',
      confirmation: 'Correct, we always sort first then scan.',
    },
    {
      segmentId: SEED_RACHEL_SEGMENT_IDS[2],
      question: 'Once the mail is sorted into bins, how does the scanning process work?',
      response:
        'We take each bin to the scanning station. The 1040s go through a high-speed scanner with a specific profile that captures both sides. The 1099s use a different profile optimized for the smaller forms. Each batch gets a cover sheet with a barcode that links back to our logging system. I feed the documents, check for jams, and verify the page counts match.',
      summary:
        'You take sorted bins to the scanning station, using document-type-specific scanning profiles (e.g., double-sided for 1040s, optimized settings for 1099s). Each batch includes a barcoded cover sheet linking to the logging system, and you verify page counts after scanning.',
      confirmation: "That's right, each type has its own scanning profile.",
    },
    {
      segmentId: SEED_RACHEL_SEGMENT_IDS[3],
      question: 'After scanning, how are the documents classified in SCRS?',
      response:
        'Once scanned, the images go into SCRS — the Submission Classification and Routing System. It tries to auto-classify based on OCR and form detection. Most of the time it works, maybe 80% accuracy. But when it fails, I have to manually classify. I keep a reference binder with example forms at my desk. I look up the document type, match it to the SCRS category codes, and enter it manually.',
      summary:
        'Scanned images are processed by SCRS for auto-classification via OCR and form detection (~80% accuracy). When SCRS auto-classification fails, you manually classify documents using a reference binder of example forms and SCRS category codes.',
      confirmation: 'Yes, the manual fallback is a big part of my day honestly.',
    },
    {
      segmentId: SEED_RACHEL_SEGMENT_IDS[4],
      question: 'Tell me about the data entry step after classification.',
      response:
        "After classification, I do data entry for the key fields — taxpayer name, SSN, tax year, form type, and any dollar amounts on the first page. We use a data entry application that pulls up the scanned image side by side with the entry form. I type in the fields and tab through. There's a built-in validation that catches obvious errors like wrong SSN format.",
      summary:
        'After classification, you perform data entry of key fields (taxpayer name, SSN, tax year, form type, dollar amounts) using a side-by-side application showing the scanned image and entry form, with built-in validation for format errors.',
      confirmation: 'Correct.',
    },
    {
      segmentId: SEED_RACHEL_SEGMENT_IDS[5],
      question: 'What quality control checks happen before the documents are routed?',
      response:
        'QC is done at the batch level. I pull a sample from each batch — usually 10% or at least 5 documents, whichever is more. I compare the scanned image against the data entry to make sure everything matches. If I find errors above our threshold, the whole batch goes back for re-entry. If it passes, I approve the batch and it gets routed to the appropriate processing unit based on the form type.',
      summary:
        'You perform batch-level QC by sampling 10% (minimum 5 documents) per batch, comparing scanned images against data entry. Batches exceeding the error threshold are returned for re-entry; passing batches are approved and routed to the appropriate processing unit by form type.',
      confirmation: "That's exactly how we do it, yes.",
    },
  ];

  for (const seg of segments) {
    exchanges.push({
      interviewId: SEED_INTERVIEW_RACHEL_ID,
      segmentId: seg.segmentId,
      exchangeType: 'question',
      speaker: 'agent',
      content: seg.question,
      isVerified: false,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_RACHEL_ID,
      segmentId: seg.segmentId,
      exchangeType: 'response',
      speaker: 'interviewee',
      content: seg.response,
      isVerified: false,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_RACHEL_ID,
      segmentId: seg.segmentId,
      exchangeType: 'reflective_summary',
      speaker: 'agent',
      content: seg.summary,
      isVerified: true,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_RACHEL_ID,
      segmentId: seg.segmentId,
      exchangeType: 'confirmation',
      speaker: 'interviewee',
      content: seg.confirmation,
      isVerified: false,
      sequenceNumber: seq++,
    });
  }

  return exchanges;
}

// =====================================================================
// Exchange Data — Marcus Williams (scans BEFORE sorting)
// =====================================================================

export function buildMarcusExchanges() {
  const exchanges: Array<{
    interviewId: string;
    segmentId: string;
    exchangeType: 'question' | 'response' | 'reflective_summary' | 'confirmation';
    speaker: 'agent' | 'interviewee';
    content: string;
    isVerified: boolean;
    sequenceNumber: number;
  }> = [];

  let seq = 1;

  const segments = [
    {
      segmentId: SEED_MARCUS_SEGMENT_IDS[0],
      question:
        'Can you describe what happens when you first receive incoming mail at the service center?',
      response:
        'The mail comes in on trucks early morning. We unload at the dock, verify the counts against the shipping manifest, and log everything into our batch tracking system. Each delivery gets a batch number and we note the time, truck ID, and bag count. Pretty standard receiving process.',
      summary:
        'You receive incoming mail at the loading dock each morning, unload and verify counts against the shipping manifest, and log each delivery with a batch number, timestamp, truck ID, and bag count in the batch tracking system.',
      confirmation: 'Yep, that covers it.',
    },
    {
      segmentId: SEED_MARCUS_SEGMENT_IDS[1],
      question: 'What happens after you log the batch? How do you handle the documents next?',
      response:
        "We go straight to scanning. We don't sort first — we scan everything as-is in the order it comes out of the bags. Our scanners handle mixed document types fine. We use a universal scanning profile that captures both sides at 300 DPI. The sorting happens digitally after scanning, which I think is more efficient. The scanner operator just feeds documents continuously.",
      summary:
        'After logging, you proceed directly to scanning WITHOUT pre-sorting. You use a universal scanning profile (300 DPI, double-sided) that handles mixed document types. Sorting occurs digitally after scanning, which you consider more efficient.',
      confirmation: "Right, we scan first and sort digitally. It's faster that way.",
    },
    {
      segmentId: SEED_MARCUS_SEGMENT_IDS[2],
      question: 'How does the digital sorting work after scanning?',
      response:
        "Once everything is scanned, SCRS takes over. The system runs OCR on every page and identifies the form type automatically. It sorts the digital images into queues by document type — 1040 queue, 1099 queue, and so on. SCRS is really good at this, handles pretty much everything. I'd say it correctly classifies 95% or more. The few it can't figure out go into an exception queue.",
      summary:
        'After scanning, SCRS automatically runs OCR on all pages and sorts digital images into document-type queues (1040, 1099, etc.). You estimate SCRS achieves ~95%+ classification accuracy, with unrecognized documents routed to an exception queue.',
      confirmation: 'Yes, SCRS handles basically everything for classification.',
    },
    {
      segmentId: SEED_MARCUS_SEGMENT_IDS[3],
      question:
        'You mentioned an exception queue — how do you handle those unclassified documents?',
      response:
        "Honestly, I rarely deal with those. The exception queue goes to a specialist team. In my workflow, once SCRS classifies a document, I move to data entry. I don't do manual classification at all — SCRS handles it. If something shows up in exceptions, it's someone else's job.",
      summary:
        'You do not perform manual classification — SCRS handles all classification automatically. Exception queue items are handled by a specialist team, not part of your regular workflow.',
      confirmation: "That's correct, I never manually classify.",
    },
    {
      segmentId: SEED_MARCUS_SEGMENT_IDS[4],
      question: 'Tell me about your data entry process after classification.',
      response:
        'Data entry is pretty straightforward. I pull up the classified documents in the entry system, which shows me the scanned image on one side and the form fields on the other. I key in taxpayer info — name, SSN, tax year, amounts. The system validates SSN format and checks for obvious errors. I can process about 30-40 documents per hour depending on complexity.',
      summary:
        'You perform data entry using a side-by-side display of scanned images and entry form fields, keying in taxpayer information (name, SSN, tax year, amounts). The system validates SSN format and catches errors. You process approximately 30-40 documents per hour.',
      confirmation: 'Yes, that sounds right.',
    },
    {
      segmentId: SEED_MARCUS_SEGMENT_IDS[5],
      question: 'What quality control steps happen before routing the documents?',
      response:
        'I do QC on every single document I process, not batch sampling. After I enter the data, I go back through each record and verify the key fields against the image one more time. It takes extra time but I catch errors right away. Once I verify a document, I mark it as QC-complete and it gets routed automatically to the right processing unit based on form type.',
      summary:
        "You perform item-level QC on every document (not batch sampling), verifying each record's key fields against the scanned image after data entry. Verified documents are marked QC-complete and automatically routed to the appropriate processing unit by form type.",
      confirmation: "Yes, every document gets checked. It's more thorough than sampling.",
    },
  ];

  for (const seg of segments) {
    exchanges.push({
      interviewId: SEED_INTERVIEW_MARCUS_ID,
      segmentId: seg.segmentId,
      exchangeType: 'question',
      speaker: 'agent',
      content: seg.question,
      isVerified: false,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_MARCUS_ID,
      segmentId: seg.segmentId,
      exchangeType: 'response',
      speaker: 'interviewee',
      content: seg.response,
      isVerified: false,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_MARCUS_ID,
      segmentId: seg.segmentId,
      exchangeType: 'reflective_summary',
      speaker: 'agent',
      content: seg.summary,
      isVerified: true,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_MARCUS_ID,
      segmentId: seg.segmentId,
      exchangeType: 'confirmation',
      speaker: 'interviewee',
      content: seg.confirmation,
      isVerified: false,
      sequenceNumber: seq++,
    });
  }

  return exchanges;
}

// =====================================================================
// Individual Process Schemas
// =====================================================================

export function buildRachelSchema(): IndividualProcessSchema {
  return {
    schemaVersion: '1.0',
    processNodeId: SEED_L2_NODE_ID,
    interviewId: SEED_INTERVIEW_RACHEL_ID,
    steps: [
      {
        id: SEED_RACHEL_STEP_IDS[0],
        label: 'Receive Incoming Mail',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_RACHEL_SEGMENT_IDS[0]],
      },
      {
        id: SEED_RACHEL_STEP_IDS[1],
        label: 'Sort Mail by Document Type',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_RACHEL_SEGMENT_IDS[1]],
      },
      {
        id: SEED_RACHEL_STEP_IDS[2],
        label: 'Scan Documents',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_RACHEL_SEGMENT_IDS[2]],
      },
      {
        id: SEED_RACHEL_STEP_IDS[3],
        label: 'Classify with SCRS',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_RACHEL_SEGMENT_IDS[3]],
      },
      {
        id: SEED_RACHEL_STEP_IDS[4],
        label: 'Manually Classify Failed Documents',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_RACHEL_SEGMENT_IDS[3]],
      },
      {
        id: SEED_RACHEL_STEP_IDS[5],
        label: 'Enter Data',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_RACHEL_SEGMENT_IDS[4]],
      },
      {
        id: SEED_RACHEL_STEP_IDS[6],
        label: 'Perform Batch QC Check',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_RACHEL_SEGMENT_IDS[5]],
      },
    ],
    connections: [
      { from: SEED_RACHEL_STEP_IDS[0], to: SEED_RACHEL_STEP_IDS[1] },
      { from: SEED_RACHEL_STEP_IDS[1], to: SEED_RACHEL_STEP_IDS[2] },
      { from: SEED_RACHEL_STEP_IDS[2], to: SEED_RACHEL_STEP_IDS[3] },
      { from: SEED_RACHEL_STEP_IDS[3], to: SEED_RACHEL_STEP_IDS[4], label: 'SCRS fails' },
      { from: SEED_RACHEL_STEP_IDS[3], to: SEED_RACHEL_STEP_IDS[5], label: 'SCRS succeeds' },
      { from: SEED_RACHEL_STEP_IDS[4], to: SEED_RACHEL_STEP_IDS[5] },
      { from: SEED_RACHEL_STEP_IDS[5], to: SEED_RACHEL_STEP_IDS[6] },
    ],
    metadata: {
      extractionMethod: 'programmatic',
      extractedAt: '2026-04-01T10:00:00Z',
      stepCount: 7,
      decisionPointCount: 0,
    },
  };
}

export function buildMarcusSchema(): IndividualProcessSchema {
  return {
    schemaVersion: '1.0',
    processNodeId: SEED_L2_NODE_ID,
    interviewId: SEED_INTERVIEW_MARCUS_ID,
    steps: [
      {
        id: SEED_MARCUS_STEP_IDS[0],
        label: 'Receive Incoming Mail',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_MARCUS_SEGMENT_IDS[0]],
      },
      {
        id: SEED_MARCUS_STEP_IDS[1],
        label: 'Scan All Documents',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_MARCUS_SEGMENT_IDS[1]],
      },
      {
        id: SEED_MARCUS_STEP_IDS[2],
        label: 'Auto-Classify with SCRS',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_MARCUS_SEGMENT_IDS[2]],
      },
      {
        id: SEED_MARCUS_STEP_IDS[3],
        label: 'Route Exceptions to Specialist Team',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_MARCUS_SEGMENT_IDS[3]],
      },
      {
        id: SEED_MARCUS_STEP_IDS[4],
        label: 'Sort Documents Digitally',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_MARCUS_SEGMENT_IDS[2]],
      },
      {
        id: SEED_MARCUS_STEP_IDS[5],
        label: 'Enter Data',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_MARCUS_SEGMENT_IDS[4]],
      },
      {
        id: SEED_MARCUS_STEP_IDS[6],
        label: 'Perform Item-Level QC Check',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_MARCUS_SEGMENT_IDS[5]],
      },
    ],
    connections: [
      { from: SEED_MARCUS_STEP_IDS[0], to: SEED_MARCUS_STEP_IDS[1] },
      { from: SEED_MARCUS_STEP_IDS[1], to: SEED_MARCUS_STEP_IDS[2] },
      { from: SEED_MARCUS_STEP_IDS[2], to: SEED_MARCUS_STEP_IDS[3], label: 'Unrecognized' },
      { from: SEED_MARCUS_STEP_IDS[2], to: SEED_MARCUS_STEP_IDS[4], label: 'Classified' },
      { from: SEED_MARCUS_STEP_IDS[4], to: SEED_MARCUS_STEP_IDS[5] },
      { from: SEED_MARCUS_STEP_IDS[5], to: SEED_MARCUS_STEP_IDS[6] },
    ],
    metadata: {
      extractionMethod: 'programmatic',
      extractedAt: '2026-04-01T11:00:00Z',
      stepCount: 7,
      decisionPointCount: 0,
    },
  };
}

// =====================================================================
// Mermaid Diagrams — Individual
// =====================================================================

export const RACHEL_MERMAID = `graph TD
  A["Receive Incoming Mail"]
  B["Sort Mail by Document Type"]
  C["Scan Documents"]
  D["Classify with SCRS"]
  E["Manually Classify Failed Documents"]
  F["Enter Data"]
  G["Perform Batch QC Check"]
  A --> B
  B --> C
  C --> D
  D -->|"SCRS fails"| E
  D -->|"SCRS succeeds"| F
  E --> F
  F --> G`;

export const MARCUS_MERMAID = `graph TD
  A["Receive Incoming Mail"]
  B["Scan All Documents"]
  C["Auto-Classify with SCRS"]
  D["Route Exceptions to Specialist Team"]
  E["Sort Documents Digitally"]
  F["Enter Data"]
  G["Perform Item-Level QC Check"]
  A --> B
  B --> C
  C -->|"Unrecognized"| D
  C -->|"Classified"| E
  E --> F
  F --> G`;

// =====================================================================
// Structured Captures
// =====================================================================

export const RACHEL_CAPTURES = {
  captures: [
    {
      verb: 'Receive',
      object: 'incoming mail',
      purpose: 'Log and track incoming batches',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Sort',
      object: 'mail by document type',
      purpose: 'Separate for type-specific scanning profiles',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Scan',
      object: 'documents',
      purpose: 'Digitize physical documents with type-specific profiles',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Classify',
      object: 'scanned documents',
      purpose: 'Categorize via SCRS with manual fallback',
      actor: 'Mail Clerk',
      systemName: 'SCRS',
    },
    {
      verb: 'Enter',
      object: 'taxpayer data',
      purpose: 'Key in form fields for processing',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Perform',
      object: 'batch QC check',
      purpose: 'Verify data accuracy via batch sampling',
      actor: 'Mail Clerk',
    },
  ],
};

export const MARCUS_CAPTURES = {
  captures: [
    {
      verb: 'Receive',
      object: 'incoming mail',
      purpose: 'Log and track incoming batches',
      actor: 'Document Processor',
    },
    {
      verb: 'Scan',
      object: 'all documents',
      purpose: 'Digitize with universal profile before sorting',
      actor: 'Document Processor',
    },
    {
      verb: 'Classify',
      object: 'scanned documents',
      purpose: 'Auto-categorize via SCRS',
      actor: 'Document Processor',
      systemName: 'SCRS',
    },
    {
      verb: 'Sort',
      object: 'documents digitally',
      purpose: 'Organize into queues by form type after classification',
      actor: 'Document Processor',
    },
    {
      verb: 'Enter',
      object: 'taxpayer data',
      purpose: 'Key in form fields for processing',
      actor: 'Document Processor',
    },
    {
      verb: 'Perform',
      object: 'item-level QC check',
      purpose: 'Verify every document individually',
      actor: 'Document Processor',
    },
  ],
};

// =====================================================================
// Synthesis Output
// =====================================================================

export function buildSynthesisOutput(): SynthesisOutput {
  const normalizedWorkflow: MatchResult[] = [
    {
      matchType: 'exact_match',
      confidence: 0.95,
      rationale:
        'Both interviewees describe the same mail receiving process at the loading dock with manifest verification and batch logging.',
      sourceSteps: [
        {
          interviewId: SEED_INTERVIEW_RACHEL_ID,
          intervieweeName: 'Rachel Torres',
          stepId: SEED_RACHEL_STEP_IDS[0],
          stepLabel: 'Receive Incoming Mail',
        },
        {
          interviewId: SEED_INTERVIEW_MARCUS_ID,
          intervieweeName: 'Marcus Williams',
          stepId: SEED_MARCUS_STEP_IDS[0],
          stepLabel: 'Receive Incoming Mail',
        },
      ],
      sourceType: 'synthesis_inferred',
    },
    {
      matchType: 'semantic_match',
      confidence: 0.7,
      rationale:
        'Both perform sorting and scanning but in different order. Rachel sorts physically then scans; Marcus scans first then sorts digitally. Same activities, conflicting sequence.',
      sourceSteps: [
        {
          interviewId: SEED_INTERVIEW_RACHEL_ID,
          intervieweeName: 'Rachel Torres',
          stepId: SEED_RACHEL_STEP_IDS[1],
          stepLabel: 'Sort Mail by Document Type',
        },
        {
          interviewId: SEED_INTERVIEW_RACHEL_ID,
          intervieweeName: 'Rachel Torres',
          stepId: SEED_RACHEL_STEP_IDS[2],
          stepLabel: 'Scan Documents',
        },
        {
          interviewId: SEED_INTERVIEW_MARCUS_ID,
          intervieweeName: 'Marcus Williams',
          stepId: SEED_MARCUS_STEP_IDS[1],
          stepLabel: 'Scan All Documents',
        },
        {
          interviewId: SEED_INTERVIEW_MARCUS_ID,
          intervieweeName: 'Marcus Williams',
          stepId: SEED_MARCUS_STEP_IDS[4],
          stepLabel: 'Sort Documents Digitally',
        },
      ],
      sourceType: 'synthesis_inferred',
    },
    {
      matchType: 'semantic_match',
      confidence: 0.8,
      rationale:
        'Both use SCRS for classification but with different approaches to failures. Rachel manually classifies failed documents; Marcus routes exceptions to a specialist team.',
      sourceSteps: [
        {
          interviewId: SEED_INTERVIEW_RACHEL_ID,
          intervieweeName: 'Rachel Torres',
          stepId: SEED_RACHEL_STEP_IDS[3],
          stepLabel: 'Classify with SCRS',
        },
        {
          interviewId: SEED_INTERVIEW_MARCUS_ID,
          intervieweeName: 'Marcus Williams',
          stepId: SEED_MARCUS_STEP_IDS[2],
          stepLabel: 'Auto-Classify with SCRS',
        },
      ],
      sourceType: 'synthesis_inferred',
    },
    {
      matchType: 'unmatched',
      confidence: 0.9,
      rationale:
        'Rachel describes manually classifying documents when SCRS fails using a reference binder. Marcus never performs manual classification — exceptions go to a specialist team.',
      sourceSteps: [
        {
          interviewId: SEED_INTERVIEW_RACHEL_ID,
          intervieweeName: 'Rachel Torres',
          stepId: SEED_RACHEL_STEP_IDS[4],
          stepLabel: 'Manually Classify Failed Documents',
        },
      ],
      sourceType: 'synthesis_inferred',
    },
    {
      matchType: 'exact_match',
      confidence: 0.92,
      rationale:
        'Both describe the same data entry process with side-by-side image/form display and SSN validation.',
      sourceSteps: [
        {
          interviewId: SEED_INTERVIEW_RACHEL_ID,
          intervieweeName: 'Rachel Torres',
          stepId: SEED_RACHEL_STEP_IDS[5],
          stepLabel: 'Enter Data',
        },
        {
          interviewId: SEED_INTERVIEW_MARCUS_ID,
          intervieweeName: 'Marcus Williams',
          stepId: SEED_MARCUS_STEP_IDS[5],
          stepLabel: 'Enter Data',
        },
      ],
      sourceType: 'synthesis_inferred',
    },
    {
      matchType: 'semantic_match',
      confidence: 0.6,
      rationale:
        'Both perform QC but at different granularity. Rachel does batch-level sampling (10%); Marcus checks every individual document.',
      sourceSteps: [
        {
          interviewId: SEED_INTERVIEW_RACHEL_ID,
          intervieweeName: 'Rachel Torres',
          stepId: SEED_RACHEL_STEP_IDS[6],
          stepLabel: 'Perform Batch QC Check',
        },
        {
          interviewId: SEED_INTERVIEW_MARCUS_ID,
          intervieweeName: 'Marcus Williams',
          stepId: SEED_MARCUS_STEP_IDS[6],
          stepLabel: 'Perform Item-Level QC Check',
        },
      ],
      sourceType: 'synthesis_inferred',
    },
    {
      matchType: 'unmatched',
      confidence: 0.85,
      rationale:
        'Marcus routes SCRS exceptions to a specialist team. Rachel handles classification failures herself.',
      sourceSteps: [
        {
          interviewId: SEED_INTERVIEW_MARCUS_ID,
          intervieweeName: 'Marcus Williams',
          stepId: SEED_MARCUS_STEP_IDS[3],
          stepLabel: 'Route Exceptions to Specialist Team',
        },
      ],
      sourceType: 'synthesis_inferred',
    },
  ];

  return {
    normalizedWorkflow,
    divergenceAnnotations: [
      {
        id: SEED_DIVERGENCE_SORT_TIMING_ID,
        stepId: SEED_SYNTHESIS_STEP_IDS[1],
        divergenceType: 'sequence_conflict',
        intervieweeIds: [SEED_INTERVIEW_RACHEL_ID, SEED_INTERVIEW_MARCUS_ID],
        confidence: 0.85,
        explanation:
          'Rachel sorts incoming mail by document type BEFORE scanning, using physical bins for each form type. Marcus scans all documents FIRST using a universal profile, then sorts digitally after SCRS classification. Same activities, different ordering — likely reflects different site procedures.',
        sourceType: 'synthesis_inferred',
      },
      {
        id: SEED_DIVERGENCE_CLASSIFICATION_ID,
        stepId: SEED_SYNTHESIS_STEP_IDS[2],
        divergenceType: 'genuinely_unique',
        intervieweeIds: [SEED_INTERVIEW_RACHEL_ID],
        confidence: 0.9,
        explanation:
          'Rachel describes manually classifying documents when SCRS auto-classification fails, using a physical reference binder with example forms and category codes. Marcus says SCRS handles everything automatically and he never manually classifies — exceptions go to a specialist team. This represents a genuinely different workflow path.',
        sourceType: 'synthesis_inferred',
      },
      {
        id: SEED_DIVERGENCE_QC_CHECK_ID,
        stepId: SEED_SYNTHESIS_STEP_IDS[5],
        divergenceType: 'uncertain_needs_review',
        intervieweeIds: [SEED_INTERVIEW_RACHEL_ID, SEED_INTERVIEW_MARCUS_ID],
        confidence: 0.65,
        explanation:
          'Rachel performs batch-level QC by sampling 10% of each batch. Marcus performs item-level QC, checking every document individually. It is unclear whether this reflects a real process difference, personal practice variation, or different interpretations of QC requirements. Needs supervisor review.',
        sourceType: 'synthesis_inferred',
      },
    ],
    matchMetadata: normalizedWorkflow,
    narrativeSummary:
      'Two interviews were synthesized covering the "Receive and Digitize Incoming Mail" process. Both interviewees agree on the core workflow: receiving mail at the loading dock, scanning/digitizing, classifying via SCRS, data entry, QC checks, and routing. Three divergences were identified: (1) Sort timing — Rachel sorts physically before scanning while Marcus scans first and sorts digitally; (2) Classification method — Rachel manually classifies SCRS failures using a reference binder while Marcus relies entirely on automation; (3) QC approach — Rachel samples batches while Marcus checks every document. These divergences suggest procedural variation across service center locations that may warrant standardization review.',
    interviewCount: 2,
    sourceInterviewIds: [SEED_INTERVIEW_RACHEL_ID, SEED_INTERVIEW_MARCUS_ID],
  };
}

// =====================================================================
// Synthesis Mermaid Diagram
// =====================================================================

export const SYNTHESIS_MERMAID = `graph TD
  S1["Receive Incoming Mail"]
  S2["Sort / Scan Documents"]:::divergence-sequence
  S3["Classify with SCRS"]
  S4["Handle Classification Failures"]:::divergence-unique
  S5["Enter Data"]
  S6["Perform QC Check"]:::divergence-uncertain
  S7["Route to Processing Unit"]
  S1 --> S2
  S2 --> S3
  S3 -->|"Failures"| S4
  S3 -->|"Classified"| S5
  S4 --> S5
  S5 --> S6
  S6 --> S7
  classDef divergence-sequence fill:#FEF3C7,stroke:#D97706
  classDef divergence-unique fill:#DBEAFE,stroke:#2563EB
  classDef divergence-uncertain fill:#F3E8FF,stroke:#7C3AED`;

// =====================================================================
// Synthesis Checkpoints
// =====================================================================

export function buildMatchCheckpoint(): MatchResult[] {
  return buildSynthesisOutput().normalizedWorkflow;
}

export function buildClassifyCheckpoint(): ClassificationResult {
  const output = buildSynthesisOutput();
  return {
    divergences: output.divergenceAnnotations,
    implicitSteps: [],
    processedAt: '2026-04-01T12:00:00Z',
  };
}

// =====================================================================
// Janet Park — Fallback Data (Story 6.3)
// Similar to Rachel (sorts before scanning, batch QC) but from Ogden, UT
// =====================================================================

export function buildJanetExchanges() {
  const exchanges: Array<{
    interviewId: string;
    segmentId: string;
    exchangeType: 'question' | 'response' | 'reflective_summary' | 'confirmation';
    speaker: 'agent' | 'interviewee';
    content: string;
    isVerified: boolean;
    sequenceNumber: number;
  }> = [];

  let seq = 1;

  const segments = [
    {
      segmentId: SEED_JANET_SEGMENT_IDS[0],
      question:
        'Can you walk me through what happens when incoming mail first arrives at the Ogden service center?',
      response:
        "We get the mail trucks around 6:30 AM. My team unloads the trays, checks the manifest counts, and enters everything into our batch tracking system. We assign a batch ID, note the time, and move on to sorting. It's pretty routine.",
      summary:
        'You receive incoming mail at the Ogden service center around 6:30 AM, unload trays from trucks, verify manifest counts, and log each batch with an ID and timestamp in the tracking system.',
      confirmation: 'Yes, that covers it.',
    },
    {
      segmentId: SEED_JANET_SEGMENT_IDS[1],
      question: 'What happens after you log the batch? How do you process the mail next?',
      response:
        "We sort first, always. I separate everything by form type — 1040s in one bin, 1099s in another, W-2s, and then a catch-all for correspondence and unusual items. I look at the envelope window and any visible form identifiers. If it's not clear, I open it to check.",
      summary:
        'After logging, you manually sort mail by form type (1040, 1099, W-2, correspondence) into separate bins BEFORE scanning. You identify types by envelope markings, opening when necessary.',
      confirmation: "Right, sort first then scan. That's how we've always done it here.",
    },
    {
      segmentId: SEED_JANET_SEGMENT_IDS[2],
      question: 'Once sorted, how does scanning work at your site?',
      response:
        'Each bin goes to scanning. We have different scanner presets for each form type — 1040s get double-sided high-res, 1099s use a faster single-page profile. I feed the documents with a batch cover sheet barcode and verify page counts against the log.',
      summary:
        'You scan sorted bins using form-type-specific scanner presets (e.g., double-sided high-res for 1040s, single-page for 1099s). Each batch includes a barcoded cover sheet, and you verify page counts after scanning.',
      confirmation: 'Exactly.',
    },
    {
      segmentId: SEED_JANET_SEGMENT_IDS[3],
      question: 'After scanning, how are documents classified?',
      response:
        "SCRS does the classification after scanning. It auto-detects about 85% of the time. When it can't figure something out, I classify it myself. I have a reference guide pinned up at my station. I look up the form characteristics and pick the right SCRS code. It happens maybe 15% of the time.",
      summary:
        'SCRS auto-classifies ~85% of scanned documents. For the ~15% that fail, you manually classify using a reference guide at your station, matching form characteristics to SCRS category codes.',
      confirmation: 'Yes, the manual part is pretty common.',
    },
    {
      segmentId: SEED_JANET_SEGMENT_IDS[4],
      question: 'Tell me about data entry after classification.',
      response:
        'I key in the essential fields — name, SSN, tax year, form type, and key dollar amounts. The entry app shows the scan on one side and the form on the other. It validates SSN format automatically and flags obvious mismatches.',
      summary:
        'You perform data entry of key fields (name, SSN, tax year, form type, dollar amounts) using a side-by-side display of scanned image and entry form, with automatic SSN format validation.',
      confirmation: 'Correct.',
    },
    {
      segmentId: SEED_JANET_SEGMENT_IDS[5],
      question: 'What QC steps do you perform before routing?',
      response:
        "We do batch QC — pull a sample of 10% or at least 5 from each batch and check them against the scans. If the error rate is too high, the whole batch gets redone. If it's clean, we approve and route to the right processing group.",
      summary:
        'You perform batch-level QC by sampling 10% (minimum 5) per batch, comparing data entry against scans. Batches exceeding the error threshold are returned for re-entry; passing batches are approved and routed.',
      confirmation: "That's right.",
    },
  ];

  for (const seg of segments) {
    exchanges.push({
      interviewId: SEED_INTERVIEW_JANET_ID,
      segmentId: seg.segmentId,
      exchangeType: 'question',
      speaker: 'agent',
      content: seg.question,
      isVerified: false,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_JANET_ID,
      segmentId: seg.segmentId,
      exchangeType: 'response',
      speaker: 'interviewee',
      content: seg.response,
      isVerified: false,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_JANET_ID,
      segmentId: seg.segmentId,
      exchangeType: 'reflective_summary',
      speaker: 'agent',
      content: seg.summary,
      isVerified: true,
      sequenceNumber: seq++,
    });
    exchanges.push({
      interviewId: SEED_INTERVIEW_JANET_ID,
      segmentId: seg.segmentId,
      exchangeType: 'confirmation',
      speaker: 'interviewee',
      content: seg.confirmation,
      isVerified: false,
      sequenceNumber: seq++,
    });
  }

  return exchanges;
}

export function buildJanetSchema(): IndividualProcessSchema {
  return {
    schemaVersion: '1.0',
    processNodeId: SEED_L2_NODE_ID,
    interviewId: SEED_INTERVIEW_JANET_ID,
    steps: [
      {
        id: SEED_JANET_STEP_IDS[0],
        label: 'Receive Incoming Mail',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_JANET_SEGMENT_IDS[0]],
      },
      {
        id: SEED_JANET_STEP_IDS[1],
        label: 'Sort Mail by Document Type',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_JANET_SEGMENT_IDS[1]],
      },
      {
        id: SEED_JANET_STEP_IDS[2],
        label: 'Scan Documents',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_JANET_SEGMENT_IDS[2]],
      },
      {
        id: SEED_JANET_STEP_IDS[3],
        label: 'Classify with SCRS',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_JANET_SEGMENT_IDS[3]],
      },
      {
        id: SEED_JANET_STEP_IDS[4],
        label: 'Manually Classify Failed Documents',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_JANET_SEGMENT_IDS[3]],
      },
      {
        id: SEED_JANET_STEP_IDS[5],
        label: 'Enter Data',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_JANET_SEGMENT_IDS[4]],
      },
      {
        id: SEED_JANET_STEP_IDS[6],
        label: 'Perform Batch QC Check',
        type: 'step',
        sourceType: 'interview_discovered',
        sourceExchangeIds: [SEED_JANET_SEGMENT_IDS[5]],
      },
    ],
    connections: [
      { from: SEED_JANET_STEP_IDS[0], to: SEED_JANET_STEP_IDS[1] },
      { from: SEED_JANET_STEP_IDS[1], to: SEED_JANET_STEP_IDS[2] },
      { from: SEED_JANET_STEP_IDS[2], to: SEED_JANET_STEP_IDS[3] },
      { from: SEED_JANET_STEP_IDS[3], to: SEED_JANET_STEP_IDS[4], label: 'SCRS fails' },
      { from: SEED_JANET_STEP_IDS[3], to: SEED_JANET_STEP_IDS[5], label: 'SCRS succeeds' },
      { from: SEED_JANET_STEP_IDS[4], to: SEED_JANET_STEP_IDS[5] },
      { from: SEED_JANET_STEP_IDS[5], to: SEED_JANET_STEP_IDS[6] },
    ],
    metadata: {
      extractionMethod: 'programmatic',
      extractedAt: '2026-04-02T09:00:00Z',
      stepCount: 7,
      decisionPointCount: 0,
    },
  };
}

export const JANET_MERMAID = `graph TD
  A["Receive Incoming Mail"]
  B["Sort Mail by Document Type"]
  C["Scan Documents"]
  D["Classify with SCRS"]
  E["Manually Classify Failed Documents"]
  F["Enter Data"]
  G["Perform Batch QC Check"]
  A --> B
  B --> C
  C --> D
  D -->|"SCRS fails"| E
  D -->|"SCRS succeeds"| F
  E --> F
  F --> G`;

export const JANET_CAPTURES = {
  captures: [
    {
      verb: 'Receive',
      object: 'incoming mail',
      purpose: 'Log and track incoming batches',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Sort',
      object: 'mail by document type',
      purpose: 'Separate for type-specific scanning profiles',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Scan',
      object: 'documents',
      purpose: 'Digitize with form-specific scanner presets',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Classify',
      object: 'scanned documents',
      purpose: 'Categorize via SCRS with manual fallback',
      actor: 'Mail Clerk',
      systemName: 'SCRS',
    },
    {
      verb: 'Enter',
      object: 'taxpayer data',
      purpose: 'Key in form fields for processing',
      actor: 'Mail Clerk',
    },
    {
      verb: 'Perform',
      object: 'batch QC check',
      purpose: 'Verify data accuracy via batch sampling',
      actor: 'Mail Clerk',
    },
  ],
};
