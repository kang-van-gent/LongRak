'use strict';

/** Demo samples for /ai-check: only `active` samples are ever returned by the content API. */
const { factories } = require('@strapi/strapi');

module.exports = factories.createCoreController('api::demo-sample-case.demo-sample-case', () => ({
  async find(ctx) {
    ctx.query = { ...ctx.query, filters: { ...(ctx.query.filters ?? {}), sample_state: 'active' } };
    return super.find(ctx);
  },
  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (!res?.data || res.data.sample_state !== 'active') return ctx.notFound();
    return res;
  },
}));
