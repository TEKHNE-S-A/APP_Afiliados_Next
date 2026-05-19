const db = require('../db/connection');
(async () => {
  try {
    const result = await db.query('SELECT COUNT(*) as total FROM nuusuari WHERE nuusumail IS NOT NULL AND nuusumail != \'\' AND nuusubajaf IS NULL');
    console.log(JSON.stringify({ success: true, total: result.rows[0].total }));
    process.exit(0);
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: e.message }));
    process.exit(1);
  }
})();
