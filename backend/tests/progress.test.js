// Progress that follows you to a new phone (weekly hours, streak, milestones), reminder settings and
// your name, and the road's "It slipped back?". Against a throwaway in-memory MongoDB.
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

/** Monday of this week, YYYY-MM-DD (the server's weeks are keyed the same way). */
const thisMonday = () => {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/** A guest with one draining task, handed off today. */
async function handedOff() {
  const auth = await guest();
  await request(app)
    .put('/api/onboarding')
    .set(auth)
    .send({ schedule: [{ activity: 'Email', hours: 1, money: 1, energy: 'draining' }], currentStep: 'done' })
    .expect(200);
  const steps = ['how', 'brief', 'who', 'handover'].map((k) => ({ id: k, kind: k, title: k, done: true }));
  await request(app)
    .put('/api/handoffs/Email')
    .set(auth)
    .send({ method: 'hire', who: 'Sam', doneLooksLike: 'a', checkHow: 'b', startDate: new Date().toISOString(), steps, status: 'done' })
    .expect(200);
  return auth;
}

describe('progress', () => {
  test('starts empty', async () => {
    const res = await request(app).get('/api/progress').set(await guest()).expect(200);
    expect(res.body.progress).toEqual({ weeks: {}, activeWeeks: [], milestones: {} });
  });

  test("a phone's earlier progress merges in once, invalid parts left out", async () => {
    const auth = await guest();
    const res = await request(app)
      .patch('/api/progress')
      .set(auth)
      .send({ merge: { weeks: { '2026-10-19': 5, nonsense: 3 }, activeWeeks: ['2026-10-19', 'x'], milestones: { 'hours-5': '2026-10-20T10:00:00Z', 'Bad Key!': '2026-10-20' } } })
      .expect(200);
    expect(res.body.progress.weeks).toEqual({ '2026-10-19': 5 });
    expect(res.body.progress.activeWeeks).toEqual(['2026-10-19']);
    expect(Object.keys(res.body.progress.milestones)).toEqual(['hours-5']);
  });

  test('a week keeps its highest hours', async () => {
    const auth = await guest();
    await request(app).patch('/api/progress').set(auth).send({ week: '2026-10-26', hours: 7.5 }).expect(200);
    const res = await request(app).patch('/api/progress').set(auth).send({ week: '2026-10-26', hours: 5 }).expect(200);
    expect(res.body.progress.weeks['2026-10-26']).toBe(7.5);
  });

  test('only new milestones come back as fresh', async () => {
    const auth = await guest();
    const first = await request(app).patch('/api/progress').set(auth).send({ milestones: ['hours-5'] }).expect(200);
    expect(first.body.fresh).toEqual(['hours-5']);
    const again = await request(app).patch('/api/progress').set(auth).send({ milestones: ['hours-5', 'hours-10'] }).expect(200);
    expect(again.body.fresh).toEqual(['hours-10']);
  });

  test('an active week counts once', async () => {
    const auth = await guest();
    await request(app).patch('/api/progress').set(auth).send({ active: '2026-10-26' }).expect(200);
    const res = await request(app).patch('/api/progress').set(auth).send({ active: '2026-10-26' }).expect(200);
    expect(res.body.progress.activeWeeks).toEqual(['2026-10-26']);
  });

  test('bad input is rejected', async () => {
    const auth = await guest();
    await request(app).patch('/api/progress').set(auth).send({ week: 'x', hours: 3 }).expect(400);
    await request(app).patch('/api/progress').set(auth).send({ week: '2026-10-26', hours: 500 }).expect(400);
    await request(app).patch('/api/progress').set(auth).send({ milestones: ['Bad Key!'] }).expect(400);
  });
});

describe('slipping back from the road', () => {
  test('only a handed-off task can come back', async () => {
    await request(app).post('/api/handoffs/Email/slip').set(await guest()).expect(400);
  });

  test("it reopens the road with answers kept, and lowers this week's hours", async () => {
    const auth = await handedOff();
    await request(app).patch('/api/progress').set(auth).send({ week: thisMonday(), hours: 12 }).expect(200);
    const res = await request(app).post('/api/handoffs/Email/slip').set(auth).expect(200);
    expect(res.body.handoff.status).toBe('mine');
    expect(res.body.handoff.cameBackAt).toBeTruthy();
    expect(res.body.handoff.who).toBe('Sam');
    expect(res.body.handoff.steps.map((s) => s.done)).toEqual([true, false, false, false]);
    expect(res.body.summary.boughtBackHours).toBe(0);
    const progress = await request(app).get('/api/progress').set(auth).expect(200);
    expect(progress.body.progress.weeks[thisMonday()]).toBe(0);
  });

  test('handing it off again clears "came back"', async () => {
    const auth = await handedOff();
    await request(app).post('/api/handoffs/Email/slip').set(auth).expect(200);
    const steps = ['how', 'brief', 'who', 'handover'].map((k) => ({ id: k, kind: k, title: k, done: true }));
    const res = await request(app).put('/api/handoffs/Email').set(auth).send({ startDate: new Date().toISOString(), steps, status: 'done' }).expect(200);
    expect(res.body.handoff.cameBackAt).toBeFalsy();
  });
});

describe('hours count from the start day', () => {
  test('a handover starting later counts nothing yet', async () => {
    const auth = await guest();
    await request(app)
      .put('/api/onboarding')
      .set(auth)
      .send({ schedule: [{ activity: 'Email', hours: 1, money: 1, energy: 'draining' }], currentStep: 'done' })
      .expect(200);
    const steps = ['how', 'brief', 'who', 'handover'].map((k) => ({ id: k, kind: k, title: k, done: true }));
    const later = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app).put('/api/handoffs/Email').set(auth).send({ method: 'hire', startDate: later, steps, status: 'done' }).expect(200);
    expect(res.body.summary.boughtBackHours).toBe(0);
    expect(res.body.summary.startingHours).toBe(1);
  });
});

describe('your name and reminders', () => {
  test('reminders start on: Friday at 5 pm', async () => {
    const res = await request(app).get('/api/auth/me').set(await guest()).expect(200);
    expect(res.body.user.reminders).toEqual({ checkIn: true, checkInDay: 5, checkInHour: 17, startDay: true, nudges: true });
  });

  test('changing reminders keeps the rest', async () => {
    const res = await request(app)
      .patch('/api/auth/me')
      .set(await guest())
      .send({ reminders: { checkInDay: 0, checkInHour: 19, nudges: false } })
      .expect(200);
    expect(res.body.user.reminders).toEqual({ checkIn: true, checkInDay: 0, checkInHour: 19, startDay: true, nudges: false });
  });

  test('no reminders at night, and only real days', async () => {
    const auth = await guest();
    await request(app).patch('/api/auth/me').set(auth).send({ reminders: { checkInHour: 23 } }).expect(400);
    await request(app).patch('/api/auth/me').set(auth).send({ reminders: { checkInDay: 9 } }).expect(400);
    await request(app).patch('/api/auth/me').set(auth).send({ reminders: { checkIn: 'yes' } }).expect(400);
  });

  test('a name is trimmed; an empty one or an empty change is refused', async () => {
    const auth = await guest();
    const res = await request(app).patch('/api/auth/me').set(auth).send({ name: '  Urooj  ' }).expect(200);
    expect(res.body.user.name).toBe('Urooj');
    await request(app).patch('/api/auth/me').set(auth).send({ name: '   ' }).expect(400);
    await request(app).patch('/api/auth/me').set(auth).send({}).expect(400);
  });

  test('saving a guest account keeps everything, then the name can be set', async () => {
    const auth = await handedOff();
    const saved = await request(app).post('/api/auth/save').set(auth).send({ email: 'keep@example.com', password: 'password1' }).expect(200);
    expect(saved.body.user.isGuest).toBe(false);
    const after = { Authorization: `Bearer ${saved.body.token}` };
    const list = await request(app).get('/api/handoffs').set(after).expect(200);
    expect(list.body.handoffs[0].status).toBe('done');
    const named = await request(app).patch('/api/auth/me').set(after).send({ name: 'Urooj' }).expect(200);
    expect(named.body.user.name).toBe('Urooj');
  });
});

describe('each task once', () => {
  test('repeated names are saved once, whatever their case or spaces', async () => {
    const auth = await guest();
    const task = (activity) => ({ activity, hours: 1, money: 1, energy: 'draining' });
    const res = await request(app)
      .put('/api/onboarding')
      .set(auth)
      .send({ schedule: [task('Email'), task('email'), task('Email '), task('Calls')] })
      .expect(200);
    expect(res.body.onboarding.schedule.map((a) => a.activity)).toEqual(['Email', 'Calls']);
  });
});
