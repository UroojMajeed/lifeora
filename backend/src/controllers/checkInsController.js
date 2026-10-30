const ApiError = require('../utils/ApiError');
const updateUser = require('../utils/updateUser');
const { buildHandoffs, slipBack } = require('./handoffsController');
const { lowerThisWeek } = require('./progressController');

const WORKDAYS_PER_WEEK = 5;
const MAX_CHECKINS = 104; // two years of weeks
const HANDOFF_ANSWERS = ['kept', 'slipped'];
const FILL_ANSWERS = ['yes', 'partly', 'no'];
const WEEK = /^\d{4}-\d{2}-\d{2}$/; // the Monday of the week, YYYY-MM-DD (the phone's own calendar)

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * POST /api/checkins: the weekly check-in. For each handed-off task, did it stay off your plate
 * ('kept') or come back ('slipped')? For each reinvestment, did you use the hours? And how did the
 * week feel (1-4)? Slipped tasks go back to 'mine', so they return as a next move. Hours confirmed
 * are the kept tasks' hours for the week. One check-in per week (sending it again replaces it).
 * Responds like GET /api/handoffs.
 */
async function saveCheckIn(req, res, next) {
  try {
    const body = req.body || {};
    const errors = [];
    const week = String(body.week || '');
    if (!WEEK.test(week) || Number.isNaN(new Date(week).getTime())) errors.push('week must be a date (YYYY-MM-DD)');

    const handoffs = Array.isArray(body.handoffs) ? body.handoffs : [];
    const fills = Array.isArray(body.fills) ? body.fills : [];
    if (handoffs.length > 50 || fills.length > 50) errors.push('too many answers');
    handoffs.forEach((a, i) => {
      if (!String(a?.activity || '').trim()) errors.push(`handoffs[${i}]: activity is required`);
      if (!HANDOFF_ANSWERS.includes(a?.answer)) errors.push(`handoffs[${i}]: answer must be one of ${HANDOFF_ANSWERS.join(', ')}`);
    });
    fills.forEach((a, i) => {
      if (!String(a?.activity || '').trim()) errors.push(`fills[${i}]: activity is required`);
      if (!FILL_ANSWERS.includes(a?.answer)) errors.push(`fills[${i}]: answer must be one of ${FILL_ANSWERS.join(', ')}`);
    });
    const feeling = body.feeling == null ? null : Number(body.feeling);
    if (feeling !== null && !(Number.isInteger(feeling) && feeling >= 1 && feeling <= 4)) errors.push('feeling must be 1 to 4');
    if (errors.length) throw new ApiError(400, 'Validation failed', errors);

    const { user } = await updateUser(req.userId, (u) => {
      const hoursOf = new Map((u.onboarding?.schedule || []).map((a) => [a.activity.toLowerCase(), a.hours]));
      const answers = handoffs.map((a) => ({ activity: String(a.activity).trim().slice(0, 60), answer: a.answer }));

      // A task that slipped back is yours again: it returns as a next move.
      answers
        .filter((a) => a.answer === 'slipped')
        .forEach((a) => {
          const h = u.handoffs.find((x) => x.activity.toLowerCase() === a.activity.toLowerCase());
          if (h && h.status === 'done') slipBack(h);
        });
      if (answers.some((a) => a.answer === 'slipped')) lowerThisWeek(u, buildHandoffs(u).summary.boughtBackPerWeek);

      const kept = answers.filter((a) => a.answer === 'kept');
      const confirmedHours = round2(kept.reduce((t, a) => t + (hoursOf.get(a.activity.toLowerCase()) || 0), 0) * WORKDAYS_PER_WEEK);
      const entry = {
        week,
        at: new Date(),
        handoffs: answers,
        fills: fills.map((a) => ({ activity: String(a.activity).trim().slice(0, 60), answer: a.answer })),
        feeling,
        confirmedHours,
      };
      const others = (u.checkIns || []).filter((c) => c.week !== week);
      u.checkIns = [...others, entry].sort((a, b) => a.week.localeCompare(b.week)).slice(-MAX_CHECKINS);
    });
    res.json(buildHandoffs(user));
  } catch (err) {
    next(err);
  }
}

module.exports = { saveCheckIn };
