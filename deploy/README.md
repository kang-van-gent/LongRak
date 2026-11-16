# Deployment

Pipeline: **PR → CI → merge to `main` → images pushed to GHCR → (optional) SSH deploy**

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/workflows/ci.yml` | PRs to `main`, pushes to other branches | `npm ci`, builds all workspaces, test-builds all 3 Docker images |
| `.github/workflows/deploy.yml` | push to `main` (= merged PR), manual | Builds & pushes `ghcr.io/kang-van-gent/longrak-{server,web,app}:{sha,latest}`, then deploys if `DEPLOY_ENABLED=true` |

Until a server exists, leave `DEPLOY_ENABLED` unset — the deploy job is skipped and only images are published.

## When the server is ready

### 1. Prepare the server (Ubuntu/Debian)

```bash
# Docker + compose plugin
curl -fsSL https://get.docker.com | sh

# Deploy user
sudo adduser --disabled-password deploy
sudo usermod -aG docker deploy
sudo mkdir -p /opt/longrak && sudo chown deploy:deploy /opt/longrak
```

Create `/opt/longrak/.env` from the repo's `.env.example` with **real production secrets**
(`openssl rand -base64 32`), and set `PUBLIC_API_URL` to the public API URL.

### 2. SSH key for GitHub Actions

```bash
ssh-keygen -t ed25519 -f longrak_deploy -N "" -C "github-actions"
# append longrak_deploy.pub to /home/deploy/.ssh/authorized_keys on the server
```

### 3. GitHub settings (repo → Settings → Secrets and variables → Actions)

**Secrets**

| Name | Value |
|---|---|
| `SSH_HOST` | server IP / hostname |
| `SSH_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | contents of `longrak_deploy` (private key) |
| `SSH_PORT` | optional, defaults to 22 |

**Variables**

| Name | Value |
|---|---|
| `DEPLOY_ENABLED` | `true` |
| `DEPLOY_PATH` | optional, defaults to `/opt/longrak` |
| `PRODUCTION_URL` | optional, shown on the deployment |

Also create an environment named `production` (Settings → Environments). You can add
required reviewers there if you want manual approval before each deploy.

### 4. Branch protection (recommended)

Settings → Branches → add rule for `main`: require a pull request and require the
**CI** checks to pass before merging.

### 5. Reverse proxy / HTTPS

Containers listen on `127.0.0.1` only (`web` :3000, `app` :3001, `server` :1337).
Put Caddy or Nginx in front, e.g. `/etc/caddy/Caddyfile`:

```
example.com      { reverse_proxy 127.0.0.1:3000 }
app.example.com  { reverse_proxy 127.0.0.1:3001 }
api.example.com  { reverse_proxy 127.0.0.1:1337 }
```

## Operating on the server

```bash
cd /opt/longrak
set -a; . ./.release.env; set +a      # load the currently deployed image tag
docker compose ps
docker compose logs -f server

# Roll back: set IMAGE_TAG to an older commit SHA
IMAGE_TAG=<old-sha> docker compose up -d
```
