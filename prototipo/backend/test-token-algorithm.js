/**
 * Script standalone para testear el algoritmo de Token Temporal de 3 dígitos
 * 
 * Uso:
 *   node test-token-algorithm.js
 * 
 * Para usar con parámetros personalizados:
 *   node test-token-algorithm.js --afiliadoId "000082018000000000001000082018" --timeout 10
 */

const crypto = require('crypto')

// ============================================================================
// ALGORITMO PRINCIPAL
// ============================================================================

/**
 * Genera token temporal de 3 dígitos
 * @param {string} afiliadoId - ID del afiliado (30 caracteres)
 * @param {number} timeoutMinutes - Timeout en minutos (default 10)
 * @param {Date} now - Fecha/hora actual (default: now)
 * @returns {string} Token de 3 dígitos con padding (ej: "005", "892")
 */
function generateToken(afiliadoId, timeoutMinutes = 10, now = new Date()) {
  // 1. Calcular bucket (ventana temporal)
  const bucketMs = timeoutMinutes * 60 * 1000
  const epoch = now.getTime()
  const bucket = Math.floor(epoch / bucketMs)
  
  // 2. Construir payload
  const payload = `${afiliadoId}:${bucket}`
  
  // 3. Hash SHA256
  const hash = crypto.createHash('sha256').update(payload).digest()
  
  // 4. Primeros 4 bytes a uint32 big-endian
  const intVal = hash.readUInt32BE(0)
  
  // 5. Módulo 1000
  const tokenNum = intVal % 1000
  
  // 6. Padding a 3 dígitos
  return String(tokenNum).padStart(3, '0')
}

/**
 * Valida un token contra un AfiliadoId
 * @param {string} afiliadoId - ID del afiliado
 * @param {string} tokenToCheck - Token a validar
 * @param {number} timeoutMinutes - Timeout en minutos
 * @param {number} toleranceBuckets - Tolerancia en buckets (default 1)
 * @returns {object} { valid: boolean, bucketDelta?: number, generatedAt?: Date }
 */
function verifyToken(afiliadoId, tokenToCheck, timeoutMinutes = 10, toleranceBuckets = 1) {
  const now = new Date()
  const bucketMs = timeoutMinutes * 60 * 1000
  
  for (let delta = -toleranceBuckets; delta <= toleranceBuckets; delta++) {
    const testTime = new Date(now.getTime() + delta * bucketMs)
    const testToken = generateToken(afiliadoId, timeoutMinutes, testTime)
    
    if (testToken === tokenToCheck) {
      const bucket = Math.floor(testTime.getTime() / bucketMs)
      return {
        valid: true,
        bucketDelta: delta,
        generatedAt: new Date(bucket * bucketMs),
        expiresAt: new Date((bucket + 1) * bucketMs)
      }
    }
  }
  
  return { valid: false }
}

/**
 * Obtiene información del bucket actual
 * @param {number} timeoutMinutes - Timeout en minutos
 * @param {Date} now - Fecha/hora actual
 * @returns {object} { generatedAt, expiresAt, timeRemaining }
 */
function getTokenInfo(timeoutMinutes = 10, now = new Date()) {
  const bucketMs = timeoutMinutes * 60 * 1000
  const epoch = now.getTime()
  const bucket = Math.floor(epoch / bucketMs)
  
  const generatedAt = new Date(bucket * bucketMs)
  const expiresAt = new Date((bucket + 1) * bucketMs)
  const timeRemaining = expiresAt.getTime() - epoch
  
  return {
    bucket,
    generatedAt,
    expiresAt,
    timeRemaining,
    timeRemainingSeconds: Math.floor(timeRemaining / 1000)
  }
}

// ============================================================================
// TESTS
// ============================================================================

function runTests() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('TEST SUITE: Algoritmo Token Temporal 3 Dígitos')
  console.log('═══════════════════════════════════════════════════════\n')
  
  // Test 1: Generación básica
  console.log('TEST 1: Generación básica')
  console.log('─────────────────────────────────────────────────────')
  const afiliadoId1 = '000082018000000000001000082018'
  const timeout1 = 10
  const token1 = generateToken(afiliadoId1, timeout1)
  console.log('AfiliadoId:', afiliadoId1)
  console.log('Timeout:', timeout1, 'minutos')
  console.log('Token generado:', token1)
  console.log('Formato correcto:', /^\d{3}$/.test(token1) ? '✅ SÍ' : '❌ NO')
  console.log('')
  
  // Test 2: Padding correcto
  console.log('TEST 2: Padding correcto')
  console.log('─────────────────────────────────────────────────────')
  // Forzar diferentes valores para verificar padding
  const testCases = [
    { afiliado: '000000001000000000001000000001', desc: 'Caso A' },
    { afiliado: '000000002000000000001000000002', desc: 'Caso B' },
    { afiliado: '000000003000000000001000000003', desc: 'Caso C' }
  ]
  testCases.forEach(tc => {
    const t = generateToken(tc.afiliado, 10)
    console.log(`${tc.desc}: "${t}" (length: ${t.length})`)
  })
  console.log('')
  
  // Test 3: Mismo bucket → mismo token
  console.log('TEST 3: Consistencia temporal (mismo bucket)')
  console.log('─────────────────────────────────────────────────────')
  const baseTime = new Date('2026-02-18T13:40:00Z')
  const t1 = generateToken(afiliadoId1, 10, new Date(baseTime.getTime()))
  const t2 = generateToken(afiliadoId1, 10, new Date(baseTime.getTime() + 5 * 60 * 1000))  // +5 min
  const t3 = generateToken(afiliadoId1, 10, new Date(baseTime.getTime() + 10 * 60 * 1000)) // +10 min
  console.log('13:40:00 →', t1)
  console.log('13:45:00 →', t2, t1 === t2 ? '(igual ✅)' : '(diferente ❌)')
  console.log('13:50:00 →', t3, t1 === t3 ? '(igual ❌)' : '(diferente ✅)')
  console.log('')
  
  // Test 4: Validación de token
  console.log('TEST 4: Validación de token')
  console.log('─────────────────────────────────────────────────────')
  const currentToken = generateToken(afiliadoId1, 10)
  const validResult = verifyToken(afiliadoId1, currentToken, 10, 1)
  console.log('Token actual:', currentToken)
  console.log('Validación:', validResult.valid ? '✅ VÁLIDO' : '❌ INVÁLIDO')
  if (validResult.valid) {
    console.log('Bucket delta:', validResult.bucketDelta, '(0=actual, -1=anterior, +1=siguiente)')
    console.log('Generado en:', validResult.generatedAt.toISOString())
    console.log('Expira en:', validResult.expiresAt.toISOString())
  }
  console.log('')
  
  // Test 5: Token inválido
  console.log('TEST 5: Validación de token inválido')
  console.log('─────────────────────────────────────────────────────')
  const invalidResult = verifyToken(afiliadoId1, '999', 10, 1)
  console.log('Token a validar: "999"')
  console.log('Resultado:', invalidResult.valid ? '❌ VÁLIDO (error)' : '✅ INVÁLIDO (correcto)')
  console.log('')
  
  // Test 6: Información del bucket actual
  console.log('TEST 6: Información del bucket actual')
  console.log('─────────────────────────────────────────────────────')
  const info = getTokenInfo(10)
  console.log('Bucket:', info.bucket)
  console.log('Generado en:', info.generatedAt.toISOString())
  console.log('Expira en:', info.expiresAt.toISOString())
  console.log('Tiempo restante:', info.timeRemainingSeconds, 'segundos')
  console.log('')
  
  // Test 7: Diferentes timeouts
  console.log('TEST 7: Diferentes timeouts')
  console.log('─────────────────────────────────────────────────────')
  const baseTime2 = new Date()
  const timeouts = [3, 5, 10, 15]
  timeouts.forEach(timeout => {
    const token = generateToken(afiliadoId1, timeout, baseTime2)
    const info = getTokenInfo(timeout, baseTime2)
    console.log(`Timeout ${timeout} min → Token: ${token}, expira en ${info.timeRemainingSeconds}s`)
  })
  console.log('')
  
  // Test 8: Detalle del algoritmo (debug)
  console.log('TEST 8: Detalle del algoritmo (debug)')
  console.log('─────────────────────────────────────────────────────')
  const debugTime = new Date()
  const debugTimeout = 10
  const debugBucketMs = debugTimeout * 60 * 1000
  const debugEpoch = debugTime.getTime()
  const debugBucket = Math.floor(debugEpoch / debugBucketMs)
  const debugPayload = `${afiliadoId1}:${debugBucket}`
  const debugHash = crypto.createHash('sha256').update(debugPayload).digest()
  const debugIntVal = debugHash.readUInt32BE(0)
  const debugTokenNum = debugIntVal % 1000
  const debugToken = String(debugTokenNum).padStart(3, '0')
  
  console.log('Timestamp:    ', debugTime.toISOString())
  console.log('Epoch (ms):   ', debugEpoch)
  console.log('BucketMs:     ', debugBucketMs)
  console.log('Bucket:       ', debugBucket)
  console.log('Payload:      ', debugPayload)
  console.log('Hash (hex):   ', debugHash.toString('hex').substring(0, 64) + '...')
  console.log('First 4 bytes:', debugHash.slice(0, 4).toString('hex'))
  console.log('IntVal:       ', debugIntVal)
  console.log('TokenNum:     ', debugTokenNum, `(${debugIntVal} % 1000)`)
  console.log('Token final:  ', debugToken)
  console.log('')
  
  console.log('═══════════════════════════════════════════════════════')
  console.log('TODOS LOS TESTS COMPLETADOS ✅')
  console.log('═══════════════════════════════════════════════════════\n')
}

// ============================================================================
// EJEMPLOS DE USO
// ============================================================================

function showExamples() {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('EJEMPLOS DE USO')
  console.log('═══════════════════════════════════════════════════════\n')
  
  const afiliadoId = '000082018000000000001000082018'
  
  console.log('// Ejemplo 1: Generar token para mostrar en app')
  console.log('const token = generateToken(afiliadoId, 10)')
  console.log('console.log(token)  // "892" (depende del timestamp actual)')
  const ex1Token = generateToken(afiliadoId, 10)
  console.log(`→ Token generado: "${ex1Token}"`)
  console.log('')
  
  console.log('// Ejemplo 2: Validar token presentado por usuario')
  console.log('const tokenPresentado = "' + ex1Token + '"')
  console.log('const result = verifyToken(afiliadoId, tokenPresentado, 10, 1)')
  console.log('if (result.valid) {')
  console.log('  console.log("✅ Token válido")')
  console.log('} else {')
  console.log('  console.log("❌ Token inválido o expirado")')
  console.log('}')
  const ex2Result = verifyToken(afiliadoId, ex1Token, 10, 1)
  console.log(`→ Resultado: ${ex2Result.valid ? '✅ Token válido' : '❌ Token inválido'}`)
  console.log('')
  
  console.log('// Ejemplo 3: Obtener tiempo restante para countdown')
  console.log('const info = getTokenInfo(10)')
  console.log('console.log(`Token expira en ${info.timeRemainingSeconds} segundos`)')
  const ex3Info = getTokenInfo(10)
  console.log(`→ Token expira en ${ex3Info.timeRemainingSeconds} segundos`)
  console.log('')
  
  console.log('// Ejemplo 4: Generar token para un timestamp específico')
  console.log('const timestamp = new Date("2026-02-18T13:40:00Z")')
  console.log('const token = generateToken(afiliadoId, 10, timestamp)')
  const ex4Token = generateToken(afiliadoId, 10, new Date("2026-02-18T13:40:00Z"))
  console.log(`→ Token: "${ex4Token}"`)
  console.log('')
}

// ============================================================================
// CLI
// ============================================================================

function parseCLIArgs() {
  const args = process.argv.slice(2)
  const params = {
    afiliadoId: '000082018000000000001000082018',
    timeout: 10,
    mode: 'test'  // test | generate | verify | info
  }
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--afiliadoId' && args[i + 1]) {
      params.afiliadoId = args[i + 1]
      i++
    } else if (args[i] === '--timeout' && args[i + 1]) {
      params.timeout = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--mode' && args[i + 1]) {
      params.mode = args[i + 1]
      i++
    } else if (args[i] === '--token' && args[i + 1]) {
      params.token = args[i + 1]
      i++
    }
  }
  
  return params
}

function runCLI() {
  const params = parseCLIArgs()
  
  switch (params.mode) {
    case 'generate':
      const token = generateToken(params.afiliadoId, params.timeout)
      const info = getTokenInfo(params.timeout)
      console.log(JSON.stringify({
        token,
        afiliadoId: params.afiliadoId,
        timeout: params.timeout,
        generatedAt: info.generatedAt.toISOString(),
        expiresAt: info.expiresAt.toISOString(),
        timeRemainingSeconds: info.timeRemainingSeconds
      }, null, 2))
      break
      
    case 'verify':
      if (!params.token) {
        console.error('Error: --token requerido para modo verify')
        process.exit(1)
      }
      const result = verifyToken(params.afiliadoId, params.token, params.timeout, 1)
      console.log(JSON.stringify(result, null, 2))
      break
      
    case 'info':
      const tokenInfo = getTokenInfo(params.timeout)
      console.log(JSON.stringify(tokenInfo, null, 2))
      break
      
    case 'test':
    default:
      runTests()
      showExamples()
      break
  }
}

// Exportar funciones para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateToken,
    verifyToken,
    getTokenInfo
  }
}

// Ejecutar si se corre directamente
if (require.main === module) {
  runCLI()
}
