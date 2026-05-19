const fs = require('fs');
const path = require('path');
const db = require('../db/connection');

async function main() {
  const sqlPath = path.join(__dirname, '..', 'db', 'insert_parametro_habilitar_gam.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await db.query(sql);

  const result = await db.query(
    "SELECT nusisgrupa, nusistippa, nusisvalpa FROM nusispar WHERE nusisgrupa='SEGURIDAD_APP' AND nusistippa='HabilitarGAM'"
  );

  console.log('Parametro aplicado:', result.rows);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error aplicando parametro HabilitarGAM:', error);
    process.exit(1);
  });
