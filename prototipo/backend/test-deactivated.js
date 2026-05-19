const db = require('./db/connection')

async function test() {
  try {
    // 1. Desactivar usuario
    console.log('\n1. Desactivando usuario...')
    await db.query(`UPDATE nuusuari SET nuusubajaf = NOW() WHERE nuusumail = 'marianr@tekhne.com.ar'`)
    console.log('✅ Usuario desactivado\n')
    
    // 2. Test recuperación
    console.log('2. TEST: Recuperación de contraseña')
    const axios = require('axios')
    
    try {
      await axios.post('http://localhost:3000/gam/password-recovery', {
        email: 'marianr@tekhne.com.ar'
      })
      console.log('❌ FALLO: Debería haber bloqueado\n')
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error === 'Usuario desactivado') {
        console.log('✅ CORRECTO: Bloqueado (403 - Usuario desactivado)')
        console.log('   Mensaje:', err.response.data.message, '\n')
      } else {
        console.log('❌ Error inesperado:', err.response?.data || err.message, '\n')
      }
    }
    
    // 3. Test registro
    console.log('3. TEST: Registro con email desactivado (validación local debe PERMITIR)')
    try {
      const response = await axios.post('http://localhost:3000/gam/register', {
        email: 'marianr@tekhne.com.ar',
        password: 'TestPass123!@#',
        firstName: 'Test',
        lastName: 'User',
        nroAfiliado: '20-12028238-8',
        documento: '12028238',
        cuil: '20120282388',
        sexo: 'M',
        fechaNacimiento: '1980-01-01',
        telefono: '1234567890'
      })
      console.log('✅ Registro completado exitosamente')
      console.log('   Usuario reactivado en BD local y GAM\n')
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.code === 'USER_DEACTIVATED') {
        console.log('❌ FALLO: Validación local no debería bloquear usuario desactivado')
        console.log('   El usuario desactivado DEBE poder intentar registrarse\n')
      } else if (err.response?.status === 500 && err.response?.data?.error?.includes('Ya existe un usuario registrado')) {
        console.log('✅ CORRECTO: Validación local permitió el registro')
        console.log('   GAM rechazó porque usuario ya existe en GAM (esperado)')
        console.log('   Nuestra validación local NO bloqueó el intento\n')
      } else if (err.response?.status === 409) {
        console.log('⚠️  Email duplicado - otro usuario activo local')
        console.log('   Código:', err.response.data.code, '\n')
      } else {
        console.log('⚠️  Error inesperado:', err.response?.status)
        console.log('   Mensaje:', err.response?.data?.error?.substring(0, 100), '\n')
      }
    }
    
    // 4. Reactivar
    console.log('4. Reactivando usuario...')
    await db.query(`UPDATE nuusuari SET nuusubajaf = NULL WHERE nuusumail = 'marianr@tekhne.com.ar'`)
    console.log('✅ Usuario reactivado\n')
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    process.exit(0)
  }
}

test()
