# Prediction leagues

Open **Leagues** in the dashboard. Choose a guest racer name or use configured Google sign-in, create a private league and share its 8-character code. Friends enter the code to join. Each league supports 100 racers; a racer can belong to 20 leagues. There are no entry fees or cash prizes.

For each Grand Prix, pick pole (qualifying P1), the three podium places and fastest race lap. The podium must contain three different drivers. You can edit until the scheduled start of Grand Prix qualifying. Sprint sessions do not count. Every league has its own predictions; joining after a race locks does not let a new member add retroactive picks.

## Scoring

| Prediction | Points |
| --- | --- |
| Pole: published qualifying P1, regardless of later grid penalties | 3 |
| Each podium driver in the exact finishing place | 5 |
| Each podium pick finishing elsewhere on the podium | 2 |
| Fastest race lap | 2 |

The maximum is 20 points. Exact-place and wrong-place podium awards are mutually exclusive per pick. These are APEX game points, independent of the championship's scoring rules. Tied totals share a rank; names only determine display order within a tie.

Jolpica qualifying and race classifications supply the results. Missing categories remain pending and unawarded. Qualifying can score before the race, so totals are provisional until the remaining results arrive. Corrections replace stored results and scores are recomputed, avoiding duplicate awards. Results are checked on the selected race and by the standalone Node background worker, which checks up to two entered rounds every two minutes with a five-minute provider cache. Provider delays can therefore delay scores. Failed provider requests retain the last published results.

Schedule and season-driver metadata are cached for two minutes. A verified qualifying start time is required to edit picks; feed failures pause edits. The earliest verified deadline is retained, so a later schedule update does not reopen an already locked round. The server's clock enforces the deadline; changing a phone's clock cannot unlock submissions. An unknown qualifying time does not reveal other members' picks before the race.

## Identities and privacy

Google sessions use the existing verified authentication flow. Guest access uses a random 192-bit, Secure, HttpOnly, SameSite=Lax cookie lasting 30 days, with only its hash stored in the database. Guest play identifies this browser, not a verified person. Clearing or losing the guest cookie loses access unless the guest memberships were linked to Google by signing in in the same browser. Guest identities are linked only while their access token is still valid. Existing Google picks win if both profiles entered the same league/race.

The database stores display names, account identifiers, league memberships, picks, result snapshots and deadlines. Google email addresses and raw Google/guest tokens are not stored in it. Private league APIs require membership; invite codes and picks are not publicly listed. Shared picks are returned only after the deadline. Standings and result breakdowns respect spoiler-free mode.

## Persistent hosting

Run with Node.js 24+. No database package installation is required:

```sh
node build.mjs --standalone
node scripts/test-all.mjs
node --env-file-if-exists=.env server.mjs
```

The standalone and development servers use Node's built-in SQLite. By default the file is `.apex-data/predictions.sqlite`; set `APEX_DATA_DIR` to another persistent directory if needed. The SQLite transaction contains the league state, with WAL and full synchronous commits. Keep the server on one host with a local persistent filesystem; this initial adapter is intended for small leagues, not multiple application replicas. Move the adapter to a shared transactional database before scaling across hosts.

**Oracle VM:** keep `APEX_DATA_DIR` on the VM's persistent disk and run Node as a service, or use the included Docker Compose configuration. Configure HTTPS for guest cookies and Google login. Localhost is suitable for development.

**Docker Compose:** the included `apex-data` named volume preserves league data across container replacement. Do not remove that volume when updating. A bind-mounted directory must be writable by the container's `node` user (UID 1000).

**Render:** Free instances have ephemeral filesystems. Leagues are disabled there unless `APEX_DATA_DIR` is explicitly configured. Attach a persistent disk on a supported plan and set a path on that disk, such as `/var/data/apex`. The free Blueprint alone does not provide durable leagues.

**Worker/Sites or bundled Android:** the portable worker needs a compatible `PREDICTIONS_STORE` adapter supplied at runtime. Without one the UI explains that the hosted league service is unavailable; it does not pretend to share local-only data. The standalone APK is not yet connected to a shared authenticated backend. Existing public feeds, recorded races and Driver Duel continue to work.

Stop the application before backing up the data directory; keep the SQLite file and any WAL sidecars together. Restore to a writable directory before restarting. The database, its backups and all `.sqlite` files are excluded from Git and Docker build context. Monitor disk space and back up independently of code deployments.

## API and checks

- `GET /api/predictions?league=…&race=…`: own leagues and a member-only selected league/race.
- `POST /api/predictions/guest`: create a guest identity from a racer name.
- `POST /api/predictions/leagues`: create a league from its name.
- `POST /api/predictions/join`: join using an invite code (idempotent).
- `PUT /api/predictions/picks`: save this member's validated picks before the verified deadline.

Mutation requests require matching Origin and JSON content type. Responses are `no-store`; other members' identities, cookies and raw account IDs are not returned. There are per-profile request limits and a bounded guest-creation rate. These limits complement, rather than replace, host-level abuse controls.

`node scripts/test-predictions.mjs` exercises scoring, membership and hidden picks, join idempotency, validation, server deadlines, CSRF, outage recovery, persistence across SQLite reopen, rollback, corrected/partial classifications, background settlement, guest linking and missing storage. The full suite runs this automatically.
