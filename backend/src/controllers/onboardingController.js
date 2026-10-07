const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  calculateBuybackRate,
  quadrantFor,
  valueForMoney,
  summarizeSchedule,
  ONBOARDING_STEPS,
  ROLES,
} = require('../utils/buyback');

const { extractSchedule: extractFromText } = require('../services/scheduleExtractor');

const MAX_ACTIVITIES = 30;
const MAX_DAY_DESCRIPTION = 2000;
// High enough for currencies with big numbers (10 billion Vietnamese dong is about $400k a year).
const MAX_ANNUAL_INCOME = 1e13;

function sanitizeSchedule(schedule, errors) {
  if (!Array.isArray(schedule) || schedule.length > MAX_ACTIVITIES) {
    errors.push(`schedule must be an array of up to ${MAX_ACTIVITIES} activities`);
    return undefined;
  }

  const items = schedule.map((item, i) => {
    const activity = String(item?.activity ?? '').trim().slice(0, 60);
    const hours = Number(item?.hours);
    if (!activity) errors.push(`schedule[${i}]: activity is required`);
    if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) {
      errors.push(`schedule[${i}]: hours must be between 0.25 and 24`);
    }
    // Money is rated $ to $$$$$ (1-5); $$$ and up means it makes money ("high" value).
    const money = item?.money ?? null;
    if (money !== null && !(Number.isInteger(money) && money >= 1 && money <= 5)) {
      errors.push(`schedule[${i}]: money must be a whole number from 1 to 5`);
    }
    const value = money !== null ? valueForMoney(money) : item?.value;
    if (!['high', 'low'].includes(value)) errors.push(`schedule[${i}]: value must be high or low`);
    const energy = item?.energy ?? null;
    if (![null, 'energizing', 'draining'].includes(energy)) {
      errors.push(`schedule[${i}]: energy must be energizing, draining or null`);
    }
    // The quadrant is always derived here, never trusted from the client.
    const per = item?.per === 'week' ? 'week' : 'day';
    return { activity, hours, value, money, per, energy, quadrant: quadrantFor({ value, energy }) };
  });

  const total = items.reduce((sum, item) => sum + (Number.isFinite(item.hours) ? item.hours : 0), 0);
  if (total > 24) errors.push('A day only has 24 hours. Trim a few activities.');
  return items;
}

// Validate and pick only known onboarding fields from the request body.
function sanitize(body = {}) {
  const errors = [];
  const out = {};

  if (body.currentStep !== undefined) {
    if (!ONBOARDING_STEPS.includes(body.currentStep)) errors.push('Invalid currentStep');
    else out.currentStep = body.currentStep;
  }

  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) errors.push(`role must be one of: ${ROLES.join(', ')}`);
    else out.role = body.role;
  }

  if (body.annualIncome !== undefined) {
    // Number(null) and Number('') are 0, so reject blanks explicitly instead of saving a zero income.
    const blank = body.annualIncome === null || String(body.annualIncome).trim() === '';
    const n = Number(body.annualIncome);
    if (blank || !Number.isFinite(n) || n < 0) errors.push('Enter your yearly pay as a number.');
    else if (n > MAX_ANNUAL_INCOME) errors.push('That yearly pay looks too large. Please check the number.');
    else out.annualIncome = n;
  }

  if (body.currency !== undefined) {
    if (!/^[A-Z]{3}$/.test(String(body.currency))) errors.push('currency must be a 3-letter code');
    else out.currency = body.currency;
  }

  if (body.dayDescription !== undefined) {
    const d = String(body.dayDescription).trim();
    if (d.length > MAX_DAY_DESCRIPTION) errors.push(`dayDescription must be ${MAX_DAY_DESCRIPTION} characters or fewer`);
    else out.dayDescription = d;
  }

  if (body.schedule !== undefined) {
    out.schedule = sanitizeSchedule(body.schedule, errors);
  }

  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  return out;
}

async function getOnboarding(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ onboarding: user.onboarding });
  } catch (err) {
    next(err);
  }
}

async function updateOnboarding(req, res, next) {
  try {
    const data = sanitize(req.body);
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');

    Object.assign(user.onboarding, data);

    // Derived values are always computed on the server.
    if (data.annualIncome !== undefined) {
      Object.assign(user.onboarding, calculateBuybackRate(data.annualIncome));
    }

    await user.save();
    res.json({ onboarding: user.onboarding });
  } catch (err) {
    next(err);
  }
}

// Reads the user's description of their day and returns activities for them to review. Saves nothing.
async function extractSchedule(req, res, next) {
  try {
    const text = String(req.body?.text ?? '').trim();
    if (text.length < 10) throw new ApiError(400, 'Tell us a bit more about your day first.');
    if (text.length > MAX_DAY_DESCRIPTION) {
      throw new ApiError(400, `Keep it under ${MAX_DAY_DESCRIPTION} characters.`);
    }

    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const activities = await extractFromText(text, user.onboarding);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

async function completeOnboarding(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const o = user.onboarding;
    if (o.annualIncome === undefined || !o.schedule.length) {
      throw new ApiError(400, 'Finish the Buyback Rate and daily schedule steps first');
    }
    if (o.schedule.some((item) => !item.energy)) {
      throw new ApiError(400, 'Swipe every activity first');
    }

    o.completed = true;
    o.completedAt = new Date();
    o.currentStep = 'done';
    await user.save();

    res.json({ onboarding: o, insights: { drip: summarizeSchedule(o.schedule, o.buybackRate) } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOnboarding, updateOnboarding, extractSchedule, completeOnboarding };
