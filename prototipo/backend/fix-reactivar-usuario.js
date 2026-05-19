const db = require('./db/connection');

async function fixReactivar() {
  try {
    console.log('🔧 Creando función reactivar_usuario()...\n');
    
    await db.query(`
      CREATE OR REPLACE FUNCTION reactivar_usuario(
        p_nuusuid VARCHAR,
        p_admin_id VARCHAR
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
        -- Verificar si el usuario existe
        SELECT EXISTS(SELECT 1 FROM nuusuari WHERE nuusuid = p_nuusuid)
        INTO v_usuario_existe;
        
        IF NOT v_usuario_existe THEN
          RETURN QUERY SELECT FALSE, 'Usuario no existe'::TEXT, NULL::TIMESTAMP;
          RETURN;
        END IF;
        
        v_fecha_reactivacion := NOW();
        
        -- Reactivar usuario (nuusubajaf = NULL)
        UPDATE nuusuari
        SET nuusubajaf = NULL
        WHERE nuusuid = p_nuusuid;
        
        -- Registrar en auditoría
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
    
    console.log('✅ Función reactivar_usuario() creada');
    
    // Probar la función con el usuario de prueba
    console.log('\n🧪 Probando reactivación...');
    const result = await db.query(`
      SELECT * FROM reactivar_usuario($1, $2)
    `, ['0000000000000000000000000000000000000001', 'admin']);
    
    console.log('Resultado:', result.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixReactivar();
