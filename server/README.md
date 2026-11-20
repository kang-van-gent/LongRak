# LongRak — Strapi 5 API (database W0)

Built from [`longrak-database-er-strapi.md`](longrak-database-er-strapi.md), **Phase W0 only** (§18: website,
leads, privacy/consent, AI document checker, curated RAG, evaluation). Projects, agreements, milestones,
payments and billing (W1–W3) are intentionally not created yet.

## What's here

| Area | Content types (`src/api/*`) | Public read? |
|---|---|---|
| Website CMS (th + en) | `site-setting`, `web-page`, `faq-item`, `blog-post`, `plan-catalog`, `demo-sample-case` | yes (plans/samples: `active` only) |
| Leads | `lead`, `pilot-application` | no |
| Privacy | `policy-version`, `consent-receipt`, `retention-policy` | no |
| AI checker | `analysis-session`, `analysis-job`, `analysis-input`, `file-asset`, `analysis-run`, `analysis-finding`, `finding-citation`, `recommended-action`, `analysis-feedback`, `evidence-plan-draft`, `evidence-plan-item` | no |
| Knowledge & rules | `kb-source`, `kb-source-version`, `kb-snapshot`, `risk-rule`, `risk-rule-version`, `prompt-template-version`, `model-catalog`, `evaluation-case`, `evaluation-run` | no |

- Tables are prefixed `lr_`. Every business record gets a server-generated `public_id` (UUID) — see `src/index.js`.
- Draft & Publish is on only for `web-page`, `faq-item`, `blog-post`; everything else uses its own state field.
- **Custom SQL tables** (not Strapi types): `database/migrations/2026.11.17T00.00.00.lr-w0-sql-tables.js` — extracted
  pages/fields, KB chunks + snapshot members, retrieval traces, rule executions, evaluation results, AI-call
  metadata, anonymous analytics, abuse events. PostgreSQL only. `lr_kb_embeddings` (pgvector) is created only
  when `KB_EMBEDDING_DIMENSIONS` is set — the embedding model is still an open decision (§20).
  Docker Compose uses the `pgvector/pgvector:pg17` image for this.
- **Seed** (`src/seed/`): on first start, empty tables get the website's current copy — site settings, 6 FAQs,
  3 plans (Early Access hypotheses), the fictional kitchen sample — plus 3 **draft** retention policies with no
  period set. Set `LONGRAK_SEED=false` to skip.

## Endpoints

| Route | Who | What |
|---|---|---|
| `POST /api/longrak/leads` | website server (API token) | contact form + "request a project" → lead, consent receipt (+ pilot application for contractors) |
| `POST /api/longrak/ai/checks` | website server (API token) | saves one document check: session (with the email), 3 consents, job, file fingerprints, run, findings, citations, suggested actions |
| `POST /api/longrak/ai/claim` | signed-in app user (JWT) | links every unclaimed check made with the account's email to the account |
| `GET /api/longrak/ai/my-checks` | signed-in app user (JWT) | the account's claimed checks with their reports |

All generated CRUD for private types is closed to Public/Authenticated. n8n or admin tooling that needs to write
other records (e.g. KB sources, evaluation runs) should use its own API token with only those permissions.

## Setup

1. Start Strapi and create the admin user.
2. **Website token:** Settings → API Tokens → Create → type **Custom**, duration unlimited, permissions:
   *Lead → submit* and *Analysis-session → record* — nothing else. Put it in the root `.env` as
   `STRAPI_WEBSITE_TOKEN` (the web container gets it as `NUXT_STRAPI_TOKEN`).
3. **Email confirmation (required before the app goes live):** Settings → Users & Permissions → Advanced →
   *Enable email confirmation*, and configure an email provider. `claim` refuses unconfirmed accounts, so nobody
   can sign up with someone else's email and read their checks.
4. Before accepting real customer files: add the active `policy-version` texts (privacy, document_processing —
   consent receipts pin their SHA-256 automatically) and set real `retention-policy` periods (`analysis_results`
   sets `expires_at` on saved checks once active).

## How the future project app uses this

The website asks for the email **before** upload and saves every check with it (the email is never sent to the AI).
When the app is built: after a user signs up with email + password and confirms the email, call
`POST /api/longrak/ai/claim` once, then `GET /api/longrak/ai/my-checks` to show their earlier results and start a
project from one. `lead.related_analysis_public_id` also links each project request to the exact check.

## Commands

```
npm run develop   # dev with auto-reload (admin + Content-Type Builder)
npm run start     # production
npm run build     # build the admin panel
```

---

# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
