const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { HANDOFF_STATUSES, HANDOFF_METHODS } = require('../utils/buyback');

const WORKDAYS_PER_WEEK = 5;
// Delegation first: the cheapest hours to buy back. Then Replacement, which needs a playbook first.
const QUADRANT_ORDER = { delegation: 0, replacement: 1 };

const round2 = (n) => Math.round(n * 100) / 100;
const MAX_PLAYBOOK_STEPS = 15;

const emptyHandoff = (activity) => ({
  activity,
  status: 'mine',
  plan: '',
  method: null,
  who: '',
  doneLooksLike: '',
  playbook: [],
  startDate: null,
  notes: '',
  doneAt: null,
});

/** Draining activities from the user's day, each with its saved handoff progress, plus totals. */
function buildHandoffs(user) {
  const saved = new Map(user.handoffs.map((h) => [h.activity.toLowerCase(), h.toObject ? h.toObject() : h]));
  const draining = (user.onboarding?.schedule || []).filter((a) => a.quadrant in QUADRANT_ORDER);

  const items = draining
    .map((a) => ({
      ...emptyHandoff(a.activity),
      ...(saved.get(a.activity.toLowerCase()) || {}),
      activity: a.activity,
      hours: a.hours,
      quadrant: a.quadrant,
    }))
    .sort((x, y) => QUADRANT_ORDER[x.quadrant] - QUADRANT_ORDER[y.quadrant] || y.hours - x.hours);

  const sum = (list) => round2(list.reduce((t, h) => t + h.hours, 0));
  const drainingHours = sum(items);
  const boughtBackHours = sum(items.filter((h) => h.status === 'done'));
  const o = user.onboarding || {};

  return {
    handoffs: items,
    summary: {
      drainingHours,
      boughtBackHours,
      inProgressHours: sum(items.filter((h) => h.status === 'in_progress')),
      percent: drainingHours ? Math.round((boughtBackHours / drainingHours) * 100) : 0,
      boughtBackPerWeek: round2(boughtBackHours * WORKDAYS_PER_WEEK),
      done: items.filter((h) => h.status === 'done').length,
      total: items.length,
      // What the freed hours are worth at the user's own hourly value, and what help costs at their Buyback Rate.
      valuePerDay: round2(boughtBackHours * (o.effectiveHourlyRate || 0)),
      costPerDay: round2(boughtBackHours * (o.buybackRate || 0)),
      currency: o.currency || 'USD',
    },
  };
}

function sanitize(body = {}) {
  const errors = [];
  const out = {};

  if (body.status !== undefined) {
    if (!HANDOFF_STATUSES.includes(body.status)) errors.push(`status must be one of: ${HANDOFF_STATUSES.join(', ')}`);
    else out.status = body.status;
  }
  if (body.method !== undefined) {
    if (body.method !== null && !HANDOFF_METHODS.includes(body.method)) {
      errors.push(`method must be one of: ${HANDOFF_METHODS.join(', ')} (or null)`);
    } else out.method = body.method;
  }
  if (body.plan !== undefined) {
    const plan = String(body.plan ?? '').trim();
    if (plan.length > 140) errors.push('plan must be 140 characters or fewer');
    else out.plan = plan;
  }
  if (body.who !== undefined) {
    const who = String(body.who ?? '').trim();
    if (who.length > 60) errors.push('who must be 60 characters or fewer');
    else out.who = who;
  }
  if (body.doneLooksLike !== undefined) {
    const d = String(body.doneLooksLike ?? '').trim();
    if (d.length > 200) errors.push('doneLooksLike must be 200 characters or fewer');
    else out.doneLooksLike = d;
  }
  if (body.playbook !== undefined) {
    const steps = Array.isArray(body.playbook) ? body.playbook.map((s) => String(s ?? '').trim()).filter(Boolean) : null;
    if (!steps || steps.length > MAX_PLAYBOOK_STEPS || steps.some((s) => s.length > 120)) {
      errors.push(`playbook must be a list of up to ${MAX_PLAYBOOK_STEPS} steps of 120 characters or fewer`);
    } else out.playbook = steps;
  }
  if (body.startDate !== undefined) {
    if (body.startDate === null || body.startDate === '') out.startDate = undefined;
    else {
      const d = new Date(body.startDate);
      if (Number.isNaN(d.getTime())) errors.push('startDate must be a date');
      else out.startDate = d;
    }
  }
  if (body.notes !== undefined) {
    const notes = String(body.notes ?? '').trim();
    if (notes.length > 1000) errors.push('notes must be 1000 characters or fewer');
    else out.notes = notes;
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  return out;
}

async function listHandoffs(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');
    res.json(buildHandoffs(user));
  } catch (err) {
    next(err);
  }
}

async function updateHandoff(req, res, next) {
  try {
    const data = sanitize(req.body);
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');

    const name = String(req.params.activity || '').trim();
    const activity = (user.onboarding?.schedule || []).find(
      (a) => a.activity.toLowerCase() === name.toLowerCase() && a.quadrant in QUADRANT_ORDER
    );
    if (!activity) throw new ApiError(404, 'That activity is not one of your draining tasks');

    let handoff = user.handoffs.find((h) => h.activity.toLowerCase() === activity.activity.toLowerCase());
    if (!handoff) {
      user.handoffs.push(emptyHandoff(activity.activity));
      handoff = user.handoffs[user.handoffs.length - 1];
    }

    Object.assign(handoff, data);
    handoff.doneAt = handoff.status === 'done' ? handoff.doneAt || new Date() : undefined;

    await user.save();
    const result = buildHandoffs(user);
    res.json({ handoff: result.handoffs.find((h) => h.activity === activity.activity), summary: result.summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { listHandoffs, updateHandoff, buildHandoffs };
