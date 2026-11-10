import type {
  ActivityEvent,
  AgentMetrics,
  AgentRequest,
  AgentResult,
  EventBrief,
  EventPlan,
  VerificationCheck,
} from '../domain.ts';
import { DEFAULT_BRIEF, formatINR } from '../domain.ts';
import { getStage } from '../harness/stages.ts';
import { collectToolResults } from '../harness/tools.ts';
import { evaluatePolicies, POLICY } from '../harness/policies.ts';
import { verifyPlan, allBlockingChecksPass } from '../harness/verifier.ts';
import { buildPlan } from './plans.ts';
import { runFeedbackLoop } from './feedback-loop.ts';
import { runEvaluationSuite } from '../evaluation/scenarios.ts';

function parseBriefUpdate(message: string, current: EventBrief): EventBrief {
  const next = { ...current };
  let changed = false;
  const guestMatch = message.match(/\b(\d{1,3})\s*(?:guests?|people|attendees|persons?)\b/i)
    ?? message.match(/\b(?:make it|change to|set it to)\s*(\d{1,3})\b/i);
  if (guestMatch) {
    const count = Number(guestMatch[1]);
    if (count >= 1 && count <= 500 && count !== next.guestCount) {
      next.guestCount = count;
      changed = true;
    }
  }
  const budgetMatch = message.match(/(?:budget|spend|limit)(?:\s*(?:of|to|around|is|=))?\s*₹?\s*([\d,]{3,})/i)
    ?? message.match(/₹\s*([\d,]{3,})/);
  if (budgetMatch) {
    const budget = Number(budgetMatch[1].replace(/,/g, ''));
    if (budget >= 1_000 && budget <= 10_000_000 && budget !== next.budget) {
      next.budget = budget;
      changed = true;
    }
  }
  if (/\b(outdoor|open[- ]air)\b/i.test(message) && next.setting !== 'Outdoor') {
    next.setting = 'Outdoor';
    changed = true;
  }
  if (/\b(indoor|inside)\b/i.test(message) && next.setting !== 'Indoor') {
    next.setting = 'Indoor';
    changed = true;
  }
  if (/\b(formal)\b/i.test(message) && next.atmosphere !== 'Formal') {
    next.atmosphere = 'Formal';
    changed = true;
  }
  if (/\b(casual)\b/i.test(message) && next.atmosphere !== 'Casual') {
    next.atmosphere = 'Casual';
    changed = true;
  }
  if (changed) next.revision = current.revision + 1;
  return next;
}

function event(id: string, node: string, status: ActivityEvent['status'], detail: string, elapsedMs = 4): ActivityEvent {
  return { id, node, status, detail, elapsedMs };
}

function metricsFor(
  brief: EventBrief,
  stage: number,
  plan: EventPlan | null,
  checks: VerificationCheck[],
  iterations: number,
  approvalRequired: boolean,
  toolsUsed: number,
): AgentMetrics {
  const estimate = stage <= 2 ? 48_000 : null;
  return {
    estimatedTotal: estimate,
    total: plan?.total ?? null,
    budget: brief.budget,
    budgetHeadroom: plan ? brief.budget - plan.total : (estimate === null ? null : brief.budget - estimate),
    checksPassed: checks.filter((check) => check.passed).length,
    checksTotal: checks.length,
    iterations,
    verified: checks.length > 0 && allBlockingChecksPass(checks),
    approvalRequired,
    structured: stage >= 4,
    toolsUsed,
  };
}

function baseResult(request: AgentRequest, brief: EventBrief): AgentResult {
  const stage = request.mode === 'complete' ? 11 : Math.max(1, Math.min(11, request.stage));
  const definition = getStage(stage);
  return {
    mode: request.mode,
    stage,
    stageTitle: definition.title,
    brief,
    reply: '',
    plan: null,
    checks: [],
    activities: [],
    iterations: [],
    toolResults: [],
    metrics: metricsFor(brief, stage, null, [], 0, stage >= 10, 0),
    teaching: definition,
    status: 'incomplete',
  };
}

export function runAgent(request: AgentRequest): AgentResult {
  const incomingBrief = request.brief ?? DEFAULT_BRIEF;
  const brief = parseBriefUpdate(request.message ?? '', incomingBrief);
  const result = baseResult(request, brief);

  if (request.action === 'approve') {
    const approvalChecks = request.plan
      ? [...evaluatePolicies(brief, request.plan), ...verifyPlan(brief, request.plan)]
      : [];
    const canApprove = Boolean(request.plan) && approvalChecks.length > 0 && allBlockingChecksPass(approvalChecks);
    const approved: AgentResult = {
      ...result,
      plan: request.plan ?? null,
      checks: approvalChecks,
      stage: 10,
      status: canApprove ? 'approved' : 'blocked',
    };
    approved.reply = canApprove
      ? 'Dry-run approval recorded for this plan version. No vendor has been contacted, no booking was created and no payment was made. In a production system, this approval would be tied to a durable plan version and an authorised booking tool.'
      : 'Approval was not recorded because there is no plan or the server-side checks did not pass. Resolve the blocking checks before requesting approval.';
    approved.approvalMessage = canApprove
      ? `Approval recorded for revision ${brief.revision}. External booking is disabled in this workshop.`
      : 'The approval gate rejected this request. A valid, independently verified plan is required.';
    approved.activities = [event('approval-recorded', 'human_approval', canApprove ? 'done' : 'blocked', canApprove ? 'User approved the dry-run plan. Server-side checks passed; external side effects remain disabled.' : 'Approval rejected because a plan was missing or failed server-side checks.')];
    approved.metrics = metricsFor(brief, 10, approved.plan, approvalChecks, 0, false, 0);
    return approved;
  }

  if (request.action === 'evaluate') {
    result.plan = request.plan ?? null;
    result.checks = request.plan ? [...evaluatePolicies(brief, request.plan), ...verifyPlan(brief, request.plan)] : [];
    result.reply = 'The outer evaluation loop has run the golden scenario suite. Review the outcomes to see whether changes to prompts, tools or policies introduce regressions.';
    result.evaluationResults = runEvaluationSuite();
    result.status = result.evaluationResults.every((item) => item.passed) ? 'ready' : 'blocked';
    result.activities = [event('evaluation-suite', 'outer_evaluation_loop', result.status === 'ready' ? 'done' : 'warning', `${result.evaluationResults.filter((item) => item.passed).length}/${result.evaluationResults.length} scenarios passed.`)];
    result.metrics = metricsFor(brief, 11, result.plan, result.checks, 0, false, 0);
    return result;
  }

  const stage = result.stage;
  const activityLog: ActivityEvent[] = [event('request-received', 'request_intake', 'done', 'Received the event-planning request.')];

  if (stage === 1) {
    result.reply = `Here is a quick starting point: a family-friendly birthday celebration for around ${brief.guestCount} guests could be planned for approximately ${formatINR(48_000)}. I would look for an indoor hall, arrange a buffet, add simple decorations and include a cake and a few games. This looks likely to fit your ${formatINR(brief.budget)} budget.\n\nThis is only a one-shot estimate. It has no supplier lookup, line-item calculation, tax/contingency check or venue-capacity verification.`;
    result.activities = activityLog;
    result.metrics = metricsFor(brief, stage, null, [], 0, false, 0);
    return result;
  }

  activityLog.push(event('context-assembled', 'context_builder', 'done', `Loaded ${brief.guestCount} guests, ${formatINR(brief.budget)} budget, ${brief.city}, ${brief.setting.toLowerCase()} setting and ${brief.atmosphere.toLowerCase()} atmosphere.`));

  if (stage === 2) {
    result.reply = `I have carried the event details into this turn: ${brief.guestCount} guests, an indoor family-friendly event in ${brief.city}, and a budget of ${formatINR(brief.budget)}. A rough estimate is still around ${formatINR(48_000)}.\n\nContext makes the answer more relevant, but it does not make the estimate factual. I still have not checked real catalogue entries, capacity, taxes or contingency.`;
    result.activities = activityLog;
    result.metrics = metricsFor(brief, stage, null, [], 0, false, 0);
    return result;
  }

  const tools = collectToolResults(brief);
  activityLog.push(event('tools-called', 'tool_router', 'done', `Executed ${tools.length} read-only catalogue lookups.`, 12));
  result.toolResults = tools;

  if (stage === 3) {
    const venueSummary = tools.filter((tool) => tool.tool === 'venue_catalog.search').map((tool) => tool.result).join('\n');
    result.reply = `I queried the workshop catalogue. Here is evidence the planner can now use:\n\n${venueSummary}\n\nCatering and vendor price data are also available in the Tool results panel. This is grounded data, but we have not yet assembled it into a validated plan.`;
    result.activities = activityLog;
    result.metrics = metricsFor(brief, stage, null, [], 0, false, tools.length);
    return result;
  }

  let plan = buildPlan(brief, 'initial', 1);
  activityLog.push(event('plan-structured', 'output_contract', 'done', 'Created a typed proposal with line items, tax, contingency and venue capacity.'));
  result.plan = plan;

  if (stage === 4) {
    result.reply = `The catalogue data is now represented as a structured plan. The initial premium proposal totals ${formatINR(plan.total)} including ${formatINR(plan.tax)} tax and ${formatINR(plan.contingency)} contingency.\n\nThe important difference: the UI can render each field and the next components can validate it. The structured output makes the budget gap visible instead of burying it in prose.`;
    result.activities = activityLog;
    result.metrics = metricsFor(brief, stage, plan, [], 0, false, tools.length);
    result.status = 'incomplete';
    return result;
  }

  activityLog.push(event('state-loaded', 'state_manager', 'done', `Carried forward event revision ${brief.revision}; the request now contains ${brief.guestCount} guests and ${formatINR(brief.budget)} budget.`));
  if (stage === 5) {
    result.reply = `The agent has preserved the event state across turns. Current state is revision ${brief.revision}: ${brief.guestCount} guests, ${formatINR(brief.budget)} budget, ${brief.setting.toLowerCase()} setting.\n\nTry saying “make it 60 guests” or “set the budget to ₹44,000”. The next turn will update only that field and keep the rest of the brief.`;
    result.activities = activityLog;
    result.metrics = metricsFor(brief, stage, plan, [], 0, false, tools.length);
    return result;
  }

  const policyChecks = evaluatePolicies(brief, plan);
  activityLog.push(event('policy-gate', 'policy_engine', policyChecks.every((check) => check.passed) ? 'done' : 'blocked', policyChecks.map((check) => `${check.label}: ${check.passed ? 'pass' : 'fail'}`).join(' · ')));
  if (stage === 6) {
    result.checks = policyChecks;
    result.reply = `The policy layer has blocked the initial proposal because the total is ${formatINR(plan.total)} against a ${formatINR(brief.budget)} budget. The agent is also prohibited from making a booking without explicit approval.\n\nThis is an important boundary: the policy engine does not ask the LLM whether it should obey the budget. It enforces the rule in code.`;
    result.activities = activityLog;
    result.status = policyChecks.every((check) => check.passed) ? 'incomplete' : 'blocked';
    result.metrics = metricsFor(brief, stage, plan, policyChecks, 0, false, tools.length);
    return result;
  }

  const verifierChecks = verifyPlan(brief, plan);
  const allChecks = [...policyChecks, ...verifierChecks];
  activityLog.push(event('independent-verification', 'verifier', allBlockingChecksPass(verifierChecks) && policyChecks.every((check) => check.passed) ? 'done' : 'warning', `${allChecks.filter((check) => check.passed).length}/${allChecks.length} checks passed.`));

  if (stage === 7) {
    result.checks = allChecks;
    result.reply = `The independent verifier has checked the arithmetic, budget, venue capacity and required categories. The initial proposal fails: ${formatINR(plan.total)} is above the ${formatINR(brief.budget)} budget. The verifier reports the exact gap so the planner can use it as feedback.`;
    result.activities = activityLog;
    result.status = allBlockingChecksPass(verifierChecks) && policyChecks.every((check) => check.passed) ? 'ready' : 'blocked';
    result.metrics = metricsFor(brief, stage, plan, allChecks, 0, false, tools.length);
    return result;
  }

  const loop = runFeedbackLoop(brief);
  plan = loop.plan ?? plan;
  const finalPolicyChecks = evaluatePolicies(brief, plan);
  const finalChecks = [...finalPolicyChecks, ...loop.checks];
  activityLog.push(...loop.activities);

  if (stage === 8) {
    result.plan = plan;
    result.checks = finalChecks;
    result.iterations = loop.iterations;
    result.activities = activityLog;
    result.status = loop.status === 'ready' ? 'ready' : 'blocked';
    result.reply = loop.status === 'ready'
      ? `The feedback loop has converged. It revised the proposal using verifier feedback and reached ${formatINR(plan.total)} against the ${formatINR(brief.budget)} budget. The verifier passed the final plan.\n\nNotice the loop: plan → verify → critique → revise → verify again. It has a maximum of ${POLICY.maximumRevisionAttempts} attempts and stops if it cannot make progress.`
      : `The loop did not find a feasible plan. ${loop.escalation ?? 'Human review is required.'}`;
    result.metrics = metricsFor(brief, stage, plan, finalChecks, loop.iterations.length, false, tools.length);
    return result;
  }

  if (stage === 9) {
    result.plan = plan;
    result.checks = finalChecks;
    result.iterations = loop.iterations;
    result.activities = activityLog;
    result.status = loop.status === 'ready' ? 'ready' : 'blocked';
    result.reply = `The plan is ${loop.status === 'ready' ? 'verified' : 'blocked'} and the execution trace is now visible. Each activity records its node, outcome, short description and elapsed time. This is the operational evidence engineers use to diagnose failures and monitor drift.\n\nTrace data is illustrative workshop telemetry; production traces should include correlation IDs and redact personal information.`;
    result.metrics = metricsFor(brief, stage, plan, finalChecks, loop.iterations.length, false, tools.length);
    return result;
  }

  const approvalRequired = loop.status === 'ready';
  result.plan = plan;
  result.checks = finalChecks;
  result.iterations = loop.iterations;
  result.activities = activityLog;
  result.status = loop.status === 'ready' ? 'needs-approval' : 'blocked';
  result.approvalMessage = approvalRequired ? 'Ready for human review. Approval records a dry-run decision only; no booking is made.' : loop.escalation ?? 'The plan is blocked and cannot be approved.';
  result.reply = approvalRequired
    ? `The plan is verified and ready for your approval. Total: ${formatINR(plan.total)}. Remaining budget: ${formatINR(brief.budget - plan.total)}.\n\nNothing is booked. Approving here records a dry-run approval against this plan version. In a production system, the next step would be a separately authorised, auditable booking action.`
    : `The plan is blocked and cannot be approved. ${loop.escalation ?? 'Resolve the failed checks first.'}`;
  result.metrics = metricsFor(brief, stage, plan, finalChecks, loop.iterations.length, approvalRequired, tools.length);
  return result;
}

export function getInitialBrief(): EventBrief {
  return { ...DEFAULT_BRIEF, dietaryNeeds: [...DEFAULT_BRIEF.dietaryNeeds] };
}
