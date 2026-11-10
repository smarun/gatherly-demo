import test from 'node:test';
import assert from 'node:assert/strict';
import { runAgent, getInitialBrief } from '../lib/agent/run-agent.ts';
import { runFeedbackLoop } from '../lib/agent/feedback-loop.ts';
import { buildPlan } from '../lib/agent/plans.ts';
import { runEvaluationSuite } from '../lib/evaluation/scenarios.ts';
import { verifyPlan, allBlockingChecksPass } from '../lib/harness/verifier.ts';

const base = () => getInitialBrief();

test('stage 1 is a true baseline: no tools, plan or checks', () => {
  const result = runAgent({ mode: 'progressive', stage: 1, message: 'Plan a birthday party.', brief: base() });
  assert.equal(result.plan, null);
  assert.equal(result.checks.length, 0);
  assert.equal(result.metrics.estimatedTotal, 48_000);
  assert.equal(result.metrics.toolsUsed, 0);
});

test('context parsing updates guest count without dropping the rest of the brief', () => {
  const result = runAgent({ mode: 'progressive', stage: 5, message: 'Make it 60 guests.', brief: base() });
  assert.equal(result.brief.guestCount, 60);
  assert.equal(result.brief.budget, 50_000);
  assert.equal(result.brief.city, 'Bengaluru');
  assert.equal(result.brief.revision, 1);
});

test('initial premium plan exposes budget overspend including tax and contingency', () => {
  const brief = base();
  const plan = buildPlan(brief, 'initial', 1);
  assert.equal(plan.subtotal, 53_245);
  assert.equal(plan.tax, 2_662);
  assert.equal(plan.contingency, 5_325);
  assert.equal(plan.total, 61_232);
  assert.equal(allBlockingChecksPass(verifyPlan(brief, plan)), false);
});

test('standard budget scenario converges to a verified plan', () => {
  const result = runFeedbackLoop(base());
  assert.equal(result.status, 'ready');
  assert.equal(result.plan?.total, 46_824);
  assert.equal(allBlockingChecksPass(result.checks), true);
  assert.equal(result.iterations.length, 2);
});

test('a sufficiently large budget lets the initial proposal pass without revisions', () => {
  const brief = { ...base(), budget: 70_000 };
  const result = runFeedbackLoop(brief);
  assert.equal(result.status, 'ready');
  assert.equal(result.plan?.total, 61_232);
  assert.equal(result.iterations.length, 1);
  assert.match(result.iterations[0].feedback, /no revision required/i);
});

test('tight budget scenario selects the lean package', () => {
  const brief = { ...base(), budget: 44_000 };
  const result = runFeedbackLoop(brief);
  assert.equal(result.status, 'ready');
  assert.equal(result.plan?.total, 43_930);
  assert.equal(allBlockingChecksPass(result.checks), true);
  assert.equal(result.iterations.length, 3);
});

test('capacity boundary escalates instead of inventing a venue', () => {
  const brief = { ...base(), guestCount: 60, budget: 55_000 };
  const result = runFeedbackLoop(brief);
  assert.equal(result.status, 'blocked');
  assert.match(result.escalation ?? '', /cannot accommodate 60 guests/i);
  assert.equal(result.plan?.venueCapacity, 50);
});

test('approval records a dry run and does not enable bookings', () => {
  const plan = buildPlan(base(), 'standard', 3);
  const checks = verifyPlan(base(), plan);
  const approved = runAgent({ mode: 'complete', stage: 11, message: 'approve', brief: base(), action: 'approve', plan, checks });
  assert.equal(approved.status, 'approved');
  assert.equal(approved.plan?.total, 46_824);
  assert.match(approved.reply, /No vendor has been contacted/i);
});

test('approval gate rejects a plan that is still over budget', () => {
  const brief = base();
  const invalidPlan = buildPlan(brief, 'initial', 1);
  const denied = runAgent({ mode: 'complete', stage: 11, message: 'approve', brief, action: 'approve', plan: invalidPlan });
  assert.equal(denied.status, 'blocked');
  assert.match(denied.reply, /Approval was not recorded/i);
});

test('outdoor requirement escalates when only indoor venues exist', () => {
  const brief = { ...base(), setting: 'Outdoor' };
  const result = runFeedbackLoop(brief);
  assert.equal(result.status, 'blocked');
  assert.match(result.escalation ?? '', /no outdoor venues/i);
});

test('outer evaluation suite covers standard, tight, capacity and setting scenarios', () => {
  const suite = runEvaluationSuite();
  assert.equal(suite.length, 4);
  assert.ok(suite.every((scenario) => scenario.passed));
});
