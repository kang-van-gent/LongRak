'use strict';

/**
 * Website upload flow: session (API token) → files (session secret) → job.
 * Needs TEST_DATABASE_URL (empty PostgreSQL).
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PDFDocument } = require('pdf-lib');
const { bootStrapi, client, AI_TOKEN } = require('./helpers/harness');

const skip = !process.env.TEST_DATABASE_URL && 'TEST_DATABASE_URL not set (PostgreSQL required)';
let strapi; let base; let fake; let http; let token;

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
async function pdf(pages) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

before(async () => {
  if (skip) return;
  ({ strapi, base, fake } = await bootStrapi());
  http = client(base);
  const created = await strapi.service('admin::api-token').create({
    name: `website-test-${Date.now()}`, type: 'custom', kind: 'content-api', lifespan: null,
    permissions: ['api::analysis-session.analysis-session.startSession'],
  });
  token = created.accessKey;
});
after(async () => {
  if (skip) return;
  await strapi?.destroy();
  await fake?.close();
  fs.rmSync(process.env.LONGRAK_PRIVATE_STORAGE_DIR, { recursive: true, force: true });
});

const start = (body = {}) => http.call('POST', '/api/longrak/ai/sessions', {
  headers: { authorization: `Bearer ${token}` },
  body: { email: 'Someone@Example.com', language: 'th', consents: { rights: true, processing: true, storage: true }, ip_hash: 'iphash-1', ...body },
});
async function upload(sessionId, secret, data) {
  const form = new FormData();
  form.append('file', new Blob([data]), 'whatever.bin');
  const res = await fetch(`${base}/api/longrak/ai/sessions/${sessionId}/files`, { method: 'POST', body: form, headers: secret ? { 'x-longrak-session-secret': secret } : {} });
  return { status: res.status, body: await res.json() };
}

describe('website upload flow', { skip }, () => {
  test('session needs the API token, a valid email and all three consents', async () => {
    assert.equal((await http.call('POST', '/api/longrak/ai/sessions', { body: {} })).status, 403);
    assert.equal((await start({ email: 'nope' })).body.result, 'invalid_email');
    assert.equal((await start({ consents: { rights: true, processing: true } })).body.result, 'consent_required');
    const s = await start();
    assert.equal(s.status, 201);
    assert.ok(s.body.session_secret.length >= 40);
    const row = await strapi.db.query('api::analysis-session.analysis-session').findOne({ where: { public_id: s.body.session_public_id }, populate: { consent_receipts: true } });
    assert.equal(row.contact_email, 'someone@example.com');
    assert.notEqual(row.session_secret_digest, s.body.session_secret); // only the digest is stored
    assert.equal(row.consent_receipts.length, 3);
    assert.ok(row.usage_quota_bucket);
  });

  test('files: real type from bytes, PDF page count, limits, private storage; wrong secret = 404', async () => {
    const s = (await start()).body;
    assert.equal((await upload(s.session_public_id, 'wrong-secret', await pdf(1))).status, 404);
    assert.equal((await upload(s.session_public_id, s.session_secret, Buffer.from('MZ not a document'))).body.reason, 'unsupported_type');
    assert.equal((await upload(s.session_public_id, s.session_secret, Buffer.from('%PDF-1.7 broken'))).body.reason, 'unreadable_pdf');
    assert.equal((await upload(s.session_public_id, s.session_secret, await pdf(31))).body.reason, 'page_limit');

    const a = await upload(s.session_public_id, s.session_secret, await pdf(3));
    assert.equal(a.status, 201, JSON.stringify(a.body));
    assert.deepEqual([a.body.mime_detected, a.body.page_count, a.body.upload_state, a.body.demo_upload], ['application/pdf', 3, 'accepted', true]);
    const row = await strapi.db.query('api::file-asset.file-asset').findOne({ where: { public_id: a.body.file_public_id } });
    const onDisk = path.join(process.env.LONGRAK_PRIVATE_STORAGE_DIR, row.object_key_private);
    assert.ok(fs.existsSync(onDisk));
    assert.equal(fs.statSync(onDisk).mode & 0o777, 0o600);
    assert.equal(row.original_name_encrypted ?? null, null); // file names are not stored
    // never reachable over HTTP
    assert.equal((await http.call('GET', `/${row.object_key_private}`)).status, 404);

    const b = await upload(s.session_public_id, s.session_secret, PNG);
    assert.equal(b.body.page_count, 1);
    await upload(s.session_public_id, s.session_secret, await pdf(1));
    assert.equal((await upload(s.session_public_id, s.session_secret, await pdf(1))).body.reason, 'file_count');
  });

  test('uploaded files → job (202) → the mock AI accepts these demo uploads', async () => {
    const s = (await start()).body;
    const f = (await upload(s.session_public_id, s.session_secret, await pdf(2))).body;
    const job = await http.call('POST', '/api/longrak/ai/jobs', {
      headers: { 'x-longrak-session-secret': s.session_secret, 'idempotency-key': 'w-1' },
      body: { session_public_id: s.session_public_id, file_public_ids: [f.file_public_id], document_type: 'quotation' },
    });
    assert.equal(job.status, 202, JSON.stringify(job.body));
    const ex = await http.call('POST', `/internal/ai/jobs/${job.body.job_public_id}/extract`, { headers: { authorization: `Bearer ${AI_TOKEN}` }, body: { stage_version: 'v1' } });
    assert.equal(ex.status, 200);
    assert.equal(ex.body.extraction_state, 'ok');
  });
});
