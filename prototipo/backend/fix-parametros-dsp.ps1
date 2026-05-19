# Fix: Mode=DSP sin AUSolIdExt para obtener todas las solicitudes

$file = "e:\MisProyectos\appmovil\APP_Afiliados\backend\server-soap.js"
$content = Get-Content $file -Raw -Encoding UTF8

# Buscar y reemplazar el bloque de parametros
$oldBlock = @'
    // PASO 1: Llamar a REC_SOLICITUDES_APP con Mode=DSP y AUSolIdExt=nuusuid
    const parametros = {
      Mode: 'DSP',
      AUSolIdExt: afiliadoId || nuusuid
    }
'@

$newBlock = @'
    // PASO 1: Llamar a REC_SOLICITUDES_APP con Mode=DSP
    // AUSolIdExt NO se envia - se filtra por AfiliadoId en el payload
    const parametros = {
      Mode: 'DSP',
      AfiliadoId: afiliadoId
    }
'@

if ($content -match [regex]::Escape($oldBlock)) {
    $content = $content -replace [regex]::Escape($oldBlock), $newBlock
    
    # Guardar
    Set-Content -Path $file -Value $content -Encoding UTF8 -NoNewline
    Write-Host "✅ Parametros corregidos: Ahora usa AfiliadoId para filtrar" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontro el bloque" -ForegroundColor Red
    Write-Host "Intentando buscar linea con 'PASO 1'" -ForegroundColor Yellow
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "PASO 1" -and $i -gt 3800) {
            Write-Host "Encontrado en linea $($i+1): $($lines[$i])" -ForegroundColor Cyan
            Write-Host "Siguientes 5 lineas:" -ForegroundColor Gray
            for ($j = $i; $j -lt ($i+6) -and $j -lt $lines.Count; $j++) {
                Write-Host "  $($j+1): $($lines[$j])" -ForegroundColor Gray
            }
            break
        }
    }
}
