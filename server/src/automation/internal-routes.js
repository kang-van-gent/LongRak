'use strict';

/**
 * /internal/automation/* — the only API n8n may call (spec.md §4.5).
 *
 * Mounted at the server root (not under /api), outside the Content API: no Strapi role or API
 * token can reach these handlers, and the service token below is useless anywhere else.
 *
 * Every request must carry
 *   Authorization: Bearer <LONGRAK_INTERNAL_SERVICE_TOKEN>
 *   X-Request-Id, Idempotency-Key                     (all routes)
 *   X-Event-Id, X-Workflow-Run-Id                     (all routes except /incidents)
 * Header values must match the body's event_id / workflow_run_id when both are present.
 *
 * Idempotency: answers (2xx and 409) are stored per route + Idempotency-Key; a retry with the
 * same key and the same body gets the identical answer, a different body gets 422.
 */
const { sha256, safeEqual, canonical, json } = require('./repo');
const { TABLES } = require('./constants');
const automationConfig = require('./config');

const IDEMPOTENCY_TTL_MS = 7 * 86400000;

module.exports = function internalRoutes(strapi, jobs) {
  const db = () => strapi.db.connection;

  async function remembered(routeKey, key, digest) {
    const row = await db()(TABLES.idempotency).where({ route_key: routeKey, idempotency_key: key }).first();
    if (!row) return null;
    if (row.request_digest !== digest) return { status: 422, body: { ok: false, result: 'idempotency_key_reused' } };
    return { status: row.response_status, body: json(row.response_json), replayed: true };
  }

  async function remember(routeKey, key, digest, res) {
    if (!(res.status < 300 || res.status === 409)) return; // input errors may be fixed and retried
    const now = new Date();
    await db()(TABLES.idempotency)
      .insert({ route_key: routeKey, idempotency_key: key, request_digest: digest, response_status: res.status, response_json: JSON.stringify(res.body), created_at: now, expires_at: new Date(now.getTime() + IDEMPOTENCY_TTL_MS) })
      .onConflict(['route_key', 'idempotency_key'])
      .ignore();
  }

  /** Wrap an operation with auth, correlation headers and idempotency. */
  function endpoint(name, { needsEvent = true }, run) {
    return async (ctx) => {
      const { serviceToken } = automationConfig();
      const auth = ctx.get('authorization');
      const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
      if (!serviceToken) { ctx.status = 503; ctx.body = { ok: false, result: 'internal_api_disabled' }; return; }
      if (!safeEqual(given, serviceToken)) { ctx.status = 401; ctx.body = { ok: false, result: 'unauthorized', error_code: 'AUTHORIZATION_FAILED' }; return; }

      const requestId = ctx.get('x-request-id').slice(0, 128);
      const key = ctx.get('idempotency-key').slice(0, 200);
      const eventId = ctx.get('x-event-id').slice(0, 36);
      const runId = ctx.get('x-workflow-run-id').slice(0, 120);
      const missing = [
        !requestId && 'X-Request-Id', !key && 'Idempotency-Key',
        needsEvent && !eventId && 'X-Event-Id', needsEvent && !runId && 'X-Workflow-Run-Id',
      ].filter(Boolean);
      const body = ctx.request.body;
      if (missing.length || !body || typeof body !== 'object' || Array.isArray(body)) {
        ctx.status = 400; ctx.body = { ok: false, result: 'invalid_request', missing_headers: missing }; return;
      }
      if ((body.event_id && eventId && body.event_id !== eventId) || (body.workflow_run_id && runId && body.workflow_run_id !== runId)) {
        ctx.status = 400; ctx.body = { ok: false, result: 'header_body_mismatch' }; return;
      }

      const routeKey = `${name}:${ctx.params.id ?? ''}`;
      const digest = sha256(canonical(body));
      let res = await remembered(routeKey, key, digest);
      if (!res) {
        res = await run(ctx.params.id, body, { requestId, eventId: eventId || null, workflowRunId: runId || null });
        await remember(routeKey, key, digest, res);
      }
      ctx.set('X-Request-Id', requestId);
      if (res.replayed) ctx.set('Idempotent-Replayed', 'true');
      ctx.status = res.status;
      ctx.body = res.body;
    };
  }

  const config = { auth: false }; // authenticated by the service token above
  return [
    { method: 'POST', path: '/internal/automation/events/claim', config, handler: endpoint('events.claim', {}, (_, b, m) => jobs.claimEvent(b, m)) },
    { method: 'POST', path: '/internal/automation/events/finish', config, handler: endpoint('events.finish', {}, (_, b, m) => jobs.finishEvent(b, m)) },
    { method: 'POST', path: '/internal/automation/analysis-jobs/:id/claim', config, handler: endpoint('jobs.claim', {}, (id, b, m) => jobs.claimJob(id, b, m)) },
    { method: 'POST', path: '/internal/automation/analysis-jobs/:id/transition', config, handler: endpoint('jobs.transition', {}, (id, b, m) => jobs.transitionJob(id, b, m)) },
    { method: 'POST', path: '/internal/automation/analysis-jobs/:id/finalize', config, handler: endpoint('jobs.finalize', {}, (id, b, m) => jobs.finalizeJob(id, b, m)) },
    { method: 'POST', path: '/internal/automation/analysis-jobs/:id/fail', config, handler: endpoint('jobs.fail', {}, (id, b, m) => jobs.failJob(id, b, m)) },
    { method: 'POST', path: '/internal/automation/incidents', config, handler: endpoint('incidents', { needsEvent: false }, (_, b, m) => jobs.reportIncident(b, m)) },
  ];
};
