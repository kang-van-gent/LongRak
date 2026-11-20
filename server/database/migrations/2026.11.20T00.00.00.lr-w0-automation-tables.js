'use strict';

/**
 * LongRak W0 — automation infrastructure for LR-W0-01 (spec.md §4.3–4.5, §11).
 *
 * Plain SQL tables, deliberately NOT Strapi content types: they are written only by the
 * backend services in src/automation (compare-and-set leases, append-only history) and have
 * no Content API routes, so neither public CRUD nor n8n can mutate them directly.
 *
 * Written with the knex schema builder (not raw SQL) so the same migration runs on PostgreSQL
 * (production) and SQLite (local dev). Cross-service references are public_id UUIDs only —
 * never Strapi row ids or documentIds (spec.md §9).
 *
 * Migration notes — one per table (see also server/docs/automation.md):
 *
 *  lr_domain_outbox_events          ERD §16 `domain_outbox_events`, promoted W1 → W0 (spec §4.4).
 *     ERD columns kept as-is (id, event_type, aggregate_type, aggregate_public_id,
 *     payload_safe_json, created_at, published_at, attempt_count, idempotency_key UNIQUE).
 *     Added for the dispatcher: schema_version, request_id, tenant_public_id, actor_public_id
 *     (envelope fields, spec §4.1), delivery_state, next_attempt_at, last_attempt_at,
 *     last_error_code, completed_at, dispatch_lock_token, dispatch_lock_until.
 *     `id` IS the envelope event_id.
 *
 *  lr_automation_event_inbox        NEW (spec §4.4). Spec columns + lease_token (needed to
 *     fence a lease; the task asks for it), workflow_run_id (lets the same n8n run re-claim
 *     idempotently), claim_count and created_at. PK (event_id, consumer_name).
 *
 *  lr_automation_delivery_attempts  NEW (spec §4.4), exactly the spec columns. Not used by
 *     LR-W0-01 yet; reserved for LR-SH-02 notification delivery.
 *
 *  lr_analysis_job_state_events     NEW. Append-only history of analysis_jobs.processing_state
 *     (including states reported via `passed_through`, requeues, resumes, cancel/expire).
 *     The ERD has no job history table; the transition API needs one to "record intermediate
 *     states". Holds codes and digests only — never document text.
 *
 *  lr_automation_idempotency_keys   NEW. Stores the response of each /internal/automation/*
 *     call by Idempotency-Key so a retried call returns the identical answer (spec §4.3 #4).
 *     Responses contain ids/states only. Rows expire after 7 days.
 *
 *  lr_automation_incidents          NEW. Sanitised incidents reported by the LR-SH-01 error
 *     handler (spec §8) and what the backend decided (fail / requeue / ignored).
 */

const TABLES = {
  outbox: 'lr_domain_outbox_events',
  inbox: 'lr_automation_event_inbox',
  deliveries: 'lr_automation_delivery_attempts',
  jobEvents: 'lr_analysis_job_state_events',
  idempotency: 'lr_automation_idempotency_keys',
  incidents: 'lr_automation_incidents',
};

const tz = { useTz: true };

module.exports = {
  async up(knex) {
    // NB: knex.schema returns a NEW builder on every access — never cache it
    if (!(await knex.schema.hasTable(TABLES.outbox))) {
      await knex.schema.createTable(TABLES.outbox, (t) => {
        t.uuid('id').primary(); // = event_id in the envelope
        t.string('event_type', 80).notNullable();
        t.string('schema_version', 10).notNullable().defaultTo('1.0');
        t.string('aggregate_type', 60).notNullable();
        t.uuid('aggregate_public_id').notNullable();
        t.uuid('tenant_public_id');
        t.uuid('actor_public_id');
        t.string('request_id', 128);
        t.jsonb('payload_safe_json').notNullable(); // ids only — no file names, text, PII, URLs
        t.string('idempotency_key', 200).notNullable().unique({ indexName: 'uq_lr_outbox_idempotency_key' });
        t.string('delivery_state', 20).notNullable().defaultTo('pending')
          .checkIn(['pending', 'dispatched', 'completed', 'dead_lettered'], 'ck_lr_outbox_delivery_state');
        t.integer('attempt_count').notNullable().defaultTo(0);
        t.timestamp('created_at', tz).notNullable();
        t.timestamp('next_attempt_at', tz).notNullable();
        t.timestamp('published_at', tz); // first accepted delivery
        t.timestamp('last_attempt_at', tz);
        t.string('last_error_code', 60);
        t.timestamp('completed_at', tz);
        t.uuid('dispatch_lock_token');
        t.timestamp('dispatch_lock_until', tz);
        t.index(['delivery_state', 'next_attempt_at'], 'idx_lr_outbox_due');
        t.index(['aggregate_type', 'aggregate_public_id'], 'idx_lr_outbox_aggregate');
      });
    }

    if (!(await knex.schema.hasTable(TABLES.inbox))) {
      await knex.schema.createTable(TABLES.inbox, (t) => {
        t.uuid('event_id').notNullable();
        t.string('consumer_name', 80).notNullable();
        t.string('processing_state', 20).notNullable().defaultTo('claimed')
          .checkIn(['claimed', 'completed', 'failed', 'requeued', 'skipped', 'dead_lettered'], 'ck_lr_inbox_processing_state');
        t.uuid('lease_token');
        t.timestamp('lease_expires_at', tz);
        t.string('workflow_run_id', 120);
        t.integer('claim_count').notNullable().defaultTo(1);
        t.timestamp('processed_at', tz);
        t.string('last_error_code', 60);
        t.timestamp('created_at', tz).notNullable();
        t.timestamp('updated_at', tz).notNullable();
        t.primary(['event_id', 'consumer_name'], 'pk_lr_automation_event_inbox');
        t.unique(['lease_token'], { indexName: 'uq_lr_inbox_lease_token' });
      });
    }

    if (!(await knex.schema.hasTable(TABLES.deliveries))) {
      await knex.schema.createTable(TABLES.deliveries, (t) => {
        t.uuid('delivery_id').primary();
        t.uuid('event_id');
        t.uuid('recipient_ref');
        t.string('channel', 20).notNullable();
        t.string('dedup_key', 300).notNullable().unique({ indexName: 'uq_lr_delivery_dedup_key' });
        t.string('delivery_state', 20).notNullable();
        t.string('provider_message_id_digest', 128);
        t.timestamp('retry_after', tz);
        t.string('last_error_code', 60);
        t.timestamp('created_at', tz).notNullable().defaultTo(knex.fn.now());
      });
    }

    if (!(await knex.schema.hasTable(TABLES.jobEvents))) {
      await knex.schema.createTable(TABLES.jobEvents, (t) => {
        t.uuid('id').primary();
        t.uuid('job_public_id').notNullable();
        t.string('from_state', 20);
        t.string('to_state', 20).notNullable();
        t.string('reason', 30).notNullable(); // claim | transition | passed_through | finalize | fail | requeue | resume | cancel | expire
        t.string('workflow_run_id', 120);
        t.uuid('event_id');
        t.string('request_id', 128);
        t.string('error_code', 60);
        t.jsonb('metadata_safe');
        t.timestamp('occurred_at', tz).notNullable();
        t.index(['job_public_id', 'occurred_at'], 'idx_lr_job_state_events_job');
      });
    }

    if (!(await knex.schema.hasTable(TABLES.idempotency))) {
      await knex.schema.createTable(TABLES.idempotency, (t) => {
        t.string('route_key', 200).notNullable();
        t.string('idempotency_key', 200).notNullable();
        t.string('request_digest', 64).notNullable();
        t.integer('response_status').notNullable();
        t.jsonb('response_json').notNullable();
        t.timestamp('created_at', tz).notNullable();
        t.timestamp('expires_at', tz).notNullable();
        t.primary(['route_key', 'idempotency_key'], 'pk_lr_automation_idempotency_keys');
        t.index(['expires_at'], 'idx_lr_idempotency_expires');
      });
    }

    if (!(await knex.schema.hasTable(TABLES.incidents))) {
      await knex.schema.createTable(TABLES.incidents, (t) => {
        t.uuid('id').primary();
        t.string('workflow_id', 120);
        t.string('workflow_name', 200);
        t.string('workflow_run_id', 120);
        t.string('retry_of', 120);
        t.string('last_node', 200);
        t.string('error_code', 60).notNullable();
        t.integer('http_status');
        t.string('severity', 20);
        t.timestamp('occurred_at', tz);
        t.timestamp('received_at', tz).notNullable();
        t.string('request_id', 128);
        t.uuid('job_public_id');
        t.string('action_taken', 40).notNullable(); // failed | requeued | dead_lettered | ignored_lease_not_held | no_job
        t.index(['workflow_run_id'], 'idx_lr_incidents_run');
      });
    }
  },
};

module.exports.TABLES = TABLES;
