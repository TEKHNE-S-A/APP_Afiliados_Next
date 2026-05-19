const db = require('./db/connection');

async function main() {
  const r = await db.pool.query(
    `SELECT nuusuid, TRIM(nuusuapell) AS nuusuapell, TRIM(nuusumail) AS nuusumail,
            TRIM(nuusunroaf) AS nuusunroaf, TRIM(nuususexo) AS nuususexo,
            TRIM(nuusuafili) AS nuusuafili, nuusufecha, nuusuactiv
     FROM nuusuari
     WHERE LOWER(TRIM(nuusumail)) = LOWER($1)
     LIMIT 1`,
    [process.argv[2] || 'admin@test.local']
  );
  if (!r.rows.length) {
    console.log('Usuario no encontrado para:', process.argv[2] || 'admin@test.local');
  } else {
    console.log(JSON.stringify(r.rows[0], null, 2));
  }
  process.exit(0);
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
