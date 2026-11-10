# Maintaining the harness

Harness engineering is the discipline of building and maintaining the operating environment around the model. In Gatherly, the harness includes context assembly, tool adapters, typed contracts, state handling, policies, verification, observability and human approval.

## Change map

| When you need to… | Change this module | Then update these tests |
|---|---|---|
| Add a new event preference | `lib/domain.ts` and `run-agent.ts` context parsing | State/context tests and one golden scenario |
| Add a venue or vendor source | `lib/harness/tools.ts` | Tool schema, no-result, timeout and capacity tests |
| Add a new plan field | `lib/domain.ts`, `lib/agent/plans.ts` | Contract validation and verifier tests |
| Change taxes or contingency | `lib/harness/policies.ts`, `lib/agent/plans.ts`, `lib/harness/verifier.ts` | Rounding, boundary and budget tests |
| Change booking permissions | `lib/harness/policies.ts` and approval handling | Deny-by-default and stale-approval tests |
| Change what the UI displays per stage | `lib/harness/stages.ts` | Stage-specific smoke tests |
| Change the provider/model | `lib/llm.ts` and environment variables | Fallback, timeout and output extraction tests |

## Maintenance checklist

### Context and state

- Keep `EventBrief` typed and validated at the API boundary.
- Track an explicit revision number so the UI and approval refer to a known plan version.
- Do not infer unprovided facts as if they were confirmed. Label defaults and assumptions.
- The workshop keeps state in the browser. For production, store conversations, event state and approvals in a durable database with user/tenant scoping.

### Tools

- Keep tool inputs and outputs narrow and typed.
- Preserve source, timestamp and freshness metadata when tools connect to real systems.
- Add timeouts, retries only for safe/idempotent reads, and explicit error states.
- Never allow a model to turn arbitrary user text into an unrestricted network or payment action.

### Structured contracts

- Treat plan and tool shapes as versioned interfaces.
- Validate at the boundary, reject malformed outputs and surface a useful error.
- Add an explicit migration when changing stored state schemas.
- Do not use the LLM to calculate totals; use deterministic code for arithmetic.

### Guardrails and permissions

- Keep policies outside the model prompt.
- Default external side effects to disabled.
- Require a human decision for consequential actions.
- Bind approval to a specific plan revision and expire approval when that plan changes.
- For production booking integrations, use server-side authorization, idempotency keys, audit records and compensation/cancellation workflows.

### Verification

- Keep the verifier independently implemented from the planner.
- Verify arithmetic from line items, not model-supplied totals.
- Add edge cases for zero guests, max capacity, rounding boundaries, missing suppliers and budget exactly equal to total.
- Fail closed when a blocking check cannot be evaluated.

### Observability

- Attach a request/correlation ID to each run.
- Record stage, model, prompt/config version, tool calls, durations, retries, verifier failures and final status.
- Redact personal details and secrets before storing traces.
- Track latency, error rate, tool failures, cost, iterations per task and first-pass/after-loop pass rates.

## Production hardening priorities

1. Add authentication and tenant-level data isolation.
2. Persist event state, traces and plan revisions in a database.
3. Add rate limits and request budgets.
4. Replace synthetic catalogue adapters with trusted APIs and freshness controls.
5. Use durable approval records and a separately permissioned booking worker.
6. Add dashboards and alerts for evaluation regressions, loop exhaustion and tool health.
