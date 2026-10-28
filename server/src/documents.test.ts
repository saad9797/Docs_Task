import { beforeAll, afterAll, describe, expect, test } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { app } from './app.js';
import { db } from './db.js';
const suffix = randomUUID();
let owner = '',
  editor = '',
  viewer = '',
  outsider = '';
let docId = '',
  ownerId = '',
  viewerId = '';
const userIds: string[] = [];
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
beforeAll(async () => {
  const tokens = [];
  for (const name of ['Owner', 'Editor', 'Viewer', 'Outsider']) {
    const user = await db.user.create({
      data: { name, email: `${name.toLowerCase()}-${suffix}@example.com` },
    });
    userIds.push(user.id);
    const result = await request(app).post('/api/auth/login').send({ userId: user.id });
    expect(result.status).toBe(200);
    tokens.push(result.body.token);
  }
  [owner, editor, viewer, outsider] = tokens;
  [ownerId, , viewerId] = userIds;
});
afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
});
describe.sequential('document permissions and persistence', () => {
  test('requires signed authentication', async () => {
    expect((await request(app).get('/api/documents')).status).toBe(401);
    expect((await request(app).get('/api/documents').set(auth(ownerId))).status).toBe(401);
  });
  test('owner creates and fetches a sanitized document', async () => {
    const created = await request(app).post('/api/documents').set(auth(owner)).send({
      title: 'A document',
      content:
        '<h1>Hello</h1><p><u>World</u><script>alert(1)</script><img src=x onerror=alert(1)></p>',
    });
    expect(created.status).toBe(201);
    docId = created.body.id;
    expect(created.body.ownerId).toBe(ownerId);
    const result = await request(app).get(`/api/documents/${docId}`).set(auth(owner));
    expect(result.status).toBe(200);
    expect(result.body.role).toBe('OWNER');
    expect(result.body.content).toBe('<h1>Hello</h1><p><u>World</u></p>');
  });
  test('rejects client supplied ownership and invalid values', async () => {
    expect(
      (
        await request(app)
          .post('/api/documents')
          .set(auth(owner))
          .send({ title: 'Forged', ownerId: viewerId })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).patch(`/api/documents/${docId}`).set(auth(owner)).send({ title: ' ' }))
        .status,
    ).toBe(400);
    expect((await request(app).get('/api/documents?limit=500').set(auth(owner))).status).toBe(400);
    expect((await request(app).get('/api/documents?cursor=garbage').set(auth(owner))).status).toBe(
      400,
    );
  });
  test('non-shared users get 403, missing docs get 404', async () => {
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(outsider))).status).toBe(
      403,
    );
    expect(
      (await request(app).get(`/api/documents/${randomUUID()}`).set(auth(outsider))).status,
    ).toBe(404);
  });
  test('rejects invalid content and oversized sanitized output', async () => {
    expect(
      (
        await request(app)
          .post('/api/documents')
          .set(auth(owner))
          .send({ title: 'Invalid', content: '<p>\0</p>' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/api/documents')
          .set(auth(owner))
          .send({ title: 'Expansion', content: '&'.repeat(110000) })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put(`/api/documents/${docId}/shares`)
          .set(auth(owner))
          .send({ email: `owner-${suffix}@example.com`, role: 'EDITOR' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put(`/api/documents/${docId}/shares`)
          .set(auth(owner))
          .send({ email: `missing-${suffix}@example.com`, role: 'VIEWER' })
      ).status,
    ).toBe(404);
  });
  test('persists multilingual content without encoding loss', async () => {
    const content = '<p>Ideas 🌱 — خیالات — 你好</p>';
    expect(
      (await request(app).patch(`/api/documents/${docId}`).set(auth(owner)).send({ content }))
        .status,
    ).toBe(200);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(owner))).body.content).toBe(
      content,
    );
  });
  test('viewer can read but cannot edit, share or delete', async () => {
    expect(
      (
        await request(app)
          .put(`/api/documents/${docId}/shares`)
          .set(auth(owner))
          .send({ email: `VIEWER-${suffix}@EXAMPLE.COM`, role: 'VIEWER' })
      ).status,
    ).toBe(200);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(viewer))).status).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/api/documents/${docId}`)
          .set(auth(viewer))
          .send({ content: '<p>no</p>' })
      ).status,
    ).toBe(403);
    expect((await request(app).delete(`/api/documents/${docId}`).set(auth(viewer))).status).toBe(
      403,
    );
    expect(
      (await request(app).get(`/api/documents/${docId}/shares`).set(auth(viewer))).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .put(`/api/documents/${docId}/shares`)
          .set(auth(viewer))
          .send({ email: 'alice@example.com', role: 'EDITOR' })
      ).status,
    ).toBe(403);
  });
  test('editor can update title/content but cannot manage sharing', async () => {
    await request(app)
      .put(`/api/documents/${docId}/shares`)
      .set(auth(owner))
      .send({ email: `editor-${suffix}@example.com`, role: 'EDITOR' });
    const result = await request(app).patch(`/api/documents/${docId}`).set(auth(editor)).send({
      title: 'Edited',
      content: '<p><strong>Persisted</strong><iframe src="x"></iframe></p>',
    });
    expect(result.status).toBe(200);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(editor))).body.content).toBe(
      '<p><strong>Persisted</strong></p>',
    );
    expect((await request(app).delete(`/api/documents/${docId}`).set(auth(editor))).status).toBe(
      403,
    );
  });
  test('lists use bounded metadata, search, section filtering and stable cursors', async () => {
    await request(app).post('/api/documents').set(auth(owner)).send({ title: 'Second' });
    const first = await request(app).get('/api/documents?limit=1').set(auth(owner));
    expect(first.body.items).toHaveLength(1);
    expect(first.body.items[0].content).toBeUndefined();
    expect(first.body.nextCursor).toBeTruthy();
    const second = await request(app)
      .get(`/api/documents?limit=1&cursor=${first.body.nextCursor}`)
      .set(auth(owner));
    expect(second.body.items[0].id).not.toBe(first.body.items[0].id);
    const search = await request(app).get('/api/documents?q=edited').set(auth(owner));
    expect(search.body.items).toHaveLength(1);
    expect(search.body.items[0].id).toBe(docId);
    const shared = await request(app).get('/api/documents?section=shared').set(auth(viewer));
    expect(shared.body.items[0].role).toBe('VIEWER');
    expect(
      (await request(app).get('/api/documents?section=shared').set(auth(outsider))).body.items,
    ).toEqual([]);
  });
  test('owner changes and revokes permissions immediately', async () => {
    const list = await request(app).get(`/api/documents/${docId}/shares?limit=1`).set(auth(owner));
    expect(list.body.items).toHaveLength(1);
    expect(list.body.nextCursor).toBeTruthy();
    const share = await db.documentShare.findUniqueOrThrow({
      where: { documentId_userId: { documentId: docId, userId: viewerId } },
    });
    expect(
      (
        await request(app)
          .patch(`/api/documents/${docId}/shares/${share.id}`)
          .set(auth(owner))
          .send({ role: 'EDITOR' })
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch(`/api/documents/${docId}`)
          .set(auth(viewer))
          .send({ title: 'Upgraded' })
      ).status,
    ).toBe(200);
    expect(
      (await request(app).delete(`/api/documents/${docId}/shares/${share.id}`).set(auth(owner)))
        .status,
    ).toBe(204);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(viewer))).status).toBe(403);
    expect(
      (
        await request(app)
          .patch(`/api/documents/${docId}`)
          .set(auth(viewer))
          .send({ title: 'Revoked' })
      ).status,
    ).toBe(403);
  });
  test('owner deletion cascades shares', async () => {
    expect((await request(app).delete(`/api/documents/${docId}`).set(auth(owner))).status).toBe(
      204,
    );
    expect(await db.documentShare.count({ where: { documentId: docId } })).toBe(0);
    expect((await request(app).get(`/api/documents/${docId}`).set(auth(owner))).status).toBe(404);
  });
});
