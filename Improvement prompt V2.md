# Improvement Prompt — Fix the Freeze When a Child Traces a Letter

Feed this whole file to the coding agent.

**Repo:** `Eslammdawy/Writing-academy` (Expo SDK 54, React Native 0.81, expo-router 6, TypeScript strict, `react-native-svg` 15.12, Reanimated 4, `react-native-gesture-handler` already installed).

**The bug to fix:** a user reports that the app **freezes** when a child traces a letter to learn how to write. The goal of this task is to make tracing smooth and responsive on a mid-range and low-end Android tablet, with no observable hang, while keeping every existing behavior (per-stroke lock-in, auto-clear, fail-soft ladder, honest scoring, offline) exactly intact.

**Do not** change the Android package ID `com.soufyandnadine.handwriting`, and do not regress the existing automated tests.

---

## 1. Your role and working method

You are a senior React Native performance engineer.

1. Read the files listed in section 3 before changing anything.
2. Post a short plan (from section 4, in P0 → P1 → P2 order), then implement **one step at a time**. After each step run `npm test` and `npm run typecheck`, fix failures, and commit with a clear message.
3. Ask a question only if you are truly blocked. For everything else, pick the default stated in this file and record the decision in `docs/DECISIONS.md`.
4. At the end, produce a PASS / FAIL / NOT TESTED table in the same style as `QA_REPORT.md`. Never mark something PASS that you did not run. If you cannot test on a tablet or emulator, say NOT TESTED.

---

## 2. Goal and measurable success

The target user is a **5–6-year-old** drawing slowly and wobblily on an Android tablet, offline, with no adult nearby. A "freeze" means the whole app becomes unresponsive for a moment (or permanently) while the child is mid-stroke.

| # | Success criterion |
|---|---|
| F1 | Continuously tracing a full letter (including a multi-stroke letter and a dotted Arabic letter such as `ت` or `ث`) for **60 seconds** produces **no ANR and no perceptible freeze** on a mid-range and a low-end tablet. |
| F2 | No regression in handwriting behavior: per-stroke green lock-in, auto-fade of rejected strokes, `WATCH → TRACE → WRITE → CELEBRATE` auto-flow, and honest scoring all still work. |
| F3 | All existing tests pass (`npm test`, `npm run typecheck`, `npx expo-doctor`), plus new tests for any pure functions you add. |
| F4 | Drawing remains smooth across all three consumers of the canvas: guided lesson (`app/(child)/lesson/[letterId].tsx`), practice (`app/(child)/practice/[letterId].tsx`), and the *Write to Launch* / *Complete the Monster* games (`app/(child)/games/[gameId].tsx`). |

---

## 3. What I found in the code (evidence, not guesses)

The freeze is a **JS-thread rendering problem**, not a business-logic bug. The handwriting canvas re-renders the *entire* SVG tree and recomputes every path string on **every single touch-move event**.

### 3.1 Primary cause — full SVG re-render on every move event

File: `src/features/handwriting/HandwritingCanvas.tsx`

- `onPanResponderMove` (around line 387) appends a point and calls `setActivePoints(next)` on **every move event** (line 407). Only points closer than `0.008` normalized units are dropped (line 402–403), so nearly every move fires a React state update.
- That state update re-renders the whole component, and during render `pointsToSvgPath(...)` is recomputed **from scratch** for:
  - every guide path: soft background + dotted overlay (lines 534–624),
  - every child stroke already drawn (lines 715–730),
  - the rejected stroke (lines 733–742),
  - the active stroke (lines 745–754), which grows every frame.
- Each of those is a `Path` inside `react-native-svg`, so every re-render also re-serializes the full SVG tree over the React Native bridge to the native renderer.
- Because the active point array grows unbounded during a long stroke, the per-frame cost is **O(points)**, and the total cost of one stroke is **O(points²)** — plus the constant re-serialization of the guide paths on top. On a cheap tablet (the usual children's device) the JS thread falls behind the touch stream and the app **freezes / ANRs**.

### 3.2 Secondary causes (amplify the jank, worth fixing in the same pass)

1. **No memoization of static SVG work.** The guide paths, grid lines, start badges, and arrowheads never change while the child draws, but they are rebuilt every frame. There is no `React.memo` on sub-layers and no `useMemo` on the path strings.
2. **Unstable `PanResponder` dependency.** The `PanResponder` is built in a `useMemo` with deps `[mode, canvasSize, onStrokesChange]` (line 419). In the guided lesson, `onStrokesChange` is an **inline arrow** (`app/(child)/lesson/[letterId].tsx` lines 409–413), so it is a new function every parent render, which recreates the `PanResponder` mid-lesson. (The other callbacks are already routed through refs — `onTraceStrokeResultRef`, `onTouchActivityRef` — so do the same for `onStrokesChange`.)
3. **Idle-timer churn on every move.** `onTouchActivity` → `registerActivity()` (in `src/features/lesson/useIdleHint.ts`) is called on every move (HandwritingCanvas lines 374, 392, 411). `registerActivity` calls `resetActivity()`, which clears and re-schedules **3 timers** on every move event (`useIdleHint.ts` lines 34–38 and 60–75). During a long stroke that is thousands of needless `clearTimeout`/`setTimeout` operations on the JS thread.
4. **WATCH animation also re-renders the whole canvas per tick** (lines 181–212: a 55 ms `setInterval` that calls `setWatchPointCount` / `setWatchStrokeIndex`). This does not cause the trace freeze, but it is the same anti-pattern and should be fixed the same way.

### 3.3 Not the cause (do not "fix" these)

- The scoring functions in `src/services/scoring/handwritingEvaluator.ts` are synchronous but bounded (letters have few strokes, each with ~20–40 template points). They run on finger-up only, not per move. Do not rewrite them unless required by step P2.5.
- `src/hooks/useTabletLayout.ts` returns a stable `canvasSize`; it is not causing re-render churn.
- The canvas screens already use `scroll={false}` (`ScreenContainer`), so gesture-stealing by a ScrollView is not the reported freeze.

---

## 4. Fix plan (implement in this order)

### P0 — Make the active stroke render without a full React re-render (fixes the freeze)

Goal: the ink follows the finger smoothly; the rest of the canvas stays still.

1. **Stop storing the in-progress stroke in React state.** Keep the growing points in a ref (it already has `activePointsRef`). Drive the on-screen ink imperatively instead of via `setActivePoints` + re-render.
   - Preferred, no new native dependency: give the active `<Path>` a `ref` and update only its `d` attribute via `setNativeProps({ d: ... })` inside `onPanResponderMove` (react-native-svg elements support `setNativeProps`). Keep `setActivePoints` only for the final `onPanResponderRelease` so the completed stroke is committed.
   - Alternative that also works: keep a single lightweight state flag that only changes once per animation frame (see P0.2) and never grow the array in state.
2. **Coalesce move events with `requestAnimationFrame`.** Accumulate raw points in a ref as they arrive; in a single `requestAnimationFrame` tick, thin them and push the incremental `d` to the active path once. This caps work at one update per frame regardless of how fast the OS delivers events.
3. **Bound the point count.** Keep the existing distance-based thinning, add a **hard cap** (e.g. ~600 points per stroke), and optionally run a light polyline simplification (Ramer–Douglas–Peucker) on pen-up before the stroke is committed to `recordedStrokes`. If thinning changes what gets evaluated, verify existing scoring tests still pass and, if needed, bump `SCORING_VERSION` and note it.
4. **Memoize everything that does not change while drawing.** Move the guide paths, grid lines, start badge, arrowheads, and already-completed strokes into `React.memo`-wrapped child components (or `useMemo` the path strings) keyed on the values that actually change them (`templates`, `canvasSize`, `mode`, `nextExpectedStrokeIdx`, `pulseStartBadge`, `recordedStrokes`). After this change, a re-render of the ink layer must not recompute any guide or recorded-stroke path.

**Definition of done for P0:** during an active stroke, only the ink path's `d` changes; no guide path, recorded stroke, or badge is recomputed per move; the array of active points is no longer copied via `[...prev, pt]` on every move.

**Immediately after wiring the imperative path, smoke-test it on a device/emulator: draw one stroke and confirm the ink visibly renders. If setNativeProps silently does nothing on Fabric, switch to the rAF-coalesced state alternative without further debugging — timebox the imperative path to 30 minutes.

### P1 — Remove secondary JS-thread waste

1. **Stabilize the `PanResponder`.** Store `onStrokesChange` in a ref (like `onTraceStrokeResultRef`) and drop it from the `useMemo` deps, so the responder is created once per `(mode, canvasSize)`. Also memoize the guided-lesson callback in `app/(child)/lesson/[letterId].tsx` with `useCallback` so its identity is stable.
2. **Debounce idle-activity registration.** Change `registerActivity()` in `src/features/lesson/useIdleHint.ts` so it does not `clearTimeout`/`setTimeout` on every move. Only reset the idle ladder at most once every ~500 ms (or only on touch grant/release). Add a unit test with Jest fake timers proving the timers are not rescheduled on every move.
3. **Apply the same imperative/memoized rendering to the WATCH and in-place demo animations** (HandwritingCanvas lines 181–242). Replace the per-tick full re-render with a ref + `setNativeProps` on the demo path, or at minimum memoize the guide layers so each tick is cheap.
4. **Keep the ink <Path> permanently mounted with d="" when idle, so the ref is never null and there is no mount/frame race at touch-grant.

### P2 — Verification hardening

1. Add a manual test script and, if you can, a lightweight instrumentation hook to log dropped frames or JS-thread busy time during tracing (only in dev; never ship ad/tracking code).
2. On a physical low-end tablet (or emulator with throttled CPU), run the continuous-trace test from section 5.
3. Fix any remaining jank found; keep the fix scoped to rendering and input coalescing, not scoring.

---

## 5. What NOT to do

- Do **not** just wrap `HandwritingCanvas` in `React.memo` — the state that changes is internal (`activePoints`), so memoization of the component alone will not fix the per-move re-render.
- Do **not** move handwriting evaluation to a web worker; it is not the bottleneck and RN worker support adds complexity for no gain here.
- Do **not** reduce template point counts or raise thinning thresholds so aggressively that scoring degrades, unless you re-run the scoring tests and re-calibrate (and bump `SCORING_VERSION`).
- Do **not** add `@shopify/react-native-skia` without explicit permission. It is the eventual "best" canvas, but it is a **new native dependency** and requires a **new EAS build and a higher `versionCode`**. If you believe Skia is necessary, say so and stop — do not silently add it. The P0 plan above must be achievable with the already-installed `react-native-svg`.

---

## 6. Acceptance criteria

| # | Criterion | Evidence |
|---|---|---|
| A1 | Continuous trace of a multi-stroke English letter and a dotted Arabic letter for 60 s produces no ANR / no freeze on a mid-range and a low-end tablet. | Manual device/emulator run + any FPS/jank measurement you add. |
| A2 | Per-stroke green lock-in, auto-fade rejection, auto-advance, fail-soft ladder, and honest scoring behave identically to before. | Existing `__tests__` pass unchanged (or only with additive tests). |
| A3 | No guide path, recorded stroke, start badge, or arrowhead is recomputed during an active stroke. | Code review + the memoization/ref changes you committed. |
| A4 | `PanResponder` is not recreated per render and the idle ladder is not rescheduled on every move. | Code review + a fake-timer unit test. |
| A5 | `npm test`, `npm run typecheck`, `npx expo-doctor` all pass. | CI-style output. |

---

## 7. Testing and verification

**Automated (run in order):** `npm test`, `npm run typecheck`, `npx expo-doctor`. Add tests for: point thinning/simplification (pure function), rAF coalescing (if extracted as a testable function), and the idle-ladder debounce (Jest fake timers).

**Manual "freeze" script (on a real tablet/emulator if available; otherwise mark NOT TESTED):**

1. Open a guided lesson and trace a full uppercase letter continuously (do not lift) for 60 s — confirm no hang and the ink stays under the finger.
2. Trace a dotted Arabic letter (`ت` or `ث`) including each dot — confirm no freeze on the dot taps.
3. In `WRITE` mode, draw the letter slowly and wobblily for 30 s, then let go — confirm auto-evaluation still fires ~1.2 s later.
4. Repeat a quick trace in *Write to Launch* and *Complete the Monster* games — confirm the canvas is equally smooth.
5. Use Android Studio Profiler or `adb shell dumpsys gfxinfo <package>` to capture dropped-frame / jank stats before and after; report the numbers.
6. Confirm the full guided flow still auto-advances `INTRO → WATCH → TRACE → WRITE → CELEBRATE` with no taps other than drawing.

**Human test (recommended, outside the agent's reach):** let 2–3 children aged 5–6 trace letters for 5 minutes each on the actual target tablet while an adult only observes, and record any moment the app stutters or stops responding.

---

## 8. Decisions to make yourself (document, don't block)

| Question | Default |
|---|---|
| Imperative `setNativeProps` vs. rAF-throttled state for the ink path? | Use `setNativeProps` for the active `Path`; keep state only for committing the finished stroke. |
| Hard cap on points per stroke? | 600 points; apply RDP simplification on pen-up before evaluation. |
| Skia migration now? | No. Ship the `react-native-svg` fix first; propose Skia as a separate follow-up only if profiling still shows jank. |
| Idle-ladder activity debounce window? | 500 ms between resets (or reset only on touch grant/release). |
| Keep scoring thresholds unchanged? | Yes, unless point thinning demonstrably changes results; then bump `SCORING_VERSION` and document it. |

---

## 9. Final deliverables

1. Working code on a feature branch, one commit per step (P0 → P1 → P2).
2. `docs/DECISIONS.md` updated with the decisions above and any new ones (including the before/after profiling numbers if available).
3. Updated `QA_REPORT.md` (or a new `QA_REPORT_PERFORMANCE.md`) with the PASS / FAIL / NOT TESTED table against F1–F4 and A1–A5.
4. A short summary: what changed, what was measured, and the recommended next real-child test.
