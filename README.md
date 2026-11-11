# Soufy & Nadine — Playful Arabic + English Handwriting Academy
**نتعلم الكتابة ونلعب معًا**

A tablet-first, 100% offline-capable React Native + Expo + TypeScript educational application for children aged 5–6 to recognize, pronounce, trace, and independently write all **26 English letters (A–Z, uppercase & lowercase)** and all **28 Arabic letters (أ–ي, isolated, initial, medial, and final positional forms + Harakat)**, build words, and play five interactive learning games.

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

## 2. Architecture & Key Technical Decisions

1. **Handwriting Rendering Engine (`react-native-svg` + `PanResponder` + Gesture Handler)**:
   - Selected as the primary rendering engine for deterministic SVG path geometry, smooth quadratic Bezier interpolation, dashed/numbered stroke guides, animated `WATCH` demonstrations, and zero C++ native build friction on EAS Build.
2. **Deterministic Handwriting Evaluator (`src/services/scoring/handwritingEvaluator.ts`, `v1.0.0-deterministic`)**:
   - Evaluates normalized `[0..1]` stroke paths across path coverage, shape similarity, start/end accuracy, stroke direction, stroke order, and explicit **Arabic dot/hamza placement**.
   - Distinguishes `WATCH`, `TRACE`, and `WRITE` modes and never counts guide paths as child input.
   - Uses beginner-friendly tolerances for 5–6 year olds and provides warm bilingual encouragement without clinical or AI claims.
3. **100% Offline Audio & Assets (`expo-audio` + `expo-speech`)**:
   - Bundles 54 letter `.wav` files (`en_A.wav`–`en_Z.wav`, `ar_01.wav`–`ar_28.wav`), 6 celebratory UI sound effects (`tap.wav`, `sparkle.wav`, `celebrate.wav`, `gentle_hint.wav`, `rocket_launch.wav`, `star_earn.wav`), and Open Font License (OFL) fonts (`NotoSansArabic-Regular.ttf`, `Nunito-Regular.ttf`).
4. **Local SQLite Persistence & Parent Gate (`expo-sqlite` + SHA-256 PIN Hashing)**:
   - Seeds two isolated child profiles (**Soufy** and **Nadine**) by default.
   - Protects parent analytics, profile management, audio settings, and progress reset behind a 4-digit PIN stored exclusively as a salted SHA-256 hash (initial PIN `1234` shown once in a first-visit parent setup hint, changeable in Parent Settings, with an adult math challenge recovery flow).

---

## 3. Local Development & Testing Commands

```bash
# 1. Install dependencies
npm install

# 2. Run automated Jest unit & integration tests
npm test

# 3. Run TypeScript strict typecheck
npm run typecheck

# 4. Run Expo project health check
npx expo-doctor

# 5. Start Expo development server
npx expo start
```

---

## 4. Building the Signed Android APK with EAS

The project root includes `eas.json` and `app.json` configured according to `config.md` so the `preview` and `production-apk` profiles output a directly installable `.apk` (`"buildType": "apk"`).

```bash
# 1. Authenticate with your Expo account
npx eas-cli login

# 2. Configure EAS project (if linking for the first time)
npx eas-cli build:configure

# 3. Trigger the signed Android APK build
npx eas-cli build --platform android --profile preview
```

---

## 5. Installing the APK on an Android Tablet

### Option A — Direct Download on the Tablet
1. Open the EAS Build artifact link on your Android tablet.
2. Download the `.apk` file.
3. Tap the downloaded `.apk` and allow installation from your browser/files app if prompted by Android.
4. Launch **Soufy & Nadine** — all lessons, audio, handwriting studio modes, and games work offline (including in Airplane Mode).

### Option B — Install via ADB from a Computer
```bash
adb install -r path/to/soufy-and-nadine.apk
```
