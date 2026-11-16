# APEX — For the Fans

An independent Formula 1 fan dashboard. Pick your team, follow the season and compare drivers from historical Grands Prix. Black, red and white by default, with team colours throughout.

## Features

- Calendar with countdowns, race cards, month view and calendar downloads.
- Published standings, news, weekend information and favourite drivers.
- Team themes, logos, cars, histories and illustrated driver tributes.
- Race Center: historical library, recorded Bahrain/Monaco replays and Driver Duel with lap charts, qualifying, pit stops and tyre stints.
- Race Strategy Lab: adjustable tyre stints, pit-lap search, safety-car what-ifs, lap inspection and browser CSV export. [Model and assumptions](docs/STRATEGY_LAB.md).
- Championship calculator, circuit exploration and spoiler-free mode.
- Personal Paddock: favourite drivers, saved races, team/spoiler preferences, offline device storage and Google-account sync. [Personal Paddock details](docs/PERSONAL_PADDOCK.md).
- Private prediction leagues: invite codes, pole/podium/fastest-lap picks, qualifying deadlines and automatic season standings. [League hosting and scoring](docs/PREDICTION_LEAGUES.md).
- Team-aware login/loading screens and optional Google sign-in.
- Installable web app for Android, iOS, Windows and macOS.

**Race Center includes an OpenF1 session leaderboard.** Active-session timing requires a server-only OpenF1 access token; see [live timing setup](docs/LIVE_TIMING.md). Without live access, the panel clearly shows that state and free ended-session timing remains available. Provider availability and rate limits apply. Snapshots carry their own dates and are not current live results.

## Run locally

Install [Node.js 24 LTS](https://nodejs.org/) and [Git](https://git-scm.com/downloads), then use PowerShell, Terminal or a Unix shell:

```sh
git clone https://github.com/Soumesh-Mishra/Apex-For-the-FANS.git
cd Apex-For-the-FANS
node dev.mjs
```

Open **http://localhost:4173**. There are no npm packages to install; prediction leagues use Node’s built-in SQLite and save to `.apex-data` by default; required browser libraries are vendored with notices. Development mode reloads source on requests. Stop with Ctrl+C.

For a production build:

```sh
node build.mjs --standalone
node scripts/test-all.mjs
node --env-file-if-exists=.env server.mjs
```

The same commands work on Windows, macOS and Linux. Equivalent npm scripts are `npm run dev`, `npm run build:standalone`, `npm test` and `npm start`. No Rust, Xcode, Android Studio or Docker is needed for browser installation.

## Install on your devices

**Windows local installation:** run `./windows/install.ps1` in PowerShell to install a local copy with desktop/Start shortcuts and a bundled, checksum-verified Node runtime. Edge or Chrome is required. See [Windows installation details](docs/INSTALLATION.md#windows). No HTTPS host is needed for this local option.

Host the app at an HTTPS address using [the deployment guide](docs/DEPLOYMENT.md), then open **`https://YOUR-DOMAIN/install`**.

| Device | Install |
| --- | --- |
| Android | Chrome → menu → Install app / Add to Home screen → confirm |
| iPhone / iPad | Safari → Share → Add to Home Screen → Open as Web App if offered → Add |
| Windows | Edge / Chrome → address-bar install icon or menu → install as app |
| macOS | Safari on Sonoma 14+ → File / Share → Add to Dock; or Chrome's install icon |

Browser installation uses a **Progressive Web App**. An experimental, directly installable Android APK is also available through the [Android build](android/README.md); iOS has no native IPA package. See [complete platform instructions, updates and removal](docs/INSTALLATION.md). Internet access is required for the dashboard and feeds; the service worker only caches a generic offline connection page. Google sign-in is optional.

## Host your own copy

Use the built-in Node server or the included [Dockerfile](Dockerfile) and [Compose file](compose.yaml). Put it behind HTTPS. [Deployment and configuration](docs/DEPLOYMENT.md) includes Docker setup, a Caddy example and update steps.

**GitHub hosts this source repository. GitHub Pages alone cannot run the API proxy or Google token verification.** Publishing this repository does not change access to any separately hosted private APEX instance.

For Google Cloud setup and a Render backend with an automatically generated session secret, follow [Activate Google login](docs/GOOGLE_LOGIN_SETUP.md).

Copy `.env.example` to `.env` only if needed. Never commit credentials or runtime session secrets. See [Google setup](AUTH_SETUP.md) to enable Google sign-in on your own domain.

## Checks

```sh
node build.mjs --standalone
node scripts/test-all.mjs
```

Checks cover OpenF1 timing, polling and failure recovery, countdown recovery, palettes and contrast, recorded timing, authentication, entry screens, Driver Duel and installation routes/offline isolation. GitHub Actions runs these on Windows, macOS and Linux and smoke-tests Docker on Linux. Tests use fixtures; no Google account or paid feed is needed. Physical iOS/Android and browser installation are manual checks: see [verification](docs/INSTALLATION.md#verification).

## Project map

| Path | Purpose |
| --- | --- |
| `source.mjs`, `build.mjs` | Compile templates/assets into one Worker module |
| `worker/` | Fixed upstream API proxies, authentication and Driver Duel |
| `server.mjs`, `dev.mjs` | Production and development Node hosts |
| `pwa/` | Install page, manifest, icons and minimal service worker |
| `data/`, `assets/`, `vendor/` | Fixtures, visuals and browser libraries |
| `scripts/` | Fixture fetchers, asset preparation and tests |

See [Driver Duel methodology](DRIVER_DUEL.md), [team palettes](THEME_PALETTES.md) and [art notes](TEAM_LEGENDS_ART.md).

## Data, rights and credits

[Jolpica F1](https://api.jolpi.ca/) supplies calendars, standings and historical classifications; [OpenF1](https://openf1.org/) supplies recorded sessions/stints; [Autosport](https://www.autosport.com/f1/) supplies RSS news. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `/credits` for visual/library credits.

APEX is unaffiliated with Formula 1, the FIA or any racing team. Third-party trademarks, photographs, models and likenesses retain their respective rights. Public visibility does not grant a licence to them. No open-source licence grant for original application code has been selected yet; public visibility permits inspection, not unrestricted reuse. Choose a code licence before inviting licensed redistribution.
