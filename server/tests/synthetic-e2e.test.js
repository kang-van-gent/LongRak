'use strict';

/**
 * End to end with the SYNTHETIC mock AI service: every fixture scenario driven exactly the way
 * the LR-W0-01 n8n workflow calls Strapi (claim → transitions → /internal/ai/* → finalize/fail
 * → finish). Needs TEST_DATABASE_URL (empty PostgreSQL).
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { bootStrapi, client, AI_TOKEN } = require('./helpers/harness');

const skip = !process.env.TEST_DATABASE_URL && 'TEST_DATABASE_URL not set (PostgreSQL required)';
let strapi; let base; let fake; let http; let synthetic;

before(async () => {
  if (skip) return;
  ({ strapi, base, fake } = await bootStrapi());
  http = client(base);
  synthetic = require('../src/automation/synthetic');
});
after(async () => {
  if (skip) return;
  await strapi?.destroy();
  await fake?.close();
});

const ai = (jobId, stage, body) => http.call('POST', `/internal/ai/jobs/${jobId}/${stage}`, { body, headers: { authorization: `Bearer ${AI_TOKEN}` } });

/** The LR-W0-01 workflow, as specified to the n8n side. Returns how it ended. */
async function workflow(f, { tries = 3 } = {}) {
  const run = http.n8nRun();
  run.setEvent(f.event_id);
  const jobId = f.job_public_id;
  const c = await run.post('/internal/automation/events/claim', { event_id: f.event_id, event_type: 'analysis.job.created', consumer_name: 'LR-W0-01', aggregate_public_id: jobId });
  if (c.body.result !== 'claimed') return `event:${c.body.result}`;
  const lease = c.body.lease_token;
  const j = await run.post(`/internal/automation/analysis-jobs/${jobId}/claim`, { event_id: f.event_id, lease_token: lease });
  if (j.body.result !== 'claimed') return `job:${j.body.result}`;

  const to = async (state) => {
    const r = await run.post(`/internal/automation/analysis-jobs/${jobId}/transition`, { to_state: state, lease_token: lease });
    return r.status === 200 ? null : `transition:${r.body.result}`;
  };
  const finish = (outcome, extra = {}) => run.post('/internal/automation/events/finish', { event_id: f.event_id, consumer_name: 'LR-W0-01', lease_token: lease, outcome, ...extra });
  const fail = async (error_code, retryable, stage, http_status = 200) => {
    const r = await run.post(`/internal/automation/analysis-jobs/${jobId}/fail`, { event_id: f.event_id, lease_token: lease, error_code, retryable, stage, http_status });
    if (r.status !== 200) return `fail:${r.body.result}`;
    await finish(r.body.requeued ? 'requeued' : 'failed', { error_code });
    return r.body.requeued ? `requeued:${error_code}` : `failed:${error_code}`;
  };

  let stop = await to('extracting'); if (stop) return stop;
  const ex = await ai(jobId, 'extract', { stage_version: 'v1', ocr_fallback: true });
  if (ex.body.extraction_state === 'rejected') return fail('FILE_REJECTED', false, 'extracting');
  if (ex.body.extraction_state === 'unreadable') return fail('DOCUMENT_UNREADABLE', false, 'extracting');
  stop = await to('rule_check'); if (stop) return stop;
  const rules = await ai(jobId, 'apply-rules', { stage_version: 'v1' });
  stop = await to('retrieving'); if (stop) return stop;
  stop = await to('model_call'); if (stop) return stop;
  let an;
  for (let i = 0; i < tries; i += 1) {
    an = await ai(jobId, 'retrieve-and-analyze', { stage_version: 'v1', regenerate: false, ruleset_version_key: rules.body.ruleset_version_key, input_digest: rules.body.input_digest });
    if (an.status < 500) break;
  }
  if (an.status >= 500) return fail(an.body.error_code, true, 'model_call', an.status);
  stop = await to('validating'); if (stop) return stop;
  let v = await ai(jobId, 'validate-and-build-plan', { stage_version: 'v1', analysis_run_public_id: an.body.analysis_run_public_id, candidate_result_ref: an.body.candidate_result_ref });
  if (v.body.validation_state === 'invalid') { // one controlled regeneration
    const again = await ai(jobId, 'retrieve-and-analyze', { stage_version: 'v1', regenerate: true, ruleset_version_key: rules.body.ruleset_version_key, input_digest: rules.body.input_digest });
    stop = await to('validating'); if (stop) return stop; // resend of the current state: no-op
    v = await ai(jobId, 'validate-and-build-plan', { stage_version: 'v1', analysis_run_public_id: again.body.analysis_run_public_id, candidate_result_ref: again.body.candidate_result_ref });
    if (v.body.validation_state === 'invalid') return fail(v.body.error_code ?? 'MODEL_OUTPUT_INVALID', false, 'validating');
  }
  const fin = await run.post(`/internal/automation/analysis-jobs/${jobId}/finalize`, {
    event_id: f.event_id, lease_token: lease, analysis_run_public_id: an.body.analysis_run_public_id, validated_result_ref: v.body.validated_result_ref,
    validation_state: v.body.validation_state, evidence_plan_public_id: v.body.evidence_plan_public_id, schema_version: '1.0',
  });
  if (fin.status === 422) return fail(fin.body.result, false, 'finalize', 422);
  if (fin.status !== 200) return `finalize:${fin.body.result}`;
  await finish('completed', { emit_event_type: 'analysis.job.completed' });
  return 'completed';
}

const jobState = async (id) => (await strapi.db.query('api::analysis-job.analysis-job').findOne({ where: { public_id: id } }));

describe('synthetic scenarios through the mock AI service', { skip }, () => {
  test('mock AI needs its token and refuses non-synthetic jobs', async () => {
    const f = await synthetic.createScenarioJob(strapi, 'happy');
    assert.equal((await http.call('POST', `/internal/ai/jobs/${f.job_public_id}/extract`, { body: {} })).status, 401);
    await strapi.db.query('api::file-asset.file-asset').updateMany({ where: { analysis_session: { public_id: f.session_public_id } }, data: { metadata_safe: { page_count: 2 } } });
    const real = await ai(f.job_public_id, 'extract', {});
    assert.equal(real.status, 403);
    assert.equal(real.body.reason, 'not_synthetic');
  });

  const cases = {
    happy: ['completed', 'completed', null],
    file_rejected: ['failed:FILE_REJECTED', 'failed', 'FILE_REJECTED'],
    unreadable: ['failed:DOCUMENT_UNREADABLE', 'failed', 'DOCUMENT_UNREADABLE'],
    model_invalid_twice: ['failed:MODEL_OUTPUT_INVALID', 'failed', 'MODEL_OUTPUT_INVALID'],
    grounding_fail_at_finalize: ['failed:GROUNDING_VALIDATION_FAILED', 'failed', 'GROUNDING_VALIDATION_FAILED'],
    cancelled_mid_run: ['transition:not_eligible', 'cancelled', null],
  };
  for (const [scenario, [ending, state, code]] of Object.entries(cases)) {
    test(scenario, async () => {
      const f = await synthetic.createScenarioJob(strapi, scenario);
      assert.equal(await workflow(f), ending);
      const j = await jobState(f.job_public_id);
      assert.equal(j.processing_state, state);
      assert.equal(j.error_code ?? null, code);
    });
  }

  test('happy: report is readable by the owner and labelled synthetic', async () => {
    const f = await synthetic.createScenarioJob(strapi, 'happy');
    assert.equal(await workflow(f), 'completed');
    const r = await http.call('GET', `/api/longrak/ai/jobs/${f.job_public_id}/report`, { headers: { 'x-longrak-session-secret': f.session_secret } });
    assert.equal(r.status, 200);
    assert.equal(r.body.report.synthetic, true);
    assert.equal(r.body.evidence_plan.items.length, 2);
    // re-running the AI stages is idempotent: still one run, one plan
    await ai(f.job_public_id, 'retrieve-and-analyze', { stage_version: 'v1' });
    await ai(f.job_public_id, 'validate-and-build-plan', { stage_version: 'v1', analysis_run_public_id: r.body.analysis_run_public_id });
    const runs = await strapi.db.query('api::analysis-run.analysis-run').findMany({ where: { analysis_job: { public_id: f.job_public_id } }, populate: { evidence_plan_drafts: true, analysis_findings: true } });
    assert.equal(runs.length, 1);
    assert.equal(runs[0].evidence_plan_drafts.length, 1);
    assert.equal(runs[0].analysis_findings.length, 2);
  });

  test('retryable_then_valid: attempt 1 requeued, redelivered event completes on attempt 2', async () => {
    const f = await synthetic.createScenarioJob(strapi, 'retryable_then_valid');
    assert.equal(await workflow(f), 'requeued:AI_PROVIDER_UNAVAILABLE');
    const ev = await strapi.db.connection('lr_domain_outbox_events').where({ id: f.event_id }).first();
    assert.equal(ev.delivery_state, 'pending');
    assert.ok(new Date(ev.next_attempt_at) > new Date()); // backoff before redelivery
    assert.equal(await workflow(f), 'completed'); // same event_id, new execution
    const j = await jobState(f.job_public_id);
    assert.deepEqual([j.processing_state, j.attempt_count, j.last_error_code], ['completed', 2, 'AI_PROVIDER_UNAVAILABLE']);
  });

  test('duplicate_event: same event to two executions at once → one runs, one stops', async () => {
    const f = await synthetic.createScenarioJob(strapi, 'duplicate_event');
    const endings = await Promise.all([workflow(f), workflow(f)]);
    assert.deepEqual(endings.sort(), ['completed', 'event:leased_to_other']);
    const completions = await strapi.db.connection('lr_analysis_job_state_events').where({ job_public_id: f.job_public_id, to_state: 'completed' });
    assert.equal(completions.length, 1);
  });
});
