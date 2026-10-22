// The handoff journey: a few defined steps to hand one draining task off. Each step saves into the
// task's handoff record as soon as it's done, so leaving halfway is fine: the journey (and the preview
// card on Home) pick up at the first step that isn't done.
import { formatMoney } from '../utils/format';

export const STEP_INFO = {
  how: { title: 'Choose how', icon: 'git-branch-outline' },
  done: { title: 'Write the brief', icon: 'document-text-outline' }, // 10-80-10: what done looks like, and how you'll check it
  who: { title: 'Find who', icon: 'person-outline' },
  handover: { title: 'Hand it over', icon: 'paper-plane-outline' },
  drop: { title: 'Stop doing it', icon: 'close-circle-outline' },
};

/** The steps for a way of handing off: dropping a task is one decision; the others need a little setup. */
export const journeySteps = (method) => (method === 'drop' ? ['how', 'drop'] : ['how', 'done', 'who', 'handover']);

const isDone = {
  how: (h) => Boolean(h.method),
  done: (h) => Boolean(h.doneLooksLike && h.checkHow),
  who: (h) => Boolean(h.who),
  handover: (h) => Boolean(h.startDate) && (h.status === 'in_progress' || h.status === 'done'),
  drop: (h) => h.status === 'done',
};

/** Where one handoff stands: its steps (each done or not), the current one, and how many are done. */
export function journeyOf(h) {
  const keys = journeySteps(h.method);
  const steps = keys.map((key) => ({ key, ...STEP_INFO[key], done: h.status === 'done' || isDone[key](h) }));
  const current = steps.find((s) => !s.done) || null;
  return { steps, current, doneCount: steps.filter((s) => s.done).length, finished: !current };
}

/** A one-line summary of a finished step, shown on its station. */
export function stepSummary(key, h, methodLabel) {
  if (key === 'how') return methodLabel;
  if (key === 'done') return `Done: ${h.doneLooksLike} · Check: ${h.checkHow}`;
  if (key === 'who') return h.who;
  if (key === 'handover') return h.startDate ? `From ${new Date(h.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : '';
  if (key === 'drop') return 'Off your list';
  return '';
}

// "Draft it for me": ready-made drafts (no AI yet; built so a real AI draft can replace them later).
export const DONE_DRAFT = {
  default: 'Finished the same day, checked for mistakes, and only problems come to me',
  automate: 'Runs every day without me, nothing gets missed, and I get an alert if it fails',
};

export const CHECK_DRAFT = {
  default: "I'll look at it every Friday for the first two weeks, then once a month",
  automate: "I'll check its alerts once a week",
};

export const TOOL_IDEAS = ['Zapier', 'Calendly', 'Google Calendar', 'QuickBooks', 'Gmail filters', 'Buffer', 'Mailchimp', 'Notion'];

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
  const when = start ? new Date(start).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'soon';
  const lines = [`Hi ${name}! From ${when}, ${task.activity.toLowerCase()} is yours.`];
  if (doneLooksLike) lines.push(`Done looks like: ${doneLooksLike}.`);
  if (checkHow) lines.push(`How I'll check it: ${checkHow}.`);
  lines.push("Everything in between is yours. Bring me anything you're unsure about in the first week. Thank you!");
  return lines.join(' ');
}
