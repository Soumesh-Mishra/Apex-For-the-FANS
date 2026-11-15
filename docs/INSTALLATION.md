# Installing APEX

## Before you start

You need a deployed HTTPS APEX address, an internet connection and an up-to-date browser. Visit `/install` on that address for the in-app guide. A GitHub repository URL is source code, not a running app. A privately gated host still requires its own access; installation does not bypass it.

APEX uses a Progressive Web App (PWA). No developer account, app-store purchase, sideloading, native build tools or signing certificate is required. This release supplies no native installers or app-store listings. A browser tab works if installation is unavailable.

## Android

1. Open your deployed APEX address in Chrome, not an embedded social-media browser.
2. Visit `/install`. If **Install APEX** appears, tap it and confirm the browser prompt.
3. Alternatively use Chrome's menu → **Install app** or **Add to Home screen**. Wording varies by device/browser.
4. Open APEX from your home screen or app launcher.

If unavailable, check HTTPS, update Chrome, leave incognito mode and check whether APEX is already installed. Some browsers create a shortcut instead of a packaged web app.

## iOS / iPadOS

1. Open the deployed address in Safari.
2. Tap **Share → Add to Home Screen**. If missing, check **Edit Actions**.
3. Keep **Open as Web App** enabled if offered, confirm the name and tap **Add**.
4. Launch the new APEX icon.

iOS does not use the Chromium in-page install prompt. Browser and installed-app storage can differ; select your team again if needed. See [Apple's iPhone guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

## Windows

### Local desktop installation (no hosted server needed)

For a local copy on Windows x64, clone/download this repository, open PowerShell in its folder and run:

```powershell
./windows/install.ps1
```

This downloads Node.js 24.22.3 from nodejs.org, verifies its pinned SHA-256 checksum, builds APEX and installs it under `%LOCALAPPDATA%\APEX-For-the-FANS`. Microsoft Edge or Chrome must already be installed. No administrator rights, Windows service or login startup task is used.

Open **APEX - For the Fans** from Start or the desktop. The launcher starts a server on `http://127.0.0.1:41732` and opens a browser app window. Use **Start → APEX → Stop APEX server** when you want to stop the background server. Closing the app window alone leaves the server running. Local settings remain in that browser's site storage. Google login is disabled in this local copy; external racing/news feeds still need internet.

This is a local browser-backed desktop installation, not a signed native EXE/MSIX or a browser-registered PWA. It bundles its runtime so the source checkout and development terminal are not needed after installation. Keep the included `INSTALLATION.txt` for removal/update details. A pre-existing installation directory is preserved; the installer stops instead of overwriting it. If Windows organisational policy blocks local scripts or Windows Script Host, use the hosted browser installation below rather than disabling security protections.

### Install from an HTTPS deployment

1. Open the deployed address in Microsoft Edge or Chrome.
2. Select the address-bar install icon. Alternatively use Edge's **Apps → Install this site as an app**, or Chrome's browser-menu install option.
3. Confirm, launch APEX from Start and optionally pin it to the taskbar.

Organisation browser policies may disable installation. A browser-managed installation normally does not require administrator privileges.

## macOS

With Safari on macOS Sonoma 14 or later:

1. Open the deployed address.
2. Choose **File → Add to Dock** or **Share → Add to Dock**.
3. Confirm and open APEX from the Dock or Applications.

Alternatively use Chrome's address-bar install icon or menu. See [Apple's Mac guide](https://support.apple.com/en-ca/104996).

## Updates, offline behaviour and removal

Dashboard pages and API data use the network. New deployments load on the next navigation/reopen; close app windows and reopen if a screen is outdated. The service worker follows the browser update lifecycle and stores only a generic offline page, never authentication responses, scores or personalised dashboards.

Offline APEX shows a connection screen, not a cached dashboard. Reconnect and choose **Try the paddock again**. Preferences stay on this browser/device and do not sync through Google sign-in.

Uninstall using the browser's app menu or your OS's app-removal flow. On iPhone remove the home-screen web app; on Mac remove it from Applications. Removal may not clear all browser storage: clear the site's data to reset preferences and cookies. This also removes the offline page until your next online visit.

## Verification

Before sharing a hosted release:

- Open `/install`, `/manifest.webmanifest`, `/sw.js` and `/icons/apex-192.png` over HTTPS; verify content types and no account-page redirects.
- Install in Chrome/Edge; verify standalone launch, icon, team changes and Driver Duel.
- Install on real Android and iPhone devices; verify portrait layout, safe areas, launch and preference persistence.
- Install with Safari on a supported Mac; verify Dock launch.
- Disconnect after an online visit, navigate and verify the connection screen; reconnect and retry.
- When OAuth is enabled, verify login/logout in the installed app, including popup restrictions.

Automated tests do not substitute for device/browser installation checks. No signed native packages have been built or verified.

Reference: [Browser PWA installation](https://web.dev/learn/pwa/installation/).
