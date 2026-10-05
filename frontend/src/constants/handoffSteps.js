// The handoff checklist: how a draining task actually leaves your plate, step by step.
// The steps depend on how you hand it off (hire / team / automate / drop).

const STEP_LABELS = {
  how: 'Choose how',
  define: 'Define done',
  playbook: 'Write the playbook',
  handover: 'Hand it over',
  checkin: 'Check in after a week',
};

const AUTOMATE_LABELS = { playbook: 'List the setup steps', handover: 'Switch it on', checkin: 'Check it after a week' };
const DROP_LABELS = { checkin: 'Stop doing it' };

const isDone = {
  how: (h) => Boolean(h.plan && h.method),
  define: (h) => Boolean(h.doneLooksLike),
  playbook: (h) => (h.playbook || []).length > 0,
  handover: (h) => Boolean(h.who && h.startDate) || h.status === 'done',
  checkin: (h) => h.status === 'done',
};

/** [{ key, label, done }] for one handoff, in order. */
export function handoffSteps(item) {
  const keys = item.method === 'drop' ? ['how', 'checkin'] : ['how', 'define', 'playbook', 'handover', 'checkin'];
  const labels = { ...STEP_LABELS, ...(item.method === 'automate' ? AUTOMATE_LABELS : {}), ...(item.method === 'drop' ? DROP_LABELS : {}) };
  // Handed off is handed off: every step counts as done, even ones that were skipped.
  return keys.map((key) => ({ key, label: labels[key], done: item.status === 'done' || isDone[key](item) }));
}

/** The first step that isn't done yet, or null when the task is handed off. */
export const nextStep = (item) => handoffSteps(item).find((s) => !s.done) || null;

/** Check-in day: a week after the handover starts. */
export function checkInDate(item) {
  if (!item.startDate) return null;
  const d = new Date(item.startDate);
  d.setDate(d.getDate() + 7);
  return d;
}

/** True while a handed-over task is still in its first week (nothing to do but wait). */
export function waitingForCheckIn(item, now = new Date()) {
  const step = nextStep(item);
  const due = checkInDate(item);
  return step?.key === 'checkin' && item.method !== 'drop' && Boolean(due) && due > now;
}

// Tap-to-add help for each step.
export const DONE_EXAMPLES = {
  default: ['Finished the same day', 'Checked for mistakes before it goes out', 'Only problems come to me', 'Done the way I would do it'],
  automate: ['Runs every day without me', 'Nothing gets missed', 'I get an alert if it fails'],
};

export const PLAYBOOK_SUGGESTIONS = {
  default: [
    'List everything this task includes',
    'Share the logins and tools needed',
    'Show one example of it done well',
    'Say what they decide alone and what comes to me',
    'Agree how and when they report back',
  ],
  automate: [
    'Pick the tool',
    'Connect the accounts it needs',
    'Test it with one real example',
    'Set an alert in case it fails',
  ],
};

export const helpFor = (table, method) => (method === 'automate' ? table.automate : table.default);

/** Start-date choices for the handover. */
export function startOptions(now = new Date()) {
  const day = (offset) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  // On Sunday, tomorrow is already Monday, so "next Monday" is the one after.
  const daysToMonday = (8 - now.getDay()) % 7 || 7;
  const toMonday = daysToMonday === 1 ? 8 : daysToMonday;
  return [
    { key: 'today', label: 'Today', date: day(0) },
    { key: 'tomorrow', label: 'Tomorrow', date: day(1) },
    { key: 'monday', label: 'Next Monday', date: day(toMonday) },
  ];
}

export const formatDay = (date) =>
  new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const sameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();
