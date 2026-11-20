'use strict';

/**
 * LR-W0-01 constants: job state machine, error codes and event types.
 * Sources: spec.md §5 (state transitions, failure paths), longrak-database-er-strapi.md §6
 * (analysis_jobs.processing_state enum).
 */

const { TABLES } = require('../../database/migrations/2026.11.20T00.00.00.lr-w0-automation-tables');

/** Forward pipeline order. `completed` is reachable only through /finalize. */
const PIPELINE = ['queued', 'preprocessing', 'extracting', 'rule_check', 'retrieving', 'model_call', 'validating', 'completed'];

/** States in which an n8n run holds the job (claimed, lease-fenced). */
const PROCESSING = new Set(['preprocessing', 'extracting', 'rule_check', 'retrieving', 'model_call', 'validating']);

/** States reachable through POST /transition. */
const TRANSITION_TARGETS = new Set(['extracting', 'rule_check', 'retrieving', 'model_call', 'validating']);

const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired']);

const ERROR_CODES = new Set([
  'FILE_REJECTED',
  'DOCUMENT_UNREADABLE',
  'FACT_CONFLICT',
  'AI_PROVIDER_UNAVAILABLE',
  'KB_UNAVAILABLE',
  'MODEL_OUTPUT_INVALID',
  'GROUNDING_VALIDATION_FAILED',
  'JOB_NOT_ELIGIBLE',
  'AUTHORIZATION_FAILED',
  'STAGE_UNAVAILABLE',
  'STAGE_INPUT_REJECTED',
  'STAGE_ERROR_UNCLASSIFIED',
]);

/**
 * Codes the backend is willing to requeue (spec §11.1 "Rate / temporary"). n8n's `retryable`
 * flag is advisory: both must say yes, and attempts must remain. Everything else is terminal —
 * e.g. MODEL_OUTPUT_INVALID already had its one regeneration inside n8n (spec §5 failure paths).
 */
const RETRYABLE_CODES = new Set(['AI_PROVIDER_UNAVAILABLE', 'STAGE_UNAVAILABLE', 'STAGE_ERROR_UNCLASSIFIED']);

const EVENT_TYPES = {
  jobCreated: 'analysis.job.created',
  jobCompleted: 'analysis.job.completed',
  jobFailed: 'analysis.job.failed',
};

/** Follow-up events n8n may ask /events/finish to emit, and the outcome each one requires. */
const EMITTABLE = new Map([
  [EVENT_TYPES.jobCompleted, 'completed'],
  [EVENT_TYPES.jobFailed, 'failed'],
]);

const JOB_UID = 'api::analysis-job.analysis-job';
const SESSION_UID = 'api::analysis-session.analysis-session';
const RUN_UID = 'api::analysis-run.analysis-run';

module.exports = {
  PIPELINE,
  PROCESSING,
  TRANSITION_TARGETS,
  TERMINAL,
  ERROR_CODES,
  RETRYABLE_CODES,
  EVENT_TYPES,
  EMITTABLE,
  TABLES,
  JOB_UID,
  SESSION_UID,
  RUN_UID,
};
