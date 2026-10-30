// Rate limits apply on the live server only (NODE_ENV=production), so this file loads the app that way.
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let app;
let before;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.JWT_SECRET = 'test-secret';
  before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  app = require('../src/app');
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  process.env.NODE_ENV = before;
  await mongoose.disconnect();
  await mongo.stop();
});

test('ten new guests an hour from one network, then a clear message', async () => {
  for (let i = 0; i < 10; i += 1) await request(app).post('/api/auth/guest').expect(201);
  const res = await request(app).post('/api/auth/guest').expect(429);
  expect(res.body.error.message).toMatch(/Too many new starts/);
});

test('the rest of the API still answers', async () => {
  await request(app).get('/api/health').expect(200);
});
