import type { EventBrief, EventPlan, VerificationCheck } from '../domain.ts';
import { POLICY } from './policies.ts';

export function verifyPlan(brief: EventBrief, plan: EventPlan | null): VerificationCheck[] {
  if (!plan) return [];
  const itemSum = plan.items.reduce((sum, item) => sum + item.amount, 0);
  const taxExpected = Math.round(plan.subtotal * POLICY.taxRate);
  const contingencyExpected = Math.round(plan.subtotal * POLICY.contingencyRate);
  const totalExpected = itemSum + taxExpected + contingencyExpected;
  const checks: VerificationCheck[] = [
    {
      id: 'verify-arithmetic',
      label: 'Arithmetic integrity',
      passed: itemSum === plan.subtotal && taxExpected === plan.tax && contingencyExpected === plan.contingency && totalExpected === plan.total,
      detail: `Line items ${itemSum.toLocaleString('en-IN')} + tax ${taxExpected.toLocaleString('en-IN')} + contingency ${contingencyExpected.toLocaleString('en-IN')} = ${totalExpected.toLocaleString('en-IN')}.`,
      severity: 'blocker',
    },
    {
      id: 'verify-budget',
      label: 'Budget compliance',
      passed: plan.total <= brief.budget,
      detail: plan.total <= brief.budget
        ? `Verified total is within budget by ${(brief.budget - plan.total).toLocaleString('en-IN')}.`
        : `Verified total exceeds budget by ${(plan.total - brief.budget).toLocaleString('en-IN')}.`,
      severity: 'blocker',
    },
    {
      id: 'verify-setting',
      label: 'Event setting match',
      passed: plan.venueSetting === brief.setting,
      detail: `Requested ${brief.setting.toLowerCase()} event; selected venue is ${plan.venueSetting.toLowerCase()}.`,
      severity: 'blocker',
    },
    {
      id: 'verify-capacity',
      label: 'Guest capacity',
      passed: brief.guestCount <= plan.venueCapacity,
      detail: `${brief.guestCount} guests requested; venue capacity is ${plan.venueCapacity}.`,
      severity: 'blocker',
    },
    {
      id: 'verify-categories',
      label: 'Plan completeness',
      passed: ['Venue', 'Catering', 'Cake'].every((category) => plan.items.some((item) => item.category === category)),
      detail: 'Venue, catering and cake must be explicitly represented in the plan.',
      severity: 'blocker',
    },
  ];
  return checks;
}

export function allBlockingChecksPass(checks: VerificationCheck[]): boolean {
  return checks.filter((check) => check.severity === 'blocker').every((check) => check.passed);
}
