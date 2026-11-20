'use strict';

/**
 * Test harness: boots this Strapi app in-process against TEST_DATABASE_URL (PostgreSQL),
 * starts a fake n8n webhook, and offers fixture builders that stand in for the parts that
 * don't exist yet (upload/scan service, AI service persisting artifacts).
 *
 * The database must be EMPTY and disposable — tests create and change rows freely.
 */
const http = require('node:http');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');

const SERVICE_TOKEN = 'test-internal-service-token';
const WEBHOOK_SECRET = 'test-dispatcher-secret';
const AI_TOKEN = 'test-ai-service-token';

function configureEnv(webhookUrl) {
  const url = new URL(process.env.TEST_DATABASE_URL);
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_CLIENT: 'postgres',
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    DATABASE_HOST: url.hostname,
    DATABASE_PORT: url.port || '5432',
    DATABASE_NAME: url.pathname.slice(1),
    DATABASE_USERNAME: decodeURIComponent(url.username),
    DATABASE_PASSWORD: decodeURIComponent(url.password),
    APP_KEYS: 'testKeyA,testKeyB',
    API_TOKEN_SALT: 'test-api-token-salt',
    ADMIN_JWT_SECRET: 'test-admin-jwt-secret',
    TRANSFER_TOKEN_SALT: 'test-transfer-salt',
    JWT_SECRET: 'test-jwt-secret',
    ENCRYPTION_KEY: 'test-encryption-key',
    LONGRAK_SEED: 'false',
    LONGRAK_INTERNAL_SERVICE_TOKEN: SERVICE_TOKEN,
    LONGRAK_N8N_EVENT_WEBHOOK_URL: webhookUrl,
    LONGRAK_N8N_EVENT_WEBHOOK_SECRET: WEBHOOK_SECRET,
    LONGRAK_OUTBOX_DISPATCHER: 'false', // tests drive dispatcher.tick() themselves
    LONGRAK_AI_DAILY_JOB_QUOTA: '1000',
    AI_PROVIDER: 'mock',
    LONGRAK_AI_SERVICE_TOKEN: AI_TOKEN,
    LONGRAK_PUBLIC_WRITE_LIMIT: '100000',
    LONGRAK_PUBLIC_READ_LIMIT: '100000',
    STRAPI_TELEMETRY_DISABLED: 'true',
    BROWSER: 'false',
  });
}

/** Fake n8n webhook that records every delivery. `failNext` makes the next N calls 503. */
function startFakeN8n() {
  const fake = { received: [], failNext: 0 };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      if (fake.failNext > 0) { fake.failNext -= 1; res.writeHead(503).end(); return; }
      fake.received.push({ headers: req.headers, body: JSON.parse(raw || 'null') });
      res.writeHead(202).end(); // n8n Webhook node: Respond = Immediately, 202
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    fake.url = `http://127.0.0.1:${server.address().port}/webhook/longrak/analysis-job`;
    fake.close = () => new Promise((r) => server.close(r));
    resolve(fake);
  }));
}

async function bootStrapi() {
  if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is not set');
  const fake = await startFakeN8n();
  configureEnv(fake.url);
  const { createStrapi } = require('@strapi/strapi');
  const appDir = path.resolve(__dirname, '..', '..');
  let strapi;
  try { strapi = await createStrapi({ appDir, distDir: appDir }).load(); }
  catch (err) { await fake.close(); throw err; }
  strapi.log.level = 'error';
  await new Promise((resolve) => strapi.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${strapi.server.httpServer.address().port}`;
  return { strapi, base, fake };
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

/** Fixtures that the (future) upload/scan service would create. */
function fixtures(strapi) {
  const docs = (uid) => strapi.documents(uid);
  const connect = (d) => ({ connect: [{ documentId: d.documentId }] });

  async function session({ expiresInMs = 3600000, consents = ['document_rights', 'ai_document_processing'], bucket = null } = {}) {
    const secret = randomUUID() + randomUUID();
    const s = await docs('api::analysis-session.analysis-session').create({
      data: {
        mode: 'anonymous_upload', session_state: 'open', session_secret_digest: sha256(secret),
        expires_at: new Date(Date.now() + expiresInMs), usage_quota_bucket: bucket,
      },
    });
    for (const purpose of consents) {
      await docs('api::consent-receipt.consent-receipt').create({
        data: { purpose_code: purpose, choice: 'accepted', captured_at: new Date(), analysis_session: connect(s) },
      });
    }
    return { ...s, secret };
  }

  function file(sess, { state = 'accepted', bytes = 200000, pages = 2, mime = 'application/pdf' } = {}) {
    return docs('api::file-asset.file-asset').create({
      data: {
        purpose: 'demo_input', mime_detected: mime, byte_size: bytes, sha256: sha256(randomUUID()), upload_state: state,
        uploaded_at: new Date(), metadata_safe: mime === 'application/pdf' && pages != null ? { page_count: pages } : {},
        analysis_session: connect(sess),
      },
    });
  }

  /** What the AI service persists before n8n calls finalize. */
  async function artifacts(jobPublicId, { verified = true } = {}) {
    const job = await strapi.db.query('api::analysis-job.analysis-job').findOne({ where: { public_id: jobPublicId } });
    const run = await docs('api::analysis-run.analysis-run').create({
      data: {
        run_no: 1, run_state: 'running', schema_version: '1.0', document_read_status: 'partial', knowledge_snapshot_key: 'kb-approved-snapshot-v1',
        started_at: new Date(), model_provider_key: 'mock', result_json_private: { schema_version: '1.0', findings: [{ id: 'F1' }] },
        analysis_job: connect(job),
      },
    });
    await docs('api::analysis-finding.analysis-finding').create({
      data: { finding_code: 'F1', dimension: 'deposit', finding_state: 'present_in_document', severity: 'medium', title: 'Deposit', source_quote_verified: verified, analysis_run: connect(run) },
    });
    const plan = await docs('api::evidence-plan-draft.evidence-plan-draft').create({
      data: { plan_title: 'Evidence plan', generated_from_run_public_id: run.public_id, generation_state: 'proposed', plan_json_digest: sha256('plan'), created_at_business: new Date(), analysis_run: connect(run) },
    });
    return { run, plan };
  }

  return { session, file, artifacts };
}

/** HTTP helpers */
function client(base) {
  async function call(method, url, { body, headers = {} } = {}) {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, headers: res.headers };
  }

  /** An n8n run: carries the service token and correlation headers on every call. */
  function n8nRun(runId = `exec-${randomUUID().slice(0, 8)}`) {
    let eventId = '';
    return {
      runId,
      setEvent(id) { eventId = id; },
      post(url, body, { key = randomUUID(), headers = {} } = {}) {
        return call('POST', url, {
          body: { ...body, workflow_run_id: body.workflow_run_id ?? runId },
          headers: {
            authorization: `Bearer ${SERVICE_TOKEN}`, 'x-request-id': `req-${randomUUID().slice(0, 8)}`,
            'x-event-id': body.event_id ?? eventId, 'x-workflow-run-id': runId, 'idempotency-key': key, ...headers,
          },
        });
      },
    };
  }

  return { call, n8nRun };
}

module.exports = { bootStrapi, fixtures, client, SERVICE_TOKEN, WEBHOOK_SECRET, AI_TOKEN };
