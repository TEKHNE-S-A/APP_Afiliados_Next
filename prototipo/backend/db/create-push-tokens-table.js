// Crear tabla push_tokens
const db = require('./connection')

;(async () => {
  try {
    console.log('Creando tabla push_tokens...')
    
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nuusuid VARCHAR(100) NOT NULL,
        push_token VARCHAR(500) NOT NULL,
        plataforma VARCHAR(20) NOT NULL,
        fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_ultima_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        
        CONSTRAINT fk_push_tokens_nuusuid 
          FOREIGN KEY (nuusuid) 
          REFERENCES nuusuari(nuusuid) 
          ON DELETE CASCADE,
        
        CONSTRAINT unique_user_token UNIQUE (nuusuid, push_token)
      )
    `)
    
    console.log('✅ Tabla push_tokens creada')
    
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_tokens_nuusuid ON push_tokens(nuusuid)
    `)
    
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_tokens_activo ON push_tokens(activo)
    `)
    
    console.log('✅ Índices creados')
    console.log('\n✅ Setup completo de push tokens')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
})()
