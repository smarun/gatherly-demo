import type { EvaluationResult, EventBrief } from '../domain.ts';
import { DEFAULT_BRIEF } from '../domain.ts';
import { runFeedbackLoop } from '../agent/feedback-loop.ts';
import { allBlockingChecksPass } from '../harness/verifier.ts';

export const GOLDEN_SCENARIOS: Array<{ name: string; description: string; brief: EventBrief; expected: 'ready' | 'blocked' }> = [
  { name: 'Standard birthday', description: '40 guests with a ₹50,000 budget.', brief: { ...DEFAULT_BRIEF }, expected: 'ready' },
  { name: 'Tight budget', description: '40 guests with a ₹44,000 budget.', brief: { ...DEFAULT_BRIEF, budget: 44_000 }, expected: 'ready' },
  { name: 'Capacity boundary', description: '60 guests with a ₹55,000 budget.', brief: { ...DEFAULT_BRIEF, guestCount: 60, budget: 55_000 }, expected: 'blocked' },
  { name: 'Unsupported setting', description: 'Outdoor event requested while the workshop catalogue contains indoor venues only.', brief: { ...DEFAULT_BRIEF, setting: 'Outdoor' }, expected: 'blocked' },
];

export function runEvaluationSuite(): EvaluationResult[] {
  return GOLDEN_SCENARIOS.map((scenario) => {
    const run = runFeedbackLoop(scenario.brief);
    const passed = scenario.expected === 'ready'
      ? run.status === 'ready' && allBlockingChecksPass(run.checks)
      : run.status === 'blocked' && !!run.escalation;
    return {
      name: scenario.name,
      description: scenario.description,
      passed,
      total: run.plan?.total ?? null,
      budget: scenario.brief.budget,
      checks: run.checks.map((check) => `${check.passed ? 'PASS' : 'FAIL'} · ${check.label}`),
      outcome: run.status === 'ready' ? 'Plan verified' : run.escalation ?? 'Escalated for human review',
    };
  });
}
