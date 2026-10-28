import { app } from './app.js';
import { db } from './db.js';
const server=app.listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Folio API listening'));
function shutdown(){ server.close(()=>{void db.$disconnect().then(()=>process.exit(0));}); setTimeout(()=>process.exit(1),10000).unref(); }
process.on('SIGTERM',shutdown);
process.on('SIGINT',shutdown);
