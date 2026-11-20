'use strict';

/** Pure rules for analysis_jobs.processing_state — no database needed. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { planTransition, backoffMs } = require('../src/automation/state-machine');

test('re-requesting the current state is a no-op', () => {
  assert.deepEqual(planTransition('validating', 'validating'), { kind: 'noop' });
});

test('next state advances; skipping needs the exact passed_through list', () => {
  assert.deepEqual(planTransition('preprocessing', 'extracting'), { kind: 'advance', path: ['extracting'] });
  assert.deepEqual(planTransition('retrieving', 'validating', ['model_call']), { kind: 'advance', path: ['model_call', 'validating'] });
  assert.equal(planTransition('retrieving', 'validating').reason, 'passed_through_mismatch');
  assert.equal(planTransition('retrieving', 'validating', ['rule_check']).reason, 'passed_through_mismatch');
  assert.equal(planTransition('preprocessing', 'extracting', ['x']).reason, 'unexpected_passed_through');
});

test('no backward moves, no completed/failed via transition, only from processing states', () => {
  assert.equal(planTransition('model_call', 'extracting').reason, 'backward_transition');
  assert.equal(planTransition('validating', 'completed').reason, 'invalid_target_state');
  assert.equal(planTransition('validating', 'failed').reason, 'invalid_target_state');
  assert.equal(planTransition('queued', 'extracting').reason, 'not_processing');
  assert.equal(planTransition('cancelled', 'extracting').reason, 'not_processing');
});

test('backoff grows and is capped', () => {
  for (let i = 0; i < 50; i += 1) {
    assert.ok(backoffMs(1) >= 12000 && backoffMs(1) <= 18000);
    assert.ok(backoffMs(30) <= 15 * 60 * 1000 * 1.2);
  }
});
