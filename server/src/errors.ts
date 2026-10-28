import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { Prisma } from '@prisma/client';
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  void _next;
  if (err instanceof AppError) { res.status(err.status).json({ error: { code: err.code, message: err.message } }); return; }
  if (err instanceof ZodError) { res.status(400).json({ error: { code: 'VALIDATION', message: err.issues.map(i => `${i.path.join('.') || 'Input'}: ${i.message}`).join('; ') } }); return; }
  if (err instanceof multer.MulterError) { res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: { code: 'UPLOAD', message: err.code === 'LIMIT_FILE_SIZE' ? 'The file exceeds the 2 MB limit.' : 'Upload exactly one file in the file field.' } }); return; }
  if (err instanceof Prisma.PrismaClientKnownRequestError && ['P2025', 'P2003'].includes(err.code)) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This item no longer exists.' } }); return; }
  if (err instanceof SyntaxError && 'body' in err) { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } }); return; }
  if (err?.type === 'entity.too.large') { res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Document content is too large. Keep it below 500 KB.' } }); return; }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
};
