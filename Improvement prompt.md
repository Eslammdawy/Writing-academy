# Improvement Prompt — Let a Child Use "Soufy & Nadine" Without a Parent

Feed this whole file to the coding agent.
Repo: `Eslammdawy/Writing-academy` (Expo SDK 54, React Native 0.81, expo-router 6, TypeScript strict, expo-sqlite, react-native-svg, Reanimated 4 already installed).
Do **not** change the Android package ID `com.soufyandnadine.handwriting`.

---

## 1. Your role and working method

You are a senior React Native / child-UX engineer. Real users reported: **"a child alone can't easily use the app; a parent must sit with them to complete the tasks."** Your job is to remove that dependency.

1. Read the files listed in section 3 before changing anything.
2. Post a short plan (phases from section 7), then implement **one phase at a time**. After each phase run `npm test` and `npm run typecheck`, fix failures, and commit with a clear message.
3. Ask a question only if you are truly blocked. For everything else, pick the default stated in this file, and record the decision in `docs/DECISIONS.md`.
4. At the end, produce a PASS / FAIL / NOT TESTED table in the same style as `QA_REPORT.md`. Never mark something PASS that you did not run. If you cannot test on a tablet or emulator, say NOT TESTED.

## 2. Goal and measurable success

The target user is a **5–6-year-old who cannot yet read instructions**, on an Android tablet, offline, with no adult nearby.

| # | Success criterion |
|---|---|
| S1 | From app launch to the first pen stroke: **≤ 3 taps and ≤ 15 seconds**. |
| S2 | A guided letter lesson (intro → watch → trace → write → celebrate) needs **zero button taps other than drawing**. Transitions happen automatically. |
| S3 | **No screen in guided mode requires reading.** Every instruction is spoken and shown visually (animation, highlight, icon). |
| S4 | **No dead ends.** If the child does nothing, gets stuck, or fails repeatedly, the app helps or moves on by itself within 15 seconds. |
| S5 | **No way for the child to damage anything**: no destructive buttons, no accidental profile/avatar edits, no easy entry into the parent area. |
| S6 | Parents still get honest data: scores and stars reflect what the child actually did. |

## 3. What I found in the code (evidence, not guesses)

I read the app source. I have **not** run it on a device; items marked *verify* need a device or emulator check.

| # | Problem | Evidence | Why it needs a parent |
|---|---|---|---|
| P1 | **Instructions are text, not voice.** | Hints, subtitles, game descriptions and errors are `Text` (`practice/[letterId].tsx` header subtitle, `progressBox`; `words/[language].tsx` hints; `games/index.tsx` descriptions). `audioService` only speaks the letter name or example word. | A pre-reader cannot read "Tap the letter tiles below in order". |
| P2 | **One letter takes ≥ 7 taps and 4 decisions**, and the flow is manual. | Home → Practice Now → *Watch* → *Start Tracing!* → draw → *Check Writing* → modal *Try Write Solo* → draw → *Check Writing* → modal *Next Letter* → lands back on the discovery screen and starts again. | The parent explains which button comes next. |
| P3 | **Too many choices per screen.** | Home has 7 destinations. Practice screen has 14 (English) to 16 (Arabic) tappable controls: mode tabs, form chips, Undo, Clear, Replay, Check, speaker, audio toggle, Back, Home, child badge. Letter discovery adds form tabs, harakat explorer, stroke list. | The child taps the wrong mode/form and gets lost. |
| P4 | **Watch → Trace hand-off is not wired.** | `HandwritingCanvas` supports `onWatchComplete`, but `practice/[letterId].tsx` never passes it. | After the animation the child just stares at the screen. |
| P5 | **Feedback only arrives at the end.** | The child draws everything, then must find and press *Check Writing*. A wrong stroke stays on screen until the child finds Undo/Clear (small, text-labelled). | The parent says "press Check" and "press Undo". |
| P6 | **Failing a trace offers "Next Letter" as the main button.** | Result modal: `mode === 'trace' && passed ? Try Write Solo : Next Letter` — so a *failed* attempt shows *Next Letter*. | Child skips letters or loops; a parent notices and steers. |
| P7 | **No help when stuck.** | No idle detection, no hint escalation, no adaptive scaffolding. "Replay Guide" switches modes, which is confusing. | The parent re-demonstrates the stroke. |
| P8 | **Drawing may be interrupted by scrolling** *(probable, verify)*. | `ScreenContainer` defaults to `scroll`, so the studio is inside a `ScrollView`; the canvas `PanResponder` uses the default termination behaviour and has an `onPanResponderTerminate` fallback. Vertical strokes can be stolen by the scroll view. Also no palm rejection for small hands resting on the tablet. | Strokes break mid-letter; the child thinks they did something wrong. |
| P9 | **Mixed-language clutter.** | Headers like `Hello, Soufy! • مرحبًا Soufy`, buttons with EN label + AR sublabel everywhere, even though each child has `preferredLanguage`. | Visual noise and mixed-direction text for a beginner. |
| P10 | **Too many steps before play, and unsafe controls in child area.** | Welcome's main button goes to the profile picker, "Continue as X" is secondary. Profile cards contain an avatar-picker row (`updateChild`) a child can tap by accident. | Parent helps choose/restart. |
| P11 | **Parent area is easy to enter.** | Welcome screen shows a visible "Parents" button. On first visit the PIN screen **prints the default PIN `1234`** (`pinHintShown` false). Recovery question is fixed `(17×3)+9 = 60`. Settings contain reset buttons. | A curious child can reach settings and reset progress. |
| P12 | **Rewards are not earned honestly.** | Games: `if (evalRes.passed \|\| recordedStrokes.length >= 1)` accepts any scribble; completion always saves score `92`, 3 stars, `35` seconds. Word Builder saves fixed score `95`, 2 stars, `15` s. | With no parent watching, stars lose meaning and the dashboard data is wrong. |
| P13 | **No session shape.** | `dailyGoalLetters` is only shown as text on Home; `dailyGoalMinutes` is stored but never used by the child flow. | Nobody ends the session; child wanders in free-explore. |
| P14 | **Voice may silently fail** *(verify)*. | `speakText` swallows all errors. `QA_REPORT.md` says the 54 bundled WAVs are "musical-phonetic chimes" and spoken names depend on the tablet's offline TTS voices for `ar-SA` / `en-US`. If Arabic voice data is missing, the child hears nothing. | Silent app = parent has to read everything aloud. |

Small bugs to fix on the way:
- `home.tsx` uses `new Date().toISOString().slice(0,10)` (UTC) for "practiced today"; use the device's local date.
- Back/Home use `router.push` to fixed routes, which grows the stack; use `router.replace`/`router.back()` consistently.
- Child badge in the header is tappable but does nothing on most screens.

## 4. Design principles (apply everywhere in child mode)

1. **Voice first, picture second, text last.** Every instruction is spoken, and also shown as motion/highlight. Text is optional decoration, never required.
2. **One thing at a time.** One obvious next action per screen. Hide everything else.
3. **The app leads.** The app decides the next step; the child draws and listens.
4. **Instant, specific, kind feedback** after every stroke, never only at the end.
5. **Fail softly.** No "wrong" sounds or red screens. A miss triggers a demonstration, then a retry; repeated misses end with praise for effort and a move forward.
6. **Big, forgiving touch.** Primary targets ≥ 72 dp, ≥ 16 dp apart; icon + colour + sound together.
7. **Safe by default.** Nothing in child mode can delete, edit settings, leave the app, or open the parent area by accident.
8. **Keep what already works**: offline-only, no ads/tracking, bilingual content, RTL correctness, deterministic scoring, per-child isolation.

## 5. Target workflow

```
Launch ──► Avatar tiles (last child pre-highlighted; tap your face)
              │  (1 tap; narrator: "Hi Soufy! Tap the big star.")
              ▼
Home ──► ONE giant "Play" star  (+3 small icon-only buttons: Letters · Games · My Stars)
              │  (2nd tap)
              ▼
Today's Adventure  (auto-built path: N letters + 1 game, shown as a trail of stars)
              ▼
Guided Lesson for each letter (all automatic):
   INTRO   letter + sound + picture word, spoken            (~6 s)
   WATCH   animated stroke demo, spoken "watch me"          (auto)
   TRACE   per-stroke checking, green lock-in, auto-hints   (child draws)
   WRITE   guide hidden, auto-check when finished           (child draws)
   CELEBRATE stars + sound, auto-continue in ~3 s
              ▼
Mini-game (spoken "how to play", honest scoring)
              ▼
"All done for today!" ──► soft stop, sticker reveal, "See you tomorrow"
```

Free exploration (alphabet grid, all forms, harakat, word builder) stays available as a **parent-enabled "Explore" mode**, not the default path for the child.

## 6. Work packages

### WP1 — Voice-first narration system
- New `src/services/audio/narrator.ts` on top of `audioService`: `say(key, vars?)`, `stop()`, `repeat()`, a **queue** so lines never overlap, and `Speech.stop()` before each new line.
- New `src/data/narration.ts`: all lines keyed by id, each with `en` and `ar`. Use the child's `preferredLanguage` for instructions; letter sounds/words stay in the language being learned.
- Auto-play the screen's intro line **once** on enter; tapping the mascot or a 🔊 button repeats it. The mascot (`MascotBanner`) becomes the "tap to hear again" control.
- **Arabic must be gender-neutral** (profiles have no gender). Prefer "we" phrasing ("لنكتب"، "هيا") over masculine/feminine imperatives.
- **Voice health check** (answers P14): at startup call `expo-speech`'s `getAvailableVoicesAsync()`; store whether `ar` and `en` voices exist. If missing, (a) child mode falls back to bundled chimes plus stronger visual cues, and (b) Parent Settings shows a clear warning and a "Test voice" button.
- Optional upgrade, product owner decides: replace TTS for the ~25 key instruction lines with bundled recorded human audio (offline). Build the narrator so a line can point at either a recording or TTS.

Starter script (extend as needed; `{x}` are variables):

| Key | English | Arabic (neutral) |
|---|---|---|
| `home.welcome` | Hi {name}! Tap the big star to start. | أهلًا {name}! لنضغط على النجمة الكبيرة ونبدأ. |
| `lesson.intro` | This is the letter {letter}. {letter} like {word}. | هذا حرف {letterName}. مثل {word}. |
| `lesson.watch` | Watch how we write it. | هيا نشاهد كيف نكتب الحرف. |
| `lesson.trace.start` | Your turn! Start at the star and follow the arrow. | هيا نجرّب معًا! نبدأ من النجمة ونتبع السهم. |
| `lesson.stroke.ok` | (random) Great! / Yes! / Super! | (random) رائع! / أحسنت! / جميل! |
| `lesson.stroke.retry` | Almost! Let's try that part again. | قريب جدًا! لنحاول هذا الجزء مرة أخرى. |
| `lesson.idle` | Want help? Let's watch the star. | هل نشاهد النجمة معًا؟ |
| `lesson.write.start` | Now write it all by yourself! | الآن نكتب الحرف بمفردنا! |
| `lesson.success` | You did it! Look at your stars! | رائع! ما أجمل كتابتك! انظر إلى النجوم. |
| `lesson.retry` | Let's try once more. | لنحاول مرة أخرى. |
| `lesson.gentleSkip` | You worked so hard! We'll try again tomorrow. | جهدك رائع! سنحاول مرة أخرى غدًا. |
| `game.find` | Find the letter {letter}! | أين حرف {letterName}؟ |
| `session.done` | All done for today! See you tomorrow. | انتهينا لليوم! أراك غدًا. |

**Acceptance:** with the screen turned away, a listener can follow every instruction in guided mode in both languages. Narration never overlaps. Missing voices produce a visible parent warning, not silence.

### WP2 — One-tap entry and a calm Home
- `app/index.tsx`: replace the two buttons with **avatar-only tiles** (big face + name). The last active child is pre-highlighted and speaks the welcome line on enter. Tapping a tile selects and goes to Home. Keep the 🔒 parent entry but see WP9.
- Remove the avatar-picker row from `(child)/profiles.tsx` (move avatar editing to `(parent)/children.tsx`).
- `home.tsx` guided layout: one giant **Play ⭐** button (starts Today's Adventure), plus three small icon-only buttons (Letters, Games, My Stars) that open the existing screens. Hide the two "world" cards, the continue card and the 4-button grid unless parent-enabled **Explore mode** is on.
- Drop mixed-language headings. Show UI text in the child's `preferredLanguage` only; the other language appears inside its own world.
- Add a small `useSafeNavigate()` helper that ignores a second navigation within ~400 ms (prevents double-taps stacking screens).

**Acceptance:** S1 holds. Home shows one dominant action. No headline mixes two languages.

### WP3 — Guided Lesson Runner (the core change)
- New route `app/(child)/lesson/[letterId].tsx` plus a **pure, unit-testable state machine** in `src/features/lesson/lessonMachine.ts`:
  `INTRO → WATCH → TRACE(strokeIndex) → WRITE → CELEBRATE → DONE`, plus `HELP` and `GENTLE_SKIP` states. Reducer + timers injected, so Jest can drive it with fake timers.
- No mode tabs, no form chips, no side panel in guided mode. Guided lessons use the letter's **primary form** (English uppercase then lowercase as two consecutive mini-rounds; Arabic isolated). Other positional forms and harakat are **bonus rounds unlocked after the letter is mastered** or available in Explore mode.
- Wire `onWatchComplete` (fixes P4): after the demo, narrator says `lesson.trace.start` and the machine moves to TRACE automatically.
- Result is no longer a blocking modal with 2 text buttons. It is an in-place celebration (stars animate in with Reanimated, `star_earn` / `celebrate` sounds), then **auto-continues after ~3 s** to the next step. A big ▶ icon lets the child continue sooner.
- After CELEBRATE, go to the **next step of Today's Adventure**, never back to the discovery screen.
- Keep the old `letter/[letterId].tsx` and `practice/[letterId].tsx` working for Explore mode; fix P6 there too: a failed attempt must never show "Next Letter" as the primary button.

**Acceptance:** S2. A scripted test drives the machine through a full lesson with simulated strokes and no UI taps.

### WP4 — Canvas: per-stroke feedback, auto-help, forgiving input
In `src/features/handwriting/HandwritingCanvas.tsx` and `src/services/scoring/handwritingEvaluator.ts`:
- Export a per-stroke function (e.g. `evaluateStrokeAgainstTemplate(template, childPoints, mode)`) that reuses `evaluateSingleStroke`.
- **On every pen-up in TRACE:** evaluate that stroke against the *expected* template.
  - Good → stroke turns green and "locks", sparkle sound, highlight and number move to the next stroke, `lesson.stroke.ok`.
  - Not good → soft shake, the stroke fades out by itself (no Undo needed), the demo star replays **just that stroke**, `lesson.stroke.retry`.
- **WRITE mode:** when the number of strokes ≥ template count and the pen has been up ~1.2 s, evaluate automatically. Keep a large ✓ icon as a manual fallback. Remove the need for the text "Check Writing" button in guided mode.
- **Idle help ladder** (new `useIdleHint` hook): 6 s idle → pulse the start badge and say `lesson.idle`; 12 s → auto-play the demo for the current stroke; 25 s → treat as stuck and go to the fail-soft path below.
- **Fail-soft ladder per letter:** 2 consecutive failed attempts → return to WATCH with slower animation and a wider tolerance *for this attempt only*; 3 → `GENTLE_SKIP` (award an effort star, say `lesson.gentleSkip`, move on, and flag the letter "needs help" for the parent). Never block progress.
- **Start badge** bigger (≥ 28 dp radius) and always visible; the current stroke is the only highlighted one.
- **Input robustness:** accept a single active touch; ignore touches with a large contact radius (palm) when the platform provides it; in studio/lesson/game screens use `ScreenContainer scroll={false}` (or disable scroll while a stroke is active) and set `onPanResponderTerminationRequest: () => false` so the scroll view cannot steal a stroke (P8, *verify on device*).
- If you change any threshold, bump `SCORING_VERSION` and keep the old value in stored attempts.

**Acceptance:** wrong strokes clear themselves; the demo replays for the missed stroke; a child can finish a trace without pressing any button; unit tests cover the per-stroke function, the idle ladder (fake timers) and the fail-soft ladder.

### WP5 — Games the child can start alone
In `games/index.tsx` and `games/[gameId].tsx`:
- On entering a game: narrator reads the rule (`game.find` etc.) and a ~3 s looping **"how to play" animation** shows it (e.g. a finger tapping the right chest).
- Make choices big picture/letter tiles. Replace the text hint after a wrong tap with: gentle shake + highlight of the correct tile after the 2nd miss + the letter sound.
- Skip the language toggle in the guided path: use the child's `preferredLanguage`; keep a small flag-icon switch in Explore mode.
- **Honest scoring (fixes P12):** remove `|| recordedStrokes.length >= 1` as a pass condition; use the real evaluation (with beginner-friendly thresholds) and save the **measured** score, stars and duration. Do the same in Word Builder (replace fixed `95` / `2` / `15`). Mastery rules in `repository.ts` stay as they are.
- **Word Builder (the reading part):** speak the target word and show its picture; speak each letter on tap; after 2 wrong taps, pulse the correct tile. No reliance on the text hint.

**Acceptance:** scribbling randomly does not complete a round; stored scores vary with performance; every game can be started and understood with eyes off the text.

### WP6 — Today's Adventure and session shape
- New `src/features/mission/missionPlanner.ts` (pure function): from `progressMap`, the child's preferred language and `dailyGoalLetters`, build a path: letters in `practicing`/`learning` first, then new ones, then 1 game. Show it as a trail of stars on Home after tapping Play; each finished step lights up.
- Wire `dailyGoalMinutes` (currently unused): at the limit, **only suggest a break**: show a friendly "time for a rest?" message with a big "Rest" button and a "Keep playing" button. It never locks or ends the session, and there is no hard-stop option anywhere.
- End of mission: celebration, a sticker reveal from the existing `BADGE_CATALOG`, `session.done`, then Home in a calm state ("See you tomorrow").
- Fix the UTC "today" bug; count a local calendar day.

**Acceptance:** S4 and S6. A child who follows the app is never left without a next step; finishing the path ends the session on a positive note.

### WP7 — Safe child area (parent gate hardening)
- `(parent)/pin.tsx`: **remove the printed default PIN**. On the first parent visit, run a "Create your PIN" flow (enter twice). For existing installs where `1234` is still active, keep it working but show a dashboard banner "You are still using the default PIN — change it".
- Randomise the recovery arithmetic (e.g. two-digit × one-digit + two-digit) instead of the fixed `(17×3)+9`.
- Open the parent area only via **press-and-hold (~2 s)** on the 🔒 icon; keep the PIN afterwards.
- Remove all destructive or settings-changing controls from child screens. On Android hardware Back at Home, ask "ask a grown-up to exit" behind the PIN instead of leaving silently.
- Document Android **screen pinning** in `README.md` for parents who want a true kiosk (menu path varies by device; do not claim the app can lock the device itself).

**Acceptance:** S5. A child cannot reach settings or reset by tapping around.

### WP8 — Parent-side support for independent mode
- New forward-only **DB migration v2** (`SCHEMA_VERSION = 2`): add whatever you need, e.g. `parent_settings.guided_mode` (default 1), `parent_settings.explore_mode` (default 0), `learning_progress.needs_help` and `consecutive_fails`. Look at how `repository.initialize()` applies `MIGRATION_SQL_V1` and add a versioned runner. **Never drop or reset existing data.** Keep the existing tests green and add migration tests (v1 database → v2).
- Parent Settings: toggles for Guided/Explore mode (the existing daily-minutes setting stays and only drives the break suggestion); voice status with "Test voice" (from WP1).
- Parent Dashboard: **"Needs help"** list (letters flagged by the fail-soft ladder), last session summary, honest per-letter scores.

**Acceptance:** an upgrade from the current v1 database keeps all child progress; new settings default to guided mode.

### WP9 — Ergonomics and clarity checklist (apply to every child screen)
- Primary buttons ≥ 72 dp; ≥ 16 dp spacing; max 3 words of text per button; icon + colour + sound together.
- Undo and Clear in the studio become **two large icon buttons** (↩️, 🧹) with a spoken label on long-press; no side panel in guided mode.
- Replace "Replay Guide" with a **"Show me" 👀 button** that plays the demo for the current stroke *in place* (no mode switch).
- Respect reduced motion if the device requests it; keep all animation short and non-flashing.
- Keep RTL correct for Arabic content and avoid mixed-direction strings.

## 7. Phases (each phase must leave the app working and tested)

1. **Foundations:** WP1 (narrator + voice check) and the small bug fixes (UTC date, navigation, P6, P4 wiring).
2. **Core lesson:** WP4 (canvas feedback, idle/fail-soft ladders, input robustness) then WP3 (Lesson Runner).
3. **Entry and mission:** WP2 and WP6.
4. **Games and honesty:** WP5.
5. **Safety and parent tools:** WP7 and WP8.
6. **Polish and QA:** WP9, docs, final QA report.

## 8. Constraints (do not break)

- 100 % offline; no network calls, ads, tracking, external links in child mode; `RECORD_AUDIO` stays blocked.
- Keep package ID, EAS profiles, offline assets, curriculum data (`src/data/**`) and per-child isolation.
- Prefer libraries already installed (Reanimated, SVG, Expo Speech/Audio). If you add a native dependency (for example `expo-haptics`), say so clearly: it needs a **new EAS build and a higher `versionCode`**.
- Do not hard-lock orientation. Layouts must work on 8", 10–11" and 12–13" tablets in landscape and portrait.
- Scoring remains deterministic and honestly described; never claim AI or clinical assessment.
- Existing tests must pass; add tests for every new pure module.

## 9. Testing and verification

**Automated (run in CI-style order):** `npm test`, `npm run typecheck`, `npx expo-doctor`. Add tests for: lesson state machine, per-stroke evaluation, idle and fail-soft ladders (Jest fake timers), mission planner, narrator queue (no overlap), DB migration v1→v2, honest game scoring (a random scribble must fail).

**Manual "no-adult" script** (do on a real tablet/emulator if available; otherwise mark NOT TESTED):
1. Cold start → first stroke: count taps and seconds (S1).
2. Complete one English and one Arabic guided lesson without touching anything except drawing (S2).
3. Draw a vertical stroke on a portrait tablet without the screen scrolling (P8).
4. Do nothing for 30 s in TRACE: hints must escalate and the app must move on (S4).
5. Fail a letter 3 times: effort star, gentle skip, "needs help" appears in the parent dashboard.
6. Turn off Arabic TTS voice data: child mode still works, parent sees the warning.
7. Try to reach settings from child screens as a child would (taps, long-presses, Back button) (S5).
8. Airplane mode for the whole run.

**Human test (recommended, outside the agent's reach):** let 2–3 children aged 5–6 use it alone for 10 minutes while an adult only observes. Record: time to first stroke, taps on wrong buttons, moments they stopped, moments they asked for help. Feed those back into the next iteration.

## 10. Decisions to make yourself (document, don't block)

| Question | Default |
|---|---|
| TTS or recorded voice for key lines? | Ship with TTS + voice check; structure the narrator so recordings can be dropped in later. |
| What happens at the time limit? | **Decided by the product owner:** only suggest a break. Never lock or end the session; no hard-stop setting. |
| Arabic letter order in guided path? | Keep the current curriculum order; group visually similar letters later (existing `visualGroup`). |
| Guided mode default? | ON for new and upgraded installs; Explore mode is a parent toggle. |

## 11. Final deliverables

1. Working code on a feature branch, one commit per phase.
2. `docs/DECISIONS.md` with the decisions above and any new ones.
3. Updated `README.md` (guided mode, screen pinning tip) and a new section in `QA_REPORT.md` or a new `QA_REPORT_INDEPENDENT_MODE.md` with the PASS / FAIL / NOT TESTED table against S1–S6.
4. A short summary: what changed, what could not be verified, and the recommended next test with real children.
