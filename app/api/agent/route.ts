import { NextResponse } from 'next/server';
import type { AgentRequest } from '../../../lib/domain.ts';
import { DEFAULT_BRIEF } from '../../../lib/domain.ts';
import { runAgent } from '../../../lib/agent/run-agent.ts';
import { getRuntimeMode, maybeGenerateNarrative } from '../../../lib/llm.ts';
import { isEventPlan, sanitizeBrief } from '../../../lib/request-validation.ts';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }
    const body = parsed as Partial<AgentRequest> & { brief?: unknown; plan?: unknown };
    if (typeof body.message !== 'string' || body.message.length > 2_000) {
      return NextResponse.json({ error: 'Message must be a string of at most 2,000 characters.' }, { status: 400 });
    }
    if (body.action !== 'approve' && body.action !== 'evaluate' && body.action !== 'chat' && body.action !== undefined) {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }
    const brief = sanitizeBrief(body.brief ?? DEFAULT_BRIEF);
    const requestData: AgentRequest = {
      mode: body.mode === 'complete' ? 'complete' : 'progressive',
      stage: typeof body.stage === 'number' && Number.isInteger(body.stage) ? Math.max(1, Math.min(11, body.stage)) : 1,
      message: body.message,
      brief,
      action: body.action ?? 'chat',
      plan: isEventPlan(body.plan) ? body.plan : null,
      checks: [],
    };
    const result = runAgent(requestData);
    if (requestData.action === 'chat') {
      result.reply = await maybeGenerateNarrative(result, requestData.message);
    }
    return NextResponse.json({ ...result, runtimeMode: getRuntimeMode() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
