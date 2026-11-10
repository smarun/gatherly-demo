import type { EventBrief, EventPlan } from './domain.ts';
import { DEFAULT_BRIEF } from './domain.ts';

function boundedText(value: unknown, fallback: string, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback;
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

export function sanitizeBrief(value: unknown): EventBrief {
  if (!value || typeof value !== 'object') return { ...DEFAULT_BRIEF, dietaryNeeds: [...DEFAULT_BRIEF.dietaryNeeds] };
  const raw = value as Record<string, unknown>;
  const eventTypes: EventBrief['eventType'][] = ['Birthday', 'Anniversary', 'Family gathering', 'Team celebration'];
  const settings: EventBrief['setting'][] = ['Indoor', 'Outdoor'];
  const atmospheres: EventBrief['atmosphere'][] = ['Family-friendly', 'Formal', 'Casual'];
  const eventType = eventTypes.includes(raw.eventType as EventBrief['eventType']) ? raw.eventType as EventBrief['eventType'] : DEFAULT_BRIEF.eventType;
  const setting = settings.includes(raw.setting as EventBrief['setting']) ? raw.setting as EventBrief['setting'] : DEFAULT_BRIEF.setting;
  const atmosphere = atmospheres.includes(raw.atmosphere as EventBrief['atmosphere']) ? raw.atmosphere as EventBrief['atmosphere'] : DEFAULT_BRIEF.atmosphere;
  const dietaryNeeds = Array.isArray(raw.dietaryNeeds)
    ? raw.dietaryNeeds.filter((item): item is string => typeof item === 'string').slice(0, 10).map((item) => item.slice(0, 80))
    : [...DEFAULT_BRIEF.dietaryNeeds];
  return {
    eventName: boundedText(raw.eventName, DEFAULT_BRIEF.eventName, 120),
    eventType,
    guestCount: boundedInteger(raw.guestCount, DEFAULT_BRIEF.guestCount, 1, 500),
    budget: boundedInteger(raw.budget, DEFAULT_BRIEF.budget, 1_000, 10_000_000),
    city: boundedText(raw.city, DEFAULT_BRIEF.city, 80),
    date: boundedText(raw.date, DEFAULT_BRIEF.date, 30),
    setting,
    atmosphere,
    dietaryNeeds,
    notes: boundedText(raw.notes, DEFAULT_BRIEF.notes, 1_000),
    revision: boundedInteger(raw.revision, 0, 0, 100_000),
  };
}

export function isEventPlan(value: unknown): value is EventPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as Record<string, unknown>;
  if (!Array.isArray(plan.items) || plan.items.length < 1 || plan.items.length > 30) return false;
  if (typeof plan.venueName !== 'string' || typeof plan.venueCapacity !== 'number' || !['Indoor', 'Outdoor'].includes(String(plan.venueSetting))) return false;
  if (!['subtotal', 'tax', 'contingency', 'total', 'version'].every((key) => typeof plan[key] === 'number' && Number.isFinite(plan[key]))) return false;
  return plan.items.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.id === 'string' && typeof candidate.label === 'string' && typeof candidate.amount === 'number' && Number.isFinite(candidate.amount) && candidate.amount >= 0;
  });
}
