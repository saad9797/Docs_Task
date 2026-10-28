import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError } from '../errors.js';
import { sanitize } from '../sanitize.js';
import { contentSchema, idSchema } from '../validation.js';
const userSelect = { id: true, name: true, email: true } as const;
const metadata = {
  id: true,
  title: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: userSelect },
} as const;
const cursorSchema = z.object({ id: idSchema, date: z.iso.datetime() });
function decode(cursor?: string) {
  if (!cursor) return undefined;
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
  } catch {
    throw new AppError(400, 'VALIDATION', 'Invalid pagination cursor.');
  }
}
const encode = (row: { id: string; updatedAt: Date }) =>
  Buffer.from(JSON.stringify({ id: row.id, date: row.updatedAt.toISOString() })).toString(
    'base64url',
  );
export async function access(id: string, userId: string, mode: 'read' | 'edit' | 'owner' = 'read') {
  const doc = await db.document.findUnique({
    where: { id },
    select: { ownerId: true, shares: { where: { userId }, select: { role: true } } },
  });
  if (!doc) throw new AppError(404, 'NOT_FOUND', 'This document does not exist.');
  const role = doc.ownerId === userId ? 'OWNER' : doc.shares[0]?.role;
  if (!role || (mode === 'owner' && role !== 'OWNER') || (mode === 'edit' && role === 'VIEWER'))
    throw new AppError(
      403,
      'FORBIDDEN',
      mode === 'owner'
        ? 'Only the owner can manage sharing or delete this document.'
        : 'You do not have permission to perform this action.',
    );
  return role;
}
export async function listDocuments(
  userId: string,
  input: { section: 'mine' | 'shared'; q: string; limit: number; cursor?: string },
) {
  const cursor = decode(input.cursor);
  const where: Prisma.DocumentWhereInput = {
    ...(input.section === 'mine' ? { ownerId: userId } : { shares: { some: { userId } } }),
    ...(input.q ? { title: { contains: input.q, mode: 'insensitive' } } : {}),
    ...(cursor
      ? {
          OR: [
            { updatedAt: { lt: new Date(cursor.date) } },
            { updatedAt: new Date(cursor.date), id: { lt: cursor.id } },
          ],
        }
      : {}),
  };
  const rows = await db.document.findMany({
    where,
    select: { ...metadata, shares: { where: { userId }, select: { role: true } } },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    take: input.limit + 1,
  });
  const more = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  return {
    items: page.map(({ shares, ...row }) => ({
      ...row,
      role: row.ownerId === userId ? 'OWNER' : shares[0]?.role,
    })),
    nextCursor: more ? encode(page[page.length - 1]) : null,
  };
}
export async function createDocument(userId: string, input: { title: string; content?: string }) {
  return db.document.create({
    data: {
      ownerId: userId,
      title: input.title,
      content: contentSchema.parse(sanitize(input.content ?? '<p></p>')),
    },
    select: { ...metadata, content: true },
  });
}
export async function fetchDocument(id: string, userId: string) {
  const role = await access(id, userId);
  const doc = await db.document.findUniqueOrThrow({
    where: { id },
    select: { ...metadata, content: true },
  });
  return { ...doc, role };
}
export async function updateDocument(
  id: string,
  userId: string,
  input: { title?: string; content?: string },
) {
  await access(id, userId, 'edit');
  // Repeat authorization inside the mutation so revocation between check/write cannot bypass it.
  const result = await db.document.updateMany({
    where: { id, OR: [{ ownerId: userId }, { shares: { some: { userId, role: 'EDITOR' } } }] },
    data: {
      ...input,
      ...(input.content !== undefined
        ? { content: contentSchema.parse(sanitize(input.content)) }
        : {}),
    },
  });
  if (!result.count) throw new AppError(403, 'FORBIDDEN', 'Your editing access was revoked.');
  return db.document.findUniqueOrThrow({
    where: { id },
    select: { id: true, title: true, updatedAt: true },
  });
}
export async function deleteDocument(id: string, userId: string) {
  await access(id, userId, 'owner');
  await db.document.delete({ where: { id, ownerId: userId } });
}
export async function listShares(
  id: string,
  userId: string,
  input: { limit: number; cursor?: string },
) {
  await access(id, userId, 'owner');
  const cursor = input.cursor ? idSchema.parse(input.cursor) : undefined;
  const rows = await db.documentShare.findMany({
    where: { documentId: id, ...(cursor ? { id: { gt: cursor } } : {}) },
    orderBy: { id: 'asc' },
    take: input.limit + 1,
    select: { id: true, role: true, user: { select: userSelect } },
  });
  return {
    items: rows.slice(0, input.limit),
    nextCursor: rows.length > input.limit ? rows[input.limit - 1].id : null,
  };
}
export async function shareDocument(
  id: string,
  userId: string,
  input: { email: string; role: 'EDITOR' | 'VIEWER' },
) {
  await access(id, userId, 'owner');
  const user = await db.user.findUnique({ where: { email: input.email }, select: userSelect });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'No demo user has that email address.');
  if (user.id === userId) throw new AppError(400, 'OWNER_SHARE', 'You already own this document.');
  return db.documentShare.upsert({
    where: { documentId_userId: { documentId: id, userId: user.id } },
    update: { role: input.role },
    create: { documentId: id, userId: user.id, role: input.role },
    select: { id: true, role: true, user: { select: userSelect } },
  });
}
export async function changeShare(
  id: string,
  shareId: string,
  userId: string,
  role?: 'EDITOR' | 'VIEWER',
) {
  await access(id, userId, 'owner');
  if (role)
    return db.documentShare.update({
      where: { id: shareId, documentId: id },
      data: { role },
      select: { id: true, role: true, user: { select: userSelect } },
    });
  await db.documentShare.delete({ where: { id: shareId, documentId: id } });
}
