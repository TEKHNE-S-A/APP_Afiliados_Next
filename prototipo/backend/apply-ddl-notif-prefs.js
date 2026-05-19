// Script puntual para aplicar el DDL de nu_notif_prefs
// Uso: node apply-ddl-notif-prefs.js
const { pool } = require('./db/connection');
const fs = require('fs');
const path = require('path');

async function run() {
  const sql = fs.readFileSync(path.join(__dirname, 'db/create_notif_prefs_table.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('✅ Tabla nu_notif_prefs creada / ya existía — OK');
  } catch (e) {
    console.error('❌ Error al aplicar DDL:', e.message);
  } finally {
    await pool.end();
  }
}

run();
