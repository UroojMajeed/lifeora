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

// Replacement Ladder: how the founder feels tells you which rung they're on.
const REPLACEMENT_LADDER = {
  stuck: { rung: 1, name: 'Admin', keyHire: 'Admin Assistant', ownership: 'Inbox & Calendar' },
  stalled: { rung: 2, name: 'Delivery', keyHire: 'Head of Delivery', ownership: 'Onboarding & Support' },
  friction: { rung: 3, name: 'Marketing', keyHire: 'Head of Marketing', ownership: 'Campaigns & Traffic' },
  freedom: { rung: 4, name: 'Sales', keyHire: 'Sales Representative', ownership: 'Calls & Follow-up' },
  flow: { rung: 5, name: 'Leadership', keyHire: 'Leadership Team', ownership: 'Strategy & Outcomes' },
};

const FEELINGS = Object.keys(REPLACEMENT_LADDER);

const TIME_ASSASSINS = ['staller', 'speed_demon', 'supervisor', 'saver', 'self_medicator'];

const ONBOARDING_STEPS = [
  'buyback_rate',
  'energy_drains',
  'feeling',
  'time_assassins',
  'vision',
  'summary',
  'done',
];

module.exports = {
  WORK_HOURS_PER_YEAR,
  BUYBACK_DIVISOR,
  calculateBuybackRate,
  REPLACEMENT_LADDER,
  FEELINGS,
  TIME_ASSASSINS,
  ONBOARDING_STEPS,
};
