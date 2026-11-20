'use strict';

const { randomUUID } = require('node:crypto');
const { seedW0 } = require('./seed/seed');
const automation = require('./automation');

/**
 * Content types whose records carry a server-generated `public_id` (UUID).
 * longrak-database-er-strapi.md §0: public_id is created by the backend, never the client.
 */
const PUBLIC_ID_UIDS = new Set(
  [
    'analysis-feedback', 'analysis-finding', 'analysis-input', 'analysis-job', 'analysis-run', 'analysis-session',
    'consent-receipt', 'demo-sample-case', 'evaluation-case', 'evaluation-run', 'evidence-plan-draft',
    'evidence-plan-item', 'file-asset', 'finding-citation', 'kb-snapshot', 'kb-source', 'kb-source-version', 'lead',
    'model-catalog', 'pilot-application', 'plan-catalog', 'policy-version', 'prompt-template-version',
    'recommended-action', 'risk-rule', 'risk-rule-version',
  ].map((n) => `api::${n}.${n}`),
);

/** Public (anonymous) read access: website CMS content only. Everything else stays closed. */
const PUBLIC_READ_ACTIONS = [
  'api::faq-item.faq-item.find',
  'api::faq-item.faq-item.findOne',
  'api::web-page.web-page.find',
  'api::web-page.web-page.findOne',
  'api::blog-post.blog-post.find',
  'api::blog-post.blog-post.findOne',
  'api::site-setting.site-setting.find',
  'api::plan-catalog.plan-catalog.find', // controller returns active plans only
  'api::plan-catalog.plan-catalog.findOne',
  'api::demo-sample-case.demo-sample-case.find', // controller returns active samples only
  'api::demo-sample-case.demo-sample-case.findOne',
];

async function ensureLocales(strapi) {
  const locales = strapi.plugin('i18n').service('locales');
  const existing = (await locales.find()).map((l) => l.code);
  if (!existing.includes('th')) await locales.create({ code: 'th', name: 'Thai (th)' });
  if (!existing.includes('en')) await locales.create({ code: 'en', name: 'English (en)' });
  // Thai is the primary market; the website serves Thai at "/" and English at "/en"
  if ((await locales.getDefaultLocale()) !== 'th') await locales.setDefaultLocale({ code: 'th' });
}

/** Signed-in app users: only claim / list their own website checks (everything else is custom-route + policy) */
const AUTHENTICATED_ACTIONS = [
  'api::analysis-session.analysis-session.claim',
  'api::analysis-session.analysis-session.mine',
];

async function ensureRolePermissions(strapi, type, actions) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type } });
  if (!role) return;
  for (const action of actions) {
    const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action, role: role.id } });
    if (!exists) await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
  }
}

module.exports = {
  register({ strapi }) {
    // Every create gets a backend-generated public_id (shared across locales for i18n types)
    strapi.documents.use(async (ctx, next) => {
      if (ctx.action === 'create' && PUBLIC_ID_UIDS.has(ctx.uid)) {
        ctx.params.data = ctx.params.data ?? {};
        if (!ctx.params.data.public_id) ctx.params.data.public_id = randomUUID();
      }
      return next();
    });
    // LR-W0-01: /internal/automation/* for n8n (service token, outside the Content API)
    automation.register(strapi);
  },

  async bootstrap({ strapi }) {
    await ensureLocales(strapi);
    await ensureRolePermissions(strapi, 'public', PUBLIC_READ_ACTIONS);
    await ensureRolePermissions(strapi, 'authenticated', AUTHENTICATED_ACTIONS);
    // Seed website content once, into empty tables only. Set LONGRAK_SEED=false to skip.
    if (process.env.LONGRAK_SEED !== 'false') await seedW0(strapi);
    // LR-W0-01: deliver committed outbox events to n8n
    automation.bootstrap(strapi);
  },

  destroy({ strapi }) {
    automation.destroy(strapi);
  },
};
