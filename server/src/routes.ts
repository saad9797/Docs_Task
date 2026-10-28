import { Router } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { db } from './db.js';
import { authenticate, secret } from './auth.js';
import { AppError } from './errors.js';
import {
  createSchema,
  updateSchema,
  idSchema,
  listSchema,
  loginSchema,
  pageSchema,
  shareSchema,
  roleSchema,
} from './validation.js';
import * as docs from './services/documents.js';
import { importDocument } from './services/imports.js';
export const router = Router();
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      error: {
        code: 'RATE_LIMIT',
        message: 'Too many requests. Please wait a minute and try again.',
      },
    },
  }),
);
router.get('/auth/users', async (_req, res) => {
  res.json({
    items: await db.user.findMany({
      orderBy: { name: 'asc' },
      take: 4,
      select: { id: true, email: true, name: true },
    }),
  });
});
router.post('/auth/login', async (req, res) => {
  const { userId } = loginSchema.parse(req.body);
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Choose an existing demo user.');
  res.json({
    user,
    token: jwt.sign({}, secret(), {
      subject: user.id,
      expiresIn: '12h',
      algorithm: 'HS256',
      issuer: 'folio',
      audience: 'folio-web',
    }),
  });
});
router.use(authenticate);
router.post(
  '/documents/import',
  rateLimit({
    windowMs: 60000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: {
      error: { code: 'RATE_LIMIT', message: 'Import limit reached. Please wait a minute.' },
    },
  }),
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  }).single('file'),
  async (req, res) => {
    res.status(201).json({ ...(await importDocument(req.userId, req.file)), role: 'OWNER' });
  },
);
router.get('/auth/me', async (req, res) => {
  res.json(
    await db.user.findUniqueOrThrow({
      where: { id: req.userId },
      select: { id: true, name: true, email: true },
    }),
  );
});
router.get('/documents', async (req, res) =>
  res.json(await docs.listDocuments(req.userId, listSchema.parse(req.query))),
);
router.post('/documents', async (req, res) =>
  res.status(201).json({
    ...(await docs.createDocument(req.userId, createSchema.parse(req.body))),
    role: 'OWNER',
  }),
);
router.get('/documents/:id', async (req, res) =>
  res.json(await docs.fetchDocument(idSchema.parse(req.params.id), req.userId)),
);
router.patch('/documents/:id', async (req, res) =>
  res.json(
    await docs.updateDocument(
      idSchema.parse(req.params.id),
      req.userId,
      updateSchema.parse(req.body),
    ),
  ),
);
router.delete('/documents/:id', async (req, res) => {
  await docs.deleteDocument(idSchema.parse(req.params.id), req.userId);
  res.sendStatus(204);
});
router.get('/documents/:id/shares', async (req, res) =>
  res.json(
    await docs.listShares(idSchema.parse(req.params.id), req.userId, pageSchema.parse(req.query)),
  ),
);
router.put('/documents/:id/shares', async (req, res) =>
  res.json(
    await docs.shareDocument(
      idSchema.parse(req.params.id),
      req.userId,
      shareSchema.parse(req.body),
    ),
  ),
);
router.patch('/documents/:id/shares/:shareId', async (req, res) =>
  res.json(
    await docs.changeShare(
      idSchema.parse(req.params.id),
      idSchema.parse(req.params.shareId),
      req.userId,
      roleSchema.parse(req.body).role,
    ),
  ),
);
router.delete('/documents/:id/shares/:shareId', async (req, res) => {
  await docs.changeShare(
    idSchema.parse(req.params.id),
    idSchema.parse(req.params.shareId),
    req.userId,
  );
  res.sendStatus(204);
});
