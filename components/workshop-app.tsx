'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import type {
  ActivityEvent,
  AgentResult,
  BuildMode,
  EventBrief,
  EvaluationResult,
  VerificationCheck,
} from '../lib/domain.ts';
import { DEFAULT_BRIEF, formatINR } from '../lib/domain.ts';
import { BUILD_STAGES } from '../lib/harness/stages.ts';

type ChatMessage = { role: 'assistant' | 'user'; content: string; id: string };
type RuntimeMode = { live: boolean; model: string | null };

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi! I’m Gatherly. I can help organise an event, compare options and check whether the plan is feasible.\n\nWe’ll use one birthday scenario throughout this workshop: 40 guests, indoors, in Bengaluru, with a ₹50,000 budget. Try the sample request or change a constraint in the chat.',
};

const SAMPLE_PROMPT = 'Plan a family-friendly indoor birthday for 40 guests in Bengaluru with a budget of ₹50,000.';

function Icon({ name }: { name: 'spark' | 'send' | 'refresh' | 'check' | 'lock' | 'chevron' | 'calendar' | 'users' | 'wallet' | 'activity' | 'layers' | 'book' | 'play' }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const shapes: Record<string, ReactNode> = {
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 1M4 17l2 1a7 7 0 0 0 12.4-3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18M16 15h2"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22Z"/><path d="M4 4.5V22M8 6h8"/></>,
    play: <path d="m8 5 12 7-12 7V5Z"/>,
  };
  return <svg {...common} aria-hidden="true">{shapes[name]}</svg>;
}

function StatusDot({ status }: { status: 'done' | 'warning' | 'blocked' | 'pending' | 'passed' | 'failed' }) {
  return <span className={`status-dot status-${status}`} aria-hidden="true" />;
}

function StageGlyph({ kind }: { kind: string }) {
  if (kind === 'baseline') return <span className="stage-glyph glyph-baseline">01</span>;
  if (kind === 'loop') return <span className="stage-glyph glyph-loop">↻</span>;
  if (kind === 'complete') return <span className="stage-glyph glyph-complete">✦</span>;
  return <span className="stage-glyph glyph-harness">+</span>;
}

function BudgetMeter({ total, budget }: { total: number | null; budget: number }) {
  if (total === null) {
    return <div className="budget-meter-empty"><span>Awaiting a structured plan</span><span>—</span></div>;
  }
  const percentage = Math.min(100, (total / Math.max(1, budget)) * 100);
  const over = total > budget;
  return (
    <div className="budget-meter-wrap">
      <div className="budget-meter-labels"><strong>{formatINR(total)}</strong><span>{formatINR(budget)} limit</span></div>
      <div className="budget-track"><div className={`budget-fill ${over ? 'over' : ''}`} style={{ width: `${percentage}%` }} /></div>
      <div className={`budget-delta ${over ? 'negative' : 'positive'}`}>
        {over ? `${formatINR(total - budget)} over budget` : `${formatINR(budget - total)} remaining`}
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: VerificationCheck }) {
  return (
    <div className="check-row">
      <StatusDot status={check.passed ? 'passed' : 'failed'} />
      <div className="check-copy"><strong>{check.label}</strong><span>{check.detail}</span></div>
      <span className={`check-label ${check.passed ? 'ok' : 'fail'}`}>{check.passed ? 'PASS' : 'FAIL'}</span>
    </div>
  );
}

function ActivityRow({ item, index }: { item: ActivityEvent; index: number }) {
  return (
    <div className="activity-row">
      <div className="activity-track"><StatusDot status={item.status} /><span className="activity-line" /></div>
      <div className="activity-copy"><div><strong>{item.node.replaceAll('_', ' ')}</strong><span>{item.elapsedMs} ms</span></div><p>{item.detail}</p></div>
    </div>
  );
}

function EvaluationCards({ results }: { results: EvaluationResult[] }) {
  return (
    <div className="evaluation-list">
      {results.map((item) => (
        <div className="evaluation-card" key={item.name}>
          <div className="evaluation-card-head"><div><strong>{item.name}</strong><span>{item.description}</span></div><span className={`evaluation-pill ${item.passed ? 'ok' : 'fail'}`}>{item.passed ? 'PASS' : 'FAIL'}</span></div>
          <div className="evaluation-meta"><span>{item.total === null ? 'No final total' : formatINR(item.total)}</span><span>Budget {formatINR(item.budget)}</span></div>
          <p>{item.outcome}</p>
        </div>
      ))}
    </div>
  );
}

export default function WorkshopApp() {
  const [mode, setMode] = useState<BuildMode>('progressive');
  const [stage, setStage] = useState(1);
  const [brief, setBrief] = useState<EventBrief>({ ...DEFAULT_BRIEF, dietaryNeeds: [...DEFAULT_BRIEF.dietaryNeeds] });
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AgentResult | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>({ live: false, model: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStage = BUILD_STAGES.find((item) => item.id === (mode === 'complete' ? 11 : stage)) ?? BUILD_STAGES[0];
  const displayedStage = mode === 'complete' ? 11 : stage;
  const plan = result?.plan ?? null;
  const checks = result?.checks ?? [];
  const activities = result?.activities ?? [];
  const progress = (displayedStage / 11) * 100;
  const latestEvaluation = result?.evaluationResults;

  const stageGroup = useMemo(() => BUILD_STAGES.reduce((acc, item) => {
    const key = item.kind === 'baseline' ? 'Baseline' : item.kind === 'loop' ? 'Loop engineering' : item.kind === 'complete' ? 'Integrated system' : 'Harness engineering';
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {} as Record<string, typeof BUILD_STAGES>), []);

  async function callAgent(message: string, action: 'chat' | 'approve' | 'evaluate' = 'chat', replaceThread = false, briefOverride?: EventBrief) {
    const activeBrief = briefOverride ?? brief;
    setLoading(true);
    setError(null);
    if (action === 'chat') {
      const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: message };
      setMessages((previous) => replaceThread ? [WELCOME, userMessage] : [...previous, userMessage]);
    }
    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, stage: displayedStage, message, brief: activeBrief, action, plan: result?.plan ?? null, checks: result?.checks ?? [] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'The agent request failed.');
      const next = payload as AgentResult & { runtimeMode?: RuntimeMode };
      if ((action === 'approve' || action === 'evaluate') && result) {
        setResult({
          ...result,
          status: action === 'approve' ? next.status : result.status,
          approvalMessage: action === 'approve' ? next.approvalMessage : result.approvalMessage,
          reply: action === 'approve' ? next.reply : result.reply,
          checks: action === 'approve' ? next.checks : result.checks,
          activities: action === 'approve' ? [...result.activities, ...next.activities] : [...result.activities, ...next.activities],
          evaluationResults: action === 'evaluate' ? next.evaluationResults : result.evaluationResults,
        });
      } else {
        setResult(next);
      }
      setBrief(next.brief ?? brief);
      if (next.runtimeMode) setRuntimeMode(next.runtimeMode);
      if (action === 'chat') {
        setMessages((previous) => [...previous, { id: `a-${Date.now()}`, role: 'assistant', content: next.reply }]);
      }
    } catch (caught) {
      const messageText = caught instanceof Error ? caught.message : 'Something went wrong.';
      setError(messageText);
      if (action === 'chat') setMessages((previous) => [...previous, { id: `e-${Date.now()}`, role: 'assistant', content: `I could not complete that request: ${messageText}` }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    void callAgent(trimmed);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  }

  function chooseStage(nextStage: number) {
    setMode('progressive');
    setStage(nextStage);
    setResult(null);
    setError(null);
  }

  function switchMode(nextMode: BuildMode) {
    setMode(nextMode);
    if (nextMode === 'complete') setStage(11);
    else setStage(1);
    setResult(null);
    setError(null);
  }

  function replayScenario() {
    void callAgent(SAMPLE_PROMPT, 'chat', true, { ...DEFAULT_BRIEF, dietaryNeeds: [...DEFAULT_BRIEF.dietaryNeeds] });
  }

  function resetWorkshop() {
    setBrief({ ...DEFAULT_BRIEF, dietaryNeeds: [...DEFAULT_BRIEF.dietaryNeeds] });
    setMessages([WELCOME]);
    setResult(null);
    setError(null);
    setInput('');
    setMode('progressive');
    setStage(1);
  }

  const handleApproval = () => void callAgent('Approve this plan as a workshop dry run.', 'approve');
  const runEvaluation = () => void callAgent('Run the outer evaluation suite.', 'evaluate');

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="spark" /></div>
          <div><div className="brand-name">gatherly</div><div className="brand-caption">AGENT ENGINEERING LAB</div></div>
        </div>

        <div className="sidebar-section mode-section">
          <span className="sidebar-label">WORKSHOP MODE</span>
          <div className="mode-switch">
            <button className={mode === 'progressive' ? 'active' : ''} onClick={() => switchMode('progressive')}>Progressive build</button>
            <button className={mode === 'complete' ? 'active' : ''} onClick={() => switchMode('complete')}>Complete agent</button>
          </div>
        </div>

        <div className="sidebar-section stage-section">
          <div className="section-heading"><span className="sidebar-label">BUILD THE AGENT</span><span className="stage-count">{displayedStage}/11</span></div>
          <div className="stage-progress"><span style={{ width: `${progress}%` }} /></div>
          {Object.entries(stageGroup).map(([groupName, items]) => (
            <div className="stage-group" key={groupName}>
              <span className="stage-group-label">{groupName}</span>
              {items.map((item) => (
                <button
                  className={`stage-nav-item ${displayedStage === item.id ? 'selected' : ''} ${item.id < displayedStage ? 'completed' : ''}`}
                  key={item.id}
                  onClick={() => chooseStage(item.id)}
                  disabled={loading}
                >
                  <StageGlyph kind={item.kind} />
                  <span className="stage-nav-copy"><strong>{item.id.toString().padStart(2, '0')} · {item.shortTitle}</strong><small>{item.title}</small></span>
                  {item.id < displayedStage && <span className="stage-complete-mark"><Icon name="check" /></span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="runtime-indicator"><span className={`runtime-dot ${runtimeMode.live ? 'live' : ''}`} /><div><strong>{runtimeMode.live ? 'Live model connected' : 'Deterministic demo mode'}</strong><small>{runtimeMode.live ? runtimeMode.model : 'No API key required'}</small></div></div>
          <button className="reset-link" onClick={resetWorkshop}><Icon name="refresh" /> Reset workshop</button>
        </div>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div className="breadcrumb"><span>Workshop</span><Icon name="chevron" /><strong>{mode === 'complete' ? 'Complete agent' : 'Progressive build'}</strong></div>
          <div className="topbar-actions"><nav className="topbar-nav"><Link href="/architecture">Architecture</Link><Link href="/maintenance">Maintenance guide</Link></nav><span className="safe-mode-pill"><Icon name="lock" /> Dry-run only</span><span className="topbar-divider" /><span className="avatar">G</span></div>
        </header>

        <div className="main-content">
          <div className="page-intro">
            <div className="eyebrow"><span className="eyebrow-line" /> HARNESS ENGINEERING · LOOP ENGINEERING</div>
            <div className="intro-row"><div><h1>{mode === 'complete' ? 'The complete event agent.' : currentStage.title + '.'}</h1><p>{mode === 'complete' ? 'All building blocks working together, from context assembly to verified planning and human approval.' : currentStage.whatAdded}</p></div><button className="run-sample-button" onClick={replayScenario} disabled={loading}><Icon name="play" /> Run same scenario</button></div>
          </div>

          <div className="workspace-grid">
            <section className="chat-card panel">
              <div className="chat-card-header"><div className="agent-identity"><div className="agent-avatar"><Icon name="spark" /></div><div><strong>Gatherly assistant</strong><span><i /> {loading ? 'Working through the request' : 'Ready to plan with you'}</span></div></div><div className="chat-stage-tag">STAGE {displayedStage.toString().padStart(2, '0')}</div></div>

              <div className="stage-explainer">
                <div className="stage-explainer-top"><div><span className="concept-kicker">CURRENT BUILDING BLOCK</span><h2>{currentStage.title}</h2></div><span className={`concept-type ${currentStage.kind}`}>{currentStage.kind === 'baseline' ? 'BASELINE' : currentStage.kind === 'loop' ? 'LOOP' : currentStage.kind === 'complete' ? 'INTEGRATED' : 'HARNESS'}</span></div>
                <p>{currentStage.failureMode}</p>
              </div>

              <div className="chat-thread" aria-live="polite">
                {messages.map((message) => (
                  <div className={`message-row ${message.role}`} key={message.id}>
                    {message.role === 'assistant' && <div className="message-avatar"><Icon name="spark" /></div>}
                    <div className={`message-bubble ${message.role}`}><span className="message-author">{message.role === 'assistant' ? 'GATHERLY' : 'YOU'}</span><p>{message.content}</p></div>
                  </div>
                ))}
                {loading && <div className="message-row assistant"><div className="message-avatar"><Icon name="spark" /></div><div className="message-bubble assistant loading-bubble"><span className="loading-dots"><i /><i /><i /></span><span>Working through the plan…</span></div></div>}
                {error && <div className="inline-error">{error}</div>}
              </div>

              <div className="chat-suggestions"><span>TRY ASKING</span><button onClick={() => setInput('Make it 60 guests.')}>Make it 60 guests</button><button onClick={() => setInput('Set the budget to ₹44,000.')}>Reduce budget to ₹44,000</button><button onClick={() => setInput('Make the event outdoor and casual.')}>Change the setting</button></div>
              <form className="composer" onSubmit={onSubmit}>
                <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onInputKeyDown} placeholder="Tell Gatherly what you need or what should change…" rows={2} maxLength={2000} disabled={loading} />
                <div className="composer-footer"><span>Enter to send · Shift + Enter for a new line</span><button type="submit" disabled={!input.trim() || loading} aria-label="Send message"><Icon name="send" /></button></div>
              </form>
            </section>

            <aside className="insight-column">
              <section className="panel brief-panel">
                <div className="panel-heading"><div><span className="panel-kicker">YOUR EVENT</span><h3>Event brief</h3></div><span className="revision-chip">REV {brief.revision}</span></div>
                <div className="event-name">{brief.eventName}</div>
                <div className="brief-facts"><div><Icon name="users" /><span>{brief.guestCount} guests</span></div><div><Icon name="wallet" /><span>{formatINR(brief.budget)} budget</span></div><div><Icon name="calendar" /><span>{brief.date}</span></div></div>
                <div className="brief-tags"><span>{brief.setting}</span><span>{brief.atmosphere}</span><span>{brief.city}</span></div>
              </section>

              <section className="panel budget-panel">
                <div className="panel-heading"><div><span className="panel-kicker">FINANCIAL CONTROL</span><h3>Budget health</h3></div><Icon name="wallet" /></div>
                <BudgetMeter total={plan?.total ?? result?.metrics.estimatedTotal ?? null} budget={brief.budget} />
                {result?.metrics.estimatedTotal !== null && result?.metrics.estimatedTotal !== undefined && !plan && <p className="unverified-note">Unverified model estimate — tax, contingency and supplier prices are not checked.</p>}
                {plan && <div className="cost-breakdown"><div><span>Subtotal</span><strong>{formatINR(plan.subtotal)}</strong></div><div><span>Tax (5%)</span><strong>{formatINR(plan.tax)}</strong></div><div><span>Contingency (10%)</span><strong>{formatINR(plan.contingency)}</strong></div><div className="cost-total"><span>Verified total</span><strong>{formatINR(plan.total)}</strong></div></div>}
              </section>

              {plan && <section className="panel plan-panel"><div className="panel-heading"><div><span className="panel-kicker">PROPOSAL V{plan.version}</span><h3>{plan.optimizationLabel}</h3></div><span className="plan-count">{plan.items.length} ITEMS</span></div><div className="plan-venue"><strong>{plan.venueName}</strong><span>Capacity {plan.venueCapacity} guests</span></div><div className="plan-items">{plan.items.map((item) => <div className="plan-item" key={item.id}><div><strong>{item.label}</strong><span>{item.category}</span></div><b>{formatINR(item.amount)}</b></div>)}</div></section>}

              {result?.toolResults.length ? <section className="panel tool-panel"><div className="panel-heading"><div><span className="panel-kicker">GROUNDING</span><h3>Tool results</h3></div><span className="tool-count">{result.toolResults.length}</span></div>{result.toolResults.map((tool, index) => <div className="tool-result" key={`${tool.tool}-${index}`}><strong>{tool.tool}</strong><span>{tool.result}</span></div>)}</section> : null}

              {checks.length > 0 && <section className="panel checks-panel"><div className="panel-heading"><div><span className="panel-kicker">INDEPENDENT CONTROL</span><h3>Verification checks</h3></div><span className={`checks-summary ${checks.every((check) => check.passed) ? 'all-pass' : 'has-fail'}`}>{checks.filter((check) => check.passed).length}/{checks.length}</span></div><div className="check-list">{checks.map((check) => <CheckRow check={check} key={check.id} />)}</div></section>}

              {result?.iterations.length ? <section className="panel iterations-panel"><div className="panel-heading"><div><span className="panel-kicker">INNER FEEDBACK LOOP</span><h3>Revision history</h3></div><span className="iteration-count">{result.iterations.length} PASSES</span></div>{result.iterations.map((iteration) => <div className="iteration-row" key={iteration.attempt}><div className="iteration-number">{iteration.attempt}</div><div className="iteration-copy"><strong>{iteration.label}</strong><span>{formatINR(iteration.total)} · {iteration.passed ? 'Verified' : 'Needs revision'}</span><p>{iteration.feedback}</p></div><StatusDot status={iteration.passed ? 'passed' : 'warning'} /></div>)}</section> : null}

              {activities.length > 0 && <section className="panel trace-panel"><div className="panel-heading"><div><span className="panel-kicker">EXECUTION TRACE</span><h3>Agent activity</h3></div><Icon name="activity" /></div><div className="activity-list">{activities.map((item, index) => <ActivityRow item={item} index={index} key={item.id} />)}</div></section>}

              {result?.approvalMessage && <section className="panel approval-panel"><div className="approval-heading"><div className="approval-icon"><Icon name="lock" /></div><div><span className="panel-kicker">HUMAN CONTROL</span><h3>{result.status === 'approved' ? 'Dry-run approved' : 'Approval required'}</h3></div></div><p>{result.approvalMessage}</p>{result.status === 'needs-approval' && <button className="approve-button" onClick={handleApproval} disabled={loading}><Icon name="check" /> Approve dry run</button>}{result.status === 'approved' && <div className="approval-confirmed"><Icon name="check" /> Approval recorded · no booking made</div>}</section>}

              {latestEvaluation && <section className="panel evaluation-panel"><div className="panel-heading"><div><span className="panel-kicker">OUTER LOOP</span><h3>Evaluation suite</h3></div><span className="checks-summary all-pass">{latestEvaluation.filter((item) => item.passed).length}/{latestEvaluation.length}</span></div><EvaluationCards results={latestEvaluation} /></section>}

              <section className="panel teaching-panel"><div className="panel-heading"><div><span className="panel-kicker">ENGINEERING TAKEAWAY</span><h3>Why this matters</h3></div><Icon name="book" /></div><p>{currentStage.benefit}</p><div className="maintenance-note"><strong>How to maintain it</strong><span>{currentStage.maintenance}</span></div></section>
            </aside>
          </div>

          <div className="bottom-toolbar"><div className="bottom-left"><span className="bottom-indicator" /> <span>{mode === 'complete' ? 'Complete agent mode' : `Progressive build · Stage ${displayedStage} of 11`}</span></div><div className="bottom-actions"><button className="subtle-button" onClick={runEvaluation} disabled={loading || displayedStage < 11} title={displayedStage < 11 ? 'Unlock the outer evaluation loop at Stage 11' : 'Run golden evaluation scenarios'}><Icon name="activity" /> Run outer evaluation</button>{mode === 'progressive' && <button className="next-stage-button" onClick={() => chooseStage(Math.min(11, stage + 1))} disabled={loading || stage === 11}>Next building block <Icon name="chevron" /></button>}</div></div>
        </div>
      </section>
    </main>
  );
}
