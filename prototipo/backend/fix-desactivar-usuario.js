const db = require('./db/connection');

async function fixDesactivar() {
  try {
    console.log('🔧 Eliminando función anterior...\n');
    
    await db.query(`
      DROP FUNCTION IF EXISTS desactivar_usuario(VARCHAR, TEXT);
    `);
    
    console.log('✅ Función anterior eliminada');
    
    console.log('🔧 Creando función desactivar_usuario()...\n');
    
    await db.query(`
      CREATE OR REPLACE FUNCTION desactivar_usuario(
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
        -- Verificar si el usuario existe
        SELECT EXISTS(SELECT 1 FROM nuusuari WHERE nuusuid = p_nuusuid)
        INTO v_usuario_existe;
        
        IF NOT v_usuario_existe THEN
          RETURN QUERY SELECT FALSE, 'Usuario no existe'::TEXT, NULL::TIMESTAMP;
          RETURN;
        END IF;
        
        -- Verificar si ya está desactivado
        SELECT nuusubajaf IS NOT NULL
        FROM nuusuari
        WHERE nuusuid = p_nuusuid
        INTO v_ya_desactivado;
        
        IF v_ya_desactivado THEN
          RETURN QUERY SELECT FALSE, 'Usuario ya está desactivado'::TEXT, NULL::TIMESTAMP;
          RETURN;
        END IF;
        
        v_fecha_desactivacion := NOW();
        
        -- Desactivar usuario
        UPDATE nuusuari
        SET nuusubajaf = v_fecha_desactivacion
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
          'DESACTIVACION',
          p_nuusuid, -- El usuario se desactiva a sí mismo
          COALESCE(p_motivo, 'Usuario desactivó su propia cuenta'),
          v_fecha_desactivacion
        );
        
        RETURN QUERY SELECT TRUE, 'Usuario desactivado exitosamente'::TEXT, v_fecha_desactivacion;
      END;
      $$;
    `);
    
    console.log('✅ Función desactivar_usuario() creada');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDesactivar();
