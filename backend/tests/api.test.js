// The API end to end, against a throwaway in-memory MongoDB: a guest goes through onboarding,
// hands a task off, says in the weekly check-in that it slipped back, and can hand it off again.
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'test-secret';
  app = require('../src/app');
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const guest = async () => {
  const res = await request(app).post('/api/auth/guest').expect(201);
  return { Authorization: `Bearer ${res.body.token}` };
};

const SCHEDULE = [
  { activity: 'Client calls', hours: 2, money: 4, energy: 'energizing' },
  { activity: 'Email inbox', hours: 1.5, money: 1, energy: 'draining' },
  { activity: 'Invoicing', hours: 1, money: 2, energy: 'draining' },
  { activity: 'Sales follow-ups', hours: 2, money: 4, energy: 'draining' },
];

describe('basics', () => {
  test('health check', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  test('unknown routes are 404', async () => {
    await request(app).get('/api/nope').expect(404);
  });

  test('private routes need a token', async () => {
    await request(app).get('/api/onboarding').expect(401);
    await request(app).get('/api/handoffs').set('Authorization', 'Bearer not-a-token').expect(401);
  });
});

describe('onboarding', () => {
  test('the server works out the Buyback Rate and each quadrant', async () => {
    const auth = await guest();
    const res = await request(app)
      .put('/api/onboarding')
      .set(auth)
      // A client can't set derived values: buybackRate and quadrant are ignored.
      .send({ annualIncome: 100000, currency: 'USD', buybackRate: 999, schedule: SCHEDULE.map((a) => ({ ...a, quadrant: 'production' })) })
      .expect(200);

    const o = res.body.onboarding;
    expect(o.effectiveHourlyRate).toBe(50);
    expect(o.buybackRate).toBe(12.5);
    expect(Object.fromEntries(o.schedule.map((a) => [a.activity, a.quadrant]))).toEqual({
      'Client calls': 'production',
      'Email inbox': 'delegation',
      Invoicing: 'delegation',
      'Sales follow-ups': 'replacement',
    });
  });

  test('bad input is rejected with the reasons', async () => {
    const auth = await guest();
    const res = await request(app)
      .put('/api/onboarding')
      .set(auth)
      .send({ annualIncome: '', schedule: [{ activity: '', hours: 30, money: 9, energy: 'tired' }] })
      .expect(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(4);
  });

  test("a day can't have more than 24 hours", async () => {
    const auth = await guest();
    const schedule = [
      { activity: 'Work', hours: 20, money: 3, energy: 'draining' },
      { activity: 'More work', hours: 8, money: 3, energy: 'draining' },
    ];
    await request(app).put('/api/onboarding').set(auth).send({ schedule }).expect(400);
  });
});

describe('handoffs', () => {
  let auth;

  beforeAll(async () => {
    auth = await guest();
    await request(app).put('/api/onboarding').set(auth).send({ annualIncome: 100000, schedule: SCHEDULE }).expect(200);
  });

  test('only draining tasks, cheapest to hand off first', async () => {
    const res = await request(app).get('/api/handoffs').set(auth).expect(200);
    expect(res.body.handoffs.map((h) => h.activity)).toEqual(['Email inbox', 'Invoicing', 'Sales follow-ups']);
    expect(res.body.summary).toMatchObject({ drainingHours: 4.5, boughtBackHours: 0, total: 3, done: 0 });
  });

  test('handing one off buys its hours back', async () => {
    const res = await request(app).put(`/api/handoffs/${encodeURIComponent('Email inbox')}`).set(auth).send({ method: 'hire', who: 'Sam', status: 'done' }).expect(200);
    expect(res.body.handoff).toMatchObject({ activity: 'Email inbox', status: 'done', who: 'Sam' });
    expect(res.body.summary).toMatchObject({ boughtBackHours: 1.5, boughtBackPerWeek: 7.5, done: 1 });
  });

  test('a task that slips back can be handed off again', async () => {
    const res = await request(app).post(`/api/handoffs/${encodeURIComponent('Email inbox')}/slip`).set(auth).expect(200);
    expect(res.body.handoff.status).toBe('mine');
    // Every step but "how" is open again, so the road starts over.
    expect(res.body.handoff.steps.filter((s) => s.kind !== 'how').every((s) => !s.done)).toBe(true);
    expect(res.body.summary.boughtBackHours).toBe(0);
  });

  test('only a handed-off task can slip back', async () => {
    await request(app).post(`/api/handoffs/${encodeURIComponent('Invoicing')}/slip`).set(auth).expect(400);
  });

  test("a task that isn't draining can't be handed off", async () => {
    await request(app).put(`/api/handoffs/${encodeURIComponent('Client calls')}`).set(auth).send({ status: 'done' }).expect(404);
  });

  test('invalid values are rejected', async () => {
    await request(app).put(`/api/handoffs/${encodeURIComponent('Invoicing')}`).set(auth).send({ status: 'finished' }).expect(400);
    await request(app).put(`/api/handoffs/${encodeURIComponent('Invoicing')}`).set(auth).send({ method: 'magic' }).expect(400);
  });

  test('renaming a task keeps its handoff', async () => {
    await request(app).put(`/api/handoffs/${encodeURIComponent('Invoicing')}`).set(auth).send({ method: 'automate', who: 'QuickBooks' }).expect(200);
    const schedule = SCHEDULE.map((a) => (a.activity === 'Invoicing' ? { ...a, activity: 'Billing' } : a));
    await request(app).put('/api/onboarding').set(auth).send({ schedule, renames: [{ from: 'Invoicing', to: 'Billing' }] }).expect(200);
    const res = await request(app).get('/api/handoffs').set(auth).expect(200);
    expect(res.body.handoffs.find((h) => h.activity === 'Billing')).toMatchObject({ method: 'automate', who: 'QuickBooks' });
  });
});

describe('weekly check-in', () => {
  test('a task that slipped goes back to your list', async () => {
    const auth = await guest();
    await request(app).put('/api/onboarding').set(auth).send({ annualIncome: 100000, schedule: SCHEDULE }).expect(200);
    await request(app).put(`/api/handoffs/${encodeURIComponent('Email inbox')}`).set(auth).send({ method: 'hire', status: 'done' }).expect(200);

    const res = await request(app)
      .post('/api/checkins')
      .set(auth)
      .send({ week: '2026-10-26', feeling: 3, handoffs: [{ activity: 'Email inbox', answer: 'slipped' }] })
      .expect(200);
    expect(res.body.handoffs.find((h) => h.activity === 'Email inbox').status).toBe('mine');
  });

  test('the week must be a date', async () => {
    const auth = await guest();
    await request(app).post('/api/checkins').set(auth).send({ week: 'last week' }).expect(400);
  });
});

describe('accounts', () => {
  test('register, then log in with the same password', async () => {
    const email = `test${Date.now()}@example.com`;
    await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'a-good-password-123' }).expect(201);
    const res = await request(app).post('/api/auth/login').send({ email, password: 'a-good-password-123' }).expect(200);
    expect(res.body.token).toBeTruthy();
    // The password hash never leaves the server.
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  test('a wrong password is refused', async () => {
    const email = `test${Date.now()}b@example.com`;
    await request(app).post('/api/auth/register').send({ name: 'Test', email, password: 'a-good-password-123' }).expect(201);
    await request(app).post('/api/auth/login').send({ email, password: 'wrong-password-123' }).expect(401);
  });
});
