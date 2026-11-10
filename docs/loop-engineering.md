# Loop engineering

Loop engineering is how we design repeated work so an agent can make progress, react to feedback, stop safely and improve over time. There are two distinct loops in this project.

## 1. Inner loop — runtime problem solving

```text
Understand brief
   ↓
Build candidate plan
   ↓
Run independent verifier
   ↓
Pass? ── yes ──> Ready for human approval
   │
   no
   ↓
Turn failed checks into actionable feedback
   ↓
Revise plan
   ↓
Retry (bounded)
   └───────────────────────────────↺
```

Implementation: `lib/agent/feedback-loop.ts`.

The loop checks the initial proposal first; if it already passes, it stops without spending a revision. It then has four safety properties:

- **Bounded attempts:** `POLICY.maximumRevisionAttempts` limits the number of proposals.
- **Actionable feedback:** the next proposal is informed by verifier results, not simply by “try again”.
- **Progress guard:** a revision that does not reduce the cost is stopped.
- **Escalation:** if capacity or budget cannot be satisfied, the agent reports that a human decision is needed.

For the default scenario, the proposed amounts are:

| Attempt | Subtotal | Tax | Contingency | Total | Outcome |
|---|---:|---:|---:|---:|---|
| Initial premium proposal | ₹53,245 | ₹2,662 | ₹5,325 | ₹61,232 | Over budget |
| Revision 1 | ₹45,000 | ₹2,250 | ₹4,500 | ₹51,750 | Still over budget |
| Revision 2 — standard | ₹40,716 | ₹2,036 | ₹4,072 | ₹46,824 | Verified |

With a ₹44,000 budget, the loop makes one more adjustment and selects a lean plan at ₹43,930. With 60 guests, the available workshop catalogue has no suitable venue; the loop escalates instead of inventing one.

## 2. Outer loop — engineering the agent

The outer loop is not another retry inside the user's event. It is the engineering lifecycle used to improve the application itself:

1. Maintain golden scenarios that represent expected user journeys and failure boundaries.
2. Change a prompt, tool adapter, model, schema, policy or code path.
3. Run all scenarios against the new version.
4. Compare pass rate, cost/estimate quality, iteration count, latency, tool errors and escalation behaviour.
5. Promote only when required quality gates pass; otherwise revise the implementation.

Implementation: `lib/evaluation/scenarios.ts`; executable tests are in `tests/core.test.mjs`.

## Loop metrics to maintain

- **Task success rate:** percentage of scenarios ending in a verified plan or correct escalation.
- **First-pass success:** percentage of cases that pass without revision.
- **After-loop success:** percentage passing after bounded revision.
- **Mean iterations:** average revisions per completed task.
- **Loop exhaustion rate:** percentage reaching the maximum attempt count.
- **No-progress rate:** percentage stopped because the next plan did not improve.
- **False-success rate:** critical metric; a scenario must never be marked successful when a blocking verifier check fails.
- **Escalation precision:** whether genuinely infeasible cases are escalated and feasible cases are not.

## Rules of thumb

- Never loop without a verifier or a measurable stopping condition.
- Do not ask the model to judge whether its own output is correct without independent evidence.
- Make feedback specific: “reduce this cost by this amount” is better than “try again”.
- Keep tool retries distinct from reasoning/revision attempts.
- Record every attempt with its inputs, evidence, checks and outcome.
- A successful loop is not necessarily one that always completes. Correct escalation is a valid outcome.
