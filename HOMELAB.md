# HOMELAB deployment

Run Academy on a single Linux box (Raspberry Pi 4, NUC, or any small VPS) and expose it to the public internet via **Cloudflare Tunnel** — no port forwarding, no public IP needed.

The Docker image built from the repo's `Dockerfile` is verified to run end-to-end on Linux (see [README → Docker](./README.md#docker) for the full design). This guide focuses on the production wiring: Cloudflare Tunnel, systemd, daily backups, and the path from SQLite to PostgreSQL.

## Prerequisites

- Linux host with Docker Engine ≥ 25 and Docker Compose v2
- A Cloudflare account with a domain (free tier is fine)
- `cloudflared` CLI installed on the host

Tested on:

- Ubuntu 22.04 LTS (x86_64 and aarch64)
- Debian 12 (Raspberry Pi 4, 8 GB)
- Any small VPS (Hetzner, DigitalOcean, Fly.io, etc.)

## 1. Configure Cloudflare Tunnel

```bash
# Authenticate (opens browser)
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create academy

# Note the tunnel ID and the path of the credentials JSON
# Typically: /root/.cloudflared/<TUNNEL_ID>.json
```

Add a DNS record (CNAME) pointing your domain (e.g. `academy.example.com`) to the tunnel:

```bash
cloudflared tunnel route dns academy academy.example.com
```

Create a config file at `/etc/cloudflared/config.yml`:

```yaml
tunnel: academy
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: academy.example.com
    service: http://localhost:3000
  - service: http_status:404
```

The `service: http://localhost:3000` tells `cloudflared` to forward traffic to the container's published port. Because the container publishes `3000` on the host (`docker-compose.yml → ports: ["3000:3000"]`), `localhost:3000` always points to the app.

> **SSL mode:** in the Cloudflare dashboard set SSL/TLS → Overview to
> **Full (strict)** and enable **Always Use HTTPS**. The tunnel itself
> is encrypted end-to-end (QUIC), and HSTS is also sent by the app, so
> browsers never downgrade to plain HTTP.

## 2. Start Academy

```bash
# Strong auth secret — never reuse a dev value in production.
export AUTH_SECRET=$(openssl rand -base64 32)
export NEXT_PUBLIC_APP_URL=https://academy.example.com
# Absolute path so both the entrypoint's `db:push` and the Next.js
# server agree on the file location regardless of cwd.
export DATABASE_URL=file:/app/apps/web/data/prod.db

# Build + start in the background
docker compose up -d --build

# Tail logs until you see "Ready in"
docker compose logs -f web
```

Verify locally:

```bash
curl -fsS http://localhost:3000/academy/api/health
# {"status":"ok","service":"academy-web","timestamp":"..."}

curl -fsS http://localhost:3000/academy/es | head -c 100
# <!doctype html>... (renders the home page in Spanish)
```

> The app is served under the `/academy` basePath on every transport
> (dev, `next start`, Funnel). Bare `http://localhost:3000/es` 404s.

The compose file is also configured with a Docker healthcheck. Check its status any time with `docker compose ps`. The container should report `(healthy)`.

### What the entrypoint does

`docker/entrypoint.sh` runs on every container start:

1. Resolves `DATABASE_URL` to an **absolute** SQLite file path (stripping the `file:` prefix) and re-exports it, so `db:push` and the app open the same file regardless of working directory.
2. Probes the file for the `users` table. If absent, runs `pnpm db:push` to apply the schema. If present, **skips the migration entirely** so restarts are idempotent and there's no chance of a half-migrated DB.
3. Verifies the migration actually landed (re-checks for the `users` table — `drizzle-kit` can exit 0 without applying anything) and refuses to boot otherwise.
4. Seeds static content (`db:seed:content`) when the `lessons` table is empty.
5. Resolves the `next` binary inside pnpm's offline store (`node_modules/.pnpm/next@<hash>/node_modules/next/dist/bin/next`) and `exec`s it with `next start`.

> **Schema upgrades on existing volumes:** the entrypoint only migrates
> fresh databases (no `users` table). If a release adds tables/columns,
> run `pnpm db:push` once against the volume's database file yourself
> (or recreate the volume) before starting the new image.
>
> **Never set `E2E_BYPASS_RATE_LIMIT=1` in production** — it disables
> auth rate limiting and exists only for the Playwright suite.

## 3. Run the Cloudflare Tunnel

```bash
cloudflared tunnel run academy
```

That's it — `https://academy.example.com` now serves Academy over HTTPS, terminated at Cloudflare's edge, with the actual app running safely behind your tunnel.

## 4. Run Academy as a systemd service

Create `/etc/systemd/system/academy.service`:

```ini
[Unit]
Description=Academy learning platform
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/academy
EnvironmentFile=/opt/academy/.env
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose up -d
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now academy
sudo systemctl status academy
```

`EnvironmentFile=/opt/academy/.env` lets you keep `AUTH_SECRET` and the rest of the secrets in one file outside the repo. A template:

```ini
# /opt/academy/.env
AUTH_SECRET=replace-me-with-openssl-rand-base64-32
NEXT_PUBLIC_APP_URL=https://academy.example.com
DATABASE_URL=file:/app/apps/web/data/prod.db
```

## 5. Optional: systemd for the tunnel

Create `/etc/systemd/system/cloudflared-academy.service`:

```ini
[Unit]
Description=Cloudflare Tunnel for Academy
After=academy.service

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel run academy
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-academy
```

With both units enabled the box survives a reboot and recovers from crashes unattended.

## 6. Backups

The SQLite database lives in a Docker volume (`academy_academy-data-v2` by default). Back up online — no downtime needed — with the helper baked into the image:

```bash
# Snapshot now (writes academy-data-v2:/app/apps/web/data/backups/prod-<UTC>.db)
docker exec academy-web /usr/local/bin/backup.sh
# Copy it offsite (example: home NAS over SSH)
docker cp academy-web:/app/apps/web/data/backups/prod-<UTC>.db /mnt/nas/academy/
```

Schedule daily snapshots + offsite copy with `cron`:

```cron
# /etc/cron.d/academy-backup
15 3 * * * root docker exec academy-web /usr/local/bin/backup.sh && docker cp academy-web:/app/apps/web/data/backups/ /mnt/nas/academy/ --archive
```

Retention: the script prunes snapshots older than `BACKUP_KEEP_DAYS` (default 30) inside the container; prune the offsite copy the same way (`find /mnt/nas/academy -name 'prod-*.db' -mtime +30 -delete).

Restore drill (do this once before go-live, then yearly):

```bash
docker compose stop web
docker cp /mnt/nas/academy/prod-<UTC>.db academy-web:/app/apps/web/data/prod.db
docker compose start web
curl -fsS http://127.0.0.1:3000/academy/api/health
```

## 7. Switching to PostgreSQL

For higher write throughput or multi-instance deployments, swap SQLite for PostgreSQL.

1. Uncomment the `postgres` service in `docker-compose.yml`.
2. Set `DATABASE_URL=postgresql://academy:academy@postgres:5432/academy` in the web service env (or in `/opt/academy/.env`).
3. `docker compose up -d --build`. The entrypoint detects the `postgres://` prefix and Drizzle switches the driver automatically. The first boot applies the schema.

For multi-instance deployment, the JWT session strategy (Auth.js v5) means there's no in-memory session store to coordinate — you can scale the `web` service to N replicas behind a load balancer and they'll all behave identically.

> **Single replica recommended for now:** auth rate limiting is an
> in-memory sliding window per container, so with N replicas an
> attacker gets N× the budget. Keep `replicas: 1` (or put a shared
> limiter / WAF rule in front) until rate limits move to shared
> storage.

## 8. Updates

```bash
cd /opt/academy
git pull
docker compose build web
docker compose up -d web
```

The new image is built, the old container is replaced, and the entrypoint handles schema migrations if anything changed. The SQLite volume keeps the data intact.

Rollback (migrations so far are additive, so downgrades are safe):

```bash
cd /opt/academy
git checkout <previous-sha>
docker compose build web
docker compose up -d web
```

> Take a backup (section 6) before every update. If an update ever
> ships a destructive migration, restore from backup instead of
> rolling the image back.

## 9. Troubleshooting

- **Container stuck in `Restarting`** — run `docker compose logs web` and look for `[entrypoint] FATAL`. Most common cause: the volume was filled by a partial migration. Fix: `docker compose down`, then delete the volume, then `docker compose up -d` again. **This destroys the database.**
- **`AUTH_SECRET` rotates** — every user session becomes invalid. Plan rotations for low-traffic windows and notify users.
- **`Cannot find module 'next/dist/compiled/...'` at runtime** — the image's pnpm store is incomplete. Rebuild with `docker compose build --no-cache web`.
- **Healthcheck stuck on `starting`** — the server takes 20-30 s to compile the route table on first boot. The `start_period: 30s` in `docker-compose.yml` accounts for this; wait one minute.

## 10. Public URL without a domain: Tailscale Funnel

If you have no domain yet, expose the homelab with a free stable
`https://<machine>.<tailnet>.ts.net` address (automatic HTTPS, no open
ports, no dynamic DNS). Install once on the homelab box:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale funnel 3000
```

Tailscale prints your public URL — use it as `NEXT_PUBLIC_APP_URL`.
The funnel survives reboots (tailscaled autostarts and re-applies it).
To stop exposing: `tailscale funnel --off 3000` (or `tailscale funnel reset`).

### Sharing one Funnel between two apps (Academy + another service)

One machine gets one Funnel hostname. The robust pattern is a **dumb
funnel + smart reverse proxy**: the Funnel forwards *everything* to
Caddy on :80, and Caddy routes by path — `/` to the existing app,
`/academy/*` to Academy **with the full path preserved**:

```bash
tailscale funnel reset                 # clear path mappings (10 s downtime)
tailscale funnel --bg 80               # everything -> Caddy :80
tailscale funnel status                # single mapping, no subpaths
```

```caddy
# In the existing :80 block, FIRST (Caddy tries handles in order):
handle /academy/* {
    reverse_proxy academy-web:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote}
    }
}
# ...existing config (reverse_proxy to the other app) follows untouched
```

Why this shape and not `funnel --set-path` (verified the hard way):

- `--set-path` **strips** the matched prefix before proxying, so the
  backend never sees `/academy`. With stripping, no app variant works:
  root-serving leaks absolute asset/redirect URLs to `/` (wrong app),
  and a `basePath` app 404s on the stripped paths.
- Caddy's `reverse_proxy` forwards the path **whole**, so Academy's
  `basePath` (`apps/web/next.config.ts` + `src/lib/base-path.ts`)
  matches exactly what the browser sent. Pages, `/_next` assets,
  API routes and login redirects all stay under `/academy/*`.
- For this, `academy-web` must share the proxy's Docker network
  (`lumen_net` in `docker-compose.homelab.yml`) so Caddy resolves it
  by container name. Reload, don't recreate, the proxy:
  `docker exec <caddy> caddy reload`.

Notes:

- Academy ONLY answers under `/academy` — direct
  `http://127.0.0.1:3000/es` 404s; use
  `http://127.0.0.1:3000/academy/es`. The compose healthcheck already
  hits `/academy/api/health`.
- `NEXT_PUBLIC_APP_URL` must include the subpath:
  `https://<machine>.<tailnet>.ts.net/academy`.
- Auth cookies are host-scoped but each app uses its own session cookie
  names, so logins don't leak across apps.

> **Public service (open registration):** behind Funnel, visitors may
> share the proxy source IP, so the per-IP rate limits count everyone
> together. Raise them in `.env` for a public launch:
> `RATE_LIMIT_REGISTER_MAX=200` and `RATE_LIMIT_LOGIN_MAX=100`
> (defaults: register 3/hour, login 5/15min). With Cloudflare Tunnel
> (§1) the real client IP arrives via `CF-Connecting-IP` and the
> defaults apply per visitor — no override needed.
> Never set `E2E_BYPASS_RATE_LIMIT=1` outside tests.

## 11. Homelab deploys with auto-updates (no domain needed)

`docker-compose.homelab.yml` pulls the CI-built image from GHCR and
Watchtower restarts `web` whenever you push to `main` — no manual
builds on the box. Works behind Tailscale Funnel (§10) or Cloudflare (§1).

Prerequisites (one time):

```bash
# 1. GitHub repo with Actions enabled (deploy.yml pushes to GHCR on main).
#    If the repo is PRIVATE, login once on the homelab:
#    echo <PAT-con-read:packages> | docker login ghcr.io -u <usuario> --password-stdin
#    (then uncomment the config.json volume in docker-compose.homelab.yml)

# 2. Clone + env on the homelab box:
git clone <tu-repo> /opt/academy
cd /opt/academy
openssl rand -base64 32   # -> AUTH_SECRET below
cat > /opt/academy/.env <<'EOF'
AUTH_SECRET=<pega-el-secreto>
IMAGE_REPO=<tu-usuario>/<tu-repo>
IMAGE_TAG=latest
NEXT_PUBLIC_APP_URL=https://<tu-maquina>.<tu-tailnet>.ts.net/academy
TZ=America/Guatemala
EOF

# 3. Boot (DB volume, healthcheck, Watchtower included):
docker compose -f docker-compose.homelab.yml up -d
docker compose -f docker-compose.homelab.yml logs -f web   # hasta "Ready"
curl -fsS http://127.0.0.1:3000/academy/api/health
```

Update flow (automatic):

1. Modificas la app en tu PC → `git push origin main`.
2. GitHub Actions compila y publica `ghcr.io/<repo>:latest` (~5-10 min).
3. Watchtower (poll cada 5 min) detecta la imagen nueva, hace pull,
   reinicia `web`, borra la imagen vieja. La DB y el seed sobreviven
   (volumen + migraciones idempotentes del entrypoint).
4. Verificas: `docker compose -f docker-compose.homelab.yml ps` y
   `/academy/api/health`. Avisos opcionales con `SHOUTRRR_URL`.

Manual update / rollback (sin esperar el poll):

```bash
cd /opt/academy
docker compose -f docker-compose.homelab.yml pull web
docker compose -f docker-compose.homelab.yml up -d web
# Rollback a un commit anterior:
IMAGE_TAG=sha-<commit> docker compose -f docker-compose.homelab.yml up -d web
# Congelar versión (pausar auto-updates): docker stop academy-watchtower
```

> Backup antes de cada release importante (§6). Si una release trae
> una migración destructiva, restaura el backup en vez de hacer rollback
> solo de imagen.

## 12. Caso real operado: Funnel compartido Academy + Lumen

Bitácora de referencia del despliegue del 2026-10-08/10 en un homelab
con dos apps (Lumen en Caddy :80 + Academy en :3000) detrás de un solo
Funnel `https://darkhomelab.tail01138b.ts.net`. Todo lo de abajo está
verificado en producción, no es teoría.

### URLs públicas

| URL | Qué sirve | Estado esperado |
|---|---|---|
| `https://<maquina>.<tailnet>.ts.net/` | Lumen (página vieja, intacta) | 200 |
| `https://<maquina>.<tailnet>.ts.net/academy/es` | Academy home (`<html lang="es">`) | 200 |
| `https://<maquina>.<tailnet>.ts.net/academy/api/health` | Academy health | `{"status":"ok"}` |
| `https://<maquina>.<tailnet>.ts.net/academy/_next/...` (cualquier asset) | Academy JS/CSS | 200 (este fue el caso que fallaba) |
| `https://<maquina>.<tailnet>.ts.net/academy/dashboard` (sin sesión) | Redirect a login con base | 307 → `/academy/es/login?next=...` |

### Arquitectura (la que funciona)

```text
Internet ──Funnel (TODO → :80, tubo tonto)──▶ Caddy :80 ─┬─ /academy/* ─▶ academy-web:3000 (basePath, ruta completa)
                                                          └─ /* ─────────▶ lumen-app:3000 (intacto)
```

Reglas de oro aprendidas (leer antes de tocar):

1. **`funnel --set-path` RECORTA el prefijo** antes de proxear.
   Comprobado 3 veces: `/academy/api/health` devolvía el HTML del 404
   en vez del JSON, y `/academy/robots.txt` 404. Con recorte no hay
   variante que funcione: sin `basePath` fugan assets/redirects a `/`;
   con `basePath` todo 404. Por eso el Funnel NO parte por rutas.
2. **Caddy reenvía la ruta COMPLETA** (`reverse_proxy` sin strip).
   Con la ruta completa, el `basePath` de Academy casa exacto:
   páginas, assets, API y redirects. Todo lo demás sigue a lumen.
3. **Watchtower y `up -d` manual no se mezclan**: si actualizas a mano,
   para Watchtower primero (`docker stop academy-watchtower`) o verás
   contenedores con nombres raros (`<id>_academy-web`) y carreras de
   recreación. El `up -d` siguiente lo normaliza todo.
4. **Pinea versiones para emergencias**: `IMAGE_TAG=<sha-7-chars>`
   (ej. `80bbb03`) congela una imagen conocida-buena; `latest` reanuda
   auto-updates. Los tags por SHA existen siempre (los publica Deploy).

### Comandos de operación (copiar/pegar en el homelab)

```bash
cd ~/academy

# --- Estado (30 s, solo lectura) ---
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker inspect academy-web --format '{{.Image}}'   # digest corriendo
tailscale funnel status                            # mappings activos
curl -s -o /dev/null -w 'local:%{http_code}\n' http://127.0.0.1:3000/academy/api/health
curl -s -o /dev/null -w 'public-lumen:%{http_code}\n' https://<tu-url-funnel>/
curl -s -o /dev/null -w 'public-academy:%{http_code}\n' https://<tu-url-funnel>/academy/es

# --- Update manual a la última imagen (sin esperar el poll) ---
git pull --ff-only
docker stop academy-watchtower
docker compose -f docker-compose.homelab.yml pull
docker compose -f docker-compose.homelab.yml up -d
sleep 60
docker inspect academy-web --format '{{.Image}}'   # confirma digest nuevo
curl -fsS http://127.0.0.1:3000/academy/api/health

# --- Rollback a imagen conocida-buena ---
IMAGE_TAG=<sha-7-bueno> docker compose -f docker-compose.homelab.yml up -d web

# --- Funnel: volver a tubo tonto (tras un --set-path experimental) ---
sudo tailscale funnel reset
sudo tailscale funnel --bg 80
tailscale funnel status   # UNA sola regla: / -> :80

# --- Caddy: editar rutas sin downtime (backup + validate + reload) ---
cp /home/homelab/lumen/Caddyfile /home/homelab/lumen/Caddyfile.bak.$(date +%F)
# ...edita el archivo...
docker exec lumen-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker exec lumen-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
# Rollback: cp Caddyfile.bak.<fecha> Caddyfile + mismo reload.

# --- Red Docker compartida (una vez; Caddy debe resolver academy-web) ---
docker network ls | grep -i lumen   # anota el nombre real (ej. lumen_lumen_net)
# ...declarada como external en docker-compose.homelab.yml...
# Prueba: docker exec lumen-caddy wget -qO- http://academy-web:3000/academy/api/health
```

### Bitácora de incidentes (qué se rompió y cómo se resolvió)

| # | Síntoma | Causa raíz | Fix |
|---|---|---|---|
| 1 | `academy-web` en loop `Restarting (1)` | `.env` con texto literal `$(cat ...)` (heredoc entrecomillado no expandió) → `AUTH_SECRET` de 18 chars, el entrypoint se niega a arrancar | Reescribir `.env` con secreto fresco (`openssl rand -base64 32` sin comillas que bloqueen expansión) |
| 2 | Página vieja "caída" (pública) | Nunca murió: el Funnel se retargeteó de `:80` a `:3000` y le quitó su salida pública. Contenedores sanos todo el tiempo | Devolverle `/` (esta sección) |
| 3 | Página sin CSS/JS, solo HTML | Assets absolutos (`/_next/*`) escapan al mapping `/` → caen en lumen → 404 | Arquitectura Caddy de arriba (ruta completa + basePath) |
| 4 | Todo `/academy/*` 404 tras `--set-path` | El Funnel recorta el prefijo (ver reglas de oro) | Quitar el mapping de path; que decida Caddy |
| 5 | Contenedor `d054a3f7..._academy-web` + error `removal already in progress` | `up -d` manual en carrera con un update de Watchtower | `docker stop academy-watchtower` antes de updates manuales |
| 6 | `docker compose pull` no traía la imagen nueva (digest viejo 30h) | Condición de carrera / estado transitorio del pull | Reintentar pull + verificar digest con `docker inspect` (nunca asumir por el mensaje `Pulled`) |
| 7 | Healthcheck `(unhealthy)` tras actualizar | El clone `~/academy` estaba desactualizado: compose viejo con healthcheck en ruta vieja | `git pull` en el homelab ANTES del `up -d` (siempre) |
| 8 | `caddy reload` → `no config file to load` | Sin `--config` no encuentra el Caddyfile | `caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile` |
| 9 | `caddy validate` rechaza el archivo | `log` no puede ir dentro de `handle` (no es route handler) | `log` a nivel de site; rutas en `handle` explícitos |
| 10 | `tailscale funnel` → `Access denied` | Funnel requiere root la primera vez | `sudo tailscale funnel ...` o `sudo tailscale set --operator=$USER` una vez |
