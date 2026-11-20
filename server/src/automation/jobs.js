'use strict';

/**
 * LR-W0-01 analysis job service — Strapi owns every state change; n8n only asks.
 *
 * Every operation returns `{ status, body }` (HTTP status + JSON body) so the public and the
 * internal controllers stay thin. Bodies contain ids, states and codes only.
 *
 * Fencing: an n8n run may change a job only while it holds the job's lease — the inbox row
 * whose lease_token equals analysis_jobs.lease_token, still `claimed` and not expired, with the
 * same workflow_run_id. Lost lease, cancelled or expired ⇒ 409 { result: "not_eligible" }.
 */
const { randomUUID } = require('node:crypto');
const {
  PROCESSING, TERMINAL, ERROR_CODES, RETRYABLE_CODES, EVENT_TYPES, EMITTABLE, TABLES, JOB_UID, SESSION_UID, RUN_UID,
} = require('./constants');
const { planTransition, backoffMs } = require('./state-machine');
const createRepo = require('./repo');
const { sha256, safeEqual, isPast, iso } = createRepo;
const automationConfig = require('./config');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOC_KINDS = new Set(['quotation', 'contract', 'boq', 'milestone_schedule', 'drawing', 'receipt', 'change_order', 'other']);
const JOB_TYPE = { quotation: 'quotation_check', contract: 'pre_contract_check', boq: 'boq_check', milestone_schedule: 'milestone_check' };
const ACCEPTED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const REQUIRED_CONSENTS = ['document_rights', 'ai_document_processing'];

const ok = (body, status = 200) => ({ status, body });
const notEligible = (extra = {}) => ({ status: 409, body: { ok: false, result: 'not_eligible', error_code: 'JOB_NOT_ELIGIBLE', ...extra } });
const invalid = (status, result, extra = {}) => ({ status, body: { ok: false, result, ...extra } });
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Keep only small primitive values — metadata must never carry document text. */
function safeMetadata(input, skip) {
  const out = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (skip.has(key) || !/^[a-z0-9_]{1,40}$/i.test(key) || Object.keys(out).length >= 20) continue;
    if (typeof value === 'number' || typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'string' && value.length <= 120) out[key] = value;
  }
  return out;
}

function sessionGone(session, now) {
  return !session
    || ['expired', 'deleted'].includes(session.session_state)
    || !!session.deletion_requested_at
    || isPast(session.expires_at, now);
}

module.exports = function createJobService(strapi) {
  const repo = createRepo(strapi);
  const cfg = automationConfig;
  const leaseSeconds = () => cfg().leaseSeconds;

  // --------------------------------------------------------------------------------------
  // shared steps
  // --------------------------------------------------------------------------------------

  /** Move a non-terminal job to `expired` and invalidate unfinished runs (nothing published). */
  async function expireJob(k, job, now, meta = {}) {
    if (TERMINAL.has(job.processing_state)) return;
    if (await repo.casJob(job, { processing_state: job.processing_state }, { processing_state: 'expired', finished_at: now, error_code: 'JOB_NOT_ELIGIBLE' })) {
      await repo.setRunsState(job, ['running'], 'invalidated');
      await repo.recordJobEvent(k, { job_public_id: job.public_id, from_state: job.processing_state, to_state: 'expired', reason: 'expire', error_code: 'JOB_NOT_ELIGIBLE', ...meta, at: now });
    }
  }

  /**
   * Common gate for transition / finalize / fail: cancelled, expired (job or session TTL) or a
   * lease this run no longer holds ⇒ not eligible. Returns null when the caller may proceed.
   */
  async function gate(k, job, leaseToken, workflowRunId, now, meta) {
    const state = job.processing_state;
    if (state === 'cancelled' || state === 'expired') return notEligible({ processing_state: state });
    if (sessionGone(job.analysis_session, now) || isPast(job.expires_at, now)) {
      await expireJob(k, job, now, meta);
      return notEligible({ processing_state: 'expired' });
    }
    if (TERMINAL.has(state)) return notEligible({ processing_state: state });
    if (!leaseToken || job.lease_token !== leaseToken || job.workflow_run_id !== workflowRunId) return notEligible({ processing_state: state });
    const lease = await repo.liveLease(k, job, now);
    if (!lease || lease.workflow_run_id !== workflowRunId) return notEligible({ processing_state: state });
    return null;
  }

  /** Re-read the job under a row lock inside the current transaction. */
  async function lockedJob(k, publicId) {
    const found = await repo.findJob(publicId);
    if (!found) return null;
    await repo.lockJobRow(k, found.id);
    return repo.findJob(publicId);
  }

  /**
   * Fail or requeue a job the caller holds the lease on, and settle its event so the dispatcher
   * redelivers it (requeue) or stops (terminal). Backend decides; n8n's `retryable` is advisory.
   */
  async function applyFailure(k, job, f, now) {
    const c = cfg();
    const transient = RETRYABLE_CODES.has(f.error_code);
    const canRetry = f.retryable === true && transient && job.attempt_count < c.maxJobAttempts;
    const from = job.processing_state;
    const lease = await repo.getInboxByLease(k, job.lease_token);
    const metadata = { stage: str(f.stage, 40), http_status: Number.isInteger(f.http_status) ? f.http_status : null, source: f.source };
    const base = { job_public_id: job.public_id, workflow_run_id: f.workflow_run_id, event_id: lease?.event_id ?? null, request_id: f.request_id, error_code: f.error_code, metadata_safe: metadata };

    if (canRetry) {
      if (!(await repo.casJob(job, { processing_state: from, lease_token: job.lease_token }, {
        processing_state: 'queued', lease_token: null, workflow_run_id: null, last_error_code: f.error_code, error_code: null,
      }))) return notEligible({ processing_state: from });
      await repo.recordJobEvent(k, { ...base, from_state: from, to_state: 'failed', reason: 'fail', at: now });
      await repo.recordJobEvent(k, { ...base, from_state: 'failed', to_state: 'queued', reason: 'requeue', at: now });
      if (lease) {
        await k(TABLES.inbox).where({ event_id: lease.event_id, consumer_name: lease.consumer_name })
          .update({ processing_state: 'requeued', last_error_code: f.error_code, updated_at: now });
        await k(TABLES.outbox).where({ id: lease.event_id }).update({
          delivery_state: 'pending', next_attempt_at: new Date(now.getTime() + backoffMs(job.attempt_count)), last_error_code: f.error_code,
          dispatch_lock_token: null, dispatch_lock_until: null,
        });
      }
      return ok({ job_public_id: job.public_id, processing_state: 'queued', error_code: f.error_code, requeued: true });
    }

    const deadLetter = f.retryable === true && transient; // wanted a retry but attempts are used up
    if (!(await repo.casJob(job, { processing_state: from, lease_token: job.lease_token }, {
      processing_state: 'failed', error_code: f.error_code, last_error_code: f.error_code, finished_at: now,
    }))) return notEligible({ processing_state: from });
    await repo.setRunsState(job, ['running'], 'failed');
    await repo.recordJobEvent(k, { ...base, from_state: from, to_state: 'failed', reason: deadLetter ? 'dead_letter' : 'fail', at: now });
    if (lease) await repo.closeEvent(k, lease.event_id, lease.consumer_name, deadLetter ? 'dead_lettered' : 'failed', now, f.error_code);
    if (deadLetter) strapi.log.warn(`[automation] job ${job.public_id} dead-lettered after ${job.attempt_count} attempts (${f.error_code})`);
    return ok({ job_public_id: job.public_id, processing_state: 'failed', error_code: f.error_code, requeued: false, dead_lettered: deadLetter });
  }

  /** Files of a job must still be accepted, not deleted (re-checked when n8n claims). */
  async function inputsStillAccepted(job) {
    const inputs = await strapi.db.query('api::analysis-input.analysis-input').findMany({
      where: { analysis_job: { id: job.id } },
      populate: { file_asset: { select: ['upload_state', 'deleted_at'] } },
    });
    return inputs.length > 0 && inputs.every((i) => i.file_asset?.upload_state === 'accepted' && !i.file_asset.deleted_at);
  }

  // --------------------------------------------------------------------------------------
  // public (owner) side
  // --------------------------------------------------------------------------------------

  /** Owner = holder of the session secret, or the signed-in user who claimed the session. */
  function ownsSession(session, owner) {
    if (!session) return false;
    const bySecret = !!owner.secret && !!session.session_secret_digest && safeEqual(sha256(owner.secret), session.session_secret_digest);
    const byUser = !!owner.userId && session.claimed_by?.id === owner.userId;
    return bySecret || byUser;
  }

  /**
   * Job for its owner, else null. Unknown id, someone else's job and an expired session all
   * give the same null ⇒ the same 404, so ids can't be probed (spec T09).
   */
  async function ownedJob(publicId, owner, now = new Date()) {
    const job = await repo.findJob(publicId);
    const session = job?.analysis_session;
    const owned = ownsSession(session, owner); // always evaluated: similar timing for all cases
    if (!job || !owned || sessionGone(session, now)) return null;
    return job;
  }

  async function createJob(input, owner) {
    const c = cfg();
    const now = new Date();
    const sessionPublicId = str(input.session_public_id, 36);
    const key = str(input.idempotency_key, 200);
    if (!sessionPublicId || !UUID_RE.test(sessionPublicId)) return invalid(400, 'invalid_request', { field: 'session_public_id' });
    if (!key) return invalid(400, 'invalid_request', { field: 'idempotency_key' });
    const fileIds = Array.isArray(input.file_public_ids) ? [...new Set(input.file_public_ids.map(String))] : [];
    if (fileIds.some((id) => !UUID_RE.test(id))) return invalid(400, 'invalid_request', { field: 'file_public_ids' });
    const documentKind = DOC_KINDS.has(input.document_type) ? input.document_type : 'other';
    const language = input.language === 'en' ? 'en' : 'th';

    const session = await strapi.db.query(SESSION_UID).findOne({
      where: { public_id: sessionPublicId },
      populate: { claimed_by: { select: ['id'] }, consent_receipts: { select: ['purpose_code', 'choice', 'captured_at'] } },
    });
    const owned = ownsSession(session, owner);
    if (!session || !owned || sessionGone(session, now)) return invalid(404, 'not_found');

    // idempotent replay: same key in this session ⇒ same job (different files ⇒ conflict)
    const keyHash = sha256(`${session.public_id}:${key}`);
    const replay = async () => {
      const existing = await strapi.db.query(JOB_UID).findOne({
        where: { idempotency_key_hash: keyHash },
        populate: { analysis_inputs: { populate: { file_asset: { select: ['public_id'] } } } },
      });
      if (!existing) return null;
      const same = existing.analysis_inputs.map((i) => i.file_asset?.public_id).sort().join() === [...fileIds].sort().join();
      if (!same) return invalid(409, 'idempotency_key_reused');
      return ok(accepted(existing), 202);
    };
    const prior = await replay();
    if (prior) return prior;

    // consent: latest choice per purpose must be "accepted"
    const latest = new Map();
    for (const r of [...(session.consent_receipts ?? [])].sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at))) latest.set(r.purpose_code, r.choice);
    if (REQUIRED_CONSENTS.some((p) => latest.get(p) !== 'accepted')) return invalid(422, 'consent_required', { required: REQUIRED_CONSENTS });

    // files: 1–N, owned by this session, accepted, size and page limits (before any outbox event)
    if (fileIds.length < 1 || fileIds.length > c.limits.maxFiles) return invalid(422, 'FILE_REJECTED', { reason: 'file_count', max_files: c.limits.maxFiles });
    const files = await strapi.db.query('api::file-asset.file-asset').findMany({
      where: { public_id: { $in: fileIds }, analysis_session: { id: session.id } },
    });
    if (files.length !== fileIds.length) return invalid(422, 'FILE_REJECTED', { reason: 'file_not_found' });
    let pages = 0;
    for (const f of files) {
      if (f.upload_state !== 'accepted' || f.deleted_at) return invalid(422, 'FILE_REJECTED', { reason: 'file_not_accepted', file_public_id: f.public_id });
      if (!ACCEPTED_MIME.has(f.mime_detected)) return invalid(422, 'FILE_REJECTED', { reason: 'unsupported_type', file_public_id: f.public_id });
      if (!(Number(f.byte_size) > 0) || Number(f.byte_size) > c.limits.maxFileBytes) return invalid(422, 'FILE_REJECTED', { reason: 'file_too_large', file_public_id: f.public_id, max_file_bytes: c.limits.maxFileBytes });
      const meta = typeof f.metadata_safe === 'string' ? JSON.parse(f.metadata_safe) : f.metadata_safe;
      const count = f.mime_detected === 'application/pdf' ? meta?.page_count : 1;
      if (!Number.isInteger(count) || count < 1) return invalid(422, 'FILE_REJECTED', { reason: 'page_count_unknown', file_public_id: f.public_id });
      pages += count;
    }
    if (pages > c.limits.maxTotalPages) return invalid(422, 'FILE_REJECTED', { reason: 'page_limit', max_total_pages: c.limits.maxTotalPages });

    // quota: jobs per usage bucket (or per session) in the last 24 h
    const since = new Date(now.getTime() - 86400000);
    const used = await strapi.db.query(JOB_UID).count({
      where: { createdAt: { $gt: since }, analysis_session: session.usage_quota_bucket ? { usage_quota_bucket: session.usage_quota_bucket } : { id: session.id } },
    });
    if (used >= c.limits.dailyJobQuota) return invalid(429, 'quota_exceeded', { daily_quota: c.limits.dailyJobQuota });

    try {
      const job = await repo.tx(async (k) => {
        const created = await strapi.documents(JOB_UID).create({
          data: {
            job_type: JOB_TYPE[documentKind] ?? 'pre_contract_check',
            processing_state: 'queued',
            queued_at: now,
            attempt_count: 0,
            idempotency_key_hash: keyHash,
            requested_language: language,
            expires_at: session.expires_at,
            analysis_session: { connect: [{ documentId: session.documentId }] },
          },
        });
        const ordered = fileIds.map((id) => files.find((f) => f.public_id === id));
        for (const [i, f] of ordered.entries()) {
          await strapi.documents('api::analysis-input.analysis-input').create({
            data: {
              document_kind: documentKind, sequence_no: i + 1, extraction_state: 'pending', redaction_state: 'pending',
              page_count: f.mime_detected === 'application/pdf' ? (typeof f.metadata_safe === 'string' ? JSON.parse(f.metadata_safe) : f.metadata_safe).page_count : 1,
              analysis_job: { connect: [{ documentId: created.documentId }] },
              file_asset: { connect: [{ documentId: f.documentId }] },
            },
          });
        }
        await repo.insertOutbox(k, {
          event_type: EVENT_TYPES.jobCreated,
          aggregate_type: 'analysis_job',
          aggregate_public_id: created.public_id,
          request_id: input.request_id,
          payload: { job_public_id: created.public_id },
          idempotency_key: `${EVENT_TYPES.jobCreated}:${created.public_id}`,
        });
        await repo.recordJobEvent(k, { job_public_id: created.public_id, to_state: 'queued', reason: 'created', request_id: input.request_id, at: now });
        await strapi.db.query(SESSION_UID).update({ where: { id: session.id }, data: { session_state: 'processing', file_count: files.length } });
        return created;
      });
      return ok(accepted(job), 202);
    }
    catch (err) {
      // a concurrent request with the same key won the unique index ⇒ answer like a replay
      const raced = await replay();
      if (raced) return raced;
      throw err;
    }
  }

  function accepted(job) {
    const statusUrl = `/api/longrak/ai/jobs/${job.public_id}`;
    return { job_public_id: job.public_id, processing_state: job.processing_state, status_url: statusUrl, report_url: `${statusUrl}/report` };
  }

  async function jobStatus(publicId, owner) {
    const job = await ownedJob(publicId, owner);
    if (!job) return invalid(404, 'not_found');
    return ok({
      job_public_id: job.public_id,
      job_type: job.job_type,
      processing_state: job.processing_state,
      queued_at: iso(job.queued_at),
      started_at: iso(job.started_at),
      finished_at: iso(job.finished_at),
      error_code: job.error_code ?? null,
      report_url: job.processing_state === 'completed' ? `/api/longrak/ai/jobs/${job.public_id}/report` : null,
    });
  }

  async function jobReport(publicId, owner) {
    const job = await ownedJob(publicId, owner);
    if (!job) return invalid(404, 'not_found');
    if (job.processing_state !== 'completed') return invalid(409, 'report_not_ready', { processing_state: job.processing_state });
    const run = await strapi.db.query(RUN_UID).findOne({
      where: { analysis_job: { id: job.id }, run_state: 'completed' },
      orderBy: { run_no: 'desc' },
      populate: { evidence_plan_drafts: { populate: { evidence_plan_items: true } } },
    });
    if (!run) return invalid(409, 'report_not_ready', { processing_state: job.processing_state });
    const plan = (run.evidence_plan_drafts ?? []).find((p) => p.generation_state !== 'discarded');
    return ok({
      job_public_id: job.public_id,
      analysis_run_public_id: run.public_id,
      schema_version: run.schema_version,
      document_read_status: run.document_read_status ?? null,
      knowledge_snapshot_key: run.knowledge_snapshot_key ?? null,
      report: typeof run.result_json_private === 'string' ? JSON.parse(run.result_json_private) : run.result_json_private,
      evidence_plan: plan ? {
        public_id: plan.public_id,
        title: plan.plan_title ?? null,
        items: (plan.evidence_plan_items ?? []).map((it) => {
          const { id, documentId, createdAt, updatedAt, publishedAt, locale, ...rest } = it; // eslint-disable-line no-unused-vars
          return rest;
        }),
      } : null,
    });
  }

  /** Cancel any non-terminal job (row-locked). Later finalize/transition get 409 not_eligible. */
  function cancelUnchecked(publicId, reason = 'cancel') {
    const now = new Date();
    return repo.tx(async (k) => {
      const current = await lockedJob(k, publicId);
      if (!current) return invalid(404, 'not_found');
      if (current.processing_state === 'cancelled') return ok({ job_public_id: publicId, processing_state: 'cancelled' });
      if (TERMINAL.has(current.processing_state)) return invalid(409, 'not_cancellable', { processing_state: current.processing_state });
      if (!(await repo.casJob(current, { processing_state: current.processing_state }, { processing_state: 'cancelled', finished_at: now }))) {
        return invalid(409, 'not_cancellable', { processing_state: (await repo.findJob(publicId)).processing_state });
      }
      await repo.setRunsState(current, ['running'], 'invalidated');
      await repo.recordJobEvent(k, { job_public_id: publicId, from_state: current.processing_state, to_state: 'cancelled', reason, at: now });
      return ok({ job_public_id: publicId, processing_state: 'cancelled' });
    });
  }

  /** Owner cancels a job that has not finished. */
  async function cancelJob(publicId, owner) {
    const job = await ownedJob(publicId, owner);
    if (!job) return invalid(404, 'not_found');
    return cancelUnchecked(publicId);
  }

  // --------------------------------------------------------------------------------------
  // internal (n8n) side
  // --------------------------------------------------------------------------------------

  /** POST /internal/automation/events/claim — dedupe + lease an event for one consumer. */
  async function claimEvent(b, meta) {
    const now = new Date();
    for (const f of ['event_id', 'aggregate_public_id']) if (!UUID_RE.test(b[f] ?? '')) return invalid(400, 'invalid_request', { field: f });
    const consumer = str(b.consumer_name, 80);
    const runId = str(b.workflow_run_id, 120);
    if (!consumer || !runId || !str(b.event_type, 80)) return invalid(400, 'invalid_request');

    return repo.tx(async (k) => {
      const ev = await repo.getOutbox(k, b.event_id);
      if (!ev || ev.event_type !== b.event_type || ev.aggregate_public_id !== b.aggregate_public_id) return ok({ result: 'not_eligible', lease_token: null });

      // the aggregate decides whether there is anything left to do
      if (ev.aggregate_type === 'analysis_job' && ev.event_type === EVENT_TYPES.jobCreated) {
        const job = await repo.findJob(ev.aggregate_public_id);
        const state = job?.processing_state;
        if (job && !TERMINAL.has(state) && (sessionGone(job.analysis_session, now) || isPast(job.expires_at, now))) {
          await repo.lockJobRow(k, job.id);
          await expireJob(k, job, now, { event_id: ev.id, workflow_run_id: runId, request_id: meta.requestId });
          await repo.closeEvent(k, ev.id, consumer, 'skipped', now, 'JOB_NOT_ELIGIBLE');
          return ok({ result: 'not_eligible', lease_token: null, processing_state: 'expired' });
        }
        if (state === 'completed') {
          await repo.closeEvent(k, ev.id, consumer, 'completed', now);
          return ok({ result: 'already_completed', lease_token: null, processing_state: state });
        }
        if (!job || TERMINAL.has(state)) {
          await repo.closeEvent(k, ev.id, consumer, 'skipped', now, 'JOB_NOT_ELIGIBLE');
          return ok({ result: 'not_eligible', lease_token: null, processing_state: state ?? null });
        }
      }

      const leaseToken = randomUUID();
      const leaseUntil = new Date(now.getTime() + leaseSeconds() * 1000);
      await k(TABLES.inbox)
        .insert({ event_id: ev.id, consumer_name: consumer, processing_state: 'claimed', lease_token: leaseToken, lease_expires_at: leaseUntil, workflow_run_id: runId, claim_count: 1, created_at: now, updated_at: now })
        .onConflict(['event_id', 'consumer_name'])
        .ignore();
      const row = await repo.getInbox(k, ev.id, consumer);
      if (row.lease_token === leaseToken) return ok({ result: 'claimed', lease_token: leaseToken, lease_expires_at: leaseUntil.toISOString() });

      if (row.processing_state === 'completed') return ok({ result: 'already_completed', lease_token: null });
      if (['failed', 'skipped', 'dead_lettered'].includes(row.processing_state)) return ok({ result: 'not_eligible', lease_token: null });

      const alive = row.processing_state === 'claimed' && !isPast(row.lease_expires_at, now);
      if (alive && row.workflow_run_id === runId) { // same run asking again ⇒ same lease
        await repo.renewLease(k, row.lease_token, now, leaseSeconds());
        return ok({ result: 'claimed', lease_token: row.lease_token, lease_expires_at: leaseUntil.toISOString() });
      }
      if (alive) return ok({ result: 'leased_to_other', lease_token: null });

      // lease expired (run died) or event requeued ⇒ take it over, fenced on the old token
      const took = await k(TABLES.inbox)
        .where({ event_id: ev.id, consumer_name: consumer, processing_state: row.processing_state })
        .andWhere((q) => (row.lease_token ? q.where('lease_token', row.lease_token) : q.whereNull('lease_token')))
        .update({ processing_state: 'claimed', lease_token: leaseToken, lease_expires_at: leaseUntil, workflow_run_id: runId, claim_count: row.claim_count + 1, updated_at: now, processed_at: null });
      if (!took) return ok({ result: 'leased_to_other', lease_token: null });
      return ok({ result: 'claimed', lease_token: leaseToken, lease_expires_at: leaseUntil.toISOString() });
    });
  }

  /** POST /internal/automation/analysis-jobs/:id/claim — queued → preprocessing (or resume). */
  async function claimJob(publicId, b, meta) {
    const now = new Date();
    if (!UUID_RE.test(b.event_id ?? '') || !UUID_RE.test(b.lease_token ?? '') || !str(b.workflow_run_id, 120)) return invalid(400, 'invalid_request');
    const c = cfg();

    return repo.tx(async (k) => {
      const lease = await k(TABLES.inbox).where({ event_id: b.event_id, lease_token: b.lease_token }).first();
      const ev = await repo.getOutbox(k, b.event_id);
      if (!lease || lease.processing_state !== 'claimed' || isPast(lease.lease_expires_at, now) || lease.workflow_run_id !== b.workflow_run_id
        || !ev || ev.aggregate_public_id !== publicId) return ok({ result: 'not_eligible', processing_state: null });

      const job = await lockedJob(k, publicId);
      if (!job) return ok({ result: 'not_eligible', processing_state: null });
      const state = job.processing_state;
      const base = { job_public_id: publicId, workflow_run_id: b.workflow_run_id, event_id: b.event_id, request_id: meta.requestId, at: now };

      // same lease asking again ⇒ idempotent
      if (job.lease_token === b.lease_token && PROCESSING.has(state)) {
        await repo.renewLease(k, b.lease_token, now, c.leaseSeconds);
        return ok({ result: 'claimed', processing_state: state, job_public_id: publicId, attempt_count: job.attempt_count });
      }
      if (TERMINAL.has(state)) return ok({ result: 'not_eligible', processing_state: state });
      if (sessionGone(job.analysis_session, now) || isPast(job.expires_at, now)) {
        await expireJob(k, job, now, base);
        return ok({ result: 'not_eligible', processing_state: 'expired' });
      }

      let resumedFrom = null;
      if (PROCESSING.has(state)) {
        // another run holds it: only take over when that lease is dead (n8n restart, spec T19)
        if (await repo.liveLease(k, job, now)) return ok({ result: 'not_eligible', processing_state: state });
        resumedFrom = state;
      }

      if (job.attempt_count >= c.maxJobAttempts) {
        const out = await applyFailure(k, job, { error_code: 'STAGE_UNAVAILABLE', retryable: true, source: 'attempts_exhausted', workflow_run_id: b.workflow_run_id, request_id: meta.requestId }, now);
        await repo.closeEvent(k, b.event_id, lease.consumer_name, 'dead_lettered', now, 'STAGE_UNAVAILABLE');
        return ok({ result: 'not_eligible', processing_state: out.body.processing_state ?? 'failed' });
      }
      if (!(await inputsStillAccepted(job))) {
        await applyFailure(k, job, { error_code: 'FILE_REJECTED', retryable: false, source: 'claim_recheck', workflow_run_id: b.workflow_run_id, request_id: meta.requestId }, now);
        await repo.closeEvent(k, b.event_id, lease.consumer_name, 'failed', now, 'FILE_REJECTED');
        return ok({ result: 'not_eligible', processing_state: 'failed' });
      }

      const won = await repo.casJob(job, { processing_state: state, lease_token: job.lease_token ?? null }, {
        processing_state: 'preprocessing', lease_token: b.lease_token, workflow_run_id: b.workflow_run_id,
        attempt_count: job.attempt_count + 1, started_at: job.started_at ?? now, error_code: null,
      });
      if (!won) return ok({ result: 'not_eligible', processing_state: (await repo.findJob(publicId))?.processing_state ?? null });
      await repo.recordJobEvent(k, { ...base, from_state: state, to_state: 'preprocessing', reason: resumedFrom ? 'resume' : 'claim', metadata_safe: { attempt: job.attempt_count + 1 } });
      await repo.renewLease(k, b.lease_token, now, c.leaseSeconds);
      return ok({ result: 'claimed', processing_state: 'preprocessing', job_public_id: publicId, attempt_count: job.attempt_count + 1, resumed_from: resumedFrom });
    });
  }

  /** POST /internal/automation/analysis-jobs/:id/transition */
  async function transitionJob(publicId, b, meta) {
    const now = new Date();
    const to = str(b.to_state, 20);
    if (!to || !UUID_RE.test(b.lease_token ?? '') || !str(b.workflow_run_id, 120)) return invalid(400, 'invalid_request');
    if (b.passed_through !== undefined && !Array.isArray(b.passed_through)) return invalid(400, 'invalid_request', { field: 'passed_through' });

    return repo.tx(async (k) => {
      const job = await lockedJob(k, publicId);
      if (!job) return notEligible({ processing_state: null });
      const base = { job_public_id: publicId, workflow_run_id: b.workflow_run_id, event_id: meta.eventId, request_id: meta.requestId, at: now };
      const blocked = await gate(k, job, b.lease_token, b.workflow_run_id, now, base);
      if (blocked) return blocked;

      const plan = planTransition(job.processing_state, to, b.passed_through);
      if (plan.kind === 'noop') {
        await repo.renewLease(k, b.lease_token, now, leaseSeconds());
        return ok({ ok: true, processing_state: job.processing_state, changed: false });
      }
      if (plan.kind === 'reject') return invalid(422, 'invalid_transition', { reason: plan.reason, processing_state: job.processing_state });

      if (!(await repo.casJob(job, { processing_state: job.processing_state, lease_token: b.lease_token }, { processing_state: to }))) {
        return notEligible({ processing_state: (await repo.findJob(publicId))?.processing_state ?? null });
      }
      const metadata = safeMetadata(b, new Set(['to_state', 'lease_token', 'workflow_run_id', 'passed_through', 'event_id']));
      let from = job.processing_state;
      for (const [i, state] of plan.path.entries()) {
        const last = i === plan.path.length - 1;
        await repo.recordJobEvent(k, { ...base, from_state: from, to_state: state, reason: last ? 'transition' : 'passed_through', metadata_safe: last ? metadata : null });
        from = state;
      }
      await repo.renewLease(k, b.lease_token, now, leaseSeconds());
      return ok({ ok: true, processing_state: to, changed: true, recorded_states: plan.path });
    });
  }

  /** POST /internal/automation/analysis-jobs/:id/finalize — verify artifacts, then complete. */
  async function finalizeJob(publicId, b, meta) {
    const now = new Date();
    if (!UUID_RE.test(b.lease_token ?? '') || !str(b.workflow_run_id, 120)) return invalid(400, 'invalid_request');
    for (const f of ['analysis_run_public_id', 'evidence_plan_public_id']) if (!UUID_RE.test(b[f] ?? '')) return invalid(400, 'invalid_request', { field: f });
    if (!['valid', 'downgraded'].includes(b.validation_state)) return invalid(400, 'invalid_request', { field: 'validation_state' });
    const resultRef = str(b.validated_result_ref, 200);
    const schemaVersion = str(b.schema_version, 10);
    if (!resultRef || !schemaVersion) return invalid(400, 'invalid_request');

    return repo.tx(async (k) => {
      const job = await lockedJob(k, publicId);
      if (!job) return notEligible({ processing_state: null });
      const base = { job_public_id: publicId, workflow_run_id: b.workflow_run_id, event_id: b.event_id ?? meta.eventId, request_id: meta.requestId, at: now };

      const summarize = async (run) => {
        const findings = await strapi.db.query('api::analysis-finding.analysis-finding').findMany({
          where: { analysis_run: { id: run.id } }, select: ['finding_state', 'source_quote_verified'],
        });
        return {
          finding_count: findings.length,
          // a finding that claims the document says something, without a verified quote
          unverifiable_claim_count: findings.filter((f) => f.finding_state === 'present_in_document' && !f.source_quote_verified).length,
        };
      };
      const success = async (run) => ok({
        job_public_id: publicId,
        processing_state: 'completed',
        analysis_run_public_id: run.public_id,
        document_read_status: run.document_read_status ?? null,
        ...(await summarize(run)),
        evidence_plan_public_id: b.evidence_plan_public_id,
        schema_version: run.schema_version,
        knowledge_snapshot_key: run.knowledge_snapshot_key ?? null,
      });

      // already completed by this run ⇒ same answer (idempotent); by anything else ⇒ not eligible
      if (job.processing_state === 'completed') {
        const done = await strapi.db.query(RUN_UID).findOne({ where: { public_id: b.analysis_run_public_id, analysis_job: { id: job.id }, run_state: 'completed' } });
        return done && job.lease_token === b.lease_token ? success(done) : notEligible({ processing_state: 'completed' });
      }
      // cancelled / expired first, then lease
      const blocked = await gate(k, job, b.lease_token, b.workflow_run_id, now, base);
      if (blocked) return blocked;
      if (job.processing_state !== 'validating') return invalid(422, 'invalid_transition', { reason: 'finalize_requires_validating', processing_state: job.processing_state });

      // the persisted artifacts must exist and belong to this job
      const run = await strapi.db.query(RUN_UID).findOne({ where: { public_id: b.analysis_run_public_id, analysis_job: { id: job.id } } });
      if (!run) return invalid(422, 'artifacts_missing', { missing: ['analysis_run'] });
      if (!['running', 'completed'].includes(run.run_state)) return invalid(422, 'artifacts_invalid', { reason: `run_${run.run_state}` });
      if (run.result_json_private == null) return invalid(422, 'artifacts_missing', { missing: ['result_json_private'] });
      if (run.schema_version !== schemaVersion) return invalid(422, 'artifacts_invalid', { reason: 'schema_version_mismatch' });
      const plan = await strapi.db.query('api::evidence-plan-draft.evidence-plan-draft').findOne({
        where: { public_id: b.evidence_plan_public_id, $or: [{ analysis_run: { id: run.id } }, { generated_from_run_public_id: run.public_id }] },
      });
      if (!plan) return invalid(422, 'artifacts_missing', { missing: ['evidence_plan'] });
      const counts = await summarize(run);
      if (counts.unverifiable_claim_count > 0) {
        return invalid(422, 'GROUNDING_VALIDATION_FAILED', { unverifiable_claim_count: counts.unverifiable_claim_count });
      }

      if (!(await repo.casJob(job, { processing_state: 'validating', lease_token: b.lease_token }, { processing_state: 'completed', finished_at: now, error_code: null }))) {
        return notEligible({ processing_state: (await repo.findJob(publicId))?.processing_state ?? null });
      }
      await strapi.db.query(RUN_UID).update({ where: { id: run.id }, data: { run_state: 'completed', completed_at: run.completed_at ?? now, updatedAt: now } });
      await repo.recordJobEvent(k, {
        ...base, from_state: 'validating', to_state: 'completed', reason: 'finalize',
        metadata_safe: { analysis_run_public_id: run.public_id, evidence_plan_public_id: plan.public_id, validation_state: b.validation_state, validated_result_ref: resultRef, schema_version: schemaVersion },
      });
      const open = await strapi.db.query(JOB_UID).count({
        where: { analysis_session: { id: job.analysis_session.id }, processing_state: { $notIn: [...TERMINAL] } },
      });
      if (!open) await strapi.db.query(SESSION_UID).update({ where: { id: job.analysis_session.id }, data: { session_state: 'completed' } });
      return success({ ...run, run_state: 'completed' });
    });
  }

  /** POST /internal/automation/analysis-jobs/:id/fail */
  async function failJob(publicId, b, meta) {
    const now = new Date();
    if (!ERROR_CODES.has(b.error_code)) return invalid(400, 'invalid_request', { field: 'error_code' });
    if (!UUID_RE.test(b.lease_token ?? '') || !str(b.workflow_run_id, 120)) return invalid(400, 'invalid_request');

    return repo.tx(async (k) => {
      const job = await lockedJob(k, publicId);
      if (!job) return notEligible({ processing_state: null });

      // replays of a failure this lease already reported
      if (job.processing_state === 'failed' && job.lease_token === b.lease_token && job.error_code === b.error_code) {
        return ok({ job_public_id: publicId, processing_state: 'failed', error_code: job.error_code, requeued: false });
      }
      if (job.processing_state === 'queued' && job.last_error_code === b.error_code && b.event_id) {
        const row = await k(TABLES.inbox).where({ event_id: b.event_id, lease_token: b.lease_token }).first();
        if (row?.processing_state === 'requeued') return ok({ job_public_id: publicId, processing_state: 'queued', error_code: b.error_code, requeued: true });
      }

      const blocked = await gate(k, job, b.lease_token, b.workflow_run_id, now, { job_public_id: publicId, workflow_run_id: b.workflow_run_id, request_id: meta.requestId });
      if (blocked) return blocked;
      return applyFailure(k, job, { ...b, source: 'n8n_fail', request_id: meta.requestId }, now);
    });
  }

  /** POST /internal/automation/events/finish */
  async function finishEvent(b, meta) {
    const now = new Date();
    const outcome = b.outcome;
    const stateFor = { completed: 'completed', failed: 'failed', requeued: 'requeued', skipped: 'skipped' };
    if (!stateFor[outcome] || !UUID_RE.test(b.event_id ?? '') || !UUID_RE.test(b.lease_token ?? '') || !str(b.consumer_name, 80)) return invalid(400, 'invalid_request');
    if (b.emit_event_type != null && EMITTABLE.get(b.emit_event_type) !== outcome) return invalid(422, 'invalid_emit_event_type');

    return repo.tx(async (k) => {
      const row = await repo.getInbox(k, b.event_id, b.consumer_name);
      if (!row || row.lease_token !== b.lease_token) return notEligible();
      const ev = await repo.getOutbox(k, b.event_id);

      const compatible = row.processing_state === stateFor[outcome] || (row.processing_state === 'dead_lettered' && outcome === 'failed');
      if (row.processing_state !== 'claimed' && !compatible) return invalid(409, 'outcome_conflict', { processing_state: row.processing_state });

      if (row.processing_state === 'claimed') {
        if (ev?.aggregate_type === 'analysis_job') {
          const job = await repo.findJob(ev.aggregate_public_id);
          const s = job?.processing_state;
          const consistent = {
            completed: s === 'completed',
            failed: ['failed', 'cancelled', 'expired'].includes(s),
            requeued: s === 'queued',
            skipped: !(PROCESSING.has(s) && job?.lease_token === b.lease_token),
          }[outcome];
          if (!consistent) return invalid(409, 'outcome_mismatch', { processing_state: s ?? null });
        }
        if (outcome === 'requeued') {
          await k(TABLES.inbox).where({ event_id: row.event_id, consumer_name: row.consumer_name })
            .update({ processing_state: 'requeued', last_error_code: str(b.error_code, 60), updated_at: now });
          await k(TABLES.outbox).where({ id: row.event_id }).update({
            delivery_state: 'pending', next_attempt_at: new Date(now.getTime() + backoffMs(Math.max(1, ev?.attempt_count ?? 1))), dispatch_lock_token: null, dispatch_lock_until: null,
          });
        }
        else {
          await repo.closeEvent(k, row.event_id, row.consumer_name, stateFor[outcome], now, str(b.error_code, 60));
        }
      }

      let emitted = null;
      if (b.emit_event_type && ev) {
        const follow = await repo.insertOutbox(k, {
          event_type: b.emit_event_type,
          aggregate_type: ev.aggregate_type,
          aggregate_public_id: ev.aggregate_public_id,
          tenant_public_id: ev.tenant_public_id,
          actor_public_id: ev.actor_public_id,
          request_id: meta.requestId,
          payload: ev.aggregate_type === 'analysis_job' ? { job_public_id: ev.aggregate_public_id } : {},
          idempotency_key: `${b.emit_event_type}:${ev.id}`,
        });
        emitted = follow.id;
      }
      return ok({ ok: true, event_id: row.event_id, outcome, emitted_event_id: emitted });
    });
  }

  /** POST /internal/automation/incidents — from the LR-SH-01 error handler. */
  async function reportIncident(b, meta) {
    const now = new Date();
    const runId = str(b.workflow_run_id, 120);
    const code = ERROR_CODES.has(b.error_code) ? b.error_code : 'STAGE_ERROR_UNCLASSIFIED';
    const severity = ['low', 'medium', 'high', 'critical'].includes(b.severity) ? b.severity : 'medium';
    const occurred = b.occurred_at && !Number.isNaN(Date.parse(b.occurred_at)) ? new Date(b.occurred_at) : null;

    return repo.tx(async (k) => {
      let action = 'no_job';
      let jobPublicId = null;
      let result = null;
      const found = runId ? await strapi.db.query(JOB_UID).findOne({ where: { workflow_run_id: runId }, select: ['public_id'] }) : null;
      if (found) {
        const job = await lockedJob(k, found.public_id);
        jobPublicId = job.public_id;
        const lease = PROCESSING.has(job.processing_state) ? await repo.liveLease(k, job, now) : null;
        if (!lease || lease.workflow_run_id !== runId || job.workflow_run_id !== runId) {
          action = 'ignored_lease_not_held'; // another run (or nobody) owns it now: don't touch
        }
        else {
          result = await applyFailure(k, job, { error_code: code, retryable: RETRYABLE_CODES.has(code), source: 'incident', stage: str(b.last_node, 40), http_status: b.http_status, workflow_run_id: runId, request_id: meta.requestId }, now);
          action = result.body.requeued ? 'requeued' : result.body.dead_lettered ? 'dead_lettered' : result.status === 200 ? 'failed' : 'ignored_lease_not_held';
        }
      }
      const id = randomUUID();
      await k(TABLES.incidents).insert({
        id, workflow_id: str(b.workflow_id, 120), workflow_name: str(b.workflow_name, 200), workflow_run_id: runId, retry_of: str(b.retry_of, 120),
        last_node: str(b.last_node, 200), error_code: code, http_status: Number.isInteger(b.http_status) ? b.http_status : null, severity,
        occurred_at: occurred, received_at: now, request_id: meta.requestId, job_public_id: jobPublicId, action_taken: action,
      });
      if (severity === 'high' || severity === 'critical') strapi.log.error(`[automation] incident ${id} ${code} run=${runId ?? '-'} action=${action}`);
      return ok({ ok: true, incident_id: id, action_taken: action, job_public_id: jobPublicId, processing_state: result?.body.processing_state ?? null });
    });
  }

  return {
    // public
    createJob, jobStatus, jobReport, cancelJob, cancelUnchecked,
    // internal
    claimEvent, claimJob, transitionJob, finalizeJob, failJob, finishEvent, reportIncident,
    // shared with the dispatcher
    applyFailure, expireJob, repo,
  };
};
