# LR-W0-01 — Analysis job orchestrator (Strapi side)

Strapi owns every job state; n8n only asks. Implements `spec.md` §4–5 for the
`analysis.job.created` flow. Code: `src/automation/`, `src/api/analysis-job/`,
migration `database/migrations/2026.11.20T00.00.00.lr-w0-automation-tables.js`, tests `tests/`.

```
browser ──POST /api/longrak/ai/jobs──▶ Strapi ──(one transaction)──▶ job=queued + outbox row
                                         │
                       dispatcher (poll) ┴──POST envelope──▶ n8n LR-W0-01
n8n ──/internal/automation/*──▶ Strapi  (claim → transition… → finalize | fail → finish)
browser ──GET /api/longrak/ai/jobs/:id[/report]──▶ Strapi (owner check every time)
```

## Configuration (server env)

| Variable | Default | Purpose |
|---|---|---|
| `LONGRAK_N8N_EVENT_WEBHOOK_URL` | — | n8n webhook for `analysis.job.created`. Empty ⇒ jobs stay `queued`. |
| `LONGRAK_N8N_EVENT_WEBHOOK_SECRET` | — | Sent on every delivery. |
| `LONGRAK_N8N_EVENT_WEBHOOK_SECRET_HEADER` | `X-LongRak-Secret` | Header name — must match n8n's "LongRak Dispatcher Webhook Auth" credential. |
| `LONGRAK_INTERNAL_SERVICE_TOKEN` | — | n8n sends `Authorization: Bearer <token>` to `/internal/automation/*`. Empty ⇒ 503. |
| `LONGRAK_OUTBOX_DISPATCHER` | on | `false` disables the poller (e.g. on extra instances; safe to run several). |
| `LONGRAK_OUTBOX_POLL_MS` | 2000 | Poll interval. |
| `LONGRAK_OUTBOX_ACK_TIMEOUT_SECONDS` | 120 | Re-send a delivered event nobody claimed after this. |
| `LONGRAK_OUTBOX_MAX_ATTEMPTS` | 10 | Deliveries before `dead_lettered`. Backoff 15 s × 2ⁿ, cap 15 min, ±20 % jitter. |
| `LONGRAK_AUTOMATION_LEASE_SECONDS` | 900 | Lease per claim; every claim/transition renews it. |
| `LONGRAK_AI_MAX_JOB_ATTEMPTS` | 3 | Processing attempts per job (first run + requeues + resumes). |
| `LONGRAK_AI_MAX_FILES` / `_MAX_FILE_BYTES` / `_MAX_TOTAL_PAGES` | 3 / 15 MB / 30 | spec §5 W0 limits. |
| `LONGRAK_AI_DAILY_JOB_QUOTA` | 3 | Jobs per `usage_quota_bucket` (else per session) per 24 h. |
| `AI_PROVIDER` | — | `mock` = synthetic demo mode (mock AI service + fixtures). Empty in production. |
| `LONGRAK_AI_SERVICE_TOKEN` | — | Bearer token for `/internal/ai/*` (mock). |
| `LONGRAK_PUBLIC_WRITE_LIMIT` / `_READ_LIMIT` | 20 per 10 min / 120 per min | Per-IP, per instance. |

## Public API (owner)

Owner proof on **every** call: `X-LongRak-Session-Secret: <raw secret>` (SHA-256 must equal
`analysis_sessions.session_secret_digest`) **or** `Authorization: Bearer <JWT>` of the account
that claimed the session. Unknown id, someone else's job and an expired session all return the
same `404 {"ok":false,"result":"not_found"}`.

| Call | Result |
|---|---|
| `POST /api/longrak/ai/jobs` `{session_public_id, file_public_ids[], document_type?, language?}` + `Idempotency-Key` header | `202 {job_public_id, processing_state:"queued", status_url, report_url}`. Same key ⇒ same job; same key + other files ⇒ 409. 422 `consent_required` / `FILE_REJECTED{reason}`; 429 `quota_exceeded`. |
| `GET /api/longrak/ai/jobs/:id` | state, timestamps, `error_code`, `report_url` when completed |
| `GET /api/longrak/ai/jobs/:id/report` | completed only (else 409 `report_not_ready`): run id, `document_read_status`, `knowledge_snapshot_key`, report JSON, evidence plan + items |
| `POST /api/longrak/ai/jobs/:id/cancel` | any non-terminal job ⇒ `cancelled` |

Checked before any outbox row: session open and not expired; latest consent for
`document_rights` and `ai_document_processing` is `accepted`; 1–3 files owned by the session,
`upload_state=accepted`, not deleted, PDF/PNG/JPEG, ≤ 15 MB; total pages ≤ 30 (PDF pages from
`file_assets.metadata_safe.page_count`, images count 1; unknown ⇒ rejected); quota.

## Internal API (n8n)

Root path, outside `/api` and outside Strapi roles/API tokens. Every call needs
`Authorization: Bearer`, `X-Request-Id`, `Idempotency-Key`, and — except `/incidents` —
`X-Event-Id` and `X-Workflow-Run-Id` (must match body `event_id` / `workflow_run_id`).
A retry with the same `Idempotency-Key` and body gets the stored answer
(`Idempotent-Replayed: true`); same key, different body ⇒ 422.

| Endpoint | Notes |
|---|---|
| `POST /internal/automation/events/claim` | 200 `{result, lease_token}`: `claimed` (same run asking again gets the same lease) · `already_completed` · `leased_to_other` · `not_eligible`. An expired lease or a requeued event is taken over. Completed/terminal/expired jobs close the event. |
| `POST /internal/automation/analysis-jobs/:id/claim` | 200 `{result: claimed\|not_eligible, processing_state}`. `queued → preprocessing`, `attempt_count+1`. If another run's lease is **dead**, takes over and restarts at `preprocessing` (`resumed_from`). Re-checks expiry, files still accepted, attempts left. |
| `POST …/:id/transition` | Next state only, or skip with exact `passed_through` (recorded as separate history rows). Current state ⇒ `200 {changed:false}`. Backward/invalid ⇒ 422. Cancelled/expired/lease lost ⇒ **409** `{result:"not_eligible"}`. Extra primitive fields (≤120 chars) are kept as metadata. |
| `POST …/:id/finalize` | From `validating` only. Checks cancel/expiry first, then the lease, then that the run belongs to the job, is `running`, has a result, matches `schema_version`, and that the evidence plan belongs to the run. Any `present_in_document` finding without a verified quote ⇒ 422 `GROUNDING_VALIDATION_FAILED`. Then atomically: job `completed`, run `completed`. Replays by the same lease return the same summary. |
| `POST …/:id/fail` | Backend decides. Requeue only if `retryable` **and** the code is transient (`AI_PROVIDER_UNAVAILABLE`, `STAGE_UNAVAILABLE`, `STAGE_ERROR_UNCLASSIFIED`) **and** attempts remain: job → `queued`, event redelivered after backoff. Transient but exhausted ⇒ `failed` + dead-letter. Anything else ⇒ `failed`. |
| `POST /internal/automation/events/finish` | Must match the job (`completed` ⇒ job completed, `requeued` ⇒ job queued …) else 409 `outcome_mismatch`. `emit_event_type` (`analysis.job.completed`/`.failed`) writes one follow-up outbox row. |
| `POST /internal/automation/incidents` | Stored always. Acts (fail/requeue) only if the `workflow_run_id` still holds a live lease on a job. |

Locking: each job operation runs in one transaction with `SELECT … FOR UPDATE` on the job row
plus compare-and-set on `(processing_state, lease_token)`; inbox claims use
`INSERT … ON CONFLICT DO NOTHING` + compare-and-set on the old lease token.

## Dispatcher

Envelope (ids only — no file names, text, PII, URLs) with headers `<secret header>`,
`X-Event-Id`, `X-Request-Id`, `Idempotency-Key: <event_id>`:

```json
{ "event_id": "…", "event_type": "analysis.job.created", "schema_version": "1.0", "occurred_at": "…",
  "request_id": "…", "aggregate_type": "analysis_job", "aggregate_public_id": "…",
  "tenant_public_id": null, "actor_public_id": null, "data": { "job_public_id": "…" } }
```

2xx ⇒ `dispatched`. Re-sent (same `event_id`) when the claimed lease expires without `finish`
(once, then every ack timeout) or when nobody claimed it within the ack timeout. After
`LONGRAK_OUTBOX_MAX_ATTEMPTS` ⇒ `dead_lettered`, and a still-queued job is failed with
`STAGE_UNAVAILABLE` so the user does not wait forever. Replay a dead letter by setting the row
back to `pending` (claims are idempotent).

## Synthetic demo mode: mock AI service + fixtures

**Never with real customer documents.** Enabled only by `AI_PROVIDER=mock`.

- **Mock AI service** (`src/automation/mock-ai.js`), mounted in Strapi at `/internal/ai/jobs/:id/…`
  (`extract`, `apply-rules`, `retrieve-and-analyze`, `validate-and-build-plan`). Auth
  `Authorization: Bearer <LONGRAK_AI_SERVICE_TOKEN>`. It reads no document and calls no model; it
  persists a labelled synthetic run, findings and evidence plan so `/finalize` passes. It refuses
  (403 `STAGE_INPUT_REJECTED`, `not_synthetic`) any job whose files lack `metadata_safe.synthetic=true`.
  Idempotent: one run per job + input fingerprint + prompt version, one plan per run. Business
  outcomes are 200 with a state field; outages are 5xx with `{error_code}`. The real AI service
  will be a separate container — n8n then only changes the AI base URL.
- **Fixtures** (`scripts/lr-fixture.js`), run with the server's environment (same database). The
  running server's dispatcher delivers the event within `LONGRAK_OUTBOX_POLL_MS`:

  ```bash
  npm run fixture -w server -- list                     # local (server/.env)
  npm run fixture -w server -- happy
  npm run fixture -w server -- status <job_public_id>   # state, history, outbox, inbox
  docker compose exec server node scripts/lr-fixture.js happy   # in Docker
  ```

  | Scenario | Expected end |
  |---|---|
  | `happy` | completed |
  | `file_rejected` | extract `rejected` → fail `FILE_REJECTED` → failed |
  | `unreadable` | extract `unreadable` → fail `DOCUMENT_UNREADABLE` → failed |
  | `retryable_then_valid` | attempt 1: analyze 503 `AI_PROVIDER_UNAVAILABLE` → fail(retryable) → requeued; redelivered after ~15 s backoff → attempt 2 completed |
  | `model_invalid_twice` | validate `invalid` twice (incl. regenerate) → fail `MODEL_OUTPUT_INVALID` → failed |
  | `grounding_fail_at_finalize` | validate `valid` but an unverified quote is stored → finalize 422 `GROUNDING_VALIDATION_FAILED` → failed |
  | `cancelled_mid_run` | job cancelled during analyze → next transition 409 `not_eligible` → stop; job cancelled (event closes on the next claim after the lease expires) |
  | `duplicate_event` | the fixture itself sends the same `event_id` twice at once (the dispatcher does not send a third) → one execution claimed, the other `leased_to_other`; completed once |

  `tests/synthetic-e2e.test.js` drives all of them through the same calls the n8n workflow makes.

## Exposing the internal routes to n8n

n8n (Hostinger) must reach `/internal/automation/*` and `/internal/ai/*`; nothing else of Strapi
needs to be reachable from it. `deploy/Caddyfile.internal.example`: a dedicated host that proxies
only those paths and only from the n8n host's IP, and a public API host that answers 404 on
`/internal/*`. If n8n and Strapi end up on the same machine, use the Docker network instead
(`http://server:1337`) and expose nothing.

## Migration notes (new tables)

All created by `2026.11.20T00.00.00.lr-w0-automation-tables.js` (knex schema builder; runs on
PostgreSQL and SQLite, idempotent). No Content API routes exist for any of them.

| Table | Origin | Notes |
|---|---|---|
| `lr_domain_outbox_events` | ERD `domain_outbox_events` (W1) promoted to W0 per spec §4.4 | ERD columns unchanged; `id` = envelope `event_id`. Added: `schema_version`, `request_id`, `tenant_public_id`, `actor_public_id`, `delivery_state` (pending/dispatched/completed/dead_lettered), `next_attempt_at`, `last_attempt_at`, `last_error_code`, `completed_at`, `dispatch_lock_token`, `dispatch_lock_until`. |
| `lr_automation_event_inbox` | spec §4.4 | Spec columns + `lease_token` (unique), `workflow_run_id`, `claim_count`, `created_at`. States: claimed/completed/failed/requeued/skipped/dead_lettered. |
| `lr_automation_delivery_attempts` | spec §4.4 | Exactly the spec columns. Unused until LR-SH-02. |
| `lr_analysis_job_state_events` | new | Append-only job state history (needed for `passed_through`). |
| `lr_automation_idempotency_keys` | new | Stored internal API answers per Idempotency-Key, 7-day TTL (cleaned by the dispatcher). |
| `lr_automation_incidents` | new | Sanitised LR-SH-01 incidents + decision taken. |

Strapi content type changes (applied by schema sync): `analysis_jobs` + `last_error_code`,
`lease_token` (private), `workflow_run_id` (private), DB-unique `idempotency_key_hash`;
`file_assets` + `analysis_session` (owner session, ERD "owner session/project/party").

## Tests

```bash
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/longrak_test npm test -w server
```

Use an **empty, disposable** database. Without `TEST_DATABASE_URL` only the state-machine unit
tests run (DB suites show `# SKIP`). CI runs everything against `pgvector/pgvector:pg17`.

## Spec conflicts found (not silently resolved — please decide)

1. **File limits.** `context.md` says 1–3 files, **10 MB**/file, **20 pages**; `spec.md` §5 says **15 MB / 30 pages**. Implemented spec values (configurable). The website's current `/api/ai-check` still enforces 10 MB.
2. **State machine.** ERD allows `cancelled` only from `queued`, `failed` only from preprocessing/extracting/model_call/validating, `expired` only from `completed`. The task (finalize-after-cancel, expiry mid-run) and spec §11.2 need cancel/expire from any non-terminal state and fail from any processing state. Implemented the wider set.
3. **Resume semantics** after a dead lease aren't specified. Implemented: the new run restarts at `preprocessing` (AI-service stages must be idempotent per spec §4.5) and it counts as an attempt.
4. **`error_code` vs `last_error_code`.** The ERD has `error_code`; the task asks for `last_error_code`. Kept both: `error_code` = terminal failure shown to the user, `last_error_code` = most recent attempt's error (also after requeue).
5. **Unique `(session, idempotency_key_hash)`.** Strapi keeps relations in a join table, so it is enforced as a DB-unique `sha256(session_public_id:key)` — same effect.
6. **Finalize inputs without a home.** `validated_result_ref` and `validation_state` have no ERD column; they're kept only in the job history metadata. Add columns to `analysis_runs` if they must be queryable.
7. **`unverifiable_claim_count`** is undefined in the spec. Implemented as `present_in_document` findings with `source_quote_verified=false`, and finalize refuses when it is > 0.
8. **No upload/scan pipeline or session creation exists.** Nothing sets `upload_state=accepted`, `metadata_safe.page_count` or `session_secret_digest` yet, so `POST /jobs` is usable only once that service exists. Meanwhile the live website sends files straight to n8n (`web/server/api/ai-check.post.ts`), which contradicts spec §0/§2 ("n8n carries references, not files").
9. **Envelope `tenant_public_id` / `actor_public_id`** are always `null` in W0 (users-permissions users have no `public_id`).
10. **Quota bucket.** Spec: "3 anonymous uses per IP risk bucket per day". Nothing fills `usage_quota_bucket` yet ⇒ the quota is per session until it does.
11. **Consent purpose codes** aren't defined in the ERD; uses `document_rights` + `ai_document_processing` (as the website already records).
12. **Follow-up events** (`analysis.job.completed` / `.failed`) have no W0 consumer; they are stored but stay `pending` until a route is configured.
13. **Replay window** (spec §4.2 "timestamp/replay window") is not enforced: the contract has no signed timestamp. Idempotency keys + lease fencing cover duplicates; add HMAC + timestamp at the gateway if needed.
14. **Header name** of the n8n "LongRak Dispatcher Webhook Auth" credential is not in the spec — default `X-LongRak-Secret`; confirm in n8n.
