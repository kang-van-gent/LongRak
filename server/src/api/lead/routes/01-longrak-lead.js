'use strict';

/**
 * POST /api/longrak/leads — server-to-server only.
 * Default auth applies: the website calls it with an API token of type "Custom"
 * that has only the Lead → submit permission (see server/README.md).
 */
module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/longrak/leads',
      handler: 'api::lead.lead.submit',
      config: { policies: [], middlewares: [] },
    },
  ],
};
