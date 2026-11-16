# Personal Paddock

Open **My Paddock** in the dashboard to choose a team, follow up to five drivers and manage up to 100 saved races. Favourite drivers receive a star and accent highlight in championship standings. The selected team updates the existing dashboard colours, logos and car visuals. The spoiler setting is the same preference used by the header's spoiler control.

Use **Save to paddock** on calendar race cards, month-view race entries or historical library cards. Saved upcoming races reopen their calendar schedule; older races open their historical archive in Race Center. You can remove bookmarks from either the source card or My Paddock. Bookmarks save race identity and basic metadata, not result classifications.

The driver picker uses the bundled roster, displays its season/capture date, and keeps older saved driver IDs removable even if they no longer appear in the current roster. Search or enable **Favourites only** to narrow the list. This page does not present a saved roster as live driver performance.

## Device preferences

Personal Paddock works without Google login, a hosted database or an internet connection. It saves preferences in browser/WebView local storage under `apex-personal-paddock-v1`, while maintaining the existing `apex-team` and `apex-spoiler-free` keys. Existing team and spoiler choices are imported when the device paddock is first created.

The Android bundle includes this local feature. Updating the APK is required to receive the new page. Native Google login and a shared authenticated backend connection are still separate work; the standalone APK does not claim account sync. Its generic offline page still applies to a hosted PWA that cannot load the dashboard itself: local preferences do not make all racing feeds available offline.

If local storage is blocked or full, the current page keeps changes in memory and warns that unsynced changes can be lost when it closes. Clearing site data removes device copies and pending edits. A browser storage event updates other open tabs.

## Account sync

Account sync requires the existing verified Google session, a configured Google OAuth web client and a Node backend with persistent storage. Personal Paddock uses the same application database as Prediction Leagues (`APEX_DATA_DIR/predictions.sqlite`, default `.apex-data`). Existing league state is preserved; profile records are created lazily under a separate key.

- The first new account on this device can import its device paddock automatically.
- An existing account loads its own preferences. **Import device paddock** explicitly merges device favourites/bookmarks and uses its team/spoiler choices, subject to limits.
- Later account switches do not automatically copy device or previous-account preferences into a new account. Each account has a separate cached profile and pending queue.
- Signing out restores the separate device paddock. Pending account changes remain scoped to their original account and are retried when that account signs in again.
- Edits made offline are retained and retried on reconnect, when the page becomes visible, on entering My Paddock, by **Sync now**, or during the active page's periodic refresh.
- Changes are sent as idempotent operations in batches of up to 25. Adding a favourite does not overwrite another device's bookmarks. For competing edits to the same field/item, the last processed operation wins.
- Every upload includes the expected opaque account key. If the authenticated account changes during an in-flight sync, the server rejects the old account's upload rather than applying it to the new account.
- If a merge exceeds the favourite/bookmark limits, changes remain local and a review notice appears. Users can adjust their choices and retry, or explicitly discard pending changes and load the account settings.

Remote sync can enable spoiler hiding. It cannot automatically reveal results on a device where hiding is already enabled: the user must explicitly disable it there. The UI explains when that device protection is in effect.

Account records contain a team ID, spoiler boolean, driver IDs, saved-race metadata, revision and update timestamp. They are keyed by the verified account identifier; the public profile API returns an opaque hash instead of that identifier. It does not persist Google email addresses or credentials in these records. Back up the persistent directory as described in [league hosting](PREDICTION_LEAGUES.md).

## API and checks

`GET /api/paddock` returns the signed-in account's profile, or an explicit device-only mode when authentication/storage is unavailable.

`PATCH /api/paddock` accepts `accountKey` and `operations`: `team`, `spoilers`, `driver-add`, `driver-remove`, `race-save`, and `race-remove`. Mutations require a matching Origin, JSON content type and verified Google session. The server validates values/limits, applies operations inside a SQLite transaction, and returns the resulting profile. Responses are never publicly cached. Repeated operations do not create duplicate favourites/bookmarks or increase the revision unnecessarily.

```sh
node build.mjs --standalone
node scripts/test-all.mjs
node scripts/build-android-assets.mjs
```

`scripts/test-paddock.mjs` exercises the real API and browser controller with controlled identities, storage and connectivity. Checks cover validation, CSRF, idempotency, concurrent field edits, persistence after restart, legacy migration, offline retry, account switching during sync, sign-out, spoiler protection and storage failure. Real Google account sign-in still requires the configured provider client and is a separate integration check.
