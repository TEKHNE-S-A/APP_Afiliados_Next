const { Pool } = require('pg')
const pool = new Pool({ host: 'localhost', port: 5432, database: 'app_afiliados_genexus', user: 'postgres', password: 'postgres' })

async function main() {
  const r = await pool.query("SELECT nusisvalpa FROM nusispar WHERE nusisgrupa='SEGURIDAD_APP' AND nusistippa='BackendAdminEmails'")
  console.log('Emails admin en BD:', r.rows[0]?.nusisvalpa || '(vacío)')

  const u = await pool.query("SELECT nuusumail, nuusunom FROM nuusuari WHERE nuusumail LIKE '%admin%' LIMIT 10")
  console.log('Usuarios admin en nuusuari:', u.rows)
  pool.end()
}
main().catch(e => { console.error(e.message); pool.end() })
