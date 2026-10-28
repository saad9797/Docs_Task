import EmbeddedPostgres from 'embedded-postgres';
const pg = new EmbeddedPostgres({
  databaseDir: '.local-postgres',
  user: 'postgres',
  password: 'postgres',
  port: 54329,
  persistent: true,
  initdbFlags: ['--encoding=UTF8'],
});
await pg.initialise();
await pg.start();
const client = pg.getPgClient();
await client.connect();
for (const name of ['folio', 'folio_test']) {
  try {
    await client.query(
      `CREATE DATABASE ${name} ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
  } catch (err) {
    if (!String(err).includes('already exists')) throw err;
  }
}
await client.end();
console.log('Local PostgreSQL ready on 54329 (folio and folio_test). Keep this terminal open.');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void pg.stop().then(() => process.exit(0));
  });
setInterval(() => {}, 60000);
