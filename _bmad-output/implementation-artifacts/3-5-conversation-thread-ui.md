# Story 3.5: Conversation Thread UI

Status: ready-for-dev

## Story

As an interviewee,
I want a clean, familiar messaging interface for my interview conversation,
So that I can focus on describing my work.

## Acceptance Criteria

1. **Given** an Active interview **When** conversation exchanges occur **Then** the ConversationThread renders as a single-panel scrollable container (max-width 800px centered) with MicBar fixed at bottom (FR7, UX-DR2)
2. **Given** agent messages **When** the agent sends a question **Then** agent messages (questions) are left-aligned (max-width 75%) with primary-soft background and Avatar icon (UX-DR2)
3. **Given** the interviewee clicks Done **When** speech is submitted **Then** SpeechCards (user's raw speech) appear right-aligned (max-width 75%) with white background only after "Done" is clicked, with "Processing your response..." indicator first (UX-DR4, NFR2)
4. **Given** a reflective summary streams in **When** the agent sends a reflective summary **Then** ReflectiveSummaryCards are left-aligned (max-width 80%) with violet background (#F5F3FF), violet border (#C4B5FD), "REFLECTIVE SUMMARY" label (12px uppercase, #7C3AED), body text 18px weight 500 (UX-DR3)
5. **Given** a reflective summary card **When** the card is rendered **Then** ReflectiveSummaryCards have four states: Streaming (token-by-token), Awaiting confirmation ("Confirm" primary + "That's not right" ghost), Confirmed (green checkmark badge), Correction requested (UX-DR3)
6. **Given** the conversation thread **When** messages are rendered **Then** 16px gap between messages, 32px gap with Separator between reflect-and-confirm cycles (UX-DR2)
7. **Given** new messages arrive **When** the user has not scrolled up **Then** thread auto-scrolls to latest message, pauses auto-scroll when user scrolls up (UX-DR2)
8. **Given** the agent is preparing a response **When** the user is waiting **Then** typing indicator (three animated dots) appears before agent responses (UX-DR15)
9. **Given** any interactive element **When** focused via keyboard **Then** all interactive elements have focus indicators (2px solid primary, 2px offset) via `:focus-visible` (UX-DR16)
10. **Given** dynamic content updates **When** speech cards complete, streaming finishes, or badges appear **Then** `aria-live="polite"` announces the changes (UX-DR16)
11. **Given** the button hierarchy **When** buttons render **Then** one primary per section, Confirm (green) only for validation, Ghost for low emphasis (UX-DR20)

## Tasks / Subtasks

- [ ] Task 1: Create ConversationThread container component `src/components/interview/conversation-thread.tsx` (AC: #1, #6, #7)
  - [ ] 1.1 Create a `"use client"` component that renders a scrollable container (max-width 800px, centered via `mx-auto`) with a message list area and a slot for MicBar fixed at the bottom
  - [ ] 1.2 Define the local state model using `useReducer` with the following state shape:
    ```typescript
    type MessageType = 'agent_question' | 'speech_card' | 'reflective_summary' | 'typing_indicator' | 'processing_indicator';
    type SummaryState = 'streaming' | 'awaiting_confirmation' | 'confirmed' | 'correction_requested';
    
    interface ThreadMessage {
      id: string;
      type: MessageType;
      content: string;
      segmentId: string;
      summaryState?: SummaryState;
      timestamp: string; // ISO 8601
    }
    
    interface ThreadState {
      messages: ThreadMessage[];
      isAutoScrollEnabled: boolean;
      isAgentTyping: boolean;
      isProcessingSpeech: boolean;
    }
    ```
  - [ ] 1.3 Implement reducer actions: `ADD_MESSAGE`, `UPDATE_MESSAGE`, `SET_SUMMARY_STATE`, `SET_TYPING`, `SET_PROCESSING`, `SET_AUTO_SCROLL`, `APPEND_STREAMING_CONTENT`
  - [ ] 1.4 Render messages in order with 16px gap (`gap-4`) between messages within the same segment
  - [ ] 1.5 Render a `CycleSeparator` component (a styled Separator from shadcn/ui) between reflect-and-confirm cycles with 32px gap (`gap-8`, or `my-8` on the separator) — trigger separator when `segmentId` changes between consecutive messages
  - [ ] 1.6 Use `overflow-y-auto` on the scroll container. Reserve space at the bottom for the fixed MicBar (e.g., `pb-[120px]`)

- [ ] Task 2: Implement auto-scroll with pause-on-user-scroll pattern (AC: #7)
  - [ ] 2.1 Create a `useAutoScroll` custom hook that accepts a ref to the scroll container and the messages array
  - [ ] 2.2 On new message or content update, scroll to bottom using `scrollIntoView({ behavior: 'smooth' })` on a sentinel div at the end of the message list — but only if `isAutoScrollEnabled` is true
  - [ ] 2.3 Detect user scroll-up: attach a `scroll` event listener on the container. If `scrollTop + clientHeight < scrollHeight - threshold` (threshold ~50px), set `isAutoScrollEnabled` to false
  - [ ] 2.4 Re-enable auto-scroll when the user scrolls back to the bottom (within threshold)
  - [ ] 2.5 Always auto-scroll on the very first message (initial state is auto-scroll enabled)

- [ ] Task 3: Create SSE connection hook `src/components/interview/use-interview-stream.ts` (AC: #1, #8)
  - [ ] 3.1 Create a `useInterviewStream` custom hook that accepts the interview token and returns `{ sendMessage, messages, isAgentTyping, isProcessingSpeech }`
  - [ ] 3.2 When `sendMessage(content: string)` is called: dispatch `SET_PROCESSING(true)` to show the "Processing your response..." indicator, then POST to `/api/interview/[token]/messages` with `{ content }` and open an EventSource on the response stream
  - [ ] 3.3 Handle SSE `message` events: parse `{ content, exchangeType }`. On first token, dispatch `SET_TYPING(false)` and `ADD_MESSAGE` with type based on `exchangeType` (`question` maps to `agent_question`, `reflective_summary` maps to `reflective_summary`). On subsequent tokens, dispatch `APPEND_STREAMING_CONTENT`
  - [ ] 3.4 Handle SSE `done` events: parse `{ interviewExchangeId, segmentId }`. If the completed message is a `reflective_summary`, set its `summaryState` to `awaiting_confirmation`. Mark streaming complete.
  - [ ] 3.5 Handle SSE `error` events: parse `{ message, code }`. Display an inline system error message in the conversation thread ("The assistant is temporarily unavailable. Trying again...")
  - [ ] 3.6 Before the first agent token arrives for a response, dispatch `SET_TYPING(true)` to show the typing indicator
  - [ ] 3.7 Use native `EventSource` or a `fetch`-based SSE reader (since POST-based SSE is not supported by native EventSource, use a `fetch` + `ReadableStream` reader pattern to parse SSE events from the POST response)

- [ ] Task 4: Create AgentMessageCard component `src/components/interview/agent-message-card.tsx` (AC: #2)
  - [ ] 4.1 Create a `"use client"` leaf component that renders a left-aligned message card (max-width 75%) with `--primary-soft` background (`bg-primary-soft`), `--border` border (1px), 8px border radius, 12px 16px padding
  - [ ] 4.2 Include a small Avatar icon on the left side of the card (a simple bot/agent icon, inline SVG, no external icon library)
  - [ ] 4.3 Body text at 18px (`text-lg`) weight 400, line-height 1.6, using `--foreground` color
  - [ ] 4.4 Support streaming content: accept a `content` prop and an `isStreaming` boolean. When streaming, render a blinking cursor at the end of the text

- [ ] Task 5: Create SpeechCard component `src/components/interview/speech-card.tsx` (AC: #3, #10)
  - [ ] 5.1 Create a `"use client"` leaf component that renders a right-aligned card (max-width 75%) with white background (`bg-card`), `--border` border (1px), 8px radius, 12px 16px padding
  - [ ] 5.2 Implement two states: Processing (shows "Processing your response..." in muted-foreground text with a subtle pulse animation) and Completed (shows the full speech text at 15px, `--foreground` color)
  - [ ] 5.3 Display a timestamp in 12px `--muted-foreground` above the card, right-aligned
  - [ ] 5.4 Add `aria-live="polite"` on the card container so screen readers announce when the completed text appears
  - [ ] 5.5 Never show during recording — only render after "Done" is clicked (controlled by parent ConversationThread state)

- [ ] Task 6: Create ReflectiveSummaryCard component `src/components/interview/reflective-summary-card.tsx` (AC: #4, #5, #10, #11)
  - [ ] 6.1 Create a `"use client"` leaf component with the following styling: background `var(--summary-bg)` (#F5F3FF), border 1.5px solid `var(--summary-border)` (#C4B5FD), 8px radius, 18px 20px padding, left-aligned, max-width 80%
  - [ ] 6.2 Render the "REFLECTIVE SUMMARY" label: 12px, uppercase, letter-spacing 0.04em, color `var(--summary-text)` (#7C3AED), font-weight 600
  - [ ] 6.3 Render body text at 18px (`text-lg`), font-weight 500, line-height 1.6, `--foreground` color
  - [ ] 6.4 Implement the four states as a `summaryState` prop:
    - **Streaming:** Text streams in token-by-token (content prop updates incrementally). Label visible. No buttons. Blinking cursor at end.
    - **Awaiting confirmation:** Full text visible. Render "Confirm" button (green/success variant, `bg-success text-white`) and "That's not right" button (ghost variant). "Confirm" is the primary action for this section.
    - **Confirmed:** Buttons disappear. Render a green checkmark badge: inline-flex, `bg-success-soft` background, green checkmark SVG icon, "Confirmed" text at 12px weight 500. Add `aria-live="polite"` so "Confirmed" is announced.
    - **Correction requested:** Card dims slightly (`opacity-75`). Buttons disappear. A new revised summary card will appear below (handled by parent).
  - [ ] 6.5 Add `role="article"` and state-dependent `aria-label`: "Reflective summary streaming", "Reflective summary awaiting your confirmation", "Reflective summary confirmed", "Reflective summary correction requested"
  - [ ] 6.6 Wire "Confirm" click to call `onConfirm(segmentId)` callback prop — this sends a confirmation exchange via the message API
  - [ ] 6.7 Wire "That's not right" click to call `onCorrect(segmentId)` callback prop — this triggers the correction flow

- [ ] Task 7: Create TypingIndicator component `src/components/interview/typing-indicator.tsx` (AC: #8)
  - [ ] 7.1 Create a small `"use client"` leaf component that renders three animated dots, left-aligned, matching agent message positioning (left side, with avatar placeholder for alignment)
  - [ ] 7.2 Three dots (6px circles, `--muted-foreground` color) with staggered bounce animation (CSS keyframes, offset 0.15s each, 1.2s infinite loop)
  - [ ] 7.3 Wrap in a container with `--primary-soft` background, same border radius as agent messages, compact padding (8px 16px)
  - [ ] 7.4 Add `aria-live="polite"` with `aria-label="Agent is typing"` and visually hidden text "Agent is typing..."

- [ ] Task 8: Create CycleSeparator component `src/components/interview/cycle-separator.tsx` (AC: #6)
  - [ ] 8.1 Create a simple component that renders a shadcn/ui `Separator` with 32px vertical margin (16px top + 16px bottom, totaling 32px gap)
  - [ ] 8.2 Style: `--border` color, full-width within the conversation container, 1px height
  - [ ] 8.3 Add `role="separator"` and `aria-hidden="true"` (decorative separator)

- [ ] Task 9: Wire confirm/correct actions to the message API (AC: #5, #11)
  - [ ] 9.1 In `useInterviewStream`, implement `confirmSummary(segmentId: string)`: POST to `/api/interview/[token]/messages` with `{ content: "confirmed", exchangeType: "confirmation" }` — on success, dispatch `SET_SUMMARY_STATE(segmentId, 'confirmed')`
  - [ ] 9.2 In `useInterviewStream`, implement `requestCorrection(segmentId: string)`: POST to `/api/interview/[token]/messages` with `{ content: "correction_requested", exchangeType: "confirmation" }` — on success, dispatch `SET_SUMMARY_STATE(segmentId, 'correction_requested')` and show a new typing indicator for the revised summary
  - [ ] 9.3 Pass `confirmSummary` and `requestCorrection` as callbacks through ConversationThread to ReflectiveSummaryCard's `onConfirm` and `onCorrect` props

- [ ] Task 10: Implement focus-visible indicators (AC: #9)
  - [ ] 10.1 Verify that the existing `globals.css` focus-visible styles from shadcn/ui apply to all interactive elements in the thread (buttons already have `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50` in button.tsx)
  - [ ] 10.2 For any custom interactive elements (summary card buttons, mic bar controls), ensure `:focus-visible` applies `outline: 2px solid var(--primary); outline-offset: 2px` — add a utility class `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2` to Tailwind if the shadcn default ring style is insufficient

- [ ] Task 11: Create tests (AC: #1-#11)
  - [ ] 11.1 Create `src/components/interview/conversation-thread.test.tsx`:
    - Test renders empty thread with no messages
    - Test renders agent message left-aligned with primary-soft background
    - Test renders speech card right-aligned after processing state
    - Test renders reflective summary card with violet background and label
    - Test renders cycle separator between different segment IDs
    - Test 16px gap between same-segment messages and 32px separator gap between segments
  - [ ] 11.2 Create `src/components/interview/reflective-summary-card.test.tsx`:
    - Test streaming state: label visible, no buttons, content updates
    - Test awaiting confirmation state: "Confirm" and "That's not right" buttons visible
    - Test confirmed state: green checkmark badge visible, buttons hidden
    - Test correction requested state: card dims, buttons hidden
    - Test "Confirm" click calls `onConfirm` with segmentId
    - Test "That's not right" click calls `onCorrect` with segmentId
    - Test `aria-label` updates with state
    - Test `aria-live="polite"` present on confirmed badge
  - [ ] 11.3 Create `src/components/interview/speech-card.test.tsx`:
    - Test processing state shows "Processing your response..." text
    - Test completed state shows speech text and timestamp
    - Test `aria-live="polite"` on completed card
  - [ ] 11.4 Create `src/components/interview/typing-indicator.test.tsx`:
    - Test renders three dots
    - Test has `aria-label="Agent is typing"`
  - [ ] 11.5 Create `src/components/interview/use-interview-stream.test.ts`:
    - Test `sendMessage` dispatches processing state then opens SSE connection
    - Test SSE `message` event with `exchangeType: 'question'` creates agent_question message
    - Test SSE `message` event with `exchangeType: 'reflective_summary'` creates reflective_summary message
    - Test SSE `done` event transitions reflective_summary to awaiting_confirmation
    - Test SSE `error` event adds system error message to thread
    - Test `confirmSummary` sends POST and updates summary state to confirmed
    - Test `requestCorrection` sends POST and updates summary state to correction_requested
    - Mock `fetch` for API calls — NOT the SSE transport directly

## Dev Notes

### What Already Exists (from Earlier Stories)

- `src/app/globals.css` — Full design token system implemented (UX-DR11): primary blue (#2563EB), primary-soft (#DBEAFE), summary-bg (#F5F3FF), summary-border (#C4B5FD), summary-text (#7C3AED), success (#16A34A), spacing tokens, radius tokens, shadow tokens, Inter font
- `src/components/ui/button.tsx` — shadcn/ui Button with variants (default, outline, secondary, ghost, destructive, link) and sizes. Already includes `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`
- `src/components/interview/` — Directory exists with `.gitkeep` only (consent-screen.tsx may exist from Story 2.3)
- `src/lib/db/schema.ts` — All tables defined including `interviewExchanges` with `exchangeType` enum (question, response, reflective_summary, confirmation, revised_summary), `speaker` enum (agent, interviewee), `segmentId`, `isVerified`, `sequenceNumber`
- `src/lib/db/queries.ts` — Query functions from Story 2.1
- `src/app/api/interview/[token]/messages/route.ts` — POST route with SSE streaming from Story 3.3 (emits `message`, `done`, `error` events)
- `src/components/interview/mic-bar.tsx` — MicBar component from Story 3.4 (fixed bottom, recording controls, "Prefer to type?" toggle)
- `src/components/interview/active-listening-state.tsx` — ActiveListeningState from Story 3.4 (waveform animation during recording)
- `src/lib/stt/` — STT provider interface and Web Speech API implementation from Story 3.4

### SSE Event Format (from Story 3.3 and Architecture)

The POST `/api/interview/[token]/messages` route returns an SSE stream. Since this is a POST (not GET), native `EventSource` cannot be used. Instead, use a `fetch`-based SSE reader:

```typescript
const response = await fetch(`/api/interview/${token}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse SSE format: "event: message\ndata: {...}\n\n"
  // Extract event type and JSON data from each chunk
}
```

**SSE events from the server:**
- `event: message` — `data: { content: string, exchangeType: 'question' | 'reflective_summary' }` — Agent response tokens
- `event: done` — `data: { interviewExchangeId: string, segmentId: string }` — Stream completion
- `event: error` — `data: { message: string, code: string }` — Error during streaming

The `exchangeType` field tells the UI whether to render the incoming content as an `AgentMessageCard` (question) or a `ReflectiveSummaryCard` (reflective_summary).

### Component Hierarchy

```
ConversationThread ("use client")
├── [messages list — scrollable area]
│   ├── AgentMessageCard (left-aligned, primary-soft bg)
│   ├── SpeechCard (right-aligned, white bg)
│   ├── ReflectiveSummaryCard (left-aligned, violet bg, 4 states)
│   ├── CycleSeparator (between segments)
│   ├── TypingIndicator (left-aligned, animated dots)
│   └── [sentinel div for auto-scroll]
└── MicBar (fixed bottom — imported from Story 3.4)
```

ConversationThread is the `"use client"` boundary. All sub-components are also client components but only because they are children of a client component — push `"use client"` directive to the leaf components that genuinely need it (ReflectiveSummaryCard needs interactivity, SpeechCard has conditional rendering, AgentMessageCard may stream).

### Reflective Summary State Machine

```
Streaming → (SSE done event) → Awaiting Confirmation
Awaiting Confirmation → (user clicks Confirm) → Confirmed
Awaiting Confirmation → (user clicks That's not right) → Correction Requested
Correction Requested → (new revised_summary streams in as a NEW card below)
```

- "Confirmed" state is terminal — the card never changes again
- "Correction requested" dims the original card; a new ReflectiveSummaryCard appears below for the revised summary (same segment, new exchange)
- Only `reflective_summary` and `revised_summary` exchange types render as ReflectiveSummaryCards

### Auto-Scroll Behavior

The auto-scroll pattern follows a standard chat application model:

1. **Default:** Auto-scroll is ON. Every new message or streaming content update scrolls to the bottom.
2. **Pause:** When the user scrolls up (scroll position is more than ~50px from the bottom), auto-scroll turns OFF.
3. **Resume:** When the user scrolls back to within ~50px of the bottom, auto-scroll turns ON again.
4. **Implementation:** Use an `IntersectionObserver` on the sentinel div at the bottom of the message list, or a `scroll` event listener with debounce comparing `scrollTop + clientHeight` to `scrollHeight`.

### Message Rendering Logic

Map exchange types to UI components:

| Exchange Type (from SSE/DB) | UI Component | Alignment | Background |
|---|---|---|---|
| `question` | AgentMessageCard | Left (max-width 75%) | `--primary-soft` (#DBEAFE) |
| `response` | SpeechCard | Right (max-width 75%) | `--card` (#FFFFFF) |
| `reflective_summary` | ReflectiveSummaryCard | Left (max-width 80%) | `--summary-bg` (#F5F3FF) |
| `revised_summary` | ReflectiveSummaryCard | Left (max-width 80%) | `--summary-bg` (#F5F3FF) |
| `confirmation` | (not rendered as a card — it triggers state change on the summary card) | N/A | N/A |

### Design Token Usage (from globals.css)

All colors reference CSS custom properties already defined in `globals.css`:

- Agent messages: `bg-primary-soft` (maps to `--primary-soft: #DBEAFE`)
- Speech cards: `bg-card` (maps to `--card: #FFFFFF`), `border-border` (maps to `--border: #E5E5E5`)
- Reflective summaries: `bg-summary-bg` (maps to `--summary-bg: #F5F3FF`), border color `var(--summary-border)` (#C4B5FD), label color `text-summary-text` (maps to `--summary-text: #7C3AED`)
- Confirmed badge: `bg-success` for icon/text (#16A34A)
- Spacing: `gap-4` (16px between messages), 32px separator gap via margin on CycleSeparator
- Text sizes: `text-lg` (18px) for agent messages and summary body, `text-xs` (12px) for labels and badges, `text-[15px]` for speech card text, `text-sm` (14px) for timestamps

### Accessibility Requirements (UX-DR16)

- `aria-live="polite"` on: SpeechCard container (announces completed text), ReflectiveSummaryCard (announces streaming completion and confirmed state), TypingIndicator (announces "Agent is typing")
- `role="article"` on ReflectiveSummaryCard with state-dependent `aria-label`
- All buttons keyboard-focusable with `:focus-visible` indicators
- Semantic HTML: `<button>` for actions, `<article>` for summary cards
- Visually hidden text for screen readers where icon-only indicators are used (e.g., typing dots)
- 44px minimum touch targets at tablet breakpoint (768px) for Confirm/Correct buttons

### Button Hierarchy (UX-DR20)

- **Confirm:** Green fill (`bg-success text-white`), weight 600 — only for validating interviewee content
- **"That's not right":** Ghost variant (text only, hover background) — low emphasis
- One primary action per section — within a ReflectiveSummaryCard, "Confirm" is the primary
- No destructive actions in this story

### What NOT to Do

- Do NOT import Drizzle or `@anthropic-ai/sdk` in any component — components call API routes via fetch
- Do NOT store interview data in browser localStorage/sessionStorage (NFR9)
- Do NOT use global state libraries (Redux, Zustand) — local `useReducer` only
- Do NOT show raw speech text during recording — SpeechCard appears only after "Done" (NFR2)
- Do NOT add toast notifications — all feedback is inline (UX-DR19)
- Do NOT create the MicBar component — it already exists from Story 3.4
- Do NOT create the SSE streaming route — it already exists from Story 3.3
- Do NOT implement the diagram review or diagram correction UI — those are Stories 3.6 and 3.7
- Do NOT add a "Back" button or header navigation — the interview is immersive, no navigation (UX pattern)
- Do NOT hardcode colors — use CSS custom property tokens from globals.css

### Project Structure Notes

Files **created** by this story:
- `src/components/interview/conversation-thread.tsx` — Main container component
- `src/components/interview/agent-message-card.tsx` — Left-aligned agent question card
- `src/components/interview/speech-card.tsx` — Right-aligned user speech card
- `src/components/interview/reflective-summary-card.tsx` — Violet summary card with 4 states
- `src/components/interview/typing-indicator.tsx` — Three animated dots
- `src/components/interview/cycle-separator.tsx` — Separator between segments
- `src/components/interview/use-interview-stream.ts` — SSE connection and message state hook
- `src/components/interview/use-auto-scroll.ts` — Auto-scroll behavior hook

Files **NOT modified** by this story:
- `src/app/globals.css` — Design tokens already complete
- `src/components/ui/button.tsx` — Already has all needed variants
- `src/components/interview/mic-bar.tsx` — Already exists from Story 3.4
- `src/app/api/interview/[token]/messages/route.ts` — Already exists from Story 3.3
- `src/lib/db/schema.ts` — Already complete

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5 — Acceptance criteria, UX-DRs, FRs]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ConversationThread — Component anatomy, behavior, states]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ReflectiveSummaryCard — Four states, specs, accessibility]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#SpeechCard — States, specs, accessibility]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Considerations — Focus, aria-live, keyboard nav]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy — Primary/Confirm/Ghost rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Feedback Patterns — Inline feedback, no toasts]
- [Source: _bmad-output/planning-artifacts/architecture.md#SSE Event Formats — message, done, error events]
- [Source: _bmad-output/planning-artifacts/architecture.md#Component Directory — interview/ component list]
- [Source: _bmad-output/coding-standards.md#Section 8 — SSE Streaming Pattern]
- [Source: _bmad-output/planning-artifacts/prd.md#FR7 — Single-panel conversational thread]
- [Source: _bmad-output/planning-artifacts/prd.md#FR8 — Reflect-and-confirm pattern]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR2 — Raw speech never shown to interviewee]
- [Source: _bmad-output/project-context.md#Service Boundaries — No Drizzle outside src/lib/db/]
- [Source: _bmad-output/project-context.md#Framework Rules — Server Components default, use client at leaves]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
