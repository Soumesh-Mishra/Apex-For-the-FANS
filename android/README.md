# Android APK

This build bundles the APEX dashboard, team visuals and historical recordings inside a native Android WebView app. It does not connect to the Windows local server or depend on the private hosted site. Native HTTPS requests are restricted to the Jolpica, OpenF1, Autosport and APEX production live-timing endpoints. The app falls back to direct OpenF1 timing if the production endpoint is unreachable. Google login is disabled in this test build; no credentials are bundled.

Requires Android 8.0+ and an updated Android System WebView/Chrome. Internet access is needed for external feeds; bundled calendar and sample recorded races/comparison remain available when feeds fail.

The GitHub Android workflow uses Java 17, Gradle 8.11.1, Android Gradle Plugin 8.9.2 and SDK 35. It runs `node scripts/build-android-assets.mjs`, `gradle -p android assembleDebug assembleDebugAndroidTest`, verifies the APK signature, and tests the installed app on an Android emulator. The downloadable APK is a **test/debug-signed build**, intended for direct sharing and testing, not a Play Store release. Different workflow runs may use different test signing keys, requiring uninstall/reinstall rather than an in-place update. Uninstalling clears local preferences.

## Signed APKs for direct distribution

Run the **Android APK** workflow on `main` with **Build a stable-key APK from main** enabled. It uses `APEX_ANDROID_SIGNING_STORE` (a base64-encoded PKCS#12 keystore with the alias `apex`) and `APEX_ANDROID_SIGNING_PASSWORD` from GitHub Actions secrets. Download the `APEX-Android-signed-release` artifact. For a local signed build, set `APEX_ANDROID_KEYSTORE` to the private PKCS#12 file path, provide `APEX_ANDROID_SIGNING_PASSWORD`, and run `gradle -p android assembleRelease` after bundling the assets.

Back up the key and password privately. Future release APKs must use this key and a higher `versionCode` to install in place. Moving from a debug-signed build to the stable-key release requires uninstalling the debug build first. Android removes that installation's local preferences. Never commit the keystore or signing password.

To build locally, install Java 17, Android SDK 35/build-tools and Gradle 8.11.1. Set `ANDROID_HOME`, then run the two commands above from the repository root. APK output: `android/app/build/outputs/apk/debug/app-debug.apk`. Device/emulator tests: `gradle -p android connectedDebugAndroidTest`.

Transfer the APK to Android and open it. Android may ask you to allow installation from that particular file manager/browser; review the prompt yourself. Keep Play Protect enabled. This APK cannot be installed on iOS, Windows or macOS.

## Header and system-bar layout (1.0.1-test)

The native container reserves status-bar, navigation-bar and display-cutout space before laying out the WebView. Insets are zeroed before forwarding them to web content, preventing duplicate padding on newer WebViews. The header wraps its actions on narrow screens and uses 44px minimum touch targets on phones. Emulator tests cover team-logo header hit targets in portrait/landscape and repeated cutout inset changes.

## Personal Paddock (1.1.0-test)

The bundled My Paddock page saves favourite drivers, team/spoiler preferences and bookmarked races on this device without Google login. Device preferences survive WebView reloads. Account sync still requires native Google authentication and a connected persistent backend; this APK uses local mode explicitly. A new emulator test verifies local preferences and bookmarks after reload. Clearing app data or uninstalling removes local preferences.

## Race Strategy Lab (1.2.0-test)

Open Race Center → Strategy Lab to compare manual race strategies offline. Scenario settings are saved on this device. Native simulation controls and the pit-lap search are covered by emulator tests. CSV download is available in the browser edition; the APK labels that export control as browser-only.
