import AsyncStorage from '@react-native-async-storage/async-storage';

// Gentle weekly streak + "what Home last showed", kept on this phone.
// A week counts when you make at least one move (a handoff step or sorting your day).
// Missing a week simply starts a new streak: no penalties, no guilt.
const WEEKS_KEY = 'lifeora.activeWeeks';
const SEEN_KEY = 'lifeora.lastBoughtBack';
const MAX_WEEKS = 104;

/** Monday of the date's week, as YYYY-MM-DD in local time. */
function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function readWeeks() {
  try {
    const list = JSON.parse((await AsyncStorage.getItem(WEEKS_KEY)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Marks this week as active. Safe to call often. */
export async function recordMove() {
  const weeks = await readWeeks();
  const now = weekKey();
  if (weeks.includes(now)) return;
  await AsyncStorage.setItem(WEEKS_KEY, JSON.stringify([...weeks, now].slice(-MAX_WEEKS))).catch(() => {});
}

/**
 * { weeks, thisWeek }: how many weeks in a row had a move. A streak stays alive through the
 * current week until it ends, so last week's streak still shows on Monday morning.
 */
export async function loadStreak() {
  const active = new Set(await readWeeks());
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

/** Forget everything (used by "Start over"). */
export function clearProgress() {
  return AsyncStorage.multiRemove([WEEKS_KEY, SEEN_KEY]).catch(() => {});
}
