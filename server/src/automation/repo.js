'use strict';

/**
 * Data access for the automation tables and the few compare-and-set writes on Strapi tables.
 *
 * Rules
 *  - Every mutating operation runs inside strapi.db.transaction(); `k` is that knex transaction.
 *    strapi.db.query()/documents() calls inside the callback join the same transaction.
 *  - Job rows are locked with SELECT … FOR UPDATE (PostgreSQL) before a decision is made, and
 *    every write is also a compare-and-set on the state it was decided from.
 *  - Only ids, states, codes and digests are stored here — never document text or PII.
 */
const { createHash, randomUUID, timingSafeEqual } = require('node:crypto');
const { TABLES, JOB_UID, RUN_UID } = require('./constants');

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

/** Constant-time string equality (length leak only). */
function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''));
  const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/** Canonical JSON (sorted keys) for request digests. */
function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

const json = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const iso = (d) => (d ? new Date(d).toISOString() : null);
const isPast = (d, now) => !!d && new Date(d).getTime() <= now.getTime();

module.exports = function createRepo(strapi) {
  const isPg = () => ['pg', 'postgres', 'postgresql'].includes(strapi.db.connection.client.config.client);
  const tx = (fn) => strapi.db.transaction(({ trx }) => fn(trx));

  async function lockJobRow(k, jobId) {
    if (isPg()) await k.raw('SELECT id FROM lr_analysis_jobs WHERE id = ? FOR UPDATE', [jobId]);
  }

  /** Job by public_id with its session (private fields included — never return this raw). */
  function findJob(publicId) {
    if (typeof publicId !== 'string' || publicId.length !== 36) return null;
    return strapi.db.query(JOB_UID).findOne({
      where: { public_id: publicId },
      populate: { analysis_session: { populate: { claimed_by: { select: ['id'] } } } },
    });
  }

  /** Compare-and-set on the job row. Returns true when exactly this row was updated. */
  async function casJob(job, expect, data) {
    const where = { id: job.id };
    for (const [key, value] of Object.entries(expect)) where[key] = value === null ? { $null: true } : value;
    const { count } = await strapi.db.query(JOB_UID).updateMany({ where, data: { ...data, updatedAt: new Date() } });
    return count === 1;
  }

  async function setRunsState(job, fromStates, toState, extra = {}) {
    await strapi.db.query(RUN_UID).updateMany({
      where: { analysis_job: { id: job.id }, run_state: { $in: fromStates } },
      data: { run_state: toState, updatedAt: new Date(), ...extra },
    });
  }

  function recordJobEvent(k, e) {
    return k(TABLES.jobEvents).insert({
      id: randomUUID(),
      job_public_id: e.job_public_id,
      from_state: e.from_state ?? null,
      to_state: e.to_state,
      reason: e.reason,
      workflow_run_id: e.workflow_run_id ?? null,
      event_id: e.event_id ?? null,
      request_id: e.request_id ?? null,
      error_code: e.error_code ?? null,
      metadata_safe: e.metadata_safe ? JSON.stringify(e.metadata_safe) : null,
      occurred_at: e.at ?? new Date(),
    });
  }

  /** Insert an outbox event once per idempotency_key; returns the stored row. */
  async function insertOutbox(k, e) {
    const now = new Date();
    await k(TABLES.outbox)
      .insert({
        id: randomUUID(),
        event_type: e.event_type,
        schema_version: '1.0',
        aggregate_type: e.aggregate_type,
        aggregate_public_id: e.aggregate_public_id,
        tenant_public_id: e.tenant_public_id ?? null,
        actor_public_id: e.actor_public_id ?? null,
        request_id: e.request_id ?? null,
        payload_safe_json: JSON.stringify(e.payload),
        idempotency_key: e.idempotency_key,
        delivery_state: 'pending',
        attempt_count: 0,
        created_at: now,
        next_attempt_at: e.available_at ?? now,
      })
      .onConflict('idempotency_key')
      .ignore();
    return k(TABLES.outbox).where({ idempotency_key: e.idempotency_key }).first();
  }

  const getOutbox = (k, id) => k(TABLES.outbox).where({ id }).first();
  const getInbox = (k, eventId, consumer) => k(TABLES.inbox).where({ event_id: eventId, consumer_name: consumer }).first();
  const getInboxByLease = (k, leaseToken) => (leaseToken ? k(TABLES.inbox).where({ lease_token: leaseToken }).first() : null);

  /** The inbox row whose lease currently fences this job, if that lease is alive. */
  async function liveLease(k, job, now) {
    if (!job.lease_token) return null;
    const row = await getInboxByLease(k, job.lease_token);
    if (!row || row.processing_state !== 'claimed' || isPast(row.lease_expires_at, now)) return null;
    return row;
  }

  function renewLease(k, leaseToken, now, seconds) {
    return k(TABLES.inbox)
      .where({ lease_token: leaseToken, processing_state: 'claimed' })
      .update({ lease_expires_at: new Date(now.getTime() + seconds * 1000), updated_at: now });
  }

  /** Close an event for every consumer view: inbox row (created if missing) + outbox row. */
  async function closeEvent(k, eventId, consumer, inboxState, now, errorCode = null) {
    const updated = await k(TABLES.inbox)
      .where({ event_id: eventId, consumer_name: consumer })
      .update({ processing_state: inboxState, processed_at: now, updated_at: now, last_error_code: errorCode });
    if (!updated) {
      await k(TABLES.inbox)
        .insert({ event_id: eventId, consumer_name: consumer, processing_state: inboxState, processed_at: now, created_at: now, updated_at: now, last_error_code: errorCode, claim_count: 0 })
        .onConflict(['event_id', 'consumer_name'])
        .ignore();
    }
    await k(TABLES.outbox)
      .where({ id: eventId })
      .whereNot({ delivery_state: 'dead_lettered' })
      .update({ delivery_state: inboxState === 'dead_lettered' ? 'dead_lettered' : 'completed', completed_at: now, dispatch_lock_token: null, dispatch_lock_until: null });
  }

  return {
    tx, isPg, lockJobRow, findJob, casJob, setRunsState, recordJobEvent, insertOutbox,
    getOutbox, getInbox, getInboxByLease, liveLease, renewLease, closeEvent,
  };
};

Object.assign(module.exports, { sha256, safeEqual, canonical, json, iso, isPast });
