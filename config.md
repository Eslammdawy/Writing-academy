# Soufy & Nadine — Android Tablet APK Configuration

This file is the build and app-configuration companion to `MASTER_PROMPT.md`.

## 1. App identity

| Setting | Value |
|---|---|
| Display name | `Soufy & Nadine` |
| Arabic subtitle | `نتعلم الكتابة ونلعب معًا` |
| Slug | `soufy-and-nadine` |
| URL scheme | `soufyandnadine` |
| Android application ID | `com.soufyandnadine.handwriting` |
| Initial app version | `1.0.0` |
| Initial Android versionCode | `1` |
| Target | Android tablets, approximately 8–13 inches |
| Orientation | Landscape preferred for handwriting; portrait supported |

Keep the Android application ID stable after distributing an APK. Changing it creates a different Android app identity.

## 2. `eas.json`

Place this file in the project root, beside `package.json`:

```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production-apk": {
      "distribution": "internal",
      "autoIncrement": true,
      "android": {
        "buildType": "apk"
      }
    },
    "production-store": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

### Profile purpose

- `development`: developer build for local/remote debugging. Requires a development client.
- `preview`: signed APK for testing and direct installation on Android tablets.
- `production-apk`: version-incrementing APK for direct distribution outside the Play Store.
- `production-store`: AAB profile for a future Google Play release.

The required direct-install APK command is:

```bash
eas build --platform android --profile preview
```

For a release APK:

```bash
eas build --platform android --profile production-apk
```

For a future Play Store bundle:

```bash
eas build --platform android --profile production-store
```

Expo documents that Android's default artifact is AAB, while APK is needed for direct installation. An internal-distribution profile creates an installable Android artifact; `android.buildType: "apk"` makes the intended artifact explicit.

## 3. `app.json` example

Use `app.json` or `app.config.ts` in the project root. This is a starting configuration; agents must ensure all referenced assets exist before adding asset paths.

```json
{
  "expo": {
    "name": "Soufy & Nadine",
    "slug": "soufy-and-nadine",
    "version": "1.0.0",
    "orientation": "default",
    "userInterfaceStyle": "light",
    "scheme": "soufyandnadine",
    "description": "A playful Arabic and English handwriting academy for children.",
    "android": {
      "package": "com.soufyandnadine.handwriting",
      "versionCode": 1,
      "permissions": []
    }
  }
}
```

Add app icon, splash screen, and Android adaptive icon only after the actual image assets are created and validated. Use the correct Expo configuration properties for the selected SDK.

### Tablet-specific note

Android Expo app config does not provide a simple Android `tabletOnly: true` switch. Implement tablet-first responsive layouts in the app itself, test landscape and portrait on tablet dimensions, and allow graceful behavior on smaller screens if the APK is sideloaded to a phone. Do not claim the APK is technically tablet-restricted unless the Android manifest/device compatibility has actually been configured and tested for that purpose.

Do not hard-lock landscape unless the product owner approves it and testing justifies it. The default orientation setting supports orientation changes; the UI must reflow cleanly.

## 4. Build prerequisites and commands

Prerequisites:
- Node.js version compatible with the selected Expo SDK.
- An Expo account.
- EAS CLI installed or invoked with `npx eas-cli`.
- Android signing credentials managed securely by EAS or the project owner.
- A physical Android tablet or Android emulator for installation testing.

Recommended setup:

```bash
npm install
npx expo-doctor
npx expo install
npx eas-cli login
npx eas-cli build:configure
```

Create the APK:

```bash
npx eas-cli build --platform android --profile preview
```

Use the build page or EAS CLI result to obtain the actual APK artifact. Do not invent an artifact URL.

## 5. Install on an Android tablet

Option A — Download:
1. Open the EAS artifact URL on the tablet.
2. Download the `.apk`.
3. Open the downloaded APK.
4. If Android asks, allow installation from that trusted source.
5. Install and launch **Soufy & Nadine**.

Option B — ADB:

```bash
adb install -r path/to/soufy-and-nadine.apk
```

Only install APKs from a trusted build source. Android may display a warning for apps installed outside Google Play.

## 6. Signing and updates

- Prefer EAS-managed Android signing credentials.
- Never commit keystores, passwords, tokens, or credentials to Git.
- Back up and protect signing credentials; future updates need compatible signing.
- Keep the application ID unchanged.
- Increase `versionCode` for each new Android APK release.
- Use `version` for the user-facing app version.
- If `appVersionSource` is `remote`, EAS manages the developer-facing build version on its servers; keep the versioning workflow documented.

## 7. Tablet QA matrix

Test at minimum, where devices/emulators are available:

| Test target | Layout | Key checks |
|---|---|---|
| 8-inch-class Android tablet | Portrait + landscape | Controls fit; canvas remains usable |
| 10–11-inch Android tablet | Portrait + landscape | Primary design target; full lesson flow |
| 12–13-inch Android tablet | Landscape + portrait | Content does not stretch awkwardly; max width works |

Also verify:
- Touch drawing remains smooth.
- Stylus input works where supported.
- Rotation does not corrupt handwriting strokes.
- Arabic glyph shaping and RTL are correct.
- English LTR layout is correct.
- Audio and learning work in airplane mode.
- Progress persists after force-close/relaunch.
- Soufy and Nadine profiles remain separate.
- Parent gate and reset confirmation work.

## 8. Release checklist

- [ ] Display name and package ID match this file.
- [ ] EAS build succeeded.
- [ ] Artifact is a signed `.apk`, not only an `.aab`.
- [ ] APK exists and has non-zero file size.
- [ ] APK installs on a supported Android tablet/emulator.
- [ ] App launches successfully.
- [ ] Tablet portrait and landscape layouts work.
- [ ] Arabic RTL, glyph shaping, and letter forms are correct.
- [ ] English LTR content is correct.
- [ ] WATCH / TRACE / WRITE modes work.
- [ ] Games and rewards work.
- [ ] Profiles and progress persist.
- [ ] Core functionality works in airplane mode.
- [ ] No child-mode advertisements or external links.
- [ ] Test evidence and limitations are documented.

Do not mark an item complete unless it was actually tested. Separate PASS, FAIL, BLOCKED, and NOT TESTED in the release report.

## 9. Official Expo references

Check these official docs again when building, because Expo SDK and EAS behavior can change:

- APK builds: https://docs.expo.dev/build-reference/apk/
- EAS build configuration (`eas.json`): https://docs.expo.dev/build/eas-json/
- Expo app configuration: https://docs.expo.dev/versions/latest/config/app/
- App version management: https://docs.expo.dev/build-reference/app-versions/
- Internal distribution: https://docs.expo.dev/build/internal-distribution/
