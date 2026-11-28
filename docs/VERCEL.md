# Deploy APEX on Vercel

Import `Soumesh-Mishra/Apex-For-the-FANS` and keep Framework Preset **Other**, repository root, and the build/output settings from `vercel.json`. Node 24 is required. The build emits the responsive dashboard at `/`, `/index.html`, login, loading previews, installation support and public artwork. API routes use one Web-standard Vercel Function. No VM or Next.js migration is needed.

## Persistent features

Connect a managed PostgreSQL database (for example Neon through Vercel Storage) to the project. Set `DATABASE_URL` to its pooled connection URL; `POSTGRES_URL` is also accepted. This server-only secret must never be added to browser code or the public repository. Preview environments should use a separate database/branch from production. Do not attach production data to untrusted pull-request previews.

The adapter creates `apex_state` and uses a database row lock for each league/paddock request. Existing synchronous domain transactions operate on an isolated snapshot; the outer Postgres transaction commits only on success. Requests from separate function instances cannot overwrite concurrent updates. This initial small-community adapter serializes durable requests and may return a retryable 503 under load. Split the state into relational tables before large-scale use. It does not automatically migrate the local SQLite database.

Without a database, Personal Paddock stays in device mode and shared leagues explicitly report unavailable. There is no temporary-file or in-memory substitute for durable user data.

## Login and scheduling

Existing Google login requires `GOOGLE_CLIENT_ID` and a random `APEX_SESSION_SECRET` of at least 32 characters. Register the final HTTPS production origin with Google. Account sync requires a configured sign-in method and persistent storage. Vercel hosting itself is not a user authentication provider. The unfinished AWS Cognito experiment is not part of this deployment.

For **email code sign-in**, use a verified sending domain in Resend. Set `RESEND_API_KEY` as a sensitive Vercel variable, and set `APEX_EMAIL_FROM` to a sender such as `APEX <signin@your-verified-domain>`. The same `APEX_SESSION_SECRET` and persistent database configuration are required. An email account and a Google account remain distinct even when their addresses match. Test requesting and verifying a code on the final HTTPS origin after deploying.

Set a random server-only `CRON_SECRET` (at least 32 characters). The authenticated `/api/cron/settle` endpoint performs league settlement; the included Hobby-compatible schedule runs daily at 03:00 UTC. Opening a league also refreshes its selected race through the existing API. There are no permanent server timers.

Set `PUBLIC_ORIGIN` to the exact production HTTPS origin when using a custom domain. Leave it unset for Vercel's initial domain: requests use their own HTTPS origin and retain existing same-origin mutation checks. The function strips client-supplied hosting identity headers.

For live timing, set `OPENF1_USERNAME` and `OPENF1_PASSWORD` as sensitive server-side environment variables on the APEX Vercel project. APEX exchanges them for an access token and renews it before expiry. An existing `OPENF1_ACCESS_TOKEN` still works when account credentials are absent. During active sessions, the visible dashboard requests updates about every five seconds and backs off on provider errors. Historical timing is available outside OpenF1's protected session window.

## Verify and maintain

Run `node scripts/build-vercel.mjs`, `node scripts/test-all.mjs`, and `node scripts/test-vercel.mjs`. For the real database integration checks, provide a disposable database as `TEST_DATABASE_URL`; those checks test cross-instance concurrent writes and rollback, then remove their own test record. Never run against an unrelated production database.

After deployment, verify `/`, `/api/calendar`, `/api/live-timing`, `/api/auth/config`, `/api/paddock`, `/api/predictions`, and all image assets. Confirm a guest league survives a fresh request/deployment after connecting storage. Configure database backups in the chosen provider, and verify restoration before inviting public users. GitHub pushes redeploy automatically when the repository connection is enabled.
