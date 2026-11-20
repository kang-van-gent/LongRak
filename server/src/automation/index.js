'use strict';

/**
 * LR-W0-01 wiring: job service, internal routes for n8n, outbox dispatcher.
 *  register(): mount /internal/automation/* at the server root (outside /api)
 *  bootstrap(): start the dispatcher;  destroy(): stop it
 */
const createJobService = require('./jobs');
const createDispatcher = require('./dispatcher');
const internalRoutes = require('./internal-routes');

let instance = null;

function automation(strapi) {
  if (!instance || instance.strapi !== strapi) {
    const jobs = createJobService(strapi);
    instance = { strapi, jobs, dispatcher: createDispatcher(strapi, jobs) };
  }
  return instance;
}

module.exports = {
  automation,
  register(strapi) {
    strapi.server.routes(internalRoutes(strapi, automation(strapi).jobs));
  },
  bootstrap(strapi) {
    automation(strapi).dispatcher.start();
  },
  destroy(strapi) {
    automation(strapi).dispatcher.stop();
  },
};
