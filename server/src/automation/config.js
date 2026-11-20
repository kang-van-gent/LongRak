'use strict';

/**
 * Automation settings, read from the environment on every call (so tests can change them).
 * W0 limits are spec.md §5 "initial hypotheses, configurable" — see docs/automation.md for the
 * conflict with context.md (10 MB / 20 pages).
 */
const int = (name, fallback) => {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

module.exports = function automationConfig() {
  return {
    /** Service token n8n sends as `Authorization: Bearer …` on /internal/automation/* only. */
    serviceToken: process.env.LONGRAK_INTERNAL_SERVICE_TOKEN || '',

    /** Outbox → n8n dispatcher */
    webhookUrl: process.env.LONGRAK_N8N_EVENT_WEBHOOK_URL || '',
    webhookSecret: process.env.LONGRAK_N8N_EVENT_WEBHOOK_SECRET || '',
    /** Must equal the header name in n8n's "LongRak Dispatcher Webhook Auth" credential. */
    webhookSecretHeader: process.env.LONGRAK_N8N_EVENT_WEBHOOK_SECRET_HEADER || 'X-LongRak-Secret',
    dispatcherEnabled: process.env.LONGRAK_OUTBOX_DISPATCHER !== 'false',
    pollMs: int('LONGRAK_OUTBOX_POLL_MS', 2000),
    webhookTimeoutMs: int('LONGRAK_N8N_EVENT_WEBHOOK_TIMEOUT_MS', 10000),
    /** A dispatched event nobody claimed within this time is delivered again. */
    ackTimeoutSeconds: int('LONGRAK_OUTBOX_ACK_TIMEOUT_SECONDS', 120),
    maxDeliveryAttempts: int('LONGRAK_OUTBOX_MAX_ATTEMPTS', 10),

    /** Lease an n8n run holds on an event/job; renewed by every successful claim/transition. */
    leaseSeconds: int('LONGRAK_AUTOMATION_LEASE_SECONDS', 900),
    /** Total processing attempts per job (first run + requeues + resumes). */
    maxJobAttempts: int('LONGRAK_AI_MAX_JOB_ATTEMPTS', 3),

    limits: {
      maxFiles: int('LONGRAK_AI_MAX_FILES', 3),
      maxFileBytes: int('LONGRAK_AI_MAX_FILE_BYTES', 15 * 1024 * 1024),
      maxTotalPages: int('LONGRAK_AI_MAX_TOTAL_PAGES', 30),
      /** Jobs per usage_quota_bucket (or per session when it has none) per rolling 24 h. */
      dailyJobQuota: int('LONGRAK_AI_DAILY_JOB_QUOTA', 3),
    },
  };
};
