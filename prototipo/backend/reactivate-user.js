const db = require('./db/connection')

async function reactivateUser() {
  try {
    await db.query(`
      UPDATE nuusuari 
      SET nuusubajaf = NULL 
      WHERE nuusumail = 'marianr@tekhne.com.ar'
    `)
    
    console.log('✅ Usuario reactivado en BD local')
    
    const result = await db.query(`
      SELECT nuusuid, nuusumail, nuusubajaf 
      FROM nuusuari 
      WHERE nuusumail = 'marianr@tekhne.com.ar'
    `)
    
    console.log('Estado actual:', result.rows[0])
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    process.exit(0)
  }
}

reactivateUser()
