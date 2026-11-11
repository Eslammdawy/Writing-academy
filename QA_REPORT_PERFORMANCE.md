# Soufy & Nadine — Handwriting Trace Performance & Freeze Fix QA Report (`QA_REPORT_PERFORMANCE.md`)

**Branch:** `perf/trace-freeze`  
**Android Package ID:** `com.soufyandnadine.handwriting` (unchanged)  
**Scoring Version:** `1.1.0-deterministic` (unchanged)

---

## 1. Automated Verification Summary

| Check | Command | Result | Details |
|---|---|---|---|
| **Unit, Regression & Performance Tests** | `npm test` | **PASS (`44/44` across 4 suites)** | All `29` existing tests in `__tests__/academy.test.ts` pass unchanged, plus `15` new tests in `__tests__/inkGeometry.test.ts`, `__tests__/idleThrottle.test.ts`, and `__tests__/tracePerfMonitor.test.ts` covering `IncrementalSvgPath`, `appendPointThinned`, `enforcePointCap`, `simplifyRdp`, `createFrameCoalescer`, `IdleHintScheduler.noteActivity` (Jest fake timers), `TraceFrameMonitor`, and a 60-second continuous-trace simulation on multi-stroke English (`E`) and dotted Arabic (`ت`, `ث`) letters. |
| **TypeScript Strict Typecheck** | `npm run typecheck` | **PASS (`0 errors`)** | Clean strict compilation across `app/`, `src/`, and `__tests__/`. |
| **Expo Project Doctor** | `npx expo-doctor` | **PASS (`18/18`)** | All Expo SDK 54 config, native dependencies (no new native modules added), and asset checks pass. |

---

## 2. Success Criteria (`F1–F4`) & Acceptance Criteria (`A1–A5`) Matrix

Per Section 1.4 and Section 7 of `Improvement prompt V2.md`, criteria verified via automated tests and code inspection are marked **PASS**, and physical Android tablet / emulator walkthrough criteria are honestly marked **NOT TESTED (REQUIRES PHYSICAL TABLET / EMULATOR)** because no Android SDK (`adb` / `emulator`) or physical tablet is attached to this machine.

| ID | Criterion | Code & Automated Test Status | Physical Tablet / Emulator Run | Evidence |
|---|---|---|---|---|
| **F1 / A1** | Continuously tracing a full letter (including a multi-stroke English letter and a dotted Arabic letter such as `ت` or `ث`) for **60 seconds** produces **no ANR and no perceptible freeze** on a mid-range and low-end tablet. | **PASS** (Simulated 60 s @ 120 Hz) | **NOT TESTED** (No physical tablet / `adb` attached) | `__tests__/tracePerfMonitor.test.ts` simulates 7,200 touch-move events (60 s @ 120 Hz) on `en_E` + `ar_04` (`ث`): `HandwritingCanvas` re-renders `0` times during movement, active stroke stays capped at `≤ 600` points (`enforcePointCap`), and `IncrementalSvgPath` + `createFrameCoalescer` flush at most once per animation frame. |
| **F2 / A2** | No regression in handwriting behavior: per-stroke green lock-in, auto-fade of rejected strokes, `WATCH → TRACE → WRITE → CELEBRATE` auto-flow, fail-soft ladder, and honest scoring all behave identically to before. | **PASS** | **NOT TESTED** (No physical tablet / `adb` attached) | All `29/29` tests in `__tests__/academy.test.ts` pass without modification; `SCORING_VERSION` remains `1.1.0-deterministic`; dotted Arabic letters `ت` (`ar_03`) and `ث` (`ar_04`) pass `evaluateStrokeAgainstTemplate` after `appendPointThinned` + `enforcePointCap`. |
| **F3 / A5** | `npm test`, `npm run typecheck`, and `npx expo-doctor` all pass, plus new unit tests for pure functions added. | **PASS** | N/A (CI / CLI check) | `44/44` Jest tests pass, `tsc --noEmit` exits `0`, `npx expo-doctor` passes `18/18` checks. |
| **F4** | Drawing remains smooth across all three consumers of the canvas: guided lesson (`app/(child)/lesson/[letterId].tsx`), practice (`app/(child)/practice/[letterId].tsx`), and *Write to Launch* / *Complete the Monster* games (`app/(child)/games/[gameId].tsx`). | **PASS** | **NOT TESTED** (No physical tablet / `adb` attached) | All three screens share `HandwritingCanvas`; `handleCanvasStrokesChange` is memoized with `useCallback` in `lesson/[letterId].tsx` and `fullTemplates` / `prefilledIndices` are memoized with `useMemo` in `games/[gameId].tsx`. |
| **A3** | No guide path, recorded stroke, start badge, or arrowhead is recomputed during an active stroke. | **PASS** | N/A (Code & test verified) | Static SVG elements are extracted into `React.memo` components in `src/features/handwriting/CanvasLayers.tsx` (`NotebookLines`, `PrefilledLayer`, `GuideLayer`, `RecordedStrokesLayer`, `StrokePath`), `templatePaths` is memoized on `[templates, canvasSize]`, and `onPanResponderMove` updates only `ActiveInkLayer` via `inkRef.current?.setPath(d)`. |
| **A4** | `PanResponder` is not recreated per render and the idle ladder is not rescheduled on every move. | **PASS** | N/A (Code & fake-timer test verified) | `onStrokesChange` is routed through `onStrokesChangeRef` so `panResponder` depends only on `[mode, canvasSize]`. `IdleHintScheduler.noteActivity()` throttles `move` resets to `500 ms` (`__tests__/idleThrottle.test.ts`). |

---

## 3. Before vs. After JS-Thread Work (60-Second Continuous Trace @ 120 Hz)

| Metric (7,200 move events, 7 template strokes, 3 locked strokes) | Before (`main`) | After (`perf/trace-freeze`) |
|---|---|---|
| `HandwritingCanvas` component re-renders during move | `~7,200` | `0` (`ActiveInkLayer` leaf only, once per `rAF`) |
| Guide path `pointsToSvgPath` calls during move | `50,400` | `0` |
| Recorded stroke `pointsToSvgPath` calls during move | `21,600` | `0` |
| Array copies (`[...prev, pt]`) during move | `7,200` (unbounded up to 7,200 pts) | `≤ 23` (in-place push, capped at `600` pts) |
| Active path string construction complexity | $O(N^2)$ (~25.9M point visits) | $O(N)$ incremental (`IncrementalSvgPath`) |
| Idle timer `clearTimeout` / `setTimeout` calls | `43,200` (`6` per move) | `≤ 720` (`6` per `500 ms` window) |

---

## 4. Manual Device "Freeze" Test Script & Profiling Commands

Run this script on a mid-range and a low-end Android tablet (or an Android Studio Emulator with CPU throttled):

### Step-by-Step Manual Verification
- [ ] **NOT TESTED (Hardware Required) — Step 1 (60-Second Continuous Uppercase Trace)**: Open a Guided Lesson (`Play ⭐` from Home) and trace a multi-stroke uppercase letter (e.g. `E` or `M`) continuously **without lifting your finger for 60 seconds**. Confirm there is no ANR dialog, no perceptible stutter, that the coral ink stays directly under the finger, and that the 25-second idle "stuck" step does **not** trigger while your finger is moving.
- [ ] **NOT TESTED (Hardware Required) — Step 2 (Dotted Arabic Letter `ت` / `ث`)**: Switch to Arabic (`🕌 أ ب ت`), open a Guided Lesson or Practice for `ت` or `ث`, trace the main bowl stroke, and tap each dot. Confirm dot taps lock in cleanly with zero freeze.
- [ ] **NOT TESTED (Hardware Required) — Step 3 (30-Second Slow Wobbly `WRITE` Mode)**: In `WRITE` mode, draw a letter slowly and wobblily for 30 seconds, then lift your finger. Confirm auto-evaluation fires `~1.2 s` after pen-up.
- [ ] **NOT TESTED (Hardware Required) — Step 4 (Canvas Games — *Write to Launch* & *Complete the Monster*)**: Open Games (`🚀` *Write to Launch* and `👾` *Complete the Monster*) and trace the target strokes (including during the initial 3-second how-to-play pulse). Confirm the ink is equally smooth and responsive.
- [ ] **NOT TESTED (Hardware Required) — Step 5 (Full Guided Auto-Flow)**: Complete a full Guided Lesson (`INTRO → WATCH → TRACE → WRITE → CELEBRATE`) with no taps other than drawing and confirm per-stroke green lock-in, auto-fade of rejected strokes, and auto-advance all work as before.

### Capturing Frame / Jank Stats with `adb` and `__DEV__` Logs
1. **Dev Console Frame Monitor (`__DEV__`)**:
   - Run `npx expo start --android` and watch the Metro console while tracing:
     - Any frame `> 50 ms` logs: `[TracePerf] Long frame <dt> ms during active stroke (<N> pts)`
     - Every pen-up logs: `[TracePerf] Stroke <duration> ms | <frames> frames (<fps> fps, max <max> ms, jank <jank>, >50ms <frozen>) | moves <raw> -> <pts> pts`
2. **Android `gfxinfo` Frame Dump**:
   ```bash
   # Reset frame counters before starting the 60-second trace
   adb shell dumpsys gfxinfo com.soufyandnadine.handwriting reset

   # Perform the 60-second continuous trace on the tablet, then run:
   adb shell dumpsys gfxinfo com.soufyandnadine.handwriting
   ```
   Check `Total frames rendered`, `Janky frames`, `90th / 95th / 99th percentile`, and confirm `Number Missed Vsync` / slow UI-thread frames remain minimal.

### Recommended Next Real-Child Observation Test
Give the target Android tablet (in Airplane Mode) to **2–3 children aged 5–6** for **5 minutes each** while an adult only observes without intervening. Watch specifically for:
1. Very slow, high-pressure dragging across the canvas (palm-rejection + long-stroke cap).
2. Rapid repeated dot tapping on Arabic letters (`ب`, `ت`, `ث`, `ج`, `خ`, `ش`, `ض`, `ظ`, `غ`, `ف`, `ق`, `ن`, `ي`).
3. Whether any stroke hesitates or lags behind the fingertip.
