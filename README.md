# Soufy & Nadine — Playful Arabic + English Handwriting Academy
**نتعلم الكتابة ونلعب معًا**

A tablet-first, 100% offline-capable React Native + Expo + TypeScript educational application designed so a **5–6 year old child can launch and play independently without an adult sitting next to them**, while learning to recognize, pronounce, trace, and independently write all **26 English letters (A–Z, uppercase & lowercase)** and all **28 Arabic letters (أ–ي, isolated, initial, medial, and final positional forms + Harakat)**, build words, and play five interactive learning games.

---

## 1. App Identity & Configuration

| Setting | Value |
|---|---|
| **Display Name** | `Soufy & Nadine` |
| **Arabic Subtitle** | `نتعلم الكتابة ونلعب معًا` |
| **Slug** | `soufy-and-nadine` |
| **Android Package / Application ID** | `com.soufyandnadine.handwriting` |
| **URL Scheme** | `soufyandnadine` |
| **Version / VersionCode** | `1.0.0` (`versionCode: 1`) |
| **Primary Platform** | Android Tablets (8-inch, 10–11-inch, and 12–13-inch, Landscape & Portrait) |

---

## 2. Independent Child Mode (Guided Mode vs. Explore Mode)

See [`docs/DECISIONS.md`](docs/DECISIONS.md) for the complete architectural rationale.

1. **≤ 2 Taps from Launch to First Pen Stroke (`S1`)**:
   - **Welcome (`app/index.tsx`)**: Pre-highlights the active child's avatar tile (**Soufy** 🦊 or **Nadine** 🦉) and speaks `welcome.chooseAvatar`. One tap opens Home.
   - **Home (`app/(child)/home.tsx`)**: Displays **Today's Adventure** (a visual star trail of 3 daily letters + 1 mini-game), a simple visual world switch (`🔤 A B C` / `🕌 أ ب ت`), one giant **`Play ⭐`** button (`minHeight: 112 dp`), and 3 icon-only buttons (`🔤` Letters, `🎮` Games, `🏆` My Stars).
   - Parents can optionally enable **Explore Mode Shortcuts** in Parent Settings (`app/(parent)/settings.tsx`) to reveal direct Language World, Word Builder, and Progress Map cards on Home.
2. **Self-Driving Guided Lesson (`app/(child)/lesson/[letterId].tsx`, `S2`)**:
   - Runs a deterministic state machine (`src/features/lesson/lessonMachine.ts`):
     - **English**: `INTRO → [Uppercase: WATCH → TRACE → WRITE] → [Lowercase: WATCH → TRACE → WRITE] → CELEBRATE → DONE`.
     - **Arabic**: `INTRO → [Isolated: WATCH → TRACE → WRITE] → CELEBRATE → DONE`.
   - **Per-stroke evaluation on finger-up** in `TRACE` mode: completed strokes lock in bright green; off-path or reversed strokes shake and fade out automatically so the child can immediately try again without tapping Undo or Clear.
   - **Auto-evaluation** in `WRITE` mode (~1.2 s after lifting the finger on the final stroke, plus a large `✓` icon button).
   - **Idle Help Ladder (`src/features/lesson/useIdleHint.ts`)**: `6 s` pulses the start star `★` + speaks a friendly hint; `12 s` replays the current stroke animation in-place; `25 s` escalates through the fail-soft ladder.
   - **Fail-Soft Ladder (`S4`)**: 2 consecutive failed attempts return to a slower `WATCH` demo and widen tracing tolerances (`WIDE_ASSISTED_THRESHOLDS`); a 3rd failed attempt triggers `GENTLE_SKIP`, awarding **1 effort star**, flagging `needsHelp = true` for the parent dashboard, and advancing to the next activity.
3. **Voice-First Bilingual Narrator (`src/services/audio/narrator.ts`, `S3`)**:
   - Every child screen speaks its instructions automatically in a single language (`en` or gender-neutral `ar`) via a sequential non-overlapping queue.
   - Tapping the mascot banner (`MascotBanner`) or speaker icon (`🔊`) on any child screen repeats the last spoken instruction (`narrator.repeat()`).
4. **Honest Game & Word Builder Scoring (`src/features/games/gameScoring.ts`, `S6`)**:
   - *Write to Launch* and *Complete the Monster* evaluate actual strokes against curriculum templates (random scribbles fail and prompt a friendly retry).
   - First-visit games play a ~2.5 s visual "How to Play" hand-hint animation (`👆`) and auto-speak the target prompt on every round.
   - Stored scores, stars, and session durations reflect real accuracy and elapsed time.
5. **Hardened Parent Gate & Forward-Only SQLite Schema v2 (`S5`, `WP7`, `WP8`)**:
   - Child screens contain zero destructive or settings controls; reaching the Parent Gate requires pressing and holding `🔒` for ~2 seconds (`delayLongPress={1800}`).
   - First-visit parent setup prompts the parent to **create and confirm a 4-digit PIN** (no printed default PIN on screen) and uses a randomized adult arithmetic challenge (`generateAdultMathChallenge`) for PIN recovery.
   - Upgrades existing SQLite databases forward-only from `v1` to `SCHEMA_VERSION = 2` via `runForwardMigrations()` without losing child data.

---

## 3. Recommended Android Tablet Setup for Unsupervised Child Use

To let a 5–6 year old use the tablet independently without accidentally leaving the app or missing spoken instructions:

### A. Enable Android Screen Pinning (Kiosk Lock)
While the app already intercepts the Android hardware Back button on Welcome and Home with a friendly *"Ask a grown-up"* prompt, Android OS **Screen Pinning** prevents the Home or Overview gestures from switching apps:
1. On your Android tablet, open **Settings → Security & privacy → More security settings → App pinning** (or **Screen pinning**) and turn it **ON**.
2. Enable **"Ask for PIN before unpinning"**.
3. Launch **Soufy & Nadine**, open the Android Recent Apps overview, tap the app icon at the top of the card, and tap **Pin**.

### B. Verify Offline English & Arabic TTS Voices
1. Open **Parent Gate** (press and hold `🔒` for 2 seconds) → **Settings & Reset**.
2. Check the **Offline TTS Voice Status** card (`English Voice` and `Arabic Voice`) and tap **Test English Voice** / **Test Arabic Voice**.
3. If either voice shows `Missing ⚠️`, open Android **Settings → Accessibility → Text-to-speech output → ⚙️ (Preferred engine) → Install voice data**, and download **English (United States)** and **Arabic** for 100% offline speech in Airplane Mode.

---

## 4. Local Development & Testing Commands

```bash
# 1. Install dependencies
npm install

# 2. Run automated Jest unit & integration tests (29 test suites/cases)
npm test

# 3. Run TypeScript strict typecheck
npm run typecheck

# 4. Run Expo project health check
npx expo-doctor

# 5. Start Expo development server
npx expo start
```

---

## 5. Building & Installing the Signed Android APK

The project root includes `eas.json` and `app.json` configured so the `preview` and `production-apk` profiles output a directly installable `.apk` (`"buildType": "apk"`).

```bash
# Trigger the signed Android APK build on EAS
npx eas-cli build --platform android --profile preview

# Or install an existing APK via ADB
adb install -r path/to/soufy-and-nadine.apk
```
