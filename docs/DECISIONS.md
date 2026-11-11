# Soufy & Nadine — Product & Engineering Decisions (`DECISIONS.md`)

This document records the product and engineering decisions resolved during the independent-child-mode alignment (`/grill-me`) and implementation of `Improvement prompt.md` ("Let a Child Use 'Soufy & Nadine' Without a Parent").

---

## 1. Entry Flow, Adventure Trail & "Play ⭐" Button (`S1`, `WP2`, `WP6`)
- **Decision**: Embed **Today's Adventure** star trail directly on `app/(child)/home.tsx` and make the giant `Play ⭐` button immediately launch the first uncompleted step (`/(child)/lesson/[letterId]?nextHref=...`).
- **Rationale**:
  - Launching `app/index.tsx` pre-highlights the active child's avatar tile and speaks `welcome.chooseAvatar`.
  - Tap 1 on the avatar tile opens Home (`/(child)/home`).
  - Tap 2 on the giant `Play ⭐` button opens the first Guided Lesson (`/(child)/lesson/[letterId]`), which automatically transitions from `INTRO` to `WATCH` to `TRACE` without any extra taps (`2` taps total, well under the `≤ 3 taps` and `≤ 15 seconds` target of **S1**).

## 2. English vs. Arabic Guided Lesson Form Progression (`S2`, `WP3`)
- **Decision**:
  - **English (`en_A`–`en_Z`)**: Two consecutive mini-rounds inside a single Guided Lesson:
    `INTRO → [Uppercase: WATCH → TRACE → WRITE] → [Lowercase: WATCH → TRACE → WRITE] → CELEBRATE → DONE`.
  - **Arabic (`ar_01`–`ar_28`)**: Single guided round in `isolated` form:
    `INTRO → [Isolated: WATCH → TRACE → WRITE] → CELEBRATE → DONE`.
    Positional forms (`initial`, `medial`, `final`) and Harakat remain accessible in `app/(child)/letter/[letterId].tsx` and `app/(child)/practice/[letterId].tsx` for Explore Mode / older learners.
- **Rationale**: Keeps the Guided Lesson screen completely free of form-selector chips (`Capital / Small` or `Isolated / Initial / Medial / Final`) so a 5-year-old never has to read or choose a form tab, while still practicing both English cases in every English lesson.

## 3. Bilingual Access in Guided Mode (`WP2`, `WP9`)
- **Decision**:
  - Default Today's Adventure to `activeChild.preferredLanguage` (`en` for Soufy, `ar` for Nadine).
  - Include a simple, large visual world switch (`🔤 A B C` / `🕌 أ ب ت`, `>= 72 dp`) above the star trail on Home so the child can switch between English and Arabic adventures at any time without entering Parent Settings.
  - All child-facing screens (`home`, `profiles`, `alphabet`, `lesson`, `games`, `words`, `rewards`, `progress`) render headers and prompts in a single language (`activeChild.preferredLanguage` or the active lesson's language) rather than dual-language `"English • العربية"` strings.

## 4. Per-Stroke Trace & Auto-Evaluated Write (`S2`, `WP3`)
- **Decision**:
  - In `TRACE` mode (`perStrokeTrace = true`), `HandwritingCanvas` evaluates each stroke immediately on finger-up (`onPanResponderRelease`) against `templates[activeStrokeIdx]` using `evaluateStrokeAgainstTemplate`.
  - Only the current stroke (`activeStrokeIdx`) is highlighted with a pulsing `r = 28` start star badge (`★`); completed strokes lock in bright green; upcoming strokes remain dim (`opacity = 0.22`).
  - If a traced stroke fails coverage or direction, it shakes, fades out automatically after ~500 ms, and speaks `lesson.stroke.retry` — no "Undo" or "Clear" tap is required.
  - In `WRITE` mode, the canvas auto-evaluates ~1.2 seconds after the child lifts their finger on the final expected stroke (`onAutoEvaluateWrite`), while also providing a large green `✓` (`>= 76 dp`) icon button for immediate manual completion.

## 5. Idle Help Ladder & Fail-Soft Ladder (`S4`, `WP4`)
- **Decision**:
  - **Idle Help Ladder (`useIdleHint.ts`)**:
    1. `6 s` of inactivity in `TRACE` or `WRITE`: pulses the start star badge (`★`) to `1.4x` and speaks `lesson.idle`.
    2. `12 s` of inactivity: replays a mini animated stroke demonstration on the active stroke in-place (`demoStrokeRequest`).
    3. `25 s` of inactivity: dispatches `IDLE_STUCK` to escalate through the fail-soft ladder.
  - **Fail-Soft Ladder (`lessonMachine.ts`)**:
    1. After **2 consecutive failed attempts** on the same letter form: automatically transitions back to `WATCH` at slower speed (`slowWatch = true`, `1.35x` duration) and enables `WIDE_ASSISTED_THRESHOLDS` for the next attempt.
    2. After **3 consecutive failed attempts**: transitions to `GENTLE_SKIP`, awards **1 effort star**, speaks `lesson.gentleSkip`, records `needsHelp = true` and `consecutiveFails = 3` in SQLite (`learning_progress`), and advances to the next step so the child is never trapped.

## 6. Voice-First Narration & Recorded Audio Hook (`S3`, `WP1`)
- **Decision**:
  - Centralized all child-facing voice lines in `src/data/narration.ts` with natural, gender-neutral Arabic phrasing (`نبدأ`, `نتبع`, `نكتب`, `أحسنت!`) that works for both Soufy and Nadine.
  - Built `VoiceNarrator` (`src/services/audio/narrator.ts`) with a sequential FIFO queue that calls `Speech.stop()` before speaking, preventing overlapping speech.
  - Added a pluggable `registerRecordedClips()` map so bundled `.wav`/`.mp3` voiceovers automatically take precedence over TTS whenever present, falling back to `expo-speech` offline TTS (`en-US` / `ar-SA`).
  - Added startup and Parent Settings voice health checks (`Speech.getAvailableVoicesAsync()`) with a warning banner and "Test English / Arabic Voice" buttons.

## 7. Honest Scoring in Games & Word Builder (`S6`, `WP5`, Fixes `P12`)
- **Decision**:
  - Extracted pure scoring helpers in `src/features/games/gameScoring.ts` (`evaluateGameCanvasRound`, `computeChoiceRoundScore`, `aggregateGameOutcome`, `computeWordBuilderOutcome`).
  - *Write to Launch* (`write_to_launch`) and *Complete the Monster* (`complete_monster`) now evaluate the child's actual strokes against the letter template (with `complete_monster` specifically checking the final stroke). Random scribbles fail and trigger a friendly hint + retry instead of launching the rocket or completing the monster.
  - Canvas games auto-evaluate ~1.1 s after pen-up and chain back into Today's Adventure (`/(child)/home?done=1`) when launched from a mission.
  - Stored `score`, `starsEarned`, and `durationSeconds` in both `games/[gameId].tsx` and `words/[language].tsx` are computed from real round accuracy, wrong-tap counts, and elapsed wall-clock time (`Date.now() - startTime`).

## 8. Parent Gate Hardening & Forward-Only Schema v2 (`S5`, `WP7`, `WP8`)
- **Decision**:
  - Removed the printed default PIN (`1234`) from `app/(parent)/pin.tsx`.
  - First-time parent visits (`!pinHintShown && pinHash === DEFAULT_PARENT_PIN_HASH`) run a two-step **"Create Your 4-Digit Parent PIN"** flow (enter twice to confirm). Existing installs that already used `1234` retain `1234` compatibility and display a warning banner on `app/(parent)/dashboard.tsx`.
  - Replaced the fixed `(17 × 3) + 9 = 60` recovery question with `generateAdultMathChallenge()` (`(A × B) + C` with randomized operands on each attempt).
  - Protected the `🔒` icon on `app/index.tsx` and `app/(child)/home.tsx` behind a `~2 s` press-and-hold (`delayLongPress={1800}`) and intercepted Android hardware `BackHandler` on Welcome and Home so a child cannot accidentally exit the app.
  - Upgraded SQLite schema to `SCHEMA_VERSION = 2` via `runForwardMigrations()` (`ALTER TABLE` statements recorded in `schema_migrations`), preserving all existing child profiles, stars, achievements, and progress.

---

## 9. Trace Freeze Fix — Performance & Rendering Architecture (`Improvement prompt V2.md`)

These decisions were aligned during the `/grill-me` interview for `Improvement prompt V2.md` ("Fix the Freeze When a Child Traces a Letter"):

### 9.1 Isolated `rAF`-Coalesced `ActiveInkLayer` vs. `setNativeProps` on Fabric (`P0.1`, `P0.2`, `P1.4`)
- **Decision**: Render the in-progress stroke inside a dedicated, permanently-mounted, `React.memo`-wrapped `<ActiveInkLayer ref={inkRef} />` (`d=""` when idle) updated via `useImperativeHandle` (`inkRef.current?.setPath(d)`) at most once per `requestAnimationFrame` (`createFrameCoalescer`), using an incremental quadratic-Bezier path builder (`IncrementalSvgPath`).
- **Rationale**:
  - `app.json` has `"newArchEnabled": true` (React Native Fabric). Under Fabric, `setNativeProps({ d })` on `react-native-svg` `<Path>` elements is unreliable and cannot be smoke-tested on this build machine without an attached Android device (`adb`).
  - Moving the `d` state into `ActiveInkLayer` (which renders a single `<Path>` leaf) guarantees 100% Fabric compatibility while preventing `HandwritingCanvas` and all sibling SVG layers from re-rendering on touch-move.
  - `IncrementalSvgPath` caches previously emitted `Q` segments and only appends newly added points each frame, reducing per-frame string work from $O(N)$ (and $O(N^2)$ per stroke) to $O(\Delta N)$.

### 9.2 Memoized Static & Demo SVG Sub-Layers (`P0.4`, `P1.3`)
- **Decision**: Split `HandwritingCanvas` SVG children into `React.memo` components in `src/features/handwriting/CanvasLayers.tsx`:
  - `NotebookLines`, `PrefilledLayer`, `GuideLayer`, `RecordedStrokesLayer`, `StrokePath`, `WatchLayer`, `InlineDemoLayer`, and `ActiveInkLayer`.
  - Precompute and memoize `templatePaths` (`useMemo` keyed on `[templates, canvasSize]`).
  - Move `WATCH` mode (`WatchLayer`) and single-stroke demo (`InlineDemoLayer`) tick states inside their own components so animation ticks only re-render the active demo layer.

### 9.3 Point Cap by Decimation & Display-Only RDP Simplification (`P0.3`)
- **Decision**:
  - Keep `MIN_POINT_DISTANCE = 0.008` in `appendPointThinned` (mutating `activePointsRef.current` in place instead of `[...prev, pt]` on every move).
  - Cap in-progress strokes at `MAX_STROKE_POINTS = 600` via `enforcePointCap`, which decimates (drops every other point while preserving the first and last point) so new finger movement continues to be captured even during a 60-second unbroken trace.
  - Apply Ramer–Douglas–Peucker (`simplifyRdp` with `DISPLAY_SIMPLIFY_EPSILON = 0.0015`) **only** when rendering already-committed `StrokePath` layers, leaving the points passed to `evaluateStrokeAgainstTemplate` / `evaluateHandwritingAttempt` untouched so `SCORING_VERSION` (`1.1.0-deterministic`) and all existing scoring behavior remain 100% unchanged.

### 9.4 Stable `PanResponder` & Throttled Idle-Ladder Resets (`P1.1`, `P1.2`)
- **Decision**:
  - Route `onStrokesChange` through `onStrokesChangeRef` inside `HandwritingCanvas` so `PanResponder` depends only on `[mode, canvasSize]`, and wrap `handleCanvasStrokesChange` in `useCallback` in `app/(child)/lesson/[letterId].tsx` and `fullTemplates` in `useMemo` in `app/(child)/games/[gameId].tsx`.
  - Pass `TouchActivityKind` (`'grant' | 'move' | 'release'`) to `onTouchActivity`. In `useIdleHint.ts`, `'move'` calls `scheduler.noteActivity()` which throttles `clearTimeout`/`setTimeout` resets to at most once every `ACTIVITY_RESET_THROTTLE_MS = 500` ms, while `'grant'`, `'release'`, and button taps call `resetActivity()` immediately. `setPulseStartBadge(false)` is guarded by `pulseRef` so it never fires redundant state updates when the badge is not pulsing.
  - Ensures a child drawing one continuous slow stroke for 60 seconds never triggers the 25-second `IDLE_STUCK` penalty mid-stroke while cutting timer churn by >98%.

### 9.5 Dev-Only Frame Monitor & Before/After Benchmark (`P2.1`)
- **Decision**: Added `TraceFrameMonitor` (`src/features/handwriting/traceFrameMonitor.ts`), instantiated only when `__DEV__` is truthy (`createDevTraceFrameMonitor()`), which monitors `requestAnimationFrame` deltas during active strokes and logs frames `> 50 ms` plus a one-line per-stroke FPS/jank summary. Compiled out (`null`) in production builds.
- **Measured Before vs. After (60-Second Continuous Trace at 120 Hz = 7,200 Move Events, 7 Template Strokes + 3 Locked Strokes)**:

| Metric during 60 s continuous stroke | Before (`main`) | After (`perf/trace-freeze`) |
|---|---|---|
| Full `HandwritingCanvas` React re-renders | `~7,200` (every move) | `2` (`onPanResponderGrant` + `onPanResponderRelease`) |
| Guide path `pointsToSvgPath` recomputations | `50,400` (`7 × 7,200`) | `0` during move (memoized once on mount) |
| Locked stroke `pointsToSvgPath` recomputations | `21,600` (`3 × 7,200`) | `0` during move |
| Active point array allocations (`[...prev, pt]`) | `7,200` (growing to 7,200 pts) | `≤ 23` (in-place push + decimation at 600-pt cap) |
| Active path complexity across stroke | $O(N^2)$ (~25.9M point visits) | $O(N)$ incremental (`≤ 3,600` rAF flushes, bounded at 600 pts) |
| Idle-ladder `clearTimeout` + `setTimeout` calls | `43,200` (`6 × 7,200`) | `≤ 720` (`6 × 120`, throttled to 500 ms) |
| Physical tablet `dumpsys gfxinfo` | **NOT TESTED** (no `adb`/tablet attached) | **NOT TESTED** (manual script in `QA_REPORT_PERFORMANCE.md`) |

