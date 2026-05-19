/**
 * Verificar coherencia entre BD local y GAM
 * Analiza usuarios desactivados y su relación con GAM
 */

const { Pool } = require('pg')

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345678',
  database: 'app_afiliados_genexus'
})

async function checkCoherence() {
  try {
    console.log('🔍 VERIFICACIÓN DE COHERENCIA BD ↔ GAM\n')
    
    // 1. Usuarios desactivados
    const desactivados = await pool.query(`
      SELECT 
        nuusuid,
        nuusumail,
        nuusubajaf,
        CASE 
          WHEN nuusuid ~ '^[0-9]+$' THEN 'LEGACY'
          ELSE 'GAM'
        END as tipo_usuario
      FROM nuusuari
      WHERE nuusubajaf IS NOT NULL
      ORDER BY nuusubajaf DESC
    `)
    
    console.log('👥 USUARIOS DESACTIVADOS:')
    console.log(`Total: ${desactivados.rows.length}\n`)
    
    if (desactivados.rows.length > 0) {
      desactivados.rows.forEach((user, i) => {
        console.log(`${i + 1}. ${user.nuusumail}`)
        console.log(`   nuusuid: ${user.nuusuid}`)
        console.log(`   Tipo: ${user.tipo_usuario}`)
        console.log(`   Desactivado: ${user.nuusubajaf}`)
        console.log(`   Coherencia: ${user.tipo_usuario === 'GAM' ? '⚠️  Debe estar anulado en GAM (nuusuid ES el UserID de GAM)' : '✅ OK (nunca estuvo en GAM)'}`)
        console.log('')
      })
    }
    
    // 2. Auditoria de anulaciones
    const auditoria = await pool.query(`
      SELECT 
        a.nuusuid,
        u.nuusumail,
        CASE 
          WHEN a.nuusuid ~ '^[0-9]+$' THEN 'LEGACY'
          ELSE 'GAM'
        END as tipo_usuario,
        a.motivo,
        a.fecha
      FROM auditoria_usuarios a
      JOIN nuusuari u ON a.nuusuid = u.nuusuid
      WHERE a.accion = 'DESACTIVACION'
      ORDER BY a.fecha DESC
      LIMIT 10
    `)
    
    console.log('📋 AUDITORÍA DE ANULACIONES (últimas 10):\n')
    
    if (auditoria.rows.length > 0) {
      auditoria.rows.forEach((log, i) => {
        console.log(`${i + 1}. ${log.nuusumail}`)
        console.log(`   nuusuid: ${log.nuusuid}`)
        console.log(`   Tipo: ${log.tipo_usuario}`)
        console.log(`   Fecha: ${log.fecha}`)
        console.log(`   Motivo: ${log.motivo}`)
        console.log('')
      })
    } else {
      console.log('   (No hay registros de auditoría)')
    }
    
    // 3. Resumen de coherencia
    console.log('\n📊 RESUMEN DE COHERENCIA:\n')
    
    const gamDesactivados = desactivados.rows.filter(u => u.tipo_usuario === 'GAM')
    const legacyDesactivados = desactivados.rows.filter(u => u.tipo_usuario === 'LEGACY')
    
    console.log(`✅ Usuarios legacy desactivados: ${legacyDesactivados.length}`)
    console.log(`   (Solo local - coherencia OK por diseño)`)
    console.log('')
    console.log(`⚠️  Usuarios GAM desactivados: ${gamDesactivados.length}`)
    console.log(`   (Deben estar anulados también en GAM)`)
    console.log(`   IMPORTANTE: El nuusuid ES el UserID de GAM`)
    
    if (gamDesactivados.length > 0) {
      console.log('')
      console.log('⚠️  VERIFICACIÓN MANUAL RECOMENDADA:')
      console.log('   Confirmar que estos UserID estén anulados en el servidor GAM:')
      gamDesactivados.forEach(u => {
        console.log(`   - ${u.nuusumail} → UserID GAM: ${u.nuusuid}`)
      })
      console.log('')
      console.log('   El backend intenta anularlos automáticamente,')
      console.log('   pero puede haber fallado por problemas de red/token.')
    }
    
    console.log('')
    console.log('📝 NOTA IMPORTANTE:')
    console.log('   - Usuario GAM: nuusuid = UserID de GAM (string UUID)')
    console.log('   - Usuario Legacy: nuusuid = ID numérico autoincremental')
    console.log('   - TODO registro nuevo DEBE pasar por /gam/register')
    console.log('   - NO se pueden crear usuarios sin verificar GAM primero')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkCoherence()
