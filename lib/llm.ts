import type { AgentResult } from './domain.ts';
import { formatINR } from './domain.ts';

function extractText(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const output = (payload as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }).output;
  if (!Array.isArray(output)) return null;
  const chunks: string[] = [];
  for (const item of output) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim() || null;
}

/** Optional narrative adapter. Policy checks, calculations and approval remain deterministic. */
export async function maybeGenerateNarrative(result: AgentResult, userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const liveEnabled = process.env.AI_MODE === 'live';
  if (!apiKey || !liveEnabled) return result.reply;

  const model = process.env.OPENAI_MODEL || 'gpt-6-astra';
  const summary = {
    stage: result.stage,
    stageTitle: result.stageTitle,
    event: {
      guests: result.brief.guestCount,
      budget: result.brief.budget,
      city: result.brief.city,
      setting: result.brief.setting,
    },
    plan: result.plan ? {
      venue: result.plan.venueName,
      items: result.plan.items.map((item) => ({ name: item.label, amount: item.amount })),
      subtotal: result.plan.subtotal,
      tax: result.plan.tax,
      contingency: result.plan.contingency,
      total: result.plan.total,
    } : null,
    checks: result.checks,
    iterations: result.iterations,
    status: result.status,
    deterministicReply: result.reply,
  };

  const instructions = result.stage === 1
    ? 'You are a friendly event-planning assistant. Give a quick, informal first-pass estimate based only on the user request. Do not claim to have checked suppliers, taxes, capacity or availability. This is the intentionally unengineered baseline.'
    : 'You are the conversational layer of Gatherly. Explain only the supplied deterministic agent result. Do not change prices, calculations, checks, policies or status. Do not claim to book or contact anyone. Be clear, friendly and concise. The supplied verifier and policy results are authoritative.';

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions,
        input: `User message: ${userMessage}\n\nAgent result (authoritative data): ${JSON.stringify(summary)}\n\nRespond to the user. Keep all currency values exactly as supplied.`,
        max_output_tokens: 550,
        store: false,
      }),
      signal: AbortSignal.timeout(18_000),
    });
    if (!response.ok) return result.reply;
    const payload: unknown = await response.json();
    return extractText(payload) ?? result.reply;
  } catch {
    return result.reply;
  }
}

export function getRuntimeMode(): { live: boolean; model: string | null } {
  const live = process.env.AI_MODE === 'live' && Boolean(process.env.OPENAI_API_KEY);
  return { live, model: live ? (process.env.OPENAI_MODEL || 'gpt-6-astra') : null };
}
