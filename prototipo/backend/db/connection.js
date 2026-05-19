/**
 * Conexión a PostgreSQL usando node-postgres (pg)
 * Base de datos: app_afiliados_genexus
 */

const { Pool } = require('pg')

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'app_afiliados_genexus',
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Verificar conexión al iniciar
pool.on('connect', () => {
  console.log('✅ Conexión a PostgreSQL establecida')
})

pool.on('error', (err) => {
  console.error('❌ Error inesperado en PostgreSQL pool:', err)
  // NO hacer process.exit() - solo loguear el error
  // El pool se encargará de reconectar automáticamente
})

/**
 * Ejecuta una query SQL
 * @param {string} text - Query SQL
 * @param {Array} params - Parámetros de la query
 * @returns {Promise<Object>} Resultado de la query
 */
async function query(text, params) {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Query ejecutada:', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error('Error en query:', error)
    throw error
  }
}

/**
 * Obtiene un cliente del pool para transacciones
 * @returns {Promise<PoolClient>}
 */
async function getClient() {
  console.log('🔍 Verificando pool.getClient:', typeof pool.getClient)
  console.log('🔍 Pool objeto:', Object.keys(pool))
  const client = await pool.connect()  // Usar connect() en lugar de getClient()
  const query = client.query
  const release = client.release
  
  // Timeout para transacciones largas
  const timeout = setTimeout(() => {
    console.error('❌ Cliente no liberado después de 5 segundos')
  }, 5000)
  
  // Sobrescribir release para limpiar timeout
  client.release = () => {
    clearTimeout(timeout)
    client.query = query
    client.release = release
    return release.apply(client)
  }
  
  return client
}

module.exports = {
  query,
  getClient,
  pool,
}
