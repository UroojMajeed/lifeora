// Milestones worth celebrating (and sharing): hours bought back, what they're worth, and rounds of
// the Buyback Loop finished. A short list on purpose, so each one still feels special.
import { formatMoney } from '../utils/format';

const HOURS = [10, 50, 100];
const MONEY = [1000, 5000];

/** Every milestone, in the order they're shown on Me. `reached(t)` checks the totals. */
export function milestoneList(currency = 'USD') {
  const money = (n) => formatMoney(n, currency, { decimals: 0 });
  return [
    ...HOURS.map((n) => ({
      key: `hours-${n}`,
      icon: 'time',
      badge: `${n} h`,
      title: `${n} hours bought back`,
      share: `I bought back ${n} hours of my time with Lifeora 🎉`,
      reached: (t) => t.hours >= n,
    })),
    ...MONEY.map((n) => ({
      key: `money-${n}`,
      icon: 'wallet',
      badge: money(n),
      title: `${money(n)} of your time back`,
      share: `I bought back ${money(n)} worth of my time with Lifeora 🎉`,
      reached: (t) => t.money >= n,
    })),
  ];
}

/** Rounds of the Loop finished: round 1 is done once round 2 starts. */
export const roundMilestone = (round) => ({
  key: `round-${round}`,
  icon: 'refresh',
  badge: `Round ${round}`,
  title: `Round ${round} complete`,
  share: `I finished round ${round} of buying back my time with Lifeora 🎉`,
});

/**
 * Everything reached for these totals ({ hours, money, round }), rounds included, newest-looking
 * last (so the last one is the one to celebrate when several arrive at once).
 */
export function reachedMilestones(totals, currency) {
  const list = milestoneList(currency).filter((m) => m.reached(totals));
  for (let r = 1; r < (totals.round || 1); r += 1) list.push(roundMilestone(r));
  return list;
}

/** The next one still ahead (for the greyed badge on Me), or null. */
export const nextMilestone = (totals, currency) => milestoneList(currency).find((m) => !m.reached(totals)) || null;

/** The line under a milestone's title: what it means. */
export function milestoneLine(m, { hourWorth, currency }) {
  if (m.key.startsWith('hours-') && hourWorth) {
    const n = Number(m.key.split('-')[1]);
    return `That's ${formatMoney(n * hourWorth, currency, { decimals: 0 })} of your time, back for the work you love.`;
  }
  if (m.key.startsWith('round-')) return 'You audited, handed off and reinvested. Time for a fresh look.';
  return 'Time you bought back, for the work and life you love.';
}
