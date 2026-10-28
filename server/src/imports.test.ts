import { afterAll, beforeAll, expect, test } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { app } from './app.js';
import { db } from './db.js';
let token = '',
  userId = '';
beforeAll(async () => {
  const user = await db.user.create({
    data: { name: 'Importer', email: `import-${randomUUID()}@example.com` },
  });
  userId = user.id;
  const result = await request(app).post('/api/auth/login').send({ userId });
  token = result.body.token;
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});
const upload = () =>
  request(app).post('/api/documents/import').set('Authorization', `Bearer ${token}`);
test('unsupported file is rejected with a consistent error', async () => {
  const res = await upload().attach('file', Buffer.from('no'), 'file.pdf');
  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
});
test('txt import creates a new editable document with escaped HTML and filename title', async () => {
  const res = await upload().attach(
    'file',
    Buffer.from('Hello <world>\nSecond line'),
    'Meeting.notes.txt',
  );
  expect(res.status).toBe(201);
  expect(res.body.title).toBe('Meeting.notes');
  expect(res.body.ownerId).toBe(userId);
  expect(res.body.content).toBe('<p>Hello &lt;world&gt;</p><p>Second line</p>');
  expect(res.body.role).toBe('OWNER');
});
test('markdown is converted on the server and sanitized', async () => {
  const res = await upload().attach(
    'file',
    Buffer.from(
      '# Heading\n\n**Bold**\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>',
    ),
    'Readme.md',
  );
  expect(res.status).toBe(201);
  expect(res.body.content).toContain('<h1>Heading</h1>');
  expect(res.body.content).toContain('<strong>Bold</strong>');
  expect(res.body.content).not.toMatch(/script|img|onerror/);
});
test('docx import preserves supported formatting', async () => {
  const res = await upload().attach(
    'file',
    fileURLToPath(new URL('../test/fixtures/sample.docx', import.meta.url)),
  );
  expect(res.status).toBe(201);
  expect(res.body.content).toContain('<strong>Word import</strong>');
  expect(res.body.title).toBe('sample');
});
test('oversized uploads are rejected before conversion', async () => {
  const res = await upload().attach('file', Buffer.alloc(2 * 1024 * 1024 + 1, 'a'), 'Large.txt');
  expect(res.status).toBe(413);
  expect(res.body.error.message).toContain('2 MB');
});
test('missing, empty, binary and malformed Word files give actionable errors', async () => {
  expect((await upload()).status).toBe(400);
  expect((await upload().attach('file', Buffer.alloc(0), 'empty.txt')).status).toBe(400);
  expect((await upload().attach('file', Buffer.from([0, 1, 2]), 'binary.txt')).status).toBe(422);
  expect((await upload().attach('file', Buffer.from('not a zip'), 'broken.docx')).status).toBe(422);
});
test('expanded document limit rejects oversized converted text', async () => {
  const res = await upload().attach('file', Buffer.alloc(500001, 'a'), 'Too-long.txt');
  expect(res.status).toBe(422);
  expect(res.body.error.message).toContain('500 KB');
});
