import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { db } from './db.js';
import { router } from './routes.js';
import { AppError, errorHandler } from './errors.js';
export const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null },
    },
  }),
);
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ error: { code: 'UNAVAILABLE', message: 'Database is unavailable.' } });
  }
});
app.use('/api', router);
app.use('/api', () => {
  throw new AppError(404, 'NOT_FOUND', 'This API endpoint does not exist.');
});
const webRoot = fileURLToPath(new URL('../../../client/dist/', import.meta.url));
if (existsSync(join(webRoot, 'index.html')) && process.env.NODE_ENV !== 'test') {
  app.use('/assets', express.static(join(webRoot, 'assets'), { maxAge: '1y', immutable: true }));
  app.use('/assets', () => {
    throw new AppError(404, 'NOT_FOUND', 'This asset does not exist.');
  });
  app.use(express.static(webRoot, { index: false, maxAge: 0 }));
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(join(webRoot, 'index.html'));
  });
}
app.use(errorHandler);
