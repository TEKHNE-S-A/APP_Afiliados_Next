/**
 * Verificar migración completa de un usuario en todas las tablas
 * Revisa que el nuusuid (GUID de GAM) esté actualizado en:
 * - nuusuari (principal)
 * - nuusuauth (autenticación)
 * - crcredus (credenciales del usuario)
 * - notifications (notificaciones)
 * - push_tokens (tokens push)
 * - crcreden (credenciales del grupo familiar)
 */
const path = require('path');
const db = require(path.join(__dirname, 'db', 'connection'));

const email = process.argv[2];

if (!email) {
  console.error('❌ Uso: node verify-user-migration.js <email>');
  console.error('   Ejemplo: node verify-user-migration.js nuevo@test.com');
  process.exit(1);
}

async function verifyUserMigration() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFICACIÓN DE MIGRACIÓN COMPLETA - TODAS LAS TABLAS        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log(`📧 Email: ${email}\n`);
  
  try {
    // 1. Obtener datos principales del usuario
    console.log('1️⃣  NUUSUARI (tabla principal)');
    console.log('─'.repeat(70));
    
    // Primero verificar qué columnas existen
    const columnsResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'nuusuari'
        AND column_name IN ('nuusucuil', 'nuusudocu', 'nuusudni')
    `);
    
    const hasColumns = {
      cuil: columnsResult.rows.some(r => r.column_name === 'nuusucuil'),
      docu: columnsResult.rows.some(r => r.column_name === 'nuusudocu'),
      dni: columnsResult.rows.some(r => r.column_name === 'nuusudni')
    };
    
    // Construir query dinámicamente
    let selectColumns = `
        nuusuid,
        nuusumail,
        nuusuapell,
        nuusuafili,
        nuplaid,
        nuusufecha,
        nuusubajaf,
        nuusunroaf`;
    
    if (hasColumns.cuil) selectColumns += ',\n        nuusucuil';
    if (hasColumns.docu) selectColumns += ',\n        nuusudocu';
    if (hasColumns.dni) selectColumns += ',\n        nuusudni';
    
    selectColumns += `,
        CASE 
          WHEN nuusuid ~ '^[0-9]+$' THEN 'LEGACY (numérico)'
          WHEN nuusuid ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'GAM (GUID)'
          ELSE 'DESCONOCIDO'
        END as tipo_nuusuid`;
    
    const userResult = await db.query(
      `SELECT ${selectColumns}
      FROM nuusuari 
      WHERE nuusumail = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      console.error(`❌ Usuario no encontrado: ${email}`);
      process.exit(1);
    }
    
    const user = userResult.rows[0];
    const nuusuid = user.nuusuid; // Mantener espacios para FK
    const nuusuidDisplay = user.nuusuid.trim(); // Solo para mostrar
    const isGAM = user.tipo_nuusuid === 'GAM (GUID)';
    const isActive = !user.nuusubajaf || new Date(user.nuusubajaf).getFullYear() < 1900;
    
    console.log(`   nuusuid:     ${nuusuidDisplay}`);
    console.log(`   Tipo:        ${user.tipo_nuusuid} ${isGAM ? '✅' : '⚠️'}`);
    console.log(`   Nombre:      ${user.nuusuapell ? user.nuusuapell.trim() : 'N/A'}`);
    console.log(`   AfiliadoId:  ${user.nuusuafili ? user.nuusuafili.trim() : 'N/A'}`);
    console.log(`   Nro Afil:    ${user.nuusunroaf ? user.nuusunroaf.trim() : 'N/A'}`);
    if (hasColumns.cuil) {
      console.log(`   CUIL:        ${user.nuusucuil || 'N/A'}`);
    }
    if (hasColumns.docu || hasColumns.dni) {
      const dniValue = user.nuusudocu || user.nuusudni || 'N/A';
      console.log(`   DNI:         ${dniValue}`);
    }
    console.log(`   PlanId:      ${user.nuplaid ? user.nuplaid.trim() : 'N/A'}`);
    console.log(`   Fecha alta:  ${user.nuusufecha ? new Date(user.nuusufecha).toLocaleDateString('es-AR') : 'N/A'}`);
    console.log(`   Estado:      ${isActive ? 'ACTIVO ✅' : 'INACTIVO ❌'}`);
    console.log('');
    
    // 2. Verificar nuusuauth (autenticación)
    console.log('2️⃣  NUUSUAUTH (autenticación)');
    console.log('─'.repeat(70));
    const authResult = await db.query(
      'SELECT nuusuid, nuusucrea, nuusuultm FROM nuusuauth WHERE nuusuid = $1',
      [nuusuid]
    );
    
    if (authResult.rows.length > 0) {
      const auth = authResult.rows[0];
      const match = auth.nuusuid === nuusuid; // Comparar sin trim
      console.log(`   nuusuid:     ${auth.nuusuid.trim()} ${match ? '✅' : '❌ NO COINCIDE'}`);
      console.log(`   Creado:      ${auth.nuusucrea ? new Date(auth.nuusucrea).toLocaleString('es-AR') : 'N/A'}`);
      console.log(`   Últ. modif:  ${auth.nuusuultm ? new Date(auth.nuusuultm).toLocaleString('es-AR') : 'N/A'}`);
    } else {
      console.log(`   ⚠️  No existe registro en nuusuauth para este usuario`);
    }
    console.log('');
    
    // 3. Verificar crcredus (relación usuario-credenciales)
    console.log('3️⃣  CRCREDUS (relación usuario-credenciales)');
    console.log('─'.repeat(70));
    const credusResult = await db.query(
      `SELECT 
        nuusuid,
        crcreid,
        crcrepropi
      FROM crcredus 
      WHERE nuusuid = $1
      ORDER BY crcreid`,
      [nuusuid]
    );
    
    if (credusResult.rows.length > 0) {
      console.log(`   Total registros: ${credusResult.rows.length}`);
      credusResult.rows.forEach((cred, idx) => {
        const match = cred.nuusuid === nuusuid; // Comparar sin trim
        const esPropia = cred.crcrepropi.trim() === 'S' ? '  PROPIA' : 'COMPARTIDA';
        console.log(`   [${idx + 1}] crcreid: ${cred.crcreid.trim()}, tipo: ${esPropia}, nuusuid: ${match ? '✅' : '❌'}`);
      });
    } else {
      console.log(`   ⚠️  No hay credenciales asociadas en crcredus`);
    }
    console.log('');
    
    // 4. Verificar crcreden (datos de credenciales) via JOIN con crcredus
    console.log('4️⃣  CRCREDEN (credenciales completas - via JOIN)');
    console.log('─'.repeat(70));
    const credenResult = await db.query(
      `SELECT 
        c.crcreid,
        c.crcreafili,
        c.crcrefecvi,
        c.crcrenroaf,
        c.crcreapeno,
        c.crcrecuil,
        c.crcredocum,
        c.crcresexo,
        c.crcrehash,
        us.crcrepropi
      FROM crcreden c
      INNER JOIN crcredus us ON us.crcreid = c.crcreid
      WHERE us.nuusuid = $1
      ORDER BY us.crcrepropi DESC, c.crcreid`,
      [nuusuid]
    );
    
    if (credenResult.rows.length > 0) {
      console.log(`   Total credenciales: ${credenResult.rows.length}`);
      credenResult.rows.forEach((cred, idx) => {
        const tipo = cred.crcrepropi.trim() === 'S' ? 'TITULAR/PROPIA' : 'FAMILIAR';
        const vencimiento = cred.crcrefecvi ? new Date(cred.crcrefecvi).toLocaleDateString('es-AR') : 'N/A';
        console.log(`   [${idx + 1}] ${tipo} - ${cred.crcreapeno ? cred.crcreapeno.trim() : 'N/A'}`);
        console.log(`       crcreid:     ${cred.crcreid.trim()}`);
        console.log(`       AfiliadoId:  ${cred.crcreafili ? cred.crcreafili.trim() : 'N/A'}`);
        console.log(`       Nro Afil:    ${cred.crcrenroaf ? cred.crcrenroaf.trim() : 'N/A'}`);
        console.log(`       CUIL:        ${cred.crcrecuil || 'N/A'}`);
        console.log(`       DNI:         ${cred.crcredocum ? cred.crcredocum.trim() : 'N/A'}`);
        console.log(`       Sexo:        ${cred.crcresexo || 'N/A'}`);
        console.log(`       Vencimiento: ${vencimiento}`);
        console.log(`       Hash:        ${cred.crcrehash ? cred.crcrehash.substring(0, 16) + '...' : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log(`   ⚠️  No hay credenciales para este usuario`);
    }
    console.log('');
    
    // 5. Verificar notifications (si existe la tabla)
    console.log('5️⃣  NOTIFICATIONS (notificaciones)');
    console.log('─'.repeat(70));
    try {
      const notifResult = await db.query(
        `SELECT COUNT(*) as total 
         FROM notifications 
         WHERE nuusuid = $1`,
        [nuusuid]
      );
      
      const total = parseInt(notifResult.rows[0].total);
      if (total > 0) {
        console.log(`   Total notificaciones: ${total} ✅`);
        
        // Obtener columnas disponibles para evitar errores
        const columnsResult = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'notifications'
        `);
        const columns = columnsResult.rows.map(r => r.column_name);
        
        // Construir query dinámicamente según columnas disponibles
        let selectCols = 'id';
        if (columns.includes('titulo')) selectCols += ', titulo';
        if (columns.includes('titulo_notificacion')) selectCols += ', titulo_notificacion as titulo';
        if (columns.includes('mensaje')) selectCols += ', mensaje';
        if (columns.includes('mensaje_notificacion')) selectCols += ', mensaje_notificacion as mensaje';
        if (columns.includes('leida')) selectCols += ', leida';
        if (columns.includes('leido')) selectCols += ', leido as leida';
        if (columns.includes('fecha_creacion')) selectCols += ', fecha_creacion';
        if (columns.includes('creado_en')) selectCols += ', creado_en as fecha_creacion';
        
        const detailResult = await db.query(
          `SELECT ${selectCols}
           FROM notifications 
           WHERE nuusuid = $1
           ORDER BY ${columns.includes('fecha_creacion') ? 'fecha_creacion' : columns.includes('creado_en') ? 'creado_en' : 'id'} DESC
           LIMIT 3`,
          [nuusuid]
        );
        
        if (detailResult.rows.length > 0) {
          detailResult.rows.forEach((notif, idx) => {
            const titulo = notif.titulo || notif.titulo_notificacion || 'Sin título';
            const estado = notif.leida === true || notif.leido === true ? 'Leída' : 'No leída';
            const fecha = notif.fecha_creacion || notif.creado_en;
            const fechaStr = fecha ? new Date(fecha).toLocaleDateString('es-AR') : 'N/A';
            console.log(`   [${idx + 1}] ${titulo} - ${estado} (${fechaStr})`);
          });
        }
      } else {
        console.log(`   No hay notificaciones`);
      }
    } catch (error) {
      console.log(`   ⚠️  Tabla notifications no existe o error: ${error.message}`);
    }
    console.log('');
    
    // 6. Verificar push_tokens (si existe la tabla)
    console.log('6️⃣  PUSH_TOKENS (tokens de notificaciones push)');
    console.log('─'.repeat(70));
    try {
      // Primero verificar si la tabla existe
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'push_tokens'
        ) as exists
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log(`   ⚠️  Tabla push_tokens no existe`);
      } else {
        // Obtener columnas disponibles
        const columnsResult = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'push_tokens'
        `);
        const columns = columnsResult.rows.map(r => r.column_name);
        
        // Construir query dinámicamente
        let selectCols = '';
        if (columns.includes('token')) selectCols += 'token';
        else if (columns.includes('push_token')) selectCols += 'push_token as token';
        
        if (columns.includes('device_type')) selectCols += ', device_type';
        else if (columns.includes('tipo_dispositivo')) selectCols += ', tipo_dispositivo as device_type';
        
        if (columns.includes('activo')) selectCols += ', activo';
        else if (columns.includes('active')) selectCols += ', active as activo';
        
        if (columns.includes('fecha_creacion')) selectCols += ', fecha_creacion';
        else if (columns.includes('creado_en')) selectCols += ', creado_en as fecha_creacion';
        
        if (!selectCols) {
          console.log(`   ⚠️  Estructura de tabla push_tokens no reconocida`);
        } else {
          const tokenResult = await db.query(
            `SELECT ${selectCols}
             FROM push_tokens 
             WHERE nuusuid = $1
             ORDER BY ${columns.includes('fecha_creacion') ? 'fecha_creacion' : columns.includes('creado_en') ? 'creado_en' : 'id'} DESC`,
            [nuusuid]
          );
          
          if (tokenResult.rows.length > 0) {
            console.log(`   Total tokens: ${tokenResult.rows.length}`);
            tokenResult.rows.forEach((tok, idx) => {
              const tokenShort = tok.token ? tok.token.substring(0, 20) + '...' : 'N/A';
              const estado = tok.activo === true || tok.activo === 'S' ? 'Activo ✅' : 'Inactivo ❌';
              console.log(`   [${idx + 1}] ${tok.device_type || 'N/A'} - ${estado} - ${tokenShort}`);
            });
          } else {
            console.log(`   No hay tokens push registrados`);
          }
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Tabla push_tokens no existe o error: ${error.message}`);
    }
    console.log('');
    
    // RESUMEN FINAL
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      RESUMEN DE VERIFICACIÓN                   ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    const checks = [
      { tabla: 'nuusuari', ok: true, detalle: `Tipo: ${user.tipo_nuusuid}` },
      { tabla: 'nuusuauth', ok: authResult.rows.length > 0, detalle: authResult.rows.length > 0 ? 'OK' : 'Sin registro' },
      { tabla: 'crcredus', ok: credusResult.rows.length > 0, detalle: `${credusResult.rows.length} registros` },
      { tabla: 'crcreden (JOIN)', ok: credenResult.rows.length > 0, detalle: `${credenResult.rows.length} credenciales` }
    ];
    
    checks.forEach(check => {
      const icon = check.ok ? '✅' : '⚠️';
      console.log(`   ${icon} ${check.tabla.padEnd(15)} - ${check.detalle}`);
    });
    
    console.log('');
    
    if (isGAM) {
      console.log('✅ Usuario correctamente migrado a GAM (GUID presente)');
    } else {
      console.log('⚠️  Usuario aún en formato LEGACY (numérico)');
      console.log('   Para migrar, ejecutar login con credentials válidas de GAM');
    }
    
    console.log('\n✅ Verificación completada\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyUserMigration();
