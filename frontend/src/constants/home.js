// Home's "what now?" logic, built on the book's Buyback Loop: Audit → Transfer → Fill.
import { formatHours } from '../utils/format';

export const WORKDAYS_PER_WEEK = 5;
export const WORKDAYS_PER_YEAR = 250; // 2,000 working hours ÷ 8 a day

export const LOOP_STEPS = [
  { key: 'audit', label: 'Audit', caption: 'See where time goes' },
  { key: 'transfer', label: 'Transfer', caption: 'Hand off what drains' },
  { key: 'fill', label: 'Fill', caption: 'Do what you love' },
];

/** Where the user is in the Loop: { audit, transfer, fill } each 'done' | 'current' | 'next'. */
export function loopStatus({ schedule = [], summary }) {
  const audited = schedule.length > 0 && schedule.every((a) => a.energy);
  const transferred = audited && Boolean(summary) && summary.done === summary.total;
  return {
    audit: audited ? 'done' : 'current',
    transfer: transferred ? 'done' : audited ? 'current' : 'next',
    fill: transferred ? 'current' : 'next',
  };
}

const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * The one small thing to do today (Tiny Habits: make it easy and specific). Each move says where
 * it leads: `go` is [screen, params] for navigation.navigate.
 */
export function todaysMove({ schedule = [], handoffs = [], summary }) {
  const unsorted = schedule.filter((a) => !a.energy).length;
  if (unsorted) {
    return {
      stage: 'audit',
      icon: 'swap-horizontal',
      title: `Sort ${unsorted} new ${unsorted === 1 ? 'activity' : 'activities'}`,
      body: 'Swipe each one: does it give you energy or drain it?',
      minutes: 1,
      cta: 'Swipe now',
      go: ['Swipe', { editing: true }],
    };
  }

  const next = handoffs.find((h) => h.status !== 'done');
  if (next) {
    const name = next.activity.toLowerCase();
    const go = ['HandoffDetail', { activity: next.activity }];
    const hours = `${formatHours(next.hours)} a day`;
    if (!next.plan) {
      return {
        stage: 'transfer',
        icon: 'bulb-outline',
        title: `Pick a plan for ${name}`,
        body: `It takes ${hours}. Choose how to buy it back: we have ideas ready.`,
        minutes: 2,
        cta: 'Pick a plan',
        go,
      };
    }
    if (next.method !== 'drop' && !next.who) {
      return {
        stage: 'transfer',
        icon: 'person-add-outline',
        title: `Decide who takes ${name}`,
        body: `Your plan: ${lower(next.plan).replace(/[.!]+$/, '')}. Write down a name, a tool or a role.`,
        minutes: 2,
        cta: 'Choose who',
        go,
      };
    }
    if (next.method === 'drop') {
      return {
        stage: 'transfer',
        icon: 'close-circle-outline',
        title: `Stop doing ${name}`,
        body: `Tell anyone who needs to know, then mark it as handed off and win back ${hours}.`,
        minutes: 2,
        cta: 'Mark it done',
        go,
      };
    }
    if (next.status === 'mine') {
      return {
        stage: 'transfer',
        icon: 'paper-plane-outline',
        title: `Start handing off ${name}`,
        body: 'Send the first message, set up the tool or brief your teammate. Then mark it as handing off.',
        minutes: 5,
        cta: 'Start now',
        go,
      };
    }
    return {
      stage: 'transfer',
      icon: 'checkmark-done-outline',
      title: `Finish handing off ${name}`,
      body: `Once it runs without you, mark it as handed off and win back ${hours}.`,
      minutes: 2,
      cta: 'Mark as handed off',
      go,
    };
  }

  // Everything draining is handed off (or nothing drains): Fill the freed hours with Production work.
  const production = schedule
    .filter((a) => a.quadrant === 'production')
    .sort((a, b) => b.hours - a.hours)[0];
  const freed = summary?.boughtBackPerWeek || 0;
  return {
    stage: 'fill',
    icon: 'sunny-outline',
    title: freed ? `Fill your ${formatHours(freed)} a week` : 'Protect your best hours',
    body: production
      ? `Put the time into ${production.activity.toLowerCase()}: the work that energizes you and grows the business.`
      : 'Put the time into work that energizes you and grows the business.',
    minutes: null,
    cta: 'Plan my day',
    go: ['MyDay'],
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
