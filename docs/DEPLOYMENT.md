# Hosting APEX

APEX needs a server for its API proxy and optional Google identity verification. GitHub Pages is insufficient. There are no runtime npm dependencies, database requirements or paid timing-feed dependencies.

## Node.js on Windows, macOS or Linux

Install Node 24+ and Git:

```sh
git clone https://github.com/Soumesh-Mishra/Apex-For-the-FANS.git
cd Apex-For-the-FANS
node build.mjs --standalone
node scripts/test-all.mjs
node --env-file-if-exists=.env server.mjs
```

Open `http://localhost:4173`. For custom settings, Windows: `Copy-Item .env.example .env`; macOS/Linux: `cp .env.example .env`. Set `PUBLIC_ORIGIN` to your exact HTTPS origin for production, without a trailing slash. Configure your service manager/host to restart `node server.mjs` and inject environment variables. `/healthz` is the health endpoint.

The process listens on all interfaces. Restrict port 4173 to your proxy/firewall on public servers; expose only HTTPS. `PUBLIC_ORIGIN` is server configuration, not a forwarded client header. The standalone server strips client-supplied hosting-identity headers.

## Docker Compose

Install Docker Engine with Compose on Linux, or Docker Desktop on Windows/macOS. On Windows use Linux containers. Docker is optional.

```sh
docker compose up --build -d
docker compose logs --tail=50
```

Open `http://localhost:4173`. Compose binds to loopback only. The image runs as an unprivileged user and contains no `.env`, Git history or private hosting metadata. It health-checks `/healthz`.

Without Compose:

```sh
docker build -t apex-f1 .
docker run --rm -p 127.0.0.1:4173:4173 apex-f1
```

## HTTPS on your domain

For a Linux VPS running Compose, point your domain's DNS to the server, permit ports 80/443 and configure [Caddy](https://caddyserver.com/docs/quick-starts/reverse-proxy):

```caddyfile
apex.example.com {
    reverse_proxy 127.0.0.1:4173
}
```

Set `PUBLIC_ORIGIN=https://apex.example.com` in `.env` and run `docker compose up -d`. Substitute your domain. Caddy requires working DNS and inbound access for TLS certificates.

A Node/container host with TLS termination also works: build `node build.mjs --standalone`, start `node server.mjs`, use its assigned `PORT`, and set the exact `PUBLIC_ORIGIN`.

HTTPS is required for device installation/service workers and Secure Google cookies. `localhost` is a development exception; `http://192.168.x.x:4173` on a phone is not. Test phones against HTTPS.

## Settings

| Name | Purpose |
| --- | --- |
| `PORT` | Listener port, default 4173 |
| `PUBLIC_ORIGIN` | Exact external origin; defaults to the local development address |
| `GOOGLE_CLIENT_ID` | Optional OAuth Web client ID |
| `APEX_SESSION_SECRET` | Optional cryptographically random secret, at least 32 characters |

Sign-in stays disabled until both Google settings are supplied. Follow [AUTH_SETUP.md](../AUTH_SETUP.md). Store secrets in your host's secret manager or untracked `.env`, never source/build artefacts. Google sign-in identifies a profile; it does not restrict dashboard access.

Standalone hosting does not carry over a private Sites gate. Public GitHub publication leaves the existing private deployment separate. Add host-level access controls if you want to restrict your self-hosted copy.

## Updates and rollback

Pull a reviewed commit, run build/tests and restart the Node service, or run `docker compose up --build -d`. Keep the previous commit/image for rollback. Runtime setting changes require a restart. No database migration is needed.

API outages display error/fallback states. Dated calendar/historical snapshots are not current timing. Refresh with the existing scripts only after reviewing upstream responses. Node ignores Cloudflare-specific caching hints, so standalone hosting has no shared Cloudflare edge cache; upstream rate limits and latency apply.

## GitHub automation

The included workflow checks fresh source on Linux, Windows and macOS and smoke-tests Docker on Linux. It does not deploy, store production credentials or create native installers. Configure a host explicitly before enabling automatic deployment.
