// Milestones worth celebrating (and sharing): hours bought back, and rounds of the Buyback Loop
// finished. The app is about freeing hours, so milestones count hours, never money.

const HOURS = [10, 25, 50, 100, 250];

/** Every hours milestone, in the order they're shown on Me. `reached(t)` checks the totals. */
export function milestoneList() {
  return HOURS.map((n) => ({
    key: `hours-${n}`,
    icon: 'time',
    badge: `${n} h`,
    title: `${n} hours bought back`,
    share: `I bought back ${n} hours of my time with Lifeora 🎉`,
    reached: (t) => t.hours >= n,
  }));
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
 * Everything reached for these totals ({ hours, round }), rounds included, newest-looking last (so
 * the last one is the one to celebrate when several arrive at once).
 */
export function reachedMilestones(totals) {
  const list = milestoneList().filter((m) => m.reached(totals));
  for (let r = 1; r < (totals.round || 1); r += 1) list.push(roundMilestone(r));
  return list;
}

/** The next one still ahead (for the greyed badge on Me), or null. */
export const nextMilestone = (totals) => milestoneList().find((m) => !m.reached(totals)) || null;

/** The line under a milestone's title: what it means, in workdays (8 hours each). */
export function milestoneLine(m) {
  if (m.key.startsWith('hours-')) {
    const days = Number(m.key.split('-')[1]) / 8;
    const said = Number.isInteger(days) ? days : Math.round(days * 10) / 10;
    return `That's ${said} workdays back, for the work and life you love.`;
  }
  if (m.key.startsWith('round-')) return 'You audited, handed off and reinvested. Time for a fresh look.';
  return 'Time you bought back, for the work and life you love.';
}
