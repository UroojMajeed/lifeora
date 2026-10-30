// Home's "what now?": the one move it shows, and where you are in the Buyback Loop.
import { loopStatus, todaysMove } from '../src/constants/home';
import { dayNow, scheduleNow, unfilledHours } from '../src/constants/fill';
import { formatHours, sanitizeAmount } from '../src/utils/format';

const schedule = [
  { activity: 'Client calls', hours: 2, energy: 'energizing', quadrant: 'production' },
  { activity: 'Email inbox', hours: 1.5, energy: 'draining', quadrant: 'delegation' },
];
const summary = (over = {}) => ({ done: 0, total: 1, later: 0, boughtBackHours: 0, filledHours: 0, round: 1, ...over });

describe('todaysMove', () => {
  test('unrated tasks come first', () => {
    const move = todaysMove({ schedule: [...schedule, { activity: 'New', hours: 1, energy: null }], handoffs: [], summary: summary() });
    expect(move).toMatchObject({ stage: 'audit', title: 'Rate 1 new activity' });
  });

  test('then the next step of the first task still yours', () => {
    const handoffs = [{ activity: 'Email inbox', hours: 1.5, status: 'mine', method: null }];
    const move = todaysMove({ schedule, handoffs, summary: summary() });
    expect(move).toMatchObject({ stage: 'transfer', title: 'Pick a plan for email inbox', go: ['HandoffJourney', { activity: 'Email inbox' }] });
  });

  test('then give the freed hours a new job', () => {
    const handoffs = [{ activity: 'Email inbox', hours: 1.5, status: 'done' }];
    const move = todaysMove({ schedule, handoffs, summary: summary({ done: 1, boughtBackHours: 1.5 }) });
    expect(move).toMatchObject({ stage: 'fill', go: ['Fill'] });
  });

  test('once every freed hour has a job, the round is complete', () => {
    const handoffs = [{ activity: 'Email inbox', hours: 1.5, status: 'done' }];
    const move = todaysMove({ schedule, handoffs, summary: summary({ done: 1, boughtBackHours: 1.5, filledHours: 1.5 }) });
    expect(move).toMatchObject({ action: 'nextRound', cta: 'Start round 2' });
  });
});

describe('loopStatus', () => {
  test('audit → transfer → fill', () => {
    expect(loopStatus({ schedule: [], summary: summary() })).toEqual({ audit: 'current', transfer: 'next', fill: 'next' });
    expect(loopStatus({ schedule, summary: summary() })).toEqual({ audit: 'done', transfer: 'current', fill: 'next' });
    expect(loopStatus({ schedule, summary: summary({ done: 1, boughtBackHours: 1.5 }) })).toEqual({ audit: 'done', transfer: 'done', fill: 'current' });
  });
});

describe('your day now', () => {
  test('handed-off tasks leave the day and filled time joins it', () => {
    const day = dayNow(schedule, [{ activity: 'Email inbox', status: 'done' }], [{ activity: 'Strategy', hours: 1.5, quadrant: 'production', when: 'morning' }]);
    expect(scheduleNow(day).map((a) => [a.activity, a.hours])).toEqual([['Client calls', 2], ['Strategy', 1.5]]);
  });

  test('unfilled hours never go below zero', () => {
    expect(unfilledHours({ boughtBackHours: 1, filledHours: 2 })).toBe(0);
    expect(unfilledHours({ boughtBackHours: 2.5, filledHours: 1 })).toBe(1.5);
  });
});

describe('format', () => {
  test('hours', () => {
    expect(formatHours(1.5)).toBe('1.5h');
    expect(formatHours(undefined)).toBe('0h');
  });

  test('yearly pay keeps digits and two decimals only', () => {
    expect(sanitizeAmount('$1,250.999')).toBe('1250.99');
    expect(sanitizeAmount('abc')).toBe('');
  });
});
