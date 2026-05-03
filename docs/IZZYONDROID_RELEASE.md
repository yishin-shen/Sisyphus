# IzzyOnDroid Release Checklist

Use this checklist before requesting inclusion in IzzyOnDroid.

## Repository readiness

- Source code is public.
- License is GPL-3.0 and `LICENSE` is present.
- `README.md` describes the app clearly.
- `PRIVACY.md` states that the app is offline, has no ads, no analytics, and no trackers.
- Fastlane metadata is present under `fastlane/metadata/android`.
- Screenshots and icon are present under Fastlane metadata.
- The Android manifest does not request `INTERNET`.

## Build checks

Run:

```bash
npm ci
npm run lint
npm run test:rendering
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

For the release APK, configure a private release keystore locally and run:

```bash
cp android/keystore.properties.example android/keystore.properties
```

Then edit `android/keystore.properties` so it points to your private keystore and contains your local passwords. Never commit this file.

```bash
npm ci
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

Do not commit release keystores, passwords, or generated signed APKs to the repository.

## GitHub release

1. Commit the release-ready source.
2. Tag the exact commit, for example:

```bash
git tag v1.2.0
git push origin v1.2.0
```

3. Create a GitHub release for `v1.2.0`.
4. Attach the signed release APK, for example `Sisyphus-v1.2.0.apk`.
5. Include the changelog from `fastlane/metadata/android/en-US/changelogs/3.txt`.

## IzzyOnDroid issue template

```markdown
## App inclusion request

App name: Sisyphus
Package name: com.yishin.sisyphus
License: GPL-3.0
Source code: https://github.com/yishin-shen/Sisyphus
Latest release: https://github.com/yishin-shen/Sisyphus/releases/tag/v1.2.0
APK: https://github.com/yishin-shen/Sisyphus/releases/download/v1.2.0/Sisyphus-v1.2.0.apk

Sisyphus is a privacy-focused Android wallpaper app that visualizes time as a minimalist heatmap.
It works fully offline, has no ads, no analytics, no trackers, and does not request INTERNET permission.

Fastlane metadata is included in the repository.

Build steps:

- npm ci
- npm run build
- npx cap sync android
- cd android
- ./gradlew assembleRelease
```
