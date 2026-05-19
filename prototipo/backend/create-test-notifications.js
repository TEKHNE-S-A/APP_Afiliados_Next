// Script para crear notificaciones de prueba
// Ejecutar: node create-test-notifications.js

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'app_afiliados_genexus',
  user: 'postgres',
  password: '12345678',
});

async function createTestNotifications() {
  try {
    console.log('\n========================================');
    console.log('CREAR NOTIFICACIONES DE PRUEBA');
    console.log('========================================\n');

    // 1. Obtener nuusuid del usuario
    console.log('1. Obteniendo usuarios más recientes...');
    const userResult = await pool.query(
      `SELECT nuusuid, nuusumail FROM nuusuari ORDER BY nuusuid DESC LIMIT 5`
    );

    if (userResult.rows.length === 0) {
      console.log('[ERROR] No se encontró ningún usuario en la base de datos');
      console.log('Por favor, crea un usuario primero.');
      process.exit(1);
    }

    console.log('Usuarios disponibles:');
    userResult.rows.forEach((u, i) => {
      console.log(`  ${i+1}. ${u.nuusumail} (ID: ${u.nuusuid})`);
    });

    // Usar el primer usuario (más reciente)
    const nuusuid = userResult.rows[0].nuusuid;
    const email = userResult.rows[0].nuusumail;
    console.log(`\n[OK] Usando usuario: ${email} (ID: ${nuusuid})`);

    // 2. Verificar notificaciones existentes
    console.log('\n2. Verificando notificaciones existentes...');
    const existingResult = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE nuusuid = $1`,
      [nuusuid]
    );
    const existingCount = parseInt(existingResult.rows[0].count);
    console.log(`[OK] Notificaciones existentes: ${existingCount}`);

    // 3. Insertar notificaciones de prueba
    console.log('\n3. Insertando 10 notificaciones de prueba...');

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const notifications = [
      // 5 NO LEÍDAS
      {
        tipo: 'autorizacion',
        titulo: 'Autorización Aprobada',
        mensaje: 'Tu solicitud de autorización para consulta médica ha sido aprobada.',
        leida: false,
        fecha_creacion: now.toISOString()
      },
      {
        tipo: 'autorizacion',
        titulo: 'Autorización Pendiente',
        mensaje: 'Tu solicitud de autorización está en proceso de revisión.',
        leida: false,
        fecha_creacion: yesterday.toISOString()
      },
      {
        tipo: 'credencial',
        titulo: 'Credencial Actualizada',
        mensaje: 'Se actualizó tu credencial digital. Ya puedes ver los cambios.',
        leida: false,
        fecha_creacion: yesterday.toISOString()
      },
      {
        tipo: 'general',
        titulo: 'Bienvenido a OSEP',
        mensaje: 'Gracias por registrarte en nuestra aplicación móvil.',
        leida: false,
        fecha_creacion: twoDaysAgo.toISOString()
      },
      {
        tipo: 'general',
        titulo: 'Nueva Funcionalidad',
        mensaje: 'Ahora puedes gestionar tus autorizaciones desde la app.',
        leida: false,
        fecha_creacion: threeDaysAgo.toISOString()
      },
      // 5 LEÍDAS
      {
        tipo: 'autorizacion',
        titulo: 'Autorización Rechazada',
        mensaje: 'Tu solicitud no cumple con los requisitos necesarios.',
        leida: true,
        fecha_creacion: twoDaysAgo.toISOString(),
        fecha_leida: yesterday.toISOString()
      },
      {
        tipo: 'credencial',
        titulo: 'Credencial por Vencer',
        mensaje: 'Tu credencial vence en 7 días. Por favor, actualízala.',
        leida: true,
        fecha_creacion: threeDaysAgo.toISOString(),
        fecha_leida: twoDaysAgo.toISOString()
      },
      {
        tipo: 'general',
        titulo: 'Mantenimiento Programado',
        mensaje: 'El sistema estará en mantenimiento el próximo domingo.',
        leida: true,
        fecha_creacion: threeDaysAgo.toISOString(),
        fecha_leida: twoDaysAgo.toISOString()
      },
      {
        tipo: 'autorizacion',
        titulo: 'Documento Requerido',
        mensaje: 'Falta adjuntar la prescripción médica en tu solicitud.',
        leida: true,
        fecha_creacion: threeDaysAgo.toISOString(),
        fecha_leida: threeDaysAgo.toISOString()
      },
      {
        tipo: 'credencial',
        titulo: 'Credencial Generada',
        mensaje: 'Tu credencial digital ha sido generada correctamente.',
        leida: true,
        fecha_creacion: threeDaysAgo.toISOString(),
        fecha_leida: threeDaysAgo.toISOString()
      }
    ];

    let inserted = 0;
    for (const notif of notifications) {
      await pool.query(
        `INSERT INTO notifications (nuusuid, tipo, titulo, mensaje, leida, fecha_creacion, fecha_leida, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          nuusuid,
          notif.tipo,
          notif.titulo,
          notif.mensaje,
          notif.leida,
          notif.fecha_creacion,
          notif.fecha_leida || null,
          JSON.stringify({})
        ]
      );
      inserted++;
      process.stdout.write(`\r   Insertando: ${inserted}/10 notificaciones...`);
    }

    console.log('\n[OK] Notificaciones insertadas correctamente');

    // 4. Verificar inserción
    console.log('\n4. Verificando inserción...');
    const finalResult = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE nuusuid = $1`,
      [nuusuid]
    );
    const finalCount = parseInt(finalResult.rows[0].count);
    console.log(`[OK] Total de notificaciones ahora: ${finalCount}`);
    console.log(`[OK] Nuevas notificaciones creadas: ${finalCount - existingCount}`);

    // 5. Resumen por tipo
    console.log('\n5. Resumen por tipo:');
    const summaryResult = await pool.query(
      `SELECT tipo, COUNT(*) as total, SUM(CASE WHEN leida THEN 1 ELSE 0 END) as leidas
       FROM notifications
       WHERE nuusuid = $1
       GROUP BY tipo
       ORDER BY tipo`,
      [nuusuid]
    );

    for (const row of summaryResult.rows) {
      const noLeidas = parseInt(row.total) - parseInt(row.leidas);
      console.log(`   ${row.tipo.padEnd(15)}: ${row.total} total (${noLeidas} no leídas)`);
    }

    console.log('\n========================================');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('========================================\n');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.log(`\n[ERROR] ${error.message}`);
    console.log(error.stack);
    await pool.end();
    process.exit(1);
  }
}

createTestNotifications();
