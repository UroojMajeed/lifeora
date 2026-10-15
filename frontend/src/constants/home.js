// Home's "what now?" logic, built on the book's Buyback Loop: Audit → Transfer → Fill.
import { formatHours } from '../utils/format';
import { checkInDate, formatDay, nextStep, waitingForCheckIn } from './handoffSteps';
import { unfilledHours } from './fill';

export const WORKDAYS_PER_WEEK = 5;
export const WORKDAYS_PER_YEAR = 250; // 2,000 working hours ÷ 8 a day

export const LOOP_STEPS = [
  { key: 'audit', label: 'Audit', caption: 'See where time goes' },
  { key: 'transfer', label: 'Transfer', caption: 'Hand off what drains' },
  { key: 'fill', label: 'Fill', caption: 'Do what you love' },
];

/**
 * Every draining task is handed off or kept for the next round, and at least one was really handed
 * off (a round where everything is postponed hasn't bought anything back yet).
 */
const transferDone = (summary) =>
  Boolean(summary) && summary.done + (summary.later || 0) === summary.total && (summary.done > 0 || summary.total === 0);

/**
 * This lap of the Loop is finished: audited, everything transferred (or kept for later) and every
 * freed hour filled. Time for the next round's fresh audit.
 */
export function roundComplete({ schedule = [], summary }) {
  const audited = schedule.length > 0 && schedule.every((a) => a.energy);
  return audited && transferDone(summary) && unfilledHours(summary) < 0.25;
}

/** Where the user is in the Loop: { audit, transfer, fill } each 'done' | 'current' | 'next'. */
export function loopStatus({ schedule = [], summary }) {
  const audited = schedule.length > 0 && schedule.every((a) => a.energy);
  const transferred = audited && transferDone(summary);
  const filled = transferred && unfilledHours(summary) < 0.25;
  return {
    audit: audited ? 'done' : 'current',
    transfer: transferred ? 'done' : audited ? 'current' : 'next',
    fill: filled ? 'done' : transferred ? 'current' : 'next',
  };
}

/**
 * The one small thing to do today (Tiny Habits: make it easy and specific). Each move says where
 * it leads: `go` is [screen, params] for navigation.navigate.
 */
export function todaysMove({ schedule = [], handoffs = [], summary }) {
  const unsorted = schedule.filter((a) => !a.energy).length;
  if (unsorted) {
    return {
      stage: 'audit',
      icon: 'stats-chart',
      title: `Rate ${unsorted} new ${unsorted === 1 ? 'activity' : 'activities'}`,
      body: 'Rate each one: how much money it makes, and does it give you energy or drain it?',
      minutes: 1,
      cta: 'Rate now',
      go: ['Swipe', { editing: true }],
    };
  }

  // Transfer: the next checklist step of the first draining task that has something to do today.
  // (A task in its first week after handover just waits, so we move on to the next one.)
  const open = handoffs.filter((h) => h.status !== 'done' && h.status !== 'later');
  const next = open.find((h) => !waitingForCheckIn(h)) || open[0];
  if (next) {
    const name = next.activity.toLowerCase();
    const go = ['HandoffDetail', { activity: next.activity }];
    const hours = `${formatHours(next.hours)} a day`;
    const automate = next.method === 'automate';
    const MOVES = {
      how: {
        icon: 'bulb-outline',
        title: `Pick a plan for ${name}`,
        body: `It takes ${hours}. Choose how to buy it back: we have ideas ready.`,
        minutes: 2,
        cta: 'Pick a plan',
      },
      define: {
        icon: 'flag-outline',
        title: `Describe "done" for ${name}`,
        body: 'One line on what a good result looks like. Clear finish lines make handoffs stick.',
        minutes: 2,
        cta: 'Define done',
      },
      playbook: {
        icon: 'list-outline',
        title: automate ? `List the setup steps for ${name}` : `Write the playbook for ${name}`,
        body: automate
          ? 'Which tool, which accounts, how to test it. Tap our suggestions to start.'
          : 'The steps, tools and logins someone needs. Tap our suggestions to start.',
        minutes: 5,
        cta: automate ? 'List the steps' : 'Write the playbook',
      },
      handover: {
        icon: automate ? 'flash-outline' : 'paper-plane-outline',
        title: automate ? `Switch on the automation for ${name}` : `Hand ${name} over`,
        body: automate ? 'Name the tool and the day it starts running.' : 'Pick who takes it and the day they start.',
        minutes: 3,
        cta: automate ? 'Switch it on' : 'Hand it over',
      },
      checkin:
        next.method === 'drop'
          ? {
              icon: 'close-circle-outline',
              title: `Stop doing ${name}`,
              body: `Tell anyone who needs to know, then mark it as dropped and win back ${hours}.`,
              minutes: 2,
              cta: 'Mark it dropped',
            }
          : {
              icon: 'checkmark-done-outline',
              title: `Check in on ${name}`,
              body: waitingForCheckIn(next)
                ? `Started ${formatDay(next.startDate)}. On ${formatDay(checkInDate(next))}, check: is it running without you?`
                : `Is it running without you? Mark it handed off and win back ${hours}.`,
              minutes: 1,
              cta: 'Check in',
            },
    };
    return { stage: 'transfer', go, ...MOVES[nextStep(next)?.key || 'checkin'] };
  }

  // Every task is kept for later and none handed off: this round needs at least one.
  if (summary && !transferDone(summary)) {
    return {
      stage: 'transfer',
      icon: 'refresh-outline',
      title: 'Bring one task back for this round',
      body: 'Everything is kept for later, so nothing is bought back yet. Pick one draining task, even a small one, and hand it off now.',
      minutes: 1,
      cta: 'See my handoffs',
      go: ['Handoffs'],
    };
  }

  // Everything draining is handed off: give the freed hours a new, energizing job.
  const left = unfilledHours(summary);
  if (roundComplete({ schedule, summary })) {
    const round = summary?.round || 1;
    const bought = summary?.boughtBackHours || 0;
    return {
      stage: 'fill',
      icon: 'trophy-outline',
      title: summary?.total ? `Round ${round} complete` : 'Nothing drains you',
      body: bought
        ? `You bought back ${formatHours(bought * WORKDAYS_PER_WEEK)} a week and gave it a new job. Your routine has changed, so look at it again: new drains show up as you grow.`
        : 'Your routine changes as the business grows. Look at it again to find what drains you now.',
      minutes: 3,
      cta: `Start round ${round + 1}`,
      action: 'nextRound',
      go: ['Audit', { round: round + 1 }],
    };
  }
  if (left >= 0.25) {
    const filledSome = (summary?.filledHours || 0) > 0;
    return {
      stage: 'fill',
      icon: 'sunny-outline',
      title: `Give ${formatHours(left)} a day a new job`,
      body: filledSome
        ? 'Some of your freed time still has no job. Grow the business or invest in yourself.'
        : 'You bought this time back. Spend it on work you love, or on yourself, before it fills up with busywork.',
      minutes: 2,
      cta: 'Fill my time',
      go: ['Fill'],
    };
  }
  return {
    stage: 'fill',
    icon: 'shield-checkmark-outline',
    title: summary?.boughtBackHours ? 'Protect your filled hours' : 'Protect your best hours',
    body: summary?.boughtBackHours
      ? 'Every freed hour has a job. Guard that time like your most important meeting.'
      : 'Nothing in your routine drains you. Keep it that way as the business grows.',
    minutes: null,
    cta: summary?.boughtBackHours ? 'See my fills' : 'See my routine',
    go: summary?.boughtBackHours ? ['Fill'] : ['MyDay'],
  };
}

// One short Buyback idea a day (the book's principles, in our own words).
export const IDEAS = [
  "If a task drains you and someone can do it for your Buyback Rate or less, it shouldn't be yours.",
  'Start with the hours that drain you and cost the least to hand off. They pay you back fastest.',
  'Freed time only counts when you fill it with work that energizes you.',
  'Dropping a task is the fastest buyback of all. Ask: does this need doing?',
  "Don't wait until you're drowning to get help. Hire for the hours you want back.",
  'Your energy matters as much as your time. Notice which work gives it and which takes it.',
  'The first rung up is admin: inbox, calendar, invoices. Hand those off first.',
  'Describe what "done" looks like. Clear finish lines make handoffs stick.',
  'Guard your Production hours like your most important meeting.',
  'One hour a day bought back is about 250 hours a year.',
  "Paying for help at your Buyback Rate isn't a cost. It's buying your time back at a discount.",
  'Small handoffs add up. You never have to hand off everything at once.',
  'Plan your ideal week, then make each real week look a little more like it.',
  "Your business should give you energy, not take it. If it doesn't, change who does what.",
];

/** Today's idea: changes once a day, the same all day. */
export function ideaOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return IDEAS[day % IDEAS.length];
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
