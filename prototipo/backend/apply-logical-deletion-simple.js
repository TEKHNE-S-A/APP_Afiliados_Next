const db = require('./db/connection');

async function applyLogicalDeletionSimple() {
  const client = await db.pool.connect();
  
  try {
    console.log('📋 Aplicando migración Eliminación Lógica (método simple)...\n');
    
    // 1. Agregar columnas
    console.log('1️⃣  Agregando columnas...');
    await client.query(`
      ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusuactiv CHAR(1) DEFAULT 'S'
    `);
    await client.query(`
      ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusufecde TIMESTAMP
    `);
    await client.query(`
      ALTER TABLE nuusuari ADD COLUMN IF NOT EXISTS nuusumotde TEXT
    `);
    console.log('   ✅ Columnas agregadas\n');
    
    // 2. Crear índice
    console.log('2️⃣  Creando índice...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nuusuari_activo ON nuusuari(nuusuactiv) WHERE nuusuactiv = 'S'
    `);
    console.log('   ✅ Índice creado\n');
    
    // 3. Actualizar vista v_usuarios_tipo
    console.log('3️⃣  Actualizando vista v_usuarios_tipo...');
    await client.query(`DROP VIEW IF EXISTS v_usuarios_tipo CASCADE`);
    await client.query(`
      CREATE OR REPLACE VIEW v_usuarios_tipo AS
      SELECT 
        nuusuid,
        nuusumail,
        nuusunroaf,
        nuusuapell,
        nuusuactiv,
        nuusufecde,
        nuusumotde,
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
          WHEN nuusuactiv = 'S' THEN 'ACTIVO'
          WHEN nuusuactiv = 'N' THEN 'DESACTIVADO'
          ELSE 'DESCONOCIDO'
        END AS estado_usuario
      FROM nuusuari
    `);
    console.log('   ✅ Vista actualizada\n');
    
    // 4. Crear vista v_usuarios_activos
    console.log('4️⃣  Creando vista v_usuarios_activos...');
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
      WHERE nuusuactiv = 'S'
    `);
    console.log('   ✅ Vista creada\n');
    
    // 5. Crear tabla de auditoría
    console.log('5️⃣  Creando tabla auditoria_usuarios...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria_usuarios (
        audit_id SERIAL PRIMARY KEY,
        nuusuid VARCHAR(100) NOT NULL,
        accion VARCHAR(50) NOT NULL,
        fecha TIMESTAMP DEFAULT NOW(),
        motivo TEXT,
        usuario_responsable VARCHAR(100)
      )
    `);
    console.log('   ✅ Tabla creada\n');
    
    // 6. Función desactivar_usuario
    console.log('6️⃣  Creando función desactivar_usuario()...');
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
        SET nuusuactiv = 'N', nuusufecde = NOW(), nuusumotde = p_motivo, nuusugamtok = NULL
        WHERE nuusuid = p_nuusuid AND nuusuactiv = 'S';
        
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
    console.log('   ✅ Función creada\n');
    
    // 7. Función reactivar_usuario
    console.log('7️⃣  Creando función reactivar_usuario()...');
    await client.query(`
      CREATE OR REPLACE FUNCTION reactivar_usuario(p_nuusuid VARCHAR(100))
      RETURNS JSON AS $$
      DECLARE
        v_email VARCHAR(100);
      BEGIN
        SELECT nuusumail INTO v_email FROM nuusuari WHERE nuusuid = p_nuusuid AND nuusuactiv = 'N';
        
        IF NOT FOUND THEN
          RETURN json_build_object('success', false, 'message', 'Usuario no encontrado o no está desactivado');
        END IF;
        
        UPDATE nuusuari
        SET nuusuactiv = 'S', nuusufecde = NULL, nuusumotde = NULL
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
    console.log('   ✅ Función creada\n');
    
    // 8. Función estadísticas_usuarios
    console.log('8️⃣  Creando función estadisticas_usuarios()...');
    await client.query(`
      CREATE OR REPLACE FUNCTION estadisticas_usuarios()
      RETURNS JSON AS $$
      BEGIN
        RETURN (
          SELECT json_build_object(
            'total_usuarios', COUNT(*),
            'usuarios_activos', COUNT(*) FILTER (WHERE nuusuactiv = 'S'),
            'usuarios_desactivados', COUNT(*) FILTER (WHERE nuusuactiv = 'N'),
            'usuarios_gam', COUNT(*) FILTER (WHERE nuusuid !~ '^[0-9]+$'),
            'usuarios_local', COUNT(*) FILTER (WHERE nuusuid ~ '^[0-9]+$')
          )
          FROM nuusuari
        );
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('   ✅ Función creada\n');
    
    // 9. Registrar migración
    console.log('9️⃣  Registrando migración...');
    await client.query(`
      INSERT INTO schema_migrations (version, description) 
      VALUES ('20251217_logical_deletion', 'Implementación eliminación lógica usuarios - campos activo/fecha/motivo desactivación')
      ON CONFLICT (version) DO NOTHING
    `);
    console.log('   ✅ Migración registrada\n');
    
    // Mostrar estadísticas
    const stats = await client.query('SELECT estadisticas_usuarios()');
    const statsData = stats.rows[0].estadisticas_usuarios;
    
    console.log('📊 Estadísticas de usuarios:');
    console.log(`   Total: ${statsData.total_usuarios}`);
    console.log(`   Activos: ${statsData.usuarios_activos}`);
    console.log(`   Desactivados: ${statsData.usuarios_desactivados}`);
    console.log(`   GAM: ${statsData.usuarios_gam}`);
    console.log(`   Local: ${statsData.usuarios_local}\n`);
    
    console.log('✅ Migración Eliminación Lógica completada exitosamente\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

applyLogicalDeletionSimple();
