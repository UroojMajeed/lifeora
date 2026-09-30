const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  calculateBuybackRate,
  REPLACEMENT_LADDER,
  FEELINGS,
  TIME_ASSASSINS,
  ONBOARDING_STEPS,
} = require('../utils/buyback');

// Validate and pick only known onboarding fields from the request body.
function sanitize(body = {}) {
  const errors = [];
  const out = {};

  if (body.currentStep !== undefined) {
    if (!ONBOARDING_STEPS.includes(body.currentStep)) errors.push('Invalid currentStep');
    else out.currentStep = body.currentStep;
  }

  if (body.annualIncome !== undefined) {
    const n = Number(body.annualIncome);
    if (!Number.isFinite(n) || n < 0 || n > 1e10) errors.push('annualIncome must be a positive number');
    else out.annualIncome = n;
  }

  if (body.currency !== undefined) {
    if (!/^[A-Z]{3}$/.test(String(body.currency))) errors.push('currency must be a 3-letter code');
    else out.currency = body.currency;
  }

  if (body.drainingTasks !== undefined) {
    if (!Array.isArray(body.drainingTasks) || body.drainingTasks.length > 30) {
      errors.push('drainingTasks must be an array of up to 30 items');
    } else {
      out.drainingTasks = [...new Set(body.drainingTasks.map((t) => String(t).trim().slice(0, 60)).filter(Boolean))];
    }
  }

  if (body.feeling !== undefined) {
    if (!FEELINGS.includes(body.feeling)) errors.push(`feeling must be one of: ${FEELINGS.join(', ')}`);
    else out.feeling = body.feeling;
  }

  if (body.timeAssassins !== undefined) {
    if (!Array.isArray(body.timeAssassins) || body.timeAssassins.some((a) => !TIME_ASSASSINS.includes(a))) {
      errors.push(`timeAssassins must be a subset of: ${TIME_ASSASSINS.join(', ')}`);
    } else {
      out.timeAssassins = [...new Set(body.timeAssassins)];
    }
  }

  if (body.visionStatement !== undefined) {
    const v = String(body.visionStatement).trim();
    if (v.length > 1000) errors.push('visionStatement must be 1000 characters or fewer');
    else out.visionStatement = v;
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
    if (data.feeling) {
      user.onboarding.ladderRung = REPLACEMENT_LADDER[data.feeling].rung;
    }

    await user.save();
    res.json({ onboarding: user.onboarding });
  } catch (err) {
    next(err);
  }
}

async function completeOnboarding(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const o = user.onboarding;
    if (o.annualIncome === undefined || !o.feeling) {
      throw new ApiError(400, 'Finish the Buyback Rate and Replacement Ladder steps first');
    }

    o.completed = true;
    o.completedAt = new Date();
    o.currentStep = 'done';
    await user.save();

    res.json({
      onboarding: o,
      insights: {
        ladder: REPLACEMENT_LADDER[o.feeling],
        buybackRule: `Stop doing tasks you dislike that someone else could do for $${o.buybackRate}/hour or less.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOnboarding, updateOnboarding, completeOnboarding };
