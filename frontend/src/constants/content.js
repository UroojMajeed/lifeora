// Onboarding copy, grounded in "Buy Back Your Time" by Dan Martell.

export const WORK_HOURS_PER_YEAR = 2000;
export const BUYBACK_DIVISOR = 4;

export function calculateBuybackRate(annualIncome) {
  const income = Number(annualIncome) || 0;
  const hourly = income / WORK_HOURS_PER_YEAR;
  return { effectiveHourlyRate: hourly, buybackRate: hourly / BUYBACK_DIVISOR };
}

// DRIP Matrix quadrants. Matches the backend's quadrantFor(). Colors are theme keys.
export const DRIP = {
  production: {
    name: 'Production',
    axes: 'Makes money · Energizes you',
    advice: 'Your zone of genius. Protect these hours and fill freed-up time with more of them.',
    color: 'success',
    soft: 'successSoft',
  },
  replacement: {
    name: 'Replacement',
    axes: 'Makes money · Drains you',
    advice: "You're good at it, but it wears you down. Write the playbook and hire someone to replace you.",
    color: 'warm',
    soft: 'warmSoft',
  },
  investment: {
    name: 'Investment',
    axes: "Doesn't pay yet · Energizes you",
    advice: 'Learning, health and planning. It pays off later, so keep investing here.',
    color: 'info',
    soft: 'infoSoft',
  },
  delegation: {
    name: 'Delegation',
    axes: "Doesn't pay · Drains you",
    advice: 'The cheapest hours to buy back. Hand these off first.',
    color: 'error',
    soft: 'errorSoft',
  },
};

// Grid order as drawn in the book: money on top, energy on the right.
export const DRIP_GRID = [
  ['replacement', 'production'],
  ['delegation', 'investment'],
];

export function quadrantFor({ value, energy }) {
  if (value === 'high') return energy === 'energizing' ? 'production' : 'replacement';
  return energy === 'energizing' ? 'investment' : 'delegation';
}

export function summarizeSchedule(schedule = [], buybackRate = 0) {
  const hours = { production: 0, replacement: 0, investment: 0, delegation: 0 };
  const tasks = { production: [], replacement: [], investment: [], delegation: [] };
  schedule.forEach((item) => {
    if (!item.energy) return;
    const q = quadrantFor(item);
    hours[q] += item.hours;
    tasks[q].push(item);
  });
  const totalHours = Object.values(hours).reduce((a, b) => a + b, 0);
  const dominant = totalHours ? Object.keys(hours).reduce((a, b) => (hours[b] > hours[a] ? b : a)) : null;
  const drainingHours = hours.delegation + hours.replacement;
  // First handoff: the biggest Delegation task, else the biggest Replacement task.
  const byHours = (a, b) => b.hours - a.hours;
  const firstHandoff = [...tasks.delegation].sort(byHours)[0] || [...tasks.replacement].sort(byHours)[0] || null;

  return {
    hours,
    tasks,
    totalHours,
    dominant,
    drainingHours,
    dailyBuybackCost: drainingHours * (Number(buybackRate) || 0),
    firstHandoff,
  };
}

// "What best describes you?" Picks which activities we suggest. Icons are Ionicons names.
export const ROLES = [
  { key: 'agency', label: 'Agency owner', icon: 'briefcase-outline' },
  { key: 'coach', label: 'Coach or consultant', icon: 'people-outline' },
  { key: 'ecommerce', label: 'E-commerce', icon: 'bag-handle-outline' },
  { key: 'saas', label: 'Software / SaaS', icon: 'code-slash-outline' },
  { key: 'freelancer', label: 'Freelancer', icon: 'laptop-outline' },
  { key: 'other', label: 'Something else', icon: 'sparkles-outline' },
];

// Activities we can suggest: usual hours a day, and value
// ('high' = hard to hand off / makes money, 'low' = someone could do it for your Buyback Rate or less).
const A = (hours, value) => ({ hours, value });
export const ACTIVITIES = {
  'Email & Messages': A(1, 'low'),
  Scheduling: A(0.5, 'low'),
  'Client Calls': A(2, 'high'),
  'Client Work': A(4, 'high'),
  'Project Management': A(1.5, 'low'),
  'Sales & Proposals': A(1, 'high'),
  'Sales Calls': A(1, 'high'),
  'Sales Demos': A(1, 'high'),
  'Team Meetings': A(1, 'high'),
  'Invoicing & Admin': A(0.5, 'low'),
  Bookkeeping: A(0.5, 'low'),
  'Social Media': A(1, 'low'),
  'Customer Support': A(1.5, 'low'),
  'Orders & Inventory': A(1.5, 'low'),
  'Marketing & Ads': A(1.5, 'high'),
  'Product Sourcing': A(1, 'high'),
  'Product & Roadmap': A(2, 'high'),
  Hiring: A(1, 'high'),
  'Coaching Sessions': A(3, 'high'),
  'Creating Content': A(1, 'high'),
  'Finding Clients': A(1, 'high'),
  'Strategy & Planning': A(1, 'high'),
  'Data Entry & Reports': A(1, 'low'),
  'Learning & Reading': A(1, 'low'),
  Exercise: A(0.5, 'low'),
};

// Suggested first for each role; COMMON ones follow for everyone.
const ROLE_SUGGESTIONS = {
  agency: ['Email & Messages', 'Client Calls', 'Project Management', 'Sales & Proposals', 'Team Meetings', 'Invoicing & Admin', 'Social Media', 'Hiring'],
  coach: ['Coaching Sessions', 'Email & Messages', 'Scheduling', 'Creating Content', 'Sales Calls', 'Social Media', 'Invoicing & Admin'],
  ecommerce: ['Orders & Inventory', 'Customer Support', 'Email & Messages', 'Marketing & Ads', 'Product Sourcing', 'Social Media', 'Bookkeeping'],
  saas: ['Product & Roadmap', 'Team Meetings', 'Email & Messages', 'Customer Support', 'Sales Demos', 'Hiring', 'Invoicing & Admin'],
  freelancer: ['Client Work', 'Email & Messages', 'Finding Clients', 'Invoicing & Admin', 'Social Media', 'Learning & Reading'],
  other: ['Email & Messages', 'Team Meetings', 'Client Calls', 'Invoicing & Admin', 'Social Media', 'Strategy & Planning'],
};
const COMMON = ['Strategy & Planning', 'Sales Calls', 'Creating Content', 'Hiring', 'Scheduling', 'Customer Support', 'Data Entry & Reports', 'Learning & Reading', 'Exercise'];

/** Suggested activity names for a role: role-specific first, then common ones. */
export function suggestionsFor(role) {
  const first = ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS.other;
  return [...first, ...COMMON.filter((n) => !first.includes(n))];
}

/** A day-list entry. Typed activities default to "only you" (high); the swipe card lets them change it. */
export function newActivity(name, hours) {
  return { activity: name, hours, value: ACTIVITIES[name]?.value || 'high', energy: null };
}

/** Hour choices in the picker; the activity's usual hours are highlighted. */
export const HOUR_OPTIONS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8];
export const usualHours = (name) => ACTIVITIES[name]?.hours ?? null;
export const hoursLabel = (h) => (h < 1 ? `${h * 60} min` : `${h} ${h === 1 ? 'hour' : 'hours'}`);

// Order of onboarding steps. Keys match the backend.
export const STEPS = [
  { key: 'profile', screen: 'Profile' },
  { key: 'buyback_rate', screen: 'BuybackRate' },
  { key: 'schedule', screen: 'Schedule' },
  { key: 'swipe', screen: 'Swipe' },
  { key: 'drip', screen: 'Drip' },
];

export const TOTAL_STEPS = STEPS.length;

export function screenForStep(stepKey) {
  if (stepKey === 'done') return 'Home';
  return STEPS.find((s) => s.key === stepKey)?.screen || 'Profile';
}

export function stepNumber(stepKey) {
  return STEPS.findIndex((s) => s.key === stepKey) + 1;
}
