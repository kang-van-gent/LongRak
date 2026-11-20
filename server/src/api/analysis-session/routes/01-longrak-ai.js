'use strict';

/**
 * Website ↔ app bridge for AI document checks (see ../controllers/analysis-session.js).
 * Default auth applies to all three:
 *  - record: API token (Custom) with "Analysis-session → record"  — used by the website server
 *  - claim / mine: users-permissions JWT; the Authenticated role gets these two actions in bootstrap
 */
module.exports = {
  routes: [
    { method: 'POST', path: '/longrak/ai/checks', handler: 'api::analysis-session.analysis-session.record', config: { policies: [] } },
    { method: 'POST', path: '/longrak/ai/claim', handler: 'api::analysis-session.analysis-session.claim', config: { policies: [] } },
    { method: 'GET', path: '/longrak/ai/my-checks', handler: 'api::analysis-session.analysis-session.mine', config: { policies: [] } },
    // website upload flow (LR-W0-01): token needs "Analysis-session → startSession"
    { method: 'POST', path: '/longrak/ai/sessions', handler: 'api::analysis-session.analysis-session.startSession', config: { policies: [] } },
    // the session secret is the authorisation (checked in the controller)
    { method: 'POST', path: '/longrak/ai/sessions/:publicId/files', handler: 'api::analysis-session.analysis-session.uploadFile', config: { auth: false } },
  ],
};
