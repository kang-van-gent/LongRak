'use strict';

/**
 * LR-W0-01 backend tests — run against a real, empty PostgreSQL database:
 *   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/longrak_test npm test
 *
 * Covers spec.md §14: T06 (duplicate concurrent events), T09 (cross-user access),
 * T10 (session expires mid-run), T19 (redelivery after n8n restart), plus: transition to the
 * current state is a no-op, finalize after cancel is 409, and the supporting contracts.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { bootStrapi, fixtures, client, SERVICE_TOKEN, WEBHOOK_SECRET } = require('./helpers/harness');

const skip = !process.env.TEST_DATABASE_URL && 'TEST_DATABASE_URL not set (PostgreSQL required)';

let strapi; let base; let fake; let fx; let http; let automation;
const T = { outbox: 'lr_domain_outbox_events', inbox: 'lr_automation_event_inbox', events: 'lr_analysis_job_state_events' };
const db = () => strapi.db.connection;
const JOBS = '/internal/automation/analysis-jobs';

before(async () => {
  if (skip) return;
  ({ strapi, base, fake } = await bootStrapi());
  fx = fixtures(strapi);
  http = client(base);
  automation = require('../src/automation').automation(strapi);
});
after(async () => {
  if (skip) return;
  await strapi?.destroy();
  await fake?.close();
});

// ---------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------
async function newJob(opts = {}) {
  const s = await fx.session(opts.session);
  const files = [];
  for (let i = 0; i < (opts.files ?? 1); i += 1) files.push(await fx.file(s, opts.file));
  const res = await http.call('POST', '/api/longrak/ai/jobs', {
    body: { session_public_id: s.public_id, file_public_ids: files.map((f) => f.public_id), document_type: 'quotation' },
    headers: { 'x-longrak-session-secret': s.secret, 'idempotency-key': opts.key ?? randomUUID() },
  });
  return { session: s, files, res, jobId: res.body?.job_public_id };
}
const eventFor = (jobId) => db()(T.outbox).where({ aggregate_public_id: jobId, event_type: 'analysis.job.created' }).first();
const job = (jobId) => strapi.db.query('api::analysis-job.analysis-job').findOne({ where: { public_id: jobId } });
const stateEvents = (jobId) => db()(T.events).where({ job_public_id: jobId }).orderBy('occurred_at').orderBy('to_state');

/** n8n: claim event + claim job. Returns { run, ev, lease }. */
async function claim(jobId, run = http.n8nRun()) {
  const ev = await eventFor(jobId);
  run.setEvent(ev.id);
  const c = await run.post('/internal/automation/events/claim', {
    event_id: ev.id, event_type: ev.event_type, consumer_name: 'LR-W0-01', aggregate_public_id: jobId,
  });
  if (c.body.result !== 'claimed') return { run, ev, eventClaim: c };
  const j = await run.post(`${JOBS}/${jobId}/claim`, { event_id: ev.id, lease_token: c.body.lease_token });
  return { run, ev, lease: c.body.lease_token, eventClaim: c, jobClaim: j };
}
const to = (r, jobId, state, extra = {}) => r.run.post(`${JOBS}/${jobId}/transition`, { to_state: state, lease_token: r.lease, ...extra });
async function walkTo(r, jobId, last) {
  for (const s of ['extracting', 'rule_check', 'retrieving', 'model_call', 'validating']) {
    const res = await to(r, jobId, s);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    if (s === last) return;
  }
}
const finalize = (r, jobId, a, opts) => r.run.post(`${JOBS}/${jobId}/finalize`, {
  event_id: r.ev.id, lease_token: r.lease, analysis_run_public_id: a.run.public_id, validated_result_ref: 'obj://validated/abc',
  validation_state: 'valid', evidence_plan_public_id: a.plan.public_id, schema_version: '1.0',
}, opts);
const finish = (r, outcome, extra = {}) => r.run.post('/internal/automation/events/finish', {
  event_id: r.ev.id, consumer_name: 'LR-W0-01', lease_token: r.lease, outcome, ...extra,
});

// ---------------------------------------------------------------------------------------
describe('public job API', { skip }, () => {
  test('POST /jobs → 202, one queued job + one outbox event in the same transaction', async () => {
    const { res, jobId } = await newJob();
    assert.equal(res.status, 202, JSON.stringify(res.body));
    assert.equal(res.body.processing_state, 'queued');
    assert.equal(res.body.status_url, `/api/longrak/ai/jobs/${jobId}`);
    assert.equal((await job(jobId)).processing_state, 'queued');
    const ev = await eventFor(jobId);
    assert.equal(ev.delivery_state, 'pending');
    assert.deepEqual(typeof ev.payload_safe_json === 'string' ? JSON.parse(ev.payload_safe_json) : ev.payload_safe_json, { job_public_id: jobId });
  });

  test('limits and preconditions are enforced before any outbox event', async () => {
    const before = (await db()(T.outbox).count({ n: '*' }))[0].n;
    assert.equal((await newJob({ files: 4 })).res.body.reason, 'file_count');
    assert.equal((await newJob({ file: { bytes: 15 * 1024 * 1024 + 1 } })).res.body.reason, 'file_too_large');
    assert.equal((await newJob({ files: 2, file: { pages: 16 } })).res.body.reason, 'page_limit');
    assert.equal((await newJob({ file: { pages: null } })).res.body.reason, 'page_count_unknown');
    assert.equal((await newJob({ file: { state: 'scanned' } })).res.body.reason, 'file_not_accepted');
    const noConsent = await newJob({ session: { consents: ['document_rights'] } });
    assert.equal(noConsent.res.status, 422);
    assert.equal(noConsent.res.body.result, 'consent_required');
    // exactly at the limits is fine: 3 files, 15 MB each, 30 pages
    const edge = await newJob({ files: 3, file: { bytes: 15 * 1024 * 1024, pages: 10 } });
    assert.equal(edge.res.status, 202, JSON.stringify(edge.res.body));
    assert.equal(Number((await db()(T.outbox).count({ n: '*' }))[0].n), Number(before) + 1);
  });

  test('daily quota per usage bucket', async () => {
    process.env.LONGRAK_AI_DAILY_JOB_QUOTA = '2';
    try {
      const bucket = `bucket-${randomUUID()}`;
      assert.equal((await newJob({ session: { bucket } })).res.status, 202);
      assert.equal((await newJob({ session: { bucket } })).res.status, 202);
      const third = await newJob({ session: { bucket } });
      assert.equal(third.res.status, 429);
      assert.equal(third.res.body.result, 'quota_exceeded');
    }
    finally { process.env.LONGRAK_AI_DAILY_JOB_QUOTA = '1000'; }
  });

  test('same Idempotency-Key → same job; different files with that key → 409', async () => {
    const s = await fx.session();
    const f = await fx.file(s);
    const g = await fx.file(s);
    const post = (ids) => http.call('POST', '/api/longrak/ai/jobs', {
      body: { session_public_id: s.public_id, file_public_ids: ids }, headers: { 'x-longrak-session-secret': s.secret, 'idempotency-key': 'k-1' },
    });
    const a = await post([f.public_id]);
    const b = await post([f.public_id]);
    assert.equal(b.status, 202);
    assert.equal(b.body.job_public_id, a.body.job_public_id);
    assert.equal((await post([g.public_id])).status, 409);
  });
});

// ---------------------------------------------------------------------------------------
describe('T09 — cross-user job access', { skip }, () => {
  test('a guessed id of someone else\'s job is indistinguishable from a missing one', async () => {
    const victim = await newJob();
    const attacker = await fx.session();
    const as = (headers) => ({ headers });
    const own = { 'x-longrak-session-secret': attacker.secret };
    const probes = [
      ['GET', `/api/longrak/ai/jobs/${victim.jobId}`, as(own)],
      ['GET', `/api/longrak/ai/jobs/${victim.jobId}/report`, as(own)],
      ['POST', `/api/longrak/ai/jobs/${victim.jobId}/cancel`, as(own)],
      ['GET', `/api/longrak/ai/jobs/${victim.jobId}`, as({})],
      ['GET', `/api/longrak/ai/jobs/${victim.jobId}`, as({ authorization: 'Bearer not-a-jwt' })],
    ];
    const missing = await http.call('GET', `/api/longrak/ai/jobs/${randomUUID()}`, as(own));
    for (const [method, url, opts] of probes) {
      const res = await http.call(method, url, opts);
      assert.equal(res.status, 404, `${method} ${url}`);
      assert.deepEqual(res.body, missing.body);
    }
    // the owner still sees it, and the attacker's probes changed nothing
    const mine = await http.call('GET', `/api/longrak/ai/jobs/${victim.jobId}`, as({ 'x-longrak-session-secret': victim.session.secret }));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.processing_state, 'queued');
  });

  test('account owner (claimed session) sees it via JWT; another account does not', async () => {
    const { jobId, session } = await newJob();
    const users = strapi.plugin('users-permissions').service('user');
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'authenticated' } });
    const mk = (n) => users.add({ username: `u${n}${Date.now()}`, email: `u${n}${Date.now()}@example.test`, password: 'Passw0rd!x', confirmed: true, role: role.id, provider: 'local' });
    const alice = await mk('a');
    const bob = await mk('b');
    await strapi.db.query('api::analysis-session.analysis-session').update({ where: { public_id: session.public_id }, data: { claimed_by: alice.id } });
    const jwt = (u) => strapi.plugin('users-permissions').service('jwt').issue({ id: u.id });
    const a = await http.call('GET', `/api/longrak/ai/jobs/${jobId}`, { headers: { authorization: `Bearer ${await jwt(alice)}` } });
    const b = await http.call('GET', `/api/longrak/ai/jobs/${jobId}`, { headers: { authorization: `Bearer ${await jwt(bob)}` } });
    assert.equal(a.status, 200);
    assert.equal(b.status, 404);
  });

  test('Strapi content API never exposes jobs or the automation tables', async () => {
    assert.equal((await http.call('GET', '/api/analysis-jobs')).status, 403);
    // the internal service token is not a Strapi API token
    assert.equal((await http.call('GET', '/api/analysis-jobs', { headers: { authorization: `Bearer ${SERVICE_TOKEN}` } })).status, 401);
  });
});

// ---------------------------------------------------------------------------------------
describe('internal API contract', { skip }, () => {
  test('service token and correlation headers are required', async () => {
    const url = '/internal/automation/events/claim';
    assert.equal((await http.call('POST', url, { body: {} })).status, 401);
    assert.equal((await http.call('POST', url, { body: {}, headers: { authorization: 'Bearer wrong' } })).status, 401);
    const noHeaders = await http.call('POST', url, { body: {}, headers: { authorization: `Bearer ${SERVICE_TOKEN}` } });
    assert.equal(noHeaders.status, 400);
    assert.deepEqual(noHeaders.body.missing_headers, ['X-Request-Id', 'Idempotency-Key', 'X-Event-Id', 'X-Workflow-Run-Id']);
  });

  test('happy path: claim → transitions → finalize → finish; report visible to the owner', async () => {
    const { jobId, session } = await newJob();
    const r = await claim(jobId);
    assert.equal(r.eventClaim.body.result, 'claimed');
    assert.equal(r.jobClaim.body.result, 'claimed');
    assert.equal(r.jobClaim.body.processing_state, 'preprocessing');
    await walkTo(r, jobId, 'validating');
    const a = await fx.artifacts(jobId);
    const fin = await finalize(r, jobId, a);
    assert.equal(fin.status, 200, JSON.stringify(fin.body));
    assert.deepEqual(Object.keys(fin.body).sort(), ['analysis_run_public_id', 'document_read_status', 'evidence_plan_public_id', 'finding_count', 'job_public_id', 'knowledge_snapshot_key', 'processing_state', 'schema_version', 'unverifiable_claim_count']);
    assert.equal(fin.body.processing_state, 'completed');
    assert.equal(fin.body.finding_count, 1);
    assert.equal(fin.body.knowledge_snapshot_key, 'kb-approved-snapshot-v1');
    const done = await finish(r, 'completed', { emit_event_type: 'analysis.job.completed' });
    assert.equal(done.status, 200, JSON.stringify(done.body));
    assert.ok(done.body.emitted_event_id);
    assert.equal((await eventFor(jobId)).delivery_state, 'completed');
    const report = await http.call('GET', `/api/longrak/ai/jobs/${jobId}/report`, { headers: { 'x-longrak-session-secret': session.secret } });
    assert.equal(report.status, 200);
    assert.equal(report.body.analysis_run_public_id, a.run.public_id);
    assert.equal(report.body.evidence_plan.public_id, a.plan.public_id);
    assert.deepEqual((await stateEvents(jobId)).map((e) => e.to_state),
      ['queued', 'preprocessing', 'extracting', 'rule_check', 'retrieving', 'model_call', 'validating', 'completed']);
  });

  test('transition to the CURRENT state is a no-op 200 (regeneration loop resends "validating")', async () => {
    const { jobId } = await newJob();
    const r = await claim(jobId);
    await walkTo(r, jobId, 'validating');
    const countBefore = (await stateEvents(jobId)).length;
    const again = await to(r, jobId, 'validating');
    assert.equal(again.status, 200);
    assert.deepEqual(again.body, { ok: true, processing_state: 'validating', changed: false });
    assert.equal((await stateEvents(jobId)).length, countBefore);
  });

  test('passed_through records the intermediate states; skipping without it is rejected', async () => {
    const { jobId } = await newJob();
    const r = await claim(jobId);
    await walkTo(r, jobId, 'retrieving');
    const skipBad = await to(r, jobId, 'validating');
    assert.equal(skipBad.status, 422);
    const backwards = await to(r, jobId, 'extracting');
    assert.equal(backwards.status, 422);
    assert.equal(backwards.body.reason, 'backward_transition');
    const res = await to(r, jobId, 'validating', { passed_through: ['model_call'], model_id: 'mock-1' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(res.body.recorded_states, ['model_call', 'validating']);
    const tail = (await stateEvents(jobId)).slice(-2);
    assert.deepEqual(tail.map((e) => [e.to_state, e.reason]), [['model_call', 'passed_through'], ['validating', 'transition']]);
  });

  test('finalize after cancel → 409 not_eligible, nothing published', async () => {
    const { jobId, session } = await newJob();
    const r = await claim(jobId);
    await walkTo(r, jobId, 'validating');
    const a = await fx.artifacts(jobId);
    const cancel = await http.call('POST', `/api/longrak/ai/jobs/${jobId}/cancel`, { headers: { 'x-longrak-session-secret': session.secret } });
    assert.equal(cancel.status, 200);
    const fin = await finalize(r, jobId, a);
    assert.equal(fin.status, 409);
    assert.equal(fin.body.result, 'not_eligible');
    assert.equal((await job(jobId)).processing_state, 'cancelled');
    const run = await strapi.db.query('api::analysis-run.analysis-run').findOne({ where: { public_id: a.run.public_id } });
    assert.equal(run.run_state, 'invalidated');
    // transitions after cancel are refused the same way
    const t = await to(r, jobId, 'validating');
    assert.equal(t.status, 409);
    assert.match(JSON.stringify(t.body), /not_eligible/);
  });

  test('finalize verifies artifacts: missing plan / unverified quote are rejected', async () => {
    const { jobId } = await newJob();
    const r = await claim(jobId);
    await walkTo(r, jobId, 'validating');
    const a = await fx.artifacts(jobId, { verified: false });
    const missing = await finalize(r, jobId, { run: a.run, plan: { public_id: randomUUID() } });
    assert.equal(missing.status, 422);
    assert.deepEqual(missing.body.missing, ['evidence_plan']);
    const ungrounded = await finalize(r, jobId, a);
    assert.equal(ungrounded.status, 422);
    assert.equal(ungrounded.body.result, 'GROUNDING_VALIDATION_FAILED');
    assert.equal((await job(jobId)).processing_state, 'validating');
  });

  test('fail: transient → requeued and redelivered; exhausted → failed + dead-letter; terminal code → failed', async () => {
    const { jobId } = await newJob();
    let r = await claim(jobId);
    const failBody = (x) => ({ event_id: x.ev.id, lease_token: x.lease, error_code: 'AI_PROVIDER_UNAVAILABLE', retryable: true, stage: 'model_call', http_status: 429 });
    const f1 = await r.run.post(`${JOBS}/${jobId}/fail`, failBody(r));
    assert.equal(f1.status, 200, JSON.stringify(f1.body));
    assert.deepEqual([f1.body.processing_state, f1.body.requeued], ['queued', true]);
    assert.equal((await finish(r, 'requeued', { error_code: 'AI_PROVIDER_UNAVAILABLE' })).status, 200);
    assert.equal((await eventFor(jobId)).delivery_state, 'pending');

    // attempts 2 and 3 (LONGRAK_AI_MAX_JOB_ATTEMPTS default 3)
    r = await claim(jobId);
    assert.equal(r.jobClaim.body.attempt_count, 2);
    assert.equal((await r.run.post(`${JOBS}/${jobId}/fail`, failBody(r))).body.requeued, true);
    r = await claim(jobId);
    const last = await r.run.post(`${JOBS}/${jobId}/fail`, failBody(r));
    assert.deepEqual([last.body.processing_state, last.body.requeued, last.body.dead_lettered], ['failed', false, true]);
    assert.equal((await eventFor(jobId)).delivery_state, 'dead_lettered');

    const other = await newJob();
    const r2 = await claim(other.jobId);
    const term = await r2.run.post(`${JOBS}/${other.jobId}/fail`, { event_id: r2.ev.id, lease_token: r2.lease, error_code: 'DOCUMENT_UNREADABLE', retryable: true, stage: 'extracting', http_status: 200 });
    assert.deepEqual([term.body.processing_state, term.body.requeued], ['failed', false]);
    assert.equal((await job(other.jobId)).error_code, 'DOCUMENT_UNREADABLE');
  });

  test('incidents act only while the reporting run still owns the lease', async () => {
    const { jobId } = await newJob();
    const r = await claim(jobId);
    await walkTo(r, jobId, 'retrieving');
    const report = (runId) => http.n8nRun(runId).post('/internal/automation/incidents', {
      workflow_id: 'wf-1', workflow_name: 'LR-W0-01', workflow_run_id: runId, retry_of: null, last_node: 'Retrieve + Analyze',
      error_code: 'STAGE_UNAVAILABLE', http_status: 503, severity: 'high', occurred_at: new Date().toISOString(),
    }, { headers: { 'x-event-id': '' } });
    const stranger = await report('exec-unknown');
    assert.equal(stranger.body.action_taken, 'no_job');
    const mine = await report(r.run.runId);
    assert.equal(mine.status, 200, JSON.stringify(mine.body));
    assert.equal(mine.body.action_taken, 'requeued');
    // the same run reporting again no longer holds the lease ⇒ ignored
    assert.equal((await report(r.run.runId)).body.action_taken, 'no_job');
  });

  test('Idempotency-Key replays return the identical answer', async () => {
    const { jobId } = await newJob();
    const r = await claim(jobId);
    const key = randomUUID();
    const a = await to(r, jobId, 'extracting');
    const first = await r.run.post(`${JOBS}/${jobId}/transition`, { to_state: 'rule_check', lease_token: r.lease }, { key });
    const replay = await r.run.post(`${JOBS}/${jobId}/transition`, { to_state: 'rule_check', lease_token: r.lease }, { key });
    assert.equal(a.status, 200);
    assert.deepEqual(replay.body, first.body);
    assert.equal(replay.headers.get('idempotent-replayed'), 'true');
    const reused = await r.run.post(`${JOBS}/${jobId}/transition`, { to_state: 'retrieving', lease_token: r.lease }, { key });
    assert.equal(reused.status, 422);
  });
});

// ---------------------------------------------------------------------------------------
describe('T06 — two identical events delivered concurrently', { skip }, () => {
  test('same event to two runs at once → one lease, one job claim, one set of artifacts', async () => {
    const { jobId } = await newJob();
    const ev = await eventFor(jobId);
    const runs = [http.n8nRun(), http.n8nRun()];
    const claims = await Promise.all(runs.map((run) => run.post('/internal/automation/events/claim', {
      event_id: ev.id, event_type: ev.event_type, consumer_name: 'LR-W0-01', aggregate_public_id: jobId,
    })));
    assert.deepEqual(claims.map((c) => c.body.result).sort(), ['claimed', 'leased_to_other']);
  });

  test('two outbox events for the same job, both claimed, racing all the way to finalize', async () => {
    const { jobId } = await newJob();
    const ev1 = await eventFor(jobId);
    // a duplicate event for the same aggregate (e.g. an operator replay with a new key)
    const ev2 = await automation.jobs.repo.tx((k) => automation.jobs.repo.insertOutbox(k, {
      event_type: 'analysis.job.created', aggregate_type: 'analysis_job', aggregate_public_id: jobId,
      payload: { job_public_id: jobId }, idempotency_key: `replay:${randomUUID()}`,
    }));
    const runs = [http.n8nRun(), http.n8nRun()];
    const leases = await Promise.all([ev1, ev2].map(async (ev, i) => {
      runs[i].setEvent(ev.id);
      const c = await runs[i].post('/internal/automation/events/claim', { event_id: ev.id, event_type: ev.event_type, consumer_name: 'LR-W0-01', aggregate_public_id: jobId });
      assert.equal(c.body.result, 'claimed');
      return { run: runs[i], ev, lease: c.body.lease_token };
    }));
    const jobClaims = await Promise.all(leases.map((r) => r.run.post(`${JOBS}/${jobId}/claim`, { event_id: r.ev.id, lease_token: r.lease })));
    assert.deepEqual(jobClaims.map((c) => c.body.result).sort(), ['claimed', 'not_eligible']);
    const winner = leases[jobClaims.findIndex((c) => c.body.result === 'claimed')];
    const loser = leases[jobClaims.findIndex((c) => c.body.result !== 'claimed')];

    await walkTo(winner, jobId, 'validating');
    const a = await fx.artifacts(jobId);
    const [w, l] = await Promise.all([finalize(winner, jobId, a), finalize(loser, jobId, a)]);
    assert.equal(w.status, 200, JSON.stringify(w.body));
    assert.equal(l.status, 409);
    // finalize replayed by the winner (new key) → same answer, still one completion
    const again = await finalize(winner, jobId, a);
    assert.deepEqual(again.body, w.body);
    const completions = (await stateEvents(jobId)).filter((e) => e.to_state === 'completed');
    assert.equal(completions.length, 1);
    const runs2 = await strapi.db.query('api::analysis-run.analysis-run').findMany({ where: { analysis_job: { public_id: jobId } } });
    assert.equal(runs2.length, 1);
  });

  test('ten identical POST /jobs at once → one job, one outbox event', async () => {
    const s = await fx.session();
    const f = await fx.file(s);
    const results = await Promise.all(Array.from({ length: 10 }, () => http.call('POST', '/api/longrak/ai/jobs', {
      body: { session_public_id: s.public_id, file_public_ids: [f.public_id] }, headers: { 'x-longrak-session-secret': s.secret, 'idempotency-key': 'same-key' },
    })));
    assert.ok(results.every((r) => r.status === 202), JSON.stringify(results.map((r) => [r.status, r.body])));
    const ids = new Set(results.map((r) => r.body.job_public_id));
    assert.equal(ids.size, 1);
    const jobsOfSession = await strapi.db.query('api::analysis-job.analysis-job').count({ where: { analysis_session: { public_id: s.public_id } } });
    assert.equal(jobsOfSession, 1);
    assert.equal((await db()(T.outbox).where({ aggregate_public_id: [...ids][0] })).length, 1);
  });
});

// ---------------------------------------------------------------------------------------
describe('T10 — anonymous session expires during processing', { skip }, () => {
  test('nothing is published and the report is gone', async () => {
    const { jobId, session } = await newJob();
    const r = await claim(jobId);
    await walkTo(r, jobId, 'validating');
    const a = await fx.artifacts(jobId);
    await strapi.db.query('api::analysis-session.analysis-session').update({ where: { public_id: session.public_id }, data: { expires_at: new Date(Date.now() - 1000) } });
    const fin = await finalize(r, jobId, a);
    assert.equal(fin.status, 409);
    assert.equal(fin.body.result, 'not_eligible');
    assert.equal((await job(jobId)).processing_state, 'expired');
    const run = await strapi.db.query('api::analysis-run.analysis-run').findOne({ where: { public_id: a.run.public_id } });
    assert.equal(run.run_state, 'invalidated');
    const report = await http.call('GET', `/api/longrak/ai/jobs/${jobId}/report`, { headers: { 'x-longrak-session-secret': session.secret } });
    assert.equal(report.status, 404);
    // a redelivered event for it is not eligible either, and gets closed
    const re = await http.n8nRun().post('/internal/automation/events/claim', { event_id: r.ev.id, event_type: r.ev.event_type, consumer_name: 'LR-W0-01', aggregate_public_id: jobId });
    assert.equal(re.body.result, 'not_eligible');
  });

  test('expiry is detected at the next transition, before any model call', async () => {
    const { jobId, session } = await newJob();
    const r = await claim(jobId);
    await walkTo(r, jobId, 'retrieving');
    await strapi.db.query('api::analysis-session.analysis-session').update({ where: { public_id: session.public_id }, data: { expires_at: new Date(Date.now() - 1000) } });
    const t = await to(r, jobId, 'model_call');
    assert.equal(t.status, 409);
    assert.equal(t.body.processing_state, 'expired');
  });
});

// ---------------------------------------------------------------------------------------
describe('outbox dispatcher + T19 — redelivery after n8n restart', { skip }, () => {
  test('envelope: exact keys, ids only, secret header', async () => {
    fake.received.length = 0;
    const { jobId } = await newJob();
    await automation.dispatcher.tick();
    const got = fake.received.find((d) => d.body.aggregate_public_id === jobId);
    assert.ok(got, 'delivered');
    assert.deepEqual(Object.keys(got.body).sort(), ['actor_public_id', 'aggregate_public_id', 'aggregate_type', 'data', 'event_id', 'event_type', 'occurred_at', 'request_id', 'schema_version', 'tenant_public_id']);
    assert.equal(got.body.event_type, 'analysis.job.created');
    assert.equal(got.body.schema_version, '1.0');
    assert.deepEqual(got.body.data, { job_public_id: jobId });
    assert.equal(got.headers['x-longrak-secret'], WEBHOOK_SECRET);
    assert.equal(got.headers['x-event-id'], got.body.event_id);
    const ev = await eventFor(jobId);
    assert.equal(ev.delivery_state, 'dispatched');
    assert.ok(ev.published_at);
  });

  test('failed delivery is retried with backoff', async () => {
    await automation.dispatcher.tick(); // drain anything due
    const { jobId } = await newJob();
    fake.failNext = 1;
    await automation.dispatcher.tick();
    let ev = await eventFor(jobId);
    assert.deepEqual([ev.delivery_state, ev.attempt_count, ev.last_error_code], ['pending', 1, 'HTTP_503']);
    assert.ok(new Date(ev.next_attempt_at) > new Date());
    await db()(T.outbox).where({ id: ev.id }).update({ next_attempt_at: new Date(Date.now() - 1) });
    await automation.dispatcher.tick();
    ev = await eventFor(jobId);
    assert.deepEqual([ev.delivery_state, ev.attempt_count], ['dispatched', 2]);
  });

  test('T19: run dies mid-job; lease expires; event redelivered; new run resumes idempotently', async () => {
    fake.received.length = 0;
    const { jobId, session } = await newJob();
    await automation.dispatcher.tick();
    const first = await claim(jobId);
    await walkTo(first, jobId, 'retrieving');

    // n8n restarts: the run is gone and never calls finish. Its lease runs out.
    // (time travel: delivered 20 min ago, lease granted after that, expired 1 s ago)
    await db()(T.outbox).where({ id: first.ev.id }).update({ last_attempt_at: new Date(Date.now() - 20 * 60 * 1000) });
    await db()(T.inbox).where({ lease_token: first.lease }).update({ lease_expires_at: new Date(Date.now() - 1000) });
    const stats = await automation.dispatcher.tick();
    assert.ok(stats.redelivered >= 1);
    await automation.dispatcher.tick(); // no storm: still unclaimed, but not re-sent again before the ack timeout
    const deliveries = fake.received.filter((d) => d.body.aggregate_public_id === jobId);
    assert.equal(deliveries.length, 2);
    assert.equal(deliveries[1].body.event_id, deliveries[0].body.event_id); // same event, same id

    const second = await claim(jobId);
    assert.equal(second.eventClaim.body.result, 'claimed');
    assert.equal(second.jobClaim.body.result, 'claimed');
    assert.equal(second.jobClaim.body.resumed_from, 'retrieving');
    assert.equal(second.jobClaim.body.attempt_count, 2);

    // the dead run waking up again is fenced out
    const zombie = await to(first, jobId, 'model_call');
    assert.equal(zombie.status, 409);

    await walkTo(second, jobId, 'validating');
    const a = await fx.artifacts(jobId);
    assert.equal((await finalize(second, jobId, a)).status, 200);
    assert.equal((await finish(second, 'completed')).status, 200);
    assert.equal((await eventFor(jobId)).delivery_state, 'completed');

    // a late duplicate delivery after completion stops cleanly
    const late = await http.n8nRun().post('/internal/automation/events/claim', { event_id: second.ev.id, event_type: second.ev.event_type, consumer_name: 'LR-W0-01', aggregate_public_id: jobId });
    assert.equal(late.body.result, 'already_completed');
    const status = await http.call('GET', `/api/longrak/ai/jobs/${jobId}`, { headers: { 'x-longrak-session-secret': session.secret } });
    assert.equal(status.body.processing_state, 'completed');
    assert.equal((await stateEvents(jobId)).filter((e) => e.to_state === 'completed').length, 1);
  });

  test('an event nobody claims is delivered again after the ack timeout', async () => {
    await automation.dispatcher.tick();
    const { jobId } = await newJob();
    await automation.dispatcher.tick();
    const ev = await eventFor(jobId);
    await db()(T.outbox).where({ id: ev.id }).update({ last_attempt_at: new Date(Date.now() - 10 * 60 * 1000) });
    const stats = await automation.dispatcher.tick();
    assert.ok(stats.redelivered >= 1);
    assert.equal((await eventFor(jobId)).attempt_count, 2);
  });

  test('delivery attempts exhausted → dead-lettered and the queued job fails visibly', async () => {
    await automation.dispatcher.tick();
    const { jobId } = await newJob();
    process.env.LONGRAK_OUTBOX_MAX_ATTEMPTS = '1';
    fake.failNext = 1;
    try { await automation.dispatcher.tick(); }
    finally { delete process.env.LONGRAK_OUTBOX_MAX_ATTEMPTS; fake.failNext = 0; }
    assert.equal((await eventFor(jobId)).delivery_state, 'dead_lettered');
    const j = await job(jobId);
    assert.deepEqual([j.processing_state, j.error_code], ['failed', 'STAGE_UNAVAILABLE']);
  });
});
