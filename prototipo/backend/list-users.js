// Listar usuarios
const db = require('./db/connection')

;(async () => {
  const result = await db.pool.query('SELECT nuusuid, nuusumail FROM nuusuari LIMIT 5')
  console.log('Usuarios en BD:')
  result.rows.forEach(u => console.log(`  ${u.nuusuid} - ${u.nuusumail}`))
  process.exit(0)
})()
