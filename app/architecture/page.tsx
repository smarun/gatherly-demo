import DocsFrame from '../../components/docs-frame';

export default function ArchitecturePage() {
  return (
    <DocsFrame
      eyebrow="PROJECT GUIDE / 01"
      title="How Gatherly is put together."
      intro="Follow one chat message from the browser through the harness, inner loop and back to the user. Each component has one clear responsibility so the system can be inspected and maintained."
    >
      <section className="docs-section">
        <h2>System architecture</h2>
        <div className="architecture-flow">
          <div className="flow-node flow-client"><span>01 · CLIENT</span><strong>Chat workspace</strong><p>Owns the active UI session and current event brief.</p></div>
          <div className="flow-arrow">↓ request · response ↑</div>
          <div className="flow-node flow-api"><span>02 · ENTRY POINT</span><strong>Next.js API route</strong><p>Validates input, bounds request size and calls the agent orchestrator.</p></div>
          <div className="flow-arrow">↓</div>
          <div className="flow-node flow-orchestrator"><span>03 · ORCHESTRATION</span><strong>Agent state machine</strong><p>Chooses which capabilities are enabled at the selected progressive-build stage.</p></div>
          <div className="flow-split">
            <div className="flow-node"><span>HARNESS</span><strong>Context + tools</strong><p>Event brief, venue catalogue and vendor prices.</p></div>
            <div className="flow-node"><span>CONTROL</span><strong>Policies + verifier</strong><p>Budget, capacity, arithmetic and permission checks.</p></div>
          </div>
          <div className="flow-arrow">↓ failed checks feed back</div>
          <div className="flow-node flow-loop"><span>04 · INNER LOOP</span><strong>Plan → verify → revise</strong><p>Bounded retries, no-progress protection and escalation.</p></div>
          <div className="flow-arrow">↓ pass</div>
          <div className="flow-node flow-human"><span>05 · HUMAN CONTROL</span><strong>Approval gate</strong><p>Records a dry-run approval. No external booking is enabled.</p></div>
        </div>
      </section>

      <section className="docs-section">
        <h2>Where each responsibility lives</h2>
        <div className="file-map">
          {[
            ['app/api/agent/route.ts', 'Request boundary', 'Validates payloads and exposes the agent as an HTTP endpoint.'],
            ['lib/domain.ts', 'Contracts', 'Typed event brief, plan, checks, trace and response schema.'],
            ['lib/harness/stages.ts', 'Progressive teaching configuration', 'Defines the 11 capabilities and what each stage teaches.'],
            ['lib/harness/tools.ts', 'Tool adapters', 'Read-only catalogue lookups for synthetic venues and vendors.'],
            ['lib/harness/policies.ts', 'Guardrails', 'Enforces budget, capacity and side-effect policy.'],
            ['lib/harness/verifier.ts', 'Independent verification', 'Recomputes arithmetic and checks the plan independently.'],
            ['lib/agent/plans.ts', 'Planner', 'Builds the itemised proposal and computes deterministic amounts.'],
            ['lib/agent/feedback-loop.ts', 'Inner loop', 'Uses verifier feedback to choose revisions and stop safely.'],
            ['lib/agent/run-agent.ts', 'Orchestrator', 'Connects the stage-specific harness components.'],
            ['lib/evaluation/scenarios.ts', 'Outer loop', 'Runs golden scenarios to detect regressions in the agent.'],
            ['lib/llm.ts', 'Optional model adapter', 'Rephrases deterministic results; cannot override calculations or controls.'],
          ].map(([file, title, detail]) => (
            <div className="file-map-row" key={file}><code>{file}</code><div><strong>{title}</strong><p>{detail}</p></div></div>
          ))}
        </div>
      </section>

      <section className="docs-section docs-callout">
        <h2>Why not keep the old Python notebook / LangGraph runtime?</h2>
        <p>The Vercel version uses an explicit TypeScript state machine. Serverless functions are independent invocations; server process memory is not a reliable persistent checkpoint. For this workshop, the browser sends the current event brief with every turn. A production multi-device application should persist state and approvals in a database.</p>
        <p>The important teaching point is not a particular graph library. It is that orchestration, state, tool contracts, policies, verification, observability and evaluation must be explicit and independently maintainable.</p>
      </section>

      <section className="docs-section">
        <h2>Two loops, two different jobs</h2>
        <div className="two-loop-cards">
          <div><span className="loop-chip inner">INNER LOOP</span><h3>Solve the user's task</h3><p>Build candidate → verify → feed back exact failure → revise → stop or escalate.</p><code>lib/agent/feedback-loop.ts</code></div>
          <div><span className="loop-chip outer">OUTER LOOP</span><h3>Improve the agent</h3><p>Change prompt/tool/policy/code → run golden evaluations → compare metrics → release or revise.</p><code>lib/evaluation/scenarios.ts</code></div>
        </div>
      </section>
    </DocsFrame>
  );
}
