#!/usr/bin/env node
'use strict';

/**
 * LR-W0-01 test fixtures — SYNTHETIC DEMO MODE ONLY (requires AI_PROVIDER=mock).
 *
 *   node scripts/lr-fixture.js list
 *   node scripts/lr-fixture.js <scenario>          create a queued job + outbox event
 *   node scripts/lr-fixture.js status <job_public_id>
 *
 * Run it with the same environment as the Strapi server (same database). The running server's
 * dispatcher then delivers the event to n8n within LONGRAK_OUTBOX_POLL_MS. This process loads
 * Strapi without HTTP and with its own dispatcher off.
 */
const path = require('node:path');

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const { SCENARIOS, createScenarioJob } = require('../src/automation/synthetic');
  if (!cmd || cmd === 'list') {
    for (const [name, what] of Object.entries(SCENARIOS)) console.log(`${name.padEnd(28)} ${what}`);
    return 0;
  }
  if (process.env.AI_PROVIDER !== 'mock') {
    console.error('Refusing: fixtures are synthetic-demo only. Set AI_PROVIDER=mock (server env) first.');
    return 2;
  }
  if (cmd !== 'status' && !SCENARIOS[cmd]) {
    console.error(`Unknown scenario "${cmd}". Run: node scripts/lr-fixture.js list`);
    return 2;
  }

  process.env.LONGRAK_OUTBOX_DISPATCHER = 'false';
  process.env.LONGRAK_SEED = 'false';
  const { createStrapi } = require('@strapi/strapi');
  const appDir = path.resolve(__dirname, '..');
  const strapi = await createStrapi({ appDir, distDir: appDir }).load();
  strapi.log.level = 'error';
  const db = strapi.db.connection;
  try {
    if (cmd === 'status') {
      const job = await strapi.db.query('api::analysis-job.analysis-job').findOne({ where: { public_id: arg ?? '' } });
      if (!job) { console.error('job not found'); return 1; }
      const events = await db('lr_analysis_job_state_events').where({ job_public_id: job.public_id }).orderBy('occurred_at');
      const outbox = await db('lr_domain_outbox_events').where({ aggregate_public_id: job.public_id }).orderBy('created_at');
      const inbox = outbox.length ? await db('lr_automation_event_inbox').whereIn('event_id', outbox.map((e) => e.id)) : [];
      console.log(JSON.stringify({
        job_public_id: job.public_id, processing_state: job.processing_state, error_code: job.error_code, last_error_code: job.last_error_code, attempt_count: job.attempt_count,
        history: events.map((e) => `${e.from_state ?? '∅'} → ${e.to_state} (${e.reason}${e.error_code ? ` ${e.error_code}` : ''})`),
        outbox: outbox.map((e) => ({ event_id: e.id, event_type: e.event_type, delivery_state: e.delivery_state, attempts: e.attempt_count, last_error_code: e.last_error_code })),
        inbox: inbox.map((r) => ({ event_id: r.event_id, consumer: r.consumer_name, state: r.processing_state, claims: r.claim_count, run: r.workflow_run_id })),
      }, null, 2));
      return 0;
    }

    const out = await createScenarioJob(strapi, cmd);
    if (cmd === 'duplicate_event') {
      // deliver the SAME event twice, concurrently. Take the row from the live dispatcher first;
      // if it already sent it once, send once more ourselves — exactly two deliveries either way.
      const { automation } = require('../src/automation');
      const c = require('../src/automation/config')();
      if (!c.webhookUrl) throw new Error('LONGRAK_N8N_EVENT_WEBHOOK_URL is not set');
      const now = new Date();
      const took = await db('lr_domain_outbox_events').where({ id: out.event_id, delivery_state: 'pending' })
        .update({ delivery_state: 'dispatched', published_at: now, last_attempt_at: now, attempt_count: 2 });
      const ev = await db('lr_domain_outbox_events').where({ id: out.event_id }).first();
      const body = JSON.stringify(automation(strapi).dispatcher.envelope(ev));
      const send = () => fetch(c.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(c.webhookSecret ? { [c.webhookSecretHeader]: c.webhookSecret } : {}), 'x-event-id': ev.id, 'x-request-id': ev.request_id ?? ev.id, 'idempotency-key': ev.id },
        body,
      }).then((r) => r.status, (e) => `error ${e.message}`);
      const statuses = await Promise.all(took ? [send(), send()] : [send()]);
      out.deliveries = took ? statuses : ['(dispatcher)', ...statuses];
    }
    console.log(JSON.stringify({ ...out, expected: SCENARIOS[cmd], status_command: `node scripts/lr-fixture.js status ${out.job_public_id}` }, null, 2));
    return 0;
  }
  finally {
    await strapi.destroy();
  }
}

main().then((code) => process.exit(code), (err) => { console.error(err.message); process.exit(1); });
