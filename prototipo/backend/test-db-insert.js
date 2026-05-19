/**
 * Script de prueba para verificar la función saveToNuusuari
 * Ejecutar desde: node test-db-insert.js
 */

const db = require('./db/connection')

// Simular datos de formulario y respuesta SOAP
const formData = {
  cuil: '20123456789',
  dni: '12345678',
  nroAfiliado: null,
  fechaNacimiento: '1980-05-15',
  sexo: 'M',
  email: 'test@example.com',
  telefono: '1234567890'
}

const soapResponse = {
  AfiliadoId: '000000380000000000001000000999',
  AfiliadoNro: '12345678',
  Apellido: 'PEREZ',
  Nombre: 'JUAN CARLOS',
  PlanId: '1',
  PlanDescripcion: 'AMPLIO',
  EsTitular: 'S',
  TitularNro: '000000380',
  OrganizacionId: '000000000001',
  FamiliarNro: '000000999'
}

async function testInsert() {
  try {
    console.log('🧪 Probando inserción en nuusuari...')
    console.log('Datos formulario:', formData)
    console.log('Respuesta SOAP:', soapResponse)

    // Construir AfiliadoId si no viene directo
    let afiliadoIdFinal = soapResponse.AfiliadoId

    // Construir apellido y nombre
    const apellidoNombre = `${soapResponse.Apellido}, ${soapResponse.Nombre}`

    // Número de afiliado
    const numeroAfiliado = soapResponse.AfiliadoNro || formData.nroAfiliado || formData.cuil || formData.dni || ''

    // Valores por defecto según especificación:
    // - nuusutelef: espacios en blanco (caracteres)
    // - nuusuidbil: espacios en blanco (caracteres)
    // - nuusuqrbil: espacios en blanco (text)
    // - nuusuultno: 0 (numérico)
    // - nuusunivel: 0 (numérico)
    // - nuusubajaf: '0001-01-01' (fecha mínima)
    const telefonoFinal = formData.telefono || ''

    // Query de inserción
    const insertQuery = `
      INSERT INTO nuusuari (
        nuusuafili,
        nuplaid,
        nuusufecha,
        nuusunroaf,
        nuususexo,
        nuusuapell,
        nuusuestit,
        nuusutelef,
        nuusumail,
        nuusubille,
        nuusuidbil,
        nuusumailf,
        nuusuacept,
        nuusuqrbil,
        nuusuultno,
        nuusubajaf,
        nuusunivel
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'N', '', NOW(), 'S', '', 0, '0001-01-01'::timestamp, 0
      ) RETURNING nuusuid
    `

    const params = [
      afiliadoIdFinal,          // $1: nuusuafili
      soapResponse.PlanId || null,           // $2: nuplaid
      formData.fechaNacimiento,          // $3: nuusufecha
      numeroAfiliado,           // $4: nuusunroaf
      formData.sexo || null,             // $5: nuususexo
      apellidoNombre,           // $6: nuusuapell
      soapResponse.EsTitular || null,        // $7: nuusuestit
      telefonoFinal,            // $8: nuusutelef
      formData.email || ''               // $9: nuusumail
    ]

    console.log('\n📝 Parámetros SQL:', params)
    console.log('\n🔄 Ejecutando INSERT...')

    const result = await db.query(insertQuery, params)
    
    const nuusuid = result.rows[0]?.nuusuid
    console.log('\n✅ Usuario guardado en nuusuari con ID:', nuusuid)

    // Verificar el registro insertado
    const checkQuery = 'SELECT * FROM nuusuari WHERE nuusuid = $1'
    const checkResult = await db.query(checkQuery, [nuusuid])
    
    console.log('\n📋 Registro insertado:')
    console.log(JSON.stringify(checkResult.rows[0], null, 2))

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error:', error)
    console.error('Mensaje:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

testInsert()
