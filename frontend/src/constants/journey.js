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
const step = (kind, done = false) => ({ id: kind, kind, title: STEP_INFO[kind].title, done });

/** The suggested plan for a way of handing off: dropping is one decision; the others need a little setup. */
export const defaultSteps = (method) => (method === 'drop' ? [step('how'), step('drop')] : ['how', 'brief', 'who', 'handover'].map((k) => step(k)));

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
  const steps = plan.map((s) => ({ ...s, key: s.id, icon: STEP_INFO[s.kind]?.icon || STEP_INFO.custom.icon, done: h.status === 'done' || s.done }));
  const current = steps.find((s) => !s.done) || null;
  const doneCount = steps.filter((s) => s.done).length;
  return { steps, current, doneCount, finished: !current, started: doneCount > 0 || Boolean(h.steps?.length) };
}

/**
 * The plan after choosing how: dropping shortens it to How → Stop doing it; leaving drop brings the
 * suggested steps back; between other ways, your plan stays as it is. "How" comes back ticked.
 */
export function planForMethod(plan, method) {
  const wasDrop = plan.some((s) => s.kind === 'drop');
  let next = plan;
  if (method === 'drop' && !wasDrop) next = defaultSteps('drop');
  else if (method !== 'drop' && wasDrop) next = defaultSteps(method);
  return next.map((s) => (s.kind === 'how' ? { ...s, done: true } : s));
}

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
