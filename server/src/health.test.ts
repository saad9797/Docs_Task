import { expect, test, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { db } from './db.js';
test('health confirms a database connection', async () => {
  const result = await request(app).get('/api/health');
  expect(result.status).toBe(200);
  expect(result.body.status).toBe('ok');
});
afterAll(() => db.$disconnect());
