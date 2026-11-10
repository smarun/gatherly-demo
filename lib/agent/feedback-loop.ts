import type { EventBrief, EventPlan, IterationRecord, ActivityEvent } from '../domain.ts';
import { buildPlan } from './plans.ts';
import { verifyPlan, allBlockingChecksPass } from '../harness/verifier.ts';
import { POLICY } from '../harness/policies.ts';

export interface LoopResult {
  plan: EventPlan | null;
  checks: ReturnType<typeof verifyPlan>;
  iterations: IterationRecord[];
  activities: ActivityEvent[];
  status: 'ready' | 'blocked';
  escalation: string | null;
}

function activity(id: string, node: string, status: ActivityEvent['status'], detail: string, elapsedMs: number): ActivityEvent {
  return { id, node, status, detail, elapsedMs };
}

/**
 * Inner loop: draft -> independently verify -> feed specific failures back -> revise.
 * The loop is bounded and has explicit no-progress/escalation exits.
 */
export function runFeedbackLoop(brief: EventBrief): LoopResult {
  const activities: ActivityEvent[] = [];
  const iterations: IterationRecord[] = [];

  if (brief.guestCount > POLICY.maxGuestsSupportedByCatalog || brief.setting !== 'Indoor') {
    const blockedPlan = buildPlan(brief, 'initial', 1);
    const checks = verifyPlan(brief, blockedPlan);
    const reason = brief.guestCount > POLICY.maxGuestsSupportedByCatalog
      ? `No workshop venue supports ${brief.guestCount} guests; catalog limit is ${POLICY.maxGuestsSupportedByCatalog}.`
      : 'The workshop catalogue contains indoor venues only; an outdoor venue must be sourced.';
    activities.push(activity('loop-feasibility-stop', 'feasibility_gate', 'blocked', reason, 4));
    return {
      plan: blockedPlan,
      checks,
      iterations: [{ attempt: 1, label: 'Capacity feasibility gate', subtotal: blockedPlan.subtotal, total: blockedPlan.total, passed: false, feedback: 'Escalate: find a larger venue or split the event before continuing.' }],
      activities,
      status: 'blocked',
      escalation: brief.guestCount > POLICY.maxGuestsSupportedByCatalog
        ? `The current venue catalogue cannot accommodate ${brief.guestCount} guests. The agent will not invent a larger venue or claim the plan is ready.`
        : 'The workshop catalogue has no outdoor venues. The agent will not substitute an indoor venue or claim the setting requirement passed.',
    };
  }

  const initialPlan = buildPlan(brief, 'initial', 1);
  const initialChecks = verifyPlan(brief, initialPlan);
  if (allBlockingChecksPass(initialChecks)) {
    activities.push(activity('loop-initial-pass', 'independent_verifier', 'done', 'The initial proposal already satisfies the blocking checks; no revision is needed.', 5));
    return {
      plan: initialPlan,
      checks: initialChecks,
      iterations: [{ attempt: 1, label: 'Initial proposal', subtotal: initialPlan.subtotal, total: initialPlan.total, passed: true, feedback: 'Initial proposal passed; no revision required.' }],
      activities,
      status: 'ready',
      escalation: null,
    };
  }

  const candidates: Array<{ level: 'revision-one' | 'standard' | 'lean'; label: string; feedback: string }> = [
    { level: 'revision-one', label: 'Revision 1 — reduce premium items', feedback: 'The first revision is still above budget. Reduce venue slot, buffet unit cost and optional extras.' },
    { level: 'standard', label: 'Revision 2 — standard package', feedback: 'The verifier confirms the standard package fits the budget.' },
    { level: 'lean', label: 'Revision 3 — lean package', feedback: 'Use the lean package only when the standard package still exceeds the budget.' },
  ];

  let previousTotal = Number.POSITIVE_INFINITY;
  let finalPlan: EventPlan | null = null;
  let finalChecks = verifyPlan(brief, null);
  let status: 'ready' | 'blocked' = 'blocked';
  let escalation: string | null = null;

  for (let index = 0; index < Math.min(candidates.length, POLICY.maximumRevisionAttempts); index += 1) {
    const candidate = candidates[index];
    // Avoid producing a more expensive revision than the preceding candidate.
    const packagePlan = buildPlan(brief, candidate.level, index + 2);
    const checks = verifyPlan(brief, packagePlan);
    const passed = allBlockingChecksPass(checks);
    const budgetCheck = checks.find((check) => check.id === 'verify-budget');
    const capacityCheck = checks.find((check) => check.id === 'verify-capacity');
    const detail = [budgetCheck?.detail, capacityCheck?.detail].filter(Boolean).join(' ');

    if (packagePlan.total >= previousTotal) {
      activities.push(activity(`loop-no-progress-${index}`, 'progress_guard', 'blocked', 'A proposed revision did not reduce the total. Stop to avoid a repeated/no-progress loop.', 2));
      escalation = 'The planner could not find a lower-cost revision; human review is required.';
      break;
    }

    previousTotal = packagePlan.total;
    iterations.push({
      attempt: index + 1,
      label: candidate.label,
      subtotal: packagePlan.subtotal,
      total: packagePlan.total,
      passed,
      feedback: passed ? 'All blocking checks passed.' : detail || candidate.feedback,
    });
    activities.push(activity(`loop-plan-${index}`, 'planner', 'done', `${candidate.label}: ${packagePlan.total.toLocaleString('en-IN')} including tax and contingency.`, 18 + index * 6));
    activities.push(activity(`loop-verify-${index}`, 'independent_verifier', passed ? 'done' : 'warning', passed ? 'Budget, capacity, arithmetic and required categories passed.' : detail, 5));

    finalPlan = packagePlan;
    finalChecks = checks;
    if (passed) {
      status = 'ready';
      break;
    }
  }

  if (status !== 'ready') {
    escalation ??= `No plan satisfied every blocking check within ${POLICY.maximumRevisionAttempts} attempts. Current best total: ${finalPlan?.total.toLocaleString('en-IN') ?? 'not available'}.`;
  }

  return { plan: finalPlan, checks: finalChecks, iterations, activities, status, escalation };
}
