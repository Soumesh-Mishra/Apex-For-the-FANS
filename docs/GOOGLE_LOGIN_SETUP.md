# Activate Google login

The website already implements Google Identity Services, server verification of Google ID tokens and signed HttpOnly session cookies. These steps activate it on a public HTTPS backend. This guide does not claim that the current Android APK supports Google login: that still needs a native sign-in integration and Android OAuth registration.

## Current Vercel website

APEX is deployed at **https://apex-for-the-fans.vercel.app**. Use this exact value in Google Auth Platform → Clients → APEX Web → **Authorized JavaScript origins**. No redirect URI or client secret is used by the current Google Identity Services flow.

For this deployment, skip the Render instructions below. In Vercel → `apex-for-the-fans` → Environment Variables, add these values for **Production**:

- `GOOGLE_CLIENT_ID`: your Web application's public client ID ending in `.apps.googleusercontent.com`.
- `APEX_SESSION_SECRET`: a cryptographically random value of at least 32 characters, stored as sensitive. Keep it out of chat and Git.
- `CRON_SECRET`: a separate random secret of at least 32 characters, stored as sensitive, for scheduled league settlement.

Redeploy Production after saving environment variables. Verify `/api/auth/config` reports `enabled: true`, complete an actual Google sign-in, and confirm `/api/auth/me` before testing account sync. Neon PostgreSQL stores shared leagues and paddock profiles; connecting a database does not enable Google authentication by itself. See [Vercel deployment](VERCEL.md) for storage and scheduling details.

## 1. Create the Google project and web client

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project named **APEX For the Fans**.
2. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview). Complete the initial setup with the app name **APEX — For the Fans**, your support email and your developer contact email.
3. Choose an **External** audience for personal Google accounts. While testing, add your own Google account under **Audience → Test users** if that option is available. Keep the app in testing until you have reviewed the public launch requirements.
4. Under **Data Access**, use only identity scopes (`openid`, email and profile). APEX does not need Gmail or Drive access.
5. Open **Clients → Create client → Web application**. Name it **APEX Web**. You can add its authorized origin after Render gives you a URL.
6. Copy the **Client ID**, ending in `.apps.googleusercontent.com`. This identifier is public. The current callback flow does not use a client secret or an authorized redirect URI.

## 2. Deploy the public backend

Open [Deploy APEX on Render](https://render.com/deploy?repo=https://github.com/Soumesh-Mishra/Apex-For-the-FANS). Sign in/create your Render account, connect the GitHub repository if requested, and review the Blueprint:

| Setting | Included value |
| --- | --- |
| Service | `apex-for-the-fans` |
| Runtime | Node.js 24 |
| Plan | Free |
| Build command | `node build.mjs --standalone` |
| Start command | `node server.mjs` |
| Health check | `/healthz` |
| `GOOGLE_CLIENT_ID` | Paste the public web client ID from Google |
| `APEX_SESSION_SECRET` | Generated automatically by Render |

Create/deploy the service and wait for it to become live. Copy its actual `https://…onrender.com` URL. The server uses Render's `RENDER_EXTERNAL_URL` automatically; you do not need to guess the domain in advance. For a custom domain, set `PUBLIC_ORIGIN` to that exact HTTPS origin instead.

Keep the generated session secret in Render. Do not send it in chat or commit it. No database is required. Render Free services have resource limits and sleep after inactivity, so the first request may take longer; see [Free service limits](https://render.com/docs/free).

## 3. Allow your deployed URL in Google

1. Return to Google Auth Platform → **Clients → APEX Web**.
2. Under **Authorized JavaScript origins**, add the exact HTTPS origin copied from Render. Use only scheme and hostname, without `/login`, a trailing path or a fragment.
3. Save. If you fill out branding links, use your deployed homepage and `/privacy` page and follow Google's authorized-domain requirements. Public production branding/domain verification is separate from this initial test.
4. Open your Render URL followed by `/login` in Chrome or another supported browser. Select **Continue with Google** and sign in with your allowed account.
5. Confirm the dashboard shows your account, revisit `/login` to see your signed-in profile, then sign out and confirm the profile clears. `/api/auth/me` should return a user only while the session is valid.

For localhost testing, add `http://localhost:4173` as a separate origin and configure the same client ID plus a locally generated session secret in the untracked `.env`.

## 4. Information needed for the APK

Share the public backend URL and public web client ID so the app can be wired to the same verifier. The private ChatGPT-gated Sites URL is not the public Android auth backend.

Android must use native Credential Manager or a system-browser authorization flow. Google's OAuth login pages cannot be embedded in the APK WebView. A native Credential Manager integration also needs an **Android OAuth client**, in the same Google project, registered for package `fans.apex.paddock` and the signing certificate's SHA-1 fingerprint.

The existing workflow uses disposable debug signing keys. Configure a stable signing key before registering the final Android fingerprint; otherwise sign-in can break when a new build gets a different certificate. The public fingerprint can be shared; the keystore and signing password stay private.

After those settings are supplied, native sign-in must be implemented and checked on a Google Play-enabled Android device/emulator. A successful web login alone does not verify the APK flow.

Official references: [Google web setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [Render Blueprints](https://render.com/docs/blueprint-spec), [Render service URLs](https://render.com/docs/environment-variables), [Native Google sign-in](https://developer.android.com/identity/sign-in/credential-manager-siwg).
