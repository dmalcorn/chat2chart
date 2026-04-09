# Story 3.4: Voice Input Controls & STT Provider

Status: ready-for-dev

## Story

As an interviewee,
I want to speak naturally using my microphone with clear recording controls,
So that I can describe my work without friction.

## Acceptance Criteria

1. **Given** an Active interview with mic permission granted **When** I interact with the MicBar **Then** I see a 48px circle mic button with four states: Idle (red border, "Tap to start"), Recording (green bg, pulse-ring animation, "Recording...", Done button), Processing (disabled), Text mode (UX-DR5)
2. **Given** the MicBar in any state **When** I look at the recording indicator **Then** red = not recording, green = recording (FR11a)
3. **Given** the MicBar is in Idle state **When** I click the mic button **Then** recording starts explicitly (no auto-start) (FR11b)
4. **Given** the MicBar is in Recording state **When** I click "Done" **Then** recording stops (no silence detection) (FR11c)
5. **Given** recording is active **When** I look at the conversation thread **Then** a waveform animation displays right-aligned with "I'm hearing you..." text (ActiveListeningState) (FR11d, UX-DR6)
6. **Given** the MicBar in any voice state **When** I look at the bottom bar **Then** "Prefer to type?" toggle is always visible for text input fallback (FR11e, UX-DR5)
7. **Given** the STT system **When** the code is structured **Then** `src/lib/stt/provider.ts` defines the `STTProvider` interface, `src/lib/stt/web-speech-provider.ts` implements it for Browser Web Speech API (FR14)
8. **Given** recording is active **When** the STT provider produces transcript text **Then** the raw speech transcript is never shown while recording — the first text the interviewee sees is the agent's reflective summary (NFR2)

## Tasks / Subtasks

- [ ] Task 1: Create `STTProvider` interface in `src/lib/stt/provider.ts` (AC: #7)
  - [ ] 1.1 Create `src/lib/stt/provider.ts` (replace `.gitkeep`)
  - [ ] 1.2 Define the `STTProvider` interface matching the contract from coding-standards.md:
    ```typescript
    export interface STTTranscriptResult {
      text: string;
      confidence: number;
      isFinal: boolean;
    }

    export interface STTProvider {
      initialize(config: { apiKey?: string; options?: Record<string, unknown> }): void;
      startListening(): void;
      stopListening(): Promise<string>;
      onTranscript(callback: (result: STTTranscriptResult) => void): void;
    }
    ```
  - [ ] 1.3 Export the interface and result type for use by the web speech provider and hooks

- [ ] Task 2: Create `WebSpeechProvider` implementation in `src/lib/stt/web-speech-provider.ts` (AC: #7)
  - [ ] 2.1 Create `src/lib/stt/web-speech-provider.ts`
  - [ ] 2.2 Implement `WebSpeechProvider` class that implements `STTProvider`:
    - `initialize()` — Create `SpeechRecognition` instance (with `webkitSpeechRecognition` fallback for Chrome), set `continuous = true`, `interimResults = false`, `lang = 'en-US'`
    - `startListening()` — Call `recognition.start()`, track listening state internally
    - `stopListening()` — Return a `Promise<string>` that calls `recognition.stop()`, resolves with the accumulated final transcript text, and resets internal state
    - `onTranscript(callback)` — Register callback to be invoked on `recognition.onresult` events, mapping the `SpeechRecognitionEvent` to `STTTranscriptResult` format
  - [ ] 2.3 Handle the `onerror` event on the SpeechRecognition instance — log the error, invoke the transcript callback with empty text and `isFinal: true` so the UI can handle the failure gracefully
  - [ ] 2.4 Handle the `onend` event — if the provider is still in "listening" state (e.g., browser stopped recognition unexpectedly), resolve the pending `stopListening` promise with whatever transcript was accumulated
  - [ ] 2.5 Add a `isSupported()` static method that returns `boolean` — checks `typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)` for feature detection
  - [ ] 2.6 Web Speech API is ONLY touched inside this file — components and hooks never reference `SpeechRecognition` or `webkitSpeechRecognition` directly

- [ ] Task 3: Create `useSpeechRecognition` hook in `src/lib/stt/use-speech-recognition.ts` (AC: #3, #4, #7, #8)
  - [ ] 3.1 Create `src/lib/stt/use-speech-recognition.ts`
  - [ ] 3.2 Implement a custom React hook that wraps the `STTProvider` interface:
    ```typescript
    export type SpeechRecognitionStatus = 'idle' | 'recording' | 'processing';

    export interface UseSpeechRecognitionReturn {
      status: SpeechRecognitionStatus;
      startRecording: () => void;
      stopRecording: () => Promise<string>;
      isSupported: boolean;
    }
    ```
  - [ ] 3.3 On mount, instantiate `WebSpeechProvider`, call `initialize()`, and set `isSupported` via the static `isSupported()` method
  - [ ] 3.4 `startRecording()` — set status to `'recording'`, call `provider.startListening()`. Transcript text is NOT exposed to the UI — it is only returned on stop (NFR2)
  - [ ] 3.5 `stopRecording()` — set status to `'processing'`, call `provider.stopListening()`, return the transcript string (promise), then set status to `'idle'`. The calling component sends this transcript to the server; it is never rendered in the UI during recording
  - [ ] 3.6 Cleanup: on unmount, stop any active recognition session to prevent memory leaks
  - [ ] 3.7 The hook does NOT store or expose the transcript as state — the raw text is never available for rendering (NFR2). It is only returned as the resolved value of `stopRecording()`

- [ ] Task 4: Create `MicBar` component in `src/components/interview/mic-bar.tsx` (AC: #1, #2, #3, #4, #6)
  - [ ] 4.1 Create `src/components/interview/mic-bar.tsx` as a `"use client"` component
  - [ ] 4.2 Define props interface:
    ```typescript
    export type MicBarMode = 'idle' | 'recording' | 'processing' | 'text';

    interface MicBarProps {
      mode: MicBarMode;
      onStartRecording: () => void;
      onStopRecording: () => void;
      onToggleTextMode: () => void;
      onSendText: (text: string) => void;
      disabled?: boolean;
    }
    ```
  - [ ] 4.3 Render fixed-bottom bar (border-top 1px `--border`, max-width 800px centered, padding 12px 16px) with three zones:
    - Left: Mic button (48px circle)
    - Center: Status text or text input field
    - Right: "Prefer to type?" ghost link (always visible in voice states) or submit button (in text mode)
  - [ ] 4.4 **Idle state:** Mic button with red border (`--destructive`), destructive-soft background (light red tint), white mic icon. Status text: "Tap to start" in muted-foreground. Click mic button calls `onStartRecording`
  - [ ] 4.5 **Recording state:** Mic button with green background (`--success`), white mic icon, CSS pulse-ring animation (green ring expanding outward, opacity fade, 1.5s infinite). Status text: "Recording..." in success color. "Done" button visible (foreground bg, white text, 8px radius). Click Done calls `onStopRecording`
  - [ ] 4.6 **Processing state:** Mic button disabled (muted background). Status text: "Processing..." in muted-foreground. No clickable actions
  - [ ] 4.7 **Text mode:** Mic button hidden. Text input field visible (full width minus submit button area). Submit button to send typed text via `onSendText`. "Back to voice" toggle replaces "Prefer to type?"
  - [ ] 4.8 "Prefer to type?" toggle: Ghost button style (`--primary` text, no border), right-aligned. Calls `onToggleTextMode`. Always visible in Idle, Recording, and Processing states
  - [ ] 4.9 Use design tokens from `globals.css` — `--destructive`, `--success`, `--foreground`, `--border`, `--muted-foreground`, `--primary`. No hardcoded color values
  - [ ] 4.10 CSS animations defined in the component or a co-located CSS module:
    - Pulse-ring: `@keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(1.8); opacity: 0; } }` — applied to a pseudo-element or sibling div around the mic button during Recording state

- [ ] Task 5: Create `ActiveListeningState` component in `src/components/interview/active-listening-state.tsx` (AC: #5)
  - [ ] 5.1 Create `src/components/interview/active-listening-state.tsx` as a `"use client"` component
  - [ ] 5.2 Render a right-aligned card in the conversation thread (max-width 75%, same alignment as SpeechCard per UX-DR4):
    - Background: `--success` at ~8% opacity (success-soft equivalent — use Tailwind `bg-[color-mix(in_srgb,var(--success)_8%,transparent)]` or a CSS variable)
    - Border: 1.5px solid `--success`
    - Border radius: 8px
    - Padding: 12px 16px
  - [ ] 5.3 Content layout:
    - Row 1: Pulsing green dot (6px circle, `--success` background, CSS animation: opacity 1 to 0.4, 1.5s infinite) + "I'm hearing you..." text in success color
    - Row 2: 8 waveform bars (3px wide, varying heights 8-28px, `--success` color, staggered CSS animation at 0.8s duration with different delays per bar)
    - Row 3: "Words appear after Done" helper text in muted-foreground, small font
  - [ ] 5.4 CSS animations:
    - Pulsing dot: `@keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }` — 1.5s infinite
    - Waveform bars: `@keyframes waveform { 0%, 100% { height: 8px; } 50% { height: 28px; } }` — 0.8s infinite, each bar with staggered `animation-delay` (0s, 0.1s, 0.2s, etc.)
  - [ ] 5.5 Component only renders when the parent passes `isRecording={true}` — it appears in the conversation thread during recording and is removed when recording stops (replaced by SpeechCard in Story 3.5)

- [ ] Task 6: Accessibility implementation (AC: #1, #2, #6)
  - [ ] 6.1 MicBar mic button: `aria-label="Start recording"` (Idle), `aria-label="Recording in progress"` (Recording), `aria-label="Processing speech"` (Processing). Update dynamically based on state
  - [ ] 6.2 MicBar status text region: `aria-live="polite"` so screen readers announce state changes ("Tap to start", "Recording...", "Processing...")
  - [ ] 6.3 MicBar keyboard support: Space bar toggles mic (start/stop). Enter activates Done button. Tab order: mic button → Done button (when visible) → "Prefer to type?" toggle
  - [ ] 6.4 ActiveListeningState: `role="status"` with `aria-label="Recording audio — waveform animation"`. Waveform animation uses `aria-hidden="true"` since it is purely decorative
  - [ ] 6.5 "Prefer to type?" toggle: keyboard-accessible (focusable, Enter/Space activates), `aria-label="Switch to text input mode"`
  - [ ] 6.6 Text mode input: `aria-label="Type your response"`, auto-focus when text mode is activated
  - [ ] 6.7 Focus indicators: all interactive elements show visible focus ring using `--ring` token (2px offset, matches shadcn/ui pattern)

- [ ] Task 7: Create tests (AC: #1-#8)
  - [ ] 7.1 Create `src/lib/stt/provider.test.ts`:
    - Test that the `STTProvider` interface shape is correctly typed (compile-time check via type assertion)
    - Test that `STTTranscriptResult` has required fields
  - [ ] 7.2 Create `src/lib/stt/web-speech-provider.test.ts`:
    - Mock `window.SpeechRecognition` (or `webkitSpeechRecognition`) to test the provider without a real browser
    - Test `initialize()` creates a recognition instance
    - Test `startListening()` calls `recognition.start()`
    - Test `stopListening()` resolves with accumulated transcript
    - Test `onTranscript()` callback is invoked with correct `STTTranscriptResult` shape
    - Test `isSupported()` returns true when `SpeechRecognition` exists on window, false otherwise
    - Test error handling: `onerror` event triggers callback with empty text
    - Mock at the Web Speech API level here (this is the adapter boundary — the ONLY place we mock browser APIs per testing rules)
  - [ ] 7.3 Create `src/lib/stt/use-speech-recognition.test.ts`:
    - Mock `STTProvider` interface (NOT `WebSpeechProvider` directly, NOT `SpeechRecognition` browser API)
    - Test initial state is `{ status: 'idle', isSupported: true/false }`
    - Test `startRecording()` transitions status to `'recording'`
    - Test `stopRecording()` transitions through `'processing'` to `'idle'`, returns transcript string
    - Test that transcript text is NOT exposed as state (NFR2) — verify no state variable holds the transcript
    - Test cleanup on unmount stops recognition
  - [ ] 7.4 Create `src/components/interview/mic-bar.test.tsx`:
    - Test Idle state renders: red-bordered mic button, "Tap to start" text, "Prefer to type?" toggle
    - Test Recording state renders: green mic button, "Recording..." text, Done button, "Prefer to type?" toggle
    - Test Processing state renders: disabled mic button, "Processing..." text, no Done button
    - Test Text mode renders: text input field, submit button, no mic button, "Back to voice" toggle
    - Test clicking mic button in Idle calls `onStartRecording`
    - Test clicking Done in Recording calls `onStopRecording`
    - Test clicking "Prefer to type?" calls `onToggleTextMode`
    - Test typing text and clicking submit calls `onSendText` with the typed text
    - Test accessibility: `aria-label` values change per state, `aria-live` region exists
    - Test keyboard: Space on mic button triggers start/stop
  - [ ] 7.5 Create `src/components/interview/active-listening-state.test.tsx`:
    - Test component renders green dot, "I'm hearing you..." text, waveform bars, helper text
    - Test 8 waveform bars are rendered
    - Test `role="status"` and `aria-label` are present
    - Test waveform bars have `aria-hidden="true"`

## Dev Notes

### What Already Exists

- `src/lib/stt/` — Directory exists with `.gitkeep` only. No STT code yet.
- `src/components/interview/` — Directory exists with `.gitkeep` only. No interview components yet.
- `src/app/globals.css` — Design tokens defined: `--success` (#16a34a), `--destructive` (#dc2626), `--foreground` (#171717), `--muted-foreground` (#737373), `--primary` (#2563eb), `--border` (#e5e5e5), `--ring` (#2563eb). Note: `--success-soft` and `--destructive-soft` are NOT defined in globals.css — this story must either add them or compute soft variants inline (e.g., via `color-mix()` in CSS).
- `src/components/ui/button.tsx` — shadcn/ui Button component exists and can be used for Done button and text submit
- `src/lib/ai/provider-registry.ts` — LLM provider registry exists (Story 1.4) as a pattern reference for adapter interfaces

### Design Token Gap

The UX spec references `--success-soft` and `--destructive-soft` background colors for the MicBar and ActiveListeningState, but these tokens do NOT exist in `globals.css`. Two options:
1. Add `--success-soft` and `--destructive-soft` to `globals.css` (preferred — consistent with `--primary-soft` which already exists)
2. Compute inline via CSS `color-mix()`: `color-mix(in srgb, var(--success) 8%, transparent)`

Recommended: Add to globals.css in this story:
```css
/* :root */
--success-soft: #dcfce7;   /* green-100 equivalent */
--destructive-soft: #fee2e2; /* red-100 equivalent */

/* .dark */
--success-soft: #14532d;   /* green-900 equivalent */
--destructive-soft: #450a0a; /* red-900 equivalent */
```

### STTProvider Interface Contract

The interface is defined in `coding-standards.md` Section 1. The implementation must match exactly:

```typescript
interface STTProvider {
  initialize(config: { apiKey?: string; options?: Record<string, unknown> }): void;
  startListening(): void;
  stopListening(): Promise<string>;
  onTranscript(callback: (result: { text: string; confidence: number; isFinal: boolean }) => void): void;
}
```

The `apiKey` parameter is optional because the Web Speech API is browser-native and requires no API key. The interface supports future server-side STT providers that would need keys.

### Web Speech API Browser Compatibility

The Web Speech API is available as `SpeechRecognition` in standards-compliant browsers and `webkitSpeechRecognition` in Chrome. Since this demo targets Chrome only (MVP-NFR4), `webkitSpeechRecognition` is the primary reference. The provider should check for both.

When `isSupported()` returns false (non-Chrome browser, or feature disabled), the MicBar should auto-activate text mode and the "Prefer to type?" toggle should remain as the only input option. This degradation is handled by the hook consumer, not the provider itself.

### NFR2: Raw Transcript Never Shown

This is a critical design rule. The transcript returned by `stopRecording()` is:
1. Sent to the server via the SSE message endpoint (Story 3.5)
2. The server responds with an agent reflective summary
3. The FIRST text the interviewee sees after recording is the agent's reflective summary (left-aligned violet card)
4. The raw speech text appears ONLY as a right-aligned SpeechCard AFTER the reflective summary arrives (Story 3.5 handles this)

During recording, the interviewee sees ONLY the ActiveListeningState waveform animation — no interim text, no live transcription. The hook must NOT expose transcript text as observable state.

### MicBar Layout Reference (UX-DR5)

```
Idle:
┌──────────────────────────────────────────────┐
│  [red-bordered mic]  Tap to start  Prefer to type? │
└──────────────────────────────────────────────┘

Recording:
┌──────────────────────────────────────────────┐
│  [green mic + pulse]  Recording...  [Done]  Prefer to type? │
└──────────────────────────────────────────────┘

Processing:
┌──────────────────────────────────────────────┐
│  [disabled mic]  Processing...     Prefer to type? │
└──────────────────────────────────────────────┘

Text mode:
┌──────────────────────────────────────────────┐
│  [text input field.................] [Send] Back to voice │
└──────────────────────────────────────────────┘
```

Fixed to bottom of ConversationThread container. Max-width 800px, centered. Border-top 1px solid `--border`.

### ActiveListeningState Layout Reference (UX-DR6)

```
                    ┌─────────────────────────────┐
                    │  * I'm hearing you...        │
                    │  ┃┃┃┃┃┃┃┃ (waveform bars)   │
                    │  Words appear after Done      │
                    └─────────────────────────────┘
```

Right-aligned in conversation thread (where a SpeechCard will later appear). Background: success-soft. Border: 1.5px solid success. Radius 8px. The pulsing green dot is 6px. 8 waveform bars at 3px wide with heights animating between 8-28px.

### Service Boundaries — Enforced

- Web Speech API (`SpeechRecognition`, `webkitSpeechRecognition`) imported ONLY in `src/lib/stt/web-speech-provider.ts` — never in components, hooks, or route handlers
- The `useSpeechRecognition` hook imports `STTProvider` interface and `WebSpeechProvider` — components import only the hook
- MicBar and ActiveListeningState import from `@/lib/stt/use-speech-recognition` (or receive props) — never from `@/lib/stt/web-speech-provider` directly
- No interview data stored in localStorage/sessionStorage (NFR9) — transcript exists only in memory as a Promise value

### CSS Animation Specs

**Pulse-ring (MicBar Recording state):**
```css
@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
}
/* Applied to an absolutely-positioned ring element behind the mic button */
/* Duration: 1.5s, infinite, ease-out */
/* Color: var(--success) */
```

**Pulse-dot (ActiveListeningState green dot):**
```css
@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
/* Duration: 1.5s, infinite */
```

**Waveform bars (ActiveListeningState):**
```css
@keyframes waveform {
  0%, 100% {
    height: 8px;
  }
  50% {
    height: 28px;
  }
}
/* Duration: 0.8s, infinite, ease-in-out */
/* Each of 8 bars gets a staggered animation-delay: 0s, 0.1s, 0.2s, 0.3s, 0.4s, 0.5s, 0.6s, 0.7s */
```

### Mock Strategy for Tests

- `web-speech-provider.test.ts`: Mock `window.SpeechRecognition` / `window.webkitSpeechRecognition` — this is the adapter boundary, the ONE place we mock browser APIs
- `use-speech-recognition.test.ts`: Mock `STTProvider` interface — not `WebSpeechProvider` class, not browser APIs
- `mic-bar.test.tsx` and `active-listening-state.test.tsx`: Render with @testing-library/react, pass props directly — no STT mocking needed (these are pure presentational components receiving state via props)

### What NOT to Do

- Do NOT create the ConversationThread container (Story 3.5)
- Do NOT create the SpeechCard component (Story 3.5)
- Do NOT create SSE streaming logic (Story 3.5)
- Do NOT create the ReflectiveSummaryCard (Story 3.5)
- Do NOT handle microphone permission prompts — that is triggered by "Begin Interview" (Story 2.3) which calls `navigator.mediaDevices.getUserMedia()` or lets the Web Speech API trigger its own permission prompt
- Do NOT display raw transcript text in any component (NFR2)
- Do NOT implement silence detection or auto-start recording (FR11b, FR11c)
- Do NOT import Web Speech API outside `src/lib/stt/` directory
- Do NOT store transcript or interview data in localStorage/sessionStorage (NFR9)
- Do NOT add global state management — use local component state only

### Project Structure Notes

Files **created** by this story:
- `src/lib/stt/provider.ts` — STTProvider interface and STTTranscriptResult type
- `src/lib/stt/web-speech-provider.ts` — WebSpeechProvider implementation (Browser Web Speech API)
- `src/lib/stt/use-speech-recognition.ts` — Custom React hook wrapping the STT provider
- `src/components/interview/mic-bar.tsx` — MicBar client component (voice/text input controls)
- `src/components/interview/active-listening-state.tsx` — ActiveListeningState client component (waveform animation)

Files **modified** by this story:
- `src/app/globals.css` — Add `--success-soft` and `--destructive-soft` design tokens (light and dark mode)

Files **NOT modified** by this story:
- `src/lib/ai/` — No LLM interaction in this story
- `src/lib/db/` — No database interaction in this story
- `package.json` — No new dependencies (Web Speech API is browser-native, React/testing-library already installed)

### Dependencies

- **Depends on:** Story 1.1 (project initialization, globals.css, shadcn/ui Button), Story 2.3 (consent screen triggers mic permission — but MicBar can be built independently)
- **Depended on by:** Story 3.5 (ConversationThread integrates MicBar and ActiveListeningState, consumes `useSpeechRecognition` hook to connect voice input to SSE message flow)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4 — Acceptance criteria, FRs]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#MicBar — Component spec, states, anatomy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ActiveListeningState — Component spec, animation specs]
- [Source: _bmad-output/coding-standards.md#Section 1 — STTProvider interface contract]
- [Source: _bmad-output/planning-artifacts/prd.md#FR11a-e — Voice input requirements]
- [Source: _bmad-output/planning-artifacts/prd.md#FR14 — Pluggable STT provider interface]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR2 — Raw transcript never shown to interviewee]
- [Source: _bmad-output/project-context.md#Service Boundaries — Web Speech API only in src/lib/stt/]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — MicBar, ActiveListeningState component listing]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
