'use strict';

/**
 * Website upload flow for LR-W0-01 (before POST /api/longrak/ai/jobs):
 *
 *  1. startSession   (website server, API token) — email + consents → session + one-time secret
 *  2. acceptUpload   (session secret)            — one file: checked, stored privately, `accepted`
 *
 * Checks before a file becomes `accepted` (spec §5 "AI/document requirements" #1):
 *   real type from the bytes (PDF/PNG/JPEG), size, PDF parses and its page count, file count per
 *   session. NOT done yet: antivirus/malware scan — recorded as metadata_safe.av_scan
 *   "not_available"; required before real customer documents (spec §12).
 *
 * The original file name is not stored (it can contain personal data).
 * With AI_PROVIDER=mock, uploads are flagged demo_upload so the SYNTHETIC mock AI will process
 * them — the report is fake and labelled as such.
 */
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { PDFDocument } = require('pdf-lib');
const storage = require('./storage');
const automationConfig = require('./config');
const { sha256, safeEqual, isPast } = require('./repo');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SESSION_UID = 'api::analysis-session.analysis-session';
const ok = (body, status = 200) => ({ status, body });
const invalid = (status, result, extra = {}) => ({ status, body: { ok: false, result, ...extra } });
const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

function sniff(buf) {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  return null;
}

async function pdfPages(buf) {
  try {
    const doc = await PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
    return { pages: doc.getPageCount() };
  }
  catch (err) {
    return { error: /encrypt/i.test(err?.message ?? '') ? 'encrypted_pdf' : 'unreadable_pdf' };
  }
}

module.exports = function createUploads(strapi) {
  const docs = (uid) => strapi.documents(uid);
  const connect = (d) => ({ connect: [{ documentId: d.documentId }] });

  async function ttlHours() {
    const policy = await docs('api::retention-policy.retention-policy').findFirst({ filters: { policy_key: 'analysis_results', policy_state: 'active' } });
    if (policy?.ttl_days) return policy.ttl_days * 24;
    return Number.parseInt(process.env.LONGRAK_AI_SESSION_TTL_HOURS ?? '', 10) || 168;
  }

  /** Website server: create the session the upload belongs to. Returns the secret ONCE. */
  async function startSession(b) {
    const email = str(b.email, 254)?.toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return invalid(400, 'invalid_email');
    const c = b.consents ?? {};
    if (c.rights !== true || c.processing !== true || c.storage !== true) return invalid(400, 'consent_required');
    const language = b.language === 'en' ? 'en' : 'th';
    const ipHash = str(b.ip_hash, 128);
    const now = new Date();
    const secret = randomBytes(32).toString('base64url');

    const session = await docs(SESSION_UID).create({
      data: {
        mode: 'anonymous_upload', session_state: 'open', session_secret_digest: sha256(secret),
        contact_email: email, requested_language: language, source_page: str(b.page, 200),
        // quota "per IP risk bucket" (spec §5): the salted IP hash the website sends, never the IP
        usage_quota_bucket: ipHash ? sha256(`quota:${ipHash}`) : null,
        expires_at: new Date(now.getTime() + (await ttlHours()) * 3600000),
      },
    });
    const policy = await docs('api::policy-version.policy-version').findFirst({ filters: { policy_kind: 'document_processing', policy_state: 'active', language }, sort: 'effective_at:desc' });
    for (const purpose of ['document_rights', 'ai_document_processing', 'result_storage']) {
      await docs('api::consent-receipt.consent-receipt').create({
        data: {
          purpose_code: purpose, legal_basis_record: 'consent', choice: 'accepted', captured_at: now, capture_method: 'web_checkbox',
          policy_sha256: policy?.content_sha256 ?? null, ip_hash: ipHash, analysis_session: connect(session),
          ...(policy ? { policy_version: connect(policy) } : {}),
        },
      });
    }
    return ok({ session_public_id: session.public_id, session_secret: secret, expires_at: session.expires_at }, 201);
  }

  /** One file into a session the caller owns (session secret). */
  async function acceptUpload(sessionPublicId, owner, file) {
    const c = automationConfig();
    const now = new Date();
    const session = await strapi.db.query(SESSION_UID).findOne({ where: { public_id: String(sessionPublicId ?? '') } });
    const owned = !!session && !!owner.secret && safeEqual(sha256(owner.secret), session.session_secret_digest);
    if (!session || !owned || ['expired', 'deleted'].includes(session.session_state) || isPast(session.expires_at, now)) return invalid(404, 'not_found');
    if (!file?.data?.length) return invalid(400, 'no_file');

    const already = await strapi.db.query('api::file-asset.file-asset').count({ where: { analysis_session: { id: session.id }, deleted_at: { $null: true } } });
    if (already >= c.limits.maxFiles) return invalid(422, 'FILE_REJECTED', { reason: 'file_count', max_files: c.limits.maxFiles });
    if (file.data.length > c.limits.maxFileBytes) return invalid(422, 'FILE_REJECTED', { reason: 'file_too_large', max_file_bytes: c.limits.maxFileBytes });
    const mime = sniff(file.data);
    if (!mime) return invalid(422, 'FILE_REJECTED', { reason: 'unsupported_type' });
    let pages = 1;
    if (mime === 'application/pdf') {
      const p = await pdfPages(file.data);
      if (p.error) return invalid(422, 'FILE_REJECTED', { reason: p.error });
      pages = p.pages;
      if (pages < 1) return invalid(422, 'FILE_REJECTED', { reason: 'unreadable_pdf' });
      if (pages > c.limits.maxTotalPages) return invalid(422, 'FILE_REJECTED', { reason: 'page_limit', max_total_pages: c.limits.maxTotalPages });
    }

    const publicId = randomUUID();
    const stored = await storage.put(`sessions/${session.public_id}/${publicId}`, file.data);
    const demo = process.env.AI_PROVIDER === 'mock';
    try {
      await docs('api::file-asset.file-asset').create({
        data: {
          public_id: publicId, purpose: 'demo_input', storage_bucket_alias: stored.bucket, object_key_private: stored.key,
          mime_detected: mime, byte_size: file.data.length, sha256: createHash('sha256').update(file.data).digest('hex'),
          upload_state: 'accepted', uploaded_at: now, retention_until: session.expires_at,
          metadata_safe: { page_count: pages, av_scan: 'not_available', ...(demo ? { demo_upload: true, synthetic_scenario: 'happy' } : {}) },
          analysis_session: { connect: [{ documentId: session.documentId }] },
        },
      });
    }
    catch (err) {
      await storage.remove(stored.key); // no orphan files
      throw err;
    }
    return ok({ file_public_id: publicId, mime_detected: mime, byte_size: file.data.length, page_count: pages, upload_state: 'accepted', demo_upload: demo }, 201);
  }

  return { startSession, acceptUpload };
};
