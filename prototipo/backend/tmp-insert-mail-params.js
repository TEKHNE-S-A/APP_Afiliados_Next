const db = require('./db/connection');
(async () => {
  const params = [
    ['EMAIL',    'Provider',   'SMTP'],
    ['MAIL_API', 'Url',        'http://tkqa.tekhne.com.ar:8081/api/mail/send'],
    ['MAIL_API', 'ApiKey',     'TU_API_KEY_AQUI'],
    ['MAIL_API', 'FromEmail',  'noreply@osep.gob.ar'],
    ['MAIL_API', 'FromName',   'OSEP App Afiliados'],
    ['MAIL_API', 'Habilitado', 'N'],
  ];
  const sql = 'INSERT INTO nusispar (nusisgrupa, nusistippa, nusisvalpa) VALUES ($1, $2, $3) ON CONFLICT (nusisgrupa, nusistippa) DO UPDATE SET nusisvalpa = EXCLUDED.nusisvalpa';
  for (const [g, t, v] of params) {
    await db.query(sql, [g, t, v]);
    console.log('  Insertado:', g, t, v);
  }
  const r = await db.query("SELECT TRIM(nusisgrupa) AS g, TRIM(nusistippa) AS t, TRIM(nusisvalpa) AS v FROM nusispar WHERE TRIM(nusisgrupa) IN ('EMAIL','MAIL_API') ORDER BY 1,2");
  console.table(r.rows);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
