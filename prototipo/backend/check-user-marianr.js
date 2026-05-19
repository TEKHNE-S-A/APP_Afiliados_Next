const db = require('./db/connection')

async function checkUser() {
  try {
    const result = await db.query(`
      SELECT nuusuid, nuusumail, nuusuafili,
             nuusubajaf, nuusufecha, nuusugamtok IS NOT NULL as tiene_token
      FROM nuusuari 
      WHERE nuusumail = 'marianr@tekhne.com.ar'
    `)
    
    if (result.rows.length === 0) {
      console.log('Usuario no encontrado')
    } else {
      console.log('Usuario encontrado:')
      console.log(JSON.stringify(result.rows[0], null, 2))
    }
    
    // Verificar contraseña en nuusuauth
    const authResult = await db.query(`
      SELECT nuusuid, nuusupass IS NOT NULL as tiene_password_local
      FROM nuusuauth
      WHERE nuusuid = $1
    `, [result.rows[0]?.nuusuid])
    
    console.log('\nAutenticación local:')
    if (authResult.rows.length === 0) {
      console.log('Sin contraseña local guardada')
    } else {
      console.log(JSON.stringify(authResult.rows[0], null, 2))
    }
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    process.exit(0)
  }
}

checkUser()
