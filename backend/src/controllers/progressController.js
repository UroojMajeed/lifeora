const ApiError = require('../utils/ApiError');
const updateUser = require('../utils/updateUser');
const User = require('../models/User');

// Progress that used to live only on the phone, now kept with the account so it follows you to a
// new phone: hours bought back week by week, the weeks you were active (the streak), and the
// milestones already celebrated. Weeks are keyed by their Monday on the phone's calendar.
const WEEK = /^\d{4}-\d{2}-\d{2}$/;
const MAX_WEEKS = 104;
const MAX_HOURS_A_WEEK = 168;
const MILESTONE = /^[a-z0-9-]{1,40}$/;

const isWeek = (k) => WEEK.test(String(k)) && !Number.isNaN(new Date(k).getTime());
const isHours = (n) => Number.isFinite(n) && n >= 0 && n <= MAX_HOURS_A_WEEK;

function emptyProgress(u) {
  if (!u.progress) u.progress = {};
  if (!u.progress.weeks) u.progress.weeks = new Map();
  if (!u.progress.activeWeeks) u.progress.activeWeeks = [];
  if (!u.progress.milestones) u.progress.milestones = new Map();
  return u.progress;
}

/** The progress as plain JSON: { weeks: { [week]: hours }, activeWeeks: [week], milestones: { [key]: date } }. */
function progressOf(u) {
  const p = u.progress || {};
  return {
    weeks: Object.fromEntries(p.weeks || []),
    activeWeeks: [...(p.activeWeeks || [])],
    milestones: Object.fromEntries(p.milestones || []),
  };
}

// Keeps the newest weeks only.
function trim(p) {
  const keys = [...p.weeks.keys()].sort();
  keys.slice(0, Math.max(0, keys.length - MAX_WEEKS)).forEach((k) => p.weeks.delete(k));
  p.activeWeeks = [...new Set(p.activeWeeks)].sort().slice(-MAX_WEEKS);
}

/** Validates the request body. Every part is optional; see updateProgress. */
function sanitize(body = {}) {
  const errors = [];
  const out = {};
  if (body.week !== undefined || body.hours !== undefined) {
    if (!isWeek(body.week)) errors.push('week must be a date (YYYY-MM-DD)');
    else if (!isHours(Number(body.hours))) errors.push(`hours must be 0 to ${MAX_HOURS_A_WEEK}`);
    else Object.assign(out, { week: String(body.week), hours: Number(body.hours) });
  }
  if (body.active !== undefined) {
    if (!isWeek(body.active)) errors.push('active must be a week (YYYY-MM-DD)');
    else out.active = String(body.active);
  }
  if (body.milestones !== undefined) {
    const list = Array.isArray(body.milestones) ? body.milestones.map(String) : null;
    if (!list || list.length > 50 || list.some((k) => !MILESTONE.test(k))) errors.push('milestones must be a list of milestone keys');
    else out.milestones = list;
  }
  // From a phone that kept progress before it lived on the account (sent once, then forgotten there).
  if (body.merge !== undefined) {
    const m = body.merge || {};
    const weeks = Object.entries(m.weeks || {}).filter(([k, h]) => isWeek(k) && isHours(Number(h)));
    const active = (Array.isArray(m.activeWeeks) ? m.activeWeeks : []).filter(isWeek);
    const miles = Object.entries(m.milestones || {}).filter(([k, d]) => MILESTONE.test(k) && !Number.isNaN(new Date(d).getTime()));
    out.merge = { weeks: weeks.slice(-MAX_WEEKS), active: active.slice(-MAX_WEEKS), milestones: miles.slice(0, 50) };
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  return out;
}

// GET /api/progress
async function getProgress(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ progress: progressOf(user) });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/progress: any of
 * - { week, hours }: this week's hours bought back (a week keeps its highest; a slip lowers it on the server);
 * - { active: week }: you made a move this week (the streak);
 * - { milestones: [key] }: milestones reached; the reply's `fresh` lists the ones that are new;
 * - { merge }: progress a phone kept before it lived on the account (highest hours, union of the rest).
 */
async function updateProgress(req, res, next) {
  try {
    const data = sanitize(req.body);
    const { user, result: fresh } = await updateUser(req.userId, (u) => {
      const p = emptyProgress(u);
      if (data.week) p.weeks.set(data.week, Math.max(p.weeks.get(data.week) || 0, data.hours));
      if (data.active && !p.activeWeeks.includes(data.active)) p.activeWeeks.push(data.active);
      const added = [];
      const now = new Date();
      (data.milestones || []).forEach((k) => {
        if (!p.milestones.has(k)) {
          p.milestones.set(k, now);
          added.push(k);
        }
      });
      if (data.merge) {
        data.merge.weeks.forEach(([k, h]) => p.weeks.set(k, Math.max(p.weeks.get(k) || 0, Number(h))));
        p.activeWeeks.push(...data.merge.active);
        data.merge.milestones.forEach(([k, d]) => {
          const at = new Date(d);
          if (!p.milestones.has(k) || at < p.milestones.get(k)) p.milestones.set(k, at);
        });
      }
      trim(p);
      u.markModified('progress');
      return added;
    });
    res.json({ progress: progressOf(user), fresh });
  } catch (err) {
    next(err);
  }
}

/**
 * After a task slipped back: the latest week (if it's this week, give or take the phone's time zone)
 * drops to what's still bought back, so the weekly chart doesn't keep the old, higher number.
 * `hoursAWeek` is the user's live hours bought back a week.
 */
function lowerThisWeek(u, hoursAWeek) {
  const weeks = u.progress?.weeks;
  if (!weeks || !weeks.size) return;
  const latest = [...weeks.keys()].sort().pop();
  if (Date.now() - new Date(latest).getTime() > 8 * 24 * 60 * 60 * 1000) return;
  weeks.set(latest, Math.min(weeks.get(latest) || 0, hoursAWeek));
  u.markModified('progress');
}

module.exports = { getProgress, updateProgress, lowerThisWeek };
