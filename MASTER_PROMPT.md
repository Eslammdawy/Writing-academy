# MASTER AI-AGENT PROMPT
# Soufy & Nadine — Playful Arabic + English Handwriting Academy
**Target platform:** Android tablets  
**Required release artifact:** Installable Android APK (`.apk`)  
**Audience:** Children aged 5–6, with a protected parent area

---

## 0. YOUR MISSION AND DEFINITION OF DONE

You are a coordinated senior product, UX, mobile engineering, Arabic/English curriculum, handwriting, games, QA, and Android-release team.

Build **Soufy & Nadine**, a polished, playful, tablet-first Android learning app that teaches children to recognize, pronounce, trace, and independently write Arabic and English letters, then progress to simple words and sentences.

The final output MUST include:
1. A complete React Native + Expo + TypeScript source project.
2. A signed, directly installable Android `.apk` file.
3. A clear APK download/artifact link and file size.
4. A project README and Android installation instructions.
5. `eas.json` and app configuration.
6. Tests and a QA report stating what was actually tested.
7. A list of known limitations.

**A mockup, static prototype, browser-only React app, source code without an APK, or an `.aab` alone does not satisfy the main request.**

Do not fabricate successful builds or tests. If an Expo account, credentials, build quota, emulator, or physical tablet is unavailable, complete everything possible and report the precise blocker and exact next command/action. Do not claim the APK is installable until installation has actually been verified.

Begin by inspecting the repository and available tooling. Then create a milestone plan and implement the app; do not stop after writing a plan.

---

## 1. PRODUCT IDENTITY AND EXPERIENCE

- Product/display name: **Soufy & Nadine**
- Suggested Arabic subtitle: **نتعلم الكتابة ونلعب معًا**
- Android package/application ID: `com.soufyandnadine.handwriting`
- URL scheme: `soufyandnadine`
- Primary platform: Android tablets (approximately 8–13 inch screens).
- Orientation: support landscape and portrait tablet layouts; landscape is the preferred experience for handwriting lessons and games. Do not hard-lock orientation unless real-device testing proves it is necessary.
- Languages: Arabic (proper RTL) and English (LTR).
- Child age range: 5–6.
- Support two local child profiles by default, labelled **Soufy** and **Nadine**, while allowing the parent to edit names and avatars. Keep profile data on the device.
- Visual direction: **playful cartoon adventure** — friendly characters, cheerful colors, illustrated worlds, rounded shapes, gentle animations, and warm encouragement. Do not make the interface noisy, cluttered, or visually overstimulating.

The app should feel like a small world the children explore, not a school worksheet or a generic admin dashboard.

### Product principles
- Learn by seeing, hearing, tracing, writing, and playing.
- Celebrate effort, not only perfect scores.
- Short sessions (about 5–10 minutes), with breaks.
- No advertisements, external links, chat, social features, or in-app purchases in child mode.
- Essential features must work offline after installation.
- Parent controls must be separate from the child experience.
- No collection or transmission of children's personal data.

---

## 2. MULTI-AGENT TEAM AND RESPONSIBILITIES

Use separate agents if the coding environment supports them. Otherwise perform the same roles in sequence. The lead agent owns integration and final acceptance.

### Agent 1 — Product architect / lead integrator
- Inspect the starter repository and establish the architecture.
- Create the milestone plan, task board, data contracts, shared TypeScript types, and decision log.
- Own integration and resolve conflicts between agents.
- Keep the implementation aligned with this prompt and `config.md`.

### Agent 2 — Playful tablet UI/UX designer
- Create the design system and all screen specifications.
- Optimize for tablet touch, landscape canvas work, and portrait adaptation.
- Design icons, cards, illustrations, mascot moments, transitions, empty states, and feedback.
- Ensure readable Arabic and English typography.

### Agent 3 — Arabic curriculum specialist
- Curate all 28 Arabic letters.
- Validate isolated, initial, medial, and final shapes where applicable.
- Validate joining and non-joining behavior, dots, hamza, and gradual harakat content.
- Curate examples, audio labels, and Arabic handwriting paths.
- Review all Arabic content and rendering on Android.

### Agent 4 — English curriculum specialist
- Curate uppercase and lowercase A–Z.
- Define developmentally appropriate stroke orders, directions, phonics, and examples.
- Curate picture-word associations and beginner words/sentences.
- Review all English content and letter templates.

### Agent 5 — Handwriting engine specialist
- Build the drawing canvas and input pipeline.
- Implement normalized stroke templates, tracing, independent writing, undo, clear, and replay.
- Implement transparent scoring and feedback.
- Test touch and stylus input on supported Android tablets.

### Agent 6 — Games and motivation developer
- Build all learning games.
- Implement stars, badges, collection/reward screens, and short celebratory animations.
- Ensure every game reinforces a learning objective and works for both languages.

### Agent 7 — QA, accessibility, and Android release engineer
- Create and execute unit, integration, and device test plans.
- Verify RTL/LTR, touch, audio, persistence, offline mode, and responsiveness.
- Configure EAS and generate the APK.
- Install and launch the APK on a tablet/emulator when available.
- Produce release evidence and the QA report.

**Coordination rules:** All agents must use shared types and a single source of truth for curriculum and stroke templates. No duplicate implementations or conflicting navigation/data layers. The lead agent reviews each milestone before the next begins.

---

## 3. TECHNOLOGY AND ARCHITECTURE

Use:
- React Native with TypeScript.
- Expo managed workflow and Expo Router.
- An Expo SDK version supported by the current Expo documentation.
- React Native Skia OR SVG for handwriting/canvas rendering; select one primary rendering approach and document the decision.
- React Native Gesture Handler for touch input.
- Reanimated only where it adds value and is compatible with the chosen Expo SDK.
- Expo Audio for local pronunciation and sound effects.
- Expo SQLite for durable, local progress and profiles.
- EAS Build for signed Android builds.

Use `npx expo install` for Expo-native dependencies. Confirm package compatibility before adding libraries. Do not eject or add custom native code unless required and documented.

Suggested feature-based structure:

```text
app/
  _layout.tsx
  index.tsx
  (child)/
    profiles.tsx
    home.tsx
    language/[language].tsx
    alphabet/[language].tsx
    letter/[letterId].tsx
    practice/[letterId].tsx
    games/
    rewards.tsx
  (parent)/
    _layout.tsx
    pin.tsx
    dashboard.tsx
    children.tsx
    settings.tsx
src/
  components/
  features/
    profiles/
    curriculum/
    handwriting/
    games/
    progress/
    parent/
  database/
    migrations/
    repositories/
    seed/
  data/
    arabic/
    english/
  hooks/
  navigation/
  services/
    audio/
    scoring/
  theme/
  types/
  utils/
assets/
  fonts/
  audio/
  illustrations/
  icons/
```

The exact folders may change, but keep clear separation between UI, data, curriculum, scoring, and persistence.

---

## 4. DETAILED VISUAL DESIGN SPECIFICATION

### 4.1 Overall art direction
Create a playful illustrated world with:
- Rounded cards and soft, friendly shapes.
- A small set of recurring friendly character/mascot illustrations.
- Cheerful but balanced pastel colors: sky blue, sunshine yellow, mint, coral/orange, and lavender.
- Dark, high-contrast text for readability.
- Soft shadows only where they improve hierarchy.
- Large letterforms as visual heroes.
- Gentle transitions, bouncing celebrations, and star animations.
- Consistent icon style and predictable button placement.

Avoid:
- Tiny controls.
- Dense menus.
- Excessive gradients or flashing.
- Loud continuous background music.
- Too many simultaneous animations.
- A screen full of competing colors.
- Ads, promotional banners, or external navigation.

### 4.2 Tablet layout and responsive behavior
Design for Android tablets, not phones:
- Primary design target: 10–11 inch tablet, approximately 16:10 or 16:9.
- Also test 8-inch and 12–13-inch tablet-sized layouts.
- Support landscape and portrait.
- Use responsive constraints, not hard-coded screen coordinates.
- In landscape, use two-column or split layouts where helpful.
- In portrait, stack content while preserving large drawing space.
- Keep the handwriting canvas central and spacious.
- Respect safe areas, system bars, and keyboard insets.
- Avoid stretched content on wide tablets; use a readable max content width and centered layout.
- Maintain consistent spacing and touch target sizes across sizes.

### 4.3 Typography and language direction
- Bundle a properly licensed Arabic-supporting font, for example Noto Sans Arabic or another verified font with complete glyph coverage.
- Use a clear, child-friendly English typeface with a verified license.
- Large letter displays must be crisp and centered.
- Arabic words must shape and connect correctly.
- Switch layout direction and alignment deliberately for Arabic/English; do not merely right-align English components.
- Verify Arabic punctuation, numerals, diacritics, and mixed Arabic/English examples.

### 4.4 Touch and accessibility
- Main child-facing controls should be at least approximately 56 dp high; aim for 64–76 dp on tablets where suitable.
- Provide generous spacing between neighboring controls.
- Never rely only on color to communicate state.
- Use icons plus labels where children may not recognize an icon.
- Include replay buttons for audio and animation.
- Provide mute and sound-volume controls in the parent area.
- Use simple spoken/visual instructions and minimal reading.
- Respect Android font scaling where possible without breaking the layout.

---

## 5. SCREEN-BY-SCREEN UI SPECIFICATION

### Screen 1 — Splash / welcome
- App title: **Soufy & Nadine**.
- Arabic subtitle: **نتعلم الكتابة ونلعب معًا**.
- Friendly illustration/mascot and floating alphabet characters.
- One prominent “Let's Play & Learn” / “يلا نتعلم ونلعب” action.
- Small, discreet parent-area entry.
- Short, skippable intro animation; no forced long animation.
- Load offline assets without network dependency.

**Acceptance:** cold launch reaches welcome/home without crash; title is legible in both scripts; animation can be skipped or finishes quickly.

### Screen 2 — Choose a child
- Two large profile cards: Soufy and Nadine, each with a distinct selectable avatar.
- Parent may rename, change avatar, or add another profile.
- Clear selected-profile state.
- Avoid gender assumptions in avatar choices.
- Each child's progress must be isolated.

**Acceptance:** selecting either child always loads that child's own progress; switching profile never mixes data.

### Screen 3 — Child home / adventure map
- Warm illustrated home base with two big paths:
  - **English ABC Adventure**
  - **مغامرة الحروف العربية**
- Prominent “Continue learning” card.
- Today's small practice goal, e.g. “Practice 3 letters”.
- Star count and a clear reward/progress indicator.
- “Play a game” entry.
- A small “My stars / rewards” entry.
- Keep parent settings outside the main child navigation.

**Landscape layout:** two language-path cards side-by-side; progress and continue-learning panel visible without scrolling where practical.  
**Portrait layout:** stack language paths, then continue-learning and rewards.

**Acceptance:** each destination opens the expected route; no decorative element is mistaken for a button; child can return home in one obvious action.

### Screen 4 — Language hub
Separate English and Arabic worlds with their own color accent and illustrations, while preserving the same navigation pattern.
- English: ABC, sounds, capital/lowercase, words.
- Arabic: أ ب ت, sounds, letter shapes, joining, harakat.
- Show the child's progress within that language.
- Show the next recommended activity.

**Acceptance:** language setting controls examples, direction, audio, and curriculum content consistently.

### Screen 5 — Alphabet explorer
- Large grid of generously sized letter tiles.
- English: show capital and lowercase relationship (A/a).
- Arabic: show isolated letter as the primary tile; positional forms introduced in relevant lessons.
- Status indicator with text/icon: New, Learning, Practicing, Mastered.
- Simple filters suitable for children: all letters / learned / practice again.
- Parent view may expose more detailed filtering.

**Acceptance:** all 26 English letters and all 28 Arabic letters are present; no missing or duplicate records; each tile opens the correct lesson.

### Screen 6 — Letter discovery / lesson
Show one letter as the hero:
- Large centered character.
- English uppercase/lowercase pair or Arabic positional form preview where appropriate.
- Pronunciation speaker button.
- Picture illustration and example word.
- One short audio/visual instruction.
- Animated stroke demonstration card.
- Clear actions: Watch, Trace, Write.
- Back and replay controls.

Example English: `A a` — “A is for Apple.”  
Example Arabic: `ب` — “بطة”.

**Acceptance:** audio belongs to the displayed letter; examples are appropriate and spelled correctly; letter shape matches selected language and position.

### Screen 7 — Handwriting studio (core screen)
Design this screen carefully; it is the key differentiator.

**Landscape layout:**
- Main area (about 65–75% width): large writing canvas with comfortable margins.
- Side panel: target letter, selected mode, concise instruction, audio replay, and progress.
- Bottom action row: Undo, Clear, Replay guide, Next.
- Keep the active canvas free from floating controls and overlays.

**Portrait layout:**
- Letter/instruction at the top.
- Large canvas occupying most of the screen.
- Compact action row below.
- Do not reduce the canvas to a small box.

**Three modes:**

1. WATCH
   - Animate each stroke in order.
   - Number each stroke.
   - Show a moving start indicator and directional arrow.
   - Offer replay and optional spoken instruction.

2. TRACE
   - Show a light, high-contrast guide/dotted path.
   - Child traces with finger or stylus.
   - Show gentle immediate feedback without blocking the drawing.
   - Detect missing segments or incorrect stroke order where the template supports it.
   - Allow unlimited retries.

3. WRITE
   - Hide the guide.
   - Provide a subtle baseline/grid if appropriate to the script.
   - Capture independent writing.
   - Evaluate and show encouraging feedback.
   - Allow retry or continue.

Canvas controls:
- Undo last stroke.
- Clear entire attempt (confirm only if necessary; avoid needless dialogs).
- Replay animation.
- Audio on/off.
- Continue/next letter.
- Optional pause.

**Acceptance:** input remains smooth during continuous drawing; strokes do not disappear on render; canvas scales after orientation changes; Undo removes only the latest stroke; Clear resets the current attempt; guide strokes are not counted as child strokes.

### Screen 8 — Result / encouragement
- Brief positive feedback and animated stars.
- Show one or two understandable suggestions, not a complex score report.
- Examples: “Wonderful!”, “Great effort!”, “Try this curve again”, “You missed a little part”.
- “Try again” and “Next letter” actions.
- Avoid red failure screens or discouraging language.
- Parent-facing metrics may show more detail separately.

**Acceptance:** child can retry without losing the session; correct performance updates progress exactly once; accidental repeated taps do not duplicate rewards.

### Screen 9 — Word builder
- Show a familiar picture and its word.
- Let child select or arrange letters in the correct order.
- Optional audio pronunciation of word.
- Arabic words must display correct joining and direction.
- Progress from short, familiar words to simple phrases only after readiness.

**Acceptance:** answer validation follows language direction and correct spelling; all included words have reviewed content and local assets.

### Screen 10 — Games lobby
Large illustrated game cards:
1. Letter Treasure Hunt.
2. Match the Picture.
3. Write to Launch.
4. Complete the Monster.
5. Letter Challenge.

Each card shows a short visual instruction and a language choice. Games should work in both Arabic and English wherever the game mechanics make sense.

**Acceptance:** all five games are real, playable, restartable, and record learning results; no dead buttons or placeholder cards.

### Screen 11 — Game play and rewards
- One clear objective at a time.
- Large selectable letters and images.
- Minimal text; optional spoken instructions.
- Short rounds and predictable controls.
- Stars and badges for effort, practice, and improvement.
- Reward gallery / sticker collection.
- Avoid manipulative streak pressure, timers that shame children, or paywalls.

**Acceptance:** game logic gives correct feedback; game completion is recorded once; reward criteria are documented and reproducible.

### Screen 12 — My progress (child-friendly)
- Simple visual journey for each language.
- Letters learned and letters to revisit.
- Stars earned.
- Today's practice time.
- No adult-style dense charts in child mode.

**Acceptance:** displays only the active child's data and updates after a completed session.

### Screen 13 — Parent gate and dashboard
- Enter through a simple parent PIN gate.
- Avoid exposing PIN entry in child-facing routes.
- Parent dashboard can show:
  - Separate progress for each child.
  - Letters introduced / practiced / mastered.
  - Recognition, tracing, and independent-writing trends.
  - Letters that need revision.
  - Session duration and practice history.
  - Weekly summary generated locally.
- Parent settings:
  - Edit child profiles.
  - Daily practice goal.
  - Sound and narration settings.
  - Reset progress with explicit confirmation.
  - Export local summary only if implemented safely.

**Acceptance:** child cannot accidentally reach destructive settings; wrong PIN is handled safely; reset requires confirmation; child profiles remain separate.

---

## 6. CURRICULUM REQUIREMENTS

### Learning sequence
1. Recognize the letter visually.
2. Hear and repeat its sound.
3. Match it to an example word/picture.
4. Watch correct formation.
5. Trace with guidance.
6. Write independently.
7. Recognize/write it in short words.
8. Progress to simple beginner sentences when ready.

Keep sessions around 5–10 minutes and mix new content with spaced review. Do not introduce too many visually similar letters at once.

### English
- 26 uppercase letters and 26 lowercase forms.
- Curated stroke order and direction for each form.
- Phonics and example words.
- Picture associations.
- Alphabet sequencing.
- Simple age-appropriate words and beginner sentences.

### Arabic
- All 28 Arabic letters.
- Isolated form for each letter.
- Initial, medial, and final forms where applicable.
- Correct Arabic joining behavior, including letters that do not join to the following character.
- Correct dots, hamza, and letter-specific marks.
- Introduce harakat gradually.
- Ensure the child understands that shape can change by word position.
- Curate individual handwriting templates for the actual letter forms; do not derive tracing geometry from a rendered Unicode glyph alone.
- Validate Arabic spelling, vocabulary, pronunciation, and diacritics with a competent Arabic reviewer.

**Curriculum acceptance:** all letters and forms are populated; all examples are reviewed; no random placeholder words/audio; every practice activity maps to a valid curriculum item.

---

## 7. HANDWRITING ENGINE AND EVALUATION

Implement a normalized coordinate system (for example, 0–1 in both dimensions) for guide paths and recorded strokes so templates scale across tablet sizes.

Capture:
- Stroke points and order.
- Coordinates.
- Timing where useful.
- Start/end regions.
- Stroke direction.

Evaluation should be deterministic and explainable in version one. Measure appropriate properties:
- Path coverage/completeness.
- Shape similarity or distance to expected path.
- Stroke order where applicable.
- Start/end position and direction.
- Relative size and alignment.
- Arabic dot presence and placement.

Important:
- Distinguish WATCH, TRACE, and WRITE scoring.
- Do not count the guide path as the child's drawing.
- Do not claim professional or AI handwriting recognition.
- Do not label scores as clinical or validated educational assessments.
- Calibrate thresholds through real testing and make them configurable.
- Use tolerant thresholds for 5–6-year-old beginners.
- Give a gentle hint and allow another attempt.
- Store raw metrics and score versions to make future scoring changes traceable.

**Handwriting acceptance:**
- Continuous touch movement produces a stable line.
- Two or more separate strokes remain separate.
- Undo removes the most recent child stroke only.
- Clear removes the current attempt only.
- Guide animation shows the correct order and direction.
- Resize/orientation changes do not corrupt the template or current drawing.
- Trace and write modes do not share or leak guide data.
- Scoring produces the same result for the same input/template/scoring version.
- Arabic dots/marks are explicitly represented and tested.
- At least one representative curved letter, straight letter, multi-stroke letter, and dotted Arabic letter is tested.

---

## 8. GAMES AND REWARDS

Implement these five fully functional games:

1. **Letter Treasure Hunt:** find a target letter among similar distractors; include Arabic visually similar groups such as ب/ت/ث only after introducing the distinction.
2. **Match the Picture:** pair letter, sound, and picture/word.
3. **Write to Launch:** child writes a target letter; a successful attempt triggers a short rocket animation.
4. **Complete the Monster:** complete simple missing strokes/curves and relate them to letter formation.
5. **Letter Challenge:** a short mixed recognition, sound, tracing, and writing review.

Reward positive behaviors:
- Trying again.
- Practicing a difficult letter.
- Finishing a short lesson.
- Improving a previous attempt.
- Reviewing older letters.

Do not reward only speed or perfection. Do not use punitive streak resets, intrusive notifications, random loot boxes, purchases, or competitive public leaderboards.

---

## 9. LOCAL DATA MODEL AND OFFLINE OPERATION

Use SQLite with schema migrations, foreign keys, indexes, and repository/data-access functions.

Suggested entities:

- `children(id, name, avatar, created_at)`
- `letters(id, language, character, lowercase_character, isolated_form, initial_form, medial_form, final_form, example_word, pronunciation_asset, illustration_asset, difficulty_level)`
- `letter_strokes(id, letter_id, form_key, stroke_number, normalized_path, start_point, end_point, direction)`
- `learning_progress(id, child_id, letter_id, recognition_score, tracing_score, independent_writing_score, attempts, successful_attempts, mastery_status, last_practiced)`
- `practice_sessions(id, child_id, language, session_date, duration_seconds, score)`
- `practice_attempts(id, child_id, letter_id, mode, metrics_json, scoring_version, score, created_at)`
- `achievements(id, child_id, achievement_type, achieved_at)`
- `parent_settings(id, pin_hash_or_secure_representation, daily_goal_minutes, audio_enabled)`

Refine the schema where necessary. Never store a plain-text parent PIN. Do not store more personal data than needed. Avoid saving raw handwriting images unless a parent-facing feature requires it and the privacy implications are explained.

Bundle all essential content:
- Letter metadata and stroke templates.
- Fonts with verified redistribution licenses.
- Core illustrations.
- Pronunciation audio and sound effects.
- Game assets and curriculum data.

No network is required for essential use. Test with airplane mode enabled after installation. Do not embed API keys or secrets in the APK.

**Offline acceptance:** after the APK is installed, a child can open either language, access all bundled letters, hear bundled audio, trace/write, play core games, and save progress in airplane mode.

---

## 10. PARENTAL PRIVACY AND CHILD SAFETY

- No advertisements or ad SDKs.
- No analytics/tracking SDKs unless separately reviewed and explicitly approved by the app owner.
- No chat, social profiles, public sharing, or user-generated public content.
- No external links in child mode.
- No unnecessary Android permissions.
- Keep names, profiles, practice records, and settings local.
- Protect parent settings and destructive actions with a parent gate.
- Provide a clear local-data reset option to the parent.
- Document every requested permission and why it is needed.

---

## 11. ENGINEERING QUALITY

- TypeScript strict mode where practical.
- Reusable accessible components.
- Centralized theme and design tokens.
- Shared language and curriculum types.
- Centralized audio service.
- Database migrations and repository layer.
- Well-separated screen, curriculum, drawing, scoring, and game logic.
- No inert controls or misleading placeholder functionality.
- Loading, empty, and recoverable error states.
- Sensible error handling and app-state recovery.
- Avoid unnecessary dependencies.
- Keep project setup and run instructions current.
- Run lint, typecheck, tests, and `npx expo-doctor`.

---

## 12. MILESTONES AND QUALITY GATES

### Milestone 1 — Project foundation
- Inspect repository and initialize Expo/TypeScript if needed.
- Add navigation, design tokens, tablet layout foundation, and local database.
- Implement welcome and child profile switching.
- Gate: app boots; two profiles persist and remain isolated.

### Milestone 2 — Playful UI and curriculum
- Implement home, language hubs, alphabet explorer, letter lessons.
- Seed all English and Arabic letters and reviewed metadata.
- Add local fonts, sample audio, and illustrations.
- Gate: all 54 base letters (26 English + 28 Arabic) appear without duplicates; sample RTL/LTR screens work offline.

### Milestone 3 — Handwriting engine
- Implement WATCH / TRACE / WRITE, normalized templates, controls, evaluation, results.
- Gate: representative letters work with real tablet touch input; scoring and progress persist.

### Milestone 4 — Games and rewards
- Implement all five games and the reward gallery.
- Gate: every game is playable, repeatable, and records outcomes once.

### Milestone 5 — Parent dashboard and offline hardening
- Parent gate, child reports, settings, data reset, airplane-mode validation.
- Gate: parent settings protected; child data isolated; essential use works offline.

### Milestone 6 — QA and Android APK
- Run tests and Expo doctor.
- Build signed APK using EAS.
- Install on Android tablet/emulator where available.
- Run smoke tests and produce release report.
- Gate: APK file exists, is signed, installs, launches, and core flows are verified; limitations disclosed.

For every milestone report:
- Features completed.
- Files/modules changed.
- Tests executed and real outcomes.
- Open defects and risks.
- Gate decision and next tasks.

Do not move past a failed gate silently.

---

## 13. ANDROID APK BUILD REQUIREMENTS

Use the exact Android package ID:
`com.soufyandnadine.handwriting`

Use a stable app name and slug:
- `name`: `Soufy & Nadine`
- `slug`: `soufy-and-nadine`
- `scheme`: `soufyandnadine`

Create and maintain `app.json` or `app.config.ts` and `eas.json` at the project root. Use the companion `config.md` as the source of truth for build configuration.

For directly installing on Android tablets, generate an APK using an EAS build profile that has `distribution: "internal"` and/or `android.buildType: "apk"`. Do not deliver only an AAB.

Use EAS-managed signing credentials unless the owner provides a secure existing signing setup. Never commit keystores, passwords, access tokens, or secrets.

Required build command:

```bash
eas build --platform android --profile preview
```

The release engineer must retrieve the real artifact, verify its size and file extension, and install it on a compatible Android tablet or emulator if available.

---

## 14. FINAL ACCEPTANCE CRITERIA

The final release is accepted only when the team can mark each item as PASS with evidence, or clearly label it BLOCKED/NOT TESTED:

### Product and UI
- [ ] App branding reads **Soufy & Nadine**.
- [ ] Playful, coherent visual system is implemented, not just mocked up.
- [ ] Android tablet landscape layout is polished.
- [ ] Portrait tablet layout remains usable.
- [ ] Tested on at least one 10-inch-class tablet or emulator and one smaller tablet-size layout, where available.
- [ ] No clipped controls, overlapping text, or tiny touch targets.
- [ ] Arabic and English navigation/direction work correctly.

### Curriculum
- [ ] All 26 English uppercase and lowercase letters are present.
- [ ] All 28 Arabic letters are present.
- [ ] Arabic positional forms are represented correctly where applicable.
- [ ] Examples, pictures, audio, and spelling are reviewed.
- [ ] No essential lesson relies on a missing remote asset.

### Handwriting
- [ ] WATCH animation works.
- [ ] TRACE works with touch.
- [ ] WRITE works without a guide.
- [ ] Multiple strokes, undo, clear, replay, and retry work.
- [ ] Normalized templates resize correctly.
- [ ] Arabic dots and letter-specific marks are tested.
- [ ] Evaluation is deterministic, documented, and not misrepresented as AI recognition.

### Learning and games
- [ ] All five games are functional in the supported language paths.
- [ ] Rewards are issued once per qualifying completion.
- [ ] Progress reflects actual learning attempts.
- [ ] Mastery needs repeated success, not one attempt.

### Profiles, parent controls, and privacy
- [ ] Soufy and Nadine profiles can be selected independently.
- [ ] Progress does not leak between profiles.
- [ ] Progress survives closing/reopening the app.
- [ ] Parent gate protects settings and reset actions.
- [ ] No ads, chat, public profiles, or child-mode external links.
- [ ] No unnecessary permissions or unexplained data collection.

### Offline
- [ ] Core curriculum opens in airplane mode.
- [ ] Pronunciation audio works offline.
- [ ] Canvas, games, and local progress saving work offline.

### Android release
- [ ] EAS build completed successfully.
- [ ] Actual `.apk` file is available (not only `.aab`).
- [ ] APK is signed.
- [ ] APK file size and version are reported.
- [ ] APK installation was tested on a tablet/emulator, or limitation is explicitly disclosed.
- [ ] App launches and core flows pass smoke tests.
- [ ] README and installation instructions are included.

---

## 15. FINAL HANDOFF FORMAT

When finished, provide a concise release summary with:

- App name and version.
- Android application ID.
- APK filename, exact artifact path/link, and file size.
- EAS build ID and build URL, if available.
- Device/emulator and Android version used for installation test.
- Test summary: passed, failed, blocked, not tested.
- Known limitations.
- Source project location.
- Steps to install the APK on an Android tablet.

**Start now: inspect the repository, report the current state, and implement the app milestone by milestone. The objective is a finished, tested, installable Android APK for Soufy & Nadine.**
