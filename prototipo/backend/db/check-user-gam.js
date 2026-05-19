const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345678',
  database: 'app_afiliados_genexus'
})

async function checkUserGAM() {
  try {
    const result = await pool.query(`
      SELECT 
        nuusuid, 
        nuusumail, 
        CASE WHEN nuusuid ~ '^[0-9]+$' THEN false ELSE true END AS es_usuario_gam,
        nuusugamtok IS NOT NULL as tiene_token_gam,
        LEFT(nuusugamtok, 50) as token_preview
      FROM nuusuari 
      WHERE nuusumail = 'marianr@tekhne.com.ar'
    `)
    
    if (result.rows.length > 0) {
      console.log('Usuario encontrado:')
      console.log(JSON.stringify(result.rows[0], null, 2))
    } else {
      console.log('Usuario NO encontrado')
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkUserGAM()
