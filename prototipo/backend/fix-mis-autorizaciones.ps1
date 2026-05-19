# Script para reemplazar el endpoint /mis-autorizaciones

$filePath = "e:\MisProyectos\appmovil\APP_Afiliados\backend\server-soap.js"

# Leer archivo completo
$content = Get-Content -Path $filePath -Raw -Encoding UTF8

# Buscar inicio del endpoint
$startPattern = "// GET /mis-autorizaciones - Obtener autorizaciones del usuario"
$endPattern = "// POST /sia/solicitudes - REC_SOLICITUDES_APP"

# Extraer líneas
$lines = $content -split "`n"
$startLine = -1
$endLine = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "GET /mis-autorizaciones" -and $startLine -eq -1) {
        $startLine = $i
        Write-Host "Inicio encontrado en línea $i"
    }
    if ($lines[$i] -match "POST /sia/solicitudes" -and $startLine -ne -1 -and $endLine -eq -1) {
        $endLine = $i
        Write-Host "Final encontrado en línea $i"
        break
    }
}

if ($startLine -eq -1 -or $endLine -eq -1) {
    Write-Host "❌ No se encontró el endpoint" -ForegroundColor Red
    exit 1
}

# Nuevo código
$newEndpoint = @'
// GET /mis-autorizaciones - Obtener autorizaciones del usuario desde SIA y sincronizar con BD local
// Requiere autenticación
app.get('/mis-autorizaciones', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session.nuusuid
    console.log('📋 ========== GET /mis-autorizaciones (SOAP + BD SYNC) ==========')
    console.log('   Usuario (nuusuid):', nuusuid)
    console.log('   Servicio: REC_SOLICITUDES_APP')
    console.log('   Acción: Obtener desde SOAP y sincronizar con BD local')
    
    // PASO 1: Llamar a REC_SOLICITUDES_APP con Mode=DSP y AUSolIdExt=nuusuid
    const parametros = {
      Mode: 'DSP',
      AUSolIdExt: nuusuid
    }
    
    console.log('   Parámetros SOAP:', JSON.stringify(parametros))
    console.log('   📡 Llamando a callSoapExecuteSIA...')
    
    const result = await callSoapExecuteSIA('REC_SOLICITUDES_APP', parametros)
    const parsed = parseSoapResult(result)
    
    if (!parsed.ok) {
      console.error('❌ Error en REC_SOLICITUDES_APP:', parsed.errorDsc)
      return res.status(400).json({ 
        error: parsed.errorDsc || 'Error en servicio SIA', 
        mensajes: parsed.mensajes 
      })
    }
    
    // El payload debe ser un array de solicitudes
    let autorizaciones = Array.isArray(parsed.payload) ? parsed.payload : []
    console.log(`✅ ${autorizaciones.length} autorizaciones obtenidas desde SIA`)
    
    // PASO 2: Sincronizar con BD local (tabla ausolici)
    console.log('   💾 Sincronizando con BD local...')
    
    for (const auth of autorizaciones) {
      try {
        // Verificar si ya existe (por AUSolicId o número de autorización)
        const checkQuery = `
          SELECT ausolicid FROM ausolici 
          WHERE (ausolicid = $1 OR ausolautnu = $2) AND nuusuid = $3
        `
        const checkResult = await db.pool.query(checkQuery, [
          auth.AUSolicId || null,
          auth.AUAutNumero || null,
          nuusuid
        ])
        
        if (checkResult.rows.length > 0) {
          // Actualizar existente
          const updateQuery = `
            UPDATE ausolici SET
              ausoldescr = $1,
              ausolfecal = $2,
              ausolfecor = $3,
              ausoltipo = $4,
              ausolestad = $5,
              ausolcantp = $6,
              ausolpsoco = $7,
              ausolautnu = $8,
              autippreid = $9
            WHERE ausolicid = $10
          `
          await db.pool.query(updateQuery, [
            auth.AUSolRefAfiliado || auth.AUSolDescripcion || '',
            auth.AUSolFecha || new Date(),
            auth.AUSolFechaOrden || auth.AUSolFecha || new Date(),
            auth.AUSolTipo || '',
            auth.AUSolEstado || '',
            auth.AUSolPresCant || 1,
            auth.AUSolObsPref || '',
            auth.AUAutNumero || '',
            auth.AUSolPresId || '',
            checkResult.rows[0].ausolicid
          ])
        } else {
          // Insertar nuevo
          const insertQuery = `
            INSERT INTO ausolici (
              nuusuid, ausoldescr, ausolfecal, ausolfecor, 
              ausoltipo, ausolestad, ausolcantp, ausolpsoco, 
              ausolautnu, autippreid, ausolicid
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `
          await db.pool.query(insertQuery, [
            nuusuid,
            auth.AUSolRefAfiliado || auth.AUSolDescripcion || '',
            auth.AUSolFecha || new Date(),
            auth.AUSolFechaOrden || auth.AUSolFecha || new Date(),
            auth.AUSolTipo || '',
            auth.AUSolEstado || '',
            auth.AUSolPresCant || 1,
            auth.AUSolObsPref || '',
            auth.AUAutNumero || '',
            auth.AUSolPresId || '',
            auth.AUSolicId || null
          ])
        }
      } catch (syncError) {
        console.error('   ⚠️  Error sincronizando registro:', syncError.message)
        // Continuar con el siguiente registro
      }
    }
    
    console.log(`   ✅ Sincronización completada`)
    
    // PASO 3: Mapear campos para respuesta consistente con formato esperado por frontend
    const autorizacionesMapeadas = autorizaciones.map(auth => ({
      ausolicid: auth.AUSolicId,
      descripcion: auth.AUSolRefAfiliado || auth.AUSolDescripcion || '',
      fecha_alta: auth.AUSolFecha,
      fecha_orden: auth.AUSolFechaOrden || auth.AUSolFecha,
      tipo: auth.AUSolTipo,
      estado: auth.AUSolEstado,
      cantidad: auth.AUSolPresCant || 1,
      profesional: auth.AUSolObsPref || '',
      autorizacion_numero: auth.AUAutNumero || '',
      tipo_prestacion_id: auth.AUSolPresId
    }))
    
    console.log('   ====================================================')
    
    res.json({
      success: true,
      autorizaciones: autorizacionesMapeadas,
      total: autorizacionesMapeadas.length,
      sincronizado: true
    })
  } catch (error) {
    console.error('❌ Error en /mis-autorizaciones (SOAP + BD SYNC):', error)
    res.status(500).json({ 
      error: 'Error al obtener autorizaciones',
      details: error.message 
    })
  }
})

'@

# Construir nuevo contenido
$before = $lines[0..($startLine-1)] -join "`n"
$after = $lines[$endLine..($lines.Count-1)] -join "`n"
$newContent = $before + "`n" + $newEndpoint + "`n" + $after

# Guardar
Set-Content -Path $filePath -Value $newContent -Encoding UTF8
Write-Host "✅ Archivo modificado correctamente" -ForegroundColor Green
