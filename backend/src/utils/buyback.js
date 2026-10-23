// Core formulas and reference data from "Buy Back Your Time".

// A normal work year is ~2,000 hours.
const WORK_HOURS_PER_YEAR = 2000;
// Buyback Rate = 1/4 of your effective hourly rate (aim for 4x ROI on every hire).
const BUYBACK_DIVISOR = 4;

const round2 = (n) => Math.round(n * 100) / 100;

function calculateBuybackRate(annualIncome) {
  const income = Number(annualIncome) || 0;
  const effectiveHourlyRate = income / WORK_HOURS_PER_YEAR;
  return {
    effectiveHourlyRate: round2(effectiveHourlyRate),
    buybackRate: round2(effectiveHourlyRate / BUYBACK_DIVISOR),
  };
}

// DRIP Matrix: every activity sits on two axes, money (value) and energy.
const DRIP_QUADRANTS = ['delegation', 'replacement', 'investment', 'production'];

// Null until the user has said how the activity makes them feel.
// Money rating ($ to $$$$$, 1-5): $$$ and up counts as work that makes money.
const MONEY_SPLIT = 3;
const valueForMoney = (money) => (money >= MONEY_SPLIT ? 'high' : 'low');

function quadrantFor({ value, energy }) {
  if (!energy) return null;
  if (value === 'high') return energy === 'energizing' ? 'production' : 'replacement';
  return energy === 'energizing' ? 'investment' : 'delegation';
}

// Hours per quadrant, the quadrant the day is dominated by, and the cost to buy back draining hours.
function summarizeSchedule(schedule = [], buybackRate = 0) {
  const hours = Object.fromEntries(DRIP_QUADRANTS.map((q) => [q, 0]));
  schedule.forEach((item) => {
    if (item.quadrant) hours[item.quadrant] += item.hours;
  });
  const totalHours = DRIP_QUADRANTS.reduce((sum, q) => sum + hours[q], 0);
  const dominant = totalHours ? DRIP_QUADRANTS.reduce((a, b) => (hours[b] > hours[a] ? b : a)) : null;
  const drainingHours = hours.delegation + hours.replacement;

  return {
    hours: Object.fromEntries(DRIP_QUADRANTS.map((q) => [q, round2(hours[q])])),
    totalHours: round2(totalHours),
    dominant,
    drainingHours: round2(drainingHours),
    dailyBuybackCost: round2(drainingHours * (Number(buybackRate) || 0)),
  };
}

// Handing off a draining task (the "Transfer" in the Buyback Loop: Audit → Transfer → Fill).
// 'later': kept for the next round of the Loop (e.g. a hire that takes months), so it doesn't block this one.
const HANDOFF_STATUSES = ['mine', 'in_progress', 'done', 'later'];
const HANDOFF_METHODS = ['hire', 'automate', 'team', 'drop'];
// The steps of a handoff plan: the app's own (each with its helper) and the user's own ('custom').
// 'handover' or 'drop' finishes a handoff, so a plan has exactly one of them, as its last step.
const HANDOFF_STEP_KINDS = ['how', 'brief', 'who', 'handover', 'drop', 'custom'];
const FINISH_STEP_KINDS = ['handover', 'drop'];
const FILL_TIMES = ['morning', 'afternoon', 'evening'];

const ONBOARDING_STEPS = ['profile', 'buyback_rate', 'schedule', 'swipe', 'drip', 'done'];

// "What best describes you?" Picks the activities we suggest for the user's day.
const ROLES = ['agency', 'coach', 'ecommerce', 'saas', 'freelancer', 'other'];

module.exports = {
  FILL_TIMES,
  WORK_HOURS_PER_YEAR,
  BUYBACK_DIVISOR,
  calculateBuybackRate,
  DRIP_QUADRANTS,
  quadrantFor,
  valueForMoney,
  summarizeSchedule,
  ONBOARDING_STEPS,
  ROLES,
  HANDOFF_STATUSES,
  HANDOFF_METHODS,
  HANDOFF_STEP_KINDS,
  FINISH_STEP_KINDS,
};
