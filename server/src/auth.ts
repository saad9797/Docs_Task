import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { db } from './db.js';
import { AppError } from './errors.js';
import { idSchema } from './validation.js';
declare module 'express-serve-static-core' { interface Request { userId: string } }
export function secret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters.');
  return value;
}
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  let userId: string;
  try {
    if (!token) throw new Error();
    const payload = jwt.verify(token, secret(), { algorithms: ['HS256'], issuer: 'folio', audience: 'folio-web' });
    userId = idSchema.parse(typeof payload === 'object' ? payload.sub : undefined);
  } catch { throw new AppError(401, 'UNAUTHENTICATED', 'Your session has expired. Please choose a user again.'); }
  if (!await db.user.findUnique({ where: { id: userId }, select: { id: true } })) throw new AppError(401, 'UNAUTHENTICATED', 'This user no longer exists.');
  req.userId = userId;
  next();
};
