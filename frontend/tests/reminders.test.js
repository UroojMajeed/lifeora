// The reminder planner: what gets scheduled and when. Calm by design: never at night, one a day at
// most, a stuck handoff nudged at most weekly, nothing when everything is switched off.
import { planReminders, sampleReminders } from '../src/notifications/plan';

const NOW = new Date(2026, 9, 29, 10, 0); // Thursday 29 Oct 2026, 10:00
const day = (d, hour = 0) => new Date(2026, 9, d, hour).toISOString();
const TITLES = { how: 'Choose how', brief: 'Write the brief', who: 'Find who', handover: 'Hand it over' };
const steps = (doneAt, n) =>
  ['how', 'brief', 'who', 'handover'].map((k, i) => ({ id: k, kind: k, title: TITLES[k], done: i < n, doneAt: i < n ? doneAt : undefined }));

const handedOff = { activity: 'Email', hours: 1, status: 'done', method: 'hire', who: 'Sam', startDate: day(27), steps: steps(day(27), 4) };
const startsSaturday = { activity: 'Calls', hours: 2, status: 'done', method: 'hire', who: 'Ana', startDate: day(31), steps: steps(day(28), 4) };
const stuck = { activity: 'Invoices', hours: 0.5, status: 'in_progress', method: 'hire', steps: steps(day(20), 2) };
const movedYesterday = { activity: 'Reports', hours: 1, status: 'in_progress', method: 'hire', steps: steps(day(28), 2) };
const notStarted = { activity: 'Filing', hours: 1, status: 'mine', steps: [] };

const plan = (args) => planReminders({ now: NOW, ...args });
const kinds = (list) => list.map((n) => n.kind);

describe('weekly check-in', () => {
  test('on Friday at 5 pm by default, a few weeks ahead', () => {
    const list = plan({ handoffs: [handedOff] }).filter((n) => n.kind === 'checkIn');
    expect(list.length).toBe(4);
    expect(list[0].date).toEqual(new Date(2026, 9, 30, 17));
    expect(list.every((n) => n.date.getDay() === 5 && n.date.getHours() === 17)).toBe(true);
    expect(list[0].data).toEqual({ screen: 'CheckIn' });
  });

  test('skips a week that is already checked in', () => {
    const list = plan({ handoffs: [handedOff], checkIns: [{ week: '2026-10-26' }] }).filter((n) => n.kind === 'checkIn');
    expect(list[0].date).toEqual(new Date(2026, 10, 6, 17));
  });

  test('follows your day and time', () => {
    const list = plan({ handoffs: [handedOff], reminders: { checkInDay: 0, checkInHour: 19 } }).filter((n) => n.kind === 'checkIn');
    expect(list[0].date).toEqual(new Date(2026, 10, 1, 19));
  });

  test('nothing to check before anything is handed off (or has started)', () => {
    expect(kinds(plan({ handoffs: [stuck] }))).not.toContain('checkIn');
    expect(kinds(plan({ handoffs: [startsSaturday] }))).not.toContain('checkIn');
  });
});

describe('start day', () => {
  test('9 am on the day a handover begins, opening its road', () => {
    const start = plan({ handoffs: [startsSaturday] }).find((n) => n.kind === 'startDay');
    expect(start.date).toEqual(new Date(2026, 9, 31, 9));
    expect(start.title).toBe('Ana takes over calls today');
    expect(start.body).toBe('10 h a week back for you, starting today.');
    expect(start.data).toEqual({ screen: 'HandoffJourney', params: { activity: 'Calls' } });
  });

  test('without a name, it is simply off your plate', () => {
    const start = plan({ handoffs: [{ ...startsSaturday, who: '' }] }).find((n) => n.kind === 'startDay');
    expect(start.title).toBe('Calls is off your plate from today');
  });
});

describe('nudges', () => {
  test('a handoff quiet for 3 days gets one, at 6 pm', () => {
    const nudge = plan({ handoffs: [stuck] }).find((n) => n.kind === 'nudge');
    expect(nudge.date).toEqual(new Date(2026, 9, 29, 18));
    expect(nudge.title).toBe('Invoices: 2 steps from off your plate');
    expect(nudge.body).toBe('Next: Find who. It frees 2.5 h a week.');
  });

  test('not before 3 quiet days', () => {
    const nudge = plan({ handoffs: [movedYesterday] }).find((n) => n.kind === 'nudge');
    expect(nudge.date).toEqual(new Date(2026, 9, 31, 18));
  });

  test('at most once a week', () => {
    const nudge = plan({ handoffs: [stuck], nudgedAt: { Invoices: day(27, 18) } }).find((n) => n.kind === 'nudge');
    expect(nudge.date).toEqual(new Date(2026, 10, 3, 18));
  });

  test('none for a task not started yet', () => {
    expect(plan({ handoffs: [notStarted] })).toEqual([]);
  });
});

describe('calm rules', () => {
  test('never at night: every reminder is between 8 am and 8 pm', () => {
    const list = plan({ handoffs: [handedOff, startsSaturday, stuck, movedYesterday] });
    expect(list.every((n) => n.date.getHours() >= 8 && n.date.getHours() <= 20)).toBe(true);
  });

  test('one a day at most, the check-in winning', () => {
    // Check-in moved to Saturday 9 am: the same morning as the start day.
    const list = plan({ handoffs: [handedOff, startsSaturday], reminders: { checkInDay: 6, checkInHour: 9 } });
    const days = list.map((n) => n.date.toDateString());
    expect(new Set(days).size).toBe(days.length);
    expect(list.find((n) => n.date.toDateString() === new Date(2026, 9, 31).toDateString()).kind).toBe('checkIn');
  });

  test('nothing when everything is off', () => {
    expect(plan({ handoffs: [handedOff, startsSaturday, stuck], reminders: { checkIn: false, startDay: false, nudges: false } })).toEqual([]);
  });

  test('soonest first, all in the future', () => {
    const list = plan({ handoffs: [handedOff, startsSaturday, stuck] });
    expect(list.every((n) => n.date > NOW)).toBe(true);
    expect(list.map((n) => +n.date)).toEqual([...list.map((n) => +n.date)].sort((a, b) => a - b));
  });
});

describe('test reminders', () => {
  test('one of each, with the same words as the real ones', () => {
    const samples = sampleReminders([startsSaturday, stuck]);
    expect(kinds(samples)).toEqual(['checkIn', 'startDay', 'nudge']);
    expect(samples[1].title).toBe('Ana takes over calls today');
    expect(samples[2].title).toBe('Invoices: 2 steps from off your plate');
  });

  test('with no tasks, just the check-in', () => {
    expect(kinds(sampleReminders([]))).toEqual(['checkIn']);
  });
});
