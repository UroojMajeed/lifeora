// The handoff journey: a few defined steps to hand one draining task off. Each step saves into the
// task's handoff record as soon as it's done, so leaving halfway is fine: the journey (and the preview
// card on Home) pick up at the first step that isn't done.
import { formatMoney } from '../utils/format';

// What each kind of step is: its suggested name and icon. 'custom' is a step the user adds.
export const STEP_INFO = {
  how: { title: 'Choose how', icon: 'git-branch-outline' },
  brief: { title: 'Write the brief', icon: 'document-text-outline' }, // 10-80-10: what done looks like, and how you'll check it
  who: { title: 'Find who', icon: 'person-outline' },
  handover: { title: 'Hand it over', icon: 'paper-plane-outline' },
  drop: { title: 'Stop doing it', icon: 'close-circle-outline' },
  custom: { title: 'My step', icon: 'checkbox-outline' },
};

// Steps the user can add in one tap.
export const STEP_PICKS = ['Record a short video', 'Share the logins', 'Do it together once', 'Trial week', 'Check in after a week'];
export const MAX_PLAN_STEPS = 10;
export const isFinish = (s) => s.kind === 'handover' || s.kind === 'drop';

let seq = 0;
export const newStepId = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`.slice(0, 24);
const step = (kind, title) => ({ id: kind, kind, title: title || STEP_INFO[kind].title, done: false });

/**
 * The suggested road for each way of handing off: dropping is one decision; automating is setting
 * the tool up and switching it on (no brief: a tool has no "80%" to own); delegating needs the brief,
 * someone to take it, and the handover.
 */
export const defaultSteps = (method) =>
  method === 'drop'
    ? [step('how'), step('drop')]
    : method === 'automate'
      ? [step('how'), step('who', 'Set it up'), step('handover', 'Switch it on')]
      : ['how', 'brief', 'who', 'handover'].map((k) => step(k));
const roadOf = (method) => (method === 'drop' || method === 'automate' ? method : 'delegate');

/** Handed off, but its start day is still ahead: its hours count from that day. */
export const startsLater = (h, now = new Date()) => h.status === 'done' && Boolean(h.startDate) && new Date(h.startDate) > now;

// Handoffs from before plans existed: a step was done once its answer was saved.
const legacyDone = {
  how: (h) => Boolean(h.method),
  brief: (h) => Boolean(h.doneLooksLike && h.checkHow),
  who: (h) => Boolean(h.who),
  handover: (h) => Boolean(h.startDate) && (h.status === 'in_progress' || h.status === 'done'),
  drop: (h) => h.status === 'done',
};

/** The plan for one handoff: the user's own steps, or the suggested ones (ticked as far as they got). */
export function planOf(h) {
  if (h.steps?.length) return h.steps.map((s) => ({ ...s }));
  return defaultSteps(h.method).map((s) => ({ ...s, done: legacyDone[s.kind](h) }));
}

/** Where one handoff stands: its steps (each done or not), the current one, and how many are done. */
export function journeyOf(h) {
  const plan = planOf(h);
  const finished = h.status === 'done';
  const steps = plan.map((s) => ({ ...s, key: s.id, icon: STEP_INFO[s.kind]?.icon || STEP_INFO.custom.icon, done: finished || (s.done && !isFinish(s)) }));
  const current = steps.find((s) => !s.done) || null;
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, current, doneCount, finished: !current, started: doneCount > 0 || Boolean(h.steps?.length) };
}

/**
 * The plan after choosing how. A different kind of road (drop, automate, delegate) brings that road's
 * suggested steps, keeping any steps you added yourself; another way on the same road keeps your plan
 * as it is. "How" comes back ticked. `prev` is the way chosen before (none yet: the delegate road).
 */
export function planForMethod(plan, method, prev) {
  const before = plan.some((s) => s.kind === 'drop') ? 'drop' : roadOf(prev);
  let next = plan;
  if (roadOf(method) !== before) {
    const road = defaultSteps(method);
    const own = plan.filter((s) => s.kind === 'custom');
    next = [...road.slice(0, -1), ...own, road[road.length - 1]];
  }
  return next.map((s) => (s.kind === 'how' ? { ...s, done: true } : s));
}

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

// Always true or false (never null): it feeds accessibilityState, which Android only accepts as a boolean.
export const sameDay = (a, b) => Boolean(a && b) && new Date(a).toDateString() === new Date(b).toDateString();

/** A one-line summary of a finished step, shown on its station. */
export function stepSummary(kind, h, methodLabel) {
  if (kind === 'how') return methodLabel || 'Done';
  if (kind === 'brief') return h.doneLooksLike ? `Done: ${h.doneLooksLike}${h.checkHow ? ` · Check: ${h.checkHow}` : ''}` : 'Done';
  if (kind === 'who') return h.who || 'Done';
  if (kind === 'handover') return h.startDate ? `From ${new Date(h.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : 'Handed over';
  if (kind === 'drop') return 'Off your list';
  return 'Done';
}

export const DONE_DRAFT = {
  default: 'Finished the same day, checked for mistakes, and only problems come to me',
  automate: 'Runs every day without me, nothing gets missed, and I get an alert if it fails',
};

export const CHECK_DRAFT = {
  default: "I'll look at it every Friday for the first two weeks, then once a month",
  automate: "I'll check its alerts once a week",
};

export const TOOL_IDEAS = ['Zapier', 'Calendly', 'Google Calendar', 'QuickBooks', 'Gmail filters', 'Buffer', 'Mailchimp', 'Notion'];

// Real setup steps for the tools on the chips. Matched by name, so "Gmail filters" and "gmail" both work.
const RECIPES = [
  {
    match: 'zapier',
    minutes: 15,
    steps: [
      'Sign in at zapier.com and create a new Zap',
      'Pick the trigger: the app and the event that starts it (a new form entry, a new email)',
      'Add the action: what should happen in the other app',
      'Test each step with a real example, then switch the Zap on',
      'After a week, look at the Zap history for errors',
    ],
  },
  {
    match: 'calendly',
    minutes: 10,
    steps: [
      'Connect your calendar so busy times are blocked',
      'Set the hours you take meetings, with a buffer between them',
      'Create an event type (a 30-minute call) and the questions you need answered',
      'Send your link instead of trading emails about times',
      'Turn on email reminders so people show up',
    ],
  },
  {
    match: 'google calendar',
    minutes: 10,
    steps: [
      'In Google Calendar, tap Create, then Appointment schedule',
      'Set how long a meeting is and the hours you are open',
      'Share the booking page link wherever people ask for your time',
      'Block your focus time as a repeating event so it stays free',
      'Set default reminders for new events',
    ],
  },
  {
    match: 'quickbooks',
    minutes: 20,
    steps: [
      'Connect your bank and card accounts',
      'Add bank rules so regular payments sort themselves into the right category',
      'Set up recurring invoices for clients you bill every month',
      'Turn on automatic payment reminders for invoices',
      'Once a week, review anything left uncategorized',
    ],
  },
  {
    match: 'gmail',
    minutes: 5,
    steps: [
      'In Gmail, search for the emails you want handled (a sender, a subject)',
      'Open the search options at the end of the search bar, then Create filter',
      'Pick what happens: add a label, skip the inbox, mark as read or forward',
      'Tick "Also apply filter to matching conversations"',
      'Check it again in a week: anything missed?',
    ],
  },
  {
    match: 'buffer',
    minutes: 15,
    steps: [
      'Connect your social accounts',
      'Set your posting schedule: which days and times',
      'Write a week of posts in one sitting and add them to the queue',
      'Let the queue post for you on schedule',
      'Once a week, look at what worked and plan the next batch',
    ],
  },
  {
    match: 'mailchimp',
    minutes: 20,
    steps: [
      'Import your contacts into an audience',
      'Create an automation, like a welcome email for new subscribers',
      'Write the emails once',
      'Send a test to yourself, then switch it on',
      'After a week, check opens and unsubscribes',
    ],
  },
  {
    match: 'notion',
    minutes: 15,
    steps: [
      'Make one page for the task: the steps, links and logins',
      'Turn the repeating part into a template (or a database with a repeating template)',
      'Share it with whoever needs it',
      'Add dates with reminders so nothing slips',
      'Review it once a month and update what changed',
    ],
  },
];
const ANY_TOOL = {
  minutes: 10,
  steps: ["Set it up with the tool's own quick start", 'Test it once with a real example', 'Turn on alerts so you hear when it fails', 'Check it after a week: anything missed?'],
};

/** How to set up the tool that will do a task: its recipe, a general one for any other tool, or null with no tool yet. */
export function recipeFor(tool) {
  const name = String(tool || '').trim().toLowerCase();
  if (!name) return null;
  return RECIPES.find((r) => name.includes(r.match)) || ANY_TOOL;
}

/** A job post for a task, priced at the user's Buyback Rate. */
export function jobPostDraft({ task, doneLooksLike, rate, currency }) {
  const lines = [`Looking for help with ${task.activity.toLowerCase()}: about ${Math.round(task.hours * 5 * 10) / 10} h a week.`];
  if (doneLooksLike) lines.push('', `Done looks like: ${doneLooksLike}.`);
  if (rate) lines.push('', `Budget: up to ${formatMoney(rate, currency)}/hr.`);
  return lines.join('\n');
}

/** A short, friendly handover message to send to whoever takes it. */
export function handoverDraft({ task, who, doneLooksLike, checkHow, start }) {
  const name = who && !/^(zapier|calendly|google|quickbooks|gmail|buffer|mailchimp|notion)/i.test(who) ? who.split(' ')[0] : 'there';
  const when = start ? `From ${new Date(start).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}` : 'Soon';
  const lines = [`Hi ${name}! ${when}, ${task.activity.toLowerCase()} is yours.`];
  if (doneLooksLike) lines.push(`Done looks like: ${doneLooksLike}.`);
  if (checkHow) lines.push(`How I'll check it: ${checkHow}.`);
  lines.push("Everything in between is yours. Bring me anything you're unsure about in the first week. Thank you!");
  return lines.join(' ');
}
