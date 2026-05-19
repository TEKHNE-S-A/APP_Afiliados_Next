# Reescribir endpoint /mis-autorizaciones con lógica correcta:
# 1. Leer AUSolicId de BD local (tabla ausolici)
# 2. Para cada uno, consultar SOAP con Mode=DSP + AUSolIdExt
# 3. Actualizar datos en BD local

$file = "e:\MisProyectos\appmovil\APP_Afiliados\backend\server-soap.js"
$lines = Get-Content $file -Encoding UTF8

# Buscar inicio del endpoint
$startLine = -1
$endLine = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "GET /mis-autorizaciones - Obtener autorizaciones" -and $startLine -eq -1) {
        $startLine = $i
        Write-Host "Inicio encontrado en línea $($i+1)" -ForegroundColor Cyan
    }
    if ($lines[$i] -match "POST /sia/solicitudes - REC_SOLICITUDES_APP" -and $startLine -ne -1 -and $endLine -eq -1) {
        $endLine = $i - 1  # Línea antes del siguiente endpoint
        Write-Host "Final encontrado en línea $($i)" -ForegroundColor Cyan
        break
    }
}

if ($startLine -eq -1 -or $endLine -eq -1) {
    Write-Host "❌ No se encontró el endpoint" -ForegroundColor Red
    exit 1
}

# Nuevo código del endpoint
$newEndpoint = @'
// GET /mis-autorizaciones - Obtener autorizaciones del usuario desde SIA y sincronizar con BD local
// Requiere autenticación
app.get('/mis-autorizaciones', requireAuth, async (req, res) => {
  try {
    const nuusuid = req.session.nuusuid
    console.log('📋 ========== GET /mis-autorizaciones (BD → SOAP SYNC) ==========')
    console.log('   Usuario (nuusuid):', nuusuid)
    
    // PASO 1: Leer solicitudes guardadas en BD local (tabla ausolici)
    const queryLocal = `
      SELECT ausolicid, ausoldescr, ausolfecal, ausoltipo, ausolestad
      FROM ausolici
      WHERE nuusuid = $1
      ORDER BY ausolfecal DESC
    `
    const localResult = await db.pool.query(queryLocal, [nuusuid])
    console.log(`   📂 ${localResult.rows.length} solicitudes encontradas en BD local`)
    
    if (localResult.rows.length === 0) {
      console.log('   ℹ️  Usuario sin solicitudes en BD local')
      return res.json({
        success: true,
        autorizaciones: [],
        total: 0,
        sincronizado: true
      })
    }
    
    // PASO 2: Para cada AUSolicId, consultar estado actual en SOAP
    const autorizacionesActualizadas = []
    
    for (const solicitud of localResult.rows) {
      const ausolicid = solicitud.ausolicid
      
      if (!ausolicid) {
        console.log(`   ⚠️  Solicitud sin ID válido, usando datos locales`)
        autorizacionesActualizadas.push({
          ausolicid: null,
          descripcion: solicitud.ausoldescr || '',
          fecha_alta: solicitud.ausolfecal,
          fecha_orden: solicitud.ausolfecal,
          tipo: solicitud.ausoltipo || '',
          estado: solicitud.ausolestad || 'PEN',
          cantidad: 1,
          profesional: '',
          autorizacion_numero: '',
          tipo_prestacion_id: ''
        })
        continue
      }
      
      try {
        console.log(`   🔍 Consultando AUSolicId: ${ausolicid}`)
        
        // Consultar estado actual en SOAP
        const parametros = {
          Mode: 'DSP',
          AUSolIdExt: ausolicid.toString()
        }
        
        const result = await callSoapExecuteSIA('REC_SOLICITUDES_APP', parametros)
        const parsed = parseSoapResult(result)
        
        if (!parsed.ok) {
          console.error(`   ❌ Error consultando ${ausolicid}:`, parsed.errorDsc)
          // Usar datos locales si falla SOAP
          autorizacionesActualizadas.push({
            ausolicid: ausolicid,
            descripcion: solicitud.ausoldescr || '',
            fecha_alta: solicitud.ausolfecal,
            fecha_orden: solicitud.ausolfecal,
            tipo: solicitud.ausoltipo || '',
            estado: solicitud.ausolestad || 'PEN',
            cantidad: 1,
            profesional: '',
            autorizacion_numero: '',
            tipo_prestacion_id: ''
          })
          continue
        }
        
        // Parsear payload SOAP (puede venir como objeto o string JSON en Resultado)
        let authData = null
        
        if (parsed.payload.Resultado) {
          try {
            authData = JSON.parse(parsed.payload.Resultado)
          } catch (e) {
            authData = parsed.payload
          }
        } else {
          authData = parsed.payload
        }
        
        // Validar que sea una respuesta válida
        if (!authData || authData.AUSolId === 0) {
          console.log(`   ⚠️  Solicitud ${ausolicid} no encontrada en SIA, usando datos locales`)
          autorizacionesActualizadas.push({
            ausolicid: ausolicid,
            descripcion: solicitud.ausoldescr || '',
            fecha_alta: solicitud.ausolfecal,
            fecha_orden: solicitud.ausolfecal,
            tipo: solicitud.ausoltipo || '',
            estado: solicitud.ausolestad || 'PEN',
            cantidad: 1,
            profesional: '',
            autorizacion_numero: '',
            tipo_prestacion_id: ''
          })
          continue
        }
        
        console.log(`   ✅ Solicitud ${ausolicid} actualizada desde SIA`)
        
        // PASO 3: Actualizar en BD local con datos de SOAP
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
          WHERE ausolicid = $10 AND nuusuid = $11
        `
        
        await db.pool.query(updateQuery, [
          authData.AUSolRefAfiliado || authData.AUSolDescripcion || solicitud.ausoldescr || '',
          authData.AUSolFecha || solicitud.ausolfecal,
          authData.AUSolFechaOrden || authData.AUSolFecha || solicitud.ausolfecal,
          authData.AUSolTipo || solicitud.ausoltipo || '',
          authData.AUSolEstado || 'PEN',
          authData.AUSolPresCant || 1,
          authData.AUSolObsPref || '',
          authData.AUAutNumero || '',
          authData.AUSolPresId || '',
          ausolicid,
          nuusuid
        ])
        
        // Agregar a resultado
        autorizacionesActualizadas.push({
          ausolicid: ausolicid,
          descripcion: authData.AUSolRefAfiliado || authData.AUSolDescripcion || '',
          fecha_alta: authData.AUSolFecha,
          fecha_orden: authData.AUSolFechaOrden || authData.AUSolFecha,
          tipo: authData.AUSolTipo,
          estado: authData.AUSolEstado,
          cantidad: authData.AUSolPresCant || 1,
          profesional: authData.AUSolObsPref || '',
          autorizacion_numero: authData.AUAutNumero || '',
          tipo_prestacion_id: authData.AUSolPresId
        })
        
      } catch (syncError) {
        console.error(`   ⚠️  Error sincronizando ${ausolicid}:`, syncError.message)
        // Usar datos locales en caso de error
        autorizacionesActualizadas.push({
          ausolicid: ausolicid,
          descripcion: solicitud.ausoldescr || '',
          fecha_alta: solicitud.ausolfecal,
          fecha_orden: solicitud.ausolfecal,
          tipo: solicitud.ausoltipo || '',
          estado: solicitud.ausolestad || 'PEN',
          cantidad: 1,
          profesional: '',
          autorizacion_numero: '',
          tipo_prestacion_id: ''
        })
      }
    }
    
    console.log(`   ✅ Sincronización completada: ${autorizacionesActualizadas.length} autorizaciones`)
    console.log('   ====================================================')
    
    res.json({
      success: true,
      autorizaciones: autorizacionesActualizadas,
      total: autorizacionesActualizadas.length,
      sincronizado: true
    })
    
  } catch (error) {
    console.error('❌ Error en /mis-autorizaciones:', error)
    res.status(500).json({ 
      error: 'Error al obtener autorizaciones',
      details: error.message 
    })
  }
})

'@

# Reemplazar endpoint completo
$before = $lines[0..($startLine-1)]
$after = $lines[$endLine..($lines.Count-1)]
$newLines = $before + $newEndpoint + $after

Set-Content -Path $file -Value $newLines -Encoding UTF8
Write-Host "✅ Endpoint reescrito con lógica correcta:" -ForegroundColor Green
Write-Host "   1. Lee AUSolicId de BD local" -ForegroundColor White
Write-Host "   2. Consulta cada uno en SOAP (Mode=DSP + AUSolIdExt)" -ForegroundColor White
Write-Host "   3. Actualiza datos en BD local" -ForegroundColor White
