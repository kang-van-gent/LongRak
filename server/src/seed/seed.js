'use strict';

/**
 * W0 seed — mirrors the website's current copy (Thai + English) so the CMS starts in sync.
 * Idempotent: each block only runs when its table is empty. Never seeds personal data,
 * real prices or real retention periods (those are decisions, not seed data).
 */
const content = require('./w0-content.json');

const LOCALES = ['th', 'en'];

/** create the Thai entry, then add the English localization of the same document */
async function createLocalized(strapi, uid, shared, perLocale, { publish = false } = {}) {
  const status = publish ? 'published' : undefined;
  const doc = await strapi.documents(uid).create({ locale: 'th', data: { ...shared, ...perLocale.th }, ...(status && { status }) });
  await strapi.documents(uid).update({ documentId: doc.documentId, locale: 'en', data: { ...shared, ...perLocale.en }, ...(status && { status }) });
  return doc;
}

const isEmpty = async (strapi, uid) => (await strapi.db.query(uid).count()) === 0;

async function seedW0(strapi) {
  const log = (m) => strapi.log.info(`[seed] ${m}`);

  if (await isEmpty(strapi, 'api::site-setting.site-setting')) {
    const { th, en, ...shared } = content.site_setting;
    await createLocalized(strapi, 'api::site-setting.site-setting', shared, { th, en });
    log('site settings');
  }

  if (await isEmpty(strapi, 'api::faq-item.faq-item')) {
    for (const { th, en, ...shared } of content.faq_items) {
      await createLocalized(strapi, 'api::faq-item.faq-item', shared, { th, en }, { publish: true });
    }
    log(`${content.faq_items.length} FAQ items (th + en, published)`);
  }

  if (await isEmpty(strapi, 'api::plan-catalog.plan-catalog')) {
    for (const { th, en, ...shared } of content.plans) {
      await createLocalized(strapi, 'api::plan-catalog.plan-catalog', shared, { th, en });
    }
    log(`${content.plans.length} plans (Early Access hypotheses)`);
  }

  if (await isEmpty(strapi, 'api::demo-sample-case.demo-sample-case')) {
    const { th, en, ...shared } = content.demo_sample;
    await createLocalized(strapi, 'api::demo-sample-case.demo-sample-case', shared, { th, en });
    log('demo sample (fictional kitchen quotation)');
  }

  if (await isEmpty(strapi, 'api::retention-policy.retention-policy')) {
    for (const p of content.retention_policies) {
      await strapi.documents('api::retention-policy.retention-policy').create({ data: p });
    }
    log(`${content.retention_policies.length} retention policies (DRAFT — set real periods before accepting files)`);
  }
}

module.exports = { seedW0, LOCALES };
