'use strict';

/**
 * Owner-facing analysis job API (LR-W0-01, spec.md §2 sequence, §5).
 *
 *  POST /api/longrak/ai/jobs                       create   → 202 { job_public_id, status_url }
 *  GET  /api/longrak/ai/jobs/:publicId             status
 *  GET  /api/longrak/ai/jobs/:publicId/report      report (completed jobs only)
 *  POST /api/longrak/ai/jobs/:publicId/cancel      cancel
 *
 * Ownership is checked on every call (ERD §16: "public ID alone is not authorization"):
 *   X-LongRak-Session-Secret: <raw session secret>   (its SHA-256 = analysis_sessions.session_secret_digest)
 *   or Authorization: Bearer <users-permissions JWT> of the account that claimed the session.
 * Someone else's job, an unknown id and an expired session all answer the same 404.
 */
const { factories } = require('@strapi/strapi');
const { randomUUID } = require('node:crypto');
const { automation } = require('../../../automation');

// small per-IP limits for the public endpoints (per instance; use the gateway in production)
const envInt = (name, d) => Number.parseInt(process.env[name] ?? '', 10) || d;
const LIMITS = {
  write: () => ({ windowMs: 10 * 60 * 1000, max: envInt('LONGRAK_PUBLIC_WRITE_LIMIT', 20) }),
  read: () => ({ windowMs: 60 * 1000, max: envInt('LONGRAK_PUBLIC_READ_LIMIT', 120) }),
};
const hits = new Map();
function limited(kind, ip) {
  const { windowMs, max } = LIMITS[kind]();
  const now = Date.now();
  const key = `${kind}:${ip}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10000) hits.clear();
  return recent.length > max;
}

module.exports = factories.createCoreController('api::analysis-job.analysis-job', ({ strapi }) => {
  const jobs = () => automation(strapi).jobs;

  async function owner(ctx) {
    const secret = ctx.get('x-longrak-session-secret').slice(0, 200) || null;
    let userId = null;
    if (ctx.get('authorization')) {
      try {
        const payload = await strapi.plugin('users-permissions').service('jwt').getToken(ctx);
        if (payload?.id) {
          const user = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: payload.id }, select: ['id', 'blocked'] });
          if (user && !user.blocked) userId = user.id;
        }
      }
      catch { /* invalid token ⇒ treated as anonymous */ }
    }
    return { secret, userId };
  }

  async function respond(ctx, kind, run) {
    if (limited(kind, ctx.request.ip)) {
      ctx.status = 429;
      ctx.body = { ok: false, result: 'rate_limited' };
      return;
    }
    const res = await run(await owner(ctx));
    ctx.status = res.status;
    ctx.body = res.body;
  }

  return {
    async createJob(ctx) {
      const body = ctx.request.body ?? {};
      await respond(ctx, 'write', (o) => jobs().createJob({
        ...body,
        idempotency_key: ctx.get('idempotency-key') || body.idempotency_key,
        request_id: ctx.get('x-request-id').slice(0, 128) || randomUUID(),
      }, o));
    },
    async jobStatus(ctx) {
      await respond(ctx, 'read', (o) => jobs().jobStatus(ctx.params.publicId, o));
    },
    async jobReport(ctx) {
      await respond(ctx, 'read', (o) => jobs().jobReport(ctx.params.publicId, o));
    },
    async cancelJob(ctx) {
      await respond(ctx, 'write', (o) => jobs().cancelJob(ctx.params.publicId, o));
    },
  };
});
