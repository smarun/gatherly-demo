import type { TeachingNote } from '../domain.ts';

export interface BuildStage extends TeachingNote {
  id: number;
  shortTitle: string;
  kind: 'baseline' | 'harness' | 'loop' | 'complete';
}

export const BUILD_STAGES: BuildStage[] = [
  {
    id: 1,
    shortTitle: 'LLM only',
    title: 'A prompt and a model',
    kind: 'baseline',
    whatAdded: 'Nothing around the model yet: one instruction goes in and a free-form answer comes out.',
    failureMode: 'The answer sounds confident but has no supplier evidence, cost breakdown, capacity check or proof that it fits the budget.',
    benefit: 'Creates a deliberately simple baseline so every later engineering investment has something concrete to improve.',
    maintenance: 'Keep this baseline fixed as a control in the evaluation suite. Do not quietly improve it when changing the full agent.',
  },
  {
    id: 2,
    shortTitle: 'Context',
    title: 'Context engineering',
    kind: 'harness',
    whatAdded: 'A typed event brief is assembled from guest count, budget, city, date, setting and preferences.',
    failureMode: 'Missing or stale context causes the model to make assumptions, overlook constraints or ask the user to repeat information.',
    benefit: 'The response becomes specific to this event instead of being generic party-planning advice.',
    maintenance: 'Version the brief schema, validate user edits and distinguish user-provided facts from assumptions.',
  },
  {
    id: 3,
    shortTitle: 'Tools',
    title: 'Tool integration',
    kind: 'harness',
    whatAdded: 'The agent can query a fictional venue catalogue and catering/decor price lists through narrowly scoped tools.',
    failureMode: 'A model may invent venue capacities, availability or prices when it has no trusted source.',
    benefit: 'The agent can ground recommendations in explicit, inspectable data rather than plausible-sounding guesses.',
    maintenance: 'Keep tool schemas small, return source and freshness metadata, handle tool errors and test boundary values.',
  },
  {
    id: 4,
    shortTitle: 'Output contract',
    title: 'Structured outputs and contracts',
    kind: 'harness',
    whatAdded: 'The proposal must conform to a typed plan: line items, subtotal, tax, contingency, total and venue capacity.',
    failureMode: 'Free-form prose is difficult to validate, compare, render or safely pass to the next system.',
    benefit: 'The UI and independent checks can consume predictable fields and explain exactly where the money goes.',
    maintenance: 'Treat the schema as a versioned API. Reject invalid output; do not silently coerce missing required values.',
  },
  {
    id: 5,
    shortTitle: 'State & memory',
    title: 'State and memory',
    kind: 'harness',
    whatAdded: 'The current event brief and accepted decisions are carried forward between chat turns.',
    failureMode: 'Without state, a request such as “make it 60 guests” can lose the original date, budget or preferences.',
    benefit: 'The user can refine a plan conversationally without rebuilding the request every time.',
    maintenance: 'Use explicit state ownership, revisions and schema migrations. Use a durable database for cross-session persistence.',
  },
  {
    id: 6,
    shortTitle: 'Guardrails',
    title: 'Policies and guardrails',
    kind: 'harness',
    whatAdded: 'Deterministic policy checks enforce budget limits, venue capacity and the rule that no booking occurs without approval.',
    failureMode: 'An agent may recommend an over-budget plan or imply it has booked a vendor when no permission was granted.',
    benefit: 'Business rules are enforced in code, not left as polite instructions in a prompt.',
    maintenance: 'Keep policy rules separate from prompts, test every rule and make prohibited side effects impossible by default.',
  },
  {
    id: 7,
    shortTitle: 'Verification',
    title: 'Independent verification',
    kind: 'harness',
    whatAdded: 'A separate verifier recomputes totals and checks budget, capacity, required categories and consent boundaries.',
    failureMode: 'A model-generated assertion such as “the budget is satisfied” is not evidence that the arithmetic is correct.',
    benefit: 'The system can fail closed when evidence does not satisfy a requirement.',
    maintenance: 'Keep verifier logic independent of the planner. Add regression tests for rounding, empty data and edge cases.',
  },
  {
    id: 8,
    shortTitle: 'Feedback loop',
    title: 'Inner loop: plan, check, revise',
    kind: 'loop',
    whatAdded: 'The planner consumes verifier feedback, revises the plan and re-runs checks with a hard iteration limit.',
    failureMode: 'A one-shot agent stops at the first invalid plan; an unbounded agent can spin, repeat itself or burn tokens.',
    benefit: 'The agent improves the plan against explicit constraints and stops only when it passes or must escalate.',
    maintenance: 'Set a maximum attempt count, detect no-progress cycles, record feedback and define escalation conditions.',
  },
  {
    id: 9,
    shortTitle: 'Observability',
    title: 'Observability and traces',
    kind: 'harness',
    whatAdded: 'Each node, tool, check and revision produces a structured activity event with status and duration.',
    failureMode: 'Without traces, engineers cannot tell whether a failure came from context, a tool, policy, a verifier or the model.',
    benefit: 'Participants can inspect what happened, diagnose regressions and measure the cost of each iteration.',
    maintenance: 'Use correlation IDs, redact personal data, retain bounded traces and monitor latency, tool errors and pass rates.',
  },
  {
    id: 10,
    shortTitle: 'Human approval',
    title: 'Human-in-the-loop control',
    kind: 'harness',
    whatAdded: 'The system prepares an approval request and pauses before any real-world commitment.',
    failureMode: 'A recommendation can be mistaken for an authorised booking or purchase.',
    benefit: 'The user retains decision authority at the point where a plan could create an external commitment.',
    maintenance: 'Bind approvals to a plan version, expire stale approvals and make every external action idempotent and auditable.',
  },
  {
    id: 11,
    shortTitle: 'Complete agent',
    title: 'Complete harness + loop system',
    kind: 'complete',
    whatAdded: 'All harness components work together, with a bounded inner loop and an outer evaluation loop for regression testing.',
    failureMode: 'A working demo can degrade as prompts, tools, policies, models or schemas change.',
    benefit: 'The application becomes an engineered system whose quality can be inspected, tested and maintained over time.',
    maintenance: 'Run golden evaluations in CI, compare metrics by version, review trace samples and promote changes only after passing gates.',
  },
];

export function getStage(stage: number): BuildStage {
  return BUILD_STAGES.find((item) => item.id === stage) ?? BUILD_STAGES[0];
}
