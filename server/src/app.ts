import express from 'express';
import helmet from 'helmet';
import { db } from './db.js';
export const app = express();
app.use(helmet());
app.use(express.json({limit:'1mb'}));
app.get('/api/health',async (_req,res)=>{
  try { await db.$queryRaw`SELECT 1`; res.json({status:'ok'}); }
  catch { res.status(503).json({error:{code:'UNAVAILABLE',message:'Database is unavailable.'}}); }
});
