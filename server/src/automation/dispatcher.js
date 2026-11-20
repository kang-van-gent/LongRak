'use strict';

/**
 * Outbox dispatcher — at-least-once delivery of committed lr_domain_outbox_events to n8n.
 *
 *  tick():
 *   1. redeliver: `dispatched` events whose run died — the inbox lease expired without a
 *      `finish`, or nobody claimed the event within ackTimeoutSeconds — go back to `pending`.
 *   2. deliver:   due `pending` events are locked (compare-and-set, so several Strapi instances
 *      can run this safely) and POSTed to the n8n webhook with the secret header.
 *      2xx ⇒ `dispatched`; error ⇒ retry with exponential backoff + jitter; after
 *      maxDeliveryAttempts ⇒ `dead_lettered` (and a still-queued job is failed, so the user
 *      sees an honest state instead of "queued" forever).
 *
 * The envelope carries ids only (spec.md §4.1): no file names, document text, PII or signed URLs.
 * Event types without a configured consumer stay `pending` until one is configured.
 */
const { randomUUID } = require('node:crypto');
const { TABLES, EVENT_TYPES } = require('./constants');
const { backoffMs } = require('./state-machine');
const { json, iso, isPast } = require('./repo');
const automationConfig = require('./config');

const BATCH = 20;

function envelope(ev) {
  return {
    event_id: ev.id,
    event_type: ev.event_type,
    schema_version: ev.schema_version,
    occurred_at: iso(ev.created_at),
    request_id: ev.request_id ?? null,
    aggregate_type: ev.aggregate_type,
    aggregate_public_id: ev.aggregate_public_id,
    tenant_public_id: ev.tenant_public_id ?? null,
    actor_public_id: ev.actor_public_id ?? null,
    data: json(ev.payload_safe_json),
  };
}

module.exports = function createDispatcher(strapi, jobs) {
  const db = () => strapi.db.connection;
  let timer = null;
  let running = false;

  /** Where each event type goes. Only the analysis job orchestrator exists in W0. */
  function routeFor(eventType, c) {
    if (eventType === EVENT_TYPES.jobCreated) return c.webhookUrl || null;
    return null;
  }

  async function redeliverStale(now, c) {
    const rows = await db()(TABLES.outbox)
      .where({ delivery_state: 'dispatched' })
      .orderBy('last_attempt_at', 'asc')
      .limit(100);
    let count = 0;
    for (const ev of rows) {
      const inbox = await db()(TABLES.inbox).where({ event_id: ev.id });
      const lastAttempt = new Date(ev.last_attempt_at ?? ev.created_at).getTime();
      const ackDue = lastAttempt + c.ackTimeoutSeconds * 1000 <= now.getTime();
      const claimed = inbox.filter((r) => r.processing_state === 'claimed');
      const allExpired = claimed.length > 0 && claimed.every((r) => isPast(r.lease_expires_at, now));
      // lease ran out after our last delivery ⇒ the run died: send again now (once);
      // already re-sent since then and still unclaimed ⇒ wait for the ack timeout like a fresh send
      const expiredSinceLastSend = allExpired && claimed.some((r) => new Date(r.lease_expires_at).getTime() > lastAttempt);
      const leaseDead = expiredSinceLastSend || (allExpired && ackDue);
      const neverClaimed = inbox.length === 0 && ackDue;
      const requeued = inbox.length > 0 && inbox.every((r) => r.processing_state === 'requeued');
      if (!leaseDead && !neverClaimed && !requeued) continue;
      count += await db()(TABLES.outbox)
        .where({ id: ev.id, delivery_state: 'dispatched' })
        .update({ delivery_state: 'pending', next_attempt_at: now, last_error_code: leaseDead ? 'LEASE_EXPIRED' : requeued ? 'REQUEUED' : 'NOT_CLAIMED' });
    }
    return count;
  }

  async function deadLetter(ev, now, code) {
    await strapi.db.transaction(async ({ trx }) => {
      await trx(TABLES.outbox).where({ id: ev.id }).update({ delivery_state: 'dead_lettered', last_error_code: code, dispatch_lock_token: null, dispatch_lock_until: null });
      if (ev.event_type !== EVENT_TYPES.jobCreated) return;
      const job = await jobs.repo.findJob(ev.aggregate_public_id);
      if (!job || job.processing_state !== 'queued') return;
      await jobs.repo.lockJobRow(trx, job.id);
      await jobs.applyFailure(trx, job, { error_code: 'STAGE_UNAVAILABLE', retryable: false, source: 'dispatch_dead_letter' }, now);
    });
    strapi.log.warn(`[outbox] event ${ev.id} (${ev.event_type}) dead-lettered after ${ev.attempt_count + 1} attempts: ${code}`);
  }

  async function deliver(ev, c, now) {
    const url = routeFor(ev.event_type, c);
    const lockToken = randomUUID();
    const locked = await db()(TABLES.outbox)
      .where({ id: ev.id, delivery_state: 'pending' })
      .andWhere((q) => q.whereNull('dispatch_lock_until').orWhere('dispatch_lock_until', '<', now))
      .update({ dispatch_lock_token: lockToken, dispatch_lock_until: new Date(now.getTime() + c.webhookTimeoutMs + 30000) });
    if (!locked) return 'skipped';

    let code = null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(c.webhookSecret ? { [c.webhookSecretHeader]: c.webhookSecret } : {}),
          'x-request-id': ev.request_id ?? ev.id,
          'x-event-id': ev.id,
          'idempotency-key': ev.id,
        },
        body: JSON.stringify(envelope(ev)),
        signal: AbortSignal.timeout(c.webhookTimeoutMs),
        redirect: 'error',
      });
      if (!res.ok) code = `HTTP_${res.status}`;
      await res.body?.cancel().catch(() => {});
    }
    catch (err) {
      code = err?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    }

    const attempts = ev.attempt_count + 1;
    const fenced = () => db()(TABLES.outbox).where({ id: ev.id, dispatch_lock_token: lockToken });
    if (!code) {
      await fenced().update({
        delivery_state: 'dispatched', attempt_count: attempts, last_attempt_at: now, published_at: ev.published_at ?? now,
        last_error_code: null, dispatch_lock_token: null, dispatch_lock_until: null,
      });
      return 'dispatched';
    }
    if (attempts >= c.maxDeliveryAttempts) {
      await fenced().update({ attempt_count: attempts, last_attempt_at: now });
      await deadLetter({ ...ev, attempt_count: attempts - 1 }, now, code);
      return 'dead_lettered';
    }
    await fenced().update({
      attempt_count: attempts, last_attempt_at: now, last_error_code: code,
      next_attempt_at: new Date(now.getTime() + backoffMs(attempts)), dispatch_lock_token: null, dispatch_lock_until: null,
    });
    strapi.log.warn(`[outbox] event ${ev.id} delivery failed (${code}), attempt ${attempts}/${c.maxDeliveryAttempts}`);
    return 'retry';
  }

  /** One polling round. Returns counters (used by tests and logs). */
  async function tick() {
    const c = automationConfig();
    const now = new Date();
    const stats = { redelivered: await redeliverStale(now, c), dispatched: 0, retry: 0, dead_lettered: 0, skipped: 0 };
    const routable = [EVENT_TYPES.jobCreated].filter((t) => routeFor(t, c));
    if (!routable.length) return stats;
    const due = await db()(TABLES.outbox)
      .where({ delivery_state: 'pending' })
      .whereIn('event_type', routable)
      .where('next_attempt_at', '<=', now)
      .orderBy('next_attempt_at', 'asc')
      .limit(BATCH);
    for (const ev of due) stats[await deliver(ev, c, now)] += 1;
    // housekeeping: expired idempotency records
    await db()(TABLES.idempotency).where('expires_at', '<', now).del();
    return stats;
  }

  function start() {
    const c = automationConfig();
    if (!c.dispatcherEnabled) return strapi.log.info('[outbox] dispatcher disabled (LONGRAK_OUTBOX_DISPATCHER=false)');
    if (!c.webhookUrl) strapi.log.warn('[outbox] LONGRAK_N8N_EVENT_WEBHOOK_URL is not set — analysis jobs will stay queued until it is');
    timer = setInterval(async () => {
      if (running) return;
      running = true;
      try { await tick(); }
      catch (err) { strapi.log.error(`[outbox] tick failed: ${err.message}`); }
      finally { running = false; }
    }, c.pollMs);
    timer.unref?.();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { tick, start, stop, envelope };
};
