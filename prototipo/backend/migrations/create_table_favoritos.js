/**
 * MIGRACIÓN SIMPLIFICADA: Crear tabla de favoritos y recientes prestadores
 */

const { Pool } = require('pg')

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'app_afiliados_genexus',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Creando tabla nu_favoritos_prestadores...')

    // Crear tabla
    await client.query(`
      CREATE TABLE IF NOT EXISTS nu_favoritos_prestadores (
        nufavid SERIAL PRIMARY KEY,
        nuusuid VARCHAR(100) NOT NULL,
        caentid CHAR(30) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'favorito' CHECK (tipo IN ('favorito', 'reciente')),
        nufeccrea TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_nu_favoritos_nuusuari FOREIGN KEY (nuusuid) REFERENCES nuusuari(nuusuid) ON DELETE CASCADE,
        CONSTRAINT unique_favorito_per_user UNIQUE (nuusuid, caentid, tipo)
      );
    `)
    console.log('✅ Tabla creada')

    // Crear índices
    await client.query('CREATE INDEX IF NOT EXISTS idx_favoritos_nuusuid ON nu_favoritos_prestadores(nuusuid);')
    await client.query('CREATE INDEX IF NOT EXISTS idx_favoritos_caentid ON nu_favoritos_prestadores(caentid);')
    await client.query('CREATE INDEX IF NOT EXISTS idx_favoritos_tipo ON nu_favoritos_prestadores(tipo);')
    console.log('✅ Índices creados')

    // Verificar si hay datos
    const checkResult = await client.query('SELECT COUNT(*) as cnt FROM nu_favoritos_prestadores')
    const rowCount = checkResult.rows[0].cnt

    if (rowCount === 0) {
      await client.query(`
        INSERT INTO nu_favoritos_prestadores (nuusuid, caentid, tipo, nufeccrea)
        VALUES 
          ('ca87f1be-ac8c-46b8-9652-7cc2e6e58eda', '000000000000000000000000000001', 'favorito', CURRENT_TIMESTAMP - INTERVAL '5 days'),
          ('ca87f1be-ac8c-46b8-9652-7cc2e6e58eda', '000000000000000000000000000002', 'favorito', CURRENT_TIMESTAMP - INTERVAL '3 days'),
          ('ca87f1be-ac8c-46b8-9652-7cc2e6e58eda', '000000000000000000000000000003', 'reciente', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
          ('ca87f1be-ac8c-46b8-9652-7cc2e6e58eda', '000000000000000000000000000004', 'reciente', CURRENT_TIMESTAMP - INTERVAL '30 minutes')
        ON CONFLICT DO NOTHING;
      `)
      console.log('✅ Datos de prueba insertados')
    }

    // Mostrar estadísticas
    const stats = await client.query(`
      SELECT COUNT(*) as total, tipo FROM nu_favoritos_prestadores GROUP BY tipo ORDER BY tipo
    `)
    console.log('\n📊 Registros por tipo:')
    stats.rows.forEach(r => console.log(`  ${r.tipo}: ${r.total}`))

    console.log('\n✅ MIGRACIÓN COMPLETADA')

  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Tabla ya existe')
    } else {
      console.error('❌ Error:', error.message)
      throw error
    }
  } finally {
    await client.end()
    await pool.end()
  }
}

runMigration().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
