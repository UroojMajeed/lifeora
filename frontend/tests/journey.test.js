// The handoff road: which steps a plan has, where it stands, and how choosing a way reshapes it.
import { defaultSteps, journeyOf, planForMethod, planOf, sameDay, startOptions, startsLater } from '../src/constants/journey';

const kinds = (steps) => steps.map((s) => s.kind);

describe('defaultSteps', () => {
  test('delegating: how, brief, who, hand over', () => {
    expect(kinds(defaultSteps('hire'))).toEqual(['how', 'brief', 'who', 'handover']);
    expect(kinds(defaultSteps(null))).toEqual(['how', 'brief', 'who', 'handover']);
  });

  test('automating needs no brief', () => {
    expect(kinds(defaultSteps('automate'))).toEqual(['how', 'who', 'handover']);
  });

  test('dropping is one decision', () => {
    expect(kinds(defaultSteps('drop'))).toEqual(['how', 'drop']);
  });
});

describe('journeyOf', () => {
  test('a new task starts on "how"', () => {
    const j = journeyOf({ status: 'mine', method: null });
    expect(j.current.kind).toBe('how');
    expect(j).toMatchObject({ doneCount: 0, finished: false, started: false });
  });

  test('old handoffs (from before plans) are ticked from their answers', () => {
    const j = journeyOf({ status: 'in_progress', method: 'hire', doneLooksLike: 'Same day', checkHow: 'Fridays', who: '' });
    expect(j.current.kind).toBe('who');
    expect(j.doneCount).toBe(2);
  });

  test('the last step only counts once the task is really handed off', () => {
    const steps = defaultSteps('hire').map((s) => ({ ...s, done: true }));
    expect(journeyOf({ status: 'in_progress', steps }).current.kind).toBe('handover');
    expect(journeyOf({ status: 'done', steps }).finished).toBe(true);
  });
});

describe('planForMethod', () => {
  test('switching to drop shortens the road, and "how" is ticked', () => {
    const plan = planForMethod(defaultSteps('hire'), 'drop', 'hire');
    expect(kinds(plan)).toEqual(['how', 'drop']);
    expect(plan[0].done).toBe(true);
  });

  test('your own steps are kept when the road changes, before the last step', () => {
    const plan = [...defaultSteps('hire').slice(0, -1), { id: 'x', kind: 'custom', title: 'Record a video', done: false }, defaultSteps('hire')[3]];
    expect(kinds(planForMethod(plan, 'automate', 'hire'))).toEqual(['how', 'who', 'custom', 'handover']);
  });

  test('another way on the same road keeps the plan', () => {
    const plan = defaultSteps('hire');
    expect(kinds(planForMethod(plan, 'team', 'hire'))).toEqual(kinds(plan));
  });
});

describe('planOf', () => {
  test("the user's own steps win over the suggested ones", () => {
    const steps = [{ id: 'a', kind: 'how', title: 'How', done: true }, { id: 'b', kind: 'drop', title: 'Stop', done: false }];
    expect(planOf({ method: 'hire', steps })).toEqual(steps);
  });
});

describe('dates', () => {
  test('a handoff that starts tomorrow counts from tomorrow', () => {
    const now = new Date(2026, 9, 28, 12);
    expect(startsLater({ status: 'done', startDate: new Date(2026, 9, 29) }, now)).toBe(true);
    expect(startsLater({ status: 'done', startDate: new Date(2026, 9, 27) }, now)).toBe(false);
  });

  test('"Next Monday" on a Sunday skips tomorrow', () => {
    const sunday = new Date(2026, 10, 1, 10); // Sun 1 Nov 2026
    const monday = startOptions(sunday).find((o) => o.key === 'monday').date;
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(9);
  });

  test('sameDay is always a boolean', () => {
    expect(sameDay(null, new Date())).toBe(false);
    expect(sameDay(new Date(2026, 0, 1, 9), new Date(2026, 0, 1, 20))).toBe(true);
  });
});
