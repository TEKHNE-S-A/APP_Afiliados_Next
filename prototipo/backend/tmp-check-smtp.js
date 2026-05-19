const db = require('./db/connection');
db.query("SELECT TRIM(nusisgrupa) AS grp, TRIM(nusistippa) AS tip, TRIM(nusisvalpa) AS val FROM nusispar WHERE TRIM(nusisgrupa) IN ('SMTP','MAIL_API','MAIL') ORDER BY 1,2")
  .then(r => { console.table(r.rows); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
