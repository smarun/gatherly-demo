# Facilitator guide

## Learning outcomes

By the end of the session, participants should be able to:

- Explain the difference between an LLM prompt and an engineered harness.
- Identify context, tools, state, contracts, policies, verification, traces and human approval.
- Explain the inner plan–verify–revise loop and the outer agent-evaluation loop.
- Find each capability in the project and identify how to test and maintain it.

## Suggested 60–75 minute flow

| Time | Activity | Facilitator prompt |
|---:|---|---|
| 0–5 min | Introduce event brief | “What does a party planner need to know before proposing a plan?” |
| 5–10 min | Stage 1: LLM only | “Would you trust this estimate? What evidence is missing?” |
| 10–20 min | Context, tools, output contract | “Which failures did each building block remove?” |
| 20–30 min | State and guardrails | Change the brief to 60 guests and then ₹44,000. “What should remain unchanged?” |
| 30–40 min | Independent verification | Compare a natural-language claim with a recomputed result. |
| 40–50 min | Inner loop | Watch the ₹61,232 proposal converge to ₹46,824. |
| 50–55 min | Observability and human approval | Inspect the trace and approve the dry run. |
| 55–65 min | Outer evaluation | Run the golden suite and inspect the capacity and unsupported-setting escalations. |
| 65–75 min | Architecture and maintenance | Ask participants where they would change a tool, policy or evaluation scenario. |

## Demo prompts

- “Plan a family-friendly indoor birthday for 40 guests in Bengaluru with a budget of ₹50,000.”
- “Make it 60 guests.” and “Make the event outdoor.”
- “Keep 40 guests but set the budget to ₹44,000.”
- “Make it outdoor and casual.”

The mock catalogue is an indoor-only catalogue. An outdoor request should be treated as a tool/feasibility gap, not as a reason to invent a supplier.

## Teaching tips

- Replay the same scenario after each stage. Avoid changing several variables at once.
- Ask the audience to predict the next failure before enabling the next building block.
- Keep the raw LLM baseline visibly weak; do not let it access tools or the verifier.
- Emphasise that the verifier is deterministic and independent of the model.
- Explain that correct escalation is a successful safety outcome, even though the user did not receive a completed plan.
- When switching to Complete Agent, point to the same modular code paths now connected into one workflow.

## Scope statement

This is a deterministic educational simulation. Supplier listings, prices and capacities are synthetic. The approval button records a dry-run decision; there is no external booking action.
