const db = require('./db/connection');

async function updateLogicalDeletionToUseBajaf() {
  const client = await db.pool.connect();
  
  try {
    console.log('🔧 Actualizando eliminación lógica para usar nuusubajaf...\n');
    
    // 1. Actualizar vista v_usuarios_tipo
    console.log('1️⃣  Actualizando vista v_usuarios_tipo...');
    await client.query(`DROP VIEW IF EXISTS v_usuarios_tipo CASCADE`);
    await client.query(`
      CREATE OR REPLACE VIEW v_usuarios_tipo AS
      SELECT 
        nuusuid,
        nuusumail,
        nuusunroaf,
        nuusuapell,
        nuusubajaf,
        CASE 
          WHEN nuusuid !~ '^[0-9]+$' THEN 'GAM'
          WHEN nuusuid ~ '^[0-9]+$' THEN 'LOCAL'
          ELSE 'DESCONOCIDO'
        END AS tipo_autenticacion,
        nuusugamexp,
        CASE 
          WHEN nuusugamexp IS NOT NULL AND nuusugamexp > NOW() THEN 'VÁLIDO'
          WHEN nuusugamexp IS NOT NULL AND nuusugamexp <= NOW() THEN 'EXPIRADO'
          ELSE NULL
        END AS estado_token_gam,
        CASE 
          WHEN nuusubajaf IS NULL THEN 'ACTIVO'
          WHEN nuusubajaf IS NOT NULL THEN 'DESACTIVADO'
          ELSE 'DESCONOCIDO'
        END AS estado_usuario
      FROM nuusuari
    `);
    console.log('   ✅ Vista actualizada\n');
    
    // 2. Actualizar vista v_usuarios_activos
    console.log('2️⃣  Actualizando vista v_usuarios_activos...');
    await client.query(`
      CREATE OR REPLACE VIEW v_usuarios_activos AS
      SELECT 
        nuusuid,
        nuusumail,
        nuusunroaf,
        nuusuapell,
        nuusutelef,
        nuusuafili,
        nuusugamexp
      FROM nuusuari
      WHERE nuusubajaf IS NULL
    `);
    console.log('   ✅ Vista actualizada\n');
    
    // 3. Actualizar índice
    console.log('3️⃣  Actualizando índice...');
    await client.query(`DROP INDEX IF EXISTS idx_nuusuari_activo`);
    await client.query(`
      CREATE INDEX idx_nuusuari_bajaf ON nuusuari(nuusubajaf) WHERE nuusubajaf IS NULL
    `);
    console.log('   ✅ Índice actualizado\n');
    
    // 4. Actualizar función desactivar_usuario
    console.log('4️⃣  Actualizando función desactivar_usuario()...');
    await client.query(`
      CREATE OR REPLACE FUNCTION desactivar_usuario(
        p_nuusuid VARCHAR(100),
        p_motivo TEXT DEFAULT 'Usuario solicitó eliminación de cuenta'
      )
      RETURNS JSON AS $$
      DECLARE
        v_email VARCHAR(100);
        v_result JSON;
      BEGIN
        SELECT nuusumail INTO v_email FROM nuusuari WHERE nuusuid = p_nuusuid;
        
        IF NOT FOUND THEN
          RETURN json_build_object('success', false, 'message', 'Usuario no encontrado');
        END IF;
        
        UPDATE nuusuari
        SET nuusubajaf = NOW(), nuusugamtok = NULL
        WHERE nuusuid = p_nuusuid AND nuusubajaf IS NULL;
        
        IF NOT FOUND THEN
          RETURN json_build_object('success', false, 'message', 'Usuario ya está desactivado');
        END IF;
        
        INSERT INTO auditoria_usuarios (nuusuid, accion, motivo)
        VALUES (p_nuusuid, 'DESACTIVACION', p_motivo);
        
        RETURN json_build_object(
          'success', true,
          'message', 'Usuario desactivado exitosamente',
          'nuusuid', p_nuusuid,
          'email', v_email,
          'fecha', NOW()
        );
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('   ✅ Función actualizada\n');
    
    // 5. Actualizar función reactivar_usuario
    console.log('5️⃣  Actualizando función reactivar_usuario()...');
    await client.query(`
      CREATE OR REPLACE FUNCTION reactivar_usuario(p_nuusuid VARCHAR(100))
      RETURNS JSON AS $$
      DECLARE
        v_email VARCHAR(100);
      BEGIN
        SELECT nuusumail INTO v_email FROM nuusuari WHERE nuusuid = p_nuusuid AND nuusubajaf IS NOT NULL;
        
        IF NOT FOUND THEN
          RETURN json_build_object('success', false, 'message', 'Usuario no encontrado o no está desactivado');
        END IF;
        
        UPDATE nuusuari
        SET nuusubajaf = NULL
        WHERE nuusuid = p_nuusuid;
        
        INSERT INTO auditoria_usuarios (nuusuid, accion, motivo)
        VALUES (p_nuusuid, 'REACTIVACION', 'Usuario reactivado');
        
        RETURN json_build_object(
          'success', true,
          'message', 'Usuario reactivado exitosamente',
          'nuusuid', p_nuusuid,
          'email', v_email
        );
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('   ✅ Función actualizada\n');
    
    // 6. Actualizar función estadísticas
    console.log('6️⃣  Actualizando función estadisticas_usuarios()...');
    await client.query(`
      CREATE OR REPLACE FUNCTION estadisticas_usuarios()
      RETURNS JSON AS $$
      BEGIN
        RETURN (
          SELECT json_build_object(
            'total_usuarios', COUNT(*),
            'usuarios_activos', COUNT(*) FILTER (WHERE nuusubajaf IS NULL),
            'usuarios_desactivados', COUNT(*) FILTER (WHERE nuusubajaf IS NOT NULL),
            'usuarios_gam', COUNT(*) FILTER (WHERE nuusuid !~ '^[0-9]+$'),
            'usuarios_local', COUNT(*) FILTER (WHERE nuusuid ~ '^[0-9]+$')
          )
          FROM nuusuari
        );
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('   ✅ Función actualizada\n');
    
    // 7. Actualizar trigger
    console.log('7️⃣  Actualizando trigger auditoría...');
    await client.query(`DROP TRIGGER IF EXISTS trig_audit_usuario ON nuusuari`);
    await client.query(`
      CREATE OR REPLACE FUNCTION audit_usuario_desactivacion()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.nuusubajaf IS NULL AND NEW.nuusubajaf IS NOT NULL THEN
          INSERT INTO auditoria_usuarios (nuusuid, accion, motivo)
          VALUES (NEW.nuusuid, 'DESACTIVACION', 'Baja fecha: ' || NEW.nuusubajaf);
        ELSIF OLD.nuusubajaf IS NOT NULL AND NEW.nuusubajaf IS NULL THEN
          INSERT INTO auditoria_usuarios (nuusuid, accion, motivo)
          VALUES (NEW.nuusuid, 'REACTIVACION', 'Usuario reactivado');
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await client.query(`
      CREATE TRIGGER trig_audit_usuario
        AFTER UPDATE OF nuusubajaf ON nuusuari
        FOR EACH ROW
        EXECUTE FUNCTION audit_usuario_desactivacion()
    `);
    console.log('   ✅ Trigger actualizado\n');
    
    // 8. Migrar datos de nuusuactiv a nuusubajaf si existen
    console.log('8️⃣  Migrando datos de nuusuactiv a nuusubajaf...');
    const migrateResult = await client.query(`
      UPDATE nuusuari 
      SET nuusubajaf = COALESCE(nuusufecde, NOW())
      WHERE nuusuactiv = 'N' AND nuusubajaf IS NULL
      RETURNING nuusuid
    `);
    console.log(`   ✅ ${migrateResult.rowCount} usuarios migrados\n`);
    
    // Verificar estado
    const stats = await client.query('SELECT estadisticas_usuarios()');
    const statsData = stats.rows[0].estadisticas_usuarios;
    
    console.log('📊 Estadísticas actualizadas:');
    console.log(`   Total: ${statsData.total_usuarios}`);
    console.log(`   Activos (nuusubajaf IS NULL): ${statsData.usuarios_activos}`);
    console.log(`   Desactivados (nuusubajaf NOT NULL): ${statsData.usuarios_desactivados}`);
    console.log(`   GAM: ${statsData.usuarios_gam}`);
    console.log(`   Local: ${statsData.usuarios_local}\n`);
    
    console.log('✅ Actualización completada - Ahora usando nuusubajaf\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

updateLogicalDeletionToUseBajaf();
