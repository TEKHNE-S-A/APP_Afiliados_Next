/**
 * Verificar si hay registros en notifications para nuevo@test.com
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

async function checkNotifications() {
  console.log('🔍 Verificando notifications para nuevo@test.com\n');
  
  try {
    // Buscar el nuusuid actual
    const user = await db.query(
      `SELECT nuusuid, nuusumail FROM nuusuari WHERE nuusumail = $1`,
      ['nuevo@test.com']
    );
    
    if (user.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      process.exit(1);
    }
    
    const nuusuid = user.rows[0].nuusuid;
    console.log(`Usuario: nuevo@test.com`);
    console.log(`nuusuid actual: ${nuusuid}\n`);
    
    // Contar notificaciones
    const notifs = await db.query(
      `SELECT COUNT(*) as cnt FROM notifications WHERE nuusuid = $1`,
      [nuusuid]
    );
    
    console.log(`Notificaciones encontradas: ${notifs.rows[0].cnt}`);
    
    if (notifs.rows[0].cnt > 0) {
      console.log('✅ Hay notificaciones que necesitan actualizarse');
      
      // Mostrar algunas
      const sample = await db.query(
        `SELECT id, nuusuid, title, created_at FROM notifications WHERE nuusuid = $1 LIMIT 5`,
        [nuusuid]
      );
      
      console.log('\nMuestra de notificaciones:');
      sample.rows.forEach(n => {
        console.log(`  ID: ${n.id}, Title: ${n.title || 'NULL'}, Date: ${n.created_at}`);
      });
    } else {
      console.log('⏭️  No hay notificaciones para este usuario');
    }
    
    // Verificar push_tokens
    const tokens = await db.query(
      `SELECT COUNT(*) as cnt FROM push_tokens WHERE nuusuid = $1`,
      [nuusuid]
    );
    
    console.log(`\nPush tokens encontrados: ${tokens.rows[0].cnt}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkNotifications();
