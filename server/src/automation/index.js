'use strict';

/**
 * LR-W0-01 wiring: job service, internal routes for n8n, outbox dispatcher.
 *  register(): mount /internal/automation/* at the server root (outside /api), and the
 *              synthetic mock AI service /internal/ai/* when AI_PROVIDER=mock
 *  bootstrap(): start the dispatcher;  destroy(): stop it
 */
const createJobService = require('./jobs');
const createDispatcher = require('./dispatcher');
const createUploads = require('./uploads');
const internalRoutes = require('./internal-routes');
const mockAiRoutes = require('./mock-ai');
const { isSyntheticMode } = require('./synthetic');

let instance = null;

function automation(strapi) {
  if (!instance || instance.strapi !== strapi) {
    const jobs = createJobService(strapi);
    instance = { strapi, jobs, uploads: createUploads(strapi), dispatcher: createDispatcher(strapi, jobs) };
  }
  return instance;
}

module.exports = {
  automation,
  register(strapi) {
    strapi.server.routes(internalRoutes(strapi, automation(strapi).jobs));
    // synthetic demo mode only: mock AI service at /internal/ai/* (never with real documents)
    if (isSyntheticMode()) {
      strapi.server.routes(mockAiRoutes(strapi, automation(strapi).jobs));
      strapi.log.warn('[mock-ai] AI_PROVIDER=mock — SYNTHETIC mock AI service mounted at /internal/ai/*');
    }
  },
  bootstrap(strapi) {
    automation(strapi).dispatcher.start();
  },
  destroy(strapi) {
    automation(strapi).dispatcher.stop();
  },
};
