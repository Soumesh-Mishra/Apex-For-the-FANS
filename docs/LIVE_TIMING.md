# OpenF1 session timing

Race Center → **Live timing & results** shows the latest OpenF1 session alongside the separate published race classification. Positions, driver/team names, last completed lap number and last completed lap time refresh every 20 seconds during a session. An incomplete lap does not erase the previous completed time. Missing values display a dash.

## Enable live access

[OpenF1's official documentation](https://openf1.org/docs/) states that historical data from 2023 is free, while real-time access requires a paid subscription. Obtain an access token through your OpenF1 account using the provider's current authentication instructions.

On your server, copy `.env.example` to the untracked `.env` and set:

```dotenv
OPENF1_ACCESS_TOKEN=your-provider-access-token
```

Then build and restart:

```sh
node build.mjs --standalone
node --env-file-if-exists=.env server.mjs
```

For development use `node --env-file-if-exists=.env dev.mjs`. Docker Compose forwards the same setting; restart/recreate the container after changing it. For a Worker deployment, configure `OPENF1_ACCESS_TOKEN` as a runtime secret. Provider tokens can expire: replace the server secret and restart when needed. Automatic credential/token renewal is not implemented.

Never put this token in HTML, browser storage, Git, a mobile APK or a public URL. The browser calls `/api/live-timing`; only the server contacts the fixed OpenF1 endpoints with a bearer header. Responses are not stored in the browser/service worker cache. The bundled Android backend has no secret and therefore cannot enable paid live timing on its own; use the hosted web app/PWA for authenticated live data.

## Feed states and limits

- **Live timing:** recent upstream positions or completed laps during the scheduled session window.
- **Timing delayed:** no new timing for 90 seconds, or a connection/provider failure after data was received. Last received rows remain visible with their original timing timestamp.
- **Session ended:** the scheduled end has passed; show the last available timing as a session snapshot, explicitly separate from official classification. Session end detection uses OpenF1's scheduled dates, so an early finish may show delayed timing until that time.
- **Upcoming / awaiting timing:** the session has not started, or no driver timing is available yet.
- **Live access required:** no token during an active session, or OpenF1 returned 401/403. Historical data may also remain restricted briefly after a session.
- **Feed unavailable:** session metadata or timing cannot be loaded; retry automatically or use Refresh.

Requests are coalesced and cached per running server/Worker instance. The roster is reused, session metadata is checked at least every minute, positions use incremental time filtering after the initial load, and lap records are merged by completed lap number. Requests are spaced to respect the free API burst limit. Rate limits back off for 30–300 seconds, respecting a numeric Retry-After value within that range. Multi-instance deployments need a shared cache/rate limiter if aggregate traffic exceeds the provider quota.

Browser polling pauses while the page is hidden and resumes when it becomes visible. Spoiler-free mode covers the session details and leaderboard. Team accent colours, driver team stripes and the existing dashboard table styling are retained.

## Verification

```sh
node build.mjs --standalone
node scripts/test-all.mjs
node scripts/build-android-assets.mjs
```

The timing tests use controlled sessions to verify ordering, completed-lap retention, session rollover, credentials, cache/coalescing, ended/empty/scheduled feeds, failures, 401/429 responses, recovery, browser polling, visibility, escaping and spoiler protection. A real active-session test requires a valid provider token and a running session; historical and simulated checks do not establish live subscription access.
