'use strict';

/** Public pricing plans: only `active` plans are ever returned by the content API. */
const { factories } = require('@strapi/strapi');

module.exports = factories.createCoreController('api::plan-catalog.plan-catalog', () => ({
  async find(ctx) {
    ctx.query = { ...ctx.query, filters: { ...(ctx.query.filters ?? {}), public_state: 'active' } };
    return super.find(ctx);
  },
  async findOne(ctx) {
    const res = await super.findOne(ctx);
    if (!res?.data || res.data.public_state !== 'active') return ctx.notFound();
    return res;
  },
}));
