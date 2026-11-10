export type BuildMode = 'progressive' | 'complete';

export interface EventBrief {
  eventName: string;
  eventType: 'Birthday' | 'Anniversary' | 'Family gathering' | 'Team celebration';
  guestCount: number;
  budget: number;
  city: string;
  date: string;
  setting: 'Indoor' | 'Outdoor';
  atmosphere: 'Family-friendly' | 'Formal' | 'Casual';
  dietaryNeeds: string[];
  notes: string;
  revision: number;
}

export interface PlanItem {
  id: string;
  category: 'Venue' | 'Catering' | 'Decor' | 'Cake' | 'Entertainment' | 'Extras';
  label: string;
  amount: number;
  rationale: string;
}

export interface EventPlan {
  brief: EventBrief;
  venueName: string;
  venueCapacity: number;
  venueSetting: 'Indoor' | 'Outdoor';
  items: PlanItem[];
  subtotal: number;
  tax: number;
  contingency: number;
  total: number;
  currency: 'INR';
  version: number;
  optimizationLabel: string;
}

export interface VerificationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  severity: 'blocker' | 'warning' | 'info';
}

export interface ActivityEvent {
  id: string;
  node: string;
  status: 'done' | 'warning' | 'blocked' | 'pending';
  detail: string;
  elapsedMs: number;
}

export interface IterationRecord {
  attempt: number;
  label: string;
  subtotal: number;
  total: number;
  passed: boolean;
  feedback: string;
}

export interface TeachingNote {
  title: string;
  whatAdded: string;
  failureMode: string;
  benefit: string;
  maintenance: string;
}

export interface AgentMetrics {
  estimatedTotal: number | null;
  total: number | null;
  budget: number;
  budgetHeadroom: number | null;
  checksPassed: number;
  checksTotal: number;
  iterations: number;
  verified: boolean;
  approvalRequired: boolean;
  structured: boolean;
  toolsUsed: number;
}

export interface ToolResult {
  tool: string;
  result: string;
  data: Record<string, string | number | boolean>;
}

export interface AgentResult {
  mode: BuildMode;
  stage: number;
  stageTitle: string;
  brief: EventBrief;
  reply: string;
  plan: EventPlan | null;
  checks: VerificationCheck[];
  activities: ActivityEvent[];
  iterations: IterationRecord[];
  toolResults: ToolResult[];
  metrics: AgentMetrics;
  teaching: TeachingNote;
  status: 'incomplete' | 'blocked' | 'needs-approval' | 'ready' | 'approved';
  approvalMessage?: string;
  evaluationResults?: EvaluationResult[];
}

export interface EvaluationResult {
  name: string;
  description: string;
  passed: boolean;
  total: number | null;
  budget: number;
  checks: string[];
  outcome: string;
}

export interface AgentRequest {
  mode: BuildMode;
  stage: number;
  message: string;
  brief: EventBrief;
  action?: 'chat' | 'approve' | 'evaluate';
  plan?: EventPlan | null;
  checks?: VerificationCheck[];
}

export const DEFAULT_BRIEF: EventBrief = {
  eventName: 'Aarav’s Birthday Celebration',
  eventType: 'Birthday',
  guestCount: 40,
  budget: 50_000,
  city: 'Bengaluru',
  date: '2026-12-12',
  setting: 'Indoor',
  atmosphere: 'Family-friendly',
  dietaryNeeds: ['Vegetarian options'],
  notes: 'Keep the event relaxed, inclusive and easy for families with children.',
  revision: 0,
};

export const formatINR = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
