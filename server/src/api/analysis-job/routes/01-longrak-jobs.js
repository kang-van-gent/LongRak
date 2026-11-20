'use strict';

/**
 * Owner-facing analysis job routes (see ../controllers/analysis-job.js).
 * auth: false — the controller authorises every request itself (session secret or the
 * claiming account's JWT); no Strapi role can list or read jobs through these routes.
 */
const config = { auth: false };

module.exports = {
  routes: [
    { method: 'POST', path: '/longrak/ai/jobs', handler: 'api::analysis-job.analysis-job.createJob', config },
    { method: 'GET', path: '/longrak/ai/jobs/:publicId', handler: 'api::analysis-job.analysis-job.jobStatus', config },
    { method: 'GET', path: '/longrak/ai/jobs/:publicId/report', handler: 'api::analysis-job.analysis-job.jobReport', config },
    { method: 'POST', path: '/longrak/ai/jobs/:publicId/cancel', handler: 'api::analysis-job.analysis-job.cancelJob', config },
  ],
};
