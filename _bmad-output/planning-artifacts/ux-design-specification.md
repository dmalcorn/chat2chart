---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
lastStep: 14
status: complete
completedAt: '2026-04-08'
inputDocuments:
  - prd.md
  - ref_docs/ux-design-specification.md
  - ref_docs/ux-design-directions.html
---

# UX Design Specification chat2chart

**Author:** Diane
**Date:** 2026-04-08

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

chat2chart is a stripped-down demo of the chat2chart platform, proving the core value proposition end-to-end: a frontline worker describes how they do their job through a voice conversation with an AI agent, the system extracts a structured process schema, and a supervisor compares the synthesized workflow across multiple interviews — seeing where workers agree and where they diverge. The core innovation: **divergences between employees' accounts of the same process are discoveries to surface, not errors to resolve.**

This demo is grounded in a real IRS scenario (TREAS-IRS-64) where three Document Processing Technicians at different Service Centers describe the same taxpayer document processing workflow — revealing meaningful operational variation that a modernization initiative would otherwise miss.

### Target Users

**The Interviewee (Frontline Worker / DPT):** Non-technical federal worker, potentially skeptical of modernization projects. Needs zero-friction access (token-based link, no login), natural conversational flow, and the emotional experience of being genuinely heard. Desktop or tablet at their workstation (768px minimum). No mobile support. Success metric: willingness to recommend the experience to colleagues.

**The Supervisor:** Process owner who compares individual accounts and the synthesized workflow. Signs in with email/password validated against a per-project allowlist. Desktop with large monitor (1200px+) for the split-screen comparison view. In this demo, the supervisor can look but not touch — viewing only, no editing, no approval, no state transitions.

### Key Design Challenges

1. **Two radically different interaction modes from one codebase:** An intimate, emotional, speech-driven conversation experience (the interview) vs. an analytical, information-dense comparison view (the supervisor review). They share a design system but serve completely different emotional needs and must both excel without compromising either.

2. **The consent screen IS the product's first impression:** Before the interviewee speaks a word, this screen must communicate safety, clarity, and respect. If it feels like a legal form or compliance exercise, the interviewee is guarded before the conversation starts. It needs to feel warm, clear, and simple — Typeform-inspired, not checkbox-driven.

3. **Divergences must read as discoveries, not errors:** The synthesis view uses teal/accent colors intentionally — curiosity and insight, never red, never alarm. Color-coding, annotation design, drill-down patterns, and explanatory text must build trust in synthesis output and reinforce the core innovation.

4. **Token state resolution — one URL, multiple first impressions:** Pending → consent screen, Active → interview in progress, Validating → diagram review, Completed/Captured → read-only view, Invalid → error message. Each state must be contextually appropriate and immediately clear.

### Design Opportunities

1. **The "being heard" signature moment:** The reflect-and-confirm pattern creates a visually and emotionally distinct interaction where the agent proves it understood. The contrast between the interviewee's raw scattered speech and the polished reflective summary is the word-of-mouth engine — the moment the interviewee tells a colleague about at lunch.

2. **Personal process diagram as emotional payoff:** Showing each person a clean visualization of their own workflow is both a validation mechanism and an emotional reward. The interviewee has never seen their process visualized before. The diagram is a gift the product gives to every interviewee.

3. **Divergence click-to-navigate as the "aha moment":** In the supervisor comparison view, clicking a divergence annotation on the synthesis and watching the carousel auto-navigate to the relevant interviewee is the demo's signature payoff. "This would have taken me two weeks."

## Core User Experience

### Defining Experience

chat2chart has two distinct interaction modes that must both excel, but the **interview experience defines the product's identity**. The target reaction is "you should try this" — one interviewee recommending the experience to a colleague. The supervisor comparison view is the analytical payoff where divergences become visible discoveries, but the interview is the soul.

The interview experience follows a three-act emotional arc:

1. **Act 1 — Consent (Trust Established):** The consent screen is the product's true first impression. Before the interviewee speaks a word, this screen must communicate safety, clarity, and respect. It tells them what will happen, how their words will be used, that an AI conducts the conversation, and how long it will take. The tone here sets the emotional foundation for everything that follows. Warm and straightforward — they exhale and lean in.

2. **Act 2 — Reflective Summaries (Trust Deepened, The Gem):** The reflect-and-confirm pattern is the signature interaction that defines chat2chart. The agent listens to scattered, natural speech — then plays it back as a clear, organized summary and asks "did I get that right?" This is the moment the product proves it understands. It transforms an AI conversation from extraction into dialogue. The visual treatment of reflective summaries must be distinct from regular questions — these are the moments that matter most and must feel different in the UI.

3. **Act 3 — Personal Diagram (Trust Rewarded, The Payoff):** At the end of the interview, the interviewee sees their own workflow rendered as a simple, clean flowchart. They have never seen their process visualized before. This is both a validation mechanism (they can confirm or correct it) and an emotional reward — tangible proof that their knowledge was captured and valued.

The supervisor viewing experience is where the *value* of the interview experience is realized — browsing individual accounts, then comparing them against the synthesis to see where the divergences are and what they mean.

### Platform Strategy

- **Primary platform:** Web application (SPA), desktop-first design
- **Responsive range:** Tablet (768px minimum) through desktop for interviews. Large desktop (1200px+) for supervisor comparison view. No mobile phone support — screen size insufficient for the interview conversation and diagram validation experience
- **Input modes:** Speech-to-text primary (Chrome-optimized via Web Speech API), typed input fallback always available via "Prefer to type?" toggle. Mouse/keyboard for supervisor interactions
- **Browser targets:** Chrome (primary, best STT support). STT may require typed fallback in other browsers
- **Offline:** Not required. Real-time LLM communication is core to the experience
- **Key platform capability:** Browser microphone access via Web Speech API. The microphone permission prompt occurs after consent, triggered by "Begin Interview" — never before the user has context for why it's needed
- **Unsupported devices:** Mobile phones (<768px) receive a full-page message: "This experience requires a tablet or desktop screen." Clean, centered, actionable

### Effortless Interactions

**Must be effortless (zero friction) for the interviewee:**
- **Starting an interview:** Click link → read consent → click "Begin" → talk. No accounts, no forms, no downloads, no configuration
- **Speaking naturally:** The agent handles scattered, non-linear speech. The interviewee doesn't need to organize their thoughts or speak in process steps — they just describe their work the way they'd tell a colleague
- **Understanding reflective summaries:** When the agent plays back what it heard, the interviewee immediately recognizes their own words, better organized. No jargon, no abstraction — their language, their meaning, clarified
- **Confirming or correcting:** A simple "yes" or "no, actually..." — the correction flow should feel as natural as the original conversation

**Must be effortless for the supervisor:**
- **Browsing individual diagrams:** Instant carousel navigation between interviewees, no page reloads between slides
- **Understanding divergences immediately:** The visual language for divergences must communicate meaning at first glance — not require reading explanations to parse what happened
- **Comparing individual vs. synthesis:** One click toggles between full-width individual view and split-screen comparison

### Critical Success Moments

| Moment | User | Success Feels Like | Failure Feels Like |
|--------|------|-------------------|-------------------|
| Consent screen | Interviewee | "This is clear, I know what I'm getting into" | "This feels like a legal form, I'm nervous" |
| First reflective summary | Interviewee | "It actually understood what I said" | "That's not what I meant at all" |
| Personal diagram reveal | Interviewee | "That's my process — I've never seen it like this" | "This doesn't look right, was I unclear?" |
| Divergence click-to-navigate | Supervisor | "I can see exactly where they differ — this would have taken me two weeks" | "I don't understand what this annotation means" |
| Mode 2 comparison toggle | Supervisor | "Now I can see my team's reality side by side" | "This is too busy, I can't focus on either diagram" |

### Experience Principles

1. **Warmth over efficiency** in the interview — silence is a feature, not a bug. No timers, no progress bars, no "are you still there?" prompts. The agent waits patiently.
2. **Zero friction for the interviewee** — no accounts, no forms, no configuration. The world shrinks to the conversation.
3. **Divergences are discoveries** — teal means curiosity, never red, never alarm. The visual language reinforces that inconsistencies are valuable signal, not confusing noise.
4. **Show, don't tell** — prove understanding through playback (reflective summaries), not claims. Prove value through visualization (personal diagrams), not explanation.
5. **The first 30 seconds determine everything** — the consent screen sets the emotional tone for the entire interview. If this screen fails, everything that follows is uphill.

## Desired Emotional Response

### Primary Emotional Goals

- **Interviewee:** "I was heard" — recognition, safety, and quiet pride in their expertise. The interviewee should leave feeling that their knowledge was captured and valued, not extracted and discarded.
- **Supervisor:** "I can see what's really happening" — clarity, insight, and informed confidence. The supervisor should feel empowered by the ability to see operational variation that was previously invisible.

### Emotional Journey Mapping

| Stage | Interviewee Feels | Supervisor Feels |
|-------|-------------------|------------------|
| First arrival | Cautious curiosity → calm reassurance (consent screen) | Professional expectation (sign-in) |
| Core interaction | Surprise → recognition → trust (reflective summaries prove comprehension) | Engagement → pattern recognition (browsing individual diagrams, forming own impressions) |
| Completion/payoff | Quiet pride — "that's my process" (personal diagram reveal) | "Aha" discovery — "now I see the differences" (divergence click-to-navigate) |
| Error/correction | Collaborative, not adversarial — "let me try again" (diagram correction flow) | N/A (view-only in this demo, no error states beyond authentication) |
| Return visit | Warm recall — a record that someone listened (read-only completed view) | N/A for demo scope |

### Micro-Emotions

The emotional design of chat2chart is built on four defining axes:

1. **Trust vs. Skepticism** — The defining axis for the interviewee. Every design choice either builds or erodes trust. The consent screen, the reflective summaries, the personal diagram — each is a trust checkpoint. If any single moment triggers skepticism, the interviewee's guard goes up and the quality of everything that follows degrades.

2. **Calm vs. Anxiety** — Actively counteract anxiety through the absence of pressure cues. No timers, no urgency indicators, no progress bars, no "Question 3 of 8." The absence of pressure IS the design. Silence is a feature — the agent waits patiently, never prompting "are you still there?"

3. **Empowerment vs. Vulnerability** — The interviewee is always the authority on their own work. Correction feels collaborative, not adversarial. The agent defers to them. They control when recording starts and stops. They decide when they're done. The agent asks "Is there anything else about this process we haven't covered?" — giving them the final word.

4. **Curiosity vs. Confusion** — For the supervisor, divergences must spark "that's interesting" not "what does this mean?" Teal accent colors signal discovery, not alarm. The individual-first carousel lets the supervisor form their own impression before the system reveals its conclusions.

### Design Implications

| Emotional Goal | UX Design Approach |
|---------------|-------------------|
| Trust | Warm consent screen (no legal walls, no checkboxes). Immediate reflective playback proving comprehension. Consistent visual language for confirmed items (green checkmarks on violet summary cards). |
| Calm | No timers, no progress bars, no "are you still there?" prompts. Generous whitespace throughout. Silence is a feature. No countdown or urgency cues on any screen. |
| Recognition | Violet reflective summary cards visually distinct from regular agent messages — these are the moments that matter most. Personal diagram as tangible proof of being heard. The contrast between raw speech (scattered) and reflective summary (polished) IS the signature moment. |
| Empowerment | Interviewee controls recording with explicit start/done buttons (no auto-start, no silence detection). "Prefer to type?" toggle always available. Correction flow is collaborative. Agent gives them the final word. |
| Curiosity | Teal divergence annotations, never red or warning iconography. Clickable badges that invite exploration. Individual-first carousel before showing synthesis conclusions — supervisor forms their own impression first. |

### Emotional Design Principles

1. **Warmth over efficiency** in the interview — the agent sounds like a thoughtful colleague, not an intake form
2. **Errors are collaborative, not adversarial** — "Let me try again" not "I'm sorry." The agent takes responsibility without groveling
3. **Show, don't tell** — prove understanding through playback (reflective summaries), not claims ("I understand"). Prove value through visualization (diagrams), not explanation
4. **The raw-to-polished contrast is the magic** — the interviewee's scattered speech appears as a finished card, then the agent's organized summary appears immediately after. The contrast between the two IS the trust-building mechanism
5. **No impatient chatbot patterns** — no auto-suggestions, no timeout warnings, no modal interruptions during conversation flow, no "are you still there?" prompts
6. **Divergences are celebrations** — teal accent colors, discovery language, exploratory click-to-navigate. Never red, never warning iconography, never "conflict" framing without "discovery" context

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Typeform — Conversational Form Design:**
The consent screen draws directly from Typeform's philosophy: one focused thing at a time, generous whitespace, no visual clutter, warm language. Typeform proved that forms don't have to feel like forms — and chat2chart's consent screen shouldn't feel like a consent screen. Centered card, gradient background, clear "here's what happens" structure.

**iMessage / WhatsApp — Conversation Thread Pattern:**
The interview thread uses the universal messaging mental model: left-aligned agent messages (blue-tinted), right-aligned user messages (neutral/white), newest at bottom, auto-scroll. Users already know how to read this layout — zero learning curve. The reflect-and-confirm pattern layers on top of this familiar foundation with the visually distinct violet summary cards.

**Google Maps / Miro — Pan-and-Zoom Diagram Interaction:**
The diagram canvas (both individual and synthesis) uses the pan-and-zoom pattern users know from maps and whiteboard tools. Click-drag to pan, scroll to zoom, "Fit" to reset. For the synthesis comparison view, the clickable divergence badges that auto-navigate the carousel borrow from the "click a pin, see the detail" pattern.

**Spotify / Netflix — Carousel Navigation:**
The supervisor's individual diagram carousel uses the horizontal navigation pattern familiar from media apps. Left/right arrows, position indicator (1/3, 2/3, 3/3), name and context in the header. Users already know how to browse a carousel — the pattern is invisible.

### Transferable UX Patterns

**Navigation Patterns:**
- **Messaging thread layout** for the interview — left/right alignment, auto-scroll, fixed input bar at bottom. Universally understood.
- **Carousel with position indicator** for supervisor individual review — familiar, instant, no page reloads.
- **Split-screen comparison** for synthesis viewing — pinned reference on left, navigable content on right. The pattern of "anchor + explore" is common in diff tools and comparison interfaces.

**Interaction Patterns:**
- **Reflect-and-confirm as a conversation primitive** — the agent summarizes, user confirms or corrects. This is a twist on the "review before submit" pattern, made conversational.
- **Click-to-navigate cross-reference** — clicking a divergence badge on the synthesis auto-navigates the carousel. This "linked views" pattern from data visualization tools makes connections between related data instantly explorable.
- **Progressive disclosure** — Mode 1 (individual only) before Mode 2 (comparison). The supervisor forms their own impression before the system reveals its analysis.

**Visual Patterns:**
- **Violet distinction for high-value content** — reflective summary cards use a distinct color family (violet) to separate them from regular agent messages (blue). The visual difference signals "this one matters more."
- **Teal for discovery** — divergence annotations use accent/teal, not red/warning. Color psychology: teal reads as insightful and inviting, not alarming.

### Anti-Patterns to Avoid

- **Survey/form fatigue:** No numbered questions, no progress bars, no "3 of 12." The interview must never feel like a questionnaire.
- **Legal wall consent:** No checkboxes, no dense paragraphs, no "I acknowledge and agree." Clicking Begin is implicit consent.
- **Impatient chatbot:** No auto-suggestions, no typing timeout, no "are you still there?" The agent is endlessly patient.
- **Raw transcript exposure:** Never show the interviewee their raw speech in real-time while they're speaking. The first text they see after speaking should be the polished reflective summary — not a reminder of how scattered their words were.
- **Red for divergence:** Never use destructive/warning colors for divergences. Red means "something is wrong." Divergences aren't wrong — they're the point.
- **Dashboard overload for the supervisor:** No sidebar, no tabs, no metrics panels. The supervisor experience is immersive comparison, not an analytics dashboard.

### Design Inspiration Strategy

**What to Adopt:**
- Typeform's focused, single-purpose screen philosophy for the consent screen
- Messaging app left/right thread alignment for the interview conversation
- Pan-and-zoom canvas interaction for all diagram views
- Carousel navigation for browsing individual interviewee diagrams

**What to Adapt:**
- The "linked views" pattern from data visualization — simplified to divergence-click → carousel-navigate for the demo scope
- Progressive disclosure — simplified to two modes (individual → comparison) rather than a complex drill-down hierarchy

**What to Avoid:**
- Dashboard/analytics patterns — this demo is immersive, not analytical
- Multi-step wizard patterns for the interview — it's a conversation, not a workflow
- Complex filtering/sorting for the supervisor — with only 3 interviewees, the carousel IS the navigation

## Design System Foundation

### Design System Choice

**shadcn/ui** — A themeable component system built on Radix UI primitives and Tailwind CSS. This is inherited from the parent chat2chart project and is non-negotiable for consistency.

- **Component library:** shadcn/ui v4 (copy-paste components, fully customizable)
- **Styling:** Tailwind CSS 4.2.2 with CSS custom properties for design tokens
- **Primitives:** Radix UI (accessibility built-in, unstyled headless components)
- **Typography:** Inter (ships with Next.js, clean, professional, neutral)
- **Icons:** Embedded inline (no external icon library dependency for demo scope)

### Rationale for Selection

1. **Consistency with parent project** — chat2chart is a demo subset of chat2chart. Using the same design system ensures the interview and supervisor experiences are visually identical across both projects.
2. **Accessibility built-in** — Radix UI primitives handle focus management, keyboard navigation, ARIA attributes, and screen reader announcements out of the box. WCAG 2.1 Level A compliance with minimal custom work.
3. **Theming via CSS custom properties** — The full color token system from the reference docs maps directly to CSS variables, making the design system trivially portable between projects.
4. **Speed** — shadcn/ui components are copy-paste, not npm-installed. They live in the project, are fully customizable, and don't introduce external dependency risk.

### Implementation Approach

shadcn/ui components are copied into the project (not imported from a package). Each component is a local file that can be modified directly. This gives full control over every component's behavior and appearance while starting from accessible, well-tested defaults.

**shadcn/ui components used in this demo:**

| Component | Usage |
|-----------|-------|
| Button | "Begin Interview," "Confirm," "That's not right," "Done," zoom controls, mode toggles |
| Card | Message bubbles (agent, speech, reflective summary), diagram containers, divergence detail cards |
| Alert | Consent screen info blocks, error states |
| Avatar | Agent identity anchor next to left-aligned messages |
| ScrollArea | Interview conversation thread with auto-scroll |
| Separator | Visual break between conversational segments |
| Badge | Divergence type badges, status indicators |
| Tooltip | Divergence confidence details on hover |

**Custom components to build:**

| Component | Purpose |
|-----------|---------|
| ConsentScreen | Gradient background, Typeform-inspired welcome card |
| ConversationThread | Single-column scrollable container with left/right message alignment, mic bar fixed at bottom |
| ReflectiveSummaryCard | Violet card with SSE streaming, confirm/correct buttons, state transitions |
| SpeechCard | Right-aligned raw speech reveal after Done |
| MicBar | Recording controls with red/green indicator, waveform animation, "Prefer to type?" toggle |
| DiagramCanvas | Pan/zoom Mermaid.js wrapper with controls overlay |
| IndividualDiagramCarousel | Full-width (Mode 1) and comparison (Mode 2) variants |
| DivergenceAnnotation | Teal badges on synthesis nodes + detail cards |

### Customization Strategy

The design system is customized through CSS custom properties (design tokens) defined in the reference docs. No component structural changes needed — only token values drive the visual identity:

- **Color tokens** define the entire palette (primary blue, accent teal, summary violet, semantic success/warning/destructive)
- **Spacing tokens** use a 4px base unit with named scales
- **Border radius tokens** from 6px (badges) to 12px (large cards) to 9999px (pills)
- **Shadow tokens** for three elevation levels (sm, md, lg)
- **Typography** is Inter at defined sizes from 12px (captions) to 36px (display)

The token system is fully documented in the Visual Design Language section of this specification (upcoming step).

## Detailed User Experience

### Defining Experience

**The Interview — "Talk about your job, see it played back better than you said it."**

The defining interaction is the reflect-and-confirm moment. The interviewee speaks naturally — scattered, non-linear, the way anyone describes their work to a colleague — and the agent plays it back as a clear, organized reflective summary. The interviewee sees their own knowledge, better articulated than they said it, and thinks: "It actually understood me." This is the word-of-mouth engine. This is what Rachel tells Marcus about at lunch.

**The Supervisor — "Click a divergence, see who does it differently."**

The secondary defining experience is the divergence click-to-navigate interaction. The supervisor sees a teal badge on the synthesis diagram marking where interviews disagree. They click it. The carousel auto-navigates to the relevant interviewee, the corresponding step highlights. Weeks of manual comparison collapse into a single click. This is the "aha moment" in the demo.

### User Mental Model

**Interviewee mental model:** "I'm having a conversation about my job." Not filling out a form, not being tested, not being recorded for compliance. A conversation. The messaging-app thread layout (left/right alignment) reinforces this — it looks like texting a thoughtful colleague. The reflect-and-confirm pattern maps to how real conversations work: someone listens, then says "so what you're saying is..." and you confirm or correct. No new pattern to learn.

**Supervisor mental model:** "I'm comparing people's accounts of the same process." The carousel maps to browsing — flip through individual stories. The split-screen comparison maps to a diff tool — reference on left, detail on right. The divergence badges map to annotations — click to learn more. All established patterns, combined in a way that serves the specific problem of cross-interview comparison.

**What users bring from current solutions:** Today, process discovery means consultants with sticky notes, interviews transcribed manually, synthesis done in spreadsheets over weeks. The interviewee's expectation is low — they expect to be asked questions and give answers. The reflective summary *exceeds* that expectation by proving comprehension. The supervisor's expectation is also low — they expect to read reports. The interactive visual comparison *exceeds* that expectation by making divergences explorable.

### Success Criteria

**Interview success — the interviewee feels heard:**

| Criterion | Measurement |
|-----------|------------|
| Consent screen sets calm tone | Interviewee clicks "Begin" without hesitation (no back-button, no long pause) |
| Speech capture feels natural | Interviewee speaks for 10+ seconds per response (not giving clipped, guarded answers) |
| Reflective summary recognized | Interviewee confirms on first attempt (no correction needed) for majority of exchanges |
| Diagram accepted | Interviewee validates personal diagram without correction on happy path |
| Overall experience | ~90 seconds, 5-8 exchanges, interviewee reaches completion |

**Supervisor success — divergences are immediately clear:**

| Criterion | Measurement |
|-----------|------------|
| Individual diagrams scannable | Supervisor browses all 3 interviewees in carousel without confusion |
| Mode toggle intuitive | Supervisor finds and uses "Compare with Synthesis" without instruction |
| Divergences explorable | Supervisor clicks a divergence badge and understands the auto-navigation behavior |
| Comparison useful | Supervisor can articulate what's different between interviewees after viewing |

### Novel UX Patterns

**Novel — Reflect-and-confirm as conversation primitive:**
The reflective summary card is a novel interaction pattern. It's not a chatbot response (informational), not a form validation (error/success), not a confirmation dialog (yes/cancel). It's a *comprehension proof* — the system demonstrating it understood, then asking for validation. The violet visual treatment, the "Confirm" / "That's not right" button pair, and the confirmed checkmark badge are all custom patterns that don't exist in standard component libraries.

**Novel — Divergence click-to-navigate (linked views):**
Clicking a badge on one diagram and having a separate carousel auto-navigate is a linked-views pattern borrowed from data visualization but simplified. The supervisor doesn't need to understand the concept — the behavior is discoverable through the clickable badge affordance and the immediate visual response.

**Established — Everything else:**
The messaging thread, carousel navigation, split-screen comparison, pan-and-zoom canvas, token-based auth, and consent screen all use established patterns. The product's innovation is in the *content* of these patterns (reflective summaries, divergence annotations), not in the interaction mechanics themselves.

### Experience Mechanics

**Interview Mechanics (the core loop):**

1. **Initiation:** Agent asks a question (left-aligned blue card, streams via SSE). First question is open-ended: "Can you walk me through how you handle incoming taxpayer correspondence?"
2. **Recording:** Interviewee clicks mic button (red → green). Waveform animation + "I'm hearing you..." in mic bar. No raw text shown during recording.
3. **Submission:** Interviewee clicks "Done" (green → red). Brief "Processing your response..." indicator.
4. **Speech reveal:** Interviewee's raw speech appears as right-aligned white card. Full text, unpolished.
5. **Reflective summary:** Agent sends reflective summary (left-aligned violet card, streams via SSE). The contrast between raw speech and polished summary IS the signature moment.
6. **Confirmation:** "Confirm" (primary blue) / "That's not right" (ghost) buttons appear on summary card.
7. **Resolution:** If confirmed → green checkmark badge, agent advances. If corrected → agent sends revised summary, interviewee re-confirms.
8. **Completion:** After 5-8 exchanges, agent asks "Is there anything else about this process we haven't covered?" — giving the interviewee the final word.
9. **Diagram generation:** "Let me put together what you described..." → pulsing placeholder → diagram fades in.
10. **Validation:** "Yes, that looks right" (green primary) / "Something's not right" (ghost). If confirmed → interview complete, status transitions to Captured.

**Supervisor Mechanics:**

1. **Entry:** Sign in → routed to review interface.
2. **Mode 1 (default):** Full-width carousel. Left/right arrows navigate between interviewees. Header shows name, location, position (1/3). Each slide is a validated personal diagram.
3. **Mode toggle:** "Compare with Synthesis" button transitions to Mode 2.
4. **Mode 2:** Synthesis pinned left (~55%), individual carousel right (~45%). Divergence badges visible on synthesis nodes.
5. **Divergence exploration:** Click teal badge → carousel auto-navigates to relevant interviewee → corresponding step highlights with teal glow.
6. **Return:** "Back to Individual Review" returns to Mode 1 full-width.

## Visual Design Foundation

### Color System

The color system is inherited from the parent chat2chart project via CSS custom properties. Colors serve specific semantic purposes across both the interview and supervisor experiences.

**Primary Palette:**

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#2563EB` (Blue 600) | Primary actions, focus rings, "Begin Interview" and "Confirm" buttons, agent message backgrounds |
| `--primary-foreground` | `#FFFFFF` | Text on primary backgrounds |
| `--primary-soft` | `#DBEAFE` (Blue 100) | Agent question card backgrounds, consent screen gradient start, hover states |

**Neutral Palette:**

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FAFAFA` (Zinc 50) | Page background |
| `--foreground` | `#18181B` (Zinc 900) | Primary text — body content is ALWAYS near-black |
| `--muted` | `#F4F4F5` (Zinc 100) | Card backgrounds, secondary surfaces, consent info blocks |
| `--muted-foreground` | `#71717A` (Zinc 500) | Timestamps and metadata ONLY — never body content |
| `--border` | `#E4E4E7` (Zinc 200) | Borders, dividers, separators |
| `--card` | `#FFFFFF` | Card surfaces, speech cards, elevated components |

**Semantic Palette:**

| Token | Value | Usage | Emotional Intent |
|-------|-------|-------|-----------------|
| `--summary` | `#F5F3FF` (Violet 50) | Reflective summary card background | "This moment matters more" |
| `--summary-border` | `#C4B5FD` (Violet 300) | Reflective summary card border | Visual distinction from regular messages |
| `--accent` | `#0D9488` (Teal 600) | Divergence annotations, discovery badges | "This is interesting" — curiosity, not alarm |
| `--accent-soft` | `#CCFBF1` (Teal 100) | Divergence annotation backgrounds | |
| `--accent-foreground` | `#134E4A` (Teal 900) | Text on accent backgrounds | |
| `--success` | `#16A34A` (Green 600) | Confirmed states, validated diagrams, recording indicator (active) | |
| `--success-soft` | `#DCFCE7` (Green 100) | Confirmed summary backgrounds, listening state | |
| `--warning` | `#D97706` (Amber 600) | Decision diamonds in diagrams, uncertain classifications, browser compatibility notes | |
| `--warning-soft` | `#FEF3C7` (Amber 100) | Decision diamond backgrounds | |
| `--destructive` | `#DC2626` (Red 600) | Invalid token error, system failures ONLY — never divergences, never interview content | |
| `--destructive-soft` | `#FEE2E2` (Red 100) | Error state backgrounds, mic idle indicator | |

**Critical rule:** `--muted-foreground` (#71717A) is ONLY for timestamps, metadata, and helper labels. Body content is ALWAYS `--foreground` (#18181B). Grey text for body content is forbidden.

**Color independence:** Every piece of information communicated through color is also communicated through text, icon, or shape. Reflective summaries: color + border + card style + label. Confirmed state: green + checkmark icon + "Confirmed" text. Errors: red + icon + descriptive message. Divergences: teal + text label + detail card.

### Typography System

**Font:** Inter (primary UI font, ships with Next.js). Clean, professional, neutral. No secondary typeface needed.

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 36px / 2.25rem | 700 | 1.2 | Consent screen title only |
| H1 | 30px / 1.875rem | 600 | 1.3 | Page titles |
| H2 | 24px / 1.5rem | 600 | 1.3 | Section headers ("SYNTHESIZED WORKFLOW") |
| H3 | 20px / 1.25rem | 600 | 1.4 | Card titles, subsection headers |
| Body Large | 18px / 1.125rem | 400 | 1.6 | Agent messages, consent screen body, reflective summary text (weight 500) |
| Body | 16px / 1rem | 400 | 1.5 | Standard body text, diagram labels, supervisor content |
| Body Small | 14px / 0.875rem | 400 | 1.5 | Table cells, metadata, timestamps, mic status |
| Caption | 12px / 0.75rem | 500 | 1.4 | Status badges, labels ("REFLECTIVE SUMMARY"), helper text, confirmed badge |

**Interview-specific typography note:** Reflective summary text uses Body Large at weight 500 (slightly heavier than regular agent messages) — these words carry more significance. The "REFLECTIVE SUMMARY" label uses Caption at weight 600, uppercase, violet text (#7C3AED), letter-spacing 0.04em.

### Spacing & Layout Foundation

**Base unit:** 4px. All spacing is a multiple of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps (icon-to-label, badge padding) |
| `--space-2` | 8px | Compact spacing (inline gaps) |
| `--space-3` | 12px | Standard component internal padding |
| `--space-4` | 16px | Standard gap between related elements, message gap in conversation |
| `--space-6` | 24px | Gap between sections, card padding, panel padding |
| `--space-8` | 32px | Major section breaks, segment separator gap in conversation |
| `--space-12` | 48px | Page-level vertical rhythm |
| `--space-16` | 64px | Consent screen breathing room |

**Border Radius:**

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Badges, pills, small elements |
| `--radius-md` | 8px | Cards, buttons, input fields, message bubbles |
| `--radius-lg` | 12px | Large cards, consent card, diagram canvas, dialogs |
| `--radius-full` | 9999px | Status pills, mic button |

**Shadow System:**

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Cards, subtle elevation |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.07)` | Floating panels, diagram canvas |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Consent card, dialogs |

**Layout density by experience:**

| Property | Interview Mode | Supervisor Mode |
|----------|---------------|-----------------|
| Max content width | 800px (conversation), 560px (consent), 700px (diagram) | 1400px (wide frame) |
| Card padding | 18-24px (generous, breathing room) | 12-16px (efficient, information-dense) |
| Touch targets | 44px minimum (tablet-friendly) | 36px standard button height |
| Page padding | 24px | 24px horizontal, 24px vertical |

### Accessibility Considerations

**WCAG 2.1 Level A compliance** — inherited from parent project design system.

**Color Contrast (verified):**

| Combination | Ratio | Status |
|-------------|-------|--------|
| `--foreground` on `--background` (Zinc 900 on Zinc 50) | 17.4:1 | Passes AAA |
| `--foreground` on `--card` (Zinc 900 on white) | 18.4:1 | Passes AAA |
| `--primary` on white (Blue 600 on white) | 4.6:1 | Passes AA |
| `--primary-foreground` on `--primary` (white on Blue 600) | 4.6:1 | Passes AA |
| `--muted-foreground` on `--background` (Zinc 500 on Zinc 50) | 5.1:1 | Passes AA |
| `--accent` on white (Teal 600 on white) | 4.5:1 | Passes AA |
| `--accent-foreground` on `--accent-soft` (Teal 900 on Teal 100) | 10.2:1 | Passes AAA |
| `--success` on white (Green 600 on white) | 4.5:1 | Passes AA |

**Focus indicators:** `outline: 2px solid var(--primary); outline-offset: 2px` on every interactive element via `:focus-visible`. Never `outline: none` without replacement.

**Screen reader support:**
- `aria-live="polite"` on: completed speech card reveal, "I'm hearing you..." listening state, agent streaming responses
- `role="article"` with state-dependent `aria-label` on reflective summary cards
- Semantic HTML: `<button>` for actions, `<article>` for summaries
- All diagrams accompanied by `<details><summary>Text description</summary>` listing steps, decisions, and connections

**Keyboard navigation:**
- Interview: conversation thread (scroll) → confirm/correct buttons → mic toggle → done button → "Prefer to type?" toggle. Space toggles mic. Enter activates confirm/done.
- Supervisor: carousel arrows (left/right) → diagram canvas (arrow keys for pan) → mode toggle → divergence badges. Enter on divergence opens reference.

**Touch targets:** 44px minimum at tablet breakpoint (768px). All interactive elements meet this threshold.

## Design Direction Decision

### Design Directions Explored

The design direction for chat2chart is inherited from the parent chat2chart project, which has a fully realized visual language documented in the reference UX specification and HTML mockups. Rather than exploring alternative directions, a fresh HTML mockup was generated scoped specifically to the demo's 8 screens to validate that the parent project's design system translates cleanly to the reduced scope.

**Screens validated in `ux-design-directions.html`:**

1. **Consent Screen** — Typeform-inspired centered card on gradient background with warm info blocks
2. **Voice Interview** — Conversation thread with agent messages, speech cards, reflective summary (violet), active listening waveform animation, and fixed mic bar
3. **Diagram Reveal** — Personal flowchart validation with confirm/correct action buttons
4. **Read-Only Completed View** — Post-interview view with captured summaries and diagram
5. **Error States** — Invalid token (red) and unsupported device (amber) side by side
6. **Supervisor Sign-In** — Brand-consistent authentication card
7. **Supervisor Mode 1 (Carousel)** — Full-width individual diagram browsing with interviewee navigation
8. **Supervisor Mode 2 (Comparison)** — 55/45 split-screen with synthesis divergence badges and cross-panel highlighting

### Chosen Direction

**Single direction — inherited from parent project.** The visual language is already validated and must remain consistent across both the full platform and this demo. The design uses:

- Clean, professional aesthetic with generous whitespace (Inter font, Zinc neutrals)
- Blue primary actions, violet reflective summaries, teal divergence annotations
- Messaging-app conversation layout for interviews
- Carousel + split-screen comparison for supervisor review
- Immersive, sidebar-free layouts for both experiences

### Design Rationale

1. **Consistency is non-negotiable** — This demo is a subset of a larger platform. Users (and demo audiences) should see identical visual language whether interacting with the demo or the full product.
2. **The design system is already proven** — The parent project's UX underwent a complete 14-step design specification process. The token system, component patterns, and interaction designs are mature.
3. **Scope reduction, not design deviation** — The demo removes screens (PM dashboard, review agent, approval workflow) but does not change any screen it keeps. Every screen in the demo looks and behaves identically to its parent-project counterpart.

### Implementation Approach

- Apply the CSS custom property token system from the Visual Design Foundation section directly
- Use the HTML mockup (`ux-design-directions.html`) as the visual reference for implementation
- Build custom components (ConsentScreen, ConversationThread, ReflectiveSummaryCard, MicBar, DiagramCanvas, IndividualDiagramCarousel, DivergenceAnnotation) from the component specs documented in the Design System Foundation section
- shadcn/ui base components (Button, Card, Alert, Avatar, ScrollArea, Separator, Badge, Tooltip) provide the foundation; custom components compose on top

## User Journey Flows

### Journey 1: Interviewee — Voice Interview (Janet Park, Ogden)

Janet receives a token link via email. She clicks it. In ~90 seconds, she describes her work, validates her process diagram, and leaves — having been genuinely heard.

```mermaid
flowchart TD
    A[Janet clicks token link] --> B{Token valid?}
    B -->|No| B1[Error: "This link isn't valid.<br/>Contact the person who sent it."]
    B -->|Yes| C{Device >= 768px?}
    C -->|No| C1[Error: "This experience requires<br/>a larger screen."]
    C -->|Yes| D{Token state?}
    D -->|Pending| E[Consent Screen]
    D -->|Completed/Captured| F[Read-Only View]
    D -->|Invalid/Expired| B1
    
    E --> G[Janet reads: process name, AI disclosure,<br/>recording notice, ~90 sec estimate]
    G --> H["Begin Interview" button]
    H --> I{Browser mic permission}
    I -->|Denied| I1["Prefer to type?" auto-activates]
    I -->|Granted| J[Interview begins — Agent asks first question]
    I1 --> J
    
    J --> K[Janet clicks mic / starts typing]
    K --> L[Recording: waveform animation,<br/>"I'm hearing you..."]
    L --> M[Janet clicks "Done"]
    M --> N[Raw speech card appears right-aligned]
    N --> O[Agent sends reflective summary<br/>violet card, streams via SSE]
    O --> P{Janet confirms?}
    P -->|"Confirm"| Q[Green checkmark badge]
    P -->|"That's not right"| R[Agent sends revised summary]
    R --> P
    Q --> S{More exchanges needed?<br/>5-8 total}
    S -->|Yes| J
    S -->|No| T[Agent: "Is there anything else<br/>we haven't covered?"]
    T --> U[Interview complete]
    
    U --> V["Let me put together<br/>what you described..."]
    V --> W[Pulsing placeholder 2-5 sec]
    W --> X[Personal diagram fades in<br/>Mermaid.js flowchart]
    X --> Y{Janet validates diagram}
    Y -->|"Yes, that looks right"| Z[Schema + diagram persisted<br/>Status → Captured]
    Y -->|"Something's not right"| AA[Correction flow:<br/>Janet describes error]
    AA --> AB[LLM correction agent<br/>updates schema]
    AB --> AC[Regenerated diagram appears]
    AC --> Y
    
    Z --> AD[Read-Only Completed View<br/>Confirmed summaries + diagram<br/>"Thank you for sharing your expertise"]
```

**Key moments in the flow:**
- **Trust checkpoint 1:** Consent screen — warm, clear, no legal walls
- **Trust checkpoint 2:** First reflective summary — "It understood me"
- **Trust checkpoint 3:** Personal diagram — "That's my process"
- **Graceful fallbacks:** Mic denied → text input. NLP extraction fails → LLM fallback (invisible to Janet). Diagram wrong → collaborative correction.

### Journey 2: Supervisor — Synthesis Viewing (Linda Kim)

Linda signs in, browses individual diagrams to form her own impressions, then compares them against the synthesis to discover where her team's processes diverge.

```mermaid
flowchart TD
    A[Linda navigates to /review] --> B{Authenticated?}
    B -->|No| C[Sign-in screen:<br/>email + project password]
    C --> D{Credentials valid?<br/>On supervisor allowlist?}
    D -->|No| D1["Access not available.<br/>Contact your project manager."]
    D -->|Yes| E[Session created, 24h expiry]
    B -->|Yes| E
    
    E --> F[Mode 1: Individual Diagram Carousel<br/>Full-width, default view]
    
    F --> G[Rachel Torres — Austin, TX 1/3<br/>Pre-sorts by form type before scanning]
    G --> H[Left/right arrows to navigate]
    H --> I[Marcus Williams — Kansas City, MO 2/3<br/>Scans first, classifies digitally via auto-detect]
    H --> J[Janet Park — Ogden, UT 3/3<br/>Manual QC spot-check after data entry]
    
    G --> K["Compare with Synthesis" button]
    I --> K
    J --> K
    
    K --> L[Mode 2: Split-Screen Comparison<br/>Synthesis ~55% left, Carousel ~45% right]
    
    L --> M[Synthesis diagram with<br/>divergence badges on nodes]
    M --> N{Linda clicks divergence badge}
    N -->|Sort timing divergence| O[Carousel navigates to Rachel<br/>"Pre-Sort by Form Type" highlights]
    N -->|QC check divergence| P[Carousel navigates to Janet<br/>"Verify Against Original" highlights]
    
    O --> Q[Linda browses carousel<br/>in comparison mode]
    P --> Q
    Q --> N
    
    L --> R["Back to Individual Review"]
    R --> F
```

**Key moments in the flow:**
- **Impression formation:** Mode 1 carousel lets Linda form her own understanding before the system shows its conclusions
- **The "aha moment":** Clicking a divergence badge and watching the carousel jump — "This would have taken me two weeks"
- **No dead ends:** Linda can freely toggle between Mode 1 and Mode 2, browse any interviewee at any time

### Journey Patterns

**Shared patterns across both journeys:**

1. **Token/credential gating with clear error messaging** — Both journeys start with access validation. Invalid state always produces a clear, actionable message ("Contact the person who sent it" / "Contact your project manager") — never a generic 404 or stack trace.

2. **Progressive trust/complexity building** — Interview: consent → conversation → diagram. Supervisor: individuals → synthesis → divergence drill-down. Both journeys reveal complexity gradually rather than presenting everything at once.

3. **User controls the pace** — Interviewee decides when to record, when to stop, when they're done. Supervisor decides when to compare, which interviewee to view, which divergence to explore. No auto-advancing, no timeouts.

4. **Graceful degradation** — Mic denied → text input. NLP fails → LLM fallback. Diagram wrong → correction flow. Live interview fails → pre-seeded backup. Every failure has a recovery path the user either controls or never sees.

### Flow Optimization Principles

1. **Minimum steps to value:** Interview reaches first reflective summary in ~30 seconds (consent → begin → speak → done → summary). Supervisor reaches first diagram in 2 clicks (sign in → carousel loads).

2. **No modal interruptions:** The interview never interrupts with modals, confirmations, or "are you sure?" dialogs. The mic bar is always visible. The conversation flows unbroken.

3. **State persistence without user action:** Every exchange is persisted to DB immediately. If the browser crashes mid-interview, the token resolves to the last known state. The supervisor's session persists for 24 hours.

4. **Exit paths are always clear:** The interviewee's read-only view is always accessible via the same token. The supervisor can always go "Back to Individual Review." No trapped states.

## Component Strategy

### Design System Components

**shadcn/ui components used directly (no customization beyond token theming):**

| Component | Screens Used | Notes |
|-----------|-------------|-------|
| Button | All screens | Primary, secondary, ghost variants. 8px radius. |
| Card | Interview, diagram, supervisor | Message containers, diagram canvas wrapper |
| Alert | Consent, errors | Info blocks on consent screen, error state cards |
| Avatar | Interview | Small agent identity anchor next to left-aligned messages (icon, not face) |
| ScrollArea | Interview | Conversation thread with auto-scroll to latest message |
| Separator | Interview | Visual break between reflect-and-confirm cycles (32px gap) |
| Badge | Supervisor | Divergence type badges, status indicators |
| Tooltip | Supervisor | Divergence confidence details on hover |

### Custom Components

#### ConsentScreen

**Purpose:** The product's first impression. Establishes trust and sets the emotional tone before the interviewee speaks a word.

**Anatomy:**
```
┌─ Gradient background (primary-soft → background) ─────────┐
│                                                             │
│    ┌─────────────────────────────────────┐                 │
│    │  [Icon: 56px circle, chat bubble]   │                 │
│    │                                      │                 │
│    │  Welcome                             │                 │
│    │  You've been invited to describe     │                 │
│    │  how you handle [Process Name]       │                 │
│    │                                      │                 │
│    │  [Info block: AI disclosure]         │                 │
│    │  [Info block: Speech capture]        │                 │
│    │  [Info block: Attribution notice]    │                 │
│    │                                      │                 │
│    │  ~90 seconds                         │                 │
│    │                                      │                 │
│    │  [═══ Begin Interview ═══]          │                 │
│    └─────────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

**Content:** Process name (from token), AI disclosure, speech capture notice, attribution notice, duration estimate.

**States:**

| State | Appearance |
|-------|-----------|
| Default | Card visible, button enabled |
| Loading (token resolving) | Skeleton placeholder matching card layout |

**Specs:** Card max-width 560px (520px tablet). Background gradient `linear-gradient(180deg, var(--primary-soft), var(--background))`. Card padding 40px 36px. Shadow-lg. Info blocks: muted bg, 8px radius, icon + text, 16px 20px padding. Button: full-width, primary, 16px weight 600.

**Accessibility:** Semantic heading hierarchy (h1: Welcome). All info blocks use semantic HTML. Button keyboard-focusable with visible focus ring. Tab order: info blocks (read-only) → Begin button. Enter activates Begin.

---

#### ConversationThread

**Purpose:** Single-column scrollable container for the interview conversation with left/right message alignment and fixed mic bar at bottom.

**Anatomy:**
```
┌─────────────────────────────────────────┐
│  [ScrollArea: max-width 800px centered] │
│                                          │
│  [AgentMessage - left]                   │
│  [SpeechCard - right]                    │
│  [ReflectiveSummaryCard - left]          │
│  [── Separator ──]                       │
│  [AgentMessage - left]                   │
│  [ActiveListeningState - right]          │
│                                          │
├──────────────────────────────────────────┤
│  [MicBar - fixed bottom]                │
└──────────────────────────────────────────┘
```

**Behavior:** Auto-scrolls to latest message. 16px gap between messages. 32px gap with Separator between reflect-and-confirm cycles. Agent messages left-aligned (max-width 75%), user messages right-aligned (max-width 75%), summaries left-aligned (max-width 80%).

**States:** Scrolling (normal), auto-scrolled (on new message), user-scrolled-up (pause auto-scroll until user scrolls back to bottom).

---

#### ReflectiveSummaryCard

**Purpose:** The signature interaction — the agent's comprehension proof. Visually distinct from all other message types.

**Anatomy:**
```
┌─────────────────────────────────────────────┐
│  REFLECTIVE SUMMARY                         │  ← Label (#7C3AED, 12px, uppercase)
│                                              │
│  Let me make sure I have this right —        │  ← Text (18px, weight 500)
│  when you arrive, you first check the        │
│  overnight cables for any fraud alerts...    │
│                                              │
│  [Confirm]  [That's not right]              │  ← Buttons (primary / ghost)
│                                              │
│  OR: ✓ Confirmed                            │  ← Badge (green, 12px)
└─────────────────────────────────────────────┘
```

**States:**

| State | Appearance | Trigger |
|-------|-----------|---------|
| Streaming | Text streams in token-by-token. Label visible. No buttons. | SSE stream begins |
| Awaiting confirmation | Full text. "Confirm" (primary) + "That's not right" (ghost) appear. | Stream completes |
| Confirmed | Buttons disappear. Green checkmark "Confirmed" badge. | User clicks Confirm |
| Correction requested | Card dims slightly. New revised summary card appears below. | User clicks "That's not right" |

**Specs:** Background `--summary` (#F5F3FF). Border 1.5px solid `--summary-border` (#C4B5FD). Radius 8px. Padding 18px 20px.

**Accessibility:** `role="article"`, `aria-label="Reflective summary awaiting your confirmation"` (state-dependent). Buttons keyboard-focusable. `aria-live="polite"` announces when summary streams in.

---

#### SpeechCard

**Purpose:** Display the interviewee's completed raw speech. Right-aligned. Only appears after "Done" is clicked — never during recording.

**Anatomy:**
```
                        ┌─────────────────────────┐
              10:02 AM  │ Yeah so first thing I    │
                        │ do is pull up the queue  │
                        │ and check the overnight  │
                        │ cables...                │
                        └─────────────────────────┘
```

**States:** Processing ("Processing your response..." indicator) → Completed (full text revealed).

**Specs:** Background `--card` (#FFFFFF). Border 1px solid `--border`. Radius 8px. Padding 12px 16px. Font 15px. Timestamp 12px `--muted-foreground`. Right-aligned, max-width 75%.

**Accessibility:** `aria-live="polite"` on completed card.

---

#### MicBar

**Purpose:** Recording controls fixed at bottom of conversation thread.

**Anatomy (idle):**
```
┌──────────────────────────────────────────────┐
│  [🔴 Mic]    Tap to start     Prefer to type? │
└──────────────────────────────────────────────┘
```

**Anatomy (recording):**
```
┌──────────────────────────────────────────────┐
│  [🟢 Mic] Recording...  [Done]  Prefer to type? │
└──────────────────────────────────────────────┘
```

**States:**

| State | Mic Button | Status | Actions |
|-------|-----------|--------|---------|
| Idle | Red border, destructive-soft bg | "Tap to start" | Click mic to start |
| Recording | Green bg, white icon, pulse-ring animation | "Recording..." (green) | Click Done to submit |
| Processing | Disabled | "Processing..." | None |
| Text mode | Hidden | Text input field visible | Type + submit |

**Specs:** Mic button 48px circle. Done button: foreground bg, white text, 8px radius. "Prefer to type?" link: primary color, right-aligned. Max-width 800px centered. Border-top 1px.

**Accessibility:** `aria-label="Toggle microphone"` with state. Space toggles mic. Enter submits Done. "Prefer to type?" keyboard-accessible. `aria-live="polite"` on status text.

---

#### ActiveListeningState

**Purpose:** Visual feedback during recording. Shows waveform animation in the conversation thread (right-aligned, where a speech card will eventually appear).

**Anatomy:**
```
                    ┌─────────────────────────────┐
                    │  🟢 I'm hearing you...       │
                    │  ┃┃┃┃┃┃┃┃ (waveform bars)   │
                    │  Words appear after Done      │
                    └─────────────────────────────┘
```

**Specs:** Background `--success-soft`. Border 1.5px solid `--success`. Radius 8px. Pulsing green dot (6px, animation: opacity 1→0.4, 1.5s infinite). 8 waveform bars (3px wide, varying heights 8-28px, green, 3 animation keyframes at 0.8s).

---

#### DiagramCanvas

**Purpose:** Pan/zoom wrapper for Mermaid.js rendered flowcharts. Used for both individual diagrams and synthesis.

**Anatomy:**
```
┌──────────────────────────────────────────┐
│                          [+][-][Fit]     │  ← Controls overlay
│                                           │
│         [Mermaid.js rendered diagram]     │
│                                           │
└──────────────────────────────────────────┘
```

**Interactions:** Pan (click-drag), zoom (scroll wheel or +/- buttons), fit (reset to show full diagram). Controls absolute-positioned top-right.

**Specs:** Background `--card`. Radius 12px. Shadow varies by context (sm for read-only, md for interactive). Padding 32px (interview), 24px (supervisor).

**Variants:**
- **Individual (interview):** Max-width 700px. Confirm/correct buttons below. No export.
- **Individual (carousel):** Max-width 700px. No buttons.
- **Synthesis:** Full panel width. Divergence badges on nodes. Clickable nodes.

**Accessibility:** `<details><summary>Text description</summary>` with structured text alternative. Pan/zoom controls keyboard-accessible (arrow keys for pan, +/- for zoom).

---

#### IndividualDiagramCarousel

**Purpose:** Navigable carousel for browsing interviewees' validated personal diagrams.

**Anatomy (Mode 1 — full-width):**
```
┌──────────────────────────────────────────────────────────┐
│  ◀  Rachel Torres — Austin, TX (1/3)  ▶                  │
│     Validated Apr 5, 2026 · 6 steps                       │
│                                                            │
│              [DiagramCanvas - full width]                  │
│                                                            │
│           [Compare with Synthesis]                         │
└──────────────────────────────────────────────────────────┘
```

**Anatomy (Mode 2 — compact, right panel of comparison):**
```
┌─────────────────────────────┐
│  ◀ Janet Park (3/3) ▶       │
│  Ogden, UT · 11 steps       │
│                              │
│  [DiagramCanvas - compact]  │
└─────────────────────────────┘
```

**States:** Mode 1 (full-width, default), Mode 2 (compact, inside comparison split). Transition animated.

**Specs (Mode 1):** Arrow buttons 36px circle, border. Label 16px weight 600. Sublabel 13px muted-foreground. Counter 13px muted-foreground. (Mode 2): Arrows 28px. Label 14px. Sublabel 12px.

**Accessibility:** Left/right arrow keys navigate. Position announced to screen readers.

---

#### DivergenceAnnotation

**Purpose:** Teal badges on synthesis diagram nodes indicating where interviews disagree. Clickable to auto-navigate the carousel.

**Anatomy (badge on node):**
```
┌──────────────────────────┐
│  2. Sort / Classify       │  ← Node with accent-soft bg
│                [Divergence]│  ← Teal pill, top-right
└──────────────────────────┘
```

**Anatomy (detail card):**
```
┌─ teal left border (3px) ────────────────────────┐
│  [Genuinely Unique]            Confidence: N/A   │
│                                                   │
│  Step 5: Verify / QC                             │
│                                                   │
│  Janet adds a manual spot-check step after data  │
│  entry. Rachel and Marcus skip verification.      │
│                                                   │
│  [Janet Park]  [Not mentioned: Rachel, Marcus]   │
└───────────────────────────────────────────────────┘
```

**Badge types:**

| Type | Label | Color |
|------|-------|-------|
| Genuinely Unique | "Genuinely Unique" | Teal |
| Sequence Conflict | "Sequence Conflict" | Teal (darker) |
| Uncertain | "Uncertain — Needs Review" | Amber (`--warning`) |

**Click behavior:** Auto-navigates carousel to relevant interviewee. Highlights corresponding step with teal glow (`box-shadow: 0 0 0 3px rgba(13,148,136,0.25)`).

**Specs:** Badge pill: accent bg, white text, 10px weight 600, radius-full. Detail card: 3px left border accent, card bg, shadow-sm, 8px radius. Source tags: muted bg, 6px radius, 12px, muted-foreground.

### Component Implementation Strategy

All custom components are built as React components using:
- shadcn/ui primitives as the foundation (Button, Card, Badge, ScrollArea, etc.)
- Tailwind CSS with the project's CSS custom property tokens for styling
- Radix UI for accessibility primitives (focus management, keyboard navigation, ARIA)
- Mermaid.js for diagram rendering inside DiagramCanvas

Components are organized by experience:
- `src/components/interview/` — ConsentScreen, ConversationThread, ReflectiveSummaryCard, SpeechCard, MicBar, ActiveListeningState
- `src/components/diagram/` — DiagramCanvas (shared between interview and supervisor)
- `src/components/supervisor/` — IndividualDiagramCarousel, DivergenceAnnotation

### Implementation Roadmap

**Phase 1 — Interview Core (critical path for demo):**
1. ConsentScreen — gate to everything else
2. ConversationThread + MicBar — the interview container
3. ReflectiveSummaryCard — the signature interaction
4. SpeechCard + ActiveListeningState — conversation feedback
5. DiagramCanvas (individual variant) — personal diagram validation

**Phase 2 — Supervisor Core (critical path for demo):**
6. IndividualDiagramCarousel (Mode 1) — individual browsing
7. DiagramCanvas (synthesis variant) — synthesis rendering
8. DivergenceAnnotation — divergence badges and detail cards
9. IndividualDiagramCarousel (Mode 2) — comparison split-screen

## UX Consistency Patterns

### Button Hierarchy

Every screen follows the same button hierarchy — one primary action per section, supporting actions in secondary or ghost styles.

| Level | Style | Usage | Specs |
|-------|-------|-------|-------|
| Primary | Solid fill, `--primary` bg, white text | The ONE main action: "Begin Interview," "Confirm," "Compare with Synthesis," "Sign In" | Weight 600, 8px radius, 14-16px font |
| Confirm | Solid fill, `--success` bg, white text | Positive validation: "Yes, that looks right" | Same specs as primary but green |
| Secondary | Outlined, `--border` border, `--foreground` text | Supporting actions: "Something's not right," "Back to Individual Review" | Same specs, transparent bg |
| Ghost | No border, text only with hover bg | Low-emphasis actions: "That's not right," "Prefer to type?" | Text color `--foreground` or `--primary` |

**Rules:**
- One primary button per screen section. Never two blue buttons competing.
- Confirm (green) is used ONLY for validating interviewee content (diagram, summaries). Never for navigation.
- Destructive actions don't exist in this demo — no delete, no cancel, no discard.

### Feedback Patterns

**Success feedback:** Happens at the point of action, inline. No toast notifications for routine successes.

| Pattern | Visual | When |
|---------|--------|------|
| Summary confirmed | Green checkmark + "Confirmed" text replaces buttons on violet card | Interviewee confirms reflective summary |
| Diagram validated | Diagram card transitions, interview status → Captured | Interviewee approves personal diagram |
| Sign-in success | Redirect to review interface (no "Welcome!" toast) | Supervisor authenticates |

**Processing feedback:** Always inline, never modal.

| Pattern | Visual | When |
|---------|--------|------|
| Agent thinking | Three animated dots (typing indicator), left-aligned, 0.5-2 sec | Before agent response |
| SSE streaming | Text appears word-by-word in message card | Agent response streaming |
| Speech processing | "Processing your response..." indicator in thread | After interviewee clicks Done |
| Diagram generating | Agent message + pulsing placeholder card, 2-5 sec | After interview completion |
| Page loading | Skeleton components matching layout (grey shapes) | Initial page load, < 3 sec |

**Error feedback:** Centered, clear, actionable.

| Pattern | Visual | When |
|---------|--------|------|
| Invalid token | Full-page error card, destructive icon, "This link isn't valid. Contact the person who sent it." | Token validation fails |
| Auth failure | Inline message below form, "Access not available. Contact your project manager." | Sign-in fails |
| Agent unavailable | Left-aligned system message in conversation, "The assistant is temporarily unavailable. Trying again..." with retry | Mid-interview LLM failure |
| Unsupported device | Full-page message, warning icon, "This experience requires a larger screen." | < 768px device |

**Rules:**
- No toast notifications anywhere. All feedback is inline at the point of action.
- Error messages always include an actionable next step ("Contact..." / "Trying again...").
- Never show technical error details to users. Never show stack traces, HTTP codes, or "something went wrong."

### Form Patterns

Forms are minimal in this demo — only the supervisor sign-in screen has form inputs.

**Sign-in form:**
- Email input → password input → sign-in button. Enter submits.
- Inline validation: error message appears below the form on failed sign-in.
- Helper text below password: "This is a project-specific password..." in muted-foreground.
- No "remember me" checkbox. No "forgot password" link (credentials managed by admin out-of-band).

**Voice input (MicBar) is NOT a form** — it's a conversation control. No form validation, no submit pattern. The mic is a toggle; Done is a recording action.

### Navigation Patterns

**Interview experience — no navigation.** The interview is immersive. No sidebar, no header nav, no hamburger, no breadcrumbs, no "back" button. The world shrinks to the conversation. The only navigation is forward through the conversation flow.

**Supervisor experience — mode-driven, not page-driven.**
- Mode 1 (Individual Carousel) ↔ Mode 2 (Comparison). Toggle via button.
- Within carousel: left/right arrows, keyboard arrow keys.
- Within comparison: click divergence badge → carousel auto-navigates.
- "Back to Individual Review" returns to Mode 1.
- No sidebar. No tabs. No breadcrumbs. The supervisor experience is immersive comparison.

**Top bar (supervisor only):** Brand icon + app name + project name on left. User avatar + name on right. Not clickable — purely informational context.

### Loading & Transition Patterns

| Pattern | Implementation | Duration |
|---------|---------------|----------|
| Page load | Skeleton components matching final layout. Content fades in replacing skeletons. No layout shift. | < 3 sec |
| Token resolution | Skeleton of consent screen. No "resolving..." spinner. | < 1 sec |
| Mode toggle | Synthesis panel slides in from left (Mode 1 → Mode 2). Carousel compresses to right panel. | 200-300ms CSS transition |
| Carousel navigation | Instant swap. No slide animation. New diagram appears immediately. | Instant (no reload) |
| Diagram reveal | Agent message → pulsing placeholder → diagram fades in | 2-5 sec for generation |
| SSE streaming | Text appears word-by-word. Typing indicator precedes. | 0.5-2 sec initial, then streaming |

**Rules:**
- Skeletons over spinners. Always.
- No layout shift — skeleton shapes match final content dimensions.
- No "loading..." text. The skeleton IS the loading state.
- Content fades in. Never pops in.

### Empty States

Empty states are minimal in this demo because most content is seeded:

| State | Message | When |
|-------|---------|------|
| No synthesis available | "Synthesis not yet available. Check back after interviews are completed." | Supervisor views project before synthesis is generated |
| No interviews completed | Not applicable — two interviews are pre-seeded | N/A for demo |

## Responsive Design & Accessibility

### Responsive Strategy

**Desktop-first design** with `max-width` media queries stepping down. The interview experience and supervisor comparison are both designed for desktop screens with tablet support for interviews only.

**Interview experience:** Single-column conversation thread is inherently responsive — same layout works from 768px to 1400px+. Just adjust max-width and padding. No breakpoint-specific layout changes needed.

**Supervisor experience:** Designed for 1200px+ monitors. The 55/45 split-screen comparison assumes substantial screen real estate. Not optimized for tablet or small laptops. Mode 1 (full-width carousel) works at smaller widths; Mode 2 (comparison) requires 1200px+.

**Mobile:** Explicitly unsupported. Devices under 768px width receive a full-page message: "This experience requires a tablet or desktop screen." Device detection occurs on interview token resolution.

### Breakpoint Strategy

| Breakpoint | Value | Interview Behavior | Supervisor Behavior |
|------------|-------|--------------------|---------------------|
| < 768px | Mobile | NOT SUPPORTED. Full-page unsupported device message. | NOT SUPPORTED. |
| 768px - 1023px | Tablet | Single-column thread, full-width with 20px padding. Touch targets 44px minimum. Consent card max-width 520px. Diagram canvas max-width 100% with 24px padding. | Mode 1 carousel functional. Mode 2 comparison NOT available (insufficient width). |
| 1024px - 1199px | Desktop | Conversation centered at max-width 800px. Consent card 560px. Diagram canvas 700px. Standard spacing. | Mode 1 carousel at full width. Mode 2 comparison available but tight. |
| 1200px+ | Wide desktop | Extra breathing room. Same layout with generous margins. | Full experience: Mode 1 carousel + Mode 2 comparison (55/45 split). |

**Approach:** Tailwind responsive prefixes (`md:`, `lg:`, `xl:`). Desktop-first with `max-width` media queries.

**Key advantage:** The interview's single-column thread eliminates tablet layout complexity. No multi-column reflow, no sidebar collapse, no navigation pattern changes. The same layout works across the entire supported range.

### Accessibility Strategy

**Target: WCAG 2.1 Level A compliance** — essential accessibility for all users, inherited from parent project design system.

**Color Contrast:** All combinations verified (documented in Visual Design Foundation section). Key pairs pass AA or AAA. `--foreground` on `--background` achieves 17.4:1 (AAA).

**Color Independence:** Every piece of information communicated through color is also communicated through text, icon, or shape:
- Reflective summaries: violet background + violet border + "REFLECTIVE SUMMARY" label + card shape
- Confirmed state: green + checkmark icon + "Confirmed" text
- Errors: red + icon + descriptive text message
- Divergences: teal + "Divergence" text badge + detail card with explanation
- Recording state: green mic + "Recording..." text + waveform animation

**Keyboard Navigation:**

| Screen | Tab Order | Special Keys |
|--------|-----------|-------------|
| Consent | Info blocks (read-only) → Begin button | Enter activates Begin |
| Interview | Conversation thread → confirm/correct buttons → mic toggle → done button → "Prefer to type?" | Space toggles mic. Enter submits Done. Enter activates Confirm. |
| Diagram validation | Diagram canvas (arrow keys pan, +/- zoom) → "Yes, that looks right" → "Something's not right" | Enter activates selected button |
| Supervisor carousel | Previous arrow → next arrow → diagram canvas → mode toggle button | Left/right arrows navigate carousel. Enter on toggle switches mode. |
| Supervisor comparison | Synthesis panel (divergence badges via tab) → carousel panel → bottom bar buttons | Enter on divergence badge triggers auto-navigation |

**Screen Reader Support:**
- `aria-live="polite"` on: completed speech card, "I'm hearing you..." state, streaming agent responses, confirmed badge
- `role="article"` with state-dependent `aria-label` on reflective summary cards
- Semantic HTML: `<button>` for all actions, `<article>` for summaries, proper heading hierarchy
- All Mermaid.js diagrams accompanied by `<details><summary>Text description</summary>` listing steps, decisions, and connections in plain text
- No content in `::before`/`::after` pseudo-elements (screen readers may miss it)

**Focus Management:**
- `outline: 2px solid var(--primary); outline-offset: 2px` on every interactive element via `:focus-visible`
- Never `outline: none` without replacement
- Focus trapped within active conversation during interview (no focus escaping to invisible elements)
- Focus moves to new reflective summary card when it appears

**Touch Targets:** 44px minimum height on all interactive elements at tablet breakpoint (768px). Mic button is 48px. Action buttons are 44px+.

### Testing Strategy

**Browser Testing:**
- Chrome (latest 2 versions) — primary and only required browser for demo
- Web Speech API tested in Chrome specifically (other browsers may require "Prefer to type?" fallback)

**Responsive Testing:**
- 768px tablet viewport (iPad portrait)
- 1024px laptop viewport
- 1200px+ desktop viewport
- Below 768px: verify unsupported device message appears

**Accessibility Testing:**
- Automated: axe-core or Lighthouse accessibility audit on all screens
- Keyboard-only: complete both journeys (interview + supervisor) using only keyboard
- Screen reader: test reflective summary announce, diagram text alternatives, confirmed state announce
- Color: verify all information is conveyed without color dependency

### Implementation Guidelines

**Responsive Development:**
- Use Tailwind responsive prefixes (`md:`, `lg:`, `xl:`) with desktop-first approach
- Use `max-width` for content containers (800px conversation, 560px consent, 700px diagram, 1400px supervisor)
- Use relative units (`rem`) for typography scale; `px` acceptable for borders, shadows, and fixed-size elements (mic button, avatars)
- Test touch targets at 768px — every interactive element must meet 44px minimum

**Accessibility Development:**
- Semantic HTML first: `<button>`, `<article>`, `<details>`, `<h1>`-`<h3>` heading hierarchy
- ARIA only where semantic HTML is insufficient (e.g., `aria-live` for dynamic content, `aria-label` for state-dependent labels)
- Focus indicators via `:focus-visible` — never remove without replacement
- All images/icons decorative (`aria-hidden="true"`) unless they convey meaning not available in adjacent text
- Skeletons use `aria-busy="true"` on container during load, removed when content appears
