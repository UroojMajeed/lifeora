// The book's formulas: the Buyback Rate and where each task lands in the DRIP Matrix.
const { calculateBuybackRate, quadrantFor, valueForMoney, summarizeSchedule } = require('../src/utils/buyback');

describe('calculateBuybackRate', () => {
  test('pay ÷ 2,000 hours, then ÷ 4', () => {
    expect(calculateBuybackRate(100000)).toEqual({ effectiveHourlyRate: 50, buybackRate: 12.5 });
  });

  test('no pay (or nonsense) gives zero, never NaN', () => {
    expect(calculateBuybackRate(0)).toEqual({ effectiveHourlyRate: 0, buybackRate: 0 });
    expect(calculateBuybackRate('abc')).toEqual({ effectiveHourlyRate: 0, buybackRate: 0 });
  });
});

describe('valueForMoney', () => {
  test('$$$ and up makes money', () => {
    expect([1, 2, 3, 4, 5].map(valueForMoney)).toEqual(['low', 'low', 'high', 'high', 'high']);
  });
});

describe('quadrantFor', () => {
  test.each([
    ['high', 'energizing', 'production'],
    ['high', 'draining', 'replacement'],
    ['low', 'energizing', 'investment'],
    ['low', 'draining', 'delegation'],
  ])('%s value, %s → %s', (value, energy, quadrant) => {
    expect(quadrantFor({ value, energy })).toBe(quadrant);
  });

  test('no quadrant until the energy is known', () => {
    expect(quadrantFor({ value: 'high', energy: null })).toBeNull();
  });
});

describe('summarizeSchedule', () => {
  const schedule = [
    { activity: 'Client calls', hours: 2, quadrant: 'production' },
    { activity: 'Email', hours: 1.5, quadrant: 'delegation' },
    { activity: 'Invoicing', hours: 1, quadrant: 'delegation' },
    { activity: 'Sales follow-ups', hours: 2, quadrant: 'replacement' },
    { activity: 'Not rated yet', hours: 3, quadrant: null },
  ];

  test('hours per quadrant, the draining total and its daily cost', () => {
    const s = summarizeSchedule(schedule, 10);
    expect(s.hours).toEqual({ delegation: 2.5, replacement: 2, investment: 0, production: 2 });
    expect(s.totalHours).toBe(6.5);
    expect(s.drainingHours).toBe(4.5);
    expect(s.dailyBuybackCost).toBe(45);
    expect(s.dominant).toBe('delegation');
  });

  test('an empty day has no dominant quadrant', () => {
    expect(summarizeSchedule([], 10)).toMatchObject({ totalHours: 0, dominant: null, drainingHours: 0 });
  });
});
