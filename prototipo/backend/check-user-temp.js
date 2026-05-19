const db = require('./db/connection')

db.query(
  "SELECT nuusuid, nuusumail, nuusubajaf FROM nuusuari WHERE nuusumail = 'patricio.pinetta@tekhne.com.ar'"
).then(r => {
  console.log('Usuario:', r.rows[0])
  process.exit(0)
}).catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
