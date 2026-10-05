// Fill: the last step of the Buyback Loop. Freed hours get a new job: work that energizes you and
// makes money (Production) or that energizes you and pays back later (Investment).

export const FILL_TIMES = [
  { key: 'morning', label: 'Mornings', icon: 'partly-sunny-outline' },
  { key: 'afternoon', label: 'Afternoons', icon: 'sunny-outline' },
  { key: 'evening', label: 'Evenings', icon: 'moon-outline' },
];

export const FILL_KINDS = {
  production: {
    title: 'Grow the business',
    help: 'Energizing work that makes money: more of what only you can do.',
    icon: 'trending-up',
    color: 'success',
  },
  investment: {
    title: 'Invest in yourself',
    help: 'Energizing things that pay you back later: learning, health, family, rest.',
    icon: 'leaf-outline',
    color: 'info',
  },
};

// New ideas for each kind (activities already in your day are offered first).
const PRODUCTION_IDEAS = {
  agency: ['Winning bigger clients', 'Building partnerships', 'Creative direction', 'Strategy & Planning'],
  coach: ['Building a group program', 'Creating Content', 'Speaking & workshops', 'Strategy & Planning'],
  ecommerce: ['New product ideas', 'Building partnerships', 'Brand & creative', 'Strategy & Planning'],
  saas: ['Product vision', 'Talking to customers', 'Building partnerships', 'Strategy & Planning'],
  freelancer: ['Raising your rates', 'Building a signature offer', 'Creating Content', 'Finding Clients'],
  other: ['Strategy & Planning', 'Building partnerships', 'Creating Content', 'Talking to customers'],
};
const INVESTMENT_IDEAS = ['Learning & Reading', 'Exercise', 'Family time', 'Rest & recovery', 'Thinking time', 'Mentoring others'];

/** Fill ideas for a kind: your own energizing activities first, then new ideas. */
export function fillIdeas(kind, { role, schedule = [], fills = [] }) {
  const taken = new Set(fills.map((f) => f.activity.toLowerCase()));
  const yours = schedule.filter((a) => a.quadrant === kind).map((a) => a.activity);
  const fresh = kind === 'production' ? PRODUCTION_IDEAS[role] || PRODUCTION_IDEAS.other : INVESTMENT_IDEAS;
  const seen = new Set();
  return [...yours.map((name) => ({ name, yours: true })), ...fresh.map((name) => ({ name, yours: false }))].filter(
    ({ name }) => {
      const k = name.toLowerCase();
      if (taken.has(k) || seen.has(k)) return false;
      seen.add(k);
      return true;
    }
  );
}

/**
 * How much of your day energizes you: at the start (your audit) and now. The day keeps its length:
 * handing off a task frees its hours, and they only count as energizing once Fill gives them a job.
 * Returns percentages, or null before the audit.
 */
export function energyShare(schedule = [], summary) {
  const sorted = schedule.filter((a) => a.energy);
  const total = sorted.reduce((t, a) => t + a.hours, 0);
  if (!total) return null;
  const energizing = sorted.filter((a) => a.energy === 'energizing').reduce((t, a) => t + a.hours, 0);
  const filled = Math.min(summary?.filledHours || 0, summary?.boughtBackHours || 0);
  return {
    start: Math.round((energizing / total) * 100),
    now: Math.min(100, Math.round(((energizing + filled) / total) * 100)),
  };
}

/** Freed hours still waiting for a job. */
export const unfilledHours = (summary) =>
  Math.max(0, Math.round(((summary?.boughtBackHours || 0) - (summary?.filledHours || 0)) * 100) / 100);
