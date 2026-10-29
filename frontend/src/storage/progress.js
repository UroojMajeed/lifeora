import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

// Progress that follows you to a new phone, kept with your account: hours bought back week by week,
// the weeks you made a move (a gentle streak: missing a week simply starts a new one), and the
// milestones already celebrated (storage/milestones.js). Only "what Home last showed" and the
// "Not now" to saving stay on this phone.
const SEEN_KEY = 'lifeora.lastBoughtBack';
const SAVE_ASK_KEY = 'lifeora.saveAskDismissed';
// Where this phone kept progress before it lived on the account: sent up once, then removed.
const LEGACY_WEEKS_KEY = 'lifeora.activeWeeks';
const LEGACY_HISTORY_KEY = 'lifeora.boughtBackByWeek';
export const LEGACY_MILESTONES_KEY = 'lifeora.milestones';

/** Monday of the date's week, as YYYY-MM-DD in local time. */
export function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const readJson = async (key, fallback) => {
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
};

// The last progress the server sent (so a moment offline still shows something), and the one-time move up.
let cache = { weeks: {}, activeWeeks: [], milestones: {} };
let moved = null;

/** Sends what this phone kept before progress lived on the account, once; then forgets it here. */
function moveLegacyUp() {
  if (!moved) {
    moved = (async () => {
      const [weeks, activeWeeks, milestones] = await Promise.all([
        readJson(LEGACY_HISTORY_KEY, {}),
        readJson(LEGACY_WEEKS_KEY, []),
        readJson(LEGACY_MILESTONES_KEY, {}),
      ]);
      if (Object.keys(weeks).length || activeWeeks.length || Object.keys(milestones).length) {
        const res = await api.updateProgress({ merge: { weeks, activeWeeks, milestones } });
        cache = res.progress;
      }
      await AsyncStorage.multiRemove([LEGACY_HISTORY_KEY, LEGACY_WEEKS_KEY, LEGACY_MILESTONES_KEY]);
    })().catch(() => {
      moved = null; // try again next time
    });
  }
  return moved;
}

/** The account's progress: { weeks: { [week]: hours }, activeWeeks, milestones: { [key]: date } }. */
export async function loadProgress() {
  await moveLegacyUp();
  try {
    cache = (await api.getProgress()).progress;
  } catch {
    // offline: the last known progress
  }
  return cache;
}

/** Saves a change (see PATCH /api/progress) and returns the server's reply ({ progress, fresh }). */
export async function updateProgress(patch) {
  await moveLegacyUp();
  const res = await api.updateProgress(patch);
  cache = res.progress;
  return res;
}

// This week is marked once per app session (the server ignores repeats anyway).
let markedWeek = null;
/** Marks this week as active. Safe to call often. */
export function recordMove() {
  const week = weekKey();
  if (markedWeek === week) return;
  markedWeek = week;
  updateProgress({ active: week }).catch(() => {
    markedWeek = null;
  });
}

/**
 * { weeks, thisWeek }: how many weeks in a row had a move. A streak stays alive through the
 * current week until it ends, so last week's streak still shows on Monday morning.
 */
export async function loadStreak() {
  const active = new Set((await loadProgress()).activeWeeks);
  const cursor = new Date();
  const thisWeek = active.has(weekKey(cursor));
  if (!thisWeek) cursor.setDate(cursor.getDate() - 7);
  let weeks = 0;
  while (active.has(weekKey(cursor))) {
    weeks += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return { weeks, thisWeek };
}

/**
 * Compares the hours bought back with what Home showed last time and remembers the new value.
 * Returns true when it went up, so Home can celebrate.
 */
export async function noticeBoughtBack(hours) {
  try {
    const before = await AsyncStorage.getItem(SEEN_KEY);
    await AsyncStorage.setItem(SEEN_KEY, String(hours));
    return before !== null && hours > Number(before);
  } catch {
    return false;
  }
}

/**
 * Notes this week's hours bought back (a week keeps its highest; a slip lowers it on the server).
 * Returns the last `count` weeks, oldest first, and `totalHours`: every week so far added up.
 * `confirmed` ({ [week]: hours }, from weekly check-ins) replaces the estimate for those weeks.
 */
export async function recordWeeklyBoughtBack(hoursAWeek, count = 5, confirmed = {}) {
  const now = weekKey();
  let saved = cache.weeks;
  try {
    saved = (await updateProgress({ week: now, hours: Math.round(hoursAWeek * 100) / 100 })).progress.weeks;
  } catch {
    saved = { ...cache.weeks, [now]: Math.max(cache.weeks[now] || 0, hoursAWeek) }; // offline: show it anyway
  }
  const hoursFor = { ...saved, ...confirmed };
  // The last `count` weeks up to this one, with empty weeks as 0.
  const weeks = [];
  const cursor = new Date();
  for (let i = 0; i < count; i += 1) {
    const k = weekKey(cursor);
    weeks.unshift({ key: k, hours: hoursFor[k] || 0, now: i === 0, confirmed: k in confirmed });
    cursor.setDate(cursor.getDate() - 7);
  }
  const totalHours = Object.values(hoursFor).reduce((t, x) => t + (Number(x) || 0), 0);
  return { weeks, totalHours };
}

/** Every week's hours bought back added up (for Me's next milestone). */
export async function boughtBackTotalHours() {
  const { weeks } = await loadProgress();
  return Object.values(weeks).reduce((t, x) => t + (Number(x) || 0), 0);
}

// Whether a guest said "Not now" to saving their progress (asked once, after a handoff).
export async function saveAskDismissed() {
  try {
    return (await AsyncStorage.getItem(SAVE_ASK_KEY)) === '1';
  } catch {
    return false;
  }
}
export function dismissSaveAsk() {
  return AsyncStorage.setItem(SAVE_ASK_KEY, '1').catch(() => {});
}

/** Forgets what this phone keeps (sign out, start over). The account's progress stays with the account. */
export function clearProgress() {
  cache = { weeks: {}, activeWeeks: [], milestones: {} };
  moved = null;
  markedWeek = null;
  return AsyncStorage.multiRemove([SEEN_KEY, SAVE_ASK_KEY, LEGACY_WEEKS_KEY, LEGACY_HISTORY_KEY, LEGACY_MILESTONES_KEY]).catch(() => {});
}
