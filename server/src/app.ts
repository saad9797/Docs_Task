import express from 'express';
import helmet from 'helmet';
import { db } from './db.js';
import { router } from './routes.js';
import { AppError, errorHandler } from './errors.js';
export const app = express();
app.use(helmet());
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({limit:'1mb'}));
app.get('/api/health',async (_req,res)=>{
  try { await db.$queryRaw`SELECT 1`; res.json({status:'ok'}); }
  catch { res.status(503).json({error:{code:'UNAVAILABLE',message:'Database is unavailable.'}}); }
});
app.use('/api', router);
app.use('/api', () => { throw new AppError(404, 'NOT_FOUND', 'This API endpoint does not exist.'); });
app.use(errorHandler);
