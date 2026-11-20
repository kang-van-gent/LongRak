'use strict';

/**
 * AI document checks from the website (/ai-check), saved so they can later be claimed
 * by an app account with the same email.
 *
 *  POST /api/longrak/ai/checks      record    server-to-server (website API token)
 *  POST /api/longrak/ai/claim       claim     signed-in app user (users-permissions JWT)
 *  GET  /api/longrak/ai/my-checks   mine      signed-in app user
 *  POST /api/longrak/ai/sessions                       startSession  website server (API token)
 *  POST /api/longrak/ai/sessions/:publicId/files       uploadFile    X-LongRak-Session-Secret (multipart "file")
 *
 * Security rules
 *  - Only an account whose email is CONFIRMED can claim, so nobody can sign up with someone
 *    else's email and read their reports.
 *  - The email is stored privately on the session; it is never sent to the AI/n8n.
 *  - Original files are not stored here (no private object storage yet): only type, size and
 *    SHA-256 are recorded, with upload_state "removed".
 */
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const { automation } = require('../../../automation');

const uploadHits = new Map();
function uploadLimited(ip) {
  const max = Number.parseInt(process.env.LONGRAK_PUBLIC_WRITE_LIMIT ?? '', 10) || 30;
  const now = Date.now();
  const recent = (uploadHits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  uploadHits.set(ip, recent);
  if (uploadHits.size > 10000) uploadHits.clear();
  return recent.length > max;
}
const { factories } = require('@strapi/strapi');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const JOB_TYPE = { quotation: 'quotation_check', contract: 'pre_contract_check', boq: 'boq_check', milestone_schedule: 'milestone_check', other: 'pre_contract_check' };
const DOC_KINDS = new Set(['quotation', 'contract', 'boq', 'milestone_schedule', 'drawing', 'receipt', 'change_order', 'other', 'unknown']);
const FINDING_STATES = new Set(['needs_attention', 'missing_information', 'present_in_document', 'not_applicable', 'unable_to_assess']);
const DIMENSIONS = new Set(['parties', 'scope', 'materials', 'money', 'deposit', 'milestones', 'dates', 'acceptance', 'change_control', 'warranty', 'cancellation', 'evidence', 'signature', 'other']);
const READ = new Set(['complete', 'partial', 'unreadable']);

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const connect = (doc) => ({ connect: [{ documentId: doc.documentId }] });

module.exports = factories.createCoreController('api::analysis-session.analysis-session', ({ strapi }) => {
  const docs = (name) => strapi.documents(`api::${name}.${name}`);

  async function activePolicy(kind, language) {
    return docs('policy-version').findFirst({ filters: { policy_kind: kind, policy_state: 'active', language }, sort: 'effective_at:desc' });
  }
  async function retentionUntil(key) {
    const p = await docs('retention-policy').findFirst({ filters: { policy_key: key, policy_state: 'active' } });
    return p?.ttl_days ? new Date(Date.now() + p.ttl_days * 86400000).toISOString() : null;
  }

  return {
    /** Website server: start an upload session (email + 3 consents). Returns the secret once. */
    async startSession(ctx) {
      const res = await automation(strapi).uploads.startSession(ctx.request.body ?? {});
      ctx.status = res.status;
      ctx.body = res.body;
    },

    /** Upload one file (multipart field "file") into a session, proven by its secret. */
    async uploadFile(ctx) {
      const raw = ctx.request.files?.file;
      const file = Array.isArray(raw) ? raw[0] : raw;
      try {
        if (uploadLimited(ctx.request.ip)) { ctx.status = 429; ctx.body = { ok: false, result: 'rate_limited' }; return; }
        const data = file?.filepath ? await fs.readFile(file.filepath) : null;
        const res = await automation(strapi).uploads.acceptUpload(ctx.params.publicId, { secret: ctx.get('x-longrak-session-secret') || null }, { data });
        ctx.status = res.status;
        ctx.body = res.body;
      }
      finally {
        if (file?.filepath) await fs.rm(file.filepath, { force: true }); // never leave the temp copy behind
      }
    },

    /** Record one check (called by the website server after n8n answers — or fails). */
    async record(ctx) {
      const b = ctx.request.body ?? {};
      const email = str(b.email, 254)?.toLowerCase();
      if (!email || !EMAIL_RE.test(email)) return ctx.badRequest('invalid_email');
      const c = b.consents ?? {};
      if (c.rights !== true || c.processing !== true || c.storage !== true) return ctx.badRequest('consent_required');

      const language = b.language === 'en' ? 'en' : 'th';
      const documentType = DOC_KINDS.has(b.document_type) ? b.document_type : 'other';
      const files = Array.isArray(b.files) ? b.files.slice(0, 3) : [];
      const completed = b.outcome === 'completed' && b.report && typeof b.report === 'object';
      const report = completed ? b.report : null;
      const now = new Date().toISOString();
      const expires = await retentionUntil('analysis_results');

      const session = await docs('analysis-session').create({
        data: {
          mode: 'anonymous_upload',
          session_state: 'completed',
          contact_email: email,
          requested_language: language,
          source_page: str(b.page, 200),
          file_count: files.length,
          expires_at: expires,
        },
      });

      // the three consents given before upload, pinned to the active policy text when one exists
      const processingPolicy = await activePolicy('document_processing', language);
      for (const purpose of ['document_rights', 'ai_document_processing', 'result_storage']) {
        await docs('consent-receipt').create({
          data: {
            purpose_code: purpose,
            legal_basis_record: 'consent',
            choice: 'accepted',
            captured_at: now,
            capture_method: 'web_checkbox',
            policy_sha256: processingPolicy?.content_sha256 ?? null,
            ip_hash: str(b.ip_hash, 128),
            analysis_session: connect(session),
            ...(processingPolicy ? { policy_version: connect(processingPolicy) } : {}),
          },
        });
      }

      const job = await docs('analysis-job').create({
        data: {
          job_type: JOB_TYPE[documentType] ?? 'pre_contract_check',
          processing_state: completed ? 'completed' : 'failed',
          queued_at: now,
          started_at: now,
          finished_at: now,
          error_code: completed ? null : str(b.error_code, 60) ?? 'unknown',
          attempt_count: 1,
          requested_language: language,
          idempotency_key_hash: b.request_id ? createHash('sha256').update(String(b.request_id)).digest('hex') : null,
          expires_at: expires,
          analysis_session: connect(session),
        },
      });

      // files: fingerprint only — the originals are not kept by LongRak storage
      const inputs = [];
      for (const [i, f] of files.entries()) {
        const asset = await docs('file-asset').create({
          data: {
            purpose: 'demo_input',
            mime_detected: str(f.mime, 80),
            byte_size: Number.isFinite(f.size) ? f.size : null,
            sha256: /^[a-f0-9]{64}$/.test(f.sha256 ?? '') ? f.sha256 : null,
            upload_state: 'removed',
            uploaded_at: now,
            deleted_at: now,
            metadata_safe: { original_retained_by_longrak: false },
          },
        });
        inputs.push(await docs('analysis-input').create({
          data: {
            document_kind: documentType,
            sequence_no: i + 1,
            extraction_state: !report ? 'failed' : report.document_read_status === 'complete' ? 'complete' : report.document_read_status === 'unreadable' ? 'failed' : 'partial',
            redaction_state: 'pending',
            analysis_job: connect(job),
            file_asset: connect(asset),
          },
        }));
      }

      if (report) {
        const run = await docs('analysis-run').create({
          data: {
            run_no: 1,
            run_state: 'completed',
            schema_version: str(report.schema_version, 10) ?? '1.0',
            output_language: language,
            document_read_status: READ.has(report.document_read_status) ? report.document_read_status : 'partial',
            started_at: now,
            completed_at: now,
            model_provider_key: 'n8n',
            result_json_private: report,
            analysis_job: connect(job),
          },
        });
        const findings = Array.isArray(report.findings) ? report.findings.slice(0, 40) : [];
        for (const f of findings) {
          if (!FINDING_STATES.has(f.status) || !str(f.title, 250)) continue;
          const finding = await docs('analysis-finding').create({
            data: {
              finding_code: str(f.id, 40),
              dimension: DIMENSIONS.has(f.dimension) ? f.dimension : 'other',
              finding_state: f.status,
              severity: f.needs_professional_review ? 'review_required' : 'info',
              title: str(f.title, 250),
              explanation: str(f.reason, 2000),
              confidence_level: 'unknown',
              needs_professional_review: f.needs_professional_review === true,
              source_quote_verified: false, // quote-vs-extracted-text check not implemented yet
              analysis_run: connect(run),
            },
          });
          let order = 0;
          for (const e of (f.document_evidence ?? []).slice(0, 5)) {
            await docs('finding-citation').create({
              data: {
                citation_kind: 'user_document',
                input_page: Number.isInteger(e.page) ? e.page : null,
                quote_excerpt: str(e.quote, 400),
                citation_state: 'unverified',
                citation_order: order++,
                analysis_finding: connect(finding),
                ...(inputs[0] ? { analysis_input: connect(inputs[0]) } : {}),
              },
            });
          }
          for (const k of (f.knowledge_citations ?? []).slice(0, 5)) {
            await docs('finding-citation').create({
              data: {
                citation_kind: 'knowledge_source',
                source_section: str(k.section, 200) ?? str(k.source_id, 200),
                citation_state: 'unverified',
                citation_order: order++,
                analysis_finding: connect(finding),
              },
            });
          }
          if (str(f.question_to_ask, 250)) {
            await docs('recommended-action').create({ data: { action_kind: 'question_to_ask', title: str(f.question_to_ask, 250), analysis_finding: connect(finding) } });
          }
          if (str(f.suggested_action, 250)) {
            await docs('recommended-action').create({ data: { action_kind: 'clarify_clause', title: str(f.suggested_action, 250), analysis_finding: connect(finding) } });
          }
        }
      }

      ctx.status = 201;
      ctx.body = { ok: true, session_public_id: session.public_id, job_public_id: job.public_id };
    },

    /** Link every unclaimed check made with this account's (confirmed) email to the account. */
    async claim(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      if (!user.confirmed) return ctx.forbidden('email_not_confirmed');
      const sessions = await docs('analysis-session').findMany({
        filters: { contact_email: { $eqi: user.email }, claimed_by: { id: { $null: true } } },
        fields: ['documentId'],
      });
      const now = new Date().toISOString();
      for (const s of sessions) {
        await docs('analysis-session').update({
          documentId: s.documentId,
          data: { claimed_by: { connect: [{ id: user.id }] }, claimed_at: now },
        });
      }
      ctx.body = { ok: true, claimed: sessions.length };
    },

    /** The signed-in user's claimed checks, newest first, with their reports. */
    async mine(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized();
      const sessions = await docs('analysis-session').findMany({
        filters: { claimed_by: { id: user.id } },
        sort: 'createdAt:desc',
        populate: {
          analysis_jobs: {
            fields: ['public_id', 'job_type', 'processing_state', 'finished_at', 'error_code', 'requested_language'],
            populate: {
              // no field list: private fields (result_json_private) can't be named in a query,
              // but are returned server-side; this controller decides what leaves the API
              analysis_runs: true,
            },
          },
        },
      });
      ctx.body = {
        data: sessions.map((s) => ({
          public_id: s.public_id,
          created_at: s.createdAt,
          claimed_at: s.claimed_at,
          checks: (s.analysis_jobs ?? []).map((j) => {
            const run = (j.analysis_runs ?? []).sort((a, b) => b.run_no - a.run_no)[0];
            return {
              public_id: j.public_id,
              job_type: j.job_type,
              processing_state: j.processing_state,
              finished_at: j.finished_at,
              error_code: j.error_code,
              report: run?.run_state === 'completed' ? run.result_json_private : null,
            };
          }),
        })),
      };
    },
  };
});
