# Fix payload parsing in /mis-autorizaciones

$file = "e:\MisProyectos\appmovil\APP_Afiliados\backend\server-soap.js"
$content = Get-Content $file -Raw -Encoding UTF8

$oldCode = @'
    // El payload debe ser un array de solicitudes
    let autorizaciones = Array.isArray(parsed.payload) ? parsed.payload : []
    console.log(`✅ ${autorizaciones.length} autorizaciones obtenidas desde SIA`)
'@

$newCode = @'
    console.log('   📦 Tipo de payload:', typeof parsed.payload)
    console.log('   📦 Es array:', Array.isArray(parsed.payload))
    console.log('   📦 Payload raw:', JSON.stringify(parsed.payload).substring(0, 500))
    
    // El payload puede venir como array directo o como objeto con Resultado (string JSON)
    let autorizaciones = []
    
    if (Array.isArray(parsed.payload)) {
      autorizaciones = parsed.payload
    } else if (parsed.payload && typeof parsed.payload === 'object') {
      // Verificar si tiene propiedad Resultado (como REC_PRESTACIONES_APP)
      if (parsed.payload.Resultado) {
        try {
          const resultadoArray = JSON.parse(parsed.payload.Resultado)
          autorizaciones = Array.isArray(resultadoArray) ? resultadoArray : []
          console.log('   📄 Payload parseado desde Resultado (JSON string)')
        } catch (e) {
          console.error('   ⚠️  Error parseando Resultado:', e.message)
        }
      } else {
        // Puede ser un objeto único, convertirlo en array
        autorizaciones = [parsed.payload]
      }
    }
    
    console.log(`✅ ${autorizaciones.length} autorizaciones obtenidas desde SIA`)
'@

if ($content -match [regex]::Escape($oldCode)) {
    $content = $content -replace [regex]::Escape($oldCode), $newCode
    Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✅ Archivo modificado correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró el código a reemplazar" -ForegroundColor Red
    Write-Host "Buscando línea específica..." -ForegroundColor Yellow
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "El payload debe ser un array") {
            Write-Host "Encontrado en línea $($i+1): $($lines[$i])" -ForegroundColor Cyan
        }
    }
}
