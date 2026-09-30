// Onboarding copy, grounded in "Buy Back Your Time" by Dan Martell.

export const WORK_HOURS_PER_YEAR = 2000;
export const BUYBACK_DIVISOR = 4;

export function calculateBuybackRate(annualIncome) {
  const income = Number(annualIncome) || 0;
  const hourly = income / WORK_HOURS_PER_YEAR;
  return { effectiveHourlyRate: hourly, buybackRate: hourly / BUYBACK_DIVISOR };
}

export const WELCOME_SLIDES = [
  {
    key: 'principle',
    eyebrow: 'The Buyback Principle',
    title: "Don't hire to grow your business. Hire to buy back your time.",
    body: 'Your time is the most finite asset your business has. Spend it only on work you excel at, enjoy, and that moves the needle.',
  },
  {
    key: 'loop',
    eyebrow: 'The Buyback Loop',
    title: 'Audit. Transfer. Fill.',
    body: 'Audit where your time goes, transfer draining tasks to someone better suited, then fill that time with work that lights you up and makes money.',
  },
  {
    key: 'drip',
    eyebrow: 'The DRIP Matrix',
    title: 'Live in your Production Quadrant.',
    body: 'Every task sits on two axes: money and energy. Reclaim helps you move from Delegation and Replacement into Production.',
  },
];

// Tasks that commonly sit in the Delegation Quadrant.
export const DRAINING_TASKS = [
  'Email inbox',
  'Calendar & scheduling',
  'Invoicing & billing',
  'Bookkeeping',
  'Customer support',
  'Social media posting',
  'Travel arrangements',
  'Data entry & reports',
  'Website updates',
  'Onboarding clients',
  'Sales calls & follow-up',
  'Hiring & interviews',
];

// Replacement Ladder: the founder's current feeling maps to a rung.
export const FEELINGS = [
  {
    key: 'stuck',
    label: 'Stuck',
    description: 'Buried in email, calendar and admin. The inbox runs my day.',
    rung: 1,
    rungName: 'Admin',
    nextHire: 'Admin Assistant',
    ownership: 'Inbox & Calendar',
  },
  {
    key: 'stalled',
    label: 'Stalled',
    description: 'I still deliver the product or service myself, so growth stalls.',
    rung: 2,
    rungName: 'Delivery',
    nextHire: 'Head of Delivery',
    ownership: 'Onboarding & Support',
  },
  {
    key: 'friction',
    label: 'Friction',
    description: 'Business comes in waves. I market, then stop to deliver, then start again.',
    rung: 3,
    rungName: 'Marketing',
    nextHire: 'Head of Marketing',
    ownership: 'Campaigns & Traffic',
  },
  {
    key: 'freedom',
    label: 'Freedom',
    description: 'Admin, delivery and marketing are owned. I am still the main salesperson.',
    rung: 4,
    rungName: 'Sales',
    nextHire: 'Sales Representative',
    ownership: 'Calls & Follow-up',
  },
  {
    key: 'flow',
    label: 'Flow',
    description: 'Capable people run the day-to-day. I focus on strategy and leadership.',
    rung: 5,
    rungName: 'Leadership',
    nextHire: 'Leadership Team',
    ownership: 'Strategy & Outcomes',
  },
];

export const TIME_ASSASSINS = [
  {
    key: 'staller',
    label: 'The Staller',
    description: 'I hesitate on big decisions and let opportunities slide by.',
  },
  {
    key: 'speed_demon',
    label: 'The Speed Demon',
    description: 'I decide fast and pick the first option, then repeat the same mistakes.',
  },
  {
    key: 'supervisor',
    label: 'The Supervisor',
    description: "I micromanage or just do it myself because \"no one does it right.\"",
  },
  {
    key: 'saver',
    label: 'The Saver',
    description: 'I hoard cash instead of spending it to buy back hours.',
  },
  {
    key: 'self_medicator',
    label: 'The Self-Medicator',
    description: 'I reach for food, drink or other vices to celebrate or escape.',
  },
];

// Order of data-collecting steps after sign-up. Keys match the backend.
export const STEPS = [
  { key: 'buyback_rate', screen: 'BuybackRate' },
  { key: 'energy_drains', screen: 'EnergyDrains' },
  { key: 'feeling', screen: 'Feeling' },
  { key: 'time_assassins', screen: 'TimeAssassins' },
  { key: 'vision', screen: 'Vision' },
  { key: 'summary', screen: 'Summary' },
];

export const TOTAL_STEPS = STEPS.length;

export function screenForStep(stepKey) {
  if (stepKey === 'done') return 'Home';
  return STEPS.find((s) => s.key === stepKey)?.screen || 'BuybackRate';
}

export function stepNumber(stepKey) {
  return STEPS.findIndex((s) => s.key === stepKey) + 1;
}
