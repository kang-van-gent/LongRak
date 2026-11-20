'use strict';

/**
 * Pure transition rules for analysis_jobs.processing_state (no I/O, unit-testable).
 */
const { PIPELINE, PROCESSING, TRANSITION_TARGETS } = require('./constants');

/**
 * Plan a /transition request.
 * @returns {{ kind: 'noop' } | { kind: 'advance', path: string[] } | { kind: 'reject', reason: string }}
 *   path = every state to record, in order, ending with `to` (intermediates from passed_through).
 */
function planTransition(current, to, passedThrough) {
  if (!TRANSITION_TARGETS.has(to)) return { kind: 'reject', reason: 'invalid_target_state' };
  if (!PROCESSING.has(current)) return { kind: 'reject', reason: 'not_processing' };
  // n8n's regeneration loop resends the state it is already in: harmless no-op
  if (current === to) return { kind: 'noop' };

  const from = PIPELINE.indexOf(current);
  const target = PIPELINE.indexOf(to);
  if (target < from) return { kind: 'reject', reason: 'backward_transition' };

  const intermediates = PIPELINE.slice(from + 1, target);
  const given = Array.isArray(passedThrough) ? passedThrough : [];
  // Skipping states is allowed only when the caller says it passed through exactly those states
  if (given.length !== intermediates.length || given.some((s, i) => s !== intermediates[i])) {
    return { kind: 'reject', reason: intermediates.length ? 'passed_through_mismatch' : 'unexpected_passed_through' };
  }
  return { kind: 'advance', path: [...intermediates, to] };
}

/** Exponential backoff with ±20% jitter, in milliseconds. attempt is 1-based. */
function backoffMs(attempt, baseMs = 15000, capMs = 15 * 60 * 1000) {
  const raw = Math.min(capMs, baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(raw * (0.8 + Math.random() * 0.4));
}

module.exports = { planTransition, backoffMs };
