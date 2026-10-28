// The weekly check-in: once a week (from Friday), did your handoffs stick, did you use your
// reinvested hours, and how did the week feel? Weeks are keyed by their Monday, on the phone's calendar.
import { TEST_MODE } from './testing';

export const FEELINGS = [
  { value: 1, emoji: '😫', label: 'Rough' },
  { value: 2, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '🙂', label: 'Good' },
  { value: 4, emoji: '😄', label: 'Great' },
];
export const feelingOf = (value) => FEELINGS.find((f) => f.value === value) || null;

const OPENS_ON = 5; // Friday (getDay: Sunday 0 … Saturday 6)
const pad = (n) => String(n).padStart(2, '0');

/** Monday of the date's week, as YYYY-MM-DD in local time. */
export function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Week of 13 Oct" for a week key. */
export function weekLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `Week of ${date.getDate()} ${date.toLocaleString('en', { month: 'short' })}`;
}

/** What there is to ask: your handed-off tasks and your reinvestments. */
export function checkInQuestions({ handoffs = [], fills = [] }) {
  return {
    // Each task once, even if the list ever holds it twice.
    handoffs: handoffs.filter((h, i) => h.status === 'done' && handoffs.findIndex((x) => x.activity.toLowerCase() === h.activity.toLowerCase()) === i),
    fills,
  };
}

/**
 * Where this week's check-in stands: 'none' (nothing handed off yet, so nothing to check),
 * 'done' (already checked in this week), 'due' (Friday to Sunday, not done yet), or 'soon'
 * (opens Friday; `daysToGo` says when).
 */
export function checkInStatus({ checkIns = [], handoffs = [], fills = [] }, now = new Date()) {
  const week = weekKey(now);
  const done = checkIns.find((c) => c.week === week) || null;
  const q = checkInQuestions({ handoffs, fills });
  if (done) return { state: 'done', week, entry: done };
  if (!q.handoffs.length && !q.fills.length && !checkIns.length) return { state: 'none', week };
  const day = now.getDay();
  if (TEST_MODE || day >= OPENS_ON || day === 0) return { state: 'due', week };
  return { state: 'soon', week, daysToGo: OPENS_ON - day };
}

/** Weeks in a row with a check-in, counting back from this week (or last week, if this one's still open). */
export function checkInStreak(checkIns = [], now = new Date()) {
  const weeks = new Set(checkIns.map((c) => c.week));
  const cursor = new Date(now);
  if (!weeks.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeks.has(weekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
