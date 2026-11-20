'use strict';

/**
 * SYNTHETIC DEMO MODE ONLY (spec.md Sprint N1, §18 #8).
 * Test fixtures for LR-W0-01: creates a session, synthetic "files" (metadata only, no bytes)
 * and a queued job through the normal job service, so the outbox event is real.
 *
 * Every fixture file carries metadata_safe.synthetic = true and the scenario name; the mock AI
 * service refuses any job whose files are not marked synthetic.
 */
const { createHash, randomUUID } = require('node:crypto');

const SCENARIOS = {
  happy: 'completes: claim → all stages → finalize → finish(completed)',
  file_rejected: 'extract → extraction_state "rejected" ⇒ n8n fails FILE_REJECTED',
  unreadable: 'extract → extraction_state "unreadable" ⇒ n8n fails DOCUMENT_UNREADABLE',
  retryable_then_valid: 'attempt 1: retrieve-and-analyze answers 503 AI_PROVIDER_UNAVAILABLE ⇒ fail(retryable) ⇒ requeued, redelivered after ~15 s ⇒ attempt 2 completes',
  model_invalid_twice: 'validate-and-build-plan → "invalid" MODEL_OUTPUT_INVALID, also after regenerate ⇒ n8n fails MODEL_OUTPUT_INVALID',
  grounding_fail_at_finalize: 'validate says "valid" but persists an unverified quote ⇒ finalize 422 GROUNDING_VALIDATION_FAILED ⇒ n8n fails it',
  cancelled_mid_run: 'the job is cancelled during retrieve-and-analyze ⇒ next transition 409 not_eligible ⇒ n8n stops',
  duplicate_event: 'same event_id delivered twice at once ⇒ one run claimed, the other leased_to_other; completes once',
};

const isSyntheticMode = () => process.env.AI_PROVIDER === 'mock';
const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');

async function createScenarioJob(strapi, scenario, { requestId } = {}) {
  if (!SCENARIOS[scenario]) throw new Error(`unknown scenario "${scenario}" — one of: ${Object.keys(SCENARIOS).join(', ')}`);
  const docs = (uid) => strapi.documents(uid);
  const connect = (d) => ({ connect: [{ documentId: d.documentId }] });
  const now = new Date();
  const secret = randomUUID() + randomUUID();

  const session = await docs('api::analysis-session.analysis-session').create({
    data: {
      mode: 'sample', session_state: 'open', session_secret_digest: sha256(secret),
      expires_at: new Date(now.getTime() + 2 * 3600000), source_page: `synthetic:${scenario}`,
    },
  });
  for (const purpose of ['document_rights', 'ai_document_processing']) {
    await docs('api::consent-receipt.consent-receipt').create({
      data: { purpose_code: purpose, choice: 'accepted', captured_at: now, capture_method: 'other', legal_basis_record: 'synthetic_test', analysis_session: connect(session) },
    });
  }
  const file = await docs('api::file-asset.file-asset').create({
    data: {
      purpose: 'demo_input', mime_detected: 'application/pdf', byte_size: 120000, sha256: sha256(`synthetic:${scenario}:${randomUUID()}`),
      upload_state: 'accepted', uploaded_at: now,
      metadata_safe: { synthetic: true, synthetic_scenario: scenario, page_count: 2 },
      analysis_session: connect(session),
    },
  });

  const { automation } = require('./index');
  const res = await automation(strapi).jobs.createJob({
    session_public_id: session.public_id,
    file_public_ids: [file.public_id],
    document_type: 'quotation',
    idempotency_key: `synthetic:${randomUUID()}`,
    request_id: requestId ?? `synthetic-${scenario}-${randomUUID().slice(0, 8)}`,
  }, { secret });
  if (res.status !== 202) throw new Error(`job not created: ${res.status} ${JSON.stringify(res.body)}`);
  const event = await strapi.db.connection('lr_domain_outbox_events').where({ aggregate_public_id: res.body.job_public_id }).first();
  return { scenario, job_public_id: res.body.job_public_id, event_id: event.id, session_public_id: session.public_id, session_secret: secret };
}

module.exports = { SCENARIOS, createScenarioJob, isSyntheticMode };
