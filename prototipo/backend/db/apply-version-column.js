/**
 * Aplica migración: campo `version` a tablas principales
 * Uso: node backend/db/apply-version-column.js
 */
const path = require('path')
const fs = require('fs')
const { Pool } = require('pg')

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')
)

const pool = new Pool({
  host: config.db?.host || 'localhost',
  port: config.db?.port || 5432,
  database: config.db?.database || 'app_afiliados_genexus',
  user: config.db?.user || 'postgres',
  password: config.db?.password || '12345678',
})

const sql = fs.readFileSync(path.join(__dirname, 'add_version_column.sql'), 'utf8')

async function main() {
  const client = await pool.connect()
  try {
    console.log('⏳ Aplicando migración add_version_column.sql...')
    await client.query(sql)
    console.log('✅ Migración aplicada correctamente')

    // Verificar columnas creadas
    const res = await client.query(`
      SELECT table_name, column_name, column_default
      FROM information_schema.columns
      WHERE table_name IN ('nuusuari','crcreden','ausolici','nusispar','nuplan')
        AND column_name = 'version'
      ORDER BY table_name
    `)
    console.log(`\n📋 Columnas 'version' encontradas: ${res.rows.length}`)
    res.rows.forEach((r) =>
      console.log(`   ${r.table_name}.version  default: ${r.column_default}`)
    )
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('❌ Error aplicando migración:', e.message)
  process.exit(1)
})
