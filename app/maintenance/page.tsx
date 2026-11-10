import Link from 'next/link';
import DocsFrame from '../../components/docs-frame';

export default function MaintenancePage() {
  return (
    <DocsFrame
      eyebrow="PROJECT GUIDE / 02"
      title="Keep the harness healthy. Keep the loops useful."
      intro="The agent is not finished when the demo works. This guide shows where to make changes, what evidence to preserve and which regression checks should gate a release."
    >
      <section className="docs-section">
        <h2>Maintenance ownership map</h2>
        <div className="maintenance-table-wrap"><table className="maintenance-table"><thead><tr><th>Change you need</th><th>Update</th><th>Always test</th></tr></thead><tbody>
          <tr><td>Add a new user preference</td><td><code>domain.ts</code>, context parsing</td><td>State preservation and schema validation</td></tr>
          <tr><td>Add venue/vendor sources</td><td><code>harness/tools.ts</code></td><td>No result, stale data, timeout and capacity boundaries</td></tr>
          <tr><td>Change cost calculations</td><td><code>agent/plans.ts</code>, <code>harness/verifier.ts</code></td><td>Tax rounding, contingency and exact-budget boundaries</td></tr>
          <tr><td>Change permissions</td><td><code>harness/policies.ts</code>, approval handler</td><td>Deny-by-default, stale approval, no side-effect guarantee</td></tr>
          <tr><td>Change revision strategy</td><td><code>agent/feedback-loop.ts</code></td><td>Max attempts, no progress, success and escalation</td></tr>
          <tr><td>Change model/provider</td><td><code>lib/llm.ts</code>, env vars</td><td>Timeout, fallback and factual values unchanged</td></tr>
          <tr><td>Change success criteria</td><td><code>evaluation/scenarios.ts</code></td><td>All golden scenarios and CI gate</td></tr>
        </tbody></table></div>
      </section>

      <section className="docs-section">
        <h2>Harness maintenance checklist</h2>
        <div className="maintenance-checklist">
          {[
            ['Context', 'Version the brief schema. Validate inputs and label assumptions. Track revisions so a plan can be tied to the facts used to create it.'],
            ['Tools', 'Keep tool inputs narrow and typed. Preserve source/freshness metadata. Add timeouts and retry only safe, idempotent reads.'],
            ['Contracts', 'Treat plan/tool output as versioned APIs. Reject invalid data rather than silently coercing missing fields.'],
            ['Policies', 'Keep rules in code, not only in prompts. Default external side effects to disabled and require explicit authorisation.'],
            ['Verification', 'Keep the verifier independent from the planner. Fail closed when any blocking check cannot be evaluated.'],
            ['Observability', 'Record request ID, stage, config/model version, tool outcomes, durations, checks, iterations and final status. Redact PII.'],
            ['State', 'This sample keeps session state in the browser. Use tenant-scoped durable storage for cross-device or long-lived workflows.'],
          ].map(([title, text]) => <div className="checklist-item" key={title}><span className="checklist-icon">✓</span><div><strong>{title}</strong><p>{text}</p></div></div>)}
        </div>
      </section>

      <section className="docs-section">
        <h2>Loop engineering: metrics that matter</h2>
        <div className="metric-grid">
          {[
            ['Task success rate', 'Verified plans plus correct escalations / all golden cases.'],
            ['First-pass success', 'Cases that pass without a revision.'],
            ['After-loop success', 'Cases that pass after bounded revisions.'],
            ['Mean iterations', 'Average number of revision attempts per run.'],
            ['Loop exhaustion', 'Runs that reach the maximum attempt count.'],
            ['No-progress rate', 'Runs stopped because the next revision did not improve.'],
            ['False-success rate', 'Must remain zero: never report success with a blocking failure.'],
            ['Escalation precision', 'Escalate truly infeasible cases without rejecting feasible ones.'],
          ].map(([title, text]) => <div className="metric-card" key={title}><strong>{title}</strong><p>{text}</p></div>)}
        </div>
      </section>

      <section className="docs-section docs-callout">
        <h2>Production hardening: before connecting real vendors</h2>
        <ol>
          <li>Add authentication and tenant-level data isolation.</li>
          <li>Persist event state, plan revisions, traces and approvals in a database.</li>
          <li>Add rate limits, request budgets and secret management.</li>
          <li>Replace synthetic catalogues with trusted APIs and freshness checks.</li>
          <li>Use durable, version-bound approvals and a separately authorised booking worker.</li>
          <li>Add dashboards and alerts for regression, loop exhaustion and tool health.</li>
        </ol>
      </section>

      <section className="docs-section resource-card">
        <div><span className="loop-chip outer">NEXT STEP</span><h2>Read the architecture first</h2><p>Trace a chat request through the browser, API route, harness, inner loop and approval boundary.</p></div>
        <Link href="/architecture">Open architecture guide →</Link>
      </section>
    </DocsFrame>
  );
}
