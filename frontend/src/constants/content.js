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

// Handing off a draining task: the "Transfer" in the Buyback Loop (Audit → Transfer → Fill).
export const HANDOFF_STATUSES = [
  { key: 'mine', label: 'Still mine', short: 'Still mine', icon: 'person-outline', color: 'muted' },
  { key: 'in_progress', label: 'Handing off', short: 'Handing off', icon: 'swap-horizontal', color: 'warm' },
  { key: 'done', label: 'Handed off', short: 'Handed off', icon: 'checkmark-circle', color: 'success' },
];
export const statusInfo = (key) => HANDOFF_STATUSES.find((s) => s.key === key) || HANDOFF_STATUSES[0];

export const HANDOFF_METHODS = [
  { key: 'hire', label: 'Hire someone', icon: 'person-add-outline' },
  { key: 'automate', label: 'Automate it', icon: 'flash-outline' },
  { key: 'team', label: 'Give to my team', icon: 'people-outline' },
  { key: 'drop', label: 'Drop it', icon: 'close-circle-outline' },
];

// Ways to buy back a draining task, written for each activity we suggest. `method` matches HANDOFF_METHODS.
const I = (method, text) => ({ method, text });
const HANDOFF_IDEAS = {
  'Email & Messages': [I('hire', 'Have an assistant sort your inbox and draft replies'), I('automate', 'Set up filters and saved replies for common emails'), I('drop', 'Check email twice a day instead of all day')],
  Scheduling: [I('automate', 'Share a booking link instead of going back and forth'), I('hire', 'Let an assistant run your calendar')],
  'Client Calls': [I('team', 'Train an account manager to take routine calls'), I('drop', 'Swap status calls for short written updates')],
  'Client Work': [I('team', 'Write down your process so a team member can do it'), I('hire', 'Bring in a freelancer for the overflow')],
  'Project Management': [I('hire', 'Hire a project manager'), I('automate', 'Use one task board that everyone updates')],
  'Sales & Proposals': [I('automate', 'Turn your best proposal into a reusable template'), I('hire', 'Hire a sales rep to write and send proposals')],
  'Sales Calls': [I('hire', 'Hire a sales rep for first calls'), I('automate', 'Send a recorded intro before live calls')],
  'Sales Demos': [I('automate', 'Record a demo video for early leads'), I('hire', 'Hire a sales rep to run demos')],
  'Team Meetings': [I('drop', 'Cut to one short weekly meeting with an agenda'), I('automate', 'Swap daily updates for a written check-in')],
  'Invoicing & Admin': [I('automate', 'Send invoices and reminders automatically'), I('hire', 'Hire a bookkeeper for a few hours a month')],
  Bookkeeping: [I('hire', 'Hire a bookkeeper for a few hours a month'), I('automate', 'Connect your bank to accounting software')],
  'Social Media': [I('hire', 'Hire a freelancer to create and post for you'), I('automate', 'Schedule a week of posts in one sitting')],
  'Customer Support': [I('hire', 'Hire a support assistant'), I('automate', 'Write answers to the most common questions')],
  'Orders & Inventory': [I('hire', 'Use a fulfilment service'), I('automate', 'Turn on low-stock alerts and automatic reorders')],
  'Marketing & Ads': [I('hire', 'Hire a marketer or agency to run campaigns'), I('automate', 'Keep the ads that work running, pause the rest')],
  'Product Sourcing': [I('hire', 'Hire a sourcing agent'), I('team', 'Give a teammate your list of trusted suppliers')],
  'Product & Roadmap': [I('team', 'Let a product manager own the details'), I('hire', 'Hire a product manager')],
  Hiring: [I('hire', 'Use a recruiter for first interviews'), I('automate', 'Reuse one clear job post and screening questions')],
  'Coaching Sessions': [I('team', 'Train an associate coach'), I('automate', 'Record answers to the questions you hear most')],
  'Creating Content': [I('hire', 'Hire an editor to polish and post'), I('automate', 'Batch a week of content in one session')],
  'Finding Clients': [I('hire', 'Hire someone to do outreach'), I('automate', 'Ask every happy client for a referral, automatically')],
  'Strategy & Planning': [I('team', 'Have your team prepare options before you decide'), I('drop', 'Plan once a week in a single focused block')],
  'Data Entry & Reports': [I('automate', 'Connect your tools so reports build themselves'), I('hire', 'Have an assistant compile reports')],
};
const FALLBACK_IDEAS = {
  delegation: [I('hire', 'Find someone who can do it for your Buyback Rate or less'), I('automate', 'Look for a tool that does it for you'), I('drop', 'Ask whether it needs doing at all')],
  replacement: [I('team', 'Train someone on your team to take it over'), I('hire', 'Hire someone who does this full-time')],
};

/** Suggestions for buying back one draining task: written for known activities, sensible defaults otherwise. */
export function handoffIdeas(item) {
  return HANDOFF_IDEAS[item.activity] || FALLBACK_IDEAS[item.quadrant] || FALLBACK_IDEAS.delegation;
}

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
  if (stepKey === 'done') return 'Main';
  return STEPS.find((s) => s.key === stepKey)?.screen || 'Profile';
}

export function stepNumber(stepKey) {
  return STEPS.findIndex((s) => s.key === stepKey) + 1;
}
