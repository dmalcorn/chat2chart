# MVP PRD: chat2chart — Minimal Running Demo

**Author:** Diane
**Date:** 2026-04-08
**Status:** Draft
**Scope:** Minimal viable demo of core product vision — interview, synthesis, visualization
**Reference:** Full PRD at [prd.md](prd.md), Treasury AI Use Case Inventory at [Treasury-AI-Use-Case-Inventory.csv](../brainstorming/Research/Treasury-AI-Use-Case-Inventory.csv)

---

## 1. Purpose

Demonstrate the core value proposition of chat2chart end-to-end: a frontline worker describes how they do their job through a voice conversation with an AI agent, the system extracts a structured process schema, and a supervisor compares the synthesized workflow across multiple interviews — seeing where workers agree and where they diverge.

This is not a reduced version of the full product. It is the smallest artifact that proves the core insight: **divergences between employees' accounts of the same process are discoveries to surface, not errors to resolve.**

### What This Demo Proves

1. An AI agent can conduct a process-aware interview via voice, using the reflect-and-confirm pattern
2. The system extracts a structured individual process schema from each interview and renders it as a personal diagram the interviewee validates
3. A synthesis engine correlates multiple interviews, identifying shared steps and annotating divergences
4. A supervisor can visually compare individual accounts against the synthesized workflow

### What This Demo Explicitly Excludes

- PM/admin UI (project creation, process tree building, interview link generation, dashboard)
- BPMN 2.0 export
- Supervisor editing, approval, or state transitions (viewing only)
- Review agent (conversational AI editing of synthesis)
- Process decomposition UI
- Interview link management UI
- Session resumability (pause/resume)
- Multiple domain skills
- Multiple LLM or STT providers

---

## 2. Demo Scenario: IRS Taxpayer Document Processing

Grounded in a real US Treasury AI initiative: **TREAS-IRS-64 — Integrate Word Processor AI for Digitalization**, which targets minimizing the transcription and storage of paper documents submitted by taxpayers. The demo captures the human process that this initiative aims to modernize.

### The Process

**Taxpayer Document Processing** — How IRS Document Processing Technicians (DPTs) handle incoming paper taxpayer correspondence, transforming physical mail into digital records in IRS systems.

### The Interviewees

Three DPTs at different IRS Service Centers, each describing how they process incoming taxpayer correspondence:

| Interviewee | Location | Expected Divergences |
|---|---|---|
| **Rachel Torres** | Austin, TX Service Center | Pre-sorts mail by form type before scanning; batches similar forms together for efficiency |
| **Marcus Williams** | Kansas City, MO Service Center | Scans all documents first, then classifies digitally using the system's auto-detect; relies more on the system |
| **Janet Park** | Ogden, UT Service Center | Adds a manual quality check step after data entry — spot-checks 1 in 5 entries against the original document before marking complete |

### Expected Synthesis Output

A normalized 5-7 step workflow (receive mail, open/sort, scan, classify, enter data, verify, route) with divergence annotations:
- **Sort timing divergence:** Austin pre-sorts physically; Kansas City and Ogden sort digitally after scanning
- **Classification method divergence:** Kansas City trusts system auto-detect; Austin and Ogden manually classify
- **Quality check divergence:** Ogden has a manual verification step the other two campuses skip

These divergences are the point — they reveal that "the same process" is actually three different processes, and a modernization initiative that assumes one canonical workflow will miss real operational variation.

### Seeded Process Tree

The database is pre-seeded with a minimal process tree (no PM UI to create it):

| Level | Node | Type |
|---|---|---|
| L1 | Taxpayer Document Processing | Organizational (root) |
| L2 | Receive and Digitize Incoming Mail | Leaf (interviews attach here) |

All three interviews and synthesis are scoped to the L2 leaf node.

---

## 3. User Experiences

This demo has exactly two user experiences:

### 3a. The Interviewee — Voice Interview

A DPT clicks a token-based link (e.g., `{base_url}/interview/{token}`). No login, no account creation — the token is the credential.

**Flow:**

1. **Welcome/consent screen** — States the process being discovered ("Receive and Digitize Incoming Mail"), discloses that an AI agent conducts the conversation, notes that responses are recorded and attributed, mentions speech capture by AI, and estimates ~90 seconds
2. **Begin Interview** — Worker clicks "Begin Interview," browser requests microphone permission
3. **Conversational interview (5-8 exchanges)** — Single-panel conversational thread. Worker clicks mic to record (red → green indicator with listening animation), speaks naturally, clicks "Done" when finished. Agent uses reflect-and-confirm: reformulates scattered speech into a clear reflective summary, worker confirms or corrects. Agent probes for decision points, exceptions, handoffs, and systems touched. Each exchange persisted to DB immediately.
4. **Individual process schema generation** — At interview completion, system extracts the worker's described process into a structured schema via programmatic NLP (compromise.js). Quality gate (structural, completeness, richness checks) auto-falls back to LLM if extraction fails. Worker never sees a failed extraction.
5. **Personal diagram validation** — Simple vertical Mermaid.js flowchart rendered for the worker: rounded rectangles for steps, diamonds for decisions, arrows for flow. Worker reviews and confirms "yes, that's my process" or identifies errors. If errors: LLM-based correction flow. If confirmed: diagram and schema persisted as validated artifacts.
6. **Read-only completed view** — Same token link shows read-only view of confirmed reflective summaries and validated personal diagram after completion.

**Voice Input Controls:**
- Red/green recording indicator (no auto-start, no silence detection)
- Explicit start/done recording buttons
- Listening animation while recording
- "Prefer to type?" toggle for fallback

**Interview Duration Target:** ~90 seconds, 5-8 exchanges. This is a demo — the agent should be efficient, not exhaustive.

### 3b. The Supervisor — Synthesis Viewing

A supervisor signs in via email/password (must be on the supervisor allowlist for this project). Accesses the review interface at `{base_url}/review`.

**What the supervisor sees:**

#### Mode 1: Individual Diagram Carousel (Full-Width, Default)

```
+----------------------------------------------------------+
|  < Rachel Torres - Austin, TX (1/3) >                    |
|                                                          |
|              [Step 1: Receive Mail]                      |
|                     |                                    |
|              [Step 2: Pre-Sort by Form Type]             |
|                     |                                    |
|              [Step 3: Scan Batch]                        |
|                     |                                    |
|              [Step 4: ...]                               |
|                                                          |
|                [Compare with Synthesis]                   |
+----------------------------------------------------------+
```

- Left/right arrow navigation through all three interviewees' personal diagrams
- Header shows: name, location, position in sequence (1/3, 2/3, 3/3)
- Each diagram is the validated individual process schema from that worker's interview
- Full viewport width — supervisor forms their own impression before seeing synthesis
- "Compare with Synthesis" button toggles to Mode 2

#### Mode 2: Pinned Synthesis + Individual Carousel (Split-Screen, 1200px+)

```
+-------------------------------+----------------------------+
| SYNTHESIZED WORKFLOW (~55%)   | < Rachel Torres (1/3) >    |
|                               |   (carousel, ~45%)         |
|  [Step 1: Receive Mail]      |                            |
|         |                     |  [Step 1: Receive Mail]    |
|  [Step 2: Sort/Classify]     |         |                   |
|     ** DIVERGENCE **          |  [Step 2: Pre-Sort by      |
|         |                     |   Form Type]               |
|  [Step 3: Scan Documents]    |         |                   |
|         |                     |  [Step 3: Scan Batch]      |
|  [Step 4: Enter Data]        |         |                   |
|         |                     |  [Step 4: ...]             |
|  [Step 5: Verify] **         |                            |
|     ** DIVERGENCE **          |                            |
|         |                     |                            |
|  [Step 6: Route to Workflow]  |                            |
+-------------------------------+----------------------------+
```

- Synthesis pinned on left (~55%), individual carousel on right (~45%)
- Divergence annotations on synthesis are clickable — clicking a divergence auto-navigates the carousel to the relevant interviewee and highlights the corresponding step
- Carousel retains same navigation controls as Mode 1
- Supervisor can toggle back to Mode 1 full-width view

**No editing, no approval, no review agent.** The supervisor can look but not touch. This is a viewing experience only.

---

## 4. Authentication & Access

### Interview Access
- Token-based URL: `{base_url}/interview/{token}`
- No login required — token is the credential
- Token resolves to the correct project, process node, interview skill, and interviewee slot
- Invalid tokens show: "This link isn't valid. Contact the person who sent it to you."

### Supervisor Access
- Email/password sign-in at `{base_url}/review`
- Per-project supervisor allowlist maintained in project seed data
- Allowlist editable by Diane directly (database or config file — no UI)
- Login screen messaging: "Sign in with the credentials provided by your project manager."
- Unauthenticated requests redirect to sign-in
- Session expiry: 24h default

### PM Allowlist
- Environment variable (`PM_EMAIL_ALLOWLIST`) for PM-level access
- In this MVP there is no PM UI, but the allowlist is maintained for auth infrastructure parity and future use
- PM credentials bootstrapped via environment variables (`FIRST_PM_EMAIL`, `FIRST_PM_PASSWORD`)

### What's on the public internet
- The interview links (token-protected, one-use-per-interviewee)
- The supervisor review page (email/password protected via allowlist)
- No open endpoints — everything requires either a valid token or authenticated session

---

## 5. AI Architecture (Two-Dimensional, Minimal)

### The Skill: Federal Document Processing

A custom interview domain skill for this demo. Defines what the AI agent probes for during interviews about federal document processing workflows.

**Skill definition** (markdown + frontmatter, loaded by `skill-loader.ts` → `prompt-assembler.ts`):

- **Domain context:** IRS Service Centers, paper taxpayer correspondence processing, digitalization pipeline
- **Probing targets:** Physical handling steps, scanning/imaging procedures, classification methods (manual vs. system-assisted), data entry procedures, quality checks, routing/disposition, systems touched (e.g., document management system, case management), handoffs between roles
- **Vocabulary:** DPT (Document Processing Technician), correspondence, batch, Form type, taxpayer identification number (TIN), Submission Processing, SCRS (Service Center Recognition System)
- **Follow-up strategies:** Ask about exceptions (damaged documents, illegible handwriting, missing information), ask about volume/throughput ("how many do you process in a shift?"), probe for informal practices ("anything you do that isn't in the manual?")

### The Provider: Claude (Default)

Single LLM provider for the demo. All AI agent skills use Claude via the provider registry (`src/lib/ai/provider-registry.ts`).

### STT Provider: Browser Web Speech API (Default)

Single STT provider. Chrome-optimized. "Prefer to type?" toggle as fallback.

### Skills Used

| AI Agent Skill | Purpose | Provider |
|---|---|---|
| Interview Agent | Conducts the process discovery conversation using Federal Document Processing domain skill | Claude |
| Diagram Correction Agent | LLM-based correction when interviewee identifies diagram errors (exception path) | Claude |

The Supervisor Review Agent skill (Phase 2) is **not included** — no editing capability in this demo.

---

## 6. Data Architecture (Seeded)

### Pre-Seeded Data

The database is populated via seed script with:

1. **Project** — "IRS Taxpayer Document Processing Discovery"
2. **Process tree** — L1 organizational root + L2 leaf node (see Section 2)
3. **PM account** — Bootstrapped via environment variable
4. **Supervisor account(s)** — On the per-project supervisor allowlist
5. **Two completed interviews** — Rachel Torres (Austin) and Marcus Williams (Kansas City), each with:
   - Full exchange history (5-8 exchanges each, reflect-and-confirm pattern)
   - Validated individual process schema (structured JSON)
   - Personal Mermaid.js diagram definition
   - Status: Captured
6. **One pending interview token** — For Janet Park (Ogden), status: Pending. This is the live demo interview.
7. **Synthesis result** — Generated from the two completed interviews, with divergence annotations. When the third interview completes, synthesis can be re-triggered to incorporate all three.
8. **Federal Document Processing domain skill** — Loaded from skill definition file

### Interview Exchange Persistence

Every exchange persisted to DB immediately on creation — not batched, not deferred. Each exchange record includes:
- `exchange_type`: `question` | `response` | `reflective_summary` | `confirmation` | `revised_summary`
- `segment_id`: Groups a question → response → reflective summary → confirmation cycle
- `is_verified`: Only true on `reflective_summary` or `revised_summary` that the interviewee confirmed
- Timestamp and attribution

### Source Attribution

Every element in both individual schemas and synthesis carries `sourceType`:
- `interview_discovered` — Interviewee confirmed the reflective summary
- `synthesis_inferred` — Engine matched/classified during synthesis
- `supervisor_contributed` — Not applicable in this demo (no supervisor editing)

---

## 7. Synthesis Engine

The synthesis engine is the critical path. It correlates the captured interviews for the leaf node and produces a normalized workflow with divergence annotations.

### Input

Either validated individual process schemas or verified reflective summaries from captured interviews (configurable). Minimum 2 interviews required.

### Output

A synthesized Process Schema containing:
- **Workflow:** Normalized sequence of steps, decision points, actors, and systems — representing the canonical process across all interviews
- **Divergence annotations:** Where interviews disagree, with attribution to specific interviewees, confidence levels, and explanatory context
- **Match metadata:** How the engine correlated steps across interviews (which steps from Interview A matched which steps from Interview B)

### Visualization

Mermaid.js flowchart rendered client-side from the synthesis JSON:
- Rounded rectangles for steps
- Diamonds for decision points
- Arrows for flow
- Divergence annotations rendered as highlighted nodes with colored badges
- Clickable divergence badges (in Mode 2) navigate the carousel to the relevant interviewee
- Pan/zoom for complex diagrams

---

## 8. Technical Stack

Identical to the full PRD — no deviations. See [project-context.md](../project-context.md) for pinned versions.

| Component | Technology |
|---|---|
| Framework | Next.js 16.2.2 (App Router) |
| Frontend | React 19.2.4, Tailwind CSS 4.2.2, shadcn/ui v4 |
| Database | PostgreSQL 17.9 via Railway |
| ORM | Drizzle 0.45.2 |
| LLM | Claude via @anthropic-ai/sdk 0.85.0 |
| NLP Extraction | compromise 14.15.0 |
| Validation | Zod 4.3.6 |
| Visualization | Mermaid 11.14.0 |
| STT | Browser Web Speech API |
| Deployment | Railway |

### Service Boundaries — Enforced

All service boundary rules from the full PRD apply without exception. See CLAUDE.md and [project-context.md](../project-context.md).

---

## 9. Functional Requirements (MVP Demo Scope)

Requirements are a subset of the full PRD. FR numbers reference the full PRD where applicable; new requirements specific to this demo use the MVPn prefix.

### Interview Access & Flow

| ID | Requirement |
|---|---|
| FR70 | Worker accesses interview via token-based URL — no login required |
| FR71 | System resolves token to project, process node, interview skill, and interviewee slot |
| FR72 | Welcome/consent screen: process name, AI disclosure, recording/attribution notice, speech capture notice, estimated duration (~90 seconds) |
| FR73 | "Begin Interview" triggers microphone permission and creates active session |
| FR74 | Token state resolution: consent screen (Pending), active interview (Active), read-only view (Completed/Captured) |
| FR75 | Read-only view of confirmed reflective summaries and personal diagram via same token after completion |
| FR76 | Invalid token error: "This link isn't valid. Contact the person who sent it to you." |
| MVP1 | Interview limited to 5-8 exchanges for demo scope (~90 seconds) |

### Voice Input

| ID | Requirement |
|---|---|
| FR11a | Red/green recording indicator — red = not recording, green = recording |
| FR11b | Explicit start recording button (no auto-start) |
| FR11c | Explicit "Done" button to stop recording (no silence detection) |
| FR11d | Listening animation while recording is active |
| FR11e | "Prefer to type?" toggle for text input fallback |
| FR14 | STT via pluggable provider interface (Browser Web Speech API for demo) |

### Interview Agent

| ID | Requirement |
|---|---|
| FR50 | Interview agent AI skill conducts process discovery conversation |
| MVP2 | Interview agent uses "Federal Document Processing" custom domain skill |
| FR50a | Domain skill loaded by skill-loader.ts, prompt assembled by prompt-assembler.ts — never hardcoded |
| FR7 | Single-panel conversational thread (agent and worker messages in natural order) |
| FR8 | Reflect-and-confirm pattern: agent reformulates scattered speech into reflective summaries, worker confirms or corrects |
| FR47 | Every exchange persisted to DB immediately — never batched |
| FR48 | Each exchange carries exchange_type, segment_id, timestamp, attribution |
| FR49 | Verified reflective summaries (is_verified = true) are the audit trail anchors |

### Individual Process Schema

| ID | Requirement |
|---|---|
| FR79 | Programmatic NLP extraction via compromise.js at interview completion — no LLM on happy path |
| FR80 | Quality gate: structural validity, completeness (step count vs. summary count), richness (decision points when conditional language exists) |
| FR81 | Automatic LLM fallback when quality gate fails — interviewee never sees failed extraction |
| FR82 | Personal process diagram rendered as simple vertical Mermaid.js flowchart (rounded rectangles, diamonds, arrows) |
| FR83 | Interviewee reviews diagram and confirms or identifies errors |
| FR84 | LLM-based conversational correction flow on exception path (diagram correction agent skill) |
| FR85 | Validated individual schema stored as persistent artifact in Process Schema format |

### Synthesis

| ID | Requirement |
|---|---|
| FR22 | Synthesis engine correlates multiple interviews for the same process node |
| FR23 | Engine produces normalized workflow with divergence annotations |
| FR24 | Divergence annotations attribute to specific interviewees with confidence levels |
| FR55a | Minimum 2 captured interviews required to trigger synthesis |
| MVP3 | Synthesis can be re-triggered after third interview completes to incorporate all three |
| FR33 | Synthesis output follows documented Process Schema structure |

### Supervisor Viewing

| ID | Requirement |
|---|---|
| MVP4 | Supervisor signs in via email/password, validated against per-project supervisor allowlist |
| MVP5 | Supervisor accesses review interface at `{base_url}/review` |
| MVP6 | Mode 1 (default): Full-width individual diagram carousel with left/right navigation, interviewee name + location in header, position indicator (1/3, 2/3, 3/3) |
| MVP7 | Mode 2: Split-screen — pinned synthesis diagram (~55% width) + individual carousel (~45% width). Toggle via "Compare with Synthesis" button |
| MVP8 | Divergence annotations on synthesis diagram are clickable — clicking auto-navigates carousel to relevant interviewee and highlights corresponding step |
| MVP9 | Supervisor can toggle between Mode 1 and Mode 2 freely |
| MVP10 | Viewing only — no editing, no approval, no state transitions |

### Authentication

| ID | Requirement |
|---|---|
| FR70 | Interview access: token-based, no login |
| MVP11 | Supervisor access: email/password sign-in against per-project allowlist |
| MVP12 | Supervisor allowlist editable by admin directly (no UI) |
| FR66 | PM allowlist via environment variable (infrastructure parity, no PM UI in demo) |
| FR66a | First PM bootstrapped via environment variable |
| MVP13 | All endpoints require either valid token or authenticated session — no open endpoints on public internet |
| MVP14 | Session expiry: 24h default for supervisor sessions |

### Seeded Data

| ID | Requirement |
|---|---|
| MVP15 | Seed script populates project, process tree (L1 org + L2 leaf), PM account, supervisor account(s) |
| MVP16 | Two completed interviews seeded with full exchange history, validated individual schemas, and personal diagrams (Rachel Torres - Austin, Marcus Williams - Kansas City) |
| MVP17 | One pending interview token seeded for live demo (Janet Park - Ogden) |
| MVP18 | Synthesis result seeded from two completed interviews with divergence annotations |
| MVP19 | Federal Document Processing domain skill definition file included in deployment |

---

## 10. Non-Functional Requirements (MVP Demo Scope)

| ID | Requirement |
|---|---|
| NFR1 | Interview agent response latency < 3 seconds (first token via SSE) |
| NFR2 | Raw speech transcript never shown to interviewee — first text they see is the agent's reflective summary |
| NFR9 | No interview data in browser localStorage/sessionStorage |
| NFR10b | Interview tokens: UUID v4, cryptographically random |
| MVP-NFR1 | Demo interview completes in ~90 seconds (5-8 exchanges) |
| MVP-NFR2 | Synthesis visualization loads in < 5 seconds |
| MVP-NFR3 | Supervisor carousel navigation is instant (no reload between slides) |
| MVP-NFR4 | Works in Chrome (latest 2 versions) — primary and only required browser for demo |
| MVP-NFR5 | Deployed on Railway with HTTPS via SSL termination |
| MVP-NFR6 | All LLM calls server-side — API keys never exposed to client |

---

## 11. Demo Flow (Suggested)

A suggested sequence for demonstrating the product:

1. **Open the pending interview link** (Janet Park, Ogden) in browser
2. **Show the consent screen** — explain what the worker sees before starting
3. **Conduct the live interview** (~90 seconds) — voice input, agent asks follow-ups, reflect-and-confirm in action
4. **Show the personal diagram** — system generates Janet's individual process flowchart, she confirms it
5. **Switch to supervisor view** — sign in, open Mode 1 carousel
6. **Browse individual diagrams** — click through Rachel, Marcus, Janet — audience sees three different accounts of "the same process"
7. **Toggle to Mode 2 comparison** — synthesis pinned on left, carousel on right
8. **Click a divergence** — carousel jumps to the interviewee who does it differently. This is the "aha" moment: "This would have taken me two weeks."

**Fallback plan:** If live voice interview has technical issues, the third interview (Janet) can be pre-seeded as well. Synthesis with all three interviews is the must-see moment; the live interview is impressive but not critical.

---

## 12. Risk Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Live STT fails during demo | High | "Prefer to type?" toggle as immediate fallback. Pre-seed third interview as backup — synthesis is the must-see, not the live interview |
| Synthesis quality insufficient with 2-3 interviews | Critical | Seeded interviews are crafted to produce clear, meaningful divergences. Test synthesis output before demo. |
| Compromise.js NLP extraction fails on demo interview | Medium | Automatic LLM fallback is transparent to interviewee. Test with similar content beforehand. |
| 90-second interview feels rushed | Medium | Agent tuned for efficiency — fewer, more targeted questions. Quality of reflective summaries matters more than quantity of exchanges. |
| Divergence click-to-navigate confuses audience | Low | Demo narrator explains what's happening as they click. Visual highlighting makes the connection obvious. |
