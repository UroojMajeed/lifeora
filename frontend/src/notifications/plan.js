// What to remind you of, and when: one plain function, so the phone can always re-plan from scratch
// (cancel everything, schedule this list) whenever your handoffs, check-ins or settings change.
// Calm by design: never at night, never more than one a day, a stuck handoff at most once a week.
import { weekKey } from '../constants/checkin';
import { journeyOf, startsLater } from '../constants/journey';

export const DEFAULT_REMINDERS = { checkIn: true, checkInDay: 5, checkInHour: 17, startDay: true, nudges: true };
export const CHECK_IN_DAYS = [5, 6, 0]; // the check-in is open Friday to Sunday
export const CHECK_IN_HOURS = [9, 12, 17, 19];
const START_HOUR = 9;
const NUDGE_HOUR = 18;
const NUDGE_AFTER_DAYS = 3;
const NUDGE_EVERY_DAYS = 7;
const CHECK_IN_WEEKS_AHEAD = 4; // so the reminder still comes if the app isn't opened for a while
const MAX_SCHEDULED = 20;
const PRIORITY = { checkIn: 3, startDay: 2, nudge: 1 };

const DAY = 24 * 60 * 60 * 1000;
const at = (date, hour) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0, 0);
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n, date.getHours(), date.getMinutes());
const h = (n) => `${Math.round(n * 10) / 10} h`;

// What each kind of reminder says and opens (the real ones and the test ones use the same words).
const checkInText = () => ({ title: 'Your weekly check-in is ready', body: 'Did your handoffs stick? About 2 minutes.', data: { screen: 'CheckIn' } });
function startDayText(task) {
  const name = task.activity.toLowerCase();
  const automate = task.method === 'automate';
  const who = task.who || (automate ? 'Your automation' : 'Your helper');
  return {
    title: automate ? `${who} takes over ${name} today` : `${who} starts on ${name} today`,
    body: `Your ${h(task.hours * 5)} a week begin today.`,
    data: { screen: 'HandoffJourney', params: { activity: task.activity } },
  };
}
function nudgeText(task) {
  const { steps, current, doneCount } = journeyOf(task);
  const left = Math.max(1, steps.length - doneCount);
  return {
    title: `${task.activity}: ${left === 1 ? 'one step' : `${left} steps`} from off your plate`,
    body: `Next: ${current?.title || 'Hand it over'}. It frees ${h(task.hours * 5)} a week.`,
    data: { screen: 'HandoffJourney', params: { activity: task.activity } },
  };
}

/**
 * Testing: one reminder of each kind, worded from your own tasks, to send now. A kind with no task
 * to be about (e.g. nothing handed off yet) borrows any task, so all three can always be seen.
 */
export function sampleReminders(handoffs = []) {
  const open = handoffs.filter((x) => x.status === 'mine' || x.status === 'in_progress');
  const starting = handoffs.find((x) => startsLater(x)) || handoffs.find((x) => x.status === 'done') || handoffs[0];
  const stuck = open.find((x) => journeyOf(x).doneCount) || open[0] || handoffs[0];
  return [
    { id: 'test-checkin', kind: 'checkIn', ...checkInText() },
    starting ? { id: 'test-start', kind: 'startDay', ...startDayText(starting) } : null,
    stuck ? { id: 'test-nudge', kind: 'nudge', ...nudgeText(stuck) } : null,
  ].filter(Boolean);
}

/** The next `hour` o'clock that's still ahead of `now` (today or tomorrow). */
const nextAt = (now, hour) => {
  const today = at(now, hour);
  return today > now ? today : addDays(today, 1);
};

/**
 * The reminders to schedule, soonest first: [{ id, kind, date, title, body, data: { screen, params } }].
 * `nudgedAt` ({ [activity]: date }) is when each stuck handoff was last nudged.
 */
export function planReminders({ handoffs = [], checkIns = [], reminders = {}, nudgedAt = {}, now = new Date() }) {
  const r = { ...DEFAULT_REMINDERS, ...reminders };
  const list = [];

  // The weekly check-in: on your day and hour, for the next few weeks, skipping a week already done.
  const somethingToCheck = handoffs.some((x) => x.status === 'done' && !startsLater(x, now));
  if (r.checkIn && somethingToCheck) {
    const done = new Set(checkIns.map((c) => c.week));
    let date = at(now, r.checkInHour);
    while (date.getDay() !== r.checkInDay || date <= now) date = addDays(date, 1);
    for (let i = 0; i < CHECK_IN_WEEKS_AHEAD; i += 1, date = addDays(date, 7)) {
      if (done.has(weekKey(date))) continue;
      list.push({ id: `checkin-${weekKey(date)}`, kind: 'checkIn', date, ...checkInText() });
    }
  }

  handoffs.forEach((task) => {
    // A handover's start day: the morning it begins.
    if (r.startDay && startsLater(task, now)) {
      list.push({ id: `start-${task.activity}`, kind: 'startDay', date: at(new Date(task.startDate), START_HOUR), ...startDayText(task) });
    }

    // A handoff you started but haven't moved on for a few days: a gentle nudge, at most weekly.
    if (r.nudges && (task.status === 'mine' || task.status === 'in_progress')) {
      const { steps, current, doneCount } = journeyOf(task);
      if (!current || (!doneCount && !task.cameBackAt)) return;
      const times = [...steps.map((s) => s.doneAt), task.cameBackAt].filter(Boolean).map((d) => new Date(d).getTime());
      if (!times.length) return;
      let date = at(new Date(Math.max(...times) + NUDGE_AFTER_DAYS * DAY), NUDGE_HOUR);
      if (nudgedAt[task.activity]) {
        const again = at(new Date(new Date(nudgedAt[task.activity]).getTime() + NUDGE_EVERY_DAYS * DAY), NUDGE_HOUR);
        if (again > date) date = again;
      }
      if (date <= now) date = nextAt(now, NUDGE_HOUR);
      list.push({ id: `nudge-${task.activity}`, kind: 'nudge', date, ...nudgeText(task) });
    }
  });

  // One a day at most: the most important wins (check-in, then a start day, then a nudge).
  const byDay = new Map();
  list
    .filter((n) => n.date > now)
    .sort((a, b) => a.date - b.date)
    .forEach((n) => {
      const day = n.date.toDateString();
      const kept = byDay.get(day);
      if (!kept || PRIORITY[n.kind] > PRIORITY[kept.kind]) byDay.set(day, n);
    });
  return [...byDay.values()].sort((a, b) => a.date - b.date).slice(0, MAX_SCHEDULED);
}
