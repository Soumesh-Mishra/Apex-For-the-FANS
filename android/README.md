# Android APK

This build bundles the APEX dashboard, team visuals and historical recordings inside a native Android WebView app. It does not connect to the Windows local server or depend on the private hosted site. Native HTTPS requests are restricted to the existing Jolpica, OpenF1 and Autosport feed endpoints. Google login is disabled in this test build; no credentials are bundled.

Requires Android 8.0+ and an updated Android System WebView/Chrome. Internet access is needed for external feeds; bundled calendar and sample recorded races/comparison remain available when feeds fail.

The GitHub Android workflow uses Java 17, Gradle 8.11.1, Android Gradle Plugin 8.9.2 and SDK 35. It runs `node scripts/build-android-assets.mjs`, `gradle -p android assembleDebug assembleDebugAndroidTest`, verifies the APK signature, and tests the installed app on an Android emulator. The downloadable APK is a **test/debug-signed build**, intended for direct sharing and testing, not a Play Store release. Different workflow runs may use different test signing keys, requiring uninstall/reinstall rather than an in-place update. Uninstalling clears local preferences.

For a stable public release, configure a private release keystore and increment `versionCode`. Never commit a keystore or signing passwords. No Google/Play account is needed to build or directly install the test APK.

To build locally, install Java 17, Android SDK 35/build-tools and Gradle 8.11.1. Set `ANDROID_HOME`, then run the two commands above from the repository root. APK output: `android/app/build/outputs/apk/debug/app-debug.apk`. Device/emulator tests: `gradle -p android connectedDebugAndroidTest`.

Transfer the APK to Android and open it. Android may ask you to allow installation from that particular file manager/browser; review the prompt yourself. Keep Play Protect enabled. This APK cannot be installed on iOS, Windows or macOS.

## Header and system-bar layout (1.0.1-test)

The native container reserves status-bar, navigation-bar and display-cutout space before laying out the WebView. Insets are zeroed before forwarding them to web content, preventing duplicate padding on newer WebViews. The header wraps its actions on narrow screens and uses 44px minimum touch targets on phones. Emulator tests cover team-logo header hit targets in portrait/landscape and repeated cutout inset changes.

## Personal Paddock (1.1.0-test)

The bundled My Paddock page saves favourite drivers, team/spoiler preferences and bookmarked races on this device without Google login. Device preferences survive WebView reloads. Account sync still requires native Google authentication and a connected persistent backend; this APK uses local mode explicitly. A new emulator test verifies local preferences and bookmarks after reload. Clearing app data or uninstalling removes local preferences.
