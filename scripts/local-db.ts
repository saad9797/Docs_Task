import EmbeddedPostgres from 'embedded-postgres';
const pg=new EmbeddedPostgres({databaseDir:'.local-postgres',user:'postgres',password:'postgres',port:54329,persistent:true});
await pg.initialise();
await pg.start();
for(const name of ['folio','folio_test']){try{await pg.createDatabase(name);}catch(err){if(!String(err).includes('already exists'))throw err;}}
console.log('Local PostgreSQL ready on 54329 (folio and folio_test). Keep this terminal open.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void pg.stop().then(()=>process.exit(0));});
setInterval(()=>{},60000);
