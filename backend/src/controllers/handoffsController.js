const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const updateUser = require('../utils/updateUser');
const { lowerThisWeek } = require('./progressController');
const { HANDOFF_STATUSES, HANDOFF_METHODS, HANDOFF_STEP_KINDS, FINISH_STEP_KINDS, SETTLE_ANSWERS, FILL_TIMES, quadrantFor } = require('../utils/buyback');

const WORKDAYS_PER_WEEK = 5;
// Delegation first: the cheapest hours to buy back. Then Replacement, which needs a playbook first.
const QUADRANT_ORDER = { delegation: 0, replacement: 1 };

const round2 = (n) => Math.round(n * 100) / 100;
const MAX_PLAYBOOK_STEPS = 15;
const MAX_PLAN_STEPS = 10;
const MAX_FILLS = 20;
const MAX_ACTIVITIES = 30;

const emptyHandoff = (activity) => ({
  activity,
  status: 'mine',
  plan: '',
  method: null,
  who: '',
  doneLooksLike: '',
  checkHow: '',
  playbook: [],
  startDate: null,
  notes: '',
  steps: [],
  planConfirmed: false,
  settleDay3: '',
  settleDay10: '',
  cameBackAt: null,
  doneAt: null,
});

// The app's suggested plan (as in the app's journey), for a handoff saved before plans existed.
const STEP_TITLES = { how: 'Choose how', brief: 'Write the brief', who: 'Find who', handover: 'Hand it over', drop: 'Stop doing it' };
const suggestedSteps = (method) =>
  (method === 'drop' ? ['how', 'drop'] : ['how', 'brief', 'who', 'handover']).map((k) => ({ id: k, kind: k, title: STEP_TITLES[k], done: k === 'how' }));

/**
 * A handed-off task that came back is yours again, to walk the road once more: "how" stays ticked,
 * every later step is checked again (answers kept), and the new handover needs a new start date.
 */
function slipBack(h) {
  h.status = 'mine';
  h.doneAt = undefined;
  h.settleDay3 = '';
  h.settleDay10 = '';
  h.cameBackAt = new Date();
  h.startDate = undefined;
  if (!h.steps || !h.steps.length) h.steps = suggestedSteps(h.method);
  h.steps.forEach((s) => {
    if (s.kind !== 'how') Object.assign(s, { done: false, doneAt: undefined });
  });
}

/** Draining activities from the user's day, each with its saved handoff progress, plus totals. */
function buildHandoffs(user) {
  const saved = new Map(user.handoffs.map((h) => [h.activity.toLowerCase(), h.toObject ? h.toObject() : h]));
  // Each task once (a routine saved before names were checked could hold one twice).
  const draining = (user.onboarding?.schedule || []).filter(
    (a, i, all) => a.quadrant in QUADRANT_ORDER && all.findIndex((x) => x.activity.toLowerCase() === a.activity.toLowerCase()) === i
  );

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
  // Handed off with a start day still ahead: its hours count from that day, not before.
  const now = new Date();
  const live = (h) => h.status === 'done' && (!h.startDate || new Date(h.startDate) <= now);
  const boughtBackHours = sum(items.filter(live));
  const o = user.onboarding || {};
  const fills = (user.fills || []).map((f) => (f.toObject ? f.toObject() : f));

  // Weekly check-ins, oldest first (the last half year is plenty for the app).
  const checkIns = (user.checkIns || []).map((x) => (x.toObject ? x.toObject() : x)).slice(-26);

  return {
    handoffs: items,
    fills,
    checkIns,
    summary: {
      drainingHours,
      boughtBackHours,
      inProgressHours: sum(items.filter((h) => h.status === 'in_progress')),
      startingHours: sum(items.filter((h) => h.status === 'done' && !live(h))),
      percent: drainingHours ? Math.round((boughtBackHours / drainingHours) * 100) : 0,
      boughtBackPerWeek: round2(boughtBackHours * WORKDAYS_PER_WEEK),
      done: items.filter((h) => h.status === 'done').length,
      total: items.length,
      // What the freed hours are worth at the user's own hourly value, and what help costs at their Buyback Rate.
      valuePerDay: round2(boughtBackHours * (o.effectiveHourlyRate || 0)),
      costPerDay: round2(boughtBackHours * (o.buybackRate || 0)),
      currency: o.currency || 'USD',
      // Fill: how much of the freed time already has a new, energizing job.
      filledHours: sum(fills),
      // Kept for the next round: still draining, but not blocking this round.
      later: items.filter((h) => h.status === 'later').length,
      laterHours: sum(items.filter((h) => h.status === 'later')),
      // Rounds of the Buyback Loop: which one this is, and hours bought back in finished rounds.
      round: (user.rounds || []).length + 1,
      pastBoughtBackHours: round2((user.rounds || []).reduce((t, r) => t + (r.boughtBackHours || 0), 0)),
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
  if (body.checkHow !== undefined) {
    const d = String(body.checkHow ?? '').trim();
    if (d.length > 200) errors.push('checkHow must be 200 characters or fewer');
    else out.checkHow = d;
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
  if (body.steps !== undefined) {
    const list = Array.isArray(body.steps) ? body.steps : null;
    if (!list || list.length > MAX_PLAN_STEPS) errors.push(`steps must be a list of up to ${MAX_PLAN_STEPS}`);
    else {
      const steps = list.map((s) => ({
        id: String(s?.id ?? '').trim(),
        kind: s?.kind,
        title: String(s?.title ?? '').trim(),
        done: s?.done === true,
      }));
      const bad = steps.some(
        (s) => !s.id || s.id.length > 24 || !HANDOFF_STEP_KINDS.includes(s.kind) || !s.title || s.title.length > 40
      );
      const finishers = steps.filter((s) => FINISH_STEP_KINDS.includes(s.kind));
      if (bad) errors.push('each step needs an id (24 characters or fewer), a kind and a title of 40 characters or fewer');
      else if (new Set(steps.map((s) => s.id)).size !== steps.length) errors.push('step ids must be unique');
      else if (steps.length && (finishers.length !== 1 || !FINISH_STEP_KINDS.includes(steps[steps.length - 1].kind))) {
        errors.push('a plan ends with one finishing step (handover or drop)');
      } else out.steps = steps;
    }
  }
  if (body.planConfirmed !== undefined) out.planConfirmed = body.planConfirmed === true;
  ['settleDay3', 'settleDay10'].forEach((key) => {
    if (body[key] === undefined) return;
    if (!SETTLE_ANSWERS.includes(body[key] ?? '')) errors.push(`${key} must be one of: well, help`);
    else out[key] = body[key] ?? '';
  });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  return out;
}

// POST /api/handoffs/:activity/slip: a handed-off task came back (the user says so on its road).
async function slipHandoff(req, res, next) {
  try {
    const name = String(req.params.activity || '').trim().toLowerCase();
    const { user, result: activityName } = await updateUser(req.userId, (u) => {
      const h = u.handoffs.find((x) => x.activity.toLowerCase() === name);
      if (!h || h.status !== 'done') throw new ApiError(400, 'Only a handed-off task can come back');
      slipBack(h);
      lowerThisWeek(u, buildHandoffs(u).summary.boughtBackPerWeek);
      return h.activity;
    });
    const result = buildHandoffs(user);
    res.json({ handoff: result.handoffs.find((x) => x.activity.toLowerCase() === activityName.toLowerCase()), summary: result.summary });
  } catch (err) {
    next(err);
  }
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
    const name = String(req.params.activity || '').trim();
    const { user, result: activityName } = await updateUser(req.userId, (u) => {
      const activity = (u.onboarding?.schedule || []).find(
        (a) => a.activity.toLowerCase() === name.toLowerCase() && a.quadrant in QUADRANT_ORDER
      );
      if (!activity) throw new ApiError(404, 'That activity is not one of your draining tasks');

      let handoff = u.handoffs.find((h) => h.activity.toLowerCase() === activity.activity.toLowerCase());
      if (!handoff) {
        u.handoffs.push(emptyHandoff(activity.activity));
        handoff = u.handoffs[u.handoffs.length - 1];
      }
      // A step keeps the date it was first ticked; a newly ticked one gets today's.
      if (data.steps) {
        const before = new Map((handoff.steps || []).map((s) => [s.id, s.doneAt]));
        data.steps = data.steps.map((s) => ({ ...s, doneAt: s.done ? before.get(s.id) || new Date() : undefined }));
      }
      Object.assign(handoff, data);
      handoff.doneAt = handoff.status === 'done' ? handoff.doneAt || new Date() : undefined;
      if (handoff.status === 'done') handoff.cameBackAt = undefined; // handed off again
      return activity.activity;
    });
    const result = buildHandoffs(user);
    res.json({ handoff: result.handoffs.find((h) => h.activity === activityName), summary: result.summary });
  } catch (err) {
    next(err);
  }
}

// PUT /api/fills: replaces the list of fills. You can't fill more time than you've bought back.
async function updateFills(req, res, next) {
  try {
    const list = req.body?.fills;
    const errors = [];
    if (!Array.isArray(list) || list.length > MAX_FILLS) {
      throw new ApiError(400, 'Validation failed', [`fills must be a list of up to ${MAX_FILLS}`]);
    }
    const fills = list.map((f, i) => {
      const activity = String(f?.activity ?? '').trim().slice(0, 60);
      const hours = Number(f?.hours);
      if (!activity) errors.push(`fills[${i}]: activity is required`);
      if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) errors.push(`fills[${i}]: hours must be between 0.25 and 24`);
      if (!['production', 'investment'].includes(f?.quadrant)) errors.push(`fills[${i}]: quadrant must be production or investment`);
      const when = f?.when ?? null;
      if (when !== null && !FILL_TIMES.includes(when)) errors.push(`fills[${i}]: when must be one of ${FILL_TIMES.join(', ')}`);
      return { activity, hours, quadrant: f?.quadrant, when };
    });
    const names = fills.map((f) => f.activity.toLowerCase());
    if (new Set(names).size !== names.length) errors.push('Each activity can only be filled once');
    if (errors.length) throw new ApiError(400, 'Validation failed', errors);

    const { user } = await updateUser(req.userId, (u) => {
      const freed = buildHandoffs(u).summary.boughtBackHours;
      const filled = fills.reduce((t, f) => t + f.hours, 0);
      if (filled > freed + 0.001) {
        throw new ApiError(400, `You've bought back ${freed}h a day, so you can fill up to ${freed}h.`);
      }
      u.fills = fills;
    });
    res.json(buildHandoffs(user));
  } catch (err) {
    next(err);
  }
}

// POST /api/rounds/next: closes this round of the Loop and starts the next with a fresh audit.
// Handed-off tasks leave the day, filled hours join it, and every activity is swiped again
// (what energized you before might drain you now). Tasks kept for later carry over.
async function startNextRound(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');
    const { handoffs, fills, summary } = buildHandoffs(user);
    if (handoffs.some((h) => h.status === 'mine' || h.status === 'in_progress')) {
      throw new ApiError(400, 'Hand off (or keep for next round) every draining task first');
    }

    const done = new Set(handoffs.filter((h) => h.status === 'done').map((h) => h.activity.toLowerCase()));
    const schedule = (user.onboarding?.schedule || [])
      .filter((a) => !done.has(a.activity.toLowerCase()))
      .map((a) => ({ activity: a.activity, hours: a.hours, value: a.value, money: a.money ?? null, per: a.per || 'day', energy: null, quadrant: null }));
    fills.forEach((f) => {
      const same = schedule.find((a) => a.activity.toLowerCase() === f.activity.toLowerCase());
      if (same) same.hours = Math.min(24, round2(same.hours + f.hours));
      else {
        const money = f.quadrant === 'production' ? 4 : 2; // a starting guess; it gets rated again in the new audit
        schedule.push({ activity: f.activity, hours: f.hours, value: money >= 3 ? 'high' : 'low', money, energy: null, quadrant: null });
      }
    });

    user.rounds.push({
      number: summary.round,
      boughtBackHours: summary.boughtBackHours,
      filledHours: summary.filledHours,
      handedOff: handoffs.filter((h) => h.status === 'done').map((h) => h.activity),
    });
    user.onboarding.schedule = schedule.slice(0, MAX_ACTIVITIES).map((a) => ({ ...a, quadrant: quadrantFor(a) }));
    // Done handoffs live on in the round history; kept-for-later ones start the new round as "still mine".
    user.handoffs = user.handoffs
      .filter((h) => !done.has(h.activity.toLowerCase()))
      .map((h) => (h.status === 'later' ? Object.assign(h, { status: 'mine' }) : h));
    user.fills = [];
    await user.save();

    res.json({ onboarding: user.onboarding, ...buildHandoffs(user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listHandoffs, updateHandoff, slipHandoff, updateFills, startNextRound, buildHandoffs, slipBack };
