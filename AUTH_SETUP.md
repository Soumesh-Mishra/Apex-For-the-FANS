# Optional Google sign-in

For a guided Google Cloud + Render setup using this repository, follow [Activate Google login](docs/GOOGLE_LOGIN_SETUP.md). The included Render Blueprint generates the server session secret automatically. Native Android Google sign-in is a separate integration; the current APK does not yet support it.

APEX runs without Google login. To enable it on your own HTTPS deployment:

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) and create/select a project.
2. Configure Branding and Audience. Use testing mode and add test accounts while developing.
3. Create an OAuth client of type **Web application**.
4. Add your exact deployed origin, such as `https://apex.example.com`, under **Authorized JavaScript origins**. Add `http://localhost:4173` only for development. Use your real domain, not these examples.
5. The Google Identity Services ID-token popup flow used here needs no client secret or custom redirect URI.
6. Set `GOOGLE_CLIENT_ID` on the server to the client ID ending in `.apps.googleusercontent.com`.
7. Generate `APEX_SESSION_SECRET` with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and save the value in your host's secret manager or untracked `.env`. Never paste it into an issue or source code.
8. Set `PUBLIC_ORIGIN` to your exact deployed HTTPS origin (no trailing slash), restart the server and open `/login`.
9. Test login with an allowed test account, `/api/auth/me`, logout, and login from the installed app. Verify the account UI clears after logout.

Secure cookies require HTTPS in production. Localhost is suitable for development, but actual Google-account sign-in remains an integration test that requires your configured client. The `/privacy` page describes the data used; review it and Google's current production branding/domain-verification requirements before a public OAuth launch.

The backend checks Google's signature, issuer, audience, expiry and nonce, and binds the sign-in flow to an HttpOnly cookie, CSRF token and request origin. Profiles are not stored in a database. Google login identifies the current session; it is not a dashboard access restriction.

If deploying through Sites, configure the two Google runtime values through that platform. Its private ChatGPT hosting gate is separate and remains unchanged. Self-hosting does not include that gate; the standalone server strips client-supplied hosting identity headers.

References: [Create a client ID](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [Verify Google ID tokens](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
