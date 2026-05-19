// Migración completa a nuusubajaf
// Este script consolida todos los cambios necesarios para usar nuusubajaf como campo de baja lógica

const db = require('../db/connection');

async function migrateComplete() {
  const client = await db.pool.connect();
  
  try {
    console.log('�� MIGRACIÓN COMPLETA A nuusubajaf\n');
    
    // 1. Permitir NULL en nuusubajaf
    console.log('1️⃣  Modificando columna nuusubajaf para permitir NULL...');
    await client.query(`
      ALTER TABLE nuusuari
      ALTER COLUMN nuusubajaf DROP NOT NULL
    `);
    console.log('✅ Columna modificada\n');
    
    // 2. Limpiar valores antiguos
    console.log('2️⃣  Limpiando valores antiguos (< 1900)...');
    const clean = await client.query(`
      UPDATE nuusuari
      SET nuusubajaf = NULL
      WHERE nuusubajaf < '1900-01-01'
    `);
    console.log(`✅ ${clean.rowCount} usuarios marcados como activos\n`);
    
    // 3. Función desactivar_usuario
    console.log('3️⃣  Creando función desactivar_usuario...');
    await client.query(`
      DROP FUNCTION IF EXISTS desactivar_usuario(VARCHAR, TEXT);
    `);
    
    await client.query(`
      CREATE FUNCTION desactivar_usuario(
        p_nuusuid VARCHAR,
        p_motivo TEXT
      )
      RETURNS TABLE(
        success BOOLEAN,
        message TEXT,
        fecha_desactivacion TIMESTAMP
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_usuario_existe BOOLEAN;
        v_ya_desactivado BOOLEAN;
        v_fecha_desactivacion TIMESTAMP;
      BEGIN
        SELECT EXISTS(SELECT 1 FROM nuusuari WHERE nuusuid = p_nuusuid)
        INTO v_usuario_existe;
        
        IF NOT v_usuario_existe THEN
          RETURN QUERY SELECT FALSE, 'Usuario no existe'::TEXT, NULL::TIMESTAMP;
          RETURN;
        END IF;
        
        SELECT nuusubajaf IS NOT NULL
        FROM nuusuari
        WHERE nuusuid = p_nuusuid
        INTO v_ya_desactivado;
        
        IF v_ya_desactivado THEN
          RETURN QUERY SELECT FALSE, 'Usuario ya está desactivado'::TEXT, NULL::TIMESTAMP;
          RETURN;
        END IF;
        
        v_fecha_desactivacion := NOW();
        
        UPDATE nuusuari
        SET nuusubajaf = v_fecha_desactivacion
        WHERE nuusuid = p_nuusuid;
        
        INSERT INTO auditoria_usuarios (
          nuusuid,
          accion,
          usuario_responsable,
          motivo,
          fecha
        ) VALUES (
          p_nuusuid,
          'DESACTIVACION',
          p_nuusuid,
          COALESCE(p_motivo, 'Usuario desactivó su propia cuenta'),
          v_fecha_desactivacion
        );
        
        RETURN QUERY SELECT TRUE, 'Usuario desactivado exitosamente'::TEXT, v_fecha_desactivacion;
      END;
      $$;
    `);
    console.log('✅ Función creada\n');
    
    // 4. Función reactivar_usuario
    console.log('4️⃣  Creando función reactivar_usuario...');
    await client.query(`
      DROP FUNCTION IF EXISTS reactivar_usuario(VARCHAR, VARCHAR);
      DROP FUNCTION IF EXISTS reactivar_usuario(VARCHAR);
    `);
    
    await client.query(`
      CREATE FUNCTION reactivar_usuario(
        p_nuusuid VARCHAR,
        p_admin_id VARCHAR DEFAULT 'admin'
      )
      RETURNS TABLE(
        success BOOLEAN,
        message TEXT,
        fecha_reactivacion TIMESTAMP
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_usuario_existe BOOLEAN;
        v_fecha_reactivacion TIMESTAMP;
      BEGIN
        SELECT EXISTS(SELECT 1 FROM nuusuari WHERE nuusuid = p_nuusuid)
        INTO v_usuario_existe;
        
        IF NOT v_usuario_existe THEN
          RETURN QUERY SELECT FALSE, 'Usuario no existe'::TEXT, NULL::TIMESTAMP;
          RETURN;
        END IF;
        
        v_fecha_reactivacion := NOW();
        
        UPDATE nuusuari
        SET nuusubajaf = NULL
        WHERE nuusuid = p_nuusuid;
        
        INSERT INTO auditoria_usuarios (
          nuusuid,
          accion,
          usuario_responsable,
          motivo,
          fecha
        ) VALUES (
          p_nuusuid,
          'REACTIVACION',
          p_admin_id,
          'Usuario reactivado por administrador',
          v_fecha_reactivacion
        );
        
        RETURN QUERY SELECT TRUE, 'Usuario reactivado exitosamente'::TEXT, v_fecha_reactivacion;
      END;
      $$;
    `);
    console.log('✅ Función creada\n');
    
    // 5. Vista v_usuarios_tipo
    console.log('5️⃣  Actualizando vista v_usuarios_tipo...');
    await client.query(`DROP VIEW IF EXISTS v_usuarios_tipo CASCADE;`);
    await client.query(`
      CREATE VIEW v_usuarios_tipo AS
      SELECT 
        nuusuid,
        nuusumail,
        nuusuapell,
        CASE 
          WHEN nuusuid !~ '^[0-9]+$' THEN 'GAM'
          ELSE 'LOCAL'
        END AS tipo_usuario,
        CASE 
          WHEN nuusubajaf IS NULL THEN 'ACTIVO'
          WHEN nuusubajaf IS NOT NULL THEN 'DESACTIVADO'
        END AS estado_usuario,
        nuusubajaf AS fecha_desactivacion
      FROM nuusuari;
    `);
    console.log('✅ Vista actualizada\n');
    
    // 6. Vista v_usuarios_activos
    console.log('6️⃣  Actualizando vista v_usuarios_activos...');
    await client.query(`DROP VIEW IF EXISTS v_usuarios_activos CASCADE;`);
    await client.query(`
      CREATE VIEW v_usuarios_activos AS
      SELECT * FROM nuusuari WHERE nuusubajaf IS NULL;
    `);
    console.log('✅ Vista actualizada\n');
    
    // 7. Índice
    console.log('7️⃣  Creando índice idx_nuusuari_bajaf...');
    await client.query(`
      DROP INDEX IF EXISTS idx_nuusuari_bajaf;
      CREATE INDEX idx_nuusuari_bajaf ON nuusuari(nuusubajaf) WHERE nuusubajaf IS NOT NULL;
    `);
    console.log('✅ Índice creado\n');
    
    // 8. Función estadisticas_usuarios
    console.log('8️⃣  Actualizando función estadisticas_usuarios...');
    await client.query(`DROP FUNCTION IF EXISTS estadisticas_usuarios();`);
    await client.query(`
      CREATE FUNCTION estadisticas_usuarios()
      RETURNS TABLE(
        total_usuarios INTEGER,
        usuarios_activos INTEGER,
        usuarios_desactivados INTEGER,
        usuarios_gam INTEGER,
        usuarios_local INTEGER
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*)::INTEGER AS total_usuarios,
          COUNT(*) FILTER (WHERE nuusubajaf IS NULL)::INTEGER AS usuarios_activos,
          COUNT(*) FILTER (WHERE nuusubajaf IS NOT NULL)::INTEGER AS usuarios_desactivados,
          COUNT(*) FILTER (WHERE nuusuid !~ '^[0-9]+$')::INTEGER AS usuarios_gam,
          COUNT(*) FILTER (WHERE nuusuid ~ '^[0-9]+$')::INTEGER AS usuarios_local
        FROM nuusuari;
      END;
      $$;
    `);
    console.log('✅ Función actualizada\n');
    
    // Verificación final
    console.log('✅ MIGRACIÓN COMPLETADA\n');
    console.log('=== Verificación Final ===\n');
    
    const stats = await client.query('SELECT * FROM estadisticas_usuarios()');
    const s = stats.rows[0];
    console.log(`Total usuarios: ${s.total_usuarios}`);
    console.log(`Activos: ${s.usuarios_activos}`);
    console.log(`Desactivados: ${s.usuarios_desactivados}`);
    console.log(`GAM: ${s.usuarios_gam}`);
    console.log(`Local: ${s.usuarios_local}\n`);
    
    console.log('✅ Todos los componentes actualizados correctamente');
    console.log('✅ El backend debe ser reiniciado para usar los cambios');
    
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

migrateComplete().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
