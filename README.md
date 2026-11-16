# LongRak

Monorepo using npm workspaces.

| Workspace | Stack | Dev port |
|---|---|---|
| `server` | Strapi 5 (API / CMS) | 1337 |
| `web` | Nuxt 4 | 3000 |
| `app` | Nuxt 4 | 3001 |

## Requirements

- Node 22 (`nvm use`)
- Docker (for the database / full stack)

## Local development

```bash
npm install            # installs every workspace (single root lockfile)
npm run docker:db      # start only Postgres in Docker (needs root .env)
npm run dev            # server + web + app together
```

Run one workspace: `npm run dev:server`, `npm run dev:web`, `npm run dev:app`.
Add a dependency to one workspace: `npm install <pkg> -w web`.

`server/.env` is used when Strapi runs outside Docker (see `server/.env.example`).

## Full stack in Docker

```bash
cp .env.example .env   # fill in secrets
npm run docker:up      # docker compose up -d --build
npm run docker:logs
npm run docker:down
```

## CI/CD

See [deploy/README.md](deploy/README.md).
