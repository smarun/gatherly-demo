import type { EventBrief, EventPlan, VerificationCheck } from '../domain.ts';

export const POLICY = {
  maxGuestsSupportedByCatalog: 50,
  bookingRequiresHumanApproval: true,
  externalBookingsEnabled: false,
  maximumRevisionAttempts: 3,
  taxRate: 0.05,
  contingencyRate: 0.10,
} as const;

export function evaluatePolicies(brief: EventBrief, plan: EventPlan | null): VerificationCheck[] {
  if (!plan) return [];
  const fitsBudget = plan.total <= brief.budget;
  const fitsCapacity = brief.guestCount <= plan.venueCapacity;
  return [
    {
      id: 'policy-budget',
      label: 'Budget policy',
      passed: fitsBudget,
      detail: fitsBudget
        ? `Total ${plan.total.toLocaleString('en-IN')} is within the ${brief.budget.toLocaleString('en-IN')} budget.`
        : `Total ${plan.total.toLocaleString('en-IN')} exceeds the ${brief.budget.toLocaleString('en-IN')} limit.`,
      severity: fitsBudget ? 'info' : 'blocker',
    },
    {
      id: 'policy-capacity',
      label: 'Venue capacity policy',
      passed: fitsCapacity,
      detail: fitsCapacity
        ? `${plan.venueName} can accommodate ${brief.guestCount} guests.`
        : `${plan.venueName} supports ${plan.venueCapacity}; ${brief.guestCount} guests were requested.`,
      severity: fitsCapacity ? 'info' : 'blocker',
    },
    {
      id: 'policy-setting',
      label: 'Event setting policy',
      passed: plan.venueSetting === brief.setting,
      detail: plan.venueSetting === brief.setting
        ? `Selected venue matches the ${brief.setting.toLowerCase()} requirement.`
        : `The workshop catalogue has ${plan.venueSetting.toLowerCase()} venues only; a ${brief.setting.toLowerCase()} venue must be sourced.`,
      severity: 'blocker',
    },
    {
      id: 'policy-no-side-effects',
      label: 'No external booking without approval',
      passed: !POLICY.externalBookingsEnabled,
      detail: 'This workshop uses a dry-run catalog. No vendor is contacted and no booking or payment is made.',
      severity: 'info',
    },
  ];
}
