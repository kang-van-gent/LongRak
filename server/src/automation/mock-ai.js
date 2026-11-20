'use strict';

/**
 * MOCK AI SERVICE — SYNTHETIC DEMO MODE ONLY (spec.md §10 AI_PROVIDER=mock, Sprint N1).
 *
 * Stands in for the future private document/AI service so n8n can run LR-W0-01 end to end.
 * It reads no document, calls no model and produces fixed, clearly labelled synthetic output.
 *
 *  - Mounted only when AI_PROVIDER=mock; auth `Authorization: Bearer <LONGRAK_AI_SERVICE_TOKEN>`.
 *  - Refuses (403 STAGE_INPUT_REJECTED) any job whose files are not marked
 *    metadata_safe.synthetic = true (fixtures) or demo_upload = true (uploaded through the website
 *    while AI_PROVIDER=mock — the report is fake whatever the file contains, and labelled so).
 *  - Behaviour per scenario comes from metadata_safe.synthetic_scenario (see synthetic.js).
 *  - Idempotent by job + input digest + stage version: repeated calls return the same ids and
 *    never duplicate runs, findings or plans.
 *  - Business outcomes: 200 with a state field. Real errors: 4xx/5xx with { error_code }.
 *    Responses carry ids, states and counts only.
 *
 * The real AI service will be a separate container (spec §13); n8n then only changes its base URL.
 */
const { createHash, timingSafeEqual } = require('node:crypto');
const { JOB_UID, RUN_UID } = require('./constants');

const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
const PROMPT = 'mock-prompt-v0';
const RULESET = 'mock-rules-v0';
const SNAPSHOT = 'synthetic-kb-v0';
const LABEL = 'SYNTHETIC DEMO — not a real analysis';

function authorised(ctx) {
  const token = process.env.LONGRAK_AI_SERVICE_TOKEN || '';
  const auth = ctx.get('authorization');
  const given = Buffer.from(auth.startsWith('Bearer ') ? auth.slice(7) : '');
  const want = Buffer.from(token);
  return token && given.length === want.length && timingSafeEqual(given, want);
}

module.exports = function mockAiRoutes(strapi, jobs) {
  const docs = (uid) => strapi.documents(uid);
  const connect = (d) => ({ connect: [{ documentId: d.documentId }] });

  /** Job + its synthetic inputs, or an error response. */
  async function load(publicId) {
    const job = await strapi.db.query(JOB_UID).findOne({
      where: { public_id: publicId },
      populate: { analysis_inputs: { populate: { file_asset: true } } },
    });
    if (!job) return { error: [404, { error_code: 'STAGE_INPUT_REJECTED', reason: 'job_not_found' }] };
    const metas = job.analysis_inputs.map((i) => (typeof i.file_asset?.metadata_safe === 'string' ? JSON.parse(i.file_asset.metadata_safe) : i.file_asset?.metadata_safe) ?? {});
    if (!metas.length || metas.some((m) => m.synthetic !== true && m.demo_upload !== true)) {
      return { error: [403, { error_code: 'STAGE_INPUT_REJECTED', reason: 'not_synthetic' }] };
    }
    const fingerprint = sha256(job.analysis_inputs.map((i) => i.file_asset.sha256).sort().join(':'));
    return { job, scenario: metas[0].synthetic_scenario ?? 'happy', pages: metas.reduce((n, m) => n + (m.page_count ?? 1), 0), fingerprint };
  }

  const stageVersion = (b) => (typeof b.stage_version === 'string' ? b.stage_version.slice(0, 40) : 'v1');

  async function extract(c, b) {
    const read = { file_rejected: ['rejected', 'unreadable', ['synthetic', 'mime_mismatch']], unreadable: ['unreadable', 'unreadable', ['synthetic', 'ocr_quality_low']] }[c.scenario]
      ?? ['ok', 'complete', ['synthetic']];
    const inputState = read[0] === 'ok' ? 'complete' : 'failed';
    for (const input of c.job.analysis_inputs) {
      await strapi.db.query('api::analysis-input.analysis-input').update({ where: { id: input.id }, data: { extraction_state: inputState } });
    }
    return [200, { extraction_state: read[0], document_read_status: read[1], page_count: read[0] === 'rejected' ? 0 : c.pages, quality_flags: read[2], stage_version: stageVersion(b) }];
  }

  async function applyRules(c, b) {
    return [200, {
      rules_state: 'ok', ruleset_version_key: RULESET, issues_count: 2, fact_conflict: false,
      input_digest: sha256(`${c.fingerprint}:${RULESET}:${stageVersion(b)}`),
    }];
  }

  async function retrieveAndAnalyze(c, b) {
    if (c.scenario === 'retryable_then_valid' && c.job.attempt_count <= 1) {
      return [503, { error_code: 'AI_PROVIDER_UNAVAILABLE', reason: 'synthetic_outage_on_attempt_1' }];
    }
    // one run per job + input fingerprint (+ prompt version): retries and regenerate reuse it
    let run = await strapi.db.query(RUN_UID).findOne({
      where: { analysis_job: { id: c.job.id }, input_fingerprint_sha256: c.fingerprint, prompt_version_key: PROMPT, run_state: { $in: ['running', 'completed'] } },
    });
    if (!run) {
      const count = await strapi.db.query(RUN_UID).count({ where: { analysis_job: { id: c.job.id } } });
      run = await docs(RUN_UID).create({
        data: {
          run_no: count + 1, run_state: 'running', model_provider_key: 'mock', model_id: 'mock', model_config_digest: sha256('mock'),
          prompt_version_key: PROMPT, ruleset_version_key: RULESET, knowledge_snapshot_key: SNAPSHOT, schema_version: '1.0',
          output_language: c.job.requested_language ?? 'th', document_read_status: 'complete', started_at: new Date(),
          input_fingerprint_sha256: c.fingerprint, total_tokens: 0, estimated_cost_thb: 0,
          result_json_private: {
            schema_version: '1.0', synthetic: true, label: LABEL, analysis_id: c.job.public_id, document_type: 'quotation',
            document_read_status: 'complete', summary: `${LABEL}. Nothing in your file was read; these findings are fixed test data.`,
            amounts: {}, findings: [], missing_information: ['[SYNTHETIC] Warranty period'], limitations: [LABEL],
            knowledge_snapshot_id: SNAPSHOT, model_id: 'mock', created_at: new Date().toISOString(),
          },
          analysis_job: connect(c.job),
        },
      });
    }
    if (c.scenario === 'cancelled_mid_run') await jobs.cancelUnchecked(c.job.public_id, 'cancel_synthetic'); // "user cancels while the model runs"
    return [200, {
      analysis_state: 'ok', analysis_run_public_id: run.public_id,
      candidate_result_ref: `mock://candidate/${run.public_id}/${b.regenerate ? 'regenerated' : 'first'}`,
      model_id: 'mock', prompt_version_key: PROMPT, knowledge_snapshot_key: SNAPSHOT,
    }];
  }

  async function validateAndBuildPlan(c, b) {
    const run = await strapi.db.query(RUN_UID).findOne({ where: { public_id: String(b.analysis_run_public_id ?? ''), analysis_job: { id: c.job.id } } });
    if (!run) return [404, { error_code: 'STAGE_INPUT_REJECTED', reason: 'run_not_found' }];
    if (c.scenario === 'model_invalid_twice') {
      return [200, { validation_state: 'invalid', validated_result_ref: null, evidence_plan_public_id: null, finding_count: 0, unverifiable_claim_count: 0, error_code: 'MODEL_OUTPUT_INVALID' }];
    }

    let plan = await strapi.db.query('api::evidence-plan-draft.evidence-plan-draft').findOne({ where: { analysis_run: { id: run.id } } });
    if (!plan) {
      const grounded = c.scenario !== 'grounding_fail_at_finalize';
      const findings = [
        { finding_code: 'SYN-DEPOSIT', dimension: 'deposit', finding_state: 'present_in_document', severity: 'review_required', title: '[SYNTHETIC] Deposit before work starts', source_quote_verified: grounded },
        { finding_code: 'SYN-WARRANTY', dimension: 'warranty', finding_state: 'missing_information', severity: 'medium', title: '[SYNTHETIC] No warranty period found', source_quote_verified: false },
      ];
      for (const f of findings) {
        await docs('api::analysis-finding.analysis-finding').create({
          data: { ...f, explanation: LABEL, confidence_level: 'unknown', needs_professional_review: f.severity === 'review_required', analysis_run: connect(run) },
        });
      }
      plan = await docs('api::evidence-plan-draft.evidence-plan-draft').create({
        data: {
          plan_title: '[SYNTHETIC] Evidence plan', generated_from_run_public_id: run.public_id, generation_state: 'proposed',
          work_type: 'builtin', plan_json_digest: sha256(`plan:${run.public_id}`), created_at_business: new Date(), analysis_run: connect(run),
        },
      });
      for (const label of ['[SYNTHETIC] Signed quotation', '[SYNTHETIC] Deposit transfer slip']) {
        await docs('api::evidence-plan-item.evidence-plan-item').create({ data: { requirement_label: label, evidence_plan_draft: connect(plan) } });
      }
      const result = typeof run.result_json_private === 'string' ? JSON.parse(run.result_json_private) : run.result_json_private;
      await strapi.db.query(RUN_UID).update({
        where: { id: run.id },
        data: {
          result_json_private: {
            ...result,
            findings: findings.map((f) => ({
              id: f.finding_code, dimension: f.dimension, status: f.finding_state, title: f.title, reason: LABEL,
              document_evidence: [], knowledge_citations: [], needs_professional_review: f.severity === 'review_required',
              question_to_ask: '[SYNTHETIC] Example question to ask the other side',
            })),
          },
        },
      });
    }
    const all = await strapi.db.query('api::analysis-finding.analysis-finding').findMany({ where: { analysis_run: { id: run.id } }, select: ['finding_state', 'source_quote_verified'] });
    return [200, {
      validation_state: 'valid',
      validated_result_ref: `mock://validated/${run.public_id}`,
      evidence_plan_public_id: plan.public_id,
      finding_count: all.length,
      unverifiable_claim_count: all.filter((f) => f.finding_state === 'present_in_document' && !f.source_quote_verified).length,
      error_code: null,
    }];
  }

  const handler = (fn) => async (ctx) => {
    if (!process.env.LONGRAK_AI_SERVICE_TOKEN) { ctx.status = 503; ctx.body = { error_code: 'STAGE_UNAVAILABLE', reason: 'ai_service_token_not_set' }; return; }
    if (!authorised(ctx)) { ctx.status = 401; ctx.body = { error_code: 'AUTHORIZATION_FAILED' }; return; }
    const body = ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {};
    try {
      const c = await load(ctx.params.id);
      const [status, out] = c.error ?? await fn(c, body);
      ctx.status = status;
      ctx.body = { synthetic: true, ...out };
    }
    catch (err) {
      strapi.log.error(`[mock-ai] ${ctx.path} failed: ${err.message}`);
      ctx.status = 500;
      ctx.body = { synthetic: true, error_code: 'STAGE_ERROR_UNCLASSIFIED' };
    }
  };

  const config = { auth: false };
  return [
    { method: 'POST', path: '/internal/ai/jobs/:id/extract', config, handler: handler(extract) },
    { method: 'POST', path: '/internal/ai/jobs/:id/apply-rules', config, handler: handler(applyRules) },
    { method: 'POST', path: '/internal/ai/jobs/:id/retrieve-and-analyze', config, handler: handler(retrieveAndAnalyze) },
    { method: 'POST', path: '/internal/ai/jobs/:id/validate-and-build-plan', config, handler: handler(validateAndBuildPlan) },
  ];
};
