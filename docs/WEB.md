# APEX web experience

APEX uses the same responsive feature pages in the website and bundled Android source. The website includes a wider desktop pit wall, an overview toolkit linking to Race Center, Strategy Lab, Personal Paddock and Prediction Leagues, and a context strip showing the browser's timezone and network status. “Browser online” indicates the browser's connectivity flag; it does not certify that every external feed is available.

On desktop, the sidebar exposes the main sections and **Explore APEX** opens the complete feature menu. On phones up to 650px, the bottom bar contains Overview, Race Center, Calendar, My Paddock and More. More includes standings/calculator, teams/history, leagues, news and Strategy Lab. The menu is a native modal dialog with labelled controls, Escape dismissal and focus restoration. Bottom spacing includes the device safe area.

Team colours, logos, cars, spoiler preferences and existing feature behavior are retained. The web changes do not activate sign-in, account sync, paid live-feed access or shared storage by themselves. See [Vercel deployment](VERCEL.md) for managed Postgres and authentication configuration. Existing shared features work on the local persistent Node server; public Vercel setup still requires the account connection and runtime configuration.

Build with `node scripts/build-vercel.mjs`, run `node scripts/test-all.mjs` and `node scripts/test-vercel.mjs`, then preview with the standalone server. Browser QA covered the desktop menu and Strategy Lab route, five-item mobile navigation, secondary sections via More, Escape dismissal, and page/header fit at 390px and 320px widths. The countdown test isolates the shell interaction module while retaining compiled JavaScript syntax checks.
